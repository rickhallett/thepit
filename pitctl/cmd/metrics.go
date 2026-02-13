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
	Period    string          `json:"period"`
	Generated time.Time       `json:"generated"`
	Bouts     BoutMetrics     `json:"bouts"`
	Users     UserMetrics     `json:"users"`
	Credits   CreditMetrics   `json:"credits"`
	Errors    ErrorMetrics    `json:"errors"`
	Pages     PageMetrics     `json:"pages"`
	Referrals ReferralMetrics `json:"referrals"`
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

// PageMetrics holds page view analytics.
type PageMetrics struct {
	TotalViews     int64     `json:"total_views"`
	UniqueVisitors int64     `json:"unique_visitors"`
	AvgPerHr       float64   `json:"avg_per_hour"`
	TopPages       []TopPage `json:"top_pages,omitempty"`
}

// TopPage represents a frequently-visited path.
type TopPage struct {
	Path  string `json:"path"`
	Views int64  `json:"views"`
}

// ReferralMetrics holds referral funnel data.
type ReferralMetrics struct {
	TotalReferrals    int64     `json:"total_referrals"`
	CreditedReferrals int64     `json:"credited_referrals"`
	ConversionRate    float64   `json:"conversion_rate_pct"`
	TopCodes          []TopCode `json:"top_codes,omitempty"`
}

// TopCode represents a top-performing referral code.
type TopCode struct {
	Code      string `json:"code"`
	Referrals int64  `json:"referrals"`
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
		`SELECT COALESCE(SUM(ABS(delta_micro)), 0) FROM credit_transactions WHERE delta_micro < 0 AND created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &data.Credits.TotalGranted,
		`SELECT COALESCE(SUM(delta_micro), 0) FROM credit_transactions WHERE delta_micro > 0 AND created_at >= NOW() - $1::interval`, interval)
	if hours > 0 {
		data.Credits.AvgSpentPerHr = float64(data.Credits.TotalSpent) / hours
	}

	// Error metrics.
	data.Errors.TotalErrors = data.Bouts.Errored
	if data.Bouts.Total > 0 {
		data.Errors.ErrorRate = float64(data.Bouts.Errored) / float64(data.Bouts.Total) * 100
	}

	// Page view metrics — errors intentionally ignored: table may not exist in
	// older deployments, and QueryVal leaves the destination at its zero value on failure.
	_ = conn.QueryVal(ctx, &data.Pages.TotalViews,
		`SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - $1::interval`, interval)
	_ = conn.QueryVal(ctx, &data.Pages.UniqueVisitors,
		`SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= NOW() - $1::interval`, interval)
	if hours > 0 {
		data.Pages.AvgPerHr = float64(data.Pages.TotalViews) / hours
	}

	// Top 5 pages by view count.
	pageRows2, err := conn.DB.QueryContext(ctx,
		`SELECT path, COUNT(*) as views FROM page_views
		 WHERE created_at >= NOW() - $1::interval
		 GROUP BY path ORDER BY views DESC LIMIT 5`, interval)
	if err == nil {
		defer pageRows2.Close()
		for pageRows2.Next() {
			var tp TopPage
			if pageRows2.Scan(&tp.Path, &tp.Views) == nil {
				data.Pages.TopPages = append(data.Pages.TopPages, tp)
			}
		}
	}

	// Referral funnel metrics — errors intentionally ignored (see page view comment above).
	_ = conn.QueryVal(ctx, &data.Referrals.TotalReferrals,
		`SELECT COUNT(*) FROM referrals WHERE created_at >= NOW() - $1::interval`, interval)
	_ = conn.QueryVal(ctx, &data.Referrals.CreditedReferrals,
		`SELECT COUNT(*) FROM referrals WHERE credited = true AND created_at >= NOW() - $1::interval`, interval)
	if data.Referrals.TotalReferrals > 0 {
		data.Referrals.ConversionRate = float64(data.Referrals.CreditedReferrals) / float64(data.Referrals.TotalReferrals) * 100
	}

	// Top 5 referral codes.
	codeRows2, err := conn.DB.QueryContext(ctx,
		`SELECT code, COUNT(*) as referrals FROM referrals
		 WHERE created_at >= NOW() - $1::interval
		 GROUP BY code ORDER BY referrals DESC LIMIT 5`, interval)
	if err == nil {
		defer codeRows2.Close()
		for codeRows2.Next() {
			var tc TopCode
			if codeRows2.Scan(&tc.Code, &tc.Referrals) == nil {
				data.Referrals.TopCodes = append(data.Referrals.TopCodes, tc)
			}
		}
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

	pageRows := [][]string{
		{"Total views", format.Num(data.Pages.TotalViews)},
		{"Unique visitors", format.Num(data.Pages.UniqueVisitors)},
		{"Avg/hour", fmt.Sprintf("%.1f", data.Pages.AvgPerHr)},
	}
	for _, tp := range data.Pages.TopPages {
		pageRows = append(pageRows, []string{tp.Path, format.Num(tp.Views)})
	}

	referralRows := [][]string{
		{"Total referrals", format.Num(data.Referrals.TotalReferrals)},
		{"Credited", format.Num(data.Referrals.CreditedReferrals)},
		{"Conversion", fmt.Sprintf("%.1f%%", data.Referrals.ConversionRate)},
	}
	for _, tc := range data.Referrals.TopCodes {
		referralRows = append(referralRows, []string{tc.Code, format.Num(tc.Referrals)})
	}

	bt := makeMetricsTable("Bouts", boutRows)
	ut := makeMetricsTable("Users", userRows)
	ct := makeMetricsTable("Credits", creditRows)
	et := makeMetricsTable("Errors", errorRows)
	pt := makeMetricsTable("Pages", pageRows)
	rt := makeMetricsTable("Referrals", referralRows)

	row1 := lipgloss.JoinHorizontal(lipgloss.Top, bt, "  ", ut)
	row2 := lipgloss.JoinHorizontal(lipgloss.Top, ct, "  ", et)
	row3 := lipgloss.JoinHorizontal(lipgloss.Top, pt, "  ", rt)
	fmt.Println(row1)
	fmt.Println()
	fmt.Println(row2)
	fmt.Println()
	fmt.Println(row3)
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
