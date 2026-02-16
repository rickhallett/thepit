package main

import "testing"

func TestHasFlag(t *testing.T) {
	tests := []struct {
		args []string
		name string
		want bool
	}{
		{[]string{"--json"}, "--json", true},
		{[]string{"--verbose", "--json"}, "--json", true},
		{[]string{"--verbose"}, "--json", false},
		{nil, "--json", false},
		{[]string{}, "--json", false},
	}
	for _, tt := range tests {
		if got := hasFlag(tt.args, tt.name); got != tt.want {
			t.Errorf("hasFlag(%v, %q) = %v, want %v", tt.args, tt.name, got, tt.want)
		}
	}
}

func TestFlagVal(t *testing.T) {
	tests := []struct {
		args []string
		name string
		want string
	}{
		{[]string{"--team", "OCE"}, "--team", "OCE"},
		{[]string{"--verbose", "--team", "ALP"}, "--team", "ALP"},
		{[]string{"--team"}, "--team", ""}, // no value after flag
		{[]string{"--verbose"}, "--team", ""},
		{nil, "--team", ""},
	}
	for _, tt := range tests {
		if got := flagVal(tt.args, tt.name); got != tt.want {
			t.Errorf("flagVal(%v, %q) = %q, want %q", tt.args, tt.name, got, tt.want)
		}
	}
}
