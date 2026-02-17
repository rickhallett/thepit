package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/rickhallett/thepit/pitstorm/internal/account"
	"github.com/rickhallett/thepit/pitstorm/internal/action"
	"github.com/rickhallett/thepit/pitstorm/internal/auth"
	"github.com/rickhallett/thepit/pitstorm/internal/budget"
	"github.com/rickhallett/thepit/pitstorm/internal/client"
	"github.com/rickhallett/thepit/pitstorm/internal/engine"
	"github.com/rickhallett/thepit/pitstorm/internal/metrics"
	"github.com/rickhallett/thepit/pitstorm/internal/persona"
	"github.com/rickhallett/thepit/pitstorm/internal/profile"
	"github.com/rickhallett/thepit/shared/config"
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
	var acctFile *account.File
	if _, statErr := os.Stat(cfg.Accounts); statErr == nil {
		var loadErr error
		acctFile, loadErr = account.Load(cfg.Accounts)
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

	// 4b. Start token refresher if we have accounts with session IDs.
	var refresher *auth.Refresher
	if acctFile != nil {
		refresher = startTokenRefresher(acctFile, cfg.EnvPath, cl, logf)
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
	if cfg.StatusFile != "" {
		fmt.Printf("  Status:     %s (live, updated every 5s)\n", cfg.StatusFile)
	}

	eng := engine.New(engine.Config{
		Workers:    cfg.Workers,
		Duration:   cfg.Duration,
		RateFunc:   profileRateFunc,
		Verbose:    cfg.Verbose,
		StatusFile: cfg.StatusFile,
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

	// Stop token refresher.
	if refresher != nil {
		refresher.Stop()
	}

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
	fmt.Printf("  Run %s to sign in and obtain tokens from Clerk.\n\n",
		theme.Accent.Render("pitstorm login --accounts "+outputPath))
}

func loginCmd(args []string) {
	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — login"))

	// Parse login-specific flags.
	accountsPath := "./accounts.json"
	publishableKey := ""
	secretKey := ""
	envPath := ""

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--accounts":
			if i+1 >= len(args) {
				fatalf("login", "--accounts requires a value")
			}
			i++
			accountsPath = args[i]
		case "--key":
			if i+1 >= len(args) {
				fatalf("login", "--key requires a value")
			}
			i++
			publishableKey = args[i]
		case "--secret":
			if i+1 >= len(args) {
				fatalf("login", "--secret requires a value")
			}
			i++
			secretKey = args[i]
		case "--env":
			if i+1 >= len(args) {
				fatalf("login", "--env requires a value")
			}
			i++
			envPath = args[i]
		default:
			fatalf("login", "unknown flag %q", args[i])
		}
	}

	// Load accounts file.
	f, err := account.Load(accountsPath)
	if err != nil {
		fatal("login", err)
	}
	if err := f.Validate(); err != nil {
		fatal("login", err)
	}

	// Load config for key resolution.
	var cfg *config.Config
	cfg, _ = config.Load(envPath)

	// Resolve publishable key from flag, env, or config file.
	if publishableKey == "" {
		publishableKey = os.Getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
	}
	if publishableKey == "" && cfg != nil {
		publishableKey = cfg.Get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
	}
	if publishableKey == "" {
		fatalf("login", "Clerk publishable key not found. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or use --key")
	}

	// Resolve secret key from flag, env, or config file.
	if secretKey == "" {
		secretKey = os.Getenv("CLERK_SECRET_KEY")
	}
	if secretKey == "" && cfg != nil {
		secretKey = cfg.Get("CLERK_SECRET_KEY")
	}

	// Create FAPI client.
	fapiClient, err := auth.NewClient(publishableKey)
	if err != nil {
		fatal("login", err)
	}

	// Create Backend client if secret key is available.
	var backendClient *auth.BackendClient
	if secretKey != "" {
		backendClient = auth.NewBackendClient(secretKey)
	}

	fapiURL, _ := auth.DecodeFAPIURL(publishableKey)
	mode := "email+password"
	if backendClient != nil {
		mode = "ticket (via Backend API sign-in tokens)"
	}
	fmt.Printf("  Accounts:   %s\n", accountsPath)
	fmt.Printf("  FAPI:       %s\n", fapiURL)
	fmt.Printf("  Mode:       %s\n", mode)
	fmt.Printf("  Accounts:   %d total (%d authenticated)\n\n",
		len(f.Accounts), countAuthenticated(f))

	// Sign in each non-anon account.
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	passed := 0
	failed := 0

	for i := range f.Accounts {
		acct := &f.Accounts[i]

		// Skip anon accounts — they don't authenticate.
		if acct.Tier == account.TierAnon {
			fmt.Printf("  %-30s %s (anon)\n", acct.ID, theme.Muted.Render("SKIP"))
			continue
		}

		var result *auth.SignInResult
		var signInErr error

		if backendClient != nil {
			// Ticket flow: create sign-in token via Backend API, then redeem via FAPI.
			// This bypasses phone verification / 2FA requirements.
			userID := acct.ClerkUserID
			if userID == "" {
				// Auto-resolve user ID from email via Backend API.
				resolved, lookupErr := backendClient.LookupUserByEmail(ctx, acct.Email)
				if lookupErr != nil {
					fmt.Printf("  %-30s %s lookup user: %v\n",
						acct.ID, theme.Error.Render("FAIL"), lookupErr)
					failed++
					continue
				}
				userID = resolved
				acct.ClerkUserID = resolved
			}

			tokenResp, tokenErr := backendClient.CreateSignInToken(ctx, userID)
			if tokenErr != nil {
				fmt.Printf("  %-30s %s create ticket: %v\n",
					acct.ID, theme.Error.Render("FAIL"), tokenErr)
				failed++
				continue
			}

			// Add delay between ticket redemptions to avoid Clerk rate limiting.
			// The FAPI has aggressive per-IP rate limits (~10 req/min for sign-ins).
			if i > 0 {
				time.Sleep(3 * time.Second)
			}

			result, signInErr = fapiClient.SignInWithTicket(ctx, tokenResp.Token, userID)
			// Retry once on rate limit with longer backoff.
			if signInErr != nil && strings.Contains(signInErr.Error(), "429") {
				fmt.Printf("  %-30s %s (rate limited, retrying in 15s...)\n",
					acct.ID, theme.Warning.Render("WAIT"))
				time.Sleep(15 * time.Second)
				// Need a fresh ticket — the old one may have been consumed.
				tokenResp, tokenErr = backendClient.CreateSignInToken(ctx, userID)
				if tokenErr == nil {
					result, signInErr = fapiClient.SignInWithTicket(ctx, tokenResp.Token, userID)
				}
			}
		} else {
			// Direct email+password flow via FAPI.
			result, signInErr = fapiClient.SignIn(ctx, acct.Email, acct.Password)
		}

		if signInErr != nil {
			fmt.Printf("  %-30s %s %v\n", acct.ID, theme.Error.Render("FAIL"), signInErr)
			failed++
			continue
		}

		// Update account with session data.
		acct.SessionToken = result.Token
		acct.TokenExpiresAt = result.ExpiresAt
		acct.ClerkSessionID = result.SessionID
		if result.UserID != "" {
			acct.ClerkUserID = result.UserID
		}
		acct.CreatedAt = time.Now().UTC()

		fmt.Printf("  %-30s %s user=%s expires=%s\n",
			acct.ID, theme.Success.Render("OK"),
			truncateID(result.UserID), result.ExpiresAt.Format(time.RFC3339))
		passed++
	}

	fmt.Printf("\n  Results: %d passed, %d failed, %d skipped\n\n",
		passed, failed, len(f.Accounts)-passed-failed)

	// Save updated accounts file.
	if passed > 0 {
		if saveErr := account.Save(accountsPath, f); saveErr != nil {
			fmt.Printf("  %s failed to save accounts: %v\n\n",
				theme.Error.Render("error:"), saveErr)
		} else {
			fmt.Printf("  %s tokens written to %s\n\n",
				theme.Success.Render("saved:"), accountsPath)
		}
	}

	if failed > 0 {
		fmt.Printf("  %s %d accounts failed to authenticate.\n", theme.Warning.Render("warning:"), failed)
		fmt.Printf("  Ensure accounts exist in Clerk with the correct email/password.\n\n")
		os.Exit(1)
	}
}

// countAuthenticated returns the number of non-anon accounts.
func countAuthenticated(f *account.File) int {
	n := 0
	for _, a := range f.Accounts {
		if a.Tier != account.TierAnon {
			n++
		}
	}
	return n
}

// truncateID shortens a Clerk user ID for display.
func truncateID(id string) string {
	if len(id) <= 16 {
		return id
	}
	return id[:16] + "..."
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

// startTokenRefresher creates and starts a background Refresher that keeps
// Clerk JWTs alive during the simulation. Returns nil if refresh is not
// possible (no publishable key, no session IDs).
func startTokenRefresher(
	acctFile *account.File,
	envPath string,
	cl *client.Client,
	logf func(string, ...any),
) *auth.Refresher {
	// Build refresh targets from accounts that have a Clerk session ID.
	var targets []auth.RefreshTarget
	for _, acct := range acctFile.Accounts {
		if acct.Tier == account.TierAnon || acct.ClerkSessionID == "" {
			continue
		}
		targets = append(targets, auth.RefreshTarget{
			AccountID: acct.ID,
			SessionID: acct.ClerkSessionID,
		})
	}
	if len(targets) == 0 {
		logf("[refresh] no accounts with session IDs — skipping token refresh")
		return nil
	}

	// Resolve the Clerk publishable key so we can construct an auth.Client.
	publishableKey := os.Getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
	if publishableKey == "" {
		cfg, _ := config.Load(envPath)
		if cfg != nil {
			publishableKey = cfg.Get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
		}
	}
	if publishableKey == "" {
		logf("[refresh] no publishable key — skipping token refresh")
		return nil
	}

	fapiClient, err := auth.NewClient(publishableKey)
	if err != nil {
		logf("[refresh] failed to create FAPI client: %v", err)
		return nil
	}

	// Refresh every 45 seconds (Clerk JWTs expire at ~60s).
	refresher := auth.NewRefresher(fapiClient, 45*time.Second)

	refresher.Start(context.Background(), targets, func(accountID, token string, expiresAt time.Time) {
		cl.SetToken(accountID, token)
		logf("[refresh] %s token refreshed, expires=%s", accountID, expiresAt.Format(time.RFC3339))
	})

	fmt.Printf("  Refresh:    %d accounts, every 45s\n", len(targets))
	return refresher
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
