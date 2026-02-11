package analysis

import (
	"testing"

	"github.com/rickhallett/thepit/pitlab/internal/dataset"
)

var testExportJSON = `{
  "exportVersion": "1.0.0",
  "generatedAt": "2026-01-15T10:00:00Z",
  "bouts": [
    {"id":"b1","presetId":"roast-battle","topic":"AI","turnCount":6,"ownerId":"u1","createdAt":"2026-01-14T08:00:00Z"},
    {"id":"b2","presetId":"shark-pit","topic":"Climate","turnCount":8,"ownerId":"u2","createdAt":"2026-01-14T09:00:00Z"},
    {"id":"b3","presetId":"roast-battle","topic":"Space","turnCount":4,"ownerId":"u1","createdAt":"2026-01-14T10:00:00Z"}
  ],
  "reactions": [
    {"boutId":"b1","turnIndex":0,"reactionType":"fire","createdAt":"2026-01-14T08:01:00Z"},
    {"boutId":"b1","turnIndex":1,"reactionType":"skull","createdAt":"2026-01-14T08:02:00Z"},
    {"boutId":"b1","turnIndex":2,"reactionType":"fire","createdAt":"2026-01-14T08:03:00Z"},
    {"boutId":"b2","turnIndex":0,"reactionType":"fire","createdAt":"2026-01-14T09:01:00Z"},
    {"boutId":"b2","turnIndex":3,"reactionType":"mic_drop","createdAt":"2026-01-14T09:02:00Z"}
  ],
  "votes": [
    {"boutId":"b1","agentId":"agent-a","userId":"u1","createdAt":"2026-01-14T08:05:00Z"},
    {"boutId":"b1","agentId":"agent-a","userId":"u2","createdAt":"2026-01-14T08:06:00Z"},
    {"boutId":"b1","agentId":"agent-b","userId":"u3","createdAt":"2026-01-14T08:07:00Z"},
    {"boutId":"b2","agentId":"agent-c","userId":"u1","createdAt":"2026-01-14T09:05:00Z"},
    {"boutId":"b2","agentId":"agent-c","userId":"u2","createdAt":"2026-01-14T09:06:00Z"}
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

func TestWinnerStats(t *testing.T) {
	ds := loadTestDS(t)
	records := WinnerStats(ds)

	if len(records) != 3 {
		t.Fatalf("expected 3 agent records, got %d", len(records))
	}

	// agent-a should have 2 votes and win in b1 (2 votes vs 1).
	// agent-c should have 2 votes and win in b2 (sole agent voted for).
	agentMap := make(map[string]AgentRecord)
	for _, r := range records {
		agentMap[r.ID] = r
	}

	a := agentMap["agent-a"]
	if a.Wins != 1 {
		t.Errorf("agent-a wins = %d, want 1", a.Wins)
	}
	if a.Votes != 2 {
		t.Errorf("agent-a votes = %d, want 2", a.Votes)
	}

	c := agentMap["agent-c"]
	if c.Wins != 1 {
		t.Errorf("agent-c wins = %d, want 1", c.Wins)
	}

	b := agentMap["agent-b"]
	if b.Wins != 0 {
		t.Errorf("agent-b wins = %d, want 0", b.Wins)
	}
}

func TestPositionBias(t *testing.T) {
	ds := loadTestDS(t)
	stats := PositionBias(ds)

	if len(stats) == 0 {
		t.Fatal("expected position stats, got none")
	}

	// At least position 0 should exist.
	if stats[0].Bouts == 0 {
		t.Error("position 0 should have bouts")
	}
}

func TestEngagementByTurn(t *testing.T) {
	ds := loadTestDS(t)
	engagement := EngagementByTurn(ds)

	if len(engagement) == 0 {
		t.Fatal("expected engagement data, got none")
	}

	// Turn 0 should have 2 reactions (b1 turn 0 + b2 turn 0).
	if engagement[0].Reactions != 2 {
		t.Errorf("turn 0 reactions = %d, want 2", engagement[0].Reactions)
	}
}

func TestPresetPopularity(t *testing.T) {
	ds := loadTestDS(t)
	stats := PresetPopularity(ds)

	if len(stats) != 2 {
		t.Fatalf("expected 2 presets, got %d", len(stats))
	}

	// roast-battle should be first (2 bouts vs 1).
	if stats[0].PresetID != "roast-battle" {
		t.Errorf("most popular preset = %q, want roast-battle", stats[0].PresetID)
	}
	if stats[0].BoutCount != 2 {
		t.Errorf("roast-battle bouts = %d, want 2", stats[0].BoutCount)
	}
}

func TestReactionDistribution(t *testing.T) {
	ds := loadTestDS(t)
	dist := ReactionDistribution(ds)

	if dist["fire"] != 3 {
		t.Errorf("fire reactions = %d, want 3", dist["fire"])
	}
	if dist["skull"] != 1 {
		t.Errorf("skull reactions = %d, want 1", dist["skull"])
	}
	if dist["mic_drop"] != 1 {
		t.Errorf("mic_drop reactions = %d, want 1", dist["mic_drop"])
	}
}

func TestDescribe(t *testing.T) {
	vals := []float64{2, 4, 4, 4, 5, 5, 7, 9}
	d := Describe(vals)

	if d.N != 8 {
		t.Errorf("N = %d, want 8", d.N)
	}
	if d.Mean != 5.0 {
		t.Errorf("Mean = %f, want 5.0", d.Mean)
	}
	if d.Median != 4.5 { // (4+5)/2
		t.Errorf("Median = %f, want 4.5", d.Median)
	}
	if d.Min != 2.0 {
		t.Errorf("Min = %f, want 2.0", d.Min)
	}
	if d.Max != 9.0 {
		t.Errorf("Max = %f, want 9.0", d.Max)
	}
	if d.StdDev < 1.9 || d.StdDev > 2.1 {
		t.Errorf("StdDev = %f, expected ~2.0", d.StdDev)
	}
}

func TestDescribeEmpty(t *testing.T) {
	d := Describe(nil)
	if d.N != 0 {
		t.Errorf("N = %d, want 0", d.N)
	}
}

func TestDescribeSingle(t *testing.T) {
	d := Describe([]float64{42})
	if d.N != 1 || d.Mean != 42 || d.Median != 42 {
		t.Errorf("single value: N=%d Mean=%f Median=%f", d.N, d.Mean, d.Median)
	}
}
