package main

import (
	"fmt"

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
	_ = args
	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — setup"))
	fmt.Printf("  %s setup command not yet implemented — coming in Phase 9\n\n",
		theme.Warning.Render("note:"))
}

func verifyCmd(args []string) {
	_ = args
	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — verify"))
	fmt.Printf("  %s verify command not yet implemented — coming in Phase 9\n\n",
		theme.Warning.Render("note:"))
}

func reportCmd(args []string) {
	_ = args
	fmt.Printf("\n%s\n\n", theme.Title.Render("pitstorm — report"))
	fmt.Printf("  %s report command not yet implemented — coming in Phase 10\n\n",
		theme.Warning.Render("note:"))
}
