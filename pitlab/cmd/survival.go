package cmd

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/rickhallett/thepit/pitlab/internal/analysis"
	"github.com/rickhallett/thepit/pitlab/internal/dataset"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunSurvival implements the "survival" command — persona survival analysis.
func RunSurvival(ds *dataset.Dataset, args []string) {
	minBouts := 1
	for i := 0; i < len(args); i++ {
		if args[i] == "--min-bouts" && i+1 < len(args) {
			n, err := strconv.Atoi(args[i+1])
			if err != nil || n < 1 {
				fmt.Fprintf(os.Stderr, "%s --min-bouts must be a positive integer\n", theme.Error.Render("error:"))
				os.Exit(1)
			}
			minBouts = n
			i++
		}
	}

	records := analysis.WinnerStats(ds)

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Persona Survival Analysis"))
	fmt.Printf("  %s Agents ranked by win rate (min %d bout(s) with votes)\n\n",
		theme.Muted.Render("note:"), minBouts)

	fmt.Printf("  %-4s %-20s %-10s %-8s %-8s %-8s %s\n",
		theme.Muted.Render("#"),
		theme.Muted.Render("Agent"),
		theme.Muted.Render("Tier"),
		theme.Muted.Render("Bouts"),
		theme.Muted.Render("Wins"),
		theme.Muted.Render("Votes"),
		theme.Muted.Render("Win Rate"))
	fmt.Printf("  %s\n", strings.Repeat("─", 72))

	rank := 0
	for _, r := range records {
		if r.Bouts < minBouts {
			continue
		}
		rank++

		name := r.Name
		if len(name) > 18 {
			name = name[:15] + "..."
		}

		wrStyle := theme.Muted
		if r.WinRate >= 0.7 {
			wrStyle = theme.Success
		} else if r.WinRate >= 0.4 {
			wrStyle = theme.Warning
		} else if r.WinRate > 0 {
			wrStyle = theme.Error
		}

		fmt.Printf("  %-4d %-20s %-10s %-8d %-8d %-8d %s\n",
			rank, name, r.Tier, r.Bouts, r.Wins, r.Votes,
			wrStyle.Render(fmt.Sprintf("%.1f%%", r.WinRate*100)))
	}

	if rank == 0 {
		fmt.Printf("  %s No agents found with >= %d bout(s)\n", theme.Muted.Render("note:"), minBouts)
	}

	// Tier-level survival summary.
	tierWins := make(map[string]int)
	tierBouts := make(map[string]int)
	for _, r := range records {
		if r.Bouts > 0 {
			tierWins[r.Tier] += r.Wins
			tierBouts[r.Tier] += r.Bouts
		}
	}

	if len(tierBouts) > 0 {
		fmt.Printf("\n  %s\n\n", theme.Bold.Render("Win Rate by Tier"))
		for _, tier := range []string{"free", "premium", "custom"} {
			if tierBouts[tier] > 0 {
				rate := float64(tierWins[tier]) / float64(tierBouts[tier])
				fmt.Printf("    %-16s %.1f%% (%d/%d)\n",
					theme.Muted.Render(tier+":"),
					rate*100, tierWins[tier], tierBouts[tier])
			}
		}
	}

	fmt.Println()
}
