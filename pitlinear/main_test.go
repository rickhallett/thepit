package main

import (
	"testing"

	"github.com/rickhallett/thepit/pitlinear/cmd"
)

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

func TestParseListOpts(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want cmd.ListOpts
	}{
		{"empty", nil, cmd.ListOpts{}},
		{"state only", []string{"--state", "Todo"}, cmd.ListOpts{State: "Todo"}},
		{"label only", []string{"--label", "Bug"}, cmd.ListOpts{Label: "Bug"}},
		{"limit only", []string{"--limit", "10"}, cmd.ListOpts{Limit: 10}},
		{"all flags", []string{"--state", "Done", "--label", "Feature", "--limit", "25"},
			cmd.ListOpts{State: "Done", Label: "Feature", Limit: 25}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseListOpts(tt.args)
			if got != tt.want {
				t.Errorf("parseListOpts(%v) = %+v, want %+v", tt.args, got, tt.want)
			}
		})
	}
}
