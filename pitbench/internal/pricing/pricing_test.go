package pricing

import (
	"math"
	"testing"
)

func TestCalculateCostHaiku(t *testing.T) {
	cost := CalculateCost("claude-haiku-4-5-20251001", 10000, 2000)

	// Raw input: 10000 * 0.732 / 1M = 0.00732
	// Raw output: 2000 * 3.66 / 1M = 0.00732
	// Raw total: 0.01464
	// Charged: 0.01464 * 1.10 = 0.016104
	if math.Abs(cost.RawTotalGBP-0.01464) > 0.0001 {
		t.Errorf("RawTotalGBP = %f, want ~0.01464", cost.RawTotalGBP)
	}
	if math.Abs(cost.ChargedGBP-0.016104) > 0.0001 {
		t.Errorf("ChargedGBP = %f, want ~0.016104", cost.ChargedGBP)
	}
	if cost.MicroCredits <= 0 {
		t.Error("MicroCredits should be positive")
	}
	if cost.Credits <= 0 {
		t.Error("Credits should be positive")
	}
}

func TestCalculateCostSonnet(t *testing.T) {
	cost := CalculateCost("claude-sonnet-4-5-20250929", 10000, 2000)

	// Sonnet is ~3x more expensive than Haiku.
	haikuCost := CalculateCost("claude-haiku-4-5-20251001", 10000, 2000)
	if cost.ChargedGBP <= haikuCost.ChargedGBP {
		t.Errorf("Sonnet should be more expensive than Haiku: %.6f vs %.6f",
			cost.ChargedGBP, haikuCost.ChargedGBP)
	}
}

func TestCalculateCostOpus(t *testing.T) {
	cost := CalculateCost("claude-opus-4-5-20251101", 10000, 2000)
	sonnetCost := CalculateCost("claude-sonnet-4-5-20250929", 10000, 2000)
	if cost.ChargedGBP <= sonnetCost.ChargedGBP {
		t.Errorf("Opus should be more expensive than Sonnet: %.6f vs %.6f",
			cost.ChargedGBP, sonnetCost.ChargedGBP)
	}
}

func TestCalculateCostUnknownModel(t *testing.T) {
	cost := CalculateCost("unknown-model", 10000, 2000)
	haikuCost := CalculateCost("claude-haiku-4-5-20251001", 10000, 2000)
	if cost.ChargedGBP != haikuCost.ChargedGBP {
		t.Error("unknown model should default to Haiku pricing")
	}
}

func TestMarginIs10Percent(t *testing.T) {
	cost := CalculateCost("claude-haiku-4-5-20251001", 100000, 20000)
	marginRatio := cost.MarginGBP / cost.RawTotalGBP
	if math.Abs(marginRatio-0.10) > 0.001 {
		t.Errorf("margin ratio = %f, want 0.10", marginRatio)
	}
}

func TestEstimateBoutDefaults(t *testing.T) {
	cost := EstimateBout("claude-haiku-4-5-20251001", 12, 0)
	// 12 turns * 120 output/turn = 1440 output tokens
	// 1440 * 5.5 = 7920 input tokens
	if cost.OutputTokens != 1440 {
		t.Errorf("OutputTokens = %d, want 1440", cost.OutputTokens)
	}
	if cost.InputTokens != 7920 {
		t.Errorf("InputTokens = %d, want 7920", cost.InputTokens)
	}
}

func TestEstimateBoutCustomOutputPerTurn(t *testing.T) {
	cost := EstimateBout("claude-haiku-4-5-20251001", 12, 200)
	if cost.OutputTokens != 2400 {
		t.Errorf("OutputTokens = %d, want 2400", cost.OutputTokens)
	}
}

func TestCalculateBYOK(t *testing.T) {
	b := CalculateBYOK(10000, 2000)
	// Total: 12000 tokens, fee: 12 * 0.0002 = 0.0024 GBP
	if math.Abs(b.FeeGBP-0.0024) > 0.0001 {
		t.Errorf("FeeGBP = %f, want 0.0024", b.FeeGBP)
	}
}

func TestCalculateBYOKMinCharge(t *testing.T) {
	b := CalculateBYOK(100, 50)
	// Total: 150 tokens, fee: 0.15 * 0.0002 = 0.00003 GBP -> min 0.001
	if b.FeeGBP < BYOKMinChargeGBP {
		t.Errorf("FeeGBP = %f, should be >= min charge %f", b.FeeGBP, BYOKMinChargeGBP)
	}
}

func TestEstimateTokensFromText(t *testing.T) {
	tokens := EstimateTokensFromText(400)
	if tokens != 100 {
		t.Errorf("EstimateTokensFromText(400) = %d, want 100", tokens)
	}
}

func TestMicroCreditsCeiling(t *testing.T) {
	// Micro credits should always round up.
	cost := CalculateCost("claude-haiku-4-5-20251001", 1, 1)
	if cost.MicroCredits < 1 {
		t.Error("MicroCredits should be at least 1 for any non-zero cost")
	}
}

func TestResponseLengthTokens(t *testing.T) {
	expected := map[string]int{
		"short":    120,
		"standard": 200,
		"long":     320,
	}
	if len(ResponseLengthTokens) != len(expected) {
		t.Errorf("ResponseLengthTokens has %d entries, want %d", len(ResponseLengthTokens), len(expected))
	}
	for k, want := range expected {
		got, ok := ResponseLengthTokens[k]
		if !ok {
			t.Errorf("ResponseLengthTokens missing key %q", k)
			continue
		}
		if got != want {
			t.Errorf("ResponseLengthTokens[%q] = %d, want %d", k, got, want)
		}
	}
}

func TestResponseLengthOutputPerTurn(t *testing.T) {
	expected := map[string]int{
		"short":    80,
		"standard": 120,
		"long":     180,
	}
	if len(ResponseLengthOutputPerTurn) != len(expected) {
		t.Errorf("ResponseLengthOutputPerTurn has %d entries, want %d", len(ResponseLengthOutputPerTurn), len(expected))
	}
	for k, want := range expected {
		got, ok := ResponseLengthOutputPerTurn[k]
		if !ok {
			t.Errorf("ResponseLengthOutputPerTurn missing key %q", k)
			continue
		}
		if got != want {
			t.Errorf("ResponseLengthOutputPerTurn[%q] = %d, want %d", k, got, want)
		}
	}
}

func TestAllModelsExist(t *testing.T) {
	expected := []string{
		"claude-haiku-4-5-20251001",
		"claude-sonnet-4-5-20250929",
		"claude-opus-4-5-20251101",
		"claude-opus-4-6",
	}
	for _, id := range expected {
		if _, ok := ModelsByID[id]; !ok {
			t.Errorf("model %q not found in ModelsByID", id)
		}
	}
}
