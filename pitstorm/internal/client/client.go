// Package client provides an HTTP client for interacting with THE PIT's
// web endpoints and API. It handles connection pooling, authentication
// injection (Clerk session tokens), retries with exponential backoff,
// and response validation.
package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/rand/v2"
	"net/http"
	"sync"
	"time"
)

// Default configuration values.
const (
	DefaultTimeout       = 30 * time.Second
	DefaultStreamTimeout = 5 * time.Minute
	DefaultMaxRetries    = 3
	DefaultRetryBase     = 500 * time.Millisecond
	DefaultMaxRetryWait  = 10 * time.Second
	DefaultMaxIdleConns  = 100
	DefaultIdlePerHost   = 20
)

// Config controls the behaviour of a Client.
type Config struct {
	// BaseURL is the target origin, e.g. "https://www.thepit.cloud".
	BaseURL string

	// Timeout applies to non-streaming requests.
	Timeout time.Duration

	// StreamTimeout applies to SSE / streaming requests.
	StreamTimeout time.Duration

	// MaxRetries is the number of retry attempts for retryable errors.
	MaxRetries int

	// RetryBase is the base delay before exponential backoff.
	RetryBase time.Duration

	// MaxRetryWait caps the backoff delay.
	MaxRetryWait time.Duration

	// MaxIdleConns controls the connection pool size.
	MaxIdleConns int

	// IdlePerHost caps idle connections per host.
	IdlePerHost int

	// Verbose enables per-request logging (written to the provided logger).
	Verbose bool

	// CustomHeaders are added to every outgoing request.
	// Use this for internal auth headers (e.g. X-Research-Key).
	CustomHeaders map[string]string
}

// DefaultConfig returns a Config with sensible defaults.
func DefaultConfig(baseURL string) Config {
	return Config{
		BaseURL:       baseURL,
		Timeout:       DefaultTimeout,
		StreamTimeout: DefaultStreamTimeout,
		MaxRetries:    DefaultMaxRetries,
		RetryBase:     DefaultRetryBase,
		MaxRetryWait:  DefaultMaxRetryWait,
		MaxIdleConns:  DefaultMaxIdleConns,
		IdlePerHost:   DefaultIdlePerHost,
	}
}

// Client is a pooled HTTP client with auth injection and retry logic.
type Client struct {
	cfg     Config
	std     *http.Client // for normal requests
	stream  *http.Client // for SSE / long-poll requests
	logf    func(string, ...any)
	tokenMu sync.RWMutex
	tokens  map[string]string // accountID -> Clerk session token
}

// New creates a Client. The logf function is called for verbose output;
// pass nil to discard logs.
func New(cfg Config, logf func(string, ...any)) *Client {
	if logf == nil {
		logf = func(string, ...any) {}
	}

	transport := &http.Transport{
		MaxIdleConns:        cfg.MaxIdleConns,
		MaxIdleConnsPerHost: cfg.IdlePerHost,
		IdleConnTimeout:     90 * time.Second,
		DisableCompression:  false,
	}

	return &Client{
		cfg: cfg,
		std: &http.Client{
			Timeout:   cfg.Timeout,
			Transport: transport,
		},
		stream: &http.Client{
			Timeout:   cfg.StreamTimeout,
			Transport: transport, // shared pool
		},
		logf:   logf,
		tokens: make(map[string]string),
	}
}

// SetToken registers a Clerk session token for the given account.
func (c *Client) SetToken(accountID, token string) {
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()
	c.tokens[accountID] = token
}

// GetToken returns the current session token for an account.
// Returns ("", false) if no token is registered.
func (c *Client) GetToken(accountID string) (string, bool) {
	c.tokenMu.RLock()
	defer c.tokenMu.RUnlock()
	tok, ok := c.tokens[accountID]
	return tok, ok
}

// ClearToken removes the session token for an account.
func (c *Client) ClearToken(accountID string) {
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()
	delete(c.tokens, accountID)
}

// Response wraps an HTTP response with convenience fields for
// metrics collection.
type Response struct {
	StatusCode int
	Headers    http.Header
	Body       []byte
	Duration   time.Duration
	Attempt    int // 1-indexed attempt number that succeeded
}

// Do executes an HTTP request with retries and optional auth injection.
// The accountID may be empty for unauthenticated requests.
func (c *Client) Do(ctx context.Context, method, path, accountID string, body any) (*Response, error) {
	return c.do(ctx, method, path, accountID, body, false)
}

// DoStream executes an HTTP request that expects an SSE stream response.
// The caller is responsible for closing the returned ReadCloser.
// Unlike Do, DoStream does NOT read the body or retry — retries on
// streaming requests risk duplicate side-effects.
func (c *Client) DoStream(ctx context.Context, method, path, accountID string, body any) (io.ReadCloser, http.Header, int, time.Duration, error) {
	url := c.cfg.BaseURL + path
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, nil, 0, 0, fmt.Errorf("marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, nil, 0, 0, fmt.Errorf("create request: %w", err)
	}
	c.setHeaders(req, accountID, body != nil)

	start := time.Now()
	resp, err := c.stream.Do(req)
	elapsed := time.Since(start)
	if err != nil {
		return nil, nil, 0, elapsed, fmt.Errorf("HTTP request: %w", err)
	}

	if c.cfg.Verbose {
		c.logf("[stream] %s %s -> %d (%s)", method, path, resp.StatusCode, elapsed.Truncate(time.Millisecond))
	}

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, resp.Header, resp.StatusCode, elapsed, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(errBody))
	}

	return resp.Body, resp.Header, resp.StatusCode, elapsed, nil
}

func (c *Client) do(ctx context.Context, method, path, accountID string, body any, streaming bool) (*Response, error) {
	url := c.cfg.BaseURL + path

	var bodyBytes []byte
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal body: %w", err)
		}
		bodyBytes = b
	}

	var lastErr error
	maxAttempts := c.cfg.MaxRetries + 1

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		var bodyReader io.Reader
		if bodyBytes != nil {
			bodyReader = bytes.NewReader(bodyBytes)
		}

		req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
		if err != nil {
			return nil, fmt.Errorf("create request: %w", err)
		}
		c.setHeaders(req, accountID, body != nil)

		hc := c.std
		if streaming {
			hc = c.stream
		}

		start := time.Now()
		resp, err := hc.Do(req)
		elapsed := time.Since(start)

		if err != nil {
			lastErr = fmt.Errorf("HTTP request (attempt %d/%d): %w", attempt, maxAttempts, err)
			if attempt < maxAttempts {
				c.backoff(ctx, attempt)
				continue
			}
			return nil, lastErr
		}

		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("read response (attempt %d/%d): %w", attempt, maxAttempts, err)
			if attempt < maxAttempts {
				c.backoff(ctx, attempt)
				continue
			}
			return nil, lastErr
		}

		if c.cfg.Verbose {
			c.logf("[req] %s %s -> %d (%s, attempt %d)", method, path, resp.StatusCode, elapsed.Truncate(time.Millisecond), attempt)
		}

		if isRetryable(resp.StatusCode) && attempt < maxAttempts {
			lastErr = fmt.Errorf("HTTP %d (attempt %d/%d): %s", resp.StatusCode, attempt, maxAttempts, string(respBody))
			c.backoff(ctx, attempt)
			continue
		}

		return &Response{
			StatusCode: resp.StatusCode,
			Headers:    resp.Header,
			Body:       respBody,
			Duration:   elapsed,
			Attempt:    attempt,
		}, nil
	}

	return nil, lastErr
}

// setHeaders adds standard request headers and auth if available.
func (c *Client) setHeaders(req *http.Request, accountID string, hasBody bool) {
	req.Header.Set("User-Agent", "pitstorm/1.0")
	req.Header.Set("Accept", "text/event-stream, application/json")

	if hasBody {
		req.Header.Set("Content-Type", "application/json")
	}

	if accountID != "" {
		if tok, ok := c.GetToken(accountID); ok {
			req.Header.Set("Authorization", "Bearer "+tok)
		}
	}

	for k, v := range c.cfg.CustomHeaders {
		req.Header.Set(k, v)
	}
}

// isRetryable returns true for status codes that warrant a retry.
func isRetryable(status int) bool {
	switch status {
	case http.StatusTooManyRequests, // 429
		http.StatusInternalServerError, // 500
		http.StatusBadGateway,          // 502
		http.StatusServiceUnavailable,  // 503
		http.StatusGatewayTimeout:      // 504
		return true
	}
	return false
}

// backoff sleeps with exponential backoff + jitter, respecting context cancellation.
func (c *Client) backoff(ctx context.Context, attempt int) {
	delay := c.cfg.RetryBase * time.Duration(math.Pow(2, float64(attempt-1)))
	if delay > c.cfg.MaxRetryWait {
		delay = c.cfg.MaxRetryWait
	}
	// Add 0-25% jitter.
	jitter := time.Duration(rand.Int64N(int64(delay / 4)))
	delay += jitter

	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
	case <-timer.C:
	}
}

// Close releases transport resources.
func (c *Client) Close() {
	c.std.Transport.(*http.Transport).CloseIdleConnections()
	// stream shares the same transport, no need to close twice.
}
