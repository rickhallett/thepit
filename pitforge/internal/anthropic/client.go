// Package anthropic provides a minimal streaming client for the
// Anthropic Messages API, used by pitforge's spar and evolve commands.
package anthropic

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	DefaultEndpoint = "https://api.anthropic.com/v1/messages"
	APIVersion      = "2023-06-01"

	// Default model matching the free tier in the web app.
	DefaultModel = "claude-3-5-haiku-latest"
)

// Client wraps the Anthropic Messages API.
type Client struct {
	APIKey   string
	Endpoint string
	Client   *http.Client
}

// NewClient creates a new Anthropic API client.
func NewClient(apiKey string) *Client {
	return &Client{
		APIKey:   apiKey,
		Endpoint: DefaultEndpoint,
		Client:   &http.Client{Timeout: 5 * time.Minute},
	}
}

// Message represents a single message in the conversation.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Request is the payload for the Messages API.
type Request struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	System    string    `json:"system,omitempty"`
	Messages  []Message `json:"messages"`
	Stream    bool      `json:"stream"`
}

// StreamDelta is called for each text delta during streaming.
type StreamDelta func(text string)

// Stream sends a streaming Messages API request and calls onDelta for each
// text chunk. Returns the full accumulated text and any error.
func (c *Client) Stream(req *Request) (string, error) {
	return c.StreamWithCallback(req, nil)
}

// StreamWithCallback sends a streaming request and calls onDelta for each
// text chunk. Returns the full accumulated text and any error.
func (c *Client) StreamWithCallback(req *Request, onDelta StreamDelta) (string, error) {
	req.Stream = true

	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.Endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.APIKey)
	httpReq.Header.Set("anthropic-version", APIVersion)

	resp, err := c.Client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error %d: %s", resp.StatusCode, string(errBody))
	}

	return parseSSEStream(resp.Body, onDelta)
}

// parseSSEStream reads an SSE stream from the Anthropic Messages API and
// extracts text deltas from content_block_delta events.
func parseSSEStream(r io.Reader, onDelta StreamDelta) (string, error) {
	scanner := bufio.NewScanner(r)
	// Increase buffer for large responses.
	scanner.Buffer(make([]byte, 64*1024), 512*1024)

	var full strings.Builder
	var eventType string

	for scanner.Scan() {
		line := scanner.Text()

		// SSE event type line.
		if strings.HasPrefix(line, "event: ") {
			eventType = strings.TrimPrefix(line, "event: ")
			continue
		}

		// SSE data line.
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")

			switch eventType {
			case "content_block_delta":
				var delta contentBlockDelta
				if err := json.Unmarshal([]byte(data), &delta); err != nil {
					return full.String(), fmt.Errorf("parsing content_block_delta: %w", err)
				}
				if delta.Delta.Type == "text_delta" {
					full.WriteString(delta.Delta.Text)
					if onDelta != nil {
						onDelta(delta.Delta.Text)
					}
				}

			case "message_stop":
				// Stream complete.
				return full.String(), nil

			case "error":
				var apiErr struct {
					Error struct {
						Type    string `json:"type"`
						Message string `json:"message"`
					} `json:"error"`
				}
				if err := json.Unmarshal([]byte(data), &apiErr); err != nil {
					return full.String(), fmt.Errorf("parsing error event: %w", err)
				}
				return full.String(), fmt.Errorf("stream error: %s: %s", apiErr.Error.Type, apiErr.Error.Message)
			}

			eventType = ""
			continue
		}
	}

	if err := scanner.Err(); err != nil {
		return full.String(), fmt.Errorf("reading stream: %w", err)
	}

	return full.String(), nil
}

// SSE event data types.

type contentBlockDelta struct {
	Type  string `json:"type"`
	Index int    `json:"index"`
	Delta struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"delta"`
}
