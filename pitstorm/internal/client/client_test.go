package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestNewClient(t *testing.T) {
	cfg := DefaultConfig("https://example.com")
	c := New(cfg, nil)
	defer c.Close()

	if c.cfg.BaseURL != "https://example.com" {
		t.Errorf("BaseURL = %q, want %q", c.cfg.BaseURL, "https://example.com")
	}
	if c.std.Timeout != DefaultTimeout {
		t.Errorf("std timeout = %v, want %v", c.std.Timeout, DefaultTimeout)
	}
	if c.stream.Timeout != DefaultStreamTimeout {
		t.Errorf("stream timeout = %v, want %v", c.stream.Timeout, DefaultStreamTimeout)
	}
}

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig("https://test.com")

	if cfg.BaseURL != "https://test.com" {
		t.Errorf("BaseURL = %q, want %q", cfg.BaseURL, "https://test.com")
	}
	if cfg.Timeout != DefaultTimeout {
		t.Errorf("Timeout = %v, want %v", cfg.Timeout, DefaultTimeout)
	}
	if cfg.StreamTimeout != DefaultStreamTimeout {
		t.Errorf("StreamTimeout = %v, want %v", cfg.StreamTimeout, DefaultStreamTimeout)
	}
	if cfg.MaxRetries != DefaultMaxRetries {
		t.Errorf("MaxRetries = %d, want %d", cfg.MaxRetries, DefaultMaxRetries)
	}
	if cfg.MaxIdleConns != DefaultMaxIdleConns {
		t.Errorf("MaxIdleConns = %d, want %d", cfg.MaxIdleConns, DefaultMaxIdleConns)
	}
}

func TestTokenManagement(t *testing.T) {
	c := New(DefaultConfig("https://example.com"), nil)
	defer c.Close()

	// No token initially.
	if _, ok := c.GetToken("user-1"); ok {
		t.Error("expected no token for user-1")
	}

	// Set and retrieve.
	c.SetToken("user-1", "tok-abc")
	tok, ok := c.GetToken("user-1")
	if !ok || tok != "tok-abc" {
		t.Errorf("GetToken = (%q, %v), want (%q, true)", tok, ok, "tok-abc")
	}

	// Overwrite.
	c.SetToken("user-1", "tok-xyz")
	tok, _ = c.GetToken("user-1")
	if tok != "tok-xyz" {
		t.Errorf("GetToken after overwrite = %q, want %q", tok, "tok-xyz")
	}

	// Clear.
	c.ClearToken("user-1")
	if _, ok := c.GetToken("user-1"); ok {
		t.Error("expected no token after clear")
	}
}

func TestDoSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			t.Errorf("method = %q, want GET", r.Method)
		}
		if r.URL.Path != "/api/health" {
			t.Errorf("path = %q, want /api/health", r.URL.Path)
		}
		if ua := r.Header.Get("User-Agent"); ua != "pitstorm/1.0" {
			t.Errorf("User-Agent = %q, want pitstorm/1.0", ua)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	c := New(cfg, nil)
	defer c.Close()

	resp, err := c.Do(context.Background(), "GET", "/api/health", "", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", resp.StatusCode)
	}
	if string(resp.Body) != `{"status":"ok"}` {
		t.Errorf("Body = %q, want {\"status\":\"ok\"}", string(resp.Body))
	}
	if resp.Attempt != 1 {
		t.Errorf("Attempt = %d, want 1", resp.Attempt)
	}
	if resp.Duration <= 0 {
		t.Error("Duration should be positive")
	}
}

func TestDoWithAuth(t *testing.T) {
	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	c := New(cfg, nil)
	defer c.Close()

	c.SetToken("user-1", "clerk-session-tok")

	_, err := c.Do(context.Background(), "GET", "/api/agents", "user-1", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if gotAuth != "Bearer clerk-session-tok" {
		t.Errorf("Authorization = %q, want %q", gotAuth, "Bearer clerk-session-tok")
	}
}

func TestDoWithAuthNoToken(t *testing.T) {
	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	c := New(cfg, nil)
	defer c.Close()

	// No token set — request should have no auth header.
	_, err := c.Do(context.Background(), "GET", "/api/health", "user-1", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if gotAuth != "" {
		t.Errorf("Authorization = %q, want empty (no token set)", gotAuth)
	}
}

func TestDoWithJSONBody(t *testing.T) {
	var gotBody map[string]any
	var gotContentType string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotContentType = r.Header.Get("Content-Type")
		json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	c := New(cfg, nil)
	defer c.Close()

	body := map[string]any{"topic": "AI safety", "agents": []string{"socrates", "nietzsche"}}
	_, err := c.Do(context.Background(), "POST", "/api/run-bout", "", body)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if gotContentType != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", gotContentType)
	}
	if gotBody["topic"] != "AI safety" {
		t.Errorf("topic = %v, want AI safety", gotBody["topic"])
	}
}

func TestDoRetryOn503(t *testing.T) {
	var attempts atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := attempts.Add(1)
		if n <= 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("overloaded"))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	cfg.RetryBase = time.Millisecond // fast retries for test
	cfg.MaxRetryWait = 10 * time.Millisecond
	c := New(cfg, nil)
	defer c.Close()

	resp, err := c.Do(context.Background(), "GET", "/api/health", "", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", resp.StatusCode)
	}
	if resp.Attempt != 3 {
		t.Errorf("Attempt = %d, want 3", resp.Attempt)
	}
	if got := attempts.Load(); got != 3 {
		t.Errorf("server saw %d attempts, want 3", got)
	}
}

func TestDoRetryExhausted(t *testing.T) {
	var attempts atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts.Add(1)
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte("rate limited"))
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	cfg.MaxRetries = 2
	cfg.RetryBase = time.Millisecond
	cfg.MaxRetryWait = 5 * time.Millisecond
	c := New(cfg, nil)
	defer c.Close()

	resp, err := c.Do(context.Background(), "GET", "/api/health", "", nil)
	if err != nil {
		t.Fatalf("Do should return response after exhausted retries, got error: %v", err)
	}
	// After exhausting retries, the last response is returned.
	if resp.StatusCode != 429 {
		t.Errorf("StatusCode = %d, want 429", resp.StatusCode)
	}
	// 1 initial + 2 retries = 3 total.
	if got := attempts.Load(); got != 3 {
		t.Errorf("server saw %d attempts, want 3", got)
	}
}

func TestDoNoRetryOn4xx(t *testing.T) {
	var attempts atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts.Add(1)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("bad request"))
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	c := New(cfg, nil)
	defer c.Close()

	resp, err := c.Do(context.Background(), "POST", "/api/run-bout", "", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("StatusCode = %d, want 400", resp.StatusCode)
	}
	if got := attempts.Load(); got != 1 {
		t.Errorf("server saw %d attempts, want 1 (no retries for 400)", got)
	}
}

func TestDoContextCancelled(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(5 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	cfg.Timeout = 5 * time.Second
	c := New(cfg, nil)
	defer c.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	_, err := c.Do(ctx, "GET", "/api/health", "", nil)
	if err == nil {
		t.Fatal("expected error from cancelled context")
	}
}

func TestDoStreamSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("data: {\"type\":\"start\"}\n\ndata: [DONE]\n\n"))
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	c := New(cfg, nil)
	defer c.Close()

	body, headers, status, dur, err := c.DoStream(context.Background(), "GET", "/api/run-bout", "", nil)
	if err != nil {
		t.Fatalf("DoStream: %v", err)
	}
	defer body.Close()

	if status != 200 {
		t.Errorf("status = %d, want 200", status)
	}
	if ct := headers.Get("Content-Type"); ct != "text/event-stream" {
		t.Errorf("Content-Type = %q, want text/event-stream", ct)
	}
	if dur <= 0 {
		t.Error("duration should be positive")
	}
}

func TestDoStreamError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("server error"))
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	c := New(cfg, nil)
	defer c.Close()

	_, _, status, _, err := c.DoStream(context.Background(), "GET", "/api/run-bout", "", nil)
	if err == nil {
		t.Fatal("expected error for 500 response")
	}
	if status != 500 {
		t.Errorf("status = %d, want 500", status)
	}
}

func TestDoStreamWithAuth(t *testing.T) {
	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("data: [DONE]\n\n"))
	}))
	defer srv.Close()

	cfg := DefaultConfig(srv.URL)
	c := New(cfg, nil)
	defer c.Close()
	c.SetToken("lab-user", "lab-token-123")

	body, _, _, _, err := c.DoStream(context.Background(), "POST", "/api/v1/bout", "lab-user", nil)
	if err != nil {
		t.Fatalf("DoStream: %v", err)
	}
	body.Close()

	if gotAuth != "Bearer lab-token-123" {
		t.Errorf("Authorization = %q, want %q", gotAuth, "Bearer lab-token-123")
	}
}

func TestVerboseLogging(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	var logged []string
	logf := func(format string, args ...any) {
		logged = append(logged, fmt.Sprintf(format, args...))
	}

	cfg := DefaultConfig(srv.URL)
	cfg.Verbose = true
	c := New(cfg, logf)
	defer c.Close()

	_, err := c.Do(context.Background(), "GET", "/test", "", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}

	if len(logged) == 0 {
		t.Error("expected verbose log output, got none")
	}
}

func TestIsRetryable(t *testing.T) {
	tests := []struct {
		status int
		want   bool
	}{
		{200, false},
		{201, false},
		{400, false},
		{401, false},
		{403, false},
		{404, false},
		{429, true},
		{500, true},
		{502, true},
		{503, true},
		{504, true},
	}

	for _, tt := range tests {
		if got := isRetryable(tt.status); got != tt.want {
			t.Errorf("isRetryable(%d) = %v, want %v", tt.status, got, tt.want)
		}
	}
}
