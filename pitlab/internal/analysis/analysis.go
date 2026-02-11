// Package analysis provides research analytics functions for THE PIT
// debate data. All computations are in-memory against the parsed dataset.
package analysis

import (
	"math"
	"sort"

	"github.com/rickhallett/thepit/pitlab/internal/dataset"
)

// AgentRecord holds per-agent aggregated stats.
type AgentRecord struct {
	ID       string
	Name     string
	PresetID string
	Tier     string
	Bouts    int
	Wins     int
	Votes    int
	WinRate  float64
}

// WinnerStats computes per-agent win/loss/vote statistics.
// Winner of a bout = agent with most votes (ties = shared win).
func WinnerStats(ds *dataset.Dataset) []AgentRecord {
	// Count bouts per agent and votes per agent.
	agentBouts := make(map[string]int)
	agentVotes := make(map[string]int)
	agentWins := make(map[string]int)

	// For each bout, determine the winner(s).
	for _, bout := range ds.Export.Bouts {
		votes := ds.VotesByBout[bout.ID]
		if len(votes) == 0 {
			continue
		}

		// Count votes per agent in this bout.
		boutAgentVotes := make(map[string]int)
		for _, v := range votes {
			boutAgentVotes[v.AgentID]++
			agentVotes[v.AgentID]++
		}

		// Track participating agents.
		for agentID := range boutAgentVotes {
			agentBouts[agentID]++
		}

		// Find max votes.
		maxVotes := 0
		for _, count := range boutAgentVotes {
			if count > maxVotes {
				maxVotes = count
			}
		}

		// Award wins to all agents with max votes (ties = shared win).
		for agentID, count := range boutAgentVotes {
			if count == maxVotes {
				agentWins[agentID]++
			}
		}
	}

	// Build results.
	var records []AgentRecord
	for _, a := range ds.Export.Agents {
		bouts := agentBouts[a.ID]
		wins := agentWins[a.ID]
		winRate := 0.0
		if bouts > 0 {
			winRate = float64(wins) / float64(bouts)
		}

		records = append(records, AgentRecord{
			ID:       a.ID,
			Name:     a.Name,
			PresetID: a.PresetID,
			Tier:     a.Tier,
			Bouts:    bouts,
			Wins:     wins,
			Votes:    agentVotes[a.ID],
			WinRate:  winRate,
		})
	}

	// Sort by win rate descending, then by bouts descending.
	sort.Slice(records, func(i, j int) bool {
		if records[i].WinRate != records[j].WinRate {
			return records[i].WinRate > records[j].WinRate
		}
		return records[i].Bouts > records[j].Bouts
	})

	return records
}

// PositionBias analyzes first-mover advantage by comparing win rates
// based on turn order position. Returns stats for each position (0, 1, 2...).
type PositionStat struct {
	Position int
	Bouts    int
	Wins     int
	WinRate  float64
	AvgVotes float64
}

// PositionBias computes per-position win rate statistics.
// Since bouts alternate agents, position 0 = agent who goes first, etc.
// We infer position from the agent_lineup order (for preset bouts, this is
// the preset's agent array order).
func PositionBias(ds *dataset.Dataset) []PositionStat {
	// Since the export doesn't include agent_lineup or transcript details,
	// we can only infer position from vote patterns.
	// For each bout, we look at votes and the agents involved.
	// The first agent voted for (by ID sort order) gets position 0, etc.

	positionBouts := make(map[int]int)
	positionWins := make(map[int]int)
	positionVotes := make(map[int]int)

	for _, bout := range ds.Export.Bouts {
		votes := ds.VotesByBout[bout.ID]
		if len(votes) == 0 {
			continue
		}

		// Get unique agents in this bout's votes, sorted.
		agentSet := make(map[string]bool)
		for _, v := range votes {
			agentSet[v.AgentID] = true
		}
		var agents []string
		for a := range agentSet {
			agents = append(agents, a)
		}
		sort.Strings(agents)

		// Build position map.
		posMap := make(map[string]int)
		for i, a := range agents {
			posMap[a] = i
		}

		// Count votes per agent.
		agentVoteCount := make(map[string]int)
		for _, v := range votes {
			agentVoteCount[v.AgentID]++
		}

		// Find winner(s).
		maxVotes := 0
		for _, c := range agentVoteCount {
			if c > maxVotes {
				maxVotes = c
			}
		}

		// Attribute to positions.
		for agentID, pos := range posMap {
			positionBouts[pos]++
			positionVotes[pos] += agentVoteCount[agentID]
			if agentVoteCount[agentID] == maxVotes {
				positionWins[pos]++
			}
		}
	}

	// Build results.
	var stats []PositionStat
	maxPos := 0
	for p := range positionBouts {
		if p > maxPos {
			maxPos = p
		}
	}

	for p := 0; p <= maxPos; p++ {
		bouts := positionBouts[p]
		wins := positionWins[p]
		winRate := 0.0
		avgVotes := 0.0
		if bouts > 0 {
			winRate = float64(wins) / float64(bouts)
			avgVotes = float64(positionVotes[p]) / float64(bouts)
		}
		stats = append(stats, PositionStat{
			Position: p,
			Bouts:    bouts,
			Wins:     wins,
			WinRate:  winRate,
			AvgVotes: avgVotes,
		})
	}

	return stats
}

// EngagementCurve computes reaction density per turn index.
type TurnEngagement struct {
	TurnIndex     int
	Reactions     int
	BoutsWithTurn int // how many bouts have this turn index
	Density       float64
}

// EngagementByTurn calculates reaction density per turn position.
func EngagementByTurn(ds *dataset.Dataset) []TurnEngagement {
	// Count reactions per turn index.
	turnReactions := make(map[int]int)
	for _, r := range ds.Export.Reactions {
		turnReactions[r.TurnIndex]++
	}

	// Count bouts with at least N turns.
	turnBoutCount := make(map[int]int)
	for _, b := range ds.Export.Bouts {
		for i := 0; i < b.TurnCount; i++ {
			turnBoutCount[i]++
		}
	}

	// Find max turn index.
	maxTurn := 0
	for t := range turnReactions {
		if t > maxTurn {
			maxTurn = t
		}
	}
	for t := range turnBoutCount {
		if t > maxTurn {
			maxTurn = t
		}
	}

	var results []TurnEngagement
	for t := 0; t <= maxTurn; t++ {
		bouts := turnBoutCount[t]
		reactions := turnReactions[t]
		density := 0.0
		if bouts > 0 {
			density = float64(reactions) / float64(bouts)
		}
		results = append(results, TurnEngagement{
			TurnIndex:     t,
			Reactions:     reactions,
			BoutsWithTurn: bouts,
			Density:       density,
		})
	}

	return results
}

// PresetPopularity ranks presets by bout count and engagement.
type PresetStat struct {
	PresetID  string
	BoutCount int
	VoteCount int
	AvgTurns  float64
}

// PresetPopularity computes per-preset usage and engagement stats.
func PresetPopularity(ds *dataset.Dataset) []PresetStat {
	presetBouts := make(map[string]int)
	presetTurns := make(map[string]int)
	presetVotes := make(map[string]int)

	for _, b := range ds.Export.Bouts {
		presetBouts[b.PresetID]++
		presetTurns[b.PresetID] += b.TurnCount
	}

	for _, v := range ds.Export.Votes {
		bout := ds.BoutsByID[v.BoutID]
		if bout != nil {
			presetVotes[bout.PresetID]++
		}
	}

	var stats []PresetStat
	for pid, bouts := range presetBouts {
		avgTurns := 0.0
		if bouts > 0 {
			avgTurns = float64(presetTurns[pid]) / float64(bouts)
		}
		stats = append(stats, PresetStat{
			PresetID:  pid,
			BoutCount: bouts,
			VoteCount: presetVotes[pid],
			AvgTurns:  avgTurns,
		})
	}

	sort.Slice(stats, func(i, j int) bool {
		return stats[i].BoutCount > stats[j].BoutCount
	})

	return stats
}

// ReactionDistribution counts reaction types across the dataset.
func ReactionDistribution(ds *dataset.Dataset) map[string]int {
	dist := make(map[string]int)
	for _, r := range ds.Export.Reactions {
		dist[r.ReactionType]++
	}
	return dist
}

// Descriptive returns mean, median, stddev for a slice of float64.
type Descriptive struct {
	N      int
	Mean   float64
	Median float64
	StdDev float64
	Min    float64
	Max    float64
}

// Describe computes descriptive statistics for a float64 slice.
func Describe(vals []float64) Descriptive {
	n := len(vals)
	if n == 0 {
		return Descriptive{}
	}

	sorted := make([]float64, n)
	copy(sorted, vals)
	sort.Float64s(sorted)

	sum := 0.0
	for _, v := range sorted {
		sum += v
	}
	mean := sum / float64(n)

	var median float64
	if n%2 == 0 {
		median = (sorted[n/2-1] + sorted[n/2]) / 2
	} else {
		median = sorted[n/2]
	}

	variance := 0.0
	for _, v := range sorted {
		d := v - mean
		variance += d * d
	}
	variance /= float64(n)
	stddev := math.Sqrt(variance)

	return Descriptive{
		N:      n,
		Mean:   mean,
		Median: median,
		StdDev: stddev,
		Min:    sorted[0],
		Max:    sorted[n-1],
	}
}
