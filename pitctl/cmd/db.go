package cmd

import (
	"context"
	"fmt"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/lipgloss/table"

	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/format"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunDBPing tests database connectivity and latency.
func RunDBPing(cfg *config.Config) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	latency, err := conn.Ping(ctx)
	if err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}

	fmt.Println()
	fmt.Printf("  %s %s\n", theme.Success.Render("connected"), theme.Value.Render(format.Duration(latency)))
	fmt.Println()
	return nil
}

// RunDBStats displays table row counts and sizes.
func RunDBStats(cfg *config.Config) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	stats, err := conn.GetTableStats(ctx)
	if err != nil {
		return fmt.Errorf("querying table stats: %w", err)
	}

	totalSize, err := conn.TotalSize(ctx)
	if err != nil {
		return fmt.Errorf("querying total size: %w", err)
	}

	fmt.Println()
	fmt.Println(theme.Title.Render("database stats"))
	fmt.Println()

	rows := make([][]string, 0, len(stats))
	for _, s := range stats {
		rows = append(rows, []string{
			s.Name,
			format.Num(s.Rows),
			s.SizeStr,
		})
	}

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(theme.BorderStyle()).
		Headers("Table", "Rows", "Size").
		Rows(rows...).
		StyleFunc(func(row, col int) lipgloss.Style {
			base := lipgloss.NewStyle().Padding(0, 1)
			if row == -1 {
				return base.Bold(true).Foreground(theme.ColorBlue).Align(lipgloss.Center)
			}
			if col == 0 {
				return base.Foreground(theme.ColorCyan)
			}
			return base.Foreground(theme.ColorFg).Align(lipgloss.Right)
		})

	fmt.Println(t.Render())
	fmt.Printf("\n  %s %s\n\n",
		theme.Muted.Render("Total database size:"),
		theme.Value.Render(totalSize))

	return nil
}
