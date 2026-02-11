// Package alert provides notification dispatching for pitctl monitoring.
package alert

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Level represents the severity of an alert.
type Level string

const (
	LevelOK   Level = "ok"
	LevelWarn Level = "warn"
	LevelCrit Level = "critical"
)

// Check represents the result of a single health check.
type Check struct {
	Name    string `json:"name"`
	Level   Level  `json:"level"`
	Message string `json:"message"`
}

// Report is a collection of check results.
type Report struct {
	Timestamp time.Time `json:"timestamp"`
	Checks    []Check   `json:"checks"`
}

// HasFailures returns true if any check is not OK.
func (r *Report) HasFailures() bool {
	for _, c := range r.Checks {
		if c.Level != LevelOK {
			return true
		}
	}
	return false
}

// WorstLevel returns the highest severity level in the report.
func (r *Report) WorstLevel() Level {
	worst := LevelOK
	for _, c := range r.Checks {
		if c.Level == LevelCrit {
			return LevelCrit
		}
		if c.Level == LevelWarn {
			worst = LevelWarn
		}
	}
	return worst
}

// Summary returns a human-readable summary string.
func (r *Report) Summary() string {
	ok, warn, crit := 0, 0, 0
	for _, c := range r.Checks {
		switch c.Level {
		case LevelOK:
			ok++
		case LevelWarn:
			warn++
		case LevelCrit:
			crit++
		}
	}
	return fmt.Sprintf("%d ok, %d warn, %d critical", ok, warn, crit)
}

// FormatSlack formats the report as a Slack message payload.
func FormatSlack(r *Report) map[string]interface{} {
	emoji := ":white_check_mark:"
	if r.WorstLevel() == LevelWarn {
		emoji = ":warning:"
	}
	if r.WorstLevel() == LevelCrit {
		emoji = ":rotating_light:"
	}

	text := fmt.Sprintf("%s *pitctl alerts* — %s\n", emoji, r.Summary())
	for _, c := range r.Checks {
		var prefix string
		switch c.Level {
		case LevelOK:
			continue // Only show issues in Slack
		case LevelWarn:
			prefix = ":warning:"
		case LevelCrit:
			prefix = ":x:"
		}
		text += fmt.Sprintf("%s *%s* — %s\n", prefix, c.Name, c.Message)
	}

	return map[string]interface{}{
		"text": text,
	}
}

// SendSlack posts a message to a Slack webhook URL.
func SendSlack(webhookURL string, payload map[string]interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshaling slack payload: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("posting to slack: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("slack returned %d", resp.StatusCode)
	}
	return nil
}
