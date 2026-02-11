package main

import (
	"testing"
)

func TestHasFlag(t *testing.T) {
	args := []string{"--archived", "--limit", "50", "--yes"}

	tests := []struct {
		flag string
		want bool
	}{
		{"--archived", true},
		{"--limit", true},
		{"--yes", true},
		{"--missing", false},
		{"50", true}, // it's in args but not a flag — hasFlag doesn't distinguish
	}

	for _, tc := range tests {
		got := hasFlag(args, tc.flag)
		if got != tc.want {
			t.Errorf("hasFlag(%v, %q) = %v, want %v", args, tc.flag, got, tc.want)
		}
	}
}

func TestFlagVal(t *testing.T) {
	args := []string{"--url", "https://thepit.cloud", "--limit", "25", "--solo"}

	tests := []struct {
		flag string
		want string
	}{
		{"--url", "https://thepit.cloud"},
		{"--limit", "25"},
		{"--solo", ""}, // no value after last flag
		{"--missing", ""},
	}

	for _, tc := range tests {
		got := flagVal(args, tc.flag)
		if got != tc.want {
			t.Errorf("flagVal(%v, %q) = %q, want %q", args, tc.flag, got, tc.want)
		}
	}
}

func TestFlagValEdgeCases(t *testing.T) {
	// Empty args.
	if got := flagVal(nil, "--url"); got != "" {
		t.Errorf("flagVal(nil, --url) = %q, want empty", got)
	}

	// Flag at end of list (no value).
	args := []string{"--flag"}
	if got := flagVal(args, "--flag"); got != "" {
		t.Errorf("flagVal with flag at end = %q, want empty", got)
	}
}

func TestHasFlagEmpty(t *testing.T) {
	if hasFlag(nil, "--flag") {
		t.Error("hasFlag(nil) should return false")
	}
	if hasFlag([]string{}, "--flag") {
		t.Error("hasFlag(empty) should return false")
	}
}
