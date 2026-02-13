package cmd

import (
	"context"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/rickhallett/thepit/pitnet/internal/abi"
	"github.com/rickhallett/thepit/pitnet/internal/chain"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunVerify verifies an attestation UID against on-chain data.
func RunVerify(args []string) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "%s verify requires an attestation UID\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitnet verify <attestation-uid> [--rpc <url>]\n\n")
		os.Exit(1)
	}

	uid := args[0]
	rpcURL := ""

	for i := 1; i < len(args); i++ {
		switch args[i] {
		case "--rpc", "-r":
			if i+1 >= len(args) {
				fmt.Fprintf(os.Stderr, "%s --rpc requires a value\n", theme.Error.Render("error:"))
				os.Exit(1)
			}
			rpcURL = args[i+1]
			i++
		default:
			if strings.HasPrefix(args[i], "-") {
				fmt.Fprintf(os.Stderr, "%s unrecognized flag: %s\n", theme.Warning.Render("warning:"), args[i])
			}
		}
	}

	if !abi.IsValidBytes32(uid) {
		fmt.Fprintf(os.Stderr, "%s invalid attestation UID: %s\n", theme.Error.Render("error:"), uid)
		os.Exit(1)
	}

	cfg := chain.Config{RPCURL: rpcURL}
	if envRPC := os.Getenv("EAS_RPC_URL"); envRPC != "" && rpcURL == "" {
		cfg.RPCURL = envRPC
	}
	client := chain.New(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Attestation Verification"))
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("uid:"), uid)
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("rpc:"), client.RPCURL())
	fmt.Printf("  %-22s %s\n\n", theme.Muted.Render("contract:"), chain.EASContractAddress)

	att, err := client.GetAttestation(ctx, uid)
	if err != nil {
		fmt.Fprintf(os.Stderr, "  %s %v\n\n", theme.Error.Render("verification failed:"), err)
		os.Exit(1)
	}

	fmt.Printf("  %s\n\n", theme.Success.Render("Attestation found on-chain"))
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("schema:"), att.Schema)
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("attester:"), att.Attester)
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("recipient:"), att.Recipient)
	fmt.Printf("  %-22s %d\n", theme.Muted.Render("time:"), att.Time)
	fmt.Printf("  %-22s %v\n", theme.Muted.Render("revocable:"), att.Revocable)

	// Try to decode the attestation data.
	if len(att.Data) > 0 {
		decoded, err := abi.Decode(att.Data)
		if err != nil {
			fmt.Printf("\n  %s could not decode attestation data: %v\n\n",
				theme.Warning.Render("warning:"), err)
			fmt.Printf("  %-22s %s\n\n", theme.Muted.Render("raw data:"),
				"0x"+hex.EncodeToString(att.Data))
			return
		}

		fmt.Printf("\n  %s\n\n", theme.Bold.Render("Decoded Agent Identity"))
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("agentId:"), decoded.AgentID)
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("name:"), decoded.Name)
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("presetId:"), decoded.PresetID)
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("tier:"), decoded.Tier)
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("promptHash:"), decoded.PromptHash)
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("manifestHash:"), decoded.ManifestHash)
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("parentId:"), decoded.ParentID)
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("ownerId:"), decoded.OwnerID)
		fmt.Printf("  %-22s %d\n\n", theme.Muted.Render("createdAt:"), decoded.CreatedAt)
	}
}
