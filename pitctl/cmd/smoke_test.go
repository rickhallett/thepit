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
