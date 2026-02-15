package profile

import (
	"math"
	"testing"
	"time"
)

func TestGetValidProfiles(t *testing.T) {
	for _, name := range Names() {
		fn, err := Get(name, 10.0)
		if err != nil {
			t.Errorf("Get(%q): %v", name, err)
		}
		if fn == nil {
			t.Errorf("Get(%q) returned nil", name)
		}
	}
}

func TestGetUnknown(t *testing.T) {
	_, err := Get("nonexistent", 10.0)
	if err == nil {
		t.Error("Get(nonexistent) should error")
	}
}

func TestNames(t *testing.T) {
	names := Names()
	if len(names) != 5 {
		t.Errorf("Names() returned %d, want 5", len(names))
	}
	expected := []string{"trickle", "steady", "ramp", "spike", "viral"}
	for i, want := range expected {
		if names[i] != want {
			t.Errorf("names[%d] = %q, want %q", i, names[i], want)
		}
	}
}

// ---------- Trickle ----------

func TestTrickleLowRate(t *testing.T) {
	fn := Trickle(5.0)
	total := 60 * time.Second

	for elapsed := 0 * time.Second; elapsed <= total; elapsed += 5 * time.Second {
		rate := fn(elapsed, total)
		if rate < 0.5 || rate > 2.5 {
			t.Errorf("Trickle at %v: rate=%.2f, want [0.5, 2.5]", elapsed, rate)
		}
	}
}

func TestTrickleVeryLowPeak(t *testing.T) {
	fn := Trickle(0.5)
	rate := fn(0, 60*time.Second)
	if rate < 0 || rate > 1.0 {
		t.Errorf("Trickle(0.5) at t=0: rate=%.2f, should be <= 1.0", rate)
	}
}

// ---------- Steady ----------

func TestSteadyConstant(t *testing.T) {
	fn := Steady(42.0)
	total := 10 * time.Minute

	for elapsed := 0 * time.Second; elapsed <= total; elapsed += 30 * time.Second {
		rate := fn(elapsed, total)
		if rate != 42.0 {
			t.Errorf("Steady at %v: rate=%.2f, want 42.0", elapsed, rate)
		}
	}
}

// ---------- Ramp ----------

func TestRampStartsAtZero(t *testing.T) {
	fn := Ramp(100.0)
	total := 10 * time.Minute

	rate := fn(0, total)
	if rate > 1.0 {
		t.Errorf("Ramp at t=0: rate=%.2f, want ~0", rate)
	}
}

func TestRampReachesPeak(t *testing.T) {
	fn := Ramp(100.0)
	total := 10 * time.Minute

	// At 70% should be at peak (ramp up is 0-60%, hold is 60-80%).
	rate := fn(time.Duration(float64(total)*0.7), total)
	if math.Abs(rate-100.0) > 1.0 {
		t.Errorf("Ramp at 70%%: rate=%.2f, want ~100", rate)
	}
}

func TestRampEasesOff(t *testing.T) {
	fn := Ramp(100.0)
	total := 10 * time.Minute

	// At 100% should be near 10% of peak.
	rate := fn(total, total)
	if rate > 15 {
		t.Errorf("Ramp at end: rate=%.2f, want ~10", rate)
	}
}

func TestRampMidpoint(t *testing.T) {
	fn := Ramp(100.0)
	total := 10 * time.Minute

	// At 30% (half of ramp phase), should be ~50.
	rate := fn(time.Duration(float64(total)*0.3), total)
	if math.Abs(rate-50.0) > 5.0 {
		t.Errorf("Ramp at 30%%: rate=%.2f, want ~50", rate)
	}
}

func TestRampZeroDuration(t *testing.T) {
	fn := Ramp(100.0)
	rate := fn(0, 0)
	if rate != 100.0 {
		t.Errorf("Ramp with zero duration: rate=%.2f, want peak", rate)
	}
}

// ---------- Spike ----------

func TestSpikeBaseline(t *testing.T) {
	fn := Spike(100.0)
	total := 10 * time.Minute

	// At start: should be at baseline (10%).
	rate := fn(0, total)
	if math.Abs(rate-10.0) > 1.0 {
		t.Errorf("Spike at start: rate=%.2f, want ~10", rate)
	}
}

func TestSpikePeak(t *testing.T) {
	fn := Spike(100.0)
	total := 10 * time.Minute

	// At midpoint: should be at peak.
	rate := fn(time.Duration(float64(total)*0.5), total)
	if math.Abs(rate-100.0) > 1.0 {
		t.Errorf("Spike at midpoint: rate=%.2f, want ~100", rate)
	}
}

func TestSpikeAfter(t *testing.T) {
	fn := Spike(100.0)
	total := 10 * time.Minute

	// At 80%: should be at baseline.
	rate := fn(time.Duration(float64(total)*0.8), total)
	if math.Abs(rate-10.0) > 1.0 {
		t.Errorf("Spike at 80%%: rate=%.2f, want ~10", rate)
	}
}

// ---------- Viral ----------

func TestViralStartsLow(t *testing.T) {
	fn := Viral(100.0)
	total := 10 * time.Minute

	rate := fn(0, total)
	if rate > 2.0 {
		t.Errorf("Viral at start: rate=%.2f, want ~1 (1%% of peak)", rate)
	}
}

func TestViralReachesPeak(t *testing.T) {
	fn := Viral(100.0)
	total := 10 * time.Minute

	rate := fn(total, total)
	if math.Abs(rate-100.0) > 1.0 {
		t.Errorf("Viral at end: rate=%.2f, want ~100", rate)
	}
}

func TestViralExponentialGrowth(t *testing.T) {
	fn := Viral(100.0)
	total := 10 * time.Minute

	rate25 := fn(time.Duration(float64(total)*0.25), total)
	rate50 := fn(time.Duration(float64(total)*0.5), total)
	rate75 := fn(time.Duration(float64(total)*0.75), total)

	// Should be strictly increasing.
	if rate50 <= rate25 {
		t.Errorf("Viral should increase: rate25=%.2f, rate50=%.2f", rate25, rate50)
	}
	if rate75 <= rate50 {
		t.Errorf("Viral should increase: rate50=%.2f, rate75=%.2f", rate50, rate75)
	}

	// Growth should be exponential — later half grows much faster.
	growth1 := rate50 - rate25
	growth2 := rate75 - rate50
	if growth2 <= growth1 {
		t.Errorf("Viral should accelerate: growth1=%.2f, growth2=%.2f", growth1, growth2)
	}
}

func TestViralNeverExceedsPeak(t *testing.T) {
	fn := Viral(50.0)
	total := 5 * time.Minute

	for elapsed := 0 * time.Second; elapsed <= total; elapsed += 10 * time.Second {
		rate := fn(elapsed, total)
		if rate > 50.1 { // small epsilon for float
			t.Errorf("Viral at %v: rate=%.2f exceeds peak 50", elapsed, rate)
		}
	}
}

func TestViralZeroDuration(t *testing.T) {
	fn := Viral(100.0)
	rate := fn(0, 0)
	if rate != 100.0 {
		t.Errorf("Viral with zero duration: rate=%.2f, want peak", rate)
	}
}

// ---------- Edge cases ----------

func TestProfilesHandleNegativeElapsed(t *testing.T) {
	profiles := []struct {
		name string
		fn   RateFunc
	}{
		{"ramp", Ramp(100)},
		{"spike", Spike(100)},
		{"viral", Viral(100)},
	}

	for _, p := range profiles {
		rate := p.fn(-1*time.Second, 10*time.Minute)
		if rate < 0 {
			t.Errorf("%s with negative elapsed: rate=%.2f, should be >= 0", p.name, rate)
		}
	}
}

func TestProfilesHandleElapsedBeyondTotal(t *testing.T) {
	profiles := []struct {
		name string
		fn   RateFunc
	}{
		{"ramp", Ramp(100)},
		{"spike", Spike(100)},
		{"viral", Viral(100)},
	}

	for _, p := range profiles {
		rate := p.fn(20*time.Minute, 10*time.Minute) // elapsed > total
		if rate < 0 {
			t.Errorf("%s with elapsed > total: rate=%.2f, should be >= 0", p.name, rate)
		}
	}
}

// ---------- Describe ----------

func TestDescribe(t *testing.T) {
	for _, name := range Names() {
		desc := Describe(name)
		if desc == "" || desc == "Unknown profile" {
			t.Errorf("Describe(%q) = %q, want a description", name, desc)
		}
	}
}

func TestDescribeUnknown(t *testing.T) {
	desc := Describe("nonexistent")
	if desc != "Unknown profile" {
		t.Errorf("Describe(nonexistent) = %q, want 'Unknown profile'", desc)
	}
}
