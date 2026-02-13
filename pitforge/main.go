package main

import (
	"crypto/ed25519"
	"encoding/hex"
	"flag"
	"fmt"
	"os"

	"github.com/rickhallett/thepit/pitforge/cmd"
	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/license"
	"github.com/rickhallett/thepit/shared/theme"
)

var version = "dev"

// publicKeyHex is the embedded public key for license verification.
// Override at build time: go build -ldflags "-X main.publicKeyHex=<hex>"
var publicKeyHex = ""

func main() {
	envPath := flag.String("env", "", "path to .env file")
	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) == 0 {
		usage()
		os.Exit(0)
	}

	// Commands that don't require config.
	switch args[0] {
	case "version":
		fmt.Printf("pitforge %s\n", version)
		return
	case "init":
		cmd.RunInit(args[1:])
		return
	case "validate":
		cmd.RunValidate(args[1:])
		return
	case "lint":
		cmd.RunLint(args[1:])
		return
	case "hash":
		cmd.RunHash(args[1:])
		return
	case "diff":
		cmd.RunDiff(args[1:])
		return
	case "catalog":
		cmd.RunCatalog(args[1:])
		return
	}

	// Validate command before loading config so unknown commands
	// don't produce misleading config errors.
	premium := map[string]bool{
		"spar":    true,
		"evolve":  true,
		"lineage": true,
	}
	if !premium[args[0]] {
		fmt.Fprintf(os.Stderr, "%s unknown command %q\n", theme.Error.Render("error:"), args[0])
		usage()
		os.Exit(1)
	}

	// Commands that require config (DB access, API keys, etc.)
	cfg, err := config.Load(*envPath)
	if err != nil {
		fatal("config", err)
	}

	// Enforce lab-tier license for premium commands.
	requireLicense()

	switch args[0] {
	case "spar":
		cmd.RunSpar(args[1:], cfg)
	case "evolve":
		cmd.RunEvolve(args[1:], cfg)
	case "lineage":
		cmd.RunLineage(args[1:], cfg)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render("pitforge — agent development toolkit for THE PIT"))
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  pitforge [flags] <command> [args...]\n\n")
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  init <name>                    Scaffold new agent definition\n")
	fmt.Fprintf(os.Stderr, "  validate <file>                Schema validation\n")
	fmt.Fprintf(os.Stderr, "  lint <file>                    Heuristic prompt quality checks\n")
	fmt.Fprintf(os.Stderr, "  hash <file>                    Compute promptHash + manifestHash\n")
	fmt.Fprintf(os.Stderr, "  diff <file1> <file2>           Semantic diff between agents\n")
	fmt.Fprintf(os.Stderr, "  spar <file1> <file2>           Run a local bout\n")
	fmt.Fprintf(os.Stderr, "  catalog                        Browse presets\n")
	fmt.Fprintf(os.Stderr, "  lineage <agentId>              Visualize agent lineage\n")
	fmt.Fprintf(os.Stderr, "  evolve <file>                  Generate prompt variants\n")
	fmt.Fprintf(os.Stderr, "  version                        Show version\n\n")
	fmt.Fprintf(os.Stderr, "Flags:\n")
	fmt.Fprintf(os.Stderr, "  --env <path>  Path to .env file (default: auto-detect)\n\n")
}

func must(ctx string, err error) {
	if err != nil {
		fatal(ctx, err)
	}
}

func fatal(ctx string, err error) {
	fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render(ctx+":"), err)
	os.Exit(1)
}

func fatalf(ctx, format string, args ...interface{}) {
	fatal(ctx, fmt.Errorf(format, args...))
}

// requireLicense enforces lab-tier license verification.
// If no public key is embedded (dev builds), the check is skipped.
func requireLicense() {
	if publicKeyHex == "" {
		return // dev build, no license check
	}

	pubBytes, err := hex.DecodeString(publicKeyHex)
	if err != nil || len(pubBytes) != ed25519.PublicKeySize {
		fatal("license", fmt.Errorf("invalid embedded public key"))
	}

	_, err = license.RequireLabTier(ed25519.PublicKey(pubBytes))
	if err != nil {
		fatal("license", err)
	}
}
