// Package dataset provides typed access to THE PIT research export data.
// It parses the JSON export format and builds in-memory indexes for
// efficient analysis queries.
package dataset

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// Export is the top-level structure of a research export JSON file.
type Export struct {
	ExportVersion string     `json:"exportVersion"`
	GeneratedAt   string     `json:"generatedAt"`
	Bouts         []Bout     `json:"bouts"`
	Reactions     []Reaction `json:"reactions"`
	Votes         []Vote     `json:"votes"`
	Agents        []Agent    `json:"agents"`
}

// Bout is a single bout record (anonymized — no transcript text).
type Bout struct {
	ID             string `json:"id"`
	PresetID       string `json:"presetId"`
	Topic          string `json:"topic"`
	ResponseLength string `json:"responseLength"`
	ResponseFormat string `json:"responseFormat"`
	TurnCount      int    `json:"turnCount"`
	OwnerID        string `json:"ownerId"`
	CreatedAt      string `json:"createdAt"`
}

// Reaction is a per-turn reaction.
type Reaction struct {
	BoutID       string `json:"boutId"`
	TurnIndex    int    `json:"turnIndex"`
	ReactionType string `json:"reactionType"`
	CreatedAt    string `json:"createdAt"`
}

// Vote is a bout-level winner vote.
type Vote struct {
	BoutID    string `json:"boutId"`
	AgentID   string `json:"agentId"`
	UserID    string `json:"userId"`
	CreatedAt string `json:"createdAt"`
}

// Agent is an agent record (no systemPrompt in export).
type Agent struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	PresetID       string `json:"presetId"`
	Tier           string `json:"tier"`
	ResponseLength string `json:"responseLength"`
	ResponseFormat string `json:"responseFormat"`
	OwnerID        string `json:"ownerId"`
	ParentID       string `json:"parentId"`
	CreatedAt      string `json:"createdAt"`
}

// Dataset provides indexed access to a loaded export.
type Dataset struct {
	Export *Export

	// Indexes.
	BoutsByID       map[string]*Bout
	AgentsByID      map[string]*Agent
	VotesByBout     map[string][]Vote
	ReactionsByBout map[string][]Reaction
}

// LoadFromFile reads and parses a research export JSON file.
func LoadFromFile(path string) (*Dataset, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", path, err)
	}
	return Parse(data)
}

// Parse decodes JSON bytes into a Dataset with built indexes.
func Parse(data []byte) (*Dataset, error) {
	var export Export
	if err := json.Unmarshal(data, &export); err != nil {
		return nil, fmt.Errorf("parsing export JSON: %w", err)
	}
	return buildDataset(&export), nil
}

func buildDataset(export *Export) *Dataset {
	ds := &Dataset{
		Export:          export,
		BoutsByID:       make(map[string]*Bout, len(export.Bouts)),
		AgentsByID:      make(map[string]*Agent, len(export.Agents)),
		VotesByBout:     make(map[string][]Vote),
		ReactionsByBout: make(map[string][]Reaction),
	}

	for i := range export.Bouts {
		ds.BoutsByID[export.Bouts[i].ID] = &export.Bouts[i]
	}
	for i := range export.Agents {
		ds.AgentsByID[export.Agents[i].ID] = &export.Agents[i]
	}
	for _, v := range export.Votes {
		ds.VotesByBout[v.BoutID] = append(ds.VotesByBout[v.BoutID], v)
	}
	for _, r := range export.Reactions {
		ds.ReactionsByBout[r.BoutID] = append(ds.ReactionsByBout[r.BoutID], r)
	}

	return ds
}

// Stats returns high-level dataset statistics.
func (ds *Dataset) Stats() DatasetStats {
	presets := make(map[string]bool)
	users := make(map[string]bool)
	tiers := make(map[string]int)
	totalTurns := 0

	for _, b := range ds.Export.Bouts {
		presets[b.PresetID] = true
		if b.OwnerID != "" {
			users[b.OwnerID] = true
		}
		totalTurns += b.TurnCount
	}

	for _, a := range ds.Export.Agents {
		tiers[a.Tier]++
	}

	// Unique voters.
	voters := make(map[string]bool)
	for _, v := range ds.Export.Votes {
		voters[v.UserID] = true
	}

	return DatasetStats{
		ExportVersion:   ds.Export.ExportVersion,
		GeneratedAt:     ds.Export.GeneratedAt,
		BoutCount:       len(ds.Export.Bouts),
		AgentCount:      len(ds.Export.Agents),
		VoteCount:       len(ds.Export.Votes),
		ReactionCount:   len(ds.Export.Reactions),
		UniquePresets:   len(presets),
		UniqueUsers:     len(users),
		UniqueVoters:    len(voters),
		TotalTurns:      totalTurns,
		AgentTierCounts: tiers,
	}
}

// DatasetStats holds aggregate statistics.
type DatasetStats struct {
	ExportVersion   string
	GeneratedAt     string
	BoutCount       int
	AgentCount      int
	VoteCount       int
	ReactionCount   int
	UniquePresets   int
	UniqueUsers     int
	UniqueVoters    int
	TotalTurns      int
	AgentTierCounts map[string]int
}

// AvgTurnsPerBout returns the average number of turns per bout.
func (s DatasetStats) AvgTurnsPerBout() float64 {
	if s.BoutCount == 0 {
		return 0
	}
	return float64(s.TotalTurns) / float64(s.BoutCount)
}

// VotesPerBout returns the average votes per bout.
func (s DatasetStats) VotesPerBout() float64 {
	if s.BoutCount == 0 {
		return 0
	}
	return float64(s.VoteCount) / float64(s.BoutCount)
}

// ParseTime parses an ISO timestamp from the export.
func ParseTime(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, nil
	}
	// Try common formats.
	for _, layout := range []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05.000Z",
		"2006-01-02T15:04:05Z",
	} {
		if t, err := time.Parse(layout, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unparseable timestamp: %q", s)
}
