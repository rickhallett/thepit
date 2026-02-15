package cmd

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRunSmokeAllRoutesOK(t *testing.T) {
	// Create a mock server that returns 200 for all routes.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		fmt.Fprint(w, "OK")
	}))
	defer server.Close()

	// Capture that RunSmoke doesn't return an error.
	err := RunSmoke(server.URL)
	if err != nil {
		t.Errorf("RunSmoke() error: %v", err)
	}
}

func TestRunSmokeSomeRoutesFail(t *testing.T) {
	// Create a server that fails for /arena.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/arena" {
			w.WriteHeader(500)
			return
		}
		w.WriteHeader(200)
	}))
	defer server.Close()

	// RunSmoke should still return nil (it reports but doesn't error on failed routes).
	err := RunSmoke(server.URL)
	if err != nil {
		t.Errorf("RunSmoke() error: %v", err)
	}
}

func TestRunSmokeStrictAllOK(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		fmt.Fprint(w, "OK")
	}))
	defer server.Close()

	// strict=true should not error when all routes return 200.
	err := RunSmoke(server.URL, true)
	if err != nil {
		t.Errorf("RunSmoke(strict=true) unexpected error: %v", err)
	}
}

func TestRunSmokeStrictWithFailures(t *testing.T) {
	failRoutes := map[string]bool{"/arena": true, "/research": true}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if failRoutes[r.URL.Path] {
			w.WriteHeader(500)
			return
		}
		w.WriteHeader(200)
	}))
	defer server.Close()

	// strict=true should return an error when routes fail.
	err := RunSmoke(server.URL, true)
	if err == nil {
		t.Fatal("RunSmoke(strict=true) expected error for failed routes, got nil")
	}

	// Verify the error message includes failure count.
	expected := fmt.Sprintf("%d/%d routes failed", 2, len(SmokeRoutes))
	if err.Error() != expected {
		t.Errorf("RunSmoke(strict=true) error = %q, want %q", err.Error(), expected)
	}
}

func TestRunSmokeStrictFalseWithFailures(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/arena" {
			w.WriteHeader(500)
			return
		}
		w.WriteHeader(200)
	}))
	defer server.Close()

	// strict=false explicitly should not error even with failures.
	err := RunSmoke(server.URL, false)
	if err != nil {
		t.Errorf("RunSmoke(strict=false) unexpected error: %v", err)
	}
}

func TestSmokeRoutesComplete(t *testing.T) {
	// Verify all expected routes are in the SmokeRoutes list.
	expected := map[string]bool{
		"/":            true,
		"/arena":       true,
		"/leaderboard": true,
		"/agents":      true,
		"/research":    true,
		"/roadmap":     true,
		"/contact":     true,
		"/sign-in":     true,
		"/sign-up":     true,
	}

	for _, route := range SmokeRoutes {
		if !expected[route] {
			t.Errorf("unexpected route in SmokeRoutes: %q", route)
		}
		delete(expected, route)
	}

	for route := range expected {
		t.Errorf("missing route in SmokeRoutes: %q", route)
	}
}
