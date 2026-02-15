package budget

import (
	"math"
	"strings"
	"sync"
	"testing"
)

func TestNewGate(t *testing.T) {
	g := NewGate(10.0)
	if g.Ceiling() != 10.0 {
		t.Errorf("Ceiling = %f, want 10.0", g.Ceiling())
	}
	if g.Spent() != 0 {
		t.Errorf("Spent = %f, want 0", g.Spent())
	}
	if g.Exhausted() {
		t.Error("should not be exhausted initially")
	}
}

func TestUnlimitedBudget(t *testing.T) {
	g := NewGate(0) // unlimited

	est, ok := g.Allow("claude-opus-4-6", 12)
	if !ok {
		t.Error("unlimited budget should always allow")
	}
	if est <= 0 {
		t.Errorf("estimate should be positive, got %f", est)
	}

	g.Charge("claude-opus-4-6", 100.0)
	if g.Exhausted() {
		t.Error("unlimited budget should never be exhausted")
	}
	if g.Remaining() != math.MaxFloat64 {
		t.Errorf("Remaining = %f, want MaxFloat64", g.Remaining())
	}
}

func TestAllowWithinBudget(t *testing.T) {
	g := NewGate(1.0)

	est, ok := g.Allow("claude-haiku-4-5-20251001", 4)
	if !ok {
		t.Error("should allow small bout within 1 GBP budget")
	}
	if est <= 0 {
		t.Error("estimate should be positive")
	}
}

func TestAllowExceedsBudget(t *testing.T) {
	g := NewGate(0.001) // very tight budget

	// A 12-turn Opus bout costs ~0.06 GBP.
	_, ok := g.Allow("claude-opus-4-6", 12)
	if ok {
		t.Error("should deny Opus bout when budget is 0.001 GBP")
	}
}

func TestAllowAfterSpending(t *testing.T) {
	g := NewGate(0.10)

	// Charge 0.09 GBP manually.
	g.Charge("claude-haiku-4-5-20251001", 0.09)

	// A 12-turn Haiku bout costs ~0.012 GBP. 0.09 + 0.012 > 0.10.
	_, ok := g.Allow("claude-haiku-4-5-20251001", 12)
	if ok {
		t.Error("should deny when remaining budget insufficient")
	}
}

func TestCharge(t *testing.T) {
	g := NewGate(10.0)

	g.Charge("claude-sonnet-4-5-20250929", 0.05)
	g.Charge("claude-sonnet-4-5-20250929", 0.03)

	spent := g.Spent()
	if math.Abs(spent-0.08) > 0.0001 {
		t.Errorf("Spent = %f, want ~0.08", spent)
	}
}

func TestChargeTokens(t *testing.T) {
	g := NewGate(10.0)

	// 1000 input + 500 output tokens on Sonnet.
	cost := g.ChargeTokens("claude-sonnet-4-5-20250929", 1000, 500)
	if cost <= 0 {
		t.Errorf("cost should be positive, got %f", cost)
	}

	spent := g.Spent()
	if math.Abs(spent-cost) > 0.0001 {
		t.Errorf("Spent = %f, want %f", spent, cost)
	}
}

func TestRemaining(t *testing.T) {
	g := NewGate(1.0)
	g.Charge("test", 0.25)

	rem := g.Remaining()
	if math.Abs(rem-0.75) > 0.0001 {
		t.Errorf("Remaining = %f, want ~0.75", rem)
	}
}

func TestRemainingNeverNegative(t *testing.T) {
	g := NewGate(0.01)
	g.Charge("test", 1.0) // overspend

	rem := g.Remaining()
	if rem != 0 {
		t.Errorf("Remaining = %f, want 0 (clamped)", rem)
	}
}

func TestExhausted(t *testing.T) {
	g := NewGate(0.05)

	if g.Exhausted() {
		t.Error("should not be exhausted initially")
	}

	g.Charge("test", 0.05)
	if !g.Exhausted() {
		t.Error("should be exhausted after spending 0.05/0.05")
	}
}

func TestSummary(t *testing.T) {
	g := NewGate(5.0)
	g.Charge("claude-sonnet-4-5-20250929", 0.10)
	g.Charge("claude-haiku-4-5-20251001", 0.02)
	g.Charge("claude-sonnet-4-5-20250929", 0.05)

	s := g.Summary()
	if s.CeilingGBP != 5.0 {
		t.Errorf("CeilingGBP = %f, want 5.0", s.CeilingGBP)
	}
	if s.BoutCount != 3 {
		t.Errorf("BoutCount = %d, want 3", s.BoutCount)
	}
	if math.Abs(s.SpentGBP-0.17) > 0.001 {
		t.Errorf("SpentGBP = %f, want ~0.17", s.SpentGBP)
	}
	if s.ByModel["claude-sonnet-4-5-20250929"] < 0.14 {
		t.Errorf("Sonnet spend = %f, want ~0.15", s.ByModel["claude-sonnet-4-5-20250929"])
	}
}

func TestSummaryUnlimited(t *testing.T) {
	g := NewGate(0)
	g.Charge("test", 1.0)

	s := g.Summary()
	if s.RemainingGBP != -1 {
		t.Errorf("RemainingGBP = %f, want -1 (unlimited)", s.RemainingGBP)
	}
	if s.Exhausted {
		t.Error("unlimited should never be exhausted")
	}
}

func TestFormatSummaryWithBudget(t *testing.T) {
	s := Summary{
		CeilingGBP:   10.0,
		SpentGBP:     2.5,
		RemainingGBP: 7.5,
		BoutCount:    50,
	}
	text := FormatSummary(s)
	if !strings.Contains(text, "£2.5000") {
		t.Errorf("missing spent: %s", text)
	}
	if !strings.Contains(text, "£10.00") {
		t.Errorf("missing ceiling: %s", text)
	}
	if !strings.Contains(text, "50 bouts") {
		t.Errorf("missing bout count: %s", text)
	}
}

func TestFormatSummaryUnlimited(t *testing.T) {
	s := Summary{CeilingGBP: 0, SpentGBP: 1.0, BoutCount: 10}
	text := FormatSummary(s)
	if !strings.Contains(text, "unlimited") {
		t.Errorf("should say unlimited: %s", text)
	}
}

// ---------- Cost estimation ----------

func TestEstimateBoutCostHaiku(t *testing.T) {
	// 12-turn Haiku standard bout.
	cost := EstimateBoutCost("claude-haiku-4-5-20251001", 12, 120)
	// Expected: ~0.01217 GBP (from parity test golden values).
	if math.Abs(cost-0.01217) > 0.001 {
		t.Errorf("Haiku 12-turn cost = %f, want ~0.01217", cost)
	}
}

func TestEstimateBoutCostSonnet(t *testing.T) {
	cost := EstimateBoutCost("claude-sonnet-4-5-20250929", 12, 120)
	// Expected: ~0.03652 GBP.
	if math.Abs(cost-0.03652) > 0.001 {
		t.Errorf("Sonnet 12-turn cost = %f, want ~0.03652", cost)
	}
}

func TestEstimateBoutCostOpus(t *testing.T) {
	cost := EstimateBoutCost("claude-opus-4-6", 12, 120)
	// Expected: ~0.06089 GBP.
	if math.Abs(cost-0.06089) > 0.001 {
		t.Errorf("Opus 12-turn cost = %f, want ~0.06089", cost)
	}
}

func TestEstimateBoutCostUnknownModel(t *testing.T) {
	// Unknown model falls back to Haiku pricing.
	cost := EstimateBoutCost("unknown-model", 12, 120)
	haikuCost := EstimateBoutCost("claude-haiku-4-5-20251001", 12, 120)
	if math.Abs(cost-haikuCost) > 0.0001 {
		t.Errorf("unknown model cost = %f, want Haiku cost %f", cost, haikuCost)
	}
}

func TestEstimateBoutCostDefaultOutput(t *testing.T) {
	// outputPerTurn=0 should use default (120).
	cost := EstimateBoutCost("claude-haiku-4-5-20251001", 12, 0)
	expected := EstimateBoutCost("claude-haiku-4-5-20251001", 12, 120)
	if math.Abs(cost-expected) > 0.0001 {
		t.Errorf("default output cost = %f, want %f", cost, expected)
	}
}

func TestComputeCost(t *testing.T) {
	// Direct computation: 7920 input + 1440 output on Haiku.
	cost := ComputeCost("claude-haiku-4-5-20251001", 7920, 1440)
	// rawInput = 7920 * 0.732 / 1M = 0.005797
	// rawOutput = 1440 * 3.66 / 1M = 0.005270
	// raw = 0.011067, charged = 0.011067 * 1.10 = 0.012174
	if math.Abs(cost-0.01217) > 0.001 {
		t.Errorf("ComputeCost = %f, want ~0.01217", cost)
	}
}

func TestEstimateRunCost(t *testing.T) {
	// 5 bouts/min for 10 minutes on Sonnet.
	cost := EstimateRunCost("claude-sonnet-4-5-20250929", 12, 5, 10.0)
	boutCost := EstimateBoutCost("claude-sonnet-4-5-20250929", 12, 120)
	expected := boutCost * 50 // 5 * 10 = 50 bouts
	if math.Abs(cost-expected) > 0.01 {
		t.Errorf("run cost = %f, want %f", cost, expected)
	}
}

// ---------- Concurrency ----------

func TestConcurrentCharging(t *testing.T) {
	g := NewGate(1000.0)
	var wg sync.WaitGroup

	// 100 goroutines each charging 0.01 GBP 100 times.
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				g.Charge("test-model", 0.01)
			}
		}()
	}
	wg.Wait()

	// Total: 100 * 100 * 0.01 = 100.0 GBP.
	spent := g.Spent()
	if math.Abs(spent-100.0) > 0.01 {
		t.Errorf("concurrent spent = %f, want ~100.0", spent)
	}

	s := g.Summary()
	if s.BoutCount != 10000 {
		t.Errorf("BoutCount = %d, want 10000", s.BoutCount)
	}
}

func TestConcurrentAllowAndCharge(t *testing.T) {
	g := NewGate(10.0)
	var wg sync.WaitGroup

	// Multiple goroutines checking allow + charging.
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = g.Allow("claude-haiku-4-5-20251001", 4)
			g.Charge("claude-haiku-4-5-20251001", 0.005)
		}()
	}
	wg.Wait()

	spent := g.Spent()
	expected := 50 * 0.005
	if math.Abs(spent-expected) > 0.001 {
		t.Errorf("spent = %f, want %f", spent, expected)
	}
}
