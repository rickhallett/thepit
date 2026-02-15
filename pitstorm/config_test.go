package main

import (
	"testing"
	"time"
)

func TestDefaultRunConfig(t *testing.T) {
	cfg := DefaultRunConfig()
	if cfg.Target != "https://www.thepit.cloud" {
		t.Errorf("Target = %q, want https://www.thepit.cloud", cfg.Target)
	}
	if cfg.Profile != "steady" {
		t.Errorf("Profile = %q, want steady", cfg.Profile)
	}
	if cfg.Rate != 5 {
		t.Errorf("Rate = %f, want 5", cfg.Rate)
	}
	if cfg.Duration != 10*time.Minute {
		t.Errorf("Duration = %v, want 10m", cfg.Duration)
	}
	if cfg.Budget != 10.0 {
		t.Errorf("Budget = %f, want 10.0", cfg.Budget)
	}
	if cfg.Workers != 16 {
		t.Errorf("Workers = %d, want 16", cfg.Workers)
	}
	if cfg.InstanceID != 1 || cfg.InstanceOf != 1 {
		t.Errorf("Instance = %d/%d, want 1/1", cfg.InstanceID, cfg.InstanceOf)
	}
}

func TestParseRunConfig_AllFlags(t *testing.T) {
	args := []string{
		"--target", "http://localhost:3000",
		"--accounts", "/tmp/accounts.json",
		"--profile", "spike",
		"--rate", "20",
		"--duration", "30m",
		"--budget", "50.5",
		"--workers", "32",
		"--personas", "lurker,casual,pass",
		"--instance", "2/3",
		"--output", "/tmp/results.json",
		"--verbose",
		"--env", "/tmp/.env",
	}

	cfg, err := ParseRunConfig(args)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Target != "http://localhost:3000" {
		t.Errorf("Target = %q", cfg.Target)
	}
	if cfg.Accounts != "/tmp/accounts.json" {
		t.Errorf("Accounts = %q", cfg.Accounts)
	}
	if cfg.Profile != "spike" {
		t.Errorf("Profile = %q", cfg.Profile)
	}
	if cfg.Rate != 20 {
		t.Errorf("Rate = %f", cfg.Rate)
	}
	if cfg.Duration != 30*time.Minute {
		t.Errorf("Duration = %v", cfg.Duration)
	}
	if cfg.Budget != 50.5 {
		t.Errorf("Budget = %f", cfg.Budget)
	}
	if cfg.Workers != 32 {
		t.Errorf("Workers = %d", cfg.Workers)
	}
	if len(cfg.Personas) != 3 || cfg.Personas[0] != "lurker" {
		t.Errorf("Personas = %v", cfg.Personas)
	}
	if cfg.InstanceID != 2 || cfg.InstanceOf != 3 {
		t.Errorf("Instance = %d/%d", cfg.InstanceID, cfg.InstanceOf)
	}
	if cfg.Output != "/tmp/results.json" {
		t.Errorf("Output = %q", cfg.Output)
	}
	if !cfg.Verbose {
		t.Error("Verbose should be true")
	}
	if cfg.EnvPath != "/tmp/.env" {
		t.Errorf("EnvPath = %q", cfg.EnvPath)
	}
}

func TestParseRunConfig_NoFlags(t *testing.T) {
	cfg, err := ParseRunConfig(nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	def := DefaultRunConfig()
	if cfg.Target != def.Target {
		t.Errorf("Target = %q, want default %q", cfg.Target, def.Target)
	}
	if cfg.Profile != def.Profile {
		t.Errorf("Profile = %q, want default %q", cfg.Profile, def.Profile)
	}
}

func TestParseRunConfig_InvalidProfile(t *testing.T) {
	_, err := ParseRunConfig([]string{"--profile", "invalid"})
	if err == nil {
		t.Fatal("expected error for invalid profile")
	}
}

func TestParseRunConfig_InvalidRate(t *testing.T) {
	_, err := ParseRunConfig([]string{"--rate", "0"})
	if err == nil {
		t.Fatal("expected error for zero rate")
	}
	_, err = ParseRunConfig([]string{"--rate", "abc"})
	if err == nil {
		t.Fatal("expected error for non-numeric rate")
	}
}

func TestParseRunConfig_InvalidDuration(t *testing.T) {
	_, err := ParseRunConfig([]string{"--duration", "not-a-duration"})
	if err == nil {
		t.Fatal("expected error for invalid duration")
	}
}

func TestParseRunConfig_InvalidBudget(t *testing.T) {
	_, err := ParseRunConfig([]string{"--budget", "-5"})
	if err == nil {
		t.Fatal("expected error for negative budget")
	}
}

func TestParseRunConfig_InvalidWorkers(t *testing.T) {
	_, err := ParseRunConfig([]string{"--workers", "0"})
	if err == nil {
		t.Fatal("expected error for zero workers")
	}
}

func TestParseRunConfig_InvalidInstance(t *testing.T) {
	tests := []struct {
		input string
		desc  string
	}{
		{"abc", "not a fraction"},
		{"0/3", "zero ID"},
		{"4/3", "ID exceeds total"},
		{"1/0", "zero total"},
	}
	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			_, err := ParseRunConfig([]string{"--instance", tt.input})
			if err == nil {
				t.Fatalf("expected error for instance %q", tt.input)
			}
		})
	}
}

func TestParseRunConfig_UnknownFlag(t *testing.T) {
	_, err := ParseRunConfig([]string{"--unknown"})
	if err == nil {
		t.Fatal("expected error for unknown flag")
	}
}

func TestParseRunConfig_MissingValue(t *testing.T) {
	flags := []string{
		"--target", "--accounts", "--profile", "--rate",
		"--duration", "--budget", "--workers", "--personas",
		"--instance", "--output", "--env",
	}
	for _, f := range flags {
		t.Run(f, func(t *testing.T) {
			_, err := ParseRunConfig([]string{f})
			if err == nil {
				t.Fatalf("expected error for %s without value", f)
			}
		})
	}
}

func TestIsValidProfile(t *testing.T) {
	valid := []string{"trickle", "steady", "ramp", "spike", "viral"}
	for _, p := range valid {
		if !isValidProfile(p) {
			t.Errorf("isValidProfile(%q) = false, want true", p)
		}
	}
	if isValidProfile("invalid") {
		t.Error("isValidProfile(\"invalid\") = true, want false")
	}
}

func TestParseInstance(t *testing.T) {
	tests := []struct {
		input   string
		wantID  int
		wantOf  int
		wantErr bool
	}{
		{"1/1", 1, 1, false},
		{"1/3", 1, 3, false},
		{"3/3", 3, 3, false},
		{"0/3", 0, 0, true},
		{"4/3", 0, 0, true},
		{"abc", 0, 0, true},
		{"1/abc", 0, 0, true},
		{"abc/3", 0, 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			id, of, err := parseInstance(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("parseInstance(%q) error = %v, wantErr = %v", tt.input, err, tt.wantErr)
			}
			if !tt.wantErr {
				if id != tt.wantID || of != tt.wantOf {
					t.Errorf("parseInstance(%q) = %d/%d, want %d/%d", tt.input, id, of, tt.wantID, tt.wantOf)
				}
			}
		})
	}
}
