package main

import (
	"crypto/ed25519"
	"encoding/hex"
	"flag"
	"fmt"
	"os"

	"github.com/rickhallett/thepit/pitnet/cmd"
	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/license"
	"github.com/rickhallett/thepit/shared/theme"
)

var version = "dev"

// publicKeyHex is the embedded public key for license verification.
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

	// Handle version before config loading.
	if args[0] == "version" {
		fmt.Printf("pitnet %s\n", version)
		return
	}

	// Load config — resolves .env → .env.local → shell env.
	cfg, err := config.Load(*envPath)
	if err != nil {
		fatal("config", err)
	}

	// Status command is free — shows Base L2 connectivity.
	if args[0] == "status" {
		cmd.RunStatus(cfg, args[1:])
		return
	}

	// Premium commands require license.
	requireLicense()

	switch args[0] {
	case "submit":
		cmd.RunSubmit(args[1:])
	case "verify":
		cmd.RunVerify(cfg, args[1:])
	case "audit":
		cmd.RunAudit(cfg, args[1:])
	default:
		fmt.Fprintf(os.Stderr, "%s unknown command %q\n", theme.Error.Render("error:"), args[0])
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render("pitnet — on-chain provenance for THE PIT"))
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  pitnet <command> [flags]\n\n")
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  submit [flags]          Encode an attestation payload for an agent\n")
	fmt.Fprintf(os.Stderr, "  verify <uid> [flags]    Verify an attestation UID on-chain\n")
	fmt.Fprintf(os.Stderr, "  audit [flags]           Audit all attested agents against on-chain data\n")
	fmt.Fprintf(os.Stderr, "  status [flags]          Check Base L2 / EAS service connectivity\n")
	fmt.Fprintf(os.Stderr, "  version                 Show version\n\n")
	fmt.Fprintf(os.Stderr, "Global Flags:\n")
	fmt.Fprintf(os.Stderr, "  --env <path>    Path to .env file (default: auto-detect)\n")
	fmt.Fprintf(os.Stderr, "  --rpc <url>     Base L2 RPC URL (default: %s or EAS_RPC_URL env)\n\n", "https://mainnet.base.org")
	fmt.Fprintf(os.Stderr, "Submit Flags:\n")
	fmt.Fprintf(os.Stderr, "  --agent-id <id>         Agent ID\n")
	fmt.Fprintf(os.Stderr, "  --name <name>           Agent name\n")
	fmt.Fprintf(os.Stderr, "  --prompt-hash <hash>    0x-prefixed prompt hash\n")
	fmt.Fprintf(os.Stderr, "  --manifest-hash <hash>  0x-prefixed manifest hash\n")
	fmt.Fprintf(os.Stderr, "  --tier <tier>            Agent tier (free/pro/lab)\n")
	fmt.Fprintf(os.Stderr, "  --preset-id <id>        Preset ID\n")
	fmt.Fprintf(os.Stderr, "  --json <file>           Load fields from JSON manifest file\n\n")
	fmt.Fprintf(os.Stderr, "Audit Flags:\n")
	fmt.Fprintf(os.Stderr, "  --db <url>              Database URL (default: DATABASE_URL env)\n\n")
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
