package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rickhallett/thepit/pitctl/internal/alert"
	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/theme"
)

// WatchOpts configures the continuous monitoring loop.
type WatchOpts struct {
	IntervalRaw string // Raw interval string (e.g., "5m", "30s")
	JSON        bool   // Output as JSON
	WebhookURL  string // Slack webhook URL
}

// RunWatch runs alerts checks in a loop until interrupted.
func RunWatch(cfg *config.Config, opts WatchOpts) error {
	interval := 5 * time.Minute
	if opts.IntervalRaw != "" {
		d, err := time.ParseDuration(opts.IntervalRaw)
		if err != nil {
			return fmt.Errorf("invalid interval %q: %w", opts.IntervalRaw, err)
		}
		if d < 10*time.Second {
			return fmt.Errorf("interval must be at least 10s")
		}
		interval = d
	}

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	if !opts.JSON {
		fmt.Println()
		fmt.Printf("  %s watching every %s (ctrl-c to stop)\n\n",
			theme.Title.Render("pitctl watch"), interval)
	}

	// Track previous state for change detection.
	var prevWorst alert.Level

	// Run immediately, then loop.
	for {
		report := runChecks(cfg)

		if opts.JSON {
			data, _ := json.Marshal(report)
			fmt.Println(string(data))
		} else {
			ts := time.Now().Format("15:04:05")
			worst := report.WorstLevel()
			var statusStr string
			switch worst {
			case alert.LevelOK:
				statusStr = theme.StatusOK.Render("OK")
			case alert.LevelWarn:
				statusStr = theme.StatusWarn.Render("WARN")
			case alert.LevelCrit:
				statusStr = theme.StatusBad.Render("CRIT")
			}
			fmt.Printf("  %s  %s  %s\n",
				theme.Muted.Render(ts), statusStr, theme.Muted.Render(report.Summary()))

			// Print details on state change or if there are issues.
			if worst != alert.LevelOK && (worst != prevWorst || worst == alert.LevelCrit) {
				for _, c := range report.Checks {
					if c.Level == alert.LevelOK {
						continue
					}
					var prefix string
					switch c.Level {
					case alert.LevelWarn:
						prefix = theme.StatusWarn.Render("WARN")
					case alert.LevelCrit:
						prefix = theme.StatusBad.Render("CRIT")
					}
					fmt.Printf("         %s  %-20s %s\n", prefix, theme.Accent.Render(c.Name), c.Message)
				}
			}
			prevWorst = worst
		}

		// Send Slack on threshold breach (only when state worsens).
		if opts.WebhookURL != "" && report.HasFailures() {
			worst := report.WorstLevel()
			if worst != prevWorst || worst == alert.LevelCrit {
				payload := alert.FormatSlack(report)
				if err := alert.SendSlack(opts.WebhookURL, payload); err != nil && !opts.JSON {
					fmt.Printf("         %s\n", theme.Error.Render(fmt.Sprintf("Slack: %v", err)))
				}
			}
		}

		// Wait for next tick or interrupt.
		select {
		case <-sig:
			if !opts.JSON {
				fmt.Printf("\n  %s\n\n", theme.Muted.Render("stopped"))
			}
			return nil
		case <-time.After(interval):
		}
	}
}

// runChecks executes all health checks and returns a report.
func runChecks(cfg *config.Config) *alert.Report {
	report := &alert.Report{
		Timestamp: time.Now(),
	}
	report.Checks = append(report.Checks, checkDatabase(cfg))
	report.Checks = append(report.Checks, checkHealth(cfg))
	report.Checks = append(report.Checks, checkErrorRate(cfg))
	report.Checks = append(report.Checks, checkStuckBouts(cfg))
	report.Checks = append(report.Checks, checkFreeBoutPool(cfg))
	return report
}
