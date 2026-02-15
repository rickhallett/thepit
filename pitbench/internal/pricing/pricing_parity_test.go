// Cross-implementation parity tests for pricing/credit calculations.
//
// Golden values are computed by the TypeScript implementation (lib/credits.ts).
// If any of these tests fail, the Go and TS credit calculations have diverged —
// which means cost estimates shown in the CLI won't match what users are charged.
package pricing

import (
	"math"
	"testing"
)

// TestCalculateCostParity verifies exact numeric agreement with lib/credits.ts
// for the CalculateCost function across all supported models.
func TestCalculateCostParity(t *testing.T) {
	tests := []struct {
		name         string
		modelID      string
		inputTokens  int
		outputTokens int
		wantRawTotal float64
		wantCharged  float64
		wantMicro    int64
	}{
		{
			name:         "Haiku 10k/2k",
			modelID:      "claude-haiku-4-5-20251001",
			inputTokens:  10000,
			outputTokens: 2000,
			// rawInput: 10000 * 0.732 / 1M = 0.00732
			// rawOutput: 2000 * 3.66 / 1M = 0.00732
			// rawTotal: 0.01464
			// charged: 0.01464 * 1.10 = 0.016104
			// micro: ceil(0.016104 / 0.0001) = 162
			wantRawTotal: 0.01464,
			wantCharged:  0.016104,
			wantMicro:    162,
		},
		{
			name:         "Sonnet 10k/2k",
			modelID:      "claude-sonnet-4-5-20250929",
			inputTokens:  10000,
			outputTokens: 2000,
			// rawInput: 10000 * 2.196 / 1M = 0.02196
			// rawOutput: 2000 * 10.98 / 1M = 0.02196
			// rawTotal: 0.04392
			// charged: 0.04392 * 1.10 = 0.048312
			// micro: ceil(0.048312 / 0.0001) = 484
			wantRawTotal: 0.04392,
			wantCharged:  0.048312,
			wantMicro:    484,
		},
		{
			name:         "Opus 4.5 10k/2k",
			modelID:      "claude-opus-4-5-20251101",
			inputTokens:  10000,
			outputTokens: 2000,
			// rawInput: 10000 * 3.66 / 1M = 0.0366
			// rawOutput: 2000 * 18.30 / 1M = 0.0366
			// rawTotal: 0.0732
			// charged: 0.0732 * 1.10 = 0.08052
			// micro: ceil(0.08052 / 0.0001) = 806
			wantRawTotal: 0.0732,
			wantCharged:  0.08052,
			wantMicro:    806,
		},
		{
			name:         "Opus 4.6 10k/2k",
			modelID:      "claude-opus-4-6",
			inputTokens:  10000,
			outputTokens: 2000,
			// Same pricing as Opus 4.5
			wantRawTotal: 0.0732,
			wantCharged:  0.08052,
			wantMicro:    806,
		},
		{
			name:         "Unknown model defaults to Haiku",
			modelID:      "unknown-model-xyz",
			inputTokens:  10000,
			outputTokens: 2000,
			wantRawTotal: 0.01464,
			wantCharged:  0.016104,
			wantMicro:    162,
		},
		{
			name:         "Minimal tokens (1/1)",
			modelID:      "claude-haiku-4-5-20251001",
			inputTokens:  1,
			outputTokens: 1,
			// rawInput: 1 * 0.732 / 1M = 0.000000732
			// rawOutput: 1 * 3.66 / 1M = 0.00000366
			// rawTotal: 0.000004392
			// charged: 0.0000048312
			// micro: ceil(0.0000048312 / 0.0001) = 1
			wantRawTotal: 0.000004392,
			wantCharged:  0.0000048312,
			wantMicro:    1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cost := CalculateCost(tc.modelID, tc.inputTokens, tc.outputTokens)

			if math.Abs(cost.RawTotalGBP-tc.wantRawTotal) > 1e-10 {
				t.Errorf("RawTotalGBP = %.15f, want %.15f", cost.RawTotalGBP, tc.wantRawTotal)
			}
			if math.Abs(cost.ChargedGBP-tc.wantCharged) > 1e-10 {
				t.Errorf("ChargedGBP = %.15f, want %.15f", cost.ChargedGBP, tc.wantCharged)
			}
			if cost.MicroCredits != tc.wantMicro {
				t.Errorf("MicroCredits = %d, want %d", cost.MicroCredits, tc.wantMicro)
			}
		})
	}
}

// TestEstimateBoutParity verifies token estimation matches lib/credits.ts.
func TestEstimateBoutParity(t *testing.T) {
	tests := []struct {
		name             string
		modelID          string
		turns            int
		outputPerTurn    int
		wantOutputTokens int
		wantInputTokens  int
		wantMicro        int64
	}{
		{
			name:             "12 turns default output",
			modelID:          "claude-haiku-4-5-20251001",
			turns:            12,
			outputPerTurn:    0, // use default 120
			wantOutputTokens: 1440,
			wantInputTokens:  7920,
			// rawInput: 7920 * 0.732 / 1M = 0.00579744
			// rawOutput: 1440 * 3.66 / 1M = 0.0052704
			// rawTotal: 0.01106784
			// charged: 0.01106784 * 1.10 = 0.012174624
			// micro: ceil(0.012174624 / 0.0001) = 122
			wantMicro: 122,
		},
		{
			name:             "10 turns custom output 100",
			modelID:          "claude-haiku-4-5-20251001",
			turns:            10,
			outputPerTurn:    100,
			wantOutputTokens: 1000,
			wantInputTokens:  5500,
			// rawInput: 5500 * 0.732 / 1M = 0.004026
			// rawOutput: 1000 * 3.66 / 1M = 0.00366
			// rawTotal: 0.007686
			// charged: 0.008454600
			// micro: ceil(0.0084546 / 0.0001) = 85
			wantMicro: 85,
		},
		{
			name:             "12 turns Sonnet",
			modelID:          "claude-sonnet-4-5-20250929",
			turns:            12,
			outputPerTurn:    0,
			wantOutputTokens: 1440,
			wantInputTokens:  7920,
			// rawInput: 7920 * 2.196 / 1M = 0.01739232
			// rawOutput: 1440 * 10.98 / 1M = 0.0158112
			// rawTotal: 0.03320352
			// charged: 0.036523872
			// micro: ceil(0.036523872 / 0.0001) = 366
			wantMicro: 366,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cost := EstimateBout(tc.modelID, tc.turns, tc.outputPerTurn)

			if cost.OutputTokens != tc.wantOutputTokens {
				t.Errorf("OutputTokens = %d, want %d", cost.OutputTokens, tc.wantOutputTokens)
			}
			if cost.InputTokens != tc.wantInputTokens {
				t.Errorf("InputTokens = %d, want %d", cost.InputTokens, tc.wantInputTokens)
			}
			if cost.MicroCredits != tc.wantMicro {
				t.Errorf("MicroCredits = %d, want %d", cost.MicroCredits, tc.wantMicro)
			}
		})
	}
}

// TestBYOKParity verifies BYOK fee calculation matches lib/credits.ts.
func TestBYOKParity(t *testing.T) {
	tests := []struct {
		name         string
		inputTokens  int
		outputTokens int
		wantFee      float64
		wantMicro    int64
	}{
		{
			name:         "normal usage 10k/2k",
			inputTokens:  10000,
			outputTokens: 2000,
			// total: 12000, fee: 12 * 0.0002 = 0.0024
			// micro: ceil(0.0024 / 0.0001) = 24
			wantFee:   0.0024,
			wantMicro: 24,
		},
		{
			name:         "minimum charge applies",
			inputTokens:  100,
			outputTokens: 50,
			// total: 150, fee: 0.15 * 0.0002 = 0.00003 -> min 0.001
			// micro: ceil(0.001 / 0.0001) = 10
			wantFee:   BYOKMinChargeGBP,
			wantMicro: 10,
		},
		{
			name:         "zero tokens uses min",
			inputTokens:  0,
			outputTokens: 0,
			wantFee:      BYOKMinChargeGBP,
			wantMicro:    10,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			b := CalculateBYOK(tc.inputTokens, tc.outputTokens)

			if math.Abs(b.FeeGBP-tc.wantFee) > 1e-10 {
				t.Errorf("FeeGBP = %.15f, want %.15f", b.FeeGBP, tc.wantFee)
			}
			if b.MicroCredits != tc.wantMicro {
				t.Errorf("MicroCredits = %d, want %d", b.MicroCredits, tc.wantMicro)
			}
		})
	}
}

// TestConstantsParity verifies the Go constants match lib/credits.ts exactly.
func TestConstantsParity(t *testing.T) {
	if MicroPerCredit != 100 {
		t.Errorf("MicroPerCredit = %d, want 100", MicroPerCredit)
	}
	if CreditValueGBP != 0.01 {
		t.Errorf("CreditValueGBP = %f, want 0.01", CreditValueGBP)
	}
	if math.Abs(MicroValueGBP-0.0001) > 1e-15 {
		t.Errorf("MicroValueGBP = %.15f, want 0.0001", MicroValueGBP)
	}
	if PlatformMargin != 0.10 {
		t.Errorf("PlatformMargin = %f, want 0.10", PlatformMargin)
	}
	if TokenCharsRatio != 4 {
		t.Errorf("TokenCharsRatio = %d, want 4", TokenCharsRatio)
	}
	if DefaultOutputPerTurn != 120 {
		t.Errorf("DefaultOutputPerTurn = %d, want 120", DefaultOutputPerTurn)
	}
	if InputFactor != 5.5 {
		t.Errorf("InputFactor = %f, want 5.5", InputFactor)
	}
	if BYOKPerKTokenGBP != 0.0002 {
		t.Errorf("BYOKPerKTokenGBP = %f, want 0.0002", BYOKPerKTokenGBP)
	}
	if BYOKMinChargeGBP != 0.001 {
		t.Errorf("BYOKMinChargeGBP = %f, want 0.001", BYOKMinChargeGBP)
	}
}

// TestModelPricingParity verifies model pricing tables match lib/credits.ts.
func TestModelPricingParity(t *testing.T) {
	expected := []struct {
		id     string
		input  float64
		output float64
	}{
		{"claude-haiku-4-5-20251001", 0.732, 3.66},
		{"claude-sonnet-4-5-20250929", 2.196, 10.98},
		{"claude-opus-4-5-20251101", 3.66, 18.30},
		{"claude-opus-4-6", 3.66, 18.30},
	}

	if len(DefaultModels) != len(expected) {
		t.Fatalf("DefaultModels has %d entries, want %d", len(DefaultModels), len(expected))
	}

	for _, exp := range expected {
		model, ok := ModelsByID[exp.id]
		if !ok {
			t.Errorf("model %q not found in ModelsByID", exp.id)
			continue
		}
		if model.InputGBP != exp.input {
			t.Errorf("%s InputGBP = %f, want %f", exp.id, model.InputGBP, exp.input)
		}
		if model.OutputGBP != exp.output {
			t.Errorf("%s OutputGBP = %f, want %f", exp.id, model.OutputGBP, exp.output)
		}
	}
}

// TestEstimateTokensFromTextParity verifies token estimation matches lib/credits.ts.
func TestEstimateTokensFromTextParity(t *testing.T) {
	tests := []struct {
		chars int
		want  int
	}{
		{400, 100},
		{4, 1},
		{0, 0},
		{3, 0}, // integer division: 3/4 = 0
		{100, 25},
		{1000, 250},
	}

	for _, tc := range tests {
		got := EstimateTokensFromText(tc.chars)
		if got != tc.want {
			t.Errorf("EstimateTokensFromText(%d) = %d, want %d", tc.chars, got, tc.want)
		}
	}
}
