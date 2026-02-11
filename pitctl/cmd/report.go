package cmd

import (
	"context"
	"fmt"
	"time"

	"github.com/rickhallett/thepit/pitctl/internal/alert"
	"github.com/rickhallett/thepit/pitctl/internal/config"
	"github.com/rickhallett/thepit/pitctl/internal/db"
	"github.com/rickhallett/thepit/pitctl/internal/format"
	"github.com/rickhallett/thepit/pitctl/internal/theme"
)

// RunReport generates a summary report for the given period and optionally sends to Slack.
func RunReport(cfg *config.Config, period string, webhookURL string) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var interval string
	var label string
	switch period {
	case "weekly":
		interval = "7 days"
		label = "Weekly Report"
	default:
		interval = "24 hours"
		label = "Daily Report"
	}

	// Gather stats.
	var totalBouts, completedBouts, erroredBouts int64
	var newUsers, activeUsers int64
	var creditsSpent, creditsGranted int64

	conn.QueryVal(ctx, &totalBouts,
		`SELECT COUNT(*) FROM bouts WHERE created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &completedBouts,
		`SELECT COUNT(*) FROM bouts WHERE status = 'completed' AND created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &erroredBouts,
		`SELECT COUNT(*) FROM bouts WHERE status = 'error' AND created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &newUsers,
		`SELECT COUNT(*) FROM users WHERE created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &activeUsers,
		`SELECT COUNT(DISTINCT owner_id) FROM bouts WHERE created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &creditsSpent,
		`SELECT COALESCE(SUM(ABS(amount)), 0) FROM credit_ledger WHERE amount < 0 AND created_at >= NOW() - $1::interval`, interval)
	conn.QueryVal(ctx, &creditsGranted,
		`SELECT COALESCE(SUM(amount), 0) FROM credit_ledger WHERE amount > 0 AND created_at >= NOW() - $1::interval`, interval)

	// Current health check.
	healthReport := runChecks(cfg)

	// Error rate.
	var errorRate float64
	if totalBouts > 0 {
		errorRate = float64(erroredBouts) / float64(totalBouts) * 100
	}

	// Terminal output.
	fmt.Println()
	fmt.Printf("  %s  %s\n\n",
		theme.Title.Render("pitctl report"),
		theme.Muted.Render(label))

	printReportLine("Bouts", fmt.Sprintf("%s total, %s completed, %s errored",
		format.Num(totalBouts), format.Num(completedBouts), format.Num(erroredBouts)))
	printReportLine("Error rate", fmt.Sprintf("%.1f%%", errorRate))
	printReportLine("Users", fmt.Sprintf("%s new, %s active", format.Num(newUsers), format.Num(activeUsers)))
	printReportLine("Credits", fmt.Sprintf("%s spent, %s granted",
		format.Credits(creditsSpent), format.Credits(creditsGranted)))
	fmt.Println()

	// Health status.
	fmt.Printf("  %s\n", theme.Accent.Render("Current Health"))
	for _, c := range healthReport.Checks {
		var prefix string
		switch c.Level {
		case alert.LevelOK:
			prefix = theme.StatusOK.Render("OK  ")
		case alert.LevelWarn:
			prefix = theme.StatusWarn.Render("WARN")
		case alert.LevelCrit:
			prefix = theme.StatusBad.Render("CRIT")
		}
		fmt.Printf("    %s  %-20s %s\n", prefix, c.Name, c.Message)
	}
	fmt.Println()

	// Send to Slack if webhook provided.
	if webhookURL != "" {
		payload := formatReportSlack(label, totalBouts, completedBouts, erroredBouts,
			errorRate, newUsers, activeUsers, creditsSpent, creditsGranted, healthReport)
		if err := alert.SendSlack(webhookURL, payload); err != nil {
			fmt.Printf("  %s\n\n", theme.Error.Render(fmt.Sprintf("Slack: %v", err)))
		} else {
			fmt.Printf("  %s\n\n", theme.StatusOK.Render("Sent to Slack"))
		}
	}

	return nil
}

func printReportLine(label, value string) {
	fmt.Printf("  %-18s %s\n", theme.Accent.Render(label), value)
}

func formatReportSlack(
	label string,
	totalBouts, completedBouts, erroredBouts int64,
	errorRate float64,
	newUsers, activeUsers int64,
	creditsSpent, creditsGranted int64,
	healthReport *alert.Report,
) map[string]interface{} {
	healthEmoji := ":white_check_mark:"
	if healthReport.WorstLevel() == alert.LevelWarn {
		healthEmoji = ":warning:"
	}
	if healthReport.WorstLevel() == alert.LevelCrit {
		healthEmoji = ":rotating_light:"
	}

	text := fmt.Sprintf(":clipboard: *pitctl %s*\n\n", label)
	text += fmt.Sprintf(":boxing_glove: *Bouts:* %s total, %s completed, %s errored (%.1f%% error rate)\n",
		format.Num(totalBouts), format.Num(completedBouts), format.Num(erroredBouts), errorRate)
	text += fmt.Sprintf(":busts_in_silhouette: *Users:* %s new, %s active\n",
		format.Num(newUsers), format.Num(activeUsers))
	text += fmt.Sprintf(":coin: *Credits:* %s spent, %s granted\n",
		format.Credits(creditsSpent), format.Credits(creditsGranted))
	text += fmt.Sprintf("%s *Health:* %s\n", healthEmoji, healthReport.Summary())

	// Append any issues.
	for _, c := range healthReport.Checks {
		if c.Level == alert.LevelOK {
			continue
		}
		var emoji string
		switch c.Level {
		case alert.LevelWarn:
			emoji = ":warning:"
		case alert.LevelCrit:
			emoji = ":x:"
		}
		text += fmt.Sprintf("  %s *%s* — %s\n", emoji, c.Name, c.Message)
	}

	return map[string]interface{}{
		"text": text,
	}
}
