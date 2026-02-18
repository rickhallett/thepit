package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// RunConfig holds all parsed configuration for a simulation run.
type RunConfig struct {
	Target     string
	Accounts   string
	Profile    string
	Rate       float64
	Duration   time.Duration
	Budget     float64
	Workers    int
	Personas   []string
	InstanceID int
	InstanceOf int
	Output     string
	StatusFile string // live status JSON file, updated every 5s during run
	Verbose    bool
}

// DefaultRunConfig returns the default configuration.
func DefaultRunConfig() RunConfig {
	return RunConfig{
		Target:     "https://www.thepit.cloud",
		Accounts:   "./accounts.json",
		Profile:    "steady",
		Rate:       5,
		Duration:   10 * time.Minute,
		Budget:     10.0,
		Workers:    16,
		Personas:   []string{"all"},
		InstanceID: 1,
		InstanceOf: 1,
		Output:     "",
		StatusFile: "results/.live-status.json",
		Verbose:    false,
	}
}

// ParseRunConfig parses CLI flags into a RunConfig.
func ParseRunConfig(args []string) (RunConfig, error) {
	cfg := DefaultRunConfig()

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--target":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--target requires a value")
			}
			i++
			cfg.Target = args[i]
		case "--accounts":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--accounts requires a value")
			}
			i++
			cfg.Accounts = args[i]
		case "--profile":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--profile requires a value")
			}
			i++
			cfg.Profile = args[i]
			if !isValidProfile(cfg.Profile) {
				return cfg, fmt.Errorf("invalid profile %q: must be trickle|steady|ramp|spike|viral", cfg.Profile)
			}
		case "--rate":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--rate requires a value")
			}
			i++
			v, err := strconv.ParseFloat(args[i], 64)
			if err != nil || v <= 0 {
				return cfg, fmt.Errorf("--rate must be a positive number, got %q", args[i])
			}
			cfg.Rate = v
		case "--duration":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--duration requires a value")
			}
			i++
			d, err := time.ParseDuration(args[i])
			if err != nil {
				return cfg, fmt.Errorf("--duration: %w", err)
			}
			if d <= 0 {
				return cfg, fmt.Errorf("--duration must be positive")
			}
			cfg.Duration = d
		case "--budget":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--budget requires a value")
			}
			i++
			v, err := strconv.ParseFloat(args[i], 64)
			if err != nil || v <= 0 {
				return cfg, fmt.Errorf("--budget must be a positive number, got %q", args[i])
			}
			cfg.Budget = v
		case "--workers":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--workers requires a value")
			}
			i++
			v, err := strconv.Atoi(args[i])
			if err != nil || v < 1 {
				return cfg, fmt.Errorf("--workers must be a positive integer, got %q", args[i])
			}
			cfg.Workers = v
		case "--personas":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--personas requires a value")
			}
			i++
			cfg.Personas = strings.Split(args[i], ",")
			for j := range cfg.Personas {
				cfg.Personas[j] = strings.TrimSpace(cfg.Personas[j])
			}
		case "--instance":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--instance requires a value")
			}
			i++
			id, of, err := parseInstance(args[i])
			if err != nil {
				return cfg, fmt.Errorf("--instance: %w", err)
			}
			cfg.InstanceID = id
			cfg.InstanceOf = of
		case "--output":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--output requires a value")
			}
			i++
			cfg.Output = args[i]
		case "--status":
			if i+1 >= len(args) {
				return cfg, fmt.Errorf("--status requires a value")
			}
			i++
			cfg.StatusFile = args[i]
		case "--no-status":
			cfg.StatusFile = ""
		case "--verbose":
			cfg.Verbose = true
		case "--env":
			// --env is now a global flag parsed before the subcommand.
			// e.g. pitstorm --env /path run (not: pitstorm run --env /path)
			return cfg, fmt.Errorf("--env is a global flag; place it before the subcommand: pitstorm --env <path> run")
		default:
			return cfg, fmt.Errorf("unknown flag %q", args[i])
		}
	}

	return cfg, nil
}

func isValidProfile(p string) bool {
	switch p {
	case "trickle", "steady", "ramp", "spike", "viral":
		return true
	}
	return false
}

func parseInstance(s string) (id, of int, err error) {
	parts := strings.SplitN(s, "/", 2)
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("expected format N/M, got %q", s)
	}
	id, err = strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, fmt.Errorf("instance ID: %w", err)
	}
	of, err = strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, fmt.Errorf("instance total: %w", err)
	}
	if id < 1 || of < 1 || id > of {
		return 0, 0, fmt.Errorf("must satisfy 1 <= ID <= total, got %d/%d", id, of)
	}
	return id, of, nil
}
