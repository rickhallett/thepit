package action

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/rickhallett/thepit/pitstorm/internal/client"
)

// newTestActor spins up an httptest server with the given handler
// and returns an Actor backed by a client pointing at it. The caller
// must call the returned cleanup func.
func newTestActor(t *testing.T, handler http.HandlerFunc) (*Actor, func()) {
	t.Helper()
	srv := httptest.NewServer(handler)
	cfg := client.DefaultConfig(srv.URL)
	cfg.MaxRetries = 0 // no retries in unit tests
	c := client.New(cfg, nil)
	return New(c), func() {
		c.Close()
		srv.Close()
	}
}

func TestHealth(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/health" {
			t.Errorf("path = %q, want /api/health", r.URL.Path)
		}
		if r.Method != "GET" {
			t.Errorf("method = %q, want GET", r.Method)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","version":"1.2.3"}`))
	})
	defer cleanup()

	res, err := actor.Health(context.Background())
	if err != nil {
		t.Fatalf("Health: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
	if !strings.Contains(string(res.Body), `"status":"ok"`) {
		t.Errorf("Body = %s, want status ok", string(res.Body))
	}
}

func TestRunBoutStream(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/run-bout" {
			t.Errorf("path = %q, want /api/run-bout", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("method = %q, want POST", r.Method)
		}

		// Verify request body.
		var req RunBoutRequest
		json.NewDecoder(r.Body).Decode(&req)
		if req.Topic != "test topic" {
			t.Errorf("topic = %q, want %q", req.Topic, "test topic")
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("data: {\"type\":\"start\",\"messageId\":\"bout1\"}\n\ndata: [DONE]\n\n"))
	})
	defer cleanup()

	handle, err := actor.RunBoutStream(context.Background(), "", RunBoutRequest{
		Topic: "test topic",
	})
	if err != nil {
		t.Fatalf("RunBoutStream: %v", err)
	}
	defer handle.Close()

	if handle.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", handle.StatusCode)
	}

	// Read the body to verify it's a valid stream.
	data, err := io.ReadAll(handle.Body)
	if err != nil {
		t.Fatalf("ReadAll: %v", err)
	}
	if !strings.Contains(string(data), "data: [DONE]") {
		t.Errorf("body = %q, want it to contain [DONE]", string(data))
	}
}

func TestAPIBout(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/bout" {
			t.Errorf("path = %q, want /api/v1/bout", r.URL.Path)
		}
		// Verify auth header.
		if auth := r.Header.Get("Authorization"); auth != "Bearer lab-token" {
			t.Errorf("Authorization = %q, want %q", auth, "Bearer lab-token")
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"boutId":"b1","status":"completed"}`))
	})
	defer cleanup()

	// Set a token for the lab user.
	actor.c.SetToken("lab-user", "lab-token")

	res, err := actor.APIBout(context.Background(), "lab-user", APIBoutRequest{
		Topic: "AI ethics",
		Turns: 4,
		Model: "claude-sonnet-4-20250514",
	})
	if err != nil {
		t.Fatalf("APIBout: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
}

func TestCreateAgent(t *testing.T) {
	var gotBody CreateAgentRequest
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/agents" {
			t.Errorf("path = %q, want /api/agents", r.URL.Path)
		}
		json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"agent-1"}`))
	})
	defer cleanup()

	res, err := actor.CreateAgent(context.Background(), "user-1", CreateAgentRequest{
		Name:        "Test Agent",
		Description: "A test agent",
		System:      "You are a test agent.",
	})
	if err != nil {
		t.Fatalf("CreateAgent: %v", err)
	}
	if res.StatusCode != 201 {
		t.Errorf("StatusCode = %d, want 201", res.StatusCode)
	}
	if gotBody.Name != "Test Agent" {
		t.Errorf("name = %q, want %q", gotBody.Name, "Test Agent")
	}
}

func TestToggleReaction(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/reactions" {
			t.Errorf("path = %q", r.URL.Path)
		}
		var req ReactionRequest
		json.NewDecoder(r.Body).Decode(&req)
		if req.Reaction != "fire" {
			t.Errorf("reaction = %q, want fire", req.Reaction)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"toggled":true}`))
	})
	defer cleanup()

	res, err := actor.ToggleReaction(context.Background(), "user-1", ReactionRequest{
		BoutID:   "bout-1",
		TurnID:   "turn-1",
		Reaction: "fire",
	})
	if err != nil {
		t.Fatalf("ToggleReaction: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
}

func TestCastWinnerVote(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/winner-vote" {
			t.Errorf("path = %q", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"voted":true}`))
	})
	defer cleanup()

	res, err := actor.CastWinnerVote(context.Background(), "user-1", WinnerVoteRequest{
		BoutID:  "bout-1",
		AgentID: "socrates",
	})
	if err != nil {
		t.Fatalf("CastWinnerVote: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
}

func TestCreateShortLink(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/short-links" {
			t.Errorf("path = %q", r.URL.Path)
		}
		// No auth required.
		if auth := r.Header.Get("Authorization"); auth != "" {
			t.Errorf("Authorization = %q, want empty (no auth)", auth)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"shortUrl":"https://thepit.cloud/s/abc123"}`))
	})
	defer cleanup()

	res, err := actor.CreateShortLink(context.Background(), ShortLinkRequest{BoutID: "bout-1"})
	if err != nil {
		t.Fatalf("CreateShortLink: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
}

func TestListFeatureRequests(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			t.Errorf("method = %q, want GET", r.Method)
		}
		if r.URL.Path != "/api/feature-requests" {
			t.Errorf("path = %q", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`[{"id":"fr-1","title":"Dark mode"}]`))
	})
	defer cleanup()

	res, err := actor.ListFeatureRequests(context.Background())
	if err != nil {
		t.Fatalf("ListFeatureRequests: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
}

func TestSubmitFeature(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/feature-requests" {
			t.Errorf("path = %q", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("method = %q, want POST", r.Method)
		}
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"fr-2"}`))
	})
	defer cleanup()

	res, err := actor.SubmitFeature(context.Background(), "user-1", SubmitFeatureRequest{
		Title:       "Add dark mode",
		Description: "Please add a dark mode toggle",
	})
	if err != nil {
		t.Fatalf("SubmitFeature: %v", err)
	}
	if res.StatusCode != 201 {
		t.Errorf("StatusCode = %d, want 201", res.StatusCode)
	}
}

func TestVoteFeature(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/feature-requests/vote" {
			t.Errorf("path = %q", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"voted":true}`))
	})
	defer cleanup()

	res, err := actor.VoteFeature(context.Background(), "user-1", FeatureVoteRequest{
		FeatureID: "fr-1",
	})
	if err != nil {
		t.Fatalf("VoteFeature: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
}

func TestSubmitPaper(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/paper-submissions" {
			t.Errorf("path = %q", r.URL.Path)
		}
		var req PaperSubmissionRequest
		json.NewDecoder(r.Body).Decode(&req)
		if req.ArxivURL != "https://arxiv.org/abs/2401.12345" {
			t.Errorf("arxivUrl = %q", req.ArxivURL)
		}
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"paper-1"}`))
	})
	defer cleanup()

	res, err := actor.SubmitPaper(context.Background(), "user-1", PaperSubmissionRequest{
		ArxivURL: "https://arxiv.org/abs/2401.12345",
		Title:    "Test Paper",
	})
	if err != nil {
		t.Fatalf("SubmitPaper: %v", err)
	}
	if res.StatusCode != 201 {
		t.Errorf("StatusCode = %d, want 201", res.StatusCode)
	}
}

func TestSubscribeNewsletter(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/newsletter" {
			t.Errorf("path = %q", r.URL.Path)
		}
		var req NewsletterRequest
		json.NewDecoder(r.Body).Decode(&req)
		if req.Email != "test@example.com" {
			t.Errorf("email = %q", req.Email)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"subscribed":true}`))
	})
	defer cleanup()

	res, err := actor.SubscribeNewsletter(context.Background(), NewsletterRequest{
		Email: "test@example.com",
	})
	if err != nil {
		t.Fatalf("SubscribeNewsletter: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
}

func TestSendContact(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/contact" {
			t.Errorf("path = %q", r.URL.Path)
		}
		var req ContactRequest
		json.NewDecoder(r.Body).Decode(&req)
		if req.Name != "Test User" {
			t.Errorf("name = %q", req.Name)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"sent":true}`))
	})
	defer cleanup()

	res, err := actor.SendContact(context.Background(), ContactRequest{
		Name:    "Test User",
		Email:   "test@example.com",
		Message: "Hello!",
	})
	if err != nil {
		t.Fatalf("SendContact: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
}

func TestStashBYOK(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/byok-stash" {
			t.Errorf("path = %q", r.URL.Path)
		}
		if auth := r.Header.Get("Authorization"); auth != "Bearer user-tok" {
			t.Errorf("Authorization = %q", auth)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"stashed":true}`))
	})
	defer cleanup()

	actor.c.SetToken("user-1", "user-tok")

	res, err := actor.StashBYOK(context.Background(), "user-1", BYOKStashRequest{
		Provider: "anthropic",
		APIKey:   "sk-ant-test",
	})
	if err != nil {
		t.Fatalf("StashBYOK: %v", err)
	}
	if res.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", res.StatusCode)
	}
}

func TestBrowsePage(t *testing.T) {
	pages := []string{"/", "/arena", "/agents", "/leaderboard", "/recent", "/developers"}

	for _, page := range pages {
		t.Run(page, func(t *testing.T) {
			actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != page {
					t.Errorf("path = %q, want %q", r.URL.Path, page)
				}
				if r.Method != "GET" {
					t.Errorf("method = %q, want GET", r.Method)
				}
				w.WriteHeader(http.StatusOK)
				w.Write([]byte("<html>page</html>"))
			})
			defer cleanup()

			res, err := actor.BrowsePage(context.Background(), page)
			if err != nil {
				t.Fatalf("BrowsePage(%q): %v", page, err)
			}
			if res.StatusCode != 200 {
				t.Errorf("StatusCode = %d, want 200", res.StatusCode)
			}
		})
	}
}

func TestStreamHandleClose(t *testing.T) {
	h := &StreamHandle{Body: nil}
	if err := h.Close(); err != nil {
		t.Errorf("Close nil body: %v", err)
	}
}

func TestFlattenHeaders(t *testing.T) {
	h := http.Header{
		"Content-Type": {"text/event-stream"},
		"X-Custom":     {"val1", "val2"},
	}
	flat := flattenHeaders(h)
	if flat["Content-Type"] != "text/event-stream" {
		t.Errorf("Content-Type = %q", flat["Content-Type"])
	}
	if flat["X-Custom"] != "val1" {
		t.Errorf("X-Custom = %q, want first value", flat["X-Custom"])
	}
}

func TestResultBody(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"key":"value"}`))
	})
	defer cleanup()

	res, err := actor.Health(context.Background())
	if err != nil {
		t.Fatalf("Health: %v", err)
	}

	// Body should be valid JSON.
	var parsed map[string]string
	if err := json.Unmarshal(res.Body, &parsed); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	if parsed["key"] != "value" {
		t.Errorf("key = %q, want value", parsed["key"])
	}

	// Duration should be recorded.
	if res.Duration <= 0 {
		t.Error("Duration should be positive")
	}
}

func TestHTTPErrorPropagation(t *testing.T) {
	actor, cleanup := newTestActor(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"unauthorized"}`))
	})
	defer cleanup()

	// Non-retryable error should still return a result (not an error).
	res, err := actor.Health(context.Background())
	if err != nil {
		t.Fatalf("Health should not error on 403: %v", err)
	}
	if res.StatusCode != 403 {
		t.Errorf("StatusCode = %d, want 403", res.StatusCode)
	}
}
