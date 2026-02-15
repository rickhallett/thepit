package engine

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/rickhallett/thepit/pitstorm/internal/action"
	"github.com/rickhallett/thepit/pitstorm/internal/budget"
	"github.com/rickhallett/thepit/pitstorm/internal/client"
	"github.com/rickhallett/thepit/pitstorm/internal/metrics"
	"github.com/rickhallett/thepit/pitstorm/internal/persona"
)

// newTestEngine creates a test engine backed by an httptest server.
func newTestEngine(t *testing.T, handler http.HandlerFunc, cfg Config, personas []*persona.Spec) (*Engine, func()) {
	t.Helper()
	srv := httptest.NewServer(handler)
	clientCfg := client.DefaultConfig(srv.URL)
	clientCfg.MaxRetries = 0
	cl := client.New(clientCfg, nil)
	act := action.New(cl)
	m := metrics.NewCollector()
	b := budget.NewGate(float64(cfg.Workers) * 10.0) // generous budget for tests

	if personas == nil {
		personas = []*persona.Spec{persona.FreeLurker()}
	}

	e := New(cfg, cl, act, m, b, personas, nil)

	cleanup := func() {
		cl.Close()
		srv.Close()
	}
	return e, cleanup
}

func TestEngineRunsAndStops(t *testing.T) {
	var requestCount atomic.Int32
	handler := func(w http.ResponseWriter, r *http.Request) {
		requestCount.Add(1)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}

	cfg := Config{
		Workers:  2,
		Duration: 200 * time.Millisecond,
	}

	e, cleanup := newTestEngine(t, handler, cfg, nil)
	defer cleanup()

	err := e.Run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	// Should have made some requests.
	if n := requestCount.Load(); n == 0 {
		t.Error("expected some requests, got 0")
	}

	// Workers should all be done.
	snap := e.metrics.Snapshot()
	if snap.ActiveWorkers != 0 {
		t.Errorf("ActiveWorkers = %d, want 0 after Run completes", snap.ActiveWorkers)
	}
}

func TestEngineContextCancellation(t *testing.T) {
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}

	cfg := Config{
		Workers:  2,
		Duration: 10 * time.Second, // long duration
	}

	e, cleanup := newTestEngine(t, handler, cfg, nil)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	start := time.Now()
	err := e.Run(ctx)
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if elapsed > 2*time.Second {
		t.Errorf("Run took %v, should have stopped quickly via context", elapsed)
	}
}

func TestEngineBudgetExhaustion(t *testing.T) {
	var requestCount atomic.Int32
	handler := func(w http.ResponseWriter, r *http.Request) {
		requestCount.Add(1)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}

	srv := httptest.NewServer(http.HandlerFunc(handler))
	defer srv.Close()

	clientCfg := client.DefaultConfig(srv.URL)
	clientCfg.MaxRetries = 0
	cl := client.New(clientCfg, nil)
	defer cl.Close()
	act := action.New(cl)
	m := metrics.NewCollector()
	b := budget.NewGate(0.0001) // extremely tight budget

	// Pre-exhaust the budget.
	b.Charge("test", 0.001)

	personas := []*persona.Spec{persona.FreeLurker()}
	cfg := Config{
		Workers:  2,
		Duration: 5 * time.Second,
	}

	e := New(cfg, cl, act, m, b, personas, nil)

	start := time.Now()
	err := e.Run(context.Background())
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	// Should stop quickly when budget is exhausted.
	if elapsed > 3*time.Second {
		t.Errorf("Run took %v, should stop quickly when budget exhausted", elapsed)
	}
}

func TestEngineNoPersonas(t *testing.T) {
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}

	cfg := Config{
		Workers:  1,
		Duration: 100 * time.Millisecond,
	}

	srv := httptest.NewServer(http.HandlerFunc(handler))
	defer srv.Close()

	clientCfg := client.DefaultConfig(srv.URL)
	cl := client.New(clientCfg, nil)
	defer cl.Close()
	act := action.New(cl)
	m := metrics.NewCollector()
	b := budget.NewGate(10)

	e := New(cfg, cl, act, m, b, nil, nil)

	err := e.Run(context.Background())
	if err == nil {
		t.Error("Run with no personas should return error")
	}
}

func TestEngineWithRateFunc(t *testing.T) {
	var requestCount atomic.Int32
	handler := func(w http.ResponseWriter, r *http.Request) {
		requestCount.Add(1)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}

	cfg := Config{
		Workers:  4,
		Duration: 300 * time.Millisecond,
		RateFunc: func(elapsed, total time.Duration) float64 {
			return 50 // 50 req/s
		},
	}

	e, cleanup := newTestEngine(t, handler, cfg, nil)
	defer cleanup()

	err := e.Run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	n := requestCount.Load()
	if n == 0 {
		t.Error("expected some requests with rate limiter")
	}
}

func TestEngineMultiplePersonas(t *testing.T) {
	var requestCount atomic.Int32
	handler := func(w http.ResponseWriter, r *http.Request) {
		requestCount.Add(1)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}

	personas := []*persona.Spec{
		persona.FreeLurker(),
		persona.FreeCasual(),
		persona.PassSubscriber(),
	}

	cfg := Config{
		Workers:  3,
		Duration: 200 * time.Millisecond,
	}

	e, cleanup := newTestEngine(t, handler, cfg, personas)
	defer cleanup()

	err := e.Run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	if n := requestCount.Load(); n == 0 {
		t.Error("expected requests from multiple personas")
	}
}

func TestEngineRecordsMetrics(t *testing.T) {
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}

	cfg := Config{
		Workers:  2,
		Duration: 200 * time.Millisecond,
	}

	e, cleanup := newTestEngine(t, handler, cfg, nil)
	defer cleanup()

	err := e.Run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	snap := e.metrics.Snapshot()
	if snap.Requests == 0 {
		t.Error("expected non-zero request count")
	}
	if snap.Successes == 0 {
		t.Error("expected non-zero success count")
	}
	if len(snap.StatusCodes) == 0 {
		t.Error("expected status code tracking")
	}
}

// ---------- Dispatcher tests ----------

func TestDispatcherBrowse(t *testing.T) {
	var gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("<html>ok</html>"))
	}))
	defer srv.Close()

	clientCfg := client.DefaultConfig(srv.URL)
	clientCfg.MaxRetries = 0
	cl := client.New(clientCfg, nil)
	defer cl.Close()
	act := action.New(cl)
	m := metrics.NewCollector()
	b := budget.NewGate(10)

	d := NewDispatcher(act, m, b, nil)
	d.Dispatch(context.Background(), 0, persona.FreeLurker(), persona.ActionBrowse)

	snap := m.Snapshot()
	if snap.Requests != 1 {
		t.Errorf("Requests = %d, want 1", snap.Requests)
	}
	if gotPath == "" {
		t.Error("expected a page path to be hit")
	}
}

func TestDispatcherRecordsErrors(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("error"))
	}))
	defer srv.Close()

	clientCfg := client.DefaultConfig(srv.URL)
	clientCfg.MaxRetries = 0
	cl := client.New(clientCfg, nil)
	defer cl.Close()
	act := action.New(cl)
	m := metrics.NewCollector()
	b := budget.NewGate(10)

	d := NewDispatcher(act, m, b, nil)
	d.Dispatch(context.Background(), 0, persona.FreeLurker(), persona.ActionBrowse)

	snap := m.Snapshot()
	if snap.Errors == 0 {
		t.Error("expected error to be recorded for 500 response")
	}
	if snap.StatusCodes[500] == 0 {
		t.Error("expected 500 status code to be recorded")
	}
}

func TestDispatcherRateLimitTracking(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte("rate limited"))
	}))
	defer srv.Close()

	clientCfg := client.DefaultConfig(srv.URL)
	clientCfg.MaxRetries = 0
	cl := client.New(clientCfg, nil)
	defer cl.Close()
	act := action.New(cl)
	m := metrics.NewCollector()
	b := budget.NewGate(10)

	d := NewDispatcher(act, m, b, nil)
	d.Dispatch(context.Background(), 0, persona.FreeLurker(), persona.ActionListFeatures)

	snap := m.Snapshot()
	if snap.RateLimits == 0 {
		t.Error("expected rate limit to be recorded for 429 response")
	}
}

// ---------- Helper tests ----------

func TestActionEndpoint(t *testing.T) {
	tests := []struct {
		action persona.Action
		want   string
	}{
		{persona.ActionBrowse, "/browse"},
		{persona.ActionRunBout, "/api/run-bout"},
		{persona.ActionAPIBout, "/api/v1/bout"},
		{persona.ActionCreateAgent, "/api/agents"},
		{persona.ActionReaction, "/api/reactions"},
		{persona.ActionVote, "/api/winner-vote"},
		{persona.ActionShortLink, "/api/short-links"},
		{persona.ActionNewsletter, "/api/newsletter"},
		{persona.ActionContact, "/api/contact"},
		{persona.ActionBYOK, "/api/byok-stash"},
	}

	for _, tt := range tests {
		got := actionEndpoint(tt.action)
		if got != tt.want {
			t.Errorf("actionEndpoint(%q) = %q, want %q", tt.action, got, tt.want)
		}
	}
}

func TestEstimateTokens(t *testing.T) {
	chars := 4000 // ~1000 tokens
	input := estimateInputTokens(chars)
	output := estimateOutputTokens(chars)

	if output != 1000 {
		t.Errorf("estimateOutputTokens(4000) = %d, want 1000", output)
	}
	if input != 5500 {
		t.Errorf("estimateInputTokens(4000) = %d, want 5500", input)
	}
}

func TestAccountID(t *testing.T) {
	anon := persona.FreeLurker()
	if id := accountID(anon); id != "" {
		t.Errorf("accountID(anon) = %q, want empty", id)
	}

	auth := persona.FreeCasual()
	if id := accountID(auth); id != "account-free-casual" {
		t.Errorf("accountID(free-casual) = %q, want account-free-casual", id)
	}
}

func TestIntn(t *testing.T) {
	for i := 0; i < 100; i++ {
		n := intn(10)
		if n < 0 || n >= 10 {
			t.Errorf("intn(10) = %d, out of range", n)
		}
	}
	if n := intn(0); n != 0 {
		t.Errorf("intn(0) = %d, want 0", n)
	}
}
