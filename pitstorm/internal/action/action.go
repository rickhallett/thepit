// Package action provides typed API actions for every endpoint on THE PIT.
// Each action wraps the client's Do/DoStream with proper request/response
// types, making them composable building blocks for persona behaviours.
package action

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/rickhallett/thepit/pitstorm/internal/client"
)

// Actor wraps a client.Client and provides typed API methods.
type Actor struct {
	c *client.Client
}

// New creates an Actor backed by the given Client.
func New(c *client.Client) *Actor {
	return &Actor{c: c}
}

// ---------- Result types ----------

// Result is the common return type for all non-streaming actions.
// It carries the HTTP status, parsed body, and timing info.
type Result struct {
	StatusCode int
	Duration   time.Duration
	Attempt    int
	Body       json.RawMessage
}

func toResult(resp *client.Response) *Result {
	return &Result{
		StatusCode: resp.StatusCode,
		Duration:   resp.Duration,
		Attempt:    resp.Attempt,
		Body:       json.RawMessage(resp.Body),
	}
}

// StreamHandle wraps a streaming response that the caller must consume
// and then close.
type StreamHandle struct {
	Body       io.ReadCloser
	StatusCode int
	Duration   time.Duration
	Headers    map[string]string
}

// Close releases the underlying response body.
func (h *StreamHandle) Close() error {
	if h.Body != nil {
		return h.Body.Close()
	}
	return nil
}

// ---------- Health ----------

// Health checks the /api/health endpoint.
func (a *Actor) Health(ctx context.Context) (*Result, error) {
	resp, err := a.c.Do(ctx, "GET", "/api/health", "", nil)
	if err != nil {
		return nil, fmt.Errorf("health: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Bout Actions ----------

// RunBoutRequest is the payload for POST /api/run-bout.
type RunBoutRequest struct {
	Topic  string   `json:"topic"`
	Agents []string `json:"agents,omitempty"`
	Preset string   `json:"preset,omitempty"`
	Turns  int      `json:"turns,omitempty"`
	Model  string   `json:"model,omitempty"`
}

// RunBoutStream starts a streaming bout via POST /api/run-bout.
// The caller must consume and close the returned StreamHandle.
func (a *Actor) RunBoutStream(ctx context.Context, accountID string, req RunBoutRequest) (*StreamHandle, error) {
	body, headers, status, dur, err := a.c.DoStream(ctx, "POST", "/api/run-bout", accountID, req)
	if err != nil {
		return nil, fmt.Errorf("run-bout stream: %w", err)
	}
	h := &StreamHandle{
		Body:       body,
		StatusCode: status,
		Duration:   dur,
		Headers:    flattenHeaders(headers),
	}
	return h, nil
}

// APIBoutRequest is the payload for POST /api/v1/bout (Lab tier, synchronous).
type APIBoutRequest struct {
	Topic  string   `json:"topic"`
	Agents []string `json:"agents,omitempty"`
	Turns  int      `json:"turns,omitempty"`
	Model  string   `json:"model,omitempty"`
}

// APIBout calls the synchronous POST /api/v1/bout endpoint.
func (a *Actor) APIBout(ctx context.Context, accountID string, req APIBoutRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/v1/bout", accountID, req)
	if err != nil {
		return nil, fmt.Errorf("api-bout: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Agent Actions ----------

// CreateAgentRequest is the payload for POST /api/agents.
type CreateAgentRequest struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	System      string `json:"system,omitempty"`
}

// CreateAgent creates a custom agent via POST /api/agents.
func (a *Actor) CreateAgent(ctx context.Context, accountID string, req CreateAgentRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/agents", accountID, req)
	if err != nil {
		return nil, fmt.Errorf("create-agent: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Reaction Actions ----------

// ReactionRequest is the payload for POST /api/reactions.
type ReactionRequest struct {
	BoutID   string `json:"boutId"`
	TurnID   string `json:"turnId"`
	Reaction string `json:"reaction"` // "heart" or "fire"
}

// ToggleReaction toggles a reaction on a bout turn via POST /api/reactions.
func (a *Actor) ToggleReaction(ctx context.Context, accountID string, req ReactionRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/reactions", accountID, req)
	if err != nil {
		return nil, fmt.Errorf("reaction: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Vote Actions ----------

// WinnerVoteRequest is the payload for POST /api/winner-vote.
type WinnerVoteRequest struct {
	BoutID  string `json:"boutId"`
	AgentID string `json:"agentId"`
}

// CastWinnerVote casts a winner vote via POST /api/winner-vote.
func (a *Actor) CastWinnerVote(ctx context.Context, accountID string, req WinnerVoteRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/winner-vote", accountID, req)
	if err != nil {
		return nil, fmt.Errorf("winner-vote: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Short Links ----------

// ShortLinkRequest is the payload for POST /api/short-links.
type ShortLinkRequest struct {
	BoutID string `json:"boutId"`
}

// CreateShortLink creates a shareable link via POST /api/short-links.
func (a *Actor) CreateShortLink(ctx context.Context, req ShortLinkRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/short-links", "", req)
	if err != nil {
		return nil, fmt.Errorf("short-link: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Feature Requests ----------

// ListFeatureRequests fetches GET /api/feature-requests.
func (a *Actor) ListFeatureRequests(ctx context.Context) (*Result, error) {
	resp, err := a.c.Do(ctx, "GET", "/api/feature-requests", "", nil)
	if err != nil {
		return nil, fmt.Errorf("list-features: %w", err)
	}
	return toResult(resp), nil
}

// SubmitFeatureRequest posts a feature request via POST /api/feature-requests.
type SubmitFeatureRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// SubmitFeature submits a feature request via POST /api/feature-requests.
func (a *Actor) SubmitFeature(ctx context.Context, accountID string, req SubmitFeatureRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/feature-requests", accountID, req)
	if err != nil {
		return nil, fmt.Errorf("submit-feature: %w", err)
	}
	return toResult(resp), nil
}

// FeatureVoteRequest is the payload for POST /api/feature-requests/vote.
type FeatureVoteRequest struct {
	FeatureID string `json:"featureId"`
}

// VoteFeature toggles a vote on a feature request via POST /api/feature-requests/vote.
func (a *Actor) VoteFeature(ctx context.Context, accountID string, req FeatureVoteRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/feature-requests/vote", accountID, req)
	if err != nil {
		return nil, fmt.Errorf("vote-feature: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Paper Submissions ----------

// PaperSubmissionRequest is the payload for POST /api/paper-submissions.
type PaperSubmissionRequest struct {
	ArxivURL    string `json:"arxivUrl"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
}

// SubmitPaper submits an arXiv paper via POST /api/paper-submissions.
func (a *Actor) SubmitPaper(ctx context.Context, accountID string, req PaperSubmissionRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/paper-submissions", accountID, req)
	if err != nil {
		return nil, fmt.Errorf("submit-paper: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Newsletter ----------

// NewsletterRequest is the payload for POST /api/newsletter.
type NewsletterRequest struct {
	Email string `json:"email"`
}

// SubscribeNewsletter subscribes an email via POST /api/newsletter.
func (a *Actor) SubscribeNewsletter(ctx context.Context, req NewsletterRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/newsletter", "", req)
	if err != nil {
		return nil, fmt.Errorf("newsletter: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Contact ----------

// ContactRequest is the payload for POST /api/contact.
type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

// SendContact sends a contact email via POST /api/contact.
func (a *Actor) SendContact(ctx context.Context, req ContactRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/contact", "", req)
	if err != nil {
		return nil, fmt.Errorf("contact: %w", err)
	}
	return toResult(resp), nil
}

// ---------- BYOK ----------

// BYOKStashRequest is the payload for POST /api/byok-stash.
type BYOKStashRequest struct {
	Provider string `json:"provider"`
	APIKey   string `json:"apiKey"`
}

// StashBYOK stores a BYOK API key via POST /api/byok-stash.
func (a *Actor) StashBYOK(ctx context.Context, accountID string, req BYOKStashRequest) (*Result, error) {
	resp, err := a.c.Do(ctx, "POST", "/api/byok-stash", accountID, req)
	if err != nil {
		return nil, fmt.Errorf("byok-stash: %w", err)
	}
	return toResult(resp), nil
}

// ---------- Page Browsing ----------

// BrowsePage fetches a page by path (e.g. "/", "/arena", "/agents").
func (a *Actor) BrowsePage(ctx context.Context, path string) (*Result, error) {
	resp, err := a.c.Do(ctx, "GET", path, "", nil)
	if err != nil {
		return nil, fmt.Errorf("browse %s: %w", path, err)
	}
	return toResult(resp), nil
}

// ---------- Helpers ----------

func flattenHeaders(h map[string][]string) map[string]string {
	flat := make(map[string]string, len(h))
	for k, v := range h {
		if len(v) > 0 {
			flat[k] = v[0]
		}
	}
	return flat
}
