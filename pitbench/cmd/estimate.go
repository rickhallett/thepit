package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/rickhallett/thepit/pitbench/internal/pricing"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunEstimate implements the "estimate" command.
func RunEstimate(args []string) {
	model := "claude-haiku-4-5-20251001"
	turns := 12
	length := "standard"

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--model", "-m":
			if i+1 < len(args) {
				model = args[i+1]
				i++
			}
		case "--turns", "-t":
			if i+1 < len(args) {
				fmt.Sscanf(args[i+1], "%d", &turns)
				i++
			}
		case "--length", "-l":
			if i+1 < len(args) {
				length = args[i+1]
				i++
			}
		}
	}

	outputPerTurn := pricing.ResponseLengthOutputPerTurn[length]
	if outputPerTurn == 0 {
		outputPerTurn = pricing.DefaultOutputPerTurn
	}

	cost := pricing.EstimateBout(model, turns, outputPerTurn)

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Cost Estimate"))
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("model:"), cost.ModelID)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("turns:"), turns)
	fmt.Printf("  %-22s %s (%d tokens/turn)\n", theme.Muted.Render("response length:"), length, outputPerTurn)
	fmt.Printf("  %-22s %d (estimated)\n", theme.Muted.Render("input tokens:"), cost.InputTokens)
	fmt.Printf("  %-22s %d (estimated)\n\n", theme.Muted.Render("output tokens:"), cost.OutputTokens)

	printCostBreakdown(cost)
}

func printCostBreakdown(cost pricing.CostBreakdown) {
	fmt.Printf("  %s\n\n", theme.Bold.Render("Cost Breakdown"))
	fmt.Printf("    %-22s £%.6f\n", theme.Muted.Render("raw input:"), cost.RawInputGBP)
	fmt.Printf("    %-22s £%.6f\n", theme.Muted.Render("raw output:"), cost.RawOutputGBP)
	fmt.Printf("    %-22s £%.6f\n", theme.Muted.Render("raw total:"), cost.RawTotalGBP)
	fmt.Printf("    %-22s £%.6f (%.0f%%)\n", theme.Muted.Render("platform margin:"),
		cost.MarginGBP, pricing.PlatformMargin*100)
	fmt.Printf("    %-22s £%.6f\n", theme.Warning.Render("charged total:"), cost.ChargedGBP)
	fmt.Printf("    %-22s %d\n", theme.Muted.Render("micro-credits:"), cost.MicroCredits)
	fmt.Printf("    %-22s %.2f\n\n", theme.Success.Render("credits:"), cost.Credits)
}

// RunCost implements the "cost" command — cost for specific token counts.
func RunCost(args []string) {
	model := "claude-haiku-4-5-20251001"
	inputTokens := 0
	outputTokens := 0

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--model", "-m":
			if i+1 < len(args) {
				model = args[i+1]
				i++
			}
		case "--input", "-i":
			if i+1 < len(args) {
				fmt.Sscanf(args[i+1], "%d", &inputTokens)
				i++
			}
		case "--output", "-o":
			if i+1 < len(args) {
				fmt.Sscanf(args[i+1], "%d", &outputTokens)
				i++
			}
		}
	}

	if inputTokens == 0 && outputTokens == 0 {
		fmt.Fprintf(os.Stderr, "%s cost requires --input and/or --output token counts\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitbench cost --input 10000 --output 2000 [--model ID]\n\n")
		os.Exit(1)
	}

	cost := pricing.CalculateCost(model, inputTokens, outputTokens)

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Cost Calculation"))
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("model:"), cost.ModelID)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("input tokens:"), cost.InputTokens)
	fmt.Printf("  %-22s %d\n\n", theme.Muted.Render("output tokens:"), cost.OutputTokens)

	printCostBreakdown(cost)
}

// RunMargin implements the "margin" command — margin verification.
func RunMargin(args []string) {
	fmt.Printf("\n  %s\n\n", theme.Title.Render("Margin Verification"))
	fmt.Printf("  %-22s %.0f%%\n\n", theme.Muted.Render("platform margin:"), pricing.PlatformMargin*100)

	// Show margin for each model at standard bout parameters.
	turns := 12
	fmt.Printf("  %s (12 turns, standard length)\n\n", theme.Bold.Render("Per-Model Margin"))
	fmt.Printf("  %-32s %-12s %-12s %-12s %s\n",
		theme.Muted.Render("Model"),
		theme.Muted.Render("Raw GBP"),
		theme.Muted.Render("Margin"),
		theme.Muted.Render("Charged"),
		theme.Muted.Render("Credits"))
	fmt.Printf("  %s\n", strings.Repeat("─", 78))

	for _, m := range pricing.DefaultModels {
		cost := pricing.EstimateBout(m.ID, turns, 0)
		fmt.Printf("  %-32s £%-11.6f £%-11.6f £%-11.6f %.2f\n",
			m.ID, cost.RawTotalGBP, cost.MarginGBP, cost.ChargedGBP, cost.Credits)
	}

	// BYOK comparison.
	outputTokens := turns * pricing.DefaultOutputPerTurn
	inputTokens := int(float64(outputTokens) * pricing.InputFactor)
	byok := pricing.CalculateBYOK(inputTokens, outputTokens)

	fmt.Printf("\n  %s\n\n", theme.Bold.Render("BYOK Comparison (same token count)"))
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("total tokens:"), byok.TotalTokens)
	fmt.Printf("  %-22s £%.6f\n", theme.Muted.Render("platform fee:"), byok.FeeGBP)
	fmt.Printf("  %-22s %.2f\n\n", theme.Muted.Render("credits:"), byok.Credits)
}

// RunModels implements the "models" command — pricing comparison table.
func RunModels() {
	fmt.Printf("\n  %s\n\n", theme.Title.Render("Model Pricing Table"))
	fmt.Printf("  %-32s %-16s %-16s %s\n",
		theme.Muted.Render("Model ID"),
		theme.Muted.Render("Input/1M"),
		theme.Muted.Render("Output/1M"),
		theme.Muted.Render("Ratio"))
	fmt.Printf("  %s\n", strings.Repeat("─", 72))

	base := pricing.DefaultModels[0]
	for _, m := range pricing.DefaultModels {
		ratio := m.OutputGBP / base.OutputGBP
		fmt.Printf("  %-32s £%-15.3f £%-15.3f %.1fx\n",
			m.ID, m.InputGBP, m.OutputGBP, ratio)
	}

	fmt.Printf("\n  %s\n\n", theme.Bold.Render("Unit Conversion"))
	fmt.Printf("  %-22s 1 credit = %d micro-credits\n", theme.Muted.Render("micro-credits:"), pricing.MicroPerCredit)
	fmt.Printf("  %-22s 1 credit = £%.2f\n", theme.Muted.Render("credit value:"), pricing.CreditValueGBP)
	fmt.Printf("  %-22s %.0f%%\n", theme.Muted.Render("platform margin:"), pricing.PlatformMargin*100)
	fmt.Printf("  %-22s ~%d chars/token\n\n", theme.Muted.Render("token estimate:"), pricing.TokenCharsRatio)
}
