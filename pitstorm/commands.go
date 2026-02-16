package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/rickhallett/thepit/pitstorm/internal/account"
	"github.com/rickhallett/thepit/shared/theme"
)

func runCmd(args []string) {
	cfg, err := ParseRunConfig(args)
	if err != nil {
		fatal("config", err)
	}

	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — run"))
	fmt.Printf("  Target:     %s\n", cfg.Target)
	fmt.Printf("  Profile:    %s\n", cfg.Profile)
	fmt.Printf("  Rate:       %.1f req/s\n", cfg.Rate)
	fmt.Printf("  Duration:   %s\n", cfg.Duration)
	fmt.Printf("  Budget:     £%.2f\n", cfg.Budget)
	fmt.Printf("  Workers:    %d\n", cfg.Workers)
	fmt.Printf("  Personas:   %v\n", cfg.Personas)
	fmt.Printf("  Instance:   %d/%d\n", cfg.InstanceID, cfg.InstanceOf)
	fmt.Println()

	// Engine wiring happens in Phase 7+.
	fmt.Printf("  %s engine not yet wired — coming in later phases\n\n",
		theme.Warning.Render("note:"))
}

func planCmd(args []string) {
	cfg, err := ParseRunConfig(args)
	if err != nil {
		fatal("config", err)
	}

	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — plan (dry run)"))
	fmt.Printf("  Target:   %s\n", cfg.Target)
	fmt.Printf("  Profile:  %s\n", cfg.Profile)
	fmt.Printf("  Duration: %s\n", cfg.Duration)
	fmt.Printf("  Budget:   £%.2f\n\n", cfg.Budget)
	fmt.Printf("  %s plan command not yet implemented — coming in Phase 10\n\n",
		theme.Warning.Render("note:"))
}

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
	_ = args
	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — report"))
	fmt.Printf("  %s report command not yet implemented — coming in Phase 10\n\n",
		theme.Warning.Render("note:"))
}
