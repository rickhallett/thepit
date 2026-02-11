package cmd

import (
	"fmt"
	"sort"
	"strings"

	"github.com/rickhallett/thepit/pitlab/internal/analysis"
	"github.com/rickhallett/thepit/pitlab/internal/dataset"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunSummary implements the "summary" command.
func RunSummary(ds *dataset.Dataset) {
	stats := ds.Stats()

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Dataset Summary"))

	fmt.Printf("  %-22s %s\n", theme.Muted.Render("export version:"), stats.ExportVersion)
	fmt.Printf("  %-22s %s\n\n", theme.Muted.Render("generated at:"), stats.GeneratedAt)

	fmt.Printf("  %-22s %d\n", theme.Muted.Render("bouts:"), stats.BoutCount)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("agents:"), stats.AgentCount)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("votes:"), stats.VoteCount)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("reactions:"), stats.ReactionCount)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("unique presets:"), stats.UniquePresets)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("unique users:"), stats.UniqueUsers)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("unique voters:"), stats.UniqueVoters)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("total turns:"), stats.TotalTurns)
	fmt.Printf("  %-22s %.1f\n", theme.Muted.Render("avg turns/bout:"), stats.AvgTurnsPerBout())
	fmt.Printf("  %-22s %.2f\n\n", theme.Muted.Render("avg votes/bout:"), stats.VotesPerBout())

	// Agent tier breakdown.
	fmt.Printf("  %s\n\n", theme.Bold.Render("Agent Tiers"))
	tiers := make([]string, 0, len(stats.AgentTierCounts))
	for t := range stats.AgentTierCounts {
		tiers = append(tiers, t)
	}
	sort.Strings(tiers)
	for _, t := range tiers {
		fmt.Printf("    %-16s %d\n", theme.Muted.Render(t+":"), stats.AgentTierCounts[t])
	}

	// Turn count distribution.
	var turnCounts []float64
	for _, b := range ds.Export.Bouts {
		turnCounts = append(turnCounts, float64(b.TurnCount))
	}
	if len(turnCounts) > 0 {
		desc := analysis.Describe(turnCounts)
		fmt.Printf("\n  %s\n\n", theme.Bold.Render("Turn Count Distribution"))
		fmt.Printf("    %-16s %.0f\n", theme.Muted.Render("min:"), desc.Min)
		fmt.Printf("    %-16s %.0f\n", theme.Muted.Render("max:"), desc.Max)
		fmt.Printf("    %-16s %.1f\n", theme.Muted.Render("mean:"), desc.Mean)
		fmt.Printf("    %-16s %.0f\n", theme.Muted.Render("median:"), desc.Median)
		fmt.Printf("    %-16s %.1f\n", theme.Muted.Render("stddev:"), desc.StdDev)
	}

	// Reaction distribution.
	dist := analysis.ReactionDistribution(ds)
	if len(dist) > 0 {
		fmt.Printf("\n  %s\n\n", theme.Bold.Render("Reaction Types"))
		type kv struct {
			k string
			v int
		}
		var pairs []kv
		for k, v := range dist {
			pairs = append(pairs, kv{k, v})
		}
		sort.Slice(pairs, func(i, j int) bool { return pairs[i].v > pairs[j].v })
		for _, p := range pairs {
			fmt.Printf("    %-16s %d\n", theme.Muted.Render(p.k+":"), p.v)
		}
	}

	// Preset popularity.
	presets := analysis.PresetPopularity(ds)
	if len(presets) > 0 {
		fmt.Printf("\n  %s\n\n", theme.Bold.Render("Preset Popularity"))
		fmt.Printf("    %-22s %-8s %-8s %s\n",
			theme.Muted.Render("Preset"),
			theme.Muted.Render("Bouts"),
			theme.Muted.Render("Votes"),
			theme.Muted.Render("Avg Turns"))
		fmt.Printf("    %s\n", strings.Repeat("─", 55))
		for _, p := range presets {
			fmt.Printf("    %-22s %-8d %-8d %.1f\n", p.PresetID, p.BoutCount, p.VoteCount, p.AvgTurns)
		}
	}

	fmt.Println()
}
