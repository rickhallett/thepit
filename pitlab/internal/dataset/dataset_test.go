package dataset

import (
	"os"
	"testing"
)

var testExportJSON = `{
  "exportVersion": "1.0.0",
  "generatedAt": "2026-01-15T10:00:00Z",
  "bouts": [
    {"id":"b1","presetId":"roast-battle","topic":"AI ethics","turnCount":6,"ownerId":"u1","createdAt":"2026-01-14T08:00:00Z","responseLength":"standard","responseFormat":"markdown"},
    {"id":"b2","presetId":"shark-pit","topic":"Climate","turnCount":8,"ownerId":"u2","createdAt":"2026-01-14T09:00:00Z","responseLength":"long","responseFormat":"plain"},
    {"id":"b3","presetId":"roast-battle","topic":"Space","turnCount":4,"ownerId":"u1","createdAt":"2026-01-14T10:00:00Z","responseLength":"short","responseFormat":"markdown"}
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

func loadTestDataset(t *testing.T) *Dataset {
	t.Helper()
	ds, err := Parse([]byte(testExportJSON))
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}
	return ds
}

func TestParse(t *testing.T) {
	ds := loadTestDataset(t)
	if len(ds.Export.Bouts) != 3 {
		t.Errorf("expected 3 bouts, got %d", len(ds.Export.Bouts))
	}
	if len(ds.Export.Agents) != 3 {
		t.Errorf("expected 3 agents, got %d", len(ds.Export.Agents))
	}
	if len(ds.Export.Votes) != 5 {
		t.Errorf("expected 5 votes, got %d", len(ds.Export.Votes))
	}
	if len(ds.Export.Reactions) != 5 {
		t.Errorf("expected 5 reactions, got %d", len(ds.Export.Reactions))
	}
}

func TestIndexes(t *testing.T) {
	ds := loadTestDataset(t)

	if _, ok := ds.BoutsByID["b1"]; !ok {
		t.Error("BoutsByID missing b1")
	}
	if _, ok := ds.AgentsByID["agent-a"]; !ok {
		t.Error("AgentsByID missing agent-a")
	}
	if votes := ds.VotesByBout["b1"]; len(votes) != 3 {
		t.Errorf("VotesByBout[b1] expected 3 votes, got %d", len(votes))
	}
	if reactions := ds.ReactionsByBout["b1"]; len(reactions) != 3 {
		t.Errorf("ReactionsByBout[b1] expected 3 reactions, got %d", len(reactions))
	}
}

func TestStats(t *testing.T) {
	ds := loadTestDataset(t)
	stats := ds.Stats()

	if stats.BoutCount != 3 {
		t.Errorf("BoutCount = %d, want 3", stats.BoutCount)
	}
	if stats.AgentCount != 3 {
		t.Errorf("AgentCount = %d, want 3", stats.AgentCount)
	}
	if stats.VoteCount != 5 {
		t.Errorf("VoteCount = %d, want 5", stats.VoteCount)
	}
	if stats.ReactionCount != 5 {
		t.Errorf("ReactionCount = %d, want 5", stats.ReactionCount)
	}
	if stats.TotalTurns != 18 { // 6+8+4
		t.Errorf("TotalTurns = %d, want 18", stats.TotalTurns)
	}
	if stats.UniquePresets != 2 {
		t.Errorf("UniquePresets = %d, want 2", stats.UniquePresets)
	}
	if stats.UniqueUsers != 2 {
		t.Errorf("UniqueUsers = %d, want 2", stats.UniqueUsers)
	}
	if stats.UniqueVoters != 3 {
		t.Errorf("UniqueVoters = %d, want 3", stats.UniqueVoters)
	}
}

func TestAvgTurnsPerBout(t *testing.T) {
	ds := loadTestDataset(t)
	stats := ds.Stats()
	avg := stats.AvgTurnsPerBout()
	if avg != 6.0 { // 18/3
		t.Errorf("AvgTurnsPerBout = %f, want 6.0", avg)
	}
}

func TestParseInvalidJSON(t *testing.T) {
	_, err := Parse([]byte("not json"))
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestParseTime(t *testing.T) {
	tests := []struct {
		input string
		valid bool
	}{
		{"2026-01-15T10:00:00Z", true},
		{"2026-01-15T10:00:00.000Z", true},
		{"2026-01-15T10:00:00+00:00", true},
		{"", true}, // empty is ok
		{"not a date", false},
	}

	for _, tt := range tests {
		_, err := ParseTime(tt.input)
		if tt.valid && err != nil {
			t.Errorf("ParseTime(%q) unexpected error: %v", tt.input, err)
		}
		if !tt.valid && err == nil {
			t.Errorf("ParseTime(%q) expected error", tt.input)
		}
	}
}

func TestLoadFromFile(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/test-export.json"
	if err := os.WriteFile(path, []byte(testExportJSON), 0644); err != nil {
		t.Fatal(err)
	}

	ds, err := LoadFromFile(path)
	if err != nil {
		t.Fatalf("LoadFromFile(%q) error: %v", path, err)
	}
	if len(ds.Export.Bouts) != 3 {
		t.Errorf("expected 3 bouts, got %d", len(ds.Export.Bouts))
	}
	if len(ds.Export.Agents) != 3 {
		t.Errorf("expected 3 agents, got %d", len(ds.Export.Agents))
	}
	// Verify indexes are built.
	if _, ok := ds.BoutsByID["b1"]; !ok {
		t.Error("BoutsByID index missing b1")
	}
}

func TestLoadFromFileMissing(t *testing.T) {
	_, err := LoadFromFile("/tmp/definitely_does_not_exist_xyz.json")
	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestVotesPerBout(t *testing.T) {
	ds := loadTestDataset(t)
	stats := ds.Stats()
	vpb := stats.VotesPerBout()
	// 5 votes / 3 bouts ~ 1.666...
	if vpb < 1.6 || vpb > 1.7 {
		t.Errorf("VotesPerBout = %f, want ~1.667", vpb)
	}
}

func TestVotesPerBoutEmpty(t *testing.T) {
	ds, _ := Parse([]byte(`{"exportVersion":"1.0","generatedAt":"2026-01-01T00:00:00Z","bouts":[],"reactions":[],"votes":[],"agents":[]}`))
	stats := ds.Stats()
	if stats.VotesPerBout() != 0 {
		t.Errorf("VotesPerBout on empty dataset = %f, want 0", stats.VotesPerBout())
	}
}

func TestStatsEmptyDataset(t *testing.T) {
	ds, err := Parse([]byte(`{"exportVersion":"1.0","generatedAt":"2026-01-01T00:00:00Z","bouts":[],"reactions":[],"votes":[],"agents":[]}`))
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}
	stats := ds.Stats()
	if stats.BoutCount != 0 || stats.AvgTurnsPerBout() != 0 {
		t.Error("expected zero stats for empty dataset")
	}
}
