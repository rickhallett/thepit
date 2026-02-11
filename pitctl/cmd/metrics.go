package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/lipgloss/table"

	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/format"
	"github.com/rickhallett/thepit/shared/theme"
)

// MetricsOpts configures the metrics command.
type MetricsOpts struct {
	Period string // "24h", "7d", "30d"
	JSON   bool
}

// MetricsData holds all computed metrics for JSON output.
type MetricsData struct {
	Period    string        `json:"period"`
	Generated time.Time     `json:"generated"`
	Bouts     BoutMetrics   `json:"bouts"`
	Users     UserMetrics   `json:"users"`
	Credits   CreditMetrics `json:"credits"`
	Errors    ErrorMetrics  `json:"errors"`
}

// BoutMetrics holds bout-related metrics.
type BoutMetrics struct {
	Total     int64   `json:"total"`
	Completed int64   `json:"completed"`
	Errored   int64   `json:"errored"`
	AvgPerHr  float64 `json:"avg_per_hour"`
}

// UserMetrics holds user-related metrics.
type UserMetrics struct {
	NewSignups int64 `json:"new_signups"`
	Active     int64 `json:"active_bout_creators"`
}

// CreditMetrics holds credit-related metrics.
type CreditMetrics struct {
	TotalSpent    int64   `json:"total_spent_micro"`
	TotalGranted  int64   `json:"total_granted_micro"`
	AvgSpentPerHr float64 `json:"avg_spent_per_hour_micro"`
}

// ErrorMetrics holds error-related metrics.
type ErrorMetrics struct {
	TotalErrors int64   `json:"total_errors"`
	ErrorRate   float64 `json:"error_rate_pct"`
}

// RunMetrics computes and displays time-series metrics.
func RunMetrics(cfg *config.Config, opts MetricsOpts) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	interval, hours, label := parsePeriod(opts.Period)

	data := MetricsData{
		Period:    opts.Period,
		Generated: time.Now(),
	}

	// Bout metrics.
	conn.QueryVal(ctx, &data.Bouts.Total,
		`SELECT COUNT(*) FROM bouts WHERE created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &data.Bouts.Completed,
		`SELECT COUNT(*) FROM bouts WHERE status = 'completed' AND created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &data.Bouts.Errored,
		`SELECT COUNT(*) FROM bouts WHERE status = 'error' AND created_at >= NOW() - $1::interval`, interval)
	if hours > 0 {
		data.Bouts.AvgPerHr = float64(data.Bouts.Total) / hours
	}

	// User metrics.
	conn.QueryVal(ctx, &data.Users.NewSignups,
		`SELECT COUNT(*) FROM users WHERE created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &data.Users.Active,
		`SELECT COUNT(DISTINCT owner_id) FROM bouts WHERE created_at >= NOW() - $1::interval`, interval)

	// Credit metrics.
	conn.QueryVal(ctx, &data.Credits.TotalSpent,
		`SELECT COALESCE(SUM(ABS(amount)), 0) FROM credit_ledger WHERE amount < 0 AND created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &data.Credits.TotalGranted,
		`SELECT COALESCE(SUM(amount), 0) FROM credit_ledger WHERE amount > 0 AND created_at >= NOW() - $1::interval`, interval)
	if hours > 0 {
		data.Credits.AvgSpentPerHr = float64(data.Credits.TotalSpent) / hours
	}

	// Error metrics.
	data.Errors.TotalErrors = data.Bouts.Errored
	if data.Bouts.Total > 0 {
		data.Errors.ErrorRate = float64(data.Bouts.Errored) / float64(data.Bouts.Total) * 100
	}

	if opts.JSON {
		out, _ := json.MarshalIndent(data, "", "  ")
		fmt.Println(string(out))
		return nil
	}

	// Render tables.
	fmt.Println()
	fmt.Printf("  %s  %s\n\n",
		theme.Title.Render("pitctl metrics"),
		theme.Muted.Render(label))

	boutRows := [][]string{
		{"Total", format.Num(data.Bouts.Total)},
		{"Completed", format.Num(data.Bouts.Completed)},
		{"Errored", format.Num(data.Bouts.Errored)},
		{"Avg/hour", fmt.Sprintf("%.1f", data.Bouts.AvgPerHr)},
	}

	userRows := [][]string{
		{"New signups", format.Num(data.Users.NewSignups)},
		{"Active creators", format.Num(data.Users.Active)},
	}

	creditRows := [][]string{
		{"Spent", format.Credits(data.Credits.TotalSpent)},
		{"Granted", format.Credits(data.Credits.TotalGranted)},
		{"Avg spent/hr", format.Credits(int64(data.Credits.AvgSpentPerHr))},
	}

	errorRows := [][]string{
		{"Total errors", format.Num(data.Errors.TotalErrors)},
		{"Error rate", fmt.Sprintf("%.1f%%", data.Errors.ErrorRate)},
	}

	bt := makeMetricsTable("Bouts", boutRows)
	ut := makeMetricsTable("Users", userRows)
	ct := makeMetricsTable("Credits", creditRows)
	et := makeMetricsTable("Errors", errorRows)

	row1 := lipgloss.JoinHorizontal(lipgloss.Top, bt, "  ", ut)
	row2 := lipgloss.JoinHorizontal(lipgloss.Top, ct, "  ", et)
	fmt.Println(row1)
	fmt.Println()
	fmt.Println(row2)
	fmt.Println()

	return nil
}

// parsePeriod converts a period string to a Postgres interval, hours count, and label.
func parsePeriod(period string) (string, float64, string) {
	switch period {
	case "7d":
		return "7 days", 168, "last 7 days"
	case "30d":
		return "30 days", 720, "last 30 days"
	default: // "24h"
		return "24 hours", 24, "last 24 hours"
	}
}

func makeMetricsTable(title string, rows [][]string) string {
	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(theme.BorderStyle()).
		Headers(title, "Value").
		Rows(rows...).
		StyleFunc(func(row, col int) lipgloss.Style {
			base := lipgloss.NewStyle().Padding(0, 1)
			if row == -1 {
				return base.Bold(true).Foreground(theme.ColorBlue).Align(lipgloss.Center)
			}
			if col == 0 {
				return base.Foreground(theme.ColorPurple)
			}
			return base.Foreground(theme.ColorFg).Align(lipgloss.Right)
		})
	return t.Render()
}
