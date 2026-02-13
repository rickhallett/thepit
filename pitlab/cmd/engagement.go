package cmd

import (
	"fmt"
	"strings"

	"github.com/rickhallett/thepit/pitlab/internal/analysis"
	"github.com/rickhallett/thepit/pitlab/internal/dataset"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunEngagement implements the "engagement" command — per-turn engagement curves.
func RunEngagement(ds *dataset.Dataset) {
	engagement := analysis.EngagementByTurn(ds)

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Engagement Curve"))
	fmt.Printf("  %s Reaction density per turn position\n\n",
		theme.Muted.Render("metric:"))

	if len(engagement) == 0 {
		fmt.Printf("  %s No reaction data found\n\n", theme.Muted.Render("note:"))
		return
	}

	fmt.Printf("  %-8s %-12s %-12s %-12s %s\n",
		theme.Muted.Render("Turn"),
		theme.Muted.Render("Reactions"),
		theme.Muted.Render("Bouts"),
		theme.Muted.Render("Density"),
		theme.Muted.Render("Histogram"))
	fmt.Printf("  %s\n", strings.Repeat("─", 65))

	// Find max density for histogram scaling.
	maxDensity := 0.0
	for _, e := range engagement {
		if e.Density > maxDensity {
			maxDensity = e.Density
		}
	}

	for _, e := range engagement {
		barLen := 0
		if maxDensity > 0 {
			barLen = int(e.Density / maxDensity * 20)
		}
		bar := strings.Repeat("█", barLen)

		fmt.Printf("  %-8d %-12d %-12d %-12s %s\n",
			e.TurnIndex,
			e.Reactions,
			e.BoutsWithTurn,
			fmt.Sprintf("%.3f", e.Density),
			theme.Accent.Render(bar))
	}

	// Summary.
	totalReactions := 0
	for _, e := range engagement {
		totalReactions += e.Reactions
	}
	fmt.Printf("\n  %s %d total reactions across %d turn positions\n\n",
		theme.Muted.Render("total:"), totalReactions, len(engagement))
}
