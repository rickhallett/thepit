// Package budget implements an atomic GBP budget gate for pitstorm.
// It tracks estimated API costs from streaming bouts and blocks new
// requests once the configured budget ceiling is reached.
//
// Cost estimation uses the same model pricing as lib/credits.ts and
// pitbench/internal/pricing — see those for the authoritative source.
package budget

import (
	"fmt"
	"math"
	"sync"
	"sync/atomic"
)

// Pricing constants (must match lib/credits.ts and pitbench/internal/pricing).
const (
	PlatformMargin       = 0.10 // 10% margin on API cost
	DefaultOutputPerTurn = 120  // estimated output tokens per turn
	InputFactor          = 5.5  // input tokens ≈ 5.5× output tokens
)

// modelPrice holds per-million-token rates in GBP.
type modelPrice struct {
	InputGBP  float64
	OutputGBP float64
}

// defaultPrices mirrors the pricing table from lib/credits.ts.
var defaultPrices = map[string]modelPrice{
	"claude-haiku-4-5-20251001":  {InputGBP: 0.732, OutputGBP: 3.66},
	"claude-sonnet-4-5-20250929": {InputGBP: 2.196, OutputGBP: 10.98},
	"claude-opus-4-5-20251101":   {InputGBP: 3.66, OutputGBP: 18.30},
	"claude-opus-4-6":            {InputGBP: 3.66, OutputGBP: 18.30},
}

// fallbackPrice is Haiku pricing — used when model ID is unknown.
var fallbackPrice = modelPrice{InputGBP: 0.732, OutputGBP: 3.66}

// Gate enforces a GBP budget ceiling for a simulation run. All methods
// are safe for concurrent use.
type Gate struct {
	ceiling float64 // max GBP

	// Stored as integer micro-GBP (1 micro-GBP = 0.000001 GBP) for
	// lock-free atomic operations. Max representable: ~9.2 trillion GBP.
	spentMicroGBP atomic.Int64

	// Per-model spend tracking.
	mu         sync.Mutex
	modelSpend map[string]float64
	boutCount  int
}

// NewGate creates a budget gate with the given GBP ceiling.
// A ceiling of 0 means unlimited (gate never blocks).
func NewGate(ceilingGBP float64) *Gate {
	return &Gate{
		ceiling:    ceilingGBP,
		modelSpend: make(map[string]float64),
	}
}

// Ceiling returns the configured budget ceiling in GBP.
func (g *Gate) Ceiling() float64 {
	return g.ceiling
}

// Allow checks whether starting a new bout would exceed the budget.
// It estimates the cost based on model + turns and returns true if
// the estimated cost fits within the remaining budget. It does NOT
// deduct the cost — call Charge after the bout completes.
//
// If the ceiling is 0 (unlimited), Always returns true.
func (g *Gate) Allow(modelID string, turns int) (estimatedGBP float64, allowed bool) {
	est := EstimateBoutCost(modelID, turns, DefaultOutputPerTurn)
	if g.ceiling <= 0 {
		return est, true
	}
	spent := g.Spent()
	return est, (spent + est) <= g.ceiling
}

// Charge records actual spend (in GBP) after a bout or action completes.
// This is the authoritative deduction — call it with real token counts
// when available, or with the estimate as a fallback.
func (g *Gate) Charge(modelID string, gbp float64) {
	microGBP := int64(math.Ceil(gbp * 1_000_000))
	g.spentMicroGBP.Add(microGBP)

	g.mu.Lock()
	g.modelSpend[modelID] += gbp
	g.boutCount++
	g.mu.Unlock()
}

// ChargeTokens records actual spend computed from real token counts.
func (g *Gate) ChargeTokens(modelID string, inputTokens, outputTokens int) float64 {
	cost := ComputeCost(modelID, inputTokens, outputTokens)
	g.Charge(modelID, cost)
	return cost
}

// Spent returns the total GBP spent so far.
func (g *Gate) Spent() float64 {
	return float64(g.spentMicroGBP.Load()) / 1_000_000
}

// Remaining returns the GBP remaining in the budget.
// Returns math.MaxFloat64 if the ceiling is 0 (unlimited).
func (g *Gate) Remaining() float64 {
	if g.ceiling <= 0 {
		return math.MaxFloat64
	}
	rem := g.ceiling - g.Spent()
	if rem < 0 {
		return 0
	}
	return rem
}

// Exhausted returns true if the budget has been fully spent.
func (g *Gate) Exhausted() bool {
	if g.ceiling <= 0 {
		return false
	}
	return g.Spent() >= g.ceiling
}

// Summary returns a human-readable budget status.
type Summary struct {
	CeilingGBP   float64            `json:"ceilingGbp"`
	SpentGBP     float64            `json:"spentGbp"`
	RemainingGBP float64            `json:"remainingGbp"`
	Exhausted    bool               `json:"exhausted"`
	BoutCount    int                `json:"boutCount"`
	ByModel      map[string]float64 `json:"byModel"`
}

// Summary returns a snapshot of budget state.
func (g *Gate) Summary() Summary {
	spent := g.Spent()
	remaining := g.Remaining()
	if g.ceiling <= 0 {
		remaining = -1 // signal unlimited
	}

	g.mu.Lock()
	byModel := make(map[string]float64, len(g.modelSpend))
	for k, v := range g.modelSpend {
		byModel[k] = v
	}
	boutCount := g.boutCount
	g.mu.Unlock()

	return Summary{
		CeilingGBP:   g.ceiling,
		SpentGBP:     spent,
		RemainingGBP: remaining,
		Exhausted:    g.ceiling > 0 && spent >= g.ceiling,
		BoutCount:    boutCount,
		ByModel:      byModel,
	}
}

// FormatSummary returns a terminal-friendly budget summary.
func FormatSummary(s Summary) string {
	if s.CeilingGBP <= 0 {
		return fmt.Sprintf("  Budget: unlimited (spent £%.4f across %d bouts)", s.SpentGBP, s.BoutCount)
	}
	pct := 0.0
	if s.CeilingGBP > 0 {
		pct = (s.SpentGBP / s.CeilingGBP) * 100
	}
	return fmt.Sprintf("  Budget: £%.4f / £%.2f (%.1f%%, %d bouts, £%.4f remaining)",
		s.SpentGBP, s.CeilingGBP, pct, s.BoutCount, s.RemainingGBP)
}

// ---------- Cost estimation ----------

// EstimateBoutCost estimates the GBP cost of a bout (with margin).
func EstimateBoutCost(modelID string, turns, outputPerTurn int) float64 {
	if outputPerTurn <= 0 {
		outputPerTurn = DefaultOutputPerTurn
	}
	outputTokens := turns * outputPerTurn
	inputTokens := int(float64(outputTokens) * InputFactor)
	return ComputeCost(modelID, inputTokens, outputTokens)
}

// ComputeCost calculates the actual GBP cost from token counts (with margin).
func ComputeCost(modelID string, inputTokens, outputTokens int) float64 {
	price, ok := defaultPrices[modelID]
	if !ok {
		price = fallbackPrice
	}
	rawInput := float64(inputTokens) * price.InputGBP / 1_000_000
	rawOutput := float64(outputTokens) * price.OutputGBP / 1_000_000
	return (rawInput + rawOutput) * (1 + PlatformMargin)
}

// EstimateRunCost estimates the total GBP cost for a simulation run.
func EstimateRunCost(modelID string, turns, boutsPerMinute int, durationMinutes float64) float64 {
	boutCost := EstimateBoutCost(modelID, turns, DefaultOutputPerTurn)
	totalBouts := float64(boutsPerMinute) * durationMinutes
	return boutCost * totalBouts
}
