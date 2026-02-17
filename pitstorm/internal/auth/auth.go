// Package auth provides headless Clerk authentication for pitstorm test accounts.
// It uses the Clerk Frontend API (FAPI) exclusively — no Backend API keys required.
// The publishable key is decoded to derive the FAPI base URL, then standard HTTP
// calls perform email+password sign-in and JWT minting.
//
// The package is designed for testability: all HTTP calls go through a configurable
// base URL, making it trivial to use httptest for unit tests.
package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Client performs Clerk Frontend API authentication.
type Client struct {
	httpClient *http.Client
	fapiURL    string // e.g. "https://epic-dogfish-18.clerk.accounts.dev"
}

// NewClient creates a Clerk FAPI client from a publishable key.
// The publishable key format is "pk_test_<base64-encoded-fapi-domain>$" or
// "pk_live_<base64-encoded-fapi-domain>$".
func NewClient(publishableKey string) (*Client, error) {
	fapiURL, err := DecodeFAPIURL(publishableKey)
	if err != nil {
		return nil, err
	}
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		fapiURL:    fapiURL,
	}, nil
}

// NewClientWithURL creates a Clerk FAPI client with an explicit base URL.
// Useful for testing with httptest.
func NewClientWithURL(fapiURL string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		fapiURL:    strings.TrimRight(fapiURL, "/"),
	}
}

// DecodeFAPIURL extracts the Frontend API URL from a Clerk publishable key.
func DecodeFAPIURL(publishableKey string) (string, error) {
	// Format: pk_test_<base64>$ or pk_live_<base64>$
	parts := strings.SplitN(publishableKey, "_", 3)
	if len(parts) != 3 || parts[0] != "pk" {
		return "", fmt.Errorf("invalid publishable key format")
	}

	encoded := parts[2]
	// Some keys have a trailing $ delimiter; strip it before decoding.
	encoded = strings.TrimSuffix(encoded, "$")

	// Clerk keys use standard base64 but may omit padding. Try with
	// padding first, then without (RawStdEncoding), then URL-safe variants.
	var decoded []byte
	var err error
	for _, enc := range [](*base64.Encoding){
		base64.StdEncoding,
		base64.RawStdEncoding,
		base64.URLEncoding,
		base64.RawURLEncoding,
	} {
		decoded, err = enc.DecodeString(encoded)
		if err == nil {
			break
		}
	}
	if err != nil {
		return "", fmt.Errorf("decode publishable key: %w", err)
	}

	// The decoded domain may have a trailing $ from Clerk's encoding.
	domain := strings.TrimSuffix(string(decoded), "$")
	if domain == "" {
		return "", fmt.Errorf("empty domain in publishable key")
	}

	return "https://" + domain, nil
}

// SignInResult holds the outcome of a sign-in attempt.
type SignInResult struct {
	SessionID string // Clerk session ID for token minting.
	ClientID  string // Clerk client ID.
	UserID    string // Clerk user ID.
	Token     string // JWT session token.
	ExpiresAt time.Time
}

// SignIn performs email+password authentication against the Clerk Frontend API
// and returns a session token. This is a two-step process:
//  1. POST /v1/client/sign_ins — initiate sign-in with email+password
//  2. POST /v1/client/sessions/{id}/tokens — mint a JWT from the session
func (c *Client) SignIn(ctx context.Context, email, password string) (*SignInResult, error) {
	// Step 1: Create sign-in.
	signInResp, err := c.createSignIn(ctx, email, password)
	if err != nil {
		return nil, fmt.Errorf("create sign-in: %w", err)
	}

	// Check sign-in status.
	if signInResp.Status != "complete" {
		return nil, fmt.Errorf("sign-in not complete: status=%q (may require 2FA)", signInResp.Status)
	}

	// Extract session ID from the response.
	sessionID := signInResp.CreatedSessionID
	if sessionID == "" {
		return nil, fmt.Errorf("sign-in complete but no session ID returned")
	}

	// Extract user ID.
	userID := ""
	if signInResp.UserID != "" {
		userID = signInResp.UserID
	}

	// Step 2: Mint a JWT from the session.
	tokenResp, err := c.mintToken(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("mint token: %w", err)
	}

	return &SignInResult{
		SessionID: sessionID,
		UserID:    userID,
		Token:     tokenResp.JWT,
		ExpiresAt: time.Unix(tokenResp.ExpiresAt, 0),
	}, nil
}

// RefreshToken mints a new JWT for an existing session.
func (c *Client) RefreshToken(ctx context.Context, sessionID string) (string, time.Time, error) {
	resp, err := c.mintToken(ctx, sessionID)
	if err != nil {
		return "", time.Time{}, err
	}
	return resp.JWT, time.Unix(resp.ExpiresAt, 0), nil
}

// ---------- Backend API (requires secret key) ----------

// BackendClient uses the Clerk Backend API (secret key) for operations
// that cannot be done via the Frontend API alone, such as creating
// sign-in tokens to bypass phone verification on production instances.
type BackendClient struct {
	httpClient *http.Client
	secretKey  string
	apiURL     string // default: "https://api.clerk.com"
}

// NewBackendClient creates a Backend API client with the given secret key.
func NewBackendClient(secretKey string) *BackendClient {
	return &BackendClient{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		secretKey:  secretKey,
		apiURL:     "https://api.clerk.com",
	}
}

// NewBackendClientWithURL creates a Backend API client with a custom base URL.
// Useful for testing with httptest.
func NewBackendClientWithURL(secretKey, apiURL string) *BackendClient {
	return &BackendClient{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		secretKey:  secretKey,
		apiURL:     strings.TrimRight(apiURL, "/"),
	}
}

// signInTokenResponse is the Backend API response for creating a sign-in token.
type signInTokenResponse struct {
	ID     string `json:"id"`
	UserID string `json:"user_id"`
	Token  string `json:"token"`
	Status string `json:"status"`
	URL    string `json:"url"`
}

// CreateSignInToken creates a one-time sign-in token for the given user.
// This token can be redeemed via the FAPI to create a session, bypassing
// the normal sign-in flow (including phone verification / 2FA).
func (b *BackendClient) CreateSignInToken(ctx context.Context, userID string) (*signInTokenResponse, error) {
	body := fmt.Sprintf(`{"user_id":%q}`, userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		b.apiURL+"/v1/sign_in_tokens", strings.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+b.secretKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "pitstorm/1.0")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("create sign-in token failed: HTTP %d: %s",
			resp.StatusCode, truncate(string(respBody), 200))
	}

	var result signInTokenResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}
	if result.Token == "" {
		return nil, fmt.Errorf("empty token in sign-in token response")
	}

	return &result, nil
}

// CreateUserRequest holds the parameters for creating a Clerk user via the Backend API.
type CreateUserRequest struct {
	Email    string
	Password string
}

// CreateUserResponse holds the result of creating a Clerk user.
type CreateUserResponse struct {
	ID    string `json:"id"`
	Email string `json:"-"` // set by caller for convenience
}

// CreateUser creates a new user in Clerk via the Backend API (POST /v1/users).
// If the user already exists (409), it looks them up by email and returns the existing ID.
func (b *BackendClient) CreateUser(ctx context.Context, req CreateUserRequest) (*CreateUserResponse, error) {
	body := fmt.Sprintf(`{"email_address":[%q],"password":%q,"skip_password_checks":true}`,
		req.Email, req.Password)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		b.apiURL+"/v1/users", strings.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+b.secretKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "pitstorm/1.0")

	resp, err := b.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	// 422 with "already exists" means the user already exists — look them up.
	if resp.StatusCode == http.StatusUnprocessableEntity && strings.Contains(string(respBody), "taken") {
		existingID, lookupErr := b.LookupUserByEmail(ctx, req.Email)
		if lookupErr != nil {
			return nil, fmt.Errorf("user exists but lookup failed: %w", lookupErr)
		}
		return &CreateUserResponse{ID: existingID, Email: req.Email}, nil
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("create user failed: HTTP %d: %s",
			resp.StatusCode, truncate(string(respBody), 300))
	}

	var result CreateUserResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}
	result.Email = req.Email
	return &result, nil
}

// LookupUserByEmail finds a Clerk user by email address via the Backend API.
// Returns the user ID or an error if not found.
func (b *BackendClient) LookupUserByEmail(ctx context.Context, email string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		b.apiURL+"/v1/users?email_address="+url.QueryEscape(email)+"&limit=1", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+b.secretKey)
	req.Header.Set("User-Agent", "pitstorm/1.0")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("lookup failed: HTTP %d: %s",
			resp.StatusCode, truncate(string(respBody), 200))
	}

	var users []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &users); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}
	if len(users) == 0 {
		return "", fmt.Errorf("no user found with email %q", email)
	}

	return users[0].ID, nil
}

// SignInWithTicket performs ticket-based sign-in via the Clerk Frontend API.
// This is a two-step process:
//  1. POST /v1/client/sign_ins with strategy=ticket and ticket=<token>
//  2. POST /v1/client/sessions/{id}/tokens — mint a JWT from the session
//
// This flow bypasses email+password and phone verification requirements.
func (c *Client) SignInWithTicket(ctx context.Context, ticket string, userID string) (*SignInResult, error) {
	// Create sign-in with ticket strategy.
	signInResp, _, err := c.createSignInWithTicket(ctx, ticket)
	if err != nil {
		return nil, fmt.Errorf("ticket sign-in: %w", err)
	}

	if signInResp.Status != "complete" {
		return nil, fmt.Errorf("ticket sign-in not complete: status=%q", signInResp.Status)
	}

	sessionID := signInResp.CreatedSessionID
	if sessionID == "" {
		return nil, fmt.Errorf("ticket sign-in complete but no session ID returned")
	}

	// The FAPI response includes the JWT in the session's last_active_token.
	jwt := signInResp.SessionJWT
	if jwt == "" {
		return nil, fmt.Errorf("ticket sign-in complete but no JWT in session response")
	}

	// Try to extract user ID from response, fall back to provided userID.
	resolvedUserID := userID
	if signInResp.UserID != "" {
		resolvedUserID = signInResp.UserID
	}

	expiresAt := extractJWTExpiry(jwt)

	return &SignInResult{
		SessionID: sessionID,
		UserID:    resolvedUserID,
		Token:     jwt,
		ExpiresAt: time.Unix(expiresAt, 0),
	}, nil
}

// newCookieClient creates an HTTP client with a cookie jar for stateful FAPI requests.
// The Clerk FAPI uses cookies to track client state between sign-in and token mint.
func newCookieClient() *http.Client {
	jar, _ := cookiejar.New(nil) // error is only non-nil if options are invalid
	return &http.Client{
		Timeout: 30 * time.Second,
		Jar:     jar,
	}
}

func (c *Client) createSignInWithTicket(ctx context.Context, ticket string) (*signInResponse, *http.Client, error) {
	// Use a fresh cookie-aware client — the FAPI requires cookies to link
	// the sign-in response to subsequent token mint requests.
	cl := newCookieClient()

	form := url.Values{}
	form.Set("strategy", "ticket")
	form.Set("ticket", ticket)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.fapiURL+"/v1/client/sign_ins", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "pitstorm/1.0")

	resp, err := cl.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("sign-in failed: HTTP %d: %s", resp.StatusCode, truncate(string(body), 200))
	}

	var envelope clerkResponse
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, nil, fmt.Errorf("parse response envelope: %w", err)
	}

	var signIn signInResponse
	if err := json.Unmarshal(envelope.Response, &signIn); err != nil {
		return nil, nil, fmt.Errorf("parse sign-in response: %w", err)
	}

	// Extract user ID and JWT from the client sessions.
	if len(envelope.Client) > 0 {
		var clientResp clerkClientResponse
		if err := json.Unmarshal(envelope.Client, &clientResp); err == nil {
			for _, s := range clientResp.Sessions {
				if s.ID == signIn.CreatedSessionID {
					if s.User.ID != "" {
						signIn.UserID = s.User.ID
					}
					if s.LastActiveToken != nil && s.LastActiveToken.JWT != "" {
						signIn.SessionJWT = s.LastActiveToken.JWT
					}
					break
				}
			}
		}
	}

	return &signIn, cl, nil
}

// ---------- Internal API calls ----------

// signInResponse represents the relevant fields from the Clerk sign-in API response.
type signInResponse struct {
	ID               string `json:"id"`
	Status           string `json:"status"`
	CreatedSessionID string `json:"created_session_id"`
	UserID           string `json:"-"` // Extracted from nested structure.
	SessionJWT       string `json:"-"` // Extracted from client.sessions[].last_active_token.jwt.
}

// clerkResponse wraps the standard Clerk FAPI response envelope.
type clerkResponse struct {
	Response json.RawMessage `json:"response"`
	Client   json.RawMessage `json:"client"`
}

// clerkClientResponse is the client object in the FAPI response.
type clerkClientResponse struct {
	Sessions []clerkSessionRef `json:"sessions"`
}

// clerkSessionRef is a minimal session reference within the client response.
type clerkSessionRef struct {
	ID              string           `json:"id"`
	Status          string           `json:"status"`
	User            clerkUserRef     `json:"user"`
	Object          string           `json:"object"`
	LastActiveToken *clerkTokenInner `json:"last_active_token"`
}

// clerkTokenInner is the embedded token in a session reference.
type clerkTokenInner struct {
	Object string `json:"object"`
	JWT    string `json:"jwt"`
}

// clerkUserRef is a minimal user reference.
type clerkUserRef struct {
	ID string `json:"id"`
}

// tokenResponse represents the Clerk token minting response.
type tokenResponse struct {
	JWT       string `json:"jwt"`
	ExpiresAt int64  `json:"-"` // Extracted from the object.
}

// clerkTokenResponse is the FAPI response for token minting.
type clerkTokenResponse struct {
	Object string `json:"object"`
	JWT    string `json:"jwt"`
}

func (c *Client) createSignIn(ctx context.Context, email, password string) (*signInResponse, error) {
	form := url.Values{}
	form.Set("identifier", email)
	form.Set("password", password)
	form.Set("strategy", "password")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.fapiURL+"/v1/client/sign_ins", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "pitstorm/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("sign-in failed: HTTP %d: %s", resp.StatusCode, truncate(string(body), 200))
	}

	// Parse the FAPI envelope.
	var envelope clerkResponse
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("parse response envelope: %w", err)
	}

	// Parse the sign-in response.
	var signIn signInResponse
	if err := json.Unmarshal(envelope.Response, &signIn); err != nil {
		return nil, fmt.Errorf("parse sign-in response: %w", err)
	}

	// Extract user ID and JWT from the client sessions.
	if len(envelope.Client) > 0 {
		var clientResp clerkClientResponse
		if err := json.Unmarshal(envelope.Client, &clientResp); err == nil {
			for _, s := range clientResp.Sessions {
				if s.ID == signIn.CreatedSessionID {
					if s.User.ID != "" {
						signIn.UserID = s.User.ID
					}
					if s.LastActiveToken != nil && s.LastActiveToken.JWT != "" {
						signIn.SessionJWT = s.LastActiveToken.JWT
					}
					break
				}
			}
		}
	}

	return &signIn, nil
}

func (c *Client) mintToken(ctx context.Context, sessionID string) (*tokenResponse, error) {
	return c.mintTokenWithClient(ctx, sessionID, c.httpClient)
}

func (c *Client) mintTokenWithClient(ctx context.Context, sessionID string, cl *http.Client) (*tokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.fapiURL+"/v1/client/sessions/"+sessionID+"/tokens", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "pitstorm/1.0")

	resp, err := cl.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token mint failed: HTTP %d: %s", resp.StatusCode, truncate(string(body), 200))
	}

	// The token endpoint returns a JWT directly in the response field.
	var tokenResp clerkTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("parse token response: %w", err)
	}

	jwt := tokenResp.JWT
	if jwt == "" {
		return nil, fmt.Errorf("empty JWT in token response")
	}

	// Extract expiry from JWT claims (middle segment).
	expiresAt := extractJWTExpiry(jwt)

	return &tokenResponse{
		JWT:       jwt,
		ExpiresAt: expiresAt,
	}, nil
}

// extractJWTExpiry parses the exp claim from a JWT without verifying the signature.
// Returns 0 if parsing fails (caller should handle gracefully).
func extractJWTExpiry(jwt string) int64 {
	parts := strings.SplitN(jwt, ".", 3)
	if len(parts) != 3 {
		return 0
	}

	// JWT payload is base64url-encoded.
	payload := parts[1]
	// Add padding if needed.
	switch len(payload) % 4 {
	case 2:
		payload += "=="
	case 3:
		payload += "="
	}

	decoded, err := base64.URLEncoding.DecodeString(payload)
	if err != nil {
		return 0
	}

	var claims struct {
		Exp int64 `json:"exp"`
	}
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return 0
	}

	return claims.Exp
}

// ---------- Token Refresher ----------

// Refresher periodically refreshes session tokens for all active accounts.
// It runs as a background goroutine and updates the accounts file in place.
type Refresher struct {
	client   *Client
	interval time.Duration
	mu       sync.Mutex
	stopCh   chan struct{}
	stopped  bool
}

// NewRefresher creates a token refresher that runs every interval.
func NewRefresher(client *Client, interval time.Duration) *Refresher {
	return &Refresher{
		client:   client,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// RefreshTarget holds the session info needed to refresh a single account's token.
type RefreshTarget struct {
	AccountID string
	SessionID string
}

// RefreshCallback is called with the refreshed token for an account.
type RefreshCallback func(accountID, token string, expiresAt time.Time)

// Start begins the background refresh loop.
func (r *Refresher) Start(ctx context.Context, targets []RefreshTarget, callback RefreshCallback) {
	go r.loop(ctx, targets, callback)
}

// Stop signals the refresher to stop.
func (r *Refresher) Stop() {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.stopped {
		r.stopped = true
		close(r.stopCh)
	}
}

func (r *Refresher) loop(ctx context.Context, targets []RefreshTarget, callback RefreshCallback) {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-r.stopCh:
			return
		case <-ticker.C:
			for _, t := range targets {
				token, expiresAt, err := r.client.RefreshToken(ctx, t.SessionID)
				if err != nil {
					// Log but don't stop — other accounts may succeed.
					continue
				}
				callback(t.AccountID, token, expiresAt)
			}
		}
	}
}

// ---------- Helpers ----------

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
