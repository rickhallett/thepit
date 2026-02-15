// End-to-end developer workflow tests for pitlab (issue #158).
//
// These tests verify Step 3 of the advertised developer workflow:
//   pitlab summary | survival | position | engagement | codebook
//
// Tests cover:
//   - All commands with standard test data
//   - Edge cases: empty data, high --min-bouts filter, single bout
//   - Data with varied configurations (response lengths, formats, tiers)
//   - Mathematical plausibility checks (win rates sum correctly, etc.)

package cmd

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"

	"github.com/rickhallett/thepit/pitlab/internal/analysis"
	"github.com/rickhallett/thepit/pitlab/internal/dataset"
)

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

// Large test dataset with 5 bouts, 6 agents, varied tiers/formats/lengths.
var workflowExportJSON = `{
  "exportVersion": "1.0.0",
  "generatedAt": "2026-02-15T10:00:00Z",
  "bouts": [
    {"id":"b1","presetId":"roast-battle","topic":"AI ethics","turnCount":6,"ownerId":"u1","createdAt":"2026-02-14T08:00:00Z","responseLength":"standard","responseFormat":"markdown"},
    {"id":"b2","presetId":"shark-pit","topic":"Climate change","turnCount":8,"ownerId":"u2","createdAt":"2026-02-14T09:00:00Z","responseLength":"long","responseFormat":"plain"},
    {"id":"b3","presetId":"roast-battle","topic":"Free will","turnCount":12,"ownerId":"u1","createdAt":"2026-02-14T10:00:00Z","responseLength":"short","responseFormat":"json"},
    {"id":"b4","presetId":"philosophy-101","topic":"Consciousness","turnCount":4,"ownerId":"u3","createdAt":"2026-02-14T11:00:00Z","responseLength":"standard","responseFormat":"spaced"},
    {"id":"b5","presetId":"shark-pit","topic":"Space colonization","turnCount":10,"ownerId":"u2","createdAt":"2026-02-14T12:00:00Z","responseLength":"long","responseFormat":"markdown"}
  ],
  "reactions": [
    {"boutId":"b1","turnIndex":0,"reactionType":"fire","createdAt":"2026-02-14T08:01:00Z"},
    {"boutId":"b1","turnIndex":1,"reactionType":"skull","createdAt":"2026-02-14T08:02:00Z"},
    {"boutId":"b1","turnIndex":2,"reactionType":"fire","createdAt":"2026-02-14T08:03:00Z"},
    {"boutId":"b2","turnIndex":0,"reactionType":"fire","createdAt":"2026-02-14T09:01:00Z"},
    {"boutId":"b2","turnIndex":3,"reactionType":"mic_drop","createdAt":"2026-02-14T09:04:00Z"},
    {"boutId":"b3","turnIndex":0,"reactionType":"fire","createdAt":"2026-02-14T10:01:00Z"},
    {"boutId":"b3","turnIndex":5,"reactionType":"skull","createdAt":"2026-02-14T10:06:00Z"},
    {"boutId":"b3","turnIndex":11,"reactionType":"fire","createdAt":"2026-02-14T10:12:00Z"},
    {"boutId":"b4","turnIndex":0,"reactionType":"heart","createdAt":"2026-02-14T11:01:00Z"},
    {"boutId":"b5","turnIndex":0,"reactionType":"fire","createdAt":"2026-02-14T12:01:00Z"},
    {"boutId":"b5","turnIndex":4,"reactionType":"mic_drop","createdAt":"2026-02-14T12:05:00Z"},
    {"boutId":"b5","turnIndex":9,"reactionType":"skull","createdAt":"2026-02-14T12:10:00Z"}
  ],
  "votes": [
    {"boutId":"b1","agentId":"agent-a","userId":"u1","createdAt":"2026-02-14T08:30:00Z"},
    {"boutId":"b1","agentId":"agent-a","userId":"u2","createdAt":"2026-02-14T08:31:00Z"},
    {"boutId":"b1","agentId":"agent-b","userId":"u3","createdAt":"2026-02-14T08:32:00Z"},
    {"boutId":"b2","agentId":"agent-c","userId":"u1","createdAt":"2026-02-14T09:30:00Z"},
    {"boutId":"b2","agentId":"agent-c","userId":"u2","createdAt":"2026-02-14T09:31:00Z"},
    {"boutId":"b3","agentId":"agent-a","userId":"u2","createdAt":"2026-02-14T10:30:00Z"},
    {"boutId":"b3","agentId":"agent-b","userId":"u3","createdAt":"2026-02-14T10:31:00Z"},
    {"boutId":"b3","agentId":"agent-b","userId":"u4","createdAt":"2026-02-14T10:32:00Z"},
    {"boutId":"b4","agentId":"agent-d","userId":"u1","createdAt":"2026-02-14T11:30:00Z"},
    {"boutId":"b5","agentId":"agent-e","userId":"u2","createdAt":"2026-02-14T12:30:00Z"},
    {"boutId":"b5","agentId":"agent-e","userId":"u3","createdAt":"2026-02-14T12:31:00Z"},
    {"boutId":"b5","agentId":"agent-f","userId":"u4","createdAt":"2026-02-14T12:32:00Z"}
  ],
  "agents": [
    {"id":"agent-a","name":"The Flame","presetId":"roast-battle","tier":"free","responseLength":"standard","responseFormat":"markdown","createdAt":"2026-01-01T00:00:00Z"},
    {"id":"agent-b","name":"The Ice","presetId":"roast-battle","tier":"free","responseLength":"standard","responseFormat":"markdown","createdAt":"2026-01-01T00:00:00Z"},
    {"id":"agent-c","name":"The Shark","presetId":"shark-pit","tier":"premium","responseLength":"long","responseFormat":"plain","createdAt":"2026-01-01T00:00:00Z"},
    {"id":"agent-d","name":"The Oracle","presetId":"philosophy-101","tier":"custom","responseLength":"standard","responseFormat":"spaced","createdAt":"2026-01-01T00:00:00Z"},
    {"id":"agent-e","name":"The Visionary","presetId":"shark-pit","tier":"premium","responseLength":"long","responseFormat":"markdown","createdAt":"2026-01-01T00:00:00Z"},
    {"id":"agent-f","name":"The Skeptic","presetId":"shark-pit","tier":"free","responseLength":"long","responseFormat":"markdown","createdAt":"2026-01-01T00:00:00Z"}
  ]
}`

// Empty dataset for edge case tests.
var emptyExportJSON = `{"exportVersion":"1.0.0","generatedAt":"2026-02-15T00:00:00Z","bouts":[],"reactions":[],"votes":[],"agents":[]}`

// Single bout dataset.
var singleBoutExportJSON = `{
  "exportVersion": "1.0.0",
  "generatedAt": "2026-02-15T10:00:00Z",
  "bouts": [{"id":"b1","presetId":"roast-battle","topic":"AI","turnCount":6,"ownerId":"u1","createdAt":"2026-02-14T08:00:00Z","responseLength":"standard","responseFormat":"plain"}],
  "reactions": [{"boutId":"b1","turnIndex":0,"reactionType":"fire","createdAt":"2026-02-14T08:01:00Z"}],
  "votes": [{"boutId":"b1","agentId":"agent-a","userId":"u1","createdAt":"2026-02-14T08:30:00Z"}],
  "agents": [
    {"id":"agent-a","name":"Solo A","presetId":"roast-battle","tier":"free","responseLength":"standard","responseFormat":"plain","createdAt":"2026-01-01T00:00:00Z"},
    {"id":"agent-b","name":"Solo B","presetId":"roast-battle","tier":"free","responseLength":"standard","responseFormat":"plain","createdAt":"2026-01-01T00:00:00Z"}
  ]
}`

func loadWorkflowDS(t *testing.T, jsonStr string) *dataset.Dataset {
	t.Helper()
	ds, err := dataset.Parse([]byte(jsonStr))
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}
	return ds
}

func captureWorkflowStdout(t *testing.T, fn func()) string {
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
		t.Fatalf("failed to read captured stdout: %v", err)
	}
	r.Close()
	return buf.String()
}

// ---------------------------------------------------------------------------
// Summary command tests
// ---------------------------------------------------------------------------

func TestWorkflowSummaryFullDataset(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	output := captureWorkflowStdout(t, func() { RunSummary(ds) })

	checks := []string{
		"Dataset Summary", "1.0.0",
		"bouts:", "agents:", "votes:", "reactions:",
		"Agent Tiers", "Turn Count", "Reaction Types",
		"free", "premium", "custom",
		"fire", "skull", "mic_drop", "heart",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunSummary output missing %q", want)
		}
	}
}

func TestWorkflowSummaryEmptyDataset(t *testing.T) {
	ds := loadWorkflowDS(t, emptyExportJSON)
	output := captureWorkflowStdout(t, func() { RunSummary(ds) })

	if !strings.Contains(output, "Dataset Summary") {
		t.Error("empty dataset should still show header")
	}
}

func TestWorkflowSummarySingleBout(t *testing.T) {
	ds := loadWorkflowDS(t, singleBoutExportJSON)
	output := captureWorkflowStdout(t, func() { RunSummary(ds) })

	if !strings.Contains(output, "Dataset Summary") {
		t.Error("single bout dataset should show header")
	}
}

// ---------------------------------------------------------------------------
// Survival command tests
// ---------------------------------------------------------------------------

func TestWorkflowSurvivalFullDataset(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	output := captureWorkflowStdout(t, func() { RunSurvival(ds, nil) })

	checks := []string{
		"Persona Survival", "Agent", "Win Rate",
		"The Flame", "The Ice", "The Shark",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunSurvival output missing %q", want)
		}
	}
}

func TestWorkflowSurvivalMinBoutsFiltering(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)

	// With --min-bouts 999, no agents should qualify
	output := captureWorkflowStdout(t, func() { RunSurvival(ds, []string{"--min-bouts", "999"}) })
	if !strings.Contains(output, "No agents found") {
		t.Error("high --min-bouts should show 'No agents found'")
	}

	// With --min-bouts 2, only agents with 2+ bouts should appear
	output = captureWorkflowStdout(t, func() { RunSurvival(ds, []string{"--min-bouts", "2"}) })
	if !strings.Contains(output, "Persona Survival") {
		t.Error("--min-bouts 2 should still show header")
	}
}

func TestWorkflowSurvivalEmptyDataset(t *testing.T) {
	ds := loadWorkflowDS(t, emptyExportJSON)
	output := captureWorkflowStdout(t, func() { RunSurvival(ds, nil) })

	if !strings.Contains(output, "Persona Survival") || !strings.Contains(output, "No agents found") {
		t.Error("empty dataset survival should show header and 'No agents found'")
	}
}

// ---------------------------------------------------------------------------
// Position command tests
// ---------------------------------------------------------------------------

func TestWorkflowPositionFullDataset(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	output := captureWorkflowStdout(t, func() { RunPosition(ds) })

	checks := []string{"Position Bias", "Position", "Bouts", "Win Rate"}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunPosition output missing %q", want)
		}
	}
}

func TestWorkflowPositionEmptyDataset(t *testing.T) {
	ds := loadWorkflowDS(t, emptyExportJSON)
	output := captureWorkflowStdout(t, func() { RunPosition(ds) })

	if !strings.Contains(output, "Position Bias") {
		t.Error("empty dataset should still show Position Bias header")
	}
}

// ---------------------------------------------------------------------------
// Engagement command tests
// ---------------------------------------------------------------------------

func TestWorkflowEngagementFullDataset(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	output := captureWorkflowStdout(t, func() { RunEngagement(ds) })

	checks := []string{"Engagement Curve", "Turn", "Reactions", "Density", "Histogram"}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunEngagement output missing %q", want)
		}
	}
}

func TestWorkflowEngagementEmptyDataset(t *testing.T) {
	ds := loadWorkflowDS(t, emptyExportJSON)
	output := captureWorkflowStdout(t, func() { RunEngagement(ds) })

	if !strings.Contains(output, "Engagement Curve") {
		t.Error("empty dataset should still show Engagement Curve header")
	}
}

// ---------------------------------------------------------------------------
// Codebook command tests
// ---------------------------------------------------------------------------

func TestWorkflowCodebook(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	output := captureWorkflowStdout(t, func() { RunCodebook(ds) })

	checks := []string{
		"Research Codebook", "Dataset",
		"Table: bouts", "Table: agents", "Table: votes", "Table: reactions",
		"Derived Metrics", "Research Notes",
		"agentId", "presetId", "turnCount", "winRate",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunCodebook output missing %q", want)
		}
	}
}

// ---------------------------------------------------------------------------
// Analysis plausibility checks
// ---------------------------------------------------------------------------

func TestWorkflowWinnerStatsPlausibility(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	stats := analysis.WinnerStats(ds)

	if len(stats) == 0 {
		t.Fatal("expected non-empty winner stats")
	}

	// Every agent with bouts should have non-negative win counts
	for _, s := range stats {
		if s.Wins < 0 {
			t.Errorf("agent %s has negative wins: W=%d", s.ID, s.Wins)
		}
		// Win rate should be between 0 and 1
		if s.WinRate < 0 || s.WinRate > 1 {
			t.Errorf("agent %s has invalid win rate: %.2f", s.ID, s.WinRate)
		}
	}
}

func TestWorkflowPositionBiasPlausibility(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	positions := analysis.PositionBias(ds)

	for _, p := range positions {
		if p.WinRate < 0 || p.WinRate > 1 {
			t.Errorf("position %d has invalid win rate: %.2f", p.Position, p.WinRate)
		}
	}
}

func TestWorkflowEngagementByTurnPlausibility(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	engagement := analysis.EngagementByTurn(ds)

	for _, e := range engagement {
		if e.Density < 0 {
			t.Errorf("turn %d has negative density: %.2f", e.TurnIndex, e.Density)
		}
		if e.Reactions < 0 {
			t.Errorf("turn %d has negative reaction count: %d", e.TurnIndex, e.Reactions)
		}
	}
}

func TestWorkflowReactionDistribution(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	dist := analysis.ReactionDistribution(ds)

	// We know we have fire, skull, mic_drop, heart in the fixture
	expectedTypes := []string{"fire", "skull", "mic_drop", "heart"}
	for _, rt := range expectedTypes {
		if _, ok := dist[rt]; !ok {
			t.Errorf("expected reaction type %q in distribution", rt)
		}
	}

	// Total should match the number of reactions in fixture
	total := 0
	for _, count := range dist {
		total += count
	}
	if total != 12 {
		t.Errorf("expected 12 total reactions, got %d", total)
	}
}

func TestWorkflowDatasetStats(t *testing.T) {
	ds := loadWorkflowDS(t, workflowExportJSON)
	stats := ds.Stats()

	if stats.BoutCount != 5 {
		t.Errorf("expected 5 bouts, got %d", stats.BoutCount)
	}
	if stats.AgentCount != 6 {
		t.Errorf("expected 6 agents, got %d", stats.AgentCount)
	}
	if stats.VoteCount != 12 {
		t.Errorf("expected 12 votes, got %d", stats.VoteCount)
	}
	if stats.ReactionCount != 12 {
		t.Errorf("expected 12 reactions, got %d", stats.ReactionCount)
	}
}

// ---------------------------------------------------------------------------
// Data loading edge cases
// ---------------------------------------------------------------------------

func TestWorkflowLoadInvalidJSON(t *testing.T) {
	_, err := dataset.Parse([]byte("not json"))
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestWorkflowLoadMissingFile(t *testing.T) {
	_, err := dataset.LoadFromFile("/nonexistent/path/export.json")
	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestWorkflowLoadFromTempFile(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/export.json"
	if err := os.WriteFile(path, []byte(workflowExportJSON), 0644); err != nil {
		t.Fatal(err)
	}

	ds, err := dataset.LoadFromFile(path)
	if err != nil {
		t.Fatalf("LoadFromFile: %v", err)
	}

	stats := ds.Stats()
	if stats.BoutCount != 5 {
		t.Errorf("expected 5 bouts from file, got %d", stats.BoutCount)
	}
}
