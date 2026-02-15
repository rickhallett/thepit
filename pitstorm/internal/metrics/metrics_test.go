package metrics

import (
	"encoding/json"
	"math"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestNewCollector(t *testing.T) {
	c := NewCollector()
	if c == nil {
		t.Fatal("NewCollector returned nil")
	}
	s := c.Snapshot()
	if s.Requests != 0 {
		t.Errorf("Requests = %d, want 0", s.Requests)
	}
	if s.Elapsed <= 0 {
		t.Error("Elapsed should be positive")
	}
}

func TestAtomicCounters(t *testing.T) {
	c := NewCollector()

	c.RecordRequest()
	c.RecordRequest()
	c.RecordRequest()
	c.RecordSuccess()
	c.RecordSuccess()
	c.RecordError("/api/health")
	c.RecordRetry()
	c.RecordRateLimit()
	c.RecordBoutStart()
	c.RecordBoutStart()
	c.RecordBoutDone()
	c.RecordStreamMetrics(100, 5000)

	s := c.Snapshot()

	if s.Requests != 3 {
		t.Errorf("Requests = %d, want 3", s.Requests)
	}
	if s.Successes != 2 {
		t.Errorf("Successes = %d, want 2", s.Successes)
	}
	if s.Errors != 1 {
		t.Errorf("Errors = %d, want 1", s.Errors)
	}
	if s.Retries != 1 {
		t.Errorf("Retries = %d, want 1", s.Retries)
	}
	if s.RateLimits != 1 {
		t.Errorf("RateLimits = %d, want 1", s.RateLimits)
	}
	if s.BoutStarts != 2 {
		t.Errorf("BoutStarts = %d, want 2", s.BoutStarts)
	}
	if s.BoutsDone != 1 {
		t.Errorf("BoutsDone = %d, want 1", s.BoutsDone)
	}
	if s.TotalDeltas != 100 {
		t.Errorf("TotalDeltas = %d, want 100", s.TotalDeltas)
	}
	if s.TotalChars != 5000 {
		t.Errorf("TotalChars = %d, want 5000", s.TotalChars)
	}
}

func TestWorkerGauge(t *testing.T) {
	c := NewCollector()

	c.WorkerStart()
	c.WorkerStart()
	c.WorkerStart()
	s := c.Snapshot()
	if s.ActiveWorkers != 3 {
		t.Errorf("ActiveWorkers = %d, want 3", s.ActiveWorkers)
	}

	c.WorkerDone()
	s = c.Snapshot()
	if s.ActiveWorkers != 2 {
		t.Errorf("ActiveWorkers = %d, want 2", s.ActiveWorkers)
	}
}

func TestThroughput(t *testing.T) {
	c := NewCollector()

	// Record some requests and wait briefly.
	for i := 0; i < 10; i++ {
		c.RecordRequest()
	}
	time.Sleep(10 * time.Millisecond)

	s := c.Snapshot()
	if s.Throughput <= 0 {
		t.Errorf("Throughput = %f, want > 0", s.Throughput)
	}
}

func TestErrorRate(t *testing.T) {
	c := NewCollector()

	c.RecordRequest()
	c.RecordRequest()
	c.RecordRequest()
	c.RecordRequest()
	c.RecordError("/test")

	s := c.Snapshot()
	// 1 error out of 4 requests = 0.25.
	if math.Abs(s.ErrorRate-0.25) > 0.01 {
		t.Errorf("ErrorRate = %f, want 0.25", s.ErrorRate)
	}
}

func TestErrorRateZeroRequests(t *testing.T) {
	c := NewCollector()
	s := c.Snapshot()
	if s.ErrorRate != 0 {
		t.Errorf("ErrorRate = %f, want 0 (no requests)", s.ErrorRate)
	}
}

func TestLatencyRecording(t *testing.T) {
	c := NewCollector()

	c.RecordLatency("/api/health", 10*time.Millisecond)
	c.RecordLatency("/api/health", 20*time.Millisecond)
	c.RecordLatency("/api/health", 30*time.Millisecond)
	c.RecordLatency("/api/run-bout", 500*time.Millisecond)

	s := c.Snapshot()

	health, ok := s.Latencies["/api/health"]
	if !ok {
		t.Fatal("no latency for /api/health")
	}
	if health.Count != 3 {
		t.Errorf("Count = %d, want 3", health.Count)
	}
	if health.Min < 9 || health.Min > 11 {
		t.Errorf("Min = %f, want ~10", health.Min)
	}
	if health.Max < 29 || health.Max > 31 {
		t.Errorf("Max = %f, want ~30", health.Max)
	}

	bout, ok := s.Latencies["/api/run-bout"]
	if !ok {
		t.Fatal("no latency for /api/run-bout")
	}
	if bout.Count != 1 {
		t.Errorf("Count = %d, want 1", bout.Count)
	}
}

func TestStatusCodeTracking(t *testing.T) {
	c := NewCollector()

	c.RecordStatus(200)
	c.RecordStatus(200)
	c.RecordStatus(200)
	c.RecordStatus(429)
	c.RecordStatus(503)

	s := c.Snapshot()

	if s.StatusCodes[200] != 3 {
		t.Errorf("200 = %d, want 3", s.StatusCodes[200])
	}
	if s.StatusCodes[429] != 1 {
		t.Errorf("429 = %d, want 1", s.StatusCodes[429])
	}
	if s.StatusCodes[503] != 1 {
		t.Errorf("503 = %d, want 1", s.StatusCodes[503])
	}
}

func TestErrorsByEndpoint(t *testing.T) {
	c := NewCollector()

	c.RecordError("/api/health")
	c.RecordError("/api/health")
	c.RecordError("/api/run-bout")

	s := c.Snapshot()

	if s.ErrorsByEP["/api/health"] != 2 {
		t.Errorf("/api/health errors = %d, want 2", s.ErrorsByEP["/api/health"])
	}
	if s.ErrorsByEP["/api/run-bout"] != 1 {
		t.Errorf("/api/run-bout errors = %d, want 1", s.ErrorsByEP["/api/run-bout"])
	}
}

func TestConcurrentRecording(t *testing.T) {
	c := NewCollector()
	var wg sync.WaitGroup

	// 100 goroutines each recording 100 times.
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				c.RecordRequest()
				c.RecordSuccess()
				c.RecordLatency("/api/health", time.Duration(j)*time.Millisecond)
				c.RecordStatus(200)
			}
		}()
	}
	wg.Wait()

	s := c.Snapshot()
	if s.Requests != 10000 {
		t.Errorf("Requests = %d, want 10000", s.Requests)
	}
	if s.Successes != 10000 {
		t.Errorf("Successes = %d, want 10000", s.Successes)
	}
	if s.Latencies["/api/health"].Count != 10000 {
		t.Errorf("Latency count = %d, want 10000", s.Latencies["/api/health"].Count)
	}
	if s.StatusCodes[200] != 10000 {
		t.Errorf("200 = %d, want 10000", s.StatusCodes[200])
	}
}

// ---------- Histogram tests ----------

func TestHistogramEmpty(t *testing.T) {
	h := NewHistogram()
	s := h.Stats()
	if s.Count != 0 {
		t.Errorf("Count = %d, want 0", s.Count)
	}
	if s.P50 != 0 {
		t.Errorf("P50 = %f, want 0", s.P50)
	}
}

func TestHistogramSingleValue(t *testing.T) {
	h := NewHistogram()
	h.Add(100 * time.Millisecond)

	s := h.Stats()
	if s.Count != 1 {
		t.Errorf("Count = %d, want 1", s.Count)
	}
	if math.Abs(s.P50-100) > 1 {
		t.Errorf("P50 = %f, want ~100", s.P50)
	}
	if math.Abs(s.Min-100) > 1 {
		t.Errorf("Min = %f, want ~100", s.Min)
	}
	if math.Abs(s.Max-100) > 1 {
		t.Errorf("Max = %f, want ~100", s.Max)
	}
}

func TestHistogramPercentiles(t *testing.T) {
	h := NewHistogram()

	// Add 100 samples: 1ms, 2ms, ..., 100ms.
	for i := 1; i <= 100; i++ {
		h.Add(time.Duration(i) * time.Millisecond)
	}

	s := h.Stats()
	if s.Count != 100 {
		t.Errorf("Count = %d, want 100", s.Count)
	}

	// P50 should be ~50ms.
	if math.Abs(s.P50-50.5) > 1 {
		t.Errorf("P50 = %f, want ~50.5", s.P50)
	}
	// P95 should be ~95ms.
	if math.Abs(s.P95-95.05) > 1 {
		t.Errorf("P95 = %f, want ~95.05", s.P95)
	}
	// P99 should be ~99ms.
	if math.Abs(s.P99-99.01) > 1 {
		t.Errorf("P99 = %f, want ~99.01", s.P99)
	}
	// Min = 1ms.
	if math.Abs(s.Min-1) > 0.1 {
		t.Errorf("Min = %f, want ~1", s.Min)
	}
	// Max = 100ms.
	if math.Abs(s.Max-100) > 0.1 {
		t.Errorf("Max = %f, want ~100", s.Max)
	}
	// Mean = 50.5ms.
	if math.Abs(s.Mean-50.5) > 0.5 {
		t.Errorf("Mean = %f, want ~50.5", s.Mean)
	}
}

func TestHistogramCount(t *testing.T) {
	h := NewHistogram()
	h.Add(1 * time.Millisecond)
	h.Add(2 * time.Millisecond)
	if h.Count() != 2 {
		t.Errorf("Count = %d, want 2", h.Count())
	}
}

func TestPercentileEdgeCases(t *testing.T) {
	// Empty slice.
	if got := percentile(nil, 0.5); got != 0 {
		t.Errorf("percentile(nil, 0.5) = %f, want 0", got)
	}

	// Single element.
	if got := percentile([]float64{42}, 0.99); got != 42 {
		t.Errorf("percentile([42], 0.99) = %f, want 42", got)
	}

	// Two elements.
	got := percentile([]float64{10, 20}, 0.5)
	if math.Abs(got-15) > 0.01 {
		t.Errorf("percentile([10,20], 0.5) = %f, want 15", got)
	}
}

// ---------- Snapshot serialisation ----------

func TestSnapshotJSON(t *testing.T) {
	c := NewCollector()
	c.RecordRequest()
	c.RecordSuccess()
	c.RecordLatency("/api/health", 15*time.Millisecond)
	c.RecordStatus(200)

	s := c.Snapshot()
	b, err := s.JSON()
	if err != nil {
		t.Fatalf("JSON: %v", err)
	}

	// Verify it's valid JSON.
	var parsed map[string]any
	if err := json.Unmarshal(b, &parsed); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	if parsed["requests"] != float64(1) {
		t.Errorf("requests = %v, want 1", parsed["requests"])
	}
}

func TestSnapshotJSONFields(t *testing.T) {
	c := NewCollector()
	c.RecordRequest()
	c.RecordError("/test")
	c.RecordLatency("/test", 10*time.Millisecond)
	c.RecordStatus(500)
	c.RecordBoutStart()
	c.RecordStreamMetrics(50, 2000)

	s := c.Snapshot()
	b, err := s.JSON()
	if err != nil {
		t.Fatalf("JSON: %v", err)
	}

	str := string(b)
	requiredFields := []string{
		"elapsed", "requests", "successes", "errors", "retries",
		"rateLimits", "boutStarts", "boutsDone", "totalDeltas",
		"totalChars", "activeWorkers", "throughputRps", "errorRate",
		"latencies", "statusCodes", "errorsByEndpoint",
	}
	for _, field := range requiredFields {
		if !strings.Contains(str, `"`+field+`"`) {
			t.Errorf("JSON missing field %q", field)
		}
	}
}

// ---------- Terminal reporter ----------

func TestFormatSummary(t *testing.T) {
	c := NewCollector()

	for i := 0; i < 100; i++ {
		c.RecordRequest()
		c.RecordSuccess()
		c.RecordLatency("/api/health", time.Duration(i+1)*time.Millisecond)
		c.RecordStatus(200)
	}
	c.RecordError("/api/run-bout")
	c.RecordRateLimit()
	c.RecordBoutStart()
	c.RecordBoutDone()
	c.RecordStreamMetrics(500, 25000)
	c.WorkerStart()

	s := c.Snapshot()
	report := FormatSummary(s)

	checks := []string{
		"Requests:", "Successes:", "Errors:", "Retries:", "Rate Limits:",
		"Bouts:", "Stream Deltas:", "Workers:", "Status Codes:", "200:",
		"Latencies:", "/api/health", "p50=", "p95=", "p99=",
		"Errors by Endpoint:", "/api/run-bout",
	}
	for _, check := range checks {
		if !strings.Contains(report, check) {
			t.Errorf("report missing %q", check)
		}
	}
}

func TestFormatSummaryEmpty(t *testing.T) {
	c := NewCollector()
	s := c.Snapshot()
	report := FormatSummary(s)

	// Should not panic and should contain basic fields.
	if !strings.Contains(report, "Requests:") {
		t.Error("empty report missing Requests")
	}
	// Should NOT contain sections with no data.
	if strings.Contains(report, "Status Codes:") {
		t.Error("empty report should not have Status Codes section")
	}
}
