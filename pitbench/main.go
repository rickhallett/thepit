package main

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/rickhallett/thepit/pitbench/cmd"
	"github.com/rickhallett/thepit/shared/license"
	"github.com/rickhallett/thepit/shared/telemetry"
	"github.com/rickhallett/thepit/shared/theme"
)

var version = "dev"

// publicKeyHex is the embedded public key for license verification.
var publicKeyHex = ""

func main() {
	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) == 0 {
		usage()
		os.Exit(0)
	}
	tel := telemetry.New("pitbench")
	startedAt := time.Now()
	_ = tel.Capture(context.Background(), "pitbench.command.started", map[string]any{
		"command": args[0],
	})
	defer func() {
		_ = tel.Capture(context.Background(), "pitbench.command.completed", map[string]any{
			"command":     args[0],
			"duration_ms": time.Since(startedAt).Milliseconds(),
		})
	}()

	// Models command doesn't need license (just shows pricing table).
	switch args[0] {
	case "version":
		fmt.Printf("pitbench %s\n", version)
		return
	case "models":
		cmd.RunModels()
		return
	}

	// Premium commands require license.
	requireLicense()

	switch args[0] {
	case "estimate":
		cmd.RunEstimate(args[1:])
	case "cost":
		cmd.RunCost(args[1:])
	case "margin":
		cmd.RunMargin(args[1:])
	default:
		fmt.Fprintf(os.Stderr, "%s unknown command %q\n", theme.Error.Render("error:"), args[0])
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render("pitbench — cost & performance benchmarking for THE PIT"))
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  pitbench <command> [flags]\n\n")
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  estimate [flags]        Estimate cost for a hypothetical bout\n")
	fmt.Fprintf(os.Stderr, "  cost [flags]            Calculate cost for exact token counts\n")
	fmt.Fprintf(os.Stderr, "  margin                  Verify platform margin across all models\n")
	fmt.Fprintf(os.Stderr, "  models                  Show model pricing comparison table\n")
	fmt.Fprintf(os.Stderr, "  version                 Show version\n\n")
	fmt.Fprintf(os.Stderr, "Estimate Flags:\n")
	fmt.Fprintf(os.Stderr, "  --model <id>     Model ID (default: claude-haiku-4-5-20251001)\n")
	fmt.Fprintf(os.Stderr, "  --turns <n>      Number of turns (default: 12)\n")
	fmt.Fprintf(os.Stderr, "  --length <id>    short | standard | long (default: standard)\n\n")
	fmt.Fprintf(os.Stderr, "Cost Flags:\n")
	fmt.Fprintf(os.Stderr, "  --model <id>     Model ID (default: claude-haiku-4-5-20251001)\n")
	fmt.Fprintf(os.Stderr, "  --input <n>      Input token count\n")
	fmt.Fprintf(os.Stderr, "  --output <n>     Output token count\n\n")
}

func fatal(ctx string, err error) {
	fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render(ctx+":"), err)
	os.Exit(1)
}

func requireLicense() {
	if publicKeyHex == "" {
		return
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
