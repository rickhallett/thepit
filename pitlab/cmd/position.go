package cmd

import (
	"fmt"
	"strings"

	"github.com/rickhallett/thepit/pitlab/internal/analysis"
	"github.com/rickhallett/thepit/pitlab/internal/dataset"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunPosition implements the "position" command — position bias analysis.
func RunPosition(ds *dataset.Dataset) {
	stats := analysis.PositionBias(ds)

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Position Bias Analysis"))
	fmt.Printf("  %s Does speaking order affect win probability?\n\n",
		theme.Muted.Render("question:"))

	if len(stats) == 0 {
		fmt.Printf("  %s No voted bouts found\n\n", theme.Muted.Render("note:"))
		return
	}

	fmt.Printf("  %-12s %-10s %-10s %-12s %s\n",
		theme.Muted.Render("Position"),
		theme.Muted.Render("Bouts"),
		theme.Muted.Render("Wins"),
		theme.Muted.Render("Win Rate"),
		theme.Muted.Render("Avg Votes"))
	fmt.Printf("  %s\n", strings.Repeat("─", 55))

	for _, s := range stats {
		label := fmt.Sprintf("Agent %d", s.Position+1)
		if s.Position == 0 {
			label += " (first)"
		}

		wrStyle := theme.Value
		if s.WinRate > 0.55 {
			wrStyle = theme.Success
		} else if s.WinRate < 0.45 {
			wrStyle = theme.Error
		}

		fmt.Printf("  %-12s %-10d %-10d %-12s %.2f\n",
			label, s.Bouts, s.Wins,
			wrStyle.Render(fmt.Sprintf("%.1f%%", s.WinRate*100)),
			s.AvgVotes)
	}

	// Significance note.
	if len(stats) >= 2 {
		diff := stats[0].WinRate - stats[1].WinRate
		fmt.Printf("\n  %s\n", theme.Bold.Render("Interpretation"))
		if diff > 0.1 {
			fmt.Printf("  First-mover advantage detected: +%.1f%% win rate\n", diff*100)
		} else if diff < -0.1 {
			fmt.Printf("  Second-mover advantage detected: +%.1f%% win rate\n", -diff*100)
		} else {
			fmt.Printf("  No significant position bias detected (%.1f%% difference)\n", diff*100)
		}
	}

	fmt.Println()
}
