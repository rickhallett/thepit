// Package pricing is a faithful Go port of lib/credits.ts.
// It implements the full credit/cost model for THE PIT including
// per-model token rates, margin calculation, and micro-credit conversion.
package pricing

import "math"

// Unit conversion constants.
const (
	MicroPerCredit = 100
	CreditValueGBP = 0.01 // 1 credit = 0.01 GBP
	MicroValueGBP  = CreditValueGBP / MicroPerCredit
	PlatformMargin = 0.10 // 10% margin

	// Estimation constants from lib/credits.ts.
	TokenCharsRatio      = 4   // ~4 chars per token
	DefaultOutputPerTurn = 120 // estimated output tokens per turn
	InputFactor          = 5.5 // input tokens estimated as 5.5x output

	BYOKPerKTokenGBP = 0.0002 // flat BYOK fee per 1K tokens
	BYOKMinChargeGBP = 0.001  // minimum BYOK charge
)

// ModelPrice holds per-million-token rates in GBP.
type ModelPrice struct {
	ID        string
	InputGBP  float64 // per 1M input tokens
	OutputGBP float64 // per 1M output tokens
}

// DefaultModels is the pricing table matching lib/credits.ts.
var DefaultModels = []ModelPrice{
	{ID: "claude-haiku-4-5-20251001", InputGBP: 0.732, OutputGBP: 3.66},
	{ID: "claude-sonnet-4-5-20250929", InputGBP: 2.196, OutputGBP: 10.98},
	{ID: "claude-opus-4-5-20251101", InputGBP: 3.66, OutputGBP: 18.30},
	{ID: "claude-opus-4-6", InputGBP: 3.66, OutputGBP: 18.30},
}

// ModelsByID indexes DefaultModels by ID.
var ModelsByID = func() map[string]ModelPrice {
	m := make(map[string]ModelPrice, len(DefaultModels))
	for _, p := range DefaultModels {
		m[p.ID] = p
	}
	return m
}()

// CostBreakdown holds the full cost calculation for a bout.
type CostBreakdown struct {
	ModelID      string
	InputTokens  int
	OutputTokens int

	RawInputGBP  float64 // before margin
	RawOutputGBP float64 // before margin
	RawTotalGBP  float64 // before margin
	MarginGBP    float64
	ChargedGBP   float64 // after margin
	MicroCredits int64
	Credits      float64 // human-readable credits
}

// CalculateCost computes the full cost breakdown for given token counts.
func CalculateCost(modelID string, inputTokens, outputTokens int) CostBreakdown {
	model, ok := ModelsByID[modelID]
	if !ok {
		// Default to Haiku pricing if unknown model.
		model = DefaultModels[0]
	}

	rawInput := float64(inputTokens) * model.InputGBP / 1_000_000
	rawOutput := float64(outputTokens) * model.OutputGBP / 1_000_000
	rawTotal := rawInput + rawOutput
	charged := rawTotal * (1 + PlatformMargin)
	margin := charged - rawTotal
	micro := int64(math.Ceil(charged / MicroValueGBP))

	return CostBreakdown{
		ModelID:      modelID,
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
		RawInputGBP:  rawInput,
		RawOutputGBP: rawOutput,
		RawTotalGBP:  rawTotal,
		MarginGBP:    margin,
		ChargedGBP:   charged,
		MicroCredits: micro,
		Credits:      float64(micro) / MicroPerCredit,
	}
}

// EstimateBout estimates the cost for a bout with the given parameters.
func EstimateBout(modelID string, turns int, outputTokensPerTurn int) CostBreakdown {
	if outputTokensPerTurn == 0 {
		outputTokensPerTurn = DefaultOutputPerTurn
	}
	outputTokens := turns * outputTokensPerTurn
	inputTokens := int(float64(outputTokens) * InputFactor)
	return CalculateCost(modelID, inputTokens, outputTokens)
}

// CalculateBYOK computes BYOK platform fee for given token counts.
type BYOKBreakdown struct {
	InputTokens  int
	OutputTokens int
	TotalTokens  int
	FeeGBP       float64
	MicroCredits int64
	Credits      float64
}

// CalculateBYOK computes the platform fee for BYOK usage.
func CalculateBYOK(inputTokens, outputTokens int) BYOKBreakdown {
	total := inputTokens + outputTokens
	fee := float64(total) / 1000 * BYOKPerKTokenGBP
	if fee < BYOKMinChargeGBP {
		fee = BYOKMinChargeGBP
	}
	micro := int64(math.Ceil(fee / MicroValueGBP))

	return BYOKBreakdown{
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
		TotalTokens:  total,
		FeeGBP:       fee,
		MicroCredits: micro,
		Credits:      float64(micro) / MicroPerCredit,
	}
}

// EstimateTokensFromText estimates token count from character count.
func EstimateTokensFromText(charCount int) int {
	return charCount / TokenCharsRatio
}

// ResponseLengthTokens maps response length IDs to maxOutputTokens.
var ResponseLengthTokens = map[string]int{
	"short":    120,
	"standard": 200,
	"long":     320,
}

// ResponseLengthOutputPerTurn maps to estimated tokens per turn (for costing).
var ResponseLengthOutputPerTurn = map[string]int{
	"short":    80,
	"standard": 120,
	"long":     180,
}
