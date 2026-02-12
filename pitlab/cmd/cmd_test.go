package cmd

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"

	"github.com/rickhallett/thepit/pitlab/internal/dataset"
)

var testExportJSON = `{
  "exportVersion": "1.0.0",
  "generatedAt": "2026-01-15T10:00:00Z",
  "bouts": [
    {"id":"b1","presetId":"roast-battle","topic":"AI ethics","turnCount":6,"ownerId":"u1","createdAt":"2026-01-14T08:00:00Z","responseLength":"standard","responseFormat":"markdown"},
    {"id":"b2","presetId":"shark-pit","topic":"Climate","turnCount":8,"ownerId":"u2","createdAt":"2026-01-14T09:00:00Z","responseLength":"long","responseFormat":"plain"}
  ],
  "reactions": [
    {"boutId":"b1","turnIndex":0,"reactionType":"fire","createdAt":"2026-01-14T08:01:00Z"},
    {"boutId":"b1","turnIndex":1,"reactionType":"skull","createdAt":"2026-01-14T08:02:00Z"},
    {"boutId":"b2","turnIndex":0,"reactionType":"fire","createdAt":"2026-01-14T09:01:00Z"}
  ],
  "votes": [
    {"boutId":"b1","agentId":"agent-a","userId":"u1","createdAt":"2026-01-14T08:05:00Z"},
    {"boutId":"b1","agentId":"agent-a","userId":"u2","createdAt":"2026-01-14T08:06:00Z"},
    {"boutId":"b1","agentId":"agent-b","userId":"u3","createdAt":"2026-01-14T08:07:00Z"},
    {"boutId":"b2","agentId":"agent-c","userId":"u1","createdAt":"2026-01-14T09:05:00Z"}
  ],
  "agents": [
    {"id":"agent-a","name":"The Flame","presetId":"roast-battle","tier":"free","responseLength":"standard","responseFormat":"markdown","createdAt":"2026-01-01T00:00:00Z"},
    {"id":"agent-b","name":"The Ice","presetId":"roast-battle","tier":"free","responseLength":"standard","responseFormat":"markdown","createdAt":"2026-01-01T00:00:00Z"},
    {"id":"agent-c","name":"The Shark","presetId":"shark-pit","tier":"premium","responseLength":"long","responseFormat":"plain","createdAt":"2026-01-01T00:00:00Z"}
  ]
}`

func loadTestDS(t *testing.T) *dataset.Dataset {
	t.Helper()
	ds, err := dataset.Parse([]byte(testExportJSON))
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}
	return ds
}

// captureStdout redirects os.Stdout to a pipe and returns the captured output.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()

	oldStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w
	defer func() {
		os.Stdout = oldStdout
	}()

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

func TestRunSummary(t *testing.T) {
	ds := loadTestDS(t)
	output := captureStdout(t, func() { RunSummary(ds) })

	checks := []string{
		"Dataset Summary",
		"1.0.0",       // export version
		"bouts:",      // label
		"agents:",     // label
		"votes:",      // label
		"reactions:",  // label
		"Agent Tiers", // section header
		"Turn Count",  // section header
		"Reaction Types",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunSummary output missing %q", want)
		}
	}
}

func TestRunSurvival(t *testing.T) {
	ds := loadTestDS(t)
	output := captureStdout(t, func() { RunSurvival(ds, nil) })

	checks := []string{
		"Persona Survival",
		"Agent",
		"Win Rate",
		"The Flame",
		"The Ice",
		"The Shark",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunSurvival output missing %q", want)
		}
	}
}

func TestRunSurvivalMinBouts(t *testing.T) {
	ds := loadTestDS(t)
	// Set min-bouts high enough that no agents qualify.
	output := captureStdout(t, func() { RunSurvival(ds, []string{"--min-bouts", "999"}) })

	if !strings.Contains(output, "No agents found") {
		t.Error("RunSurvival with high --min-bouts should show 'No agents found'")
	}
}

func TestRunPosition(t *testing.T) {
	ds := loadTestDS(t)
	output := captureStdout(t, func() { RunPosition(ds) })

	checks := []string{
		"Position Bias",
		"Position",
		"Bouts",
		"Win Rate",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunPosition output missing %q", want)
		}
	}
}

func TestRunEngagement(t *testing.T) {
	ds := loadTestDS(t)
	output := captureStdout(t, func() { RunEngagement(ds) })

	checks := []string{
		"Engagement Curve",
		"Turn",
		"Reactions",
		"Density",
		"Histogram",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunEngagement output missing %q", want)
		}
	}
}

func TestRunCodebook(t *testing.T) {
	ds := loadTestDS(t)
	output := captureStdout(t, func() { RunCodebook(ds) })

	checks := []string{
		"Research Codebook",
		"Dataset",
		"Table: bouts",
		"Table: agents",
		"Table: votes",
		"Table: reactions",
		"Derived Metrics",
		"Research Notes",
		"agentId",
		"presetId",
		"turnCount",
		"winRate",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunCodebook output missing %q", want)
		}
	}
}

func TestRunPositionEmpty(t *testing.T) {
	ds, err := dataset.Parse([]byte(`{"exportVersion":"1.0","generatedAt":"2026-01-01T00:00:00Z","bouts":[],"reactions":[],"votes":[],"agents":[]}`))
	if err != nil {
		t.Fatal(err)
	}
	output := captureStdout(t, func() { RunPosition(ds) })

	// With an empty dataset, PositionBias still returns a single zero-valued entry,
	// so the table renders with zero values rather than showing "No voted bouts found".
	if !strings.Contains(output, "Position Bias") {
		t.Error("RunPosition with empty dataset should still show header")
	}
}

func TestRunEngagementEmpty(t *testing.T) {
	ds, err := dataset.Parse([]byte(`{"exportVersion":"1.0","generatedAt":"2026-01-01T00:00:00Z","bouts":[],"reactions":[],"votes":[],"agents":[]}`))
	if err != nil {
		t.Fatal(err)
	}
	output := captureStdout(t, func() { RunEngagement(ds) })

	// With an empty dataset, EngagementByTurn still returns a single zero-valued entry,
	// so the table renders with zero values rather than showing "No reaction data found".
	if !strings.Contains(output, "Engagement Curve") {
		t.Error("RunEngagement with empty dataset should still show header")
	}
}
