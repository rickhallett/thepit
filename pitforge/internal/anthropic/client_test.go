package anthropic

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNewClient(t *testing.T) {
	c := NewClient("test-key")
	if c.APIKey != "test-key" {
		t.Errorf("APIKey = %q, want %q", c.APIKey, "test-key")
	}
	if c.Endpoint != DefaultEndpoint {
		t.Errorf("Endpoint = %q, want %q", c.Endpoint, DefaultEndpoint)
	}
}

func TestStreamParsesTextDeltas(t *testing.T) {
	// Simulate Anthropic SSE stream.
	sseBody := `event: message_start
data: {"type":"message_start","message":{"id":"msg_01","type":"message","role":"assistant","content":[],"model":"claude-haiku-4-5-20251001","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":2}}

event: message_stop
data: {"type":"message_stop"}
`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify headers.
		if got := r.Header.Get("x-api-key"); got != "test-key" {
			t.Errorf("x-api-key = %q, want %q", got, "test-key")
		}
		if got := r.Header.Get("anthropic-version"); got != APIVersion {
			t.Errorf("anthropic-version = %q, want %q", got, APIVersion)
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, sseBody)
	}))
	defer server.Close()

	c := NewClient("test-key")
	c.Endpoint = server.URL

	var deltas []string
	result, err := c.StreamWithCallback(&Request{
		Model:     "claude-haiku-4-5-20251001",
		MaxTokens: 200,
		System:    "You are a test agent.",
		Messages:  []Message{{Role: "user", Content: "Say hello."}},
	}, func(text string) {
		deltas = append(deltas, text)
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "Hello world" {
		t.Errorf("result = %q, want %q", result, "Hello world")
	}
	if len(deltas) != 2 {
		t.Errorf("got %d deltas, want 2", len(deltas))
	}
}

func TestStreamHandlesAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprint(w, `{"error":{"type":"authentication_error","message":"invalid api key"}}`)
	}))
	defer server.Close()

	c := NewClient("bad-key")
	c.Endpoint = server.URL

	_, err := c.Stream(&Request{
		Model:     "claude-haiku-4-5-20251001",
		MaxTokens: 200,
		Messages:  []Message{{Role: "user", Content: "test"}},
	})

	if err == nil {
		t.Fatal("expected error for 401 response")
	}
	if !strings.Contains(err.Error(), "401") {
		t.Errorf("error should contain status code: %v", err)
	}
}

func TestStreamHandlesStreamError(t *testing.T) {
	sseBody := `event: error
data: {"type":"error","error":{"type":"overloaded_error","message":"server overloaded"}}
`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, sseBody)
	}))
	defer server.Close()

	c := NewClient("test-key")
	c.Endpoint = server.URL

	_, err := c.StreamWithCallback(&Request{
		Model:     "claude-haiku-4-5-20251001",
		MaxTokens: 200,
		Messages:  []Message{{Role: "user", Content: "test"}},
	}, nil)

	if err == nil {
		t.Fatal("expected error for stream error event")
	}
	if !strings.Contains(err.Error(), "overloaded") {
		t.Errorf("error should contain overloaded message: %v", err)
	}
}

func TestParseSSEStreamEmpty(t *testing.T) {
	result, err := parseSSEStream(strings.NewReader(""), nil)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if result != "" {
		t.Errorf("expected empty result, got %q", result)
	}
}
