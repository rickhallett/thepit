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

// RunStatus displays a dashboard overview of the site.
func RunStatus(cfg *config.Config) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Ping for latency.
	latency, err := conn.Ping(ctx)
	if err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	// Title.
	fmt.Println()
	titleBlock := lipgloss.JoinVertical(lipgloss.Left,
		theme.Title.Render("pitctl"),
		theme.Subtitle.Render(fmt.Sprintf("%s dashboard", cfg.AppURL)),
	)
	fmt.Println(titleBlock)
	fmt.Println()

	// System info box.
	var dbStatus string
	dbStatus = theme.StatusOK.Render(fmt.Sprintf("connected (%s)", format.Duration(latency)))

	lines := []string{
		fmt.Sprintf("  %-20s %s", theme.Muted.Render("Database"), dbStatus),
		fmt.Sprintf("  %-20s %s", theme.Muted.Render("App URL"), theme.Value.Render(cfg.AppURL)),
		fmt.Sprintf("  %-20s %s", theme.Muted.Render("Subscriptions"), enabledStr(cfg.IsEnabled("SUBSCRIPTIONS_ENABLED"))),
		fmt.Sprintf("  %-20s %s", theme.Muted.Render("Credits"), enabledStr(cfg.IsEnabled("CREDITS_ENABLED"))),
		fmt.Sprintf("  %-20s %s", theme.Muted.Render("BYOK"), enabledStr(cfg.IsEnabled("BYOK_ENABLED"))),
	}

	// Free bout pool.
	var poolUsed, poolMax int64
	today := time.Now().Format("2006-01-02")
	err = conn.DB.QueryRowContext(ctx,
		`SELECT COALESCE(used, 0), COALESCE(max_daily, 500) FROM free_bout_pool WHERE date = $1`, today).Scan(&poolUsed, &poolMax)
	if err != nil {
		// No pool entry for today — show full pool.
		poolMax = 500
		if m := cfg.Get("FREE_BOUT_POOL_MAX"); m != "" {
			fmt.Sscanf(m, "%d", &poolMax)
		}
		poolUsed = 0
	}
	remaining := poolMax - poolUsed
	lines = append(lines, fmt.Sprintf("  %-20s %s",
		theme.Muted.Render("Free Bout Pool"),
		theme.Value.Render(fmt.Sprintf("%s / %s remaining today", format.Num(remaining), format.Num(poolMax)))))

	for _, l := range lines {
		fmt.Println(l)
	}
	fmt.Println()

	// User stats.
	type tierCount struct {
		tier  string
		count int64
	}
	var totalUsers, freeUsers, passUsers, labUsers, todayUsers int64

	queryWarn(ctx, conn, &totalUsers, `SELECT COUNT(*) FROM users`)
	queryWarn(ctx, conn, &freeUsers, `SELECT COUNT(*) FROM users WHERE subscription_tier = 'free'`)
	queryWarn(ctx, conn, &passUsers, `SELECT COUNT(*) FROM users WHERE subscription_tier = 'pass'`)
	queryWarn(ctx, conn, &labUsers, `SELECT COUNT(*) FROM users WHERE subscription_tier = 'lab'`)
	queryWarn(ctx, conn, &todayUsers, `SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE`)

	userRows := [][]string{
		{"Total", format.Num(totalUsers)},
		{"Free tier", format.Num(freeUsers)},
		{"Pit Pass", format.Num(passUsers)},
		{"Pit Lab", format.Num(labUsers)},
		{"Today new", format.Num(todayUsers)},
	}

	// Bout stats.
	var totalBouts, runningBouts, completeBouts, errorBouts, todayBouts int64

	queryWarn(ctx, conn, &totalBouts, `SELECT COUNT(*) FROM bouts`)
	queryWarn(ctx, conn, &runningBouts, `SELECT COUNT(*) FROM bouts WHERE status = 'running'`)
	queryWarn(ctx, conn, &completeBouts, `SELECT COUNT(*) FROM bouts WHERE status = 'completed'`)
	queryWarn(ctx, conn, &errorBouts, `SELECT COUNT(*) FROM bouts WHERE status = 'error'`)
	queryWarn(ctx, conn, &todayBouts, `SELECT COUNT(*) FROM bouts WHERE created_at >= CURRENT_DATE`)

	boutRows := [][]string{
		{"Total", format.Num(totalBouts)},
		{"Running", format.Num(runningBouts)},
		{"Completed", format.Num(completeBouts)},
		{"Errored", format.Num(errorBouts)},
		{"Today", format.Num(todayBouts)},
	}

	// Agent stats.
	var totalAgents, freeAgents, premiumAgents, customAgents, archivedAgents, flaggedAgents int64

	queryWarn(ctx, conn, &totalAgents, `SELECT COUNT(*) FROM agents`)
	queryWarn(ctx, conn, &freeAgents, `SELECT COUNT(*) FROM agents WHERE tier = 'free' AND NOT archived`)
	queryWarn(ctx, conn, &premiumAgents, `SELECT COUNT(*) FROM agents WHERE tier = 'premium' AND NOT archived`)
	queryWarn(ctx, conn, &customAgents, `SELECT COUNT(*) FROM agents WHERE tier = 'custom' AND NOT archived`)
	queryWarn(ctx, conn, &archivedAgents, `SELECT COUNT(*) FROM agents WHERE archived`)
	queryWarn(ctx, conn, &flaggedAgents,
		`SELECT COUNT(DISTINCT agent_id) FROM agent_flags`)

	agentRows := [][]string{
		{"Total", format.Num(totalAgents)},
		{"Free", format.Num(freeAgents)},
		{"Premium", format.Num(premiumAgents)},
		{"Custom", format.Num(customAgents)},
		{"Archived", format.Num(archivedAgents)},
		{"Flagged", format.Num(flaggedAgents)},
	}

	// Render tables side by side.
	ut := makeKVTable("Users", userRows)
	bt := makeKVTable("Bouts", boutRows)
	at := makeKVTable("Agents", agentRows)

	row1 := lipgloss.JoinHorizontal(lipgloss.Top, ut, "  ", bt)
	fmt.Println(row1)
	fmt.Println()
	fmt.Println(at)
	fmt.Println()

	return nil
}

func enabledStr(enabled bool) string {
	if enabled {
		return theme.StatusOK.Render("enabled")
	}
	return theme.Muted.Render("disabled")
}

func makeKVTable(title string, rows [][]string) string {
	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(theme.BorderStyle()).
		Headers(title, "Count").
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
