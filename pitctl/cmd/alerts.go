package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/rickhallett/thepit/pitctl/internal/alert"
	"github.com/rickhallett/thepit/pitctl/internal/config"
	"github.com/rickhallett/thepit/pitctl/internal/db"
	"github.com/rickhallett/thepit/pitctl/internal/format"
	"github.com/rickhallett/thepit/pitctl/internal/theme"
)

// AlertsOpts configures the alerts check command.
type AlertsOpts struct {
	Quiet      bool   // Only exit code, no output
	JSON       bool   // Output as JSON
	WebhookURL string // Slack webhook URL for notifications
}

// RunAlertsCheck runs all health checks and reports results.
func RunAlertsCheck(cfg *config.Config, opts AlertsOpts) error {
	report := &alert.Report{
		Timestamp: time.Now(),
	}

	// 1. Database connectivity
	report.Checks = append(report.Checks, checkDatabase(cfg))

	// 2. HTTP health endpoint
	report.Checks = append(report.Checks, checkHealth(cfg))

	// 3. Error rate (last hour)
	report.Checks = append(report.Checks, checkErrorRate(cfg))

	// 4. Stuck bouts (running > 10 minutes)
	report.Checks = append(report.Checks, checkStuckBouts(cfg))

	// 5. Free bout pool remaining
	report.Checks = append(report.Checks, checkFreeBoutPool(cfg))

	// Output
	if opts.JSON {
		data, _ := json.MarshalIndent(report, "", "  ")
		fmt.Println(string(data))
	} else if !opts.Quiet {
		fmt.Println()
		fmt.Println(theme.Title.Render("alerts check"))
		fmt.Println()

		for _, c := range report.Checks {
			var prefix string
			switch c.Level {
			case alert.LevelOK:
				prefix = theme.StatusOK.Render("OK  ")
			case alert.LevelWarn:
				prefix = theme.StatusWarn.Render("WARN")
			case alert.LevelCrit:
				prefix = theme.StatusBad.Render("CRIT")
			}
			fmt.Printf("  %s  %-25s %s\n", prefix, theme.Accent.Render(c.Name), c.Message)
		}
		fmt.Println()
		fmt.Printf("  %s\n\n", theme.Muted.Render(report.Summary()))
	}

	// Send to Slack if configured and there are issues
	if opts.WebhookURL != "" && report.HasFailures() {
		payload := alert.FormatSlack(report)
		if err := alert.SendSlack(opts.WebhookURL, payload); err != nil {
			if !opts.Quiet {
				fmt.Printf("  %s\n\n", theme.Error.Render(fmt.Sprintf("Slack alert failed: %v", err)))
			}
		}
	}

	if report.HasFailures() {
		return fmt.Errorf("health check failed: %s", report.Summary())
	}
	return nil
}

func checkDatabase(cfg *config.Config) alert.Check {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return alert.Check{Name: "Database", Level: alert.LevelCrit, Message: fmt.Sprintf("connection failed: %v", err)}
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	latency, err := conn.Ping(ctx)
	if err != nil {
		return alert.Check{Name: "Database", Level: alert.LevelCrit, Message: fmt.Sprintf("ping failed: %v", err)}
	}

	if latency > 500*time.Millisecond {
		return alert.Check{Name: "Database", Level: alert.LevelWarn, Message: fmt.Sprintf("high latency: %s", format.Duration(latency))}
	}

	return alert.Check{Name: "Database", Level: alert.LevelOK, Message: format.Duration(latency)}
}

func checkHealth(cfg *config.Config) alert.Check {
	url := cfg.AppURL + "/api/health"
	client := &http.Client{Timeout: 15 * time.Second}

	resp, err := client.Get(url)
	if err != nil {
		return alert.Check{Name: "Health Endpoint", Level: alert.LevelCrit, Message: fmt.Sprintf("unreachable: %v", err)}
	}
	defer resp.Body.Close()

	if resp.StatusCode == 503 {
		return alert.Check{Name: "Health Endpoint", Level: alert.LevelWarn, Message: "degraded (503)"}
	}
	if resp.StatusCode != 200 {
		return alert.Check{Name: "Health Endpoint", Level: alert.LevelCrit, Message: fmt.Sprintf("status %d", resp.StatusCode)}
	}

	return alert.Check{Name: "Health Endpoint", Level: alert.LevelOK, Message: "healthy"}
}

func checkErrorRate(cfg *config.Config) alert.Check {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return alert.Check{Name: "Error Rate", Level: alert.LevelCrit, Message: "db unavailable"}
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var totalLastHour, erroredLastHour int64
	conn.QueryVal(ctx, &totalLastHour, `SELECT COUNT(*) FROM bouts WHERE created_at >= NOW() - INTERVAL '1 hour'`)
	conn.QueryVal(ctx, &erroredLastHour, `SELECT COUNT(*) FROM bouts WHERE status = 'error' AND created_at >= NOW() - INTERVAL '1 hour'`)

	if totalLastHour == 0 {
		return alert.Check{Name: "Error Rate", Level: alert.LevelOK, Message: "no bouts in last hour"}
	}

	rate := float64(erroredLastHour) / float64(totalLastHour) * 100
	msg := fmt.Sprintf("%s (%d/%d bouts)", format.Percent(erroredLastHour, totalLastHour), erroredLastHour, totalLastHour)

	if rate > 25 {
		return alert.Check{Name: "Error Rate", Level: alert.LevelCrit, Message: msg}
	}
	if rate > 10 {
		return alert.Check{Name: "Error Rate", Level: alert.LevelWarn, Message: msg}
	}
	return alert.Check{Name: "Error Rate", Level: alert.LevelOK, Message: msg}
}

func checkStuckBouts(cfg *config.Config) alert.Check {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return alert.Check{Name: "Stuck Bouts", Level: alert.LevelCrit, Message: "db unavailable"}
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var stuckCount int64
	conn.QueryVal(ctx, &stuckCount,
		`SELECT COUNT(*) FROM bouts WHERE status = 'running' AND created_at < NOW() - INTERVAL '10 minutes'`)

	if stuckCount > 10 {
		return alert.Check{Name: "Stuck Bouts", Level: alert.LevelCrit, Message: fmt.Sprintf("%d bouts stuck running > 10 min", stuckCount)}
	}
	if stuckCount > 0 {
		return alert.Check{Name: "Stuck Bouts", Level: alert.LevelWarn, Message: fmt.Sprintf("%d bouts stuck running > 10 min", stuckCount)}
	}
	return alert.Check{Name: "Stuck Bouts", Level: alert.LevelOK, Message: "none"}
}

func checkFreeBoutPool(cfg *config.Config) alert.Check {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return alert.Check{Name: "Free Bout Pool", Level: alert.LevelCrit, Message: "db unavailable"}
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	today := time.Now().Format("2006-01-02")
	var poolUsed, poolMax int64
	err = conn.DB.QueryRowContext(ctx,
		`SELECT COALESCE(used, 0), COALESCE(max_daily, 500) FROM free_bout_pool WHERE date = $1`, today).Scan(&poolUsed, &poolMax)
	if err != nil {
		poolMax = 500
		poolUsed = 0
	}

	remaining := poolMax - poolUsed
	pctRemaining := float64(remaining) / float64(poolMax) * 100

	msg := fmt.Sprintf("%d/%d remaining (%.0f%%)", remaining, poolMax, pctRemaining)
	if pctRemaining < 5 {
		return alert.Check{Name: "Free Bout Pool", Level: alert.LevelCrit, Message: msg}
	}
	if pctRemaining < 15 {
		return alert.Check{Name: "Free Bout Pool", Level: alert.LevelWarn, Message: msg}
	}
	return alert.Check{Name: "Free Bout Pool", Level: alert.LevelOK, Message: msg}
}
