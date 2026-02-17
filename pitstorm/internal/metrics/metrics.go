// Package metrics provides thread-safe counters, latency histograms, and
// reporters for pitstorm simulation runs. All operations are safe for
// concurrent use from multiple worker goroutines.
package metrics

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// Collector aggregates metrics from all workers during a simulation run.
type Collector struct {
	start time.Time

	// Atomic counters.
	requests    atomic.Int64
	successes   atomic.Int64
	errors      atomic.Int64
	retries     atomic.Int64
	rateLimits  atomic.Int64
	boutStarts  atomic.Int64
	boutsDone   atomic.Int64
	totalDeltas atomic.Int64
	totalChars  atomic.Int64

	// Per-endpoint latency histograms.
	latencyMu sync.Mutex
	latencies map[string]*Histogram

	// Per-status-code counters.
	statusMu sync.Mutex
	statuses map[int]*atomic.Int64

	// Per-endpoint error counters.
	errorMu   sync.Mutex
	errCounts map[string]*atomic.Int64

	// Active workers gauge.
	activeWorkers atomic.Int64

	// Active SSE streams gauge + peak watermark.
	activeStreams atomic.Int64
	peakStreams   atomic.Int64

	// SSE stream-level errors (stream parsed OK but contained an error event).
	streamErrors atomic.Int64

	// Per-endpoint first-byte latency histograms.
	firstByteMu sync.Mutex
	firstBytes  map[string]*Histogram
}

// NewCollector creates a metrics collector and records the start time.
func NewCollector() *Collector {
	return &Collector{
		start:      time.Now(),
		latencies:  make(map[string]*Histogram),
		statuses:   make(map[int]*atomic.Int64),
		errCounts:  make(map[string]*atomic.Int64),
		firstBytes: make(map[string]*Histogram),
	}
}

// ---------- Recording methods ----------

// RecordRequest increments the total request counter.
func (c *Collector) RecordRequest() {
	c.requests.Add(1)
}

// RecordSuccess increments the success counter.
func (c *Collector) RecordSuccess() {
	c.successes.Add(1)
}

// RecordError increments the error counter and tracks the endpoint.
func (c *Collector) RecordError(endpoint string) {
	c.errors.Add(1)
	c.errorMu.Lock()
	cnt, ok := c.errCounts[endpoint]
	if !ok {
		cnt = &atomic.Int64{}
		c.errCounts[endpoint] = cnt
	}
	c.errorMu.Unlock()
	cnt.Add(1)
}

// RecordRetry increments the retry counter.
func (c *Collector) RecordRetry() {
	c.retries.Add(1)
}

// RecordRateLimit increments the rate-limit encounter counter.
func (c *Collector) RecordRateLimit() {
	c.rateLimits.Add(1)
}

// RecordLatency records a request latency for the given endpoint.
func (c *Collector) RecordLatency(endpoint string, d time.Duration) {
	c.latencyMu.Lock()
	h, ok := c.latencies[endpoint]
	if !ok {
		h = NewHistogram()
		c.latencies[endpoint] = h
	}
	c.latencyMu.Unlock()
	h.Add(d)
}

// RecordStatus increments the counter for the given HTTP status code.
func (c *Collector) RecordStatus(code int) {
	c.statusMu.Lock()
	cnt, ok := c.statuses[code]
	if !ok {
		cnt = &atomic.Int64{}
		c.statuses[code] = cnt
	}
	c.statusMu.Unlock()
	cnt.Add(1)
}

// RecordBoutStart increments the bout-started counter.
func (c *Collector) RecordBoutStart() {
	c.boutStarts.Add(1)
}

// RecordBoutDone increments the bout-completed counter.
func (c *Collector) RecordBoutDone() {
	c.boutsDone.Add(1)
}

// RecordStreamMetrics records SSE stream metrics (deltas and chars).
func (c *Collector) RecordStreamMetrics(deltas int, chars int) {
	c.totalDeltas.Add(int64(deltas))
	c.totalChars.Add(int64(chars))
}

// WorkerStart increments the active worker gauge.
func (c *Collector) WorkerStart() {
	c.activeWorkers.Add(1)
}

// WorkerDone decrements the active worker gauge.
func (c *Collector) WorkerDone() {
	c.activeWorkers.Add(-1)
}

// StreamStart increments the active stream gauge and updates the peak watermark.
func (c *Collector) StreamStart() {
	n := c.activeStreams.Add(1)
	for {
		peak := c.peakStreams.Load()
		if n <= peak || c.peakStreams.CompareAndSwap(peak, n) {
			break
		}
	}
}

// StreamDone decrements the active stream gauge.
func (c *Collector) StreamDone() {
	c.activeStreams.Add(-1)
}

// RecordStreamError increments the SSE stream-level error counter.
func (c *Collector) RecordStreamError() {
	c.streamErrors.Add(1)
}

// RecordFirstByte records a time-to-first-byte duration for the given endpoint.
func (c *Collector) RecordFirstByte(endpoint string, d time.Duration) {
	c.firstByteMu.Lock()
	h, ok := c.firstBytes[endpoint]
	if !ok {
		h = NewHistogram()
		c.firstBytes[endpoint] = h
	}
	c.firstByteMu.Unlock()
	h.Add(d)
}

// ---------- Snapshot ----------

// Snapshot is a point-in-time copy of all metrics, safe to serialize.
type Snapshot struct {
	Elapsed           time.Duration           `json:"elapsed"`
	Requests          int64                   `json:"requests"`
	Successes         int64                   `json:"successes"`
	Errors            int64                   `json:"errors"`
	Retries           int64                   `json:"retries"`
	RateLimits        int64                   `json:"rateLimits"`
	BoutStarts        int64                   `json:"boutStarts"`
	BoutsDone         int64                   `json:"boutsDone"`
	TotalDeltas       int64                   `json:"totalDeltas"`
	TotalChars        int64                   `json:"totalChars"`
	ActiveWorkers     int64                   `json:"activeWorkers"`
	ActiveStreams     int64                   `json:"activeStreams"`
	ActiveStreamsPeak int64                   `json:"activeStreamsPeak"`
	StreamErrors      int64                   `json:"streamErrors"`
	Throughput        float64                 `json:"throughputRps"`
	ErrorRate         float64                 `json:"errorRate"`
	Latencies         map[string]LatencyStats `json:"latencies"`
	FirstBytes        map[string]LatencyStats `json:"firstBytes,omitempty"`
	StatusCodes       map[int]int64           `json:"statusCodes"`
	ErrorsByEP        map[string]int64        `json:"errorsByEndpoint"`
}

// LatencyStats holds computed percentiles for a latency histogram.
type LatencyStats struct {
	Count int     `json:"count"`
	P50   float64 `json:"p50Ms"`
	P95   float64 `json:"p95Ms"`
	P99   float64 `json:"p99Ms"`
	Min   float64 `json:"minMs"`
	Max   float64 `json:"maxMs"`
	Mean  float64 `json:"meanMs"`
}

// Snapshot takes a consistent point-in-time copy of all metrics.
func (c *Collector) Snapshot() Snapshot {
	elapsed := time.Since(c.start)
	reqs := c.requests.Load()
	errs := c.errors.Load()

	var throughput, errRate float64
	if secs := elapsed.Seconds(); secs > 0 {
		throughput = float64(reqs) / secs
	}
	if reqs > 0 {
		errRate = float64(errs) / float64(reqs)
	}

	// Copy latency histograms.
	c.latencyMu.Lock()
	latencies := make(map[string]LatencyStats, len(c.latencies))
	for ep, h := range c.latencies {
		latencies[ep] = h.Stats()
	}
	c.latencyMu.Unlock()

	// Copy status counters.
	c.statusMu.Lock()
	statuses := make(map[int]int64, len(c.statuses))
	for code, cnt := range c.statuses {
		statuses[code] = cnt.Load()
	}
	c.statusMu.Unlock()

	// Copy error counters.
	c.errorMu.Lock()
	errsByEP := make(map[string]int64, len(c.errCounts))
	for ep, cnt := range c.errCounts {
		errsByEP[ep] = cnt.Load()
	}
	c.errorMu.Unlock()

	// Copy first-byte histograms.
	c.firstByteMu.Lock()
	fb := make(map[string]LatencyStats, len(c.firstBytes))
	for ep, h := range c.firstBytes {
		fb[ep] = h.Stats()
	}
	c.firstByteMu.Unlock()

	return Snapshot{
		Elapsed:           elapsed,
		Requests:          reqs,
		Successes:         c.successes.Load(),
		Errors:            errs,
		Retries:           c.retries.Load(),
		RateLimits:        c.rateLimits.Load(),
		BoutStarts:        c.boutStarts.Load(),
		BoutsDone:         c.boutsDone.Load(),
		TotalDeltas:       c.totalDeltas.Load(),
		TotalChars:        c.totalChars.Load(),
		ActiveWorkers:     c.activeWorkers.Load(),
		ActiveStreams:     c.activeStreams.Load(),
		ActiveStreamsPeak: c.peakStreams.Load(),
		StreamErrors:      c.streamErrors.Load(),
		Throughput:        throughput,
		ErrorRate:         errRate,
		Latencies:         latencies,
		FirstBytes:        fb,
		StatusCodes:       statuses,
		ErrorsByEP:        errsByEP,
	}
}

// JSON returns the snapshot as indented JSON.
func (s Snapshot) JSON() ([]byte, error) {
	return json.MarshalIndent(s, "", "  ")
}

// ---------- Histogram ----------

// Histogram collects time.Duration samples and computes percentiles.
// Thread-safe for concurrent Add calls.
type Histogram struct {
	mu      sync.Mutex
	samples []float64 // milliseconds
}

// NewHistogram creates an empty Histogram.
func NewHistogram() *Histogram {
	return &Histogram{
		samples: make([]float64, 0, 256),
	}
}

// Add records a duration sample.
func (h *Histogram) Add(d time.Duration) {
	ms := float64(d.Microseconds()) / 1000.0
	h.mu.Lock()
	h.samples = append(h.samples, ms)
	h.mu.Unlock()
}

// Count returns the number of recorded samples.
func (h *Histogram) Count() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.samples)
}

// Stats computes percentiles and summary statistics.
func (h *Histogram) Stats() LatencyStats {
	h.mu.Lock()
	if len(h.samples) == 0 {
		h.mu.Unlock()
		return LatencyStats{}
	}
	// Copy to avoid holding the lock during sort.
	sorted := make([]float64, len(h.samples))
	copy(sorted, h.samples)
	h.mu.Unlock()

	sort.Float64s(sorted)
	n := len(sorted)

	var sum float64
	for _, v := range sorted {
		sum += v
	}

	return LatencyStats{
		Count: n,
		P50:   percentile(sorted, 0.50),
		P95:   percentile(sorted, 0.95),
		P99:   percentile(sorted, 0.99),
		Min:   sorted[0],
		Max:   sorted[n-1],
		Mean:  sum / float64(n),
	}
}

// percentile computes the p-th percentile (0.0-1.0) using linear interpolation.
func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	if len(sorted) == 1 {
		return sorted[0]
	}
	rank := p * float64(len(sorted)-1)
	lower := int(math.Floor(rank))
	upper := lower + 1
	if upper >= len(sorted) {
		return sorted[len(sorted)-1]
	}
	frac := rank - float64(lower)
	return sorted[lower] + frac*(sorted[upper]-sorted[lower])
}

// ---------- Terminal Reporter ----------

// FormatSummary returns a human-readable terminal report of the snapshot.
func FormatSummary(s Snapshot) string {
	var b strings.Builder

	fmt.Fprintf(&b, "\n  Elapsed:       %s\n", s.Elapsed.Truncate(time.Millisecond))
	fmt.Fprintf(&b, "  Requests:      %d (%.1f req/s)\n", s.Requests, s.Throughput)
	fmt.Fprintf(&b, "  Successes:     %d\n", s.Successes)
	fmt.Fprintf(&b, "  Errors:        %d (%.1f%%)\n", s.Errors, s.ErrorRate*100)
	fmt.Fprintf(&b, "  Retries:       %d\n", s.Retries)
	fmt.Fprintf(&b, "  Rate Limits:   %d\n", s.RateLimits)
	fmt.Fprintf(&b, "  Bouts:         %d started, %d completed\n", s.BoutStarts, s.BoutsDone)
	fmt.Fprintf(&b, "  Stream Deltas: %d (%d chars)\n", s.TotalDeltas, s.TotalChars)
	fmt.Fprintf(&b, "  Streams:       %d active, %d peak, %d errors\n", s.ActiveStreams, s.ActiveStreamsPeak, s.StreamErrors)
	fmt.Fprintf(&b, "  Workers:       %d active\n", s.ActiveWorkers)

	if len(s.StatusCodes) > 0 {
		fmt.Fprintf(&b, "\n  Status Codes:\n")
		codes := make([]int, 0, len(s.StatusCodes))
		for code := range s.StatusCodes {
			codes = append(codes, code)
		}
		sort.Ints(codes)
		for _, code := range codes {
			fmt.Fprintf(&b, "    %d: %d\n", code, s.StatusCodes[code])
		}
	}

	if len(s.Latencies) > 0 {
		fmt.Fprintf(&b, "\n  Latencies:\n")
		eps := make([]string, 0, len(s.Latencies))
		for ep := range s.Latencies {
			eps = append(eps, ep)
		}
		sort.Strings(eps)
		for _, ep := range eps {
			ls := s.Latencies[ep]
			fmt.Fprintf(&b, "    %-24s n=%-6d p50=%.0fms  p95=%.0fms  p99=%.0fms  min=%.0fms  max=%.0fms\n",
				ep, ls.Count, ls.P50, ls.P95, ls.P99, ls.Min, ls.Max)
		}
	}

	if len(s.FirstBytes) > 0 {
		fmt.Fprintf(&b, "\n  First Byte (TTFB):\n")
		eps := make([]string, 0, len(s.FirstBytes))
		for ep := range s.FirstBytes {
			eps = append(eps, ep)
		}
		sort.Strings(eps)
		for _, ep := range eps {
			fb := s.FirstBytes[ep]
			fmt.Fprintf(&b, "    %-24s n=%-6d p50=%.0fms  p95=%.0fms  p99=%.0fms  min=%.0fms  max=%.0fms\n",
				ep, fb.Count, fb.P50, fb.P95, fb.P99, fb.Min, fb.Max)
		}
	}

	if len(s.ErrorsByEP) > 0 {
		fmt.Fprintf(&b, "\n  Errors by Endpoint:\n")
		eps := make([]string, 0, len(s.ErrorsByEP))
		for ep := range s.ErrorsByEP {
			eps = append(eps, ep)
		}
		sort.Strings(eps)
		for _, ep := range eps {
			fmt.Fprintf(&b, "    %-24s %d\n", ep, s.ErrorsByEP[ep])
		}
	}

	return b.String()
}
