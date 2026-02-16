package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rickhallett/thepit/pitstorm/internal/account"
	"github.com/rickhallett/thepit/pitstorm/internal/action"
	"github.com/rickhallett/thepit/pitstorm/internal/budget"
	"github.com/rickhallett/thepit/pitstorm/internal/client"
	"github.com/rickhallett/thepit/pitstorm/internal/engine"
	"github.com/rickhallett/thepit/pitstorm/internal/metrics"
	"github.com/rickhallett/thepit/pitstorm/internal/persona"
	"github.com/rickhallett/thepit/pitstorm/internal/profile"
	"github.com/rickhallett/thepit/shared/theme"
)

func runCmd(args []string) {
	cfg, err := ParseRunConfig(args)
	if err != nil {
		fatal("config", err)
	}

	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — run"))

	logf := func(format string, a ...any) {
		if cfg.Verbose {
			fmt.Printf("  "+format+"\n", a...)
		}
	}

	// 1. Resolve personas.
	personas, err := persona.Resolve(cfg.Personas)
	if err != nil {
		fatal("personas", err)
	}

	// 2. Resolve traffic profile → RateFunc.
	profileRateFunc, err := profile.Get(cfg.Profile, cfg.Rate)
	if err != nil {
		fatal("profile", err)
	}

	// 3. Create HTTP client.
	clientCfg := client.DefaultConfig(cfg.Target)
	clientCfg.Verbose = cfg.Verbose
	cl := client.New(clientCfg, logf)
	defer cl.Close()

	// 4. Load and inject account tokens (if accounts file exists).
	if _, statErr := os.Stat(cfg.Accounts); statErr == nil {
		acctFile, loadErr := account.Load(cfg.Accounts)
		if loadErr != nil {
			fmt.Printf("  %s failed to load accounts: %v (continuing without auth)\n",
				theme.Warning.Render("warning:"), loadErr)
		} else {
			injected, skipped := account.InjectTokens(acctFile, cl.SetToken)
			fmt.Printf("  Tokens:     %d injected, %d skipped\n", injected, len(skipped))
			if len(skipped) > 0 && cfg.Verbose {
				logf("skipped accounts: %v", skipped)
			}
		}
	} else {
		fmt.Printf("  %s no accounts file at %s (running without auth)\n",
			theme.Warning.Render("note:"), cfg.Accounts)
	}

	// 5. Create action layer.
	act := action.New(cl)

	// 6. Create metrics collector.
	m := metrics.NewCollector()

	// 7. Create budget gate.
	gate := budget.NewGate(cfg.Budget)

	// Display configuration.
	fmt.Printf("  Target:     %s\n", cfg.Target)
	fmt.Printf("  Profile:    %s\n", cfg.Profile)
	fmt.Printf("  Rate:       %.1f req/s (peak)\n", cfg.Rate)
	fmt.Printf("  Duration:   %s\n", cfg.Duration)
	fmt.Printf("  Budget:     £%.2f\n", cfg.Budget)
	fmt.Printf("  Workers:    %d\n", cfg.Workers)
	fmt.Printf("  Personas:   %d active\n", len(personas))
	fmt.Printf("  Instance:   %d/%d\n", cfg.InstanceID, cfg.InstanceOf)
	fmt.Println()

	// 8. Create and run engine.
	eng := engine.New(engine.Config{
		Workers:  cfg.Workers,
		Duration: cfg.Duration,
		RateFunc: profileRateFunc,
		Verbose:  cfg.Verbose,
	}, cl, act, m, gate, personas, logf)

	// Handle graceful shutdown on SIGINT/SIGTERM.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		fmt.Printf("\n  %s received %v, shutting down gracefully...\n",
			theme.Warning.Render("signal:"), sig)
		cancel()
	}()

	fmt.Printf("  %s simulation started\n\n", theme.Success.Render("GO:"))

	start := time.Now()
	if err := eng.Run(ctx); err != nil {
		fmt.Printf("\n  %s %v\n", theme.Error.Render("engine error:"), err)
	}
	elapsed := time.Since(start)

	// 9. Print final report.
	snap := m.Snapshot()
	budgetSummary := gate.Summary()

	fmt.Printf("\n%s\n", theme.Title.Render("pitstorm — results"))
	fmt.Printf("\n  Run completed in %s\n", elapsed.Truncate(time.Millisecond))
	fmt.Printf("%s\n", metrics.FormatSummary(snap))
	fmt.Printf("%s\n", budget.FormatSummary(budgetSummary))

	// 10. Write JSON output if requested.
	if cfg.Output != "" {
		jsonData, jsonErr := snap.JSON()
		if jsonErr != nil {
			fmt.Printf("  %s failed to marshal JSON: %v\n\n",
				theme.Error.Render("error:"), jsonErr)
		} else {
			if writeErr := os.WriteFile(cfg.Output, jsonData, 0644); writeErr != nil {
				fmt.Printf("  %s failed to write output: %v\n\n",
					theme.Error.Render("error:"), writeErr)
			} else {
				fmt.Printf("\n  JSON output written to %s\n", cfg.Output)
			}
		}
	}

	fmt.Println()
}

func planCmd(args []string) {
	cfg, err := ParseRunConfig(args)
	if err != nil {
		fatal("config", err)
	}

	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — plan (dry run)"))

	// Resolve personas.
	personas, err := persona.Resolve(cfg.Personas)
	if err != nil {
		fatal("personas", err)
	}

	// Resolve profile description.
	profileDesc := profile.Describe(cfg.Profile)

	// Display configuration.
	fmt.Printf("  Target:     %s\n", cfg.Target)
	fmt.Printf("  Profile:    %s\n", cfg.Profile)
	fmt.Printf("  Rate:       %.1f req/s (peak)\n", cfg.Rate)
	fmt.Printf("  Duration:   %s\n", cfg.Duration)
	fmt.Printf("  Budget:     £%.2f\n", cfg.Budget)
	fmt.Printf("  Workers:    %d\n", cfg.Workers)
	fmt.Printf("  Personas:   %d active\n", len(personas))
	fmt.Printf("  Instance:   %d/%d\n\n", cfg.InstanceID, cfg.InstanceOf)

	if profileDesc != "" {
		fmt.Printf("  Profile:    %s\n\n", profileDesc)
	}

	// Show persona breakdown.
	fmt.Printf("  %s\n\n", theme.Bold.Render("Persona Mix"))
	fmt.Printf("  %-25s %-8s %-12s %-8s %-8s\n", "PERSONA", "TIER", "MODEL", "TURNS", "BOUT %")
	fmt.Printf("  %-25s %-8s %-12s %-8s %-8s\n", strings25("─"), strings8("─"), strings12("─"), strings8("─"), strings8("─"))

	for _, p := range personas {
		model := p.Model
		if model == "" {
			model = "(default)"
		} else {
			model = shortenModel(model)
		}
		boutPct := boutActionPercent(p)
		fmt.Printf("  %-25s %-8s %-12s %-8d %.0f%%\n",
			p.ID, string(p.Tier), model, p.MaxTurns, boutPct)
	}

	// Cost estimation.
	fmt.Printf("\n  %s\n\n", theme.Bold.Render("Cost Estimation"))

	durationMin := cfg.Duration.Minutes()
	avgRateFraction := profileAvgFraction(cfg.Profile, cfg.Rate)
	effectiveAvgRate := cfg.Rate * avgRateFraction

	totalRequests := effectiveAvgRate * durationMin * 60
	totalRequests /= float64(cfg.InstanceOf)

	type modelCost struct {
		model string
		bouts float64
		cost  float64
	}
	costs := make(map[string]*modelCost)
	var totalCost float64

	requestsPerPersona := totalRequests / float64(len(personas))

	for _, p := range personas {
		boutFrac := boutActionPercent(p) / 100.0
		estBouts := requestsPerPersona * boutFrac

		model := p.Model
		if model == "" {
			model = "claude-sonnet-4-5-20250929"
		}

		costPerBout := budget.EstimateBoutCost(model, p.MaxTurns, budget.DefaultOutputPerTurn)
		cost := estBouts * costPerBout

		mc, ok := costs[model]
		if !ok {
			mc = &modelCost{model: model}
			costs[model] = mc
		}
		mc.bouts += estBouts
		mc.cost += cost
		totalCost += cost
	}

	fmt.Printf("  Avg effective rate:  %.1f req/s (%.0f%% of peak for %q profile)\n",
		effectiveAvgRate, avgRateFraction*100, cfg.Profile)
	fmt.Printf("  Total requests:      ~%.0f\n", totalRequests)
	fmt.Printf("  Instance partition:  %d of %d\n\n", cfg.InstanceID, cfg.InstanceOf)

	fmt.Printf("  %-35s %8s %10s\n", "MODEL", "BOUTS", "EST. COST")
	fmt.Printf("  %-35s %8s %10s\n", strings35("─"), strings8("─"), strings10("─"))
	for _, mc := range costs {
		fmt.Printf("  %-35s %8.0f £%9.4f\n", shortenModel(mc.model), mc.bouts, mc.cost)
	}
	fmt.Printf("  %-35s %8s %10s\n", "", "", strings10("─"))
	fmt.Printf("  %-35s %8s £%9.4f\n\n", "TOTAL", "", totalCost)

	// Budget check.
	if totalCost > cfg.Budget {
		fmt.Printf("  %s Estimated cost £%.4f exceeds budget £%.2f\n",
			theme.Error.Render("WARNING:"), totalCost, cfg.Budget)
		fmt.Printf("  The run will stop early when budget is exhausted.\n\n")
	} else {
		pct := 0.0
		if cfg.Budget > 0 {
			pct = (totalCost / cfg.Budget) * 100
		}
		fmt.Printf("  %s Estimated cost is %.1f%% of budget (£%.4f of £%.2f)\n\n",
			theme.Success.Render("OK:"), pct, totalCost, cfg.Budget)
	}
}

// boutActionPercent returns the percentage of a persona's actions that are bouts.
func boutActionPercent(p *persona.Spec) float64 {
	var totalWeight, boutWeight float64
	for _, wa := range p.Actions {
		totalWeight += wa.Weight
		if wa.Action == persona.ActionRunBout || wa.Action == persona.ActionAPIBout {
			boutWeight += wa.Weight
		}
	}
	if totalWeight == 0 {
		return 0
	}
	return (boutWeight / totalWeight) * 100
}

// shortenModel returns a human-friendly model name.
func shortenModel(model string) string {
	switch model {
	case "claude-haiku-4-5-20251001":
		return "haiku-4.5"
	case "claude-sonnet-4-5-20250929":
		return "sonnet-4.5"
	case "claude-opus-4-5-20251101":
		return "opus-4.5"
	case "claude-opus-4-6":
		return "opus-4.6"
	default:
		return model
	}
}

// profileAvgFraction returns the average rate as a fraction of peak for each profile.
// These are analytically derived from the rate curve integrals. The peakRate
// parameter is needed for trickle, which is capped at 1-2 req/s regardless of peak.
func profileAvgFraction(name string, peakRate float64) float64 {
	switch name {
	case "trickle":
		// Trickle oscillates between min(peak,1) and min(peak,2).
		// Average = (min(peak,1) + min(peak,2)) / 2.
		if peakRate <= 0 {
			return 0.30
		}
		lo := math.Min(peakRate, 1.0)
		hi := math.Min(peakRate, 2.0)
		return ((lo + hi) / 2) / peakRate
	case "steady":
		return 1.00 // constant at peak
	case "ramp":
		return 0.61 // integral of ramp: 60%×0.5 + 20%×1.0 + 20%×0.55 = 0.30+0.20+0.11
	case "spike":
		return 0.19 // 90% at 10% baseline + 10% at peak
	case "viral":
		return 0.22 // integral of exponential curve 0.01→1.0
	default:
		return 0.50
	}
}

// Repeating character helpers for table formatting.
func stringsN(ch string, n int) string {
	s := ""
	for i := 0; i < n; i++ {
		s += ch
	}
	return s
}

func strings8(ch string) string  { return stringsN(ch, 8) }
func strings10(ch string) string { return stringsN(ch, 10) }
func strings12(ch string) string { return stringsN(ch, 12) }
func strings25(ch string) string { return stringsN(ch, 25) }
func strings35(ch string) string { return stringsN(ch, 35) }

func setupCmd(args []string) {
	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — setup"))

	// Parse setup-specific flags.
	target := "https://www.thepit.cloud"
	outputPath := "./accounts.json"
	force := false

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--target":
			if i+1 >= len(args) {
				fatalf("setup", "--target requires a value")
			}
			i++
			target = args[i]
		case "--output":
			if i+1 >= len(args) {
				fatalf("setup", "--output requires a value")
			}
			i++
			outputPath = args[i]
		case "--force":
			force = true
		default:
			fatalf("setup", "unknown flag %q", args[i])
		}
	}

	// Check if file already exists.
	if !force {
		if _, err := os.Stat(outputPath); err == nil {
			fatalf("setup", "accounts file %q already exists (use --force to overwrite)", outputPath)
		}
	}

	// Generate default accounts.
	f := account.DefaultAccounts(target)
	if err := f.Validate(); err != nil {
		fatal("setup", err)
	}

	if err := account.Save(outputPath, f); err != nil {
		fatal("setup", err)
	}

	fmt.Printf("  Generated %d accounts for %s\n", len(f.Accounts), target)
	fmt.Printf("  Written to %s\n\n", outputPath)
	fmt.Printf("%s\n\n", account.Summary(f))
	fmt.Printf("  %s Accounts have no session tokens yet.\n", theme.Warning.Render("note:"))
	fmt.Printf("  Run %s to obtain tokens from Clerk.\n\n",
		theme.Accent.Render("pitstorm verify --accounts "+outputPath))
}

func verifyCmd(args []string) {
	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — verify"))

	// Parse verify-specific flags.
	accountsPath := "./accounts.json"

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--accounts":
			if i+1 >= len(args) {
				fatalf("verify", "--accounts requires a value")
			}
			i++
			accountsPath = args[i]
		default:
			fatalf("verify", "unknown flag %q", args[i])
		}
	}

	// Load accounts file.
	f, err := account.Load(accountsPath)
	if err != nil {
		fatal("verify", err)
	}

	if err := f.Validate(); err != nil {
		fatal("verify", err)
	}

	fmt.Printf("%s\n", account.Summary(f))
	fmt.Printf("  Verifying against %s ...\n\n", f.Target)

	// Run verification.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	v := account.NewVerifier(f.Target, func(format string, args ...any) {
		fmt.Printf(format+"\n", args...)
	})
	results := v.VerifyAll(ctx, f)

	fmt.Printf("\n%s\n", account.FormatVerifyResults(results))

	// Update last_verified for accounts that passed.
	now := time.Now().UTC()
	updated := false
	for i := range results {
		if results[i].OK && results[i].AccountID != "_health" {
			acct, lookupErr := f.ByID(results[i].AccountID)
			if lookupErr == nil {
				acct.LastVerified = now
				updated = true
			}
		}
	}

	if updated {
		if saveErr := account.Save(accountsPath, f); saveErr != nil {
			fmt.Printf("  %s failed to update accounts file: %v\n\n",
				theme.Warning.Render("warning:"), saveErr)
		}
	}

	// Exit with error if any failed.
	for _, r := range results {
		if !r.OK {
			os.Exit(1)
		}
	}
}

func reportCmd(args []string) {
	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — report"))

	if len(args) == 0 {
		fatalf("report", "usage: pitstorm report <file.json>")
	}

	filePath := args[0]

	data, err := os.ReadFile(filePath)
	if err != nil {
		fatal("report", fmt.Errorf("read %s: %w", filePath, err))
	}

	var snap metrics.Snapshot
	if err := json.Unmarshal(data, &snap); err != nil {
		fatal("report", fmt.Errorf("parse JSON: %w", err))
	}

	fmt.Printf("  Source: %s\n", filePath)
	fmt.Printf("%s\n", metrics.FormatSummary(snap))
}
