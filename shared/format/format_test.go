package format

import (
	"testing"
	"time"
)

func TestNum(t *testing.T) {
	tests := []struct {
		input int64
		want  string
	}{
		{0, "0"},
		{1, "1"},
		{999, "999"},
		{1000, "1,000"},
		{1234, "1,234"},
		{12345, "12,345"},
		{123456, "123,456"},
		{1234567, "1,234,567"},
		{-1234, "-1,234"},
		{1000000, "1,000,000"},
	}

	for _, tc := range tests {
		got := Num(tc.input)
		if got != tc.want {
			t.Errorf("Num(%d) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestCredits(t *testing.T) {
	tests := []struct {
		microCredits int64
		want         string
	}{
		{0, "0.00"},
		{100, "1.00"},
		{50, "0.50"},
		{12345, "123.45"},
		{-500, "-5.00"},
		{1, "0.01"},
		{99, "0.99"},
		{50000, "500.00"},
	}

	for _, tc := range tests {
		got := Credits(tc.microCredits)
		if got != tc.want {
			t.Errorf("Credits(%d) = %q, want %q", tc.microCredits, got, tc.want)
		}
	}
}

func TestRelativeTime(t *testing.T) {
	now := time.Now()

	tests := []struct {
		input time.Time
		want  string
	}{
		{now.Add(-10 * time.Second), "just now"},
		{now.Add(-5 * time.Minute), "5 mins ago"},
		{now.Add(-1 * time.Minute), "1 min ago"},
		{now.Add(-2 * time.Hour), "2 hours ago"},
		{now.Add(-1 * time.Hour), "1 hour ago"},
		{now.Add(-3 * 24 * time.Hour), "3 days ago"},
		{now.Add(-1 * 24 * time.Hour), "1 day ago"},
	}

	for _, tc := range tests {
		got := RelativeTime(tc.input)
		if got != tc.want {
			t.Errorf("RelativeTime(%v ago) = %q, want %q", time.Since(tc.input), got, tc.want)
		}
	}
}

func TestRelativeTimeOld(t *testing.T) {
	old := time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC)
	got := RelativeTime(old)
	if got != "2025-01-15" {
		t.Errorf("RelativeTime(old) = %q, want 2025-01-15", got)
	}
}

func TestDate(t *testing.T) {
	tm := time.Date(2026, 2, 11, 14, 30, 0, 0, time.UTC)
	got := Date(tm)
	if got != "2026-02-11" {
		t.Errorf("Date() = %q, want 2026-02-11", got)
	}
}

func TestDateTime(t *testing.T) {
	tm := time.Date(2026, 2, 11, 14, 30, 45, 0, time.UTC)
	got := DateTime(tm)
	if got != "2026-02-11 14:30:45" {
		t.Errorf("DateTime() = %q, want 2026-02-11 14:30:45", got)
	}
}

func TestDuration(t *testing.T) {
	tests := []struct {
		input time.Duration
		want  string
	}{
		{500 * time.Microsecond, "500µs"},
		{23 * time.Millisecond, "23ms"},
		{1500 * time.Millisecond, "1500ms"},
	}

	for _, tc := range tests {
		got := Duration(tc.input)
		if got != tc.want {
			t.Errorf("Duration(%v) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestPercent(t *testing.T) {
	tests := []struct {
		num, den int64
		want     string
	}{
		{0, 0, "0.0%"},
		{50, 100, "50.0%"},
		{1, 3, "33.3%"},
		{100, 100, "100.0%"},
		{3, 4, "75.0%"},
	}

	for _, tc := range tests {
		got := Percent(tc.num, tc.den)
		if got != tc.want {
			t.Errorf("Percent(%d, %d) = %q, want %q", tc.num, tc.den, got, tc.want)
		}
	}
}

func TestTruncateID(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"short", "short"},
		{"user_2abc1234defg5678", "...defg5678"},
		{"user_2nBxKzPq9mR5vWjY", "...9mR5vWjY"},
		{"12chars_long", "12chars_long"},
		{"a", "a"},
		{"1234567890123", "...67890123"},
	}

	for _, tc := range tests {
		got := TruncateID(tc.input)
		if got != tc.want {
			t.Errorf("TruncateID(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}
