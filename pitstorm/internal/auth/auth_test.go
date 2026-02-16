package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// ---------- DecodeFAPIURL ----------

func TestDecodeFAPIURL_Valid(t *testing.T) {
	// Encode a known domain.
	domain := "epic-dogfish-18.clerk.accounts.dev"
	encoded := base64.StdEncoding.EncodeToString([]byte(domain))
	key := "pk_test_" + encoded + "$"

	got, err := DecodeFAPIURL(key)
	if err != nil {
		t.Fatalf("DecodeFAPIURL(%q) error: %v", key, err)
	}
	want := "https://" + domain
	if got != want {
		t.Errorf("DecodeFAPIURL(%q) = %q, want %q", key, got, want)
	}
}

func TestDecodeFAPIURL_LiveKey(t *testing.T) {
	domain := "clerk.thepit.cloud"
	encoded := base64.StdEncoding.EncodeToString([]byte(domain))
	key := "pk_live_" + encoded + "$"

	got, err := DecodeFAPIURL(key)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "https://"+domain {
		t.Errorf("got %q, want %q", got, "https://"+domain)
	}
}

func TestDecodeFAPIURL_InvalidFormat(t *testing.T) {
	cases := []string{
		"",
		"invalid",
		"sk_test_abc$", // wrong prefix
		"pk_abc$",      // missing mode segment
	}
	for _, key := range cases {
		_, err := DecodeFAPIURL(key)
		if err == nil {
			t.Errorf("DecodeFAPIURL(%q) expected error, got nil", key)
		}
	}
}

func TestDecodeFAPIURL_EmptyDomain(t *testing.T) {
	// Base64 of empty string.
	key := "pk_test_$"
	_, err := DecodeFAPIURL(key)
	if err == nil {
		t.Error("expected error for empty domain")
	}
}

// ---------- extractJWTExpiry ----------

func TestExtractJWTExpiry_Valid(t *testing.T) {
	// Create a fake JWT with exp claim.
	exp := time.Now().Add(time.Hour).Unix()
	claims := fmt.Sprintf(`{"exp":%d,"sub":"user_123"}`, exp)
	payload := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(claims))
	jwt := "eyJhbGciOiJSUzI1NiJ9." + payload + ".fakesig"

	got := extractJWTExpiry(jwt)
	if got != exp {
		t.Errorf("extractJWTExpiry = %d, want %d", got, exp)
	}
}

func TestExtractJWTExpiry_Invalid(t *testing.T) {
	cases := []string{
		"",
		"not.a.jwt",
		"a.!!!invalid-base64!!!.c",
		"a." + base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(`not json`)) + ".c",
	}
	for _, jwt := range cases {
		got := extractJWTExpiry(jwt)
		if got != 0 {
			t.Errorf("extractJWTExpiry(%q) = %d, want 0", jwt, got)
		}
	}
}

// ---------- SignIn ----------

func fakeJWT(exp int64) string {
	header := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(`{"alg":"RS256"}`))
	claims := fmt.Sprintf(`{"exp":%d,"sub":"user_test123"}`, exp)
	payload := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(claims))
	sig := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte("fakesig"))
	return header + "." + payload + "." + sig
}

func TestSignIn_Success(t *testing.T) {
	exp := time.Now().Add(time.Hour).Unix()
	jwt := fakeJWT(exp)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/v1/client/sign_ins" && r.Method == http.MethodPost:
			// Verify form values.
			if err := r.ParseForm(); err != nil {
				http.Error(w, "parse form", 400)
				return
			}
			if r.Form.Get("identifier") != "test@example.com" {
				http.Error(w, "wrong email", 400)
				return
			}
			if r.Form.Get("password") != "Test_pass_2025!" {
				http.Error(w, "wrong password", 400)
				return
			}

			resp := clerkResponse{}
			signIn := map[string]any{
				"id":                 "sia_test123",
				"status":             "complete",
				"created_session_id": "sess_test456",
			}
			clientObj := map[string]any{
				"sessions": []map[string]any{
					{
						"id":     "sess_test456",
						"status": "active",
						"user":   map[string]string{"id": "user_abc789"},
					},
				},
			}
			resp.Response, _ = json.Marshal(signIn)
			resp.Client, _ = json.Marshal(clientObj)
			json.NewEncoder(w).Encode(resp)

		case strings.HasPrefix(r.URL.Path, "/v1/client/sessions/") && strings.HasSuffix(r.URL.Path, "/tokens"):
			// Extract session ID from path.
			parts := strings.Split(r.URL.Path, "/")
			sessID := parts[4]
			if sessID != "sess_test456" {
				http.Error(w, "wrong session", 400)
				return
			}
			json.NewEncoder(w).Encode(clerkTokenResponse{
				Object: "token",
				JWT:    jwt,
			})

		default:
			http.Error(w, "not found", 404)
		}
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	result, err := client.SignIn(context.Background(), "test@example.com", "Test_pass_2025!")
	if err != nil {
		t.Fatalf("SignIn error: %v", err)
	}

	if result.SessionID != "sess_test456" {
		t.Errorf("SessionID = %q, want %q", result.SessionID, "sess_test456")
	}
	if result.UserID != "user_abc789" {
		t.Errorf("UserID = %q, want %q", result.UserID, "user_abc789")
	}
	if result.Token != jwt {
		t.Errorf("Token mismatch")
	}
	if result.ExpiresAt.Unix() != exp {
		t.Errorf("ExpiresAt = %d, want %d", result.ExpiresAt.Unix(), exp)
	}
}

func TestSignIn_BadCredentials(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		w.Write([]byte(`{"errors":[{"message":"Identifier or password is incorrect."}]}`))
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	_, err := client.SignIn(context.Background(), "bad@example.com", "wrong")
	if err == nil {
		t.Fatal("expected error for bad credentials")
	}
	if !strings.Contains(err.Error(), "HTTP 422") {
		t.Errorf("error should mention HTTP 422, got: %v", err)
	}
}

func TestSignIn_Needs2FA(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := clerkResponse{}
		signIn := map[string]any{
			"id":     "sia_test123",
			"status": "needs_second_factor",
		}
		resp.Response, _ = json.Marshal(signIn)
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	_, err := client.SignIn(context.Background(), "test@example.com", "pass")
	if err == nil {
		t.Fatal("expected error for 2FA requirement")
	}
	if !strings.Contains(err.Error(), "2FA") {
		t.Errorf("error should mention 2FA, got: %v", err)
	}
}

func TestSignIn_NoSessionID(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := clerkResponse{}
		signIn := map[string]any{
			"id":                 "sia_test123",
			"status":             "complete",
			"created_session_id": "",
		}
		resp.Response, _ = json.Marshal(signIn)
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	_, err := client.SignIn(context.Background(), "test@example.com", "pass")
	if err == nil {
		t.Fatal("expected error for missing session ID")
	}
	if !strings.Contains(err.Error(), "no session ID") {
		t.Errorf("error should mention missing session ID, got: %v", err)
	}
}

func TestSignIn_TokenMintFails(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/client/sign_ins" {
			resp := clerkResponse{}
			signIn := map[string]any{
				"id":                 "sia_test123",
				"status":             "complete",
				"created_session_id": "sess_test456",
			}
			resp.Response, _ = json.Marshal(signIn)
			json.NewEncoder(w).Encode(resp)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal"}`))
		}
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	_, err := client.SignIn(context.Background(), "test@example.com", "pass")
	if err == nil {
		t.Fatal("expected error when token mint fails")
	}
	if !strings.Contains(err.Error(), "mint token") {
		t.Errorf("error should mention mint token, got: %v", err)
	}
}

func TestSignIn_EmptyJWT(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/client/sign_ins" {
			resp := clerkResponse{}
			signIn := map[string]any{
				"id":                 "sia_test123",
				"status":             "complete",
				"created_session_id": "sess_test456",
			}
			resp.Response, _ = json.Marshal(signIn)
			json.NewEncoder(w).Encode(resp)
		} else {
			json.NewEncoder(w).Encode(clerkTokenResponse{
				Object: "token",
				JWT:    "",
			})
		}
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	_, err := client.SignIn(context.Background(), "test@example.com", "pass")
	if err == nil {
		t.Fatal("expected error for empty JWT")
	}
}

func TestSignIn_ContextCanceled(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(5 * time.Second)
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := client.SignIn(ctx, "test@example.com", "pass")
	if err == nil {
		t.Fatal("expected error for canceled context")
	}
}

// ---------- RefreshToken ----------

func TestRefreshToken_Success(t *testing.T) {
	exp := time.Now().Add(time.Hour).Unix()
	jwt := fakeJWT(exp)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/v1/client/sessions/") {
			http.Error(w, "wrong path", 404)
			return
		}
		json.NewEncoder(w).Encode(clerkTokenResponse{
			Object: "token",
			JWT:    jwt,
		})
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	token, expiresAt, err := client.RefreshToken(context.Background(), "sess_test456")
	if err != nil {
		t.Fatalf("RefreshToken error: %v", err)
	}
	if token != jwt {
		t.Error("token mismatch")
	}
	if expiresAt.Unix() != exp {
		t.Errorf("expiresAt = %d, want %d", expiresAt.Unix(), exp)
	}
}

func TestRefreshToken_ServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	_, _, err := client.RefreshToken(context.Background(), "sess_bad")
	if err == nil {
		t.Fatal("expected error for server error")
	}
}

// ---------- Refresher ----------

func TestRefresher_CallsCallback(t *testing.T) {
	exp := time.Now().Add(time.Hour).Unix()
	jwt := fakeJWT(exp)
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount.Add(1)
		json.NewEncoder(w).Encode(clerkTokenResponse{
			Object: "token",
			JWT:    jwt,
		})
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	refresher := NewRefresher(client, 50*time.Millisecond)

	var gotAccountID string
	var gotToken string
	var mu atomic.Int32

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	refresher.Start(ctx, []RefreshTarget{
		{AccountID: "account-free-casual", SessionID: "sess_123"},
	}, func(accountID, token string, expiresAt time.Time) {
		if mu.Add(1) == 1 {
			gotAccountID = accountID
			gotToken = token
		}
	})

	<-ctx.Done()
	refresher.Stop()

	// Give a moment for goroutines to finish.
	time.Sleep(20 * time.Millisecond)

	if callCount.Load() == 0 {
		t.Fatal("refresher never called the server")
	}
	if gotAccountID != "account-free-casual" {
		t.Errorf("callback accountID = %q, want %q", gotAccountID, "account-free-casual")
	}
	if gotToken != jwt {
		t.Error("callback token mismatch")
	}
}

func TestRefresher_StopImmediately(t *testing.T) {
	client := NewClientWithURL("http://localhost:0")
	refresher := NewRefresher(client, time.Hour)

	ctx := context.Background()
	refresher.Start(ctx, nil, func(string, string, time.Time) {})
	refresher.Stop()
	// Double-stop should not panic.
	refresher.Stop()
}

func TestRefresher_SkipsFailedAccounts(t *testing.T) {
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Fail all requests.
		w.WriteHeader(http.StatusInternalServerError)
		callCount.Add(1)
	}))
	defer srv.Close()

	client := NewClientWithURL(srv.URL)
	refresher := NewRefresher(client, 30*time.Millisecond)

	var cbCalls atomic.Int32
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	refresher.Start(ctx, []RefreshTarget{
		{AccountID: "test", SessionID: "sess_bad"},
	}, func(string, string, time.Time) {
		cbCalls.Add(1)
	})

	<-ctx.Done()
	refresher.Stop()
	time.Sleep(20 * time.Millisecond)

	if callCount.Load() == 0 {
		t.Fatal("refresher never called the server")
	}
	if cbCalls.Load() != 0 {
		t.Errorf("callback called %d times, expected 0 (all requests failed)", cbCalls.Load())
	}
}

// ---------- truncate ----------

func TestTruncate(t *testing.T) {
	if got := truncate("short", 10); got != "short" {
		t.Errorf("got %q, want %q", got, "short")
	}
	if got := truncate("a longer string", 5); got != "a lon..." {
		t.Errorf("got %q, want %q", got, "a lon...")
	}
}

// ---------- NewClient ----------

func TestNewClient_ValidKey(t *testing.T) {
	domain := "test.clerk.accounts.dev"
	encoded := base64.StdEncoding.EncodeToString([]byte(domain))
	key := "pk_test_" + encoded + "$"

	client, err := NewClient(key)
	if err != nil {
		t.Fatalf("NewClient error: %v", err)
	}
	if client.fapiURL != "https://"+domain {
		t.Errorf("fapiURL = %q, want %q", client.fapiURL, "https://"+domain)
	}
}

func TestNewClient_InvalidKey(t *testing.T) {
	_, err := NewClient("invalid_key")
	if err == nil {
		t.Fatal("expected error for invalid key")
	}
}

func TestNewClientWithURL_TrailingSlash(t *testing.T) {
	client := NewClientWithURL("http://localhost:8080/")
	if client.fapiURL != "http://localhost:8080" {
		t.Errorf("fapiURL = %q, want trailing slash stripped", client.fapiURL)
	}
}
