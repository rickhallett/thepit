package main

import (
	"crypto/ed25519"
	"encoding/hex"
	"flag"
	"fmt"
	"os"

	"github.com/rickhallett/thepit/pitlab/cmd"
	"github.com/rickhallett/thepit/pitlab/internal/dataset"
	"github.com/rickhallett/thepit/shared/license"
	"github.com/rickhallett/thepit/shared/theme"
)

var version = "dev"

// publicKeyHex is the embedded public key for license verification.
// Override at build time: go build -ldflags "-X main.publicKeyHex=<hex>"
var publicKeyHex = ""

func main() {
	dataFile := flag.String("data", "", "path to research export JSON file (required)")
	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) == 0 {
		usage()
		os.Exit(0)
	}

	switch args[0] {
	case "version":
		fmt.Printf("pitlab %s\n", version)
		return
	case "codebook":
		// Codebook can work with an empty dataset for documentation.
		if *dataFile == "" {
			ds := &dataset.Dataset{Export: &dataset.Export{}}
			cmd.RunCodebook(ds)
			return
		}
	}

	// All other commands require data.
	if *dataFile == "" {
		fmt.Fprintf(os.Stderr, "\n  %s --data flag is required\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "  Download from: thepit.cloud/research or GET /api/research/export?id=N\n\n")
		os.Exit(1)
	}

	// Enforce lab-tier license.
	requireLicense()

	ds, err := dataset.LoadFromFile(*dataFile)
	if err != nil {
		fatal("data", err)
	}

	fmt.Printf("  %s Loaded %d bouts, %d agents, %d votes, %d reactions\n",
		theme.Success.Render("✓"),
		len(ds.Export.Bouts), len(ds.Export.Agents),
		len(ds.Export.Votes), len(ds.Export.Reactions))

	switch args[0] {
	case "summary":
		cmd.RunSummary(ds)
	case "survival":
		cmd.RunSurvival(ds, args[1:])
	case "position":
		cmd.RunPosition(ds)
	case "engagement":
		cmd.RunEngagement(ds)
	case "codebook":
		cmd.RunCodebook(ds)
	default:
		fmt.Fprintf(os.Stderr, "%s unknown command %q\n", theme.Error.Render("error:"), args[0])
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render("pitlab — research analysis toolkit for The Pit"))
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  pitlab --data <export.json> <command> [args...]\n\n")
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  summary                        Dataset overview statistics\n")
	fmt.Fprintf(os.Stderr, "  survival [--min-bouts N]        Persona survival analysis (win rates)\n")
	fmt.Fprintf(os.Stderr, "  position                        Position bias (first-mover advantage)\n")
	fmt.Fprintf(os.Stderr, "  engagement                      Engagement curves (reactions per turn)\n")
	fmt.Fprintf(os.Stderr, "  codebook                        Generate research codebook\n")
	fmt.Fprintf(os.Stderr, "  version                         Show version\n\n")
	fmt.Fprintf(os.Stderr, "Flags:\n")
	fmt.Fprintf(os.Stderr, "  --data <path>  Path to research export JSON file\n\n")
	fmt.Fprintf(os.Stderr, "Data:\n")
	fmt.Fprintf(os.Stderr, "  Download from thepit.cloud/research or:\n")
	fmt.Fprintf(os.Stderr, "  curl -o export.json 'https://thepit.cloud/api/research/export?id=1'\n\n")
}

func fatal(ctx string, err error) {
	fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render(ctx+":"), err)
	os.Exit(1)
}

// requireLicense enforces lab-tier license verification.
func requireLicense() {
	if publicKeyHex == "" {
		return // dev build
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
