// Package format provides number, time, and credit formatting utilities
// for THE PIT CLI tools.
package format

import (
	"fmt"
	"strings"
	"time"
)

// Num formats an integer with thousands separators.
func Num(n int64) string {
	if n < 0 {
		return "-" + Num(-n)
	}
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}
	var parts []string
	for len(s) > 3 {
		parts = append([]string{s[len(s)-3:]}, parts...)
		s = s[:len(s)-3]
	}
	parts = append([]string{s}, parts...)
	return strings.Join(parts, ",")
}

// Credits formats micro-credits as user-facing credits with 2 decimal places.
// 1 credit = 100 micro-credits.
func Credits(microCredits int64) string {
	credits := float64(microCredits) / 100.0
	return fmt.Sprintf("%.2f", credits)
}

// RelativeTime returns a human-readable relative time string.
func RelativeTime(t time.Time) string {
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		m := int(d.Minutes())
		if m == 1 {
			return "1 min ago"
		}
		return fmt.Sprintf("%d mins ago", m)
	case d < 24*time.Hour:
		h := int(d.Hours())
		if h == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", h)
	case d < 30*24*time.Hour:
		days := int(d.Hours() / 24)
		if days == 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", days)
	default:
		return t.Format("2006-01-02")
	}
}

// Date formats a time as YYYY-MM-DD.
func Date(t time.Time) string {
	return t.Format("2006-01-02")
}

// DateTime formats a time as YYYY-MM-DD HH:MM:SS.
func DateTime(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}

// Duration formats a time.Duration as a human-readable string.
func Duration(d time.Duration) string {
	if d < time.Millisecond {
		return fmt.Sprintf("%dµs", d.Microseconds())
	}
	return fmt.Sprintf("%dms", d.Milliseconds())
}

// Percent formats a ratio as a percentage string.
func Percent(numerator, denominator int64) string {
	if denominator == 0 {
		return "0.0%"
	}
	pct := float64(numerator) / float64(denominator) * 100.0
	return fmt.Sprintf("%.1f%%", pct)
}

// TruncateID shortens a Clerk user ID for display (shows last 8 chars).
func TruncateID(id string) string {
	if len(id) <= 12 {
		return id
	}
	return "..." + id[len(id)-8:]
}
