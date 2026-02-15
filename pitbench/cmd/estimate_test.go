package cmd

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
)

// captureStdout redirects os.Stdout and returns captured output.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	oldStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w
	defer func() { os.Stdout = oldStdout }()

	fn()

	w.Close()
	os.Stdout = oldStdout

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Errorf("failed to read captured stdout: %v", err)
	}
	r.Close()
	return buf.String()
}

func TestRunEstimateDefaults(t *testing.T) {
	output := captureStdout(t, func() {
		RunEstimate(nil)
	})

	checks := []string{
		"Cost Estimate",
		"Cost Breakdown",
		"input tokens:",
		"output tokens:",
		"credits:",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunEstimate output missing %q", want)
		}
	}
}

func TestRunEstimateWithFlags(t *testing.T) {
	output := captureStdout(t, func() {
		RunEstimate([]string{
			"--model", "claude-haiku-4-5-20251001",
			"--turns", "10",
			"--length", "short",
		})
	})

	checks := []string{
		"claude-haiku-4-5-20251001",
		"Cost Estimate",
		"Cost Breakdown",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunEstimate output missing %q", want)
		}
	}
}

func TestRunEstimateInvalidLength(t *testing.T) {
	// Invalid length should fall back to DefaultOutputPerTurn (120).
	output := captureStdout(t, func() {
		RunEstimate([]string{"--length", "invalid"})
	})

	// Should still produce output (falls back to default).
	if !strings.Contains(output, "Cost Estimate") {
		t.Error("RunEstimate with invalid length should still produce output")
	}
}

func TestRunModels(t *testing.T) {
	output := captureStdout(t, func() {
		RunModels()
	})

	checks := []string{
		"Model Pricing Table",
		"claude-haiku-4-5-20251001",
		"claude-sonnet-4-5-20250929",
		"claude-opus-4-5-20251101",
		"claude-opus-4-6",
		"Unit Conversion",
		"micro-credits:",
		"credit value:",
		"platform margin:",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunModels output missing %q", want)
		}
	}
}

func TestRunMargin(t *testing.T) {
	output := captureStdout(t, func() {
		RunMargin(nil)
	})

	checks := []string{
		"Margin Verification",
		"10%",
		"Per-Model Margin",
		"BYOK Comparison",
		"platform fee:",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunMargin output missing %q", want)
		}
	}

	// All 4 models should appear in the margin table.
	models := []string{
		"claude-haiku-4-5-20251001",
		"claude-sonnet-4-5-20250929",
		"claude-opus-4-5-20251101",
		"claude-opus-4-6",
	}
	for _, m := range models {
		if !strings.Contains(output, m) {
			t.Errorf("RunMargin output missing model %q", m)
		}
	}
}

func TestRunCostWithTokens(t *testing.T) {
	output := captureStdout(t, func() {
		RunCost([]string{
			"--input", "10000",
			"--output", "2000",
			"--model", "claude-haiku-4-5-20251001",
		})
	})

	checks := []string{
		"Cost Calculation",
		"10000",
		"2000",
		"Cost Breakdown",
		"credits:",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunCost output missing %q", want)
		}
	}
}

func TestRunEstimateAllLengths(t *testing.T) {
	for _, length := range []string{"short", "standard", "long"} {
		t.Run(length, func(t *testing.T) {
			output := captureStdout(t, func() {
				RunEstimate([]string{"--length", length})
			})
			if !strings.Contains(output, "Cost Estimate") {
				t.Errorf("RunEstimate --%s missing output", length)
			}
		})
	}
}
