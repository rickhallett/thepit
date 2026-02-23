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
)

// RunProof produces a human-readable verification proof for an attestation UID.
// Output is plain text (no ANSI escapes) suitable for pasting into GitHub issues,
// blog posts, or terminal screenshots.
//
// Exit codes:
//
//	0 = attestation found and decoded successfully
//	1 = attestation not found, decode error, or chain error
//	2 = usage error (missing/invalid UID)
func RunProof(args []string) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "error: proof requires an attestation UID\n")
		fmt.Fprintf(os.Stderr, "\n  Usage: pitnet proof <attestation-uid> [--rpc <url>]\n\n")
		fmt.Fprintf(os.Stderr, "  Example:\n")
		fmt.Fprintf(os.Stderr, "    pitnet proof 0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724\n\n")
		os.Exit(2)
	}

	uid := args[0]
	rpcURL := ""

	for i := 1; i < len(args); i++ {
		switch args[i] {
		case "--rpc", "-r":
			if i+1 >= len(args) {
				fmt.Fprintf(os.Stderr, "error: --rpc requires a value\n")
				os.Exit(2)
			}
			rpcURL = args[i+1]
			i++
		}
	}

	if !abi.IsValidBytes32(uid) {
		fmt.Fprintf(os.Stderr, "error: invalid attestation UID: %s\n", uid)
		fmt.Fprintf(os.Stderr, "  Expected: 0x-prefixed, 32-byte hex string (66 characters total)\n")
		os.Exit(2)
	}

	cfg := chain.Config{RPCURL: rpcURL}
	if envRPC := os.Getenv("EAS_RPC_URL"); envRPC != "" && rpcURL == "" {
		cfg.RPCURL = envRPC
	}
	client := chain.New(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// --- Header ---
	fmt.Println("=============================================================")
	fmt.Println("  The Pit — On-Chain Attestation Verification Proof")
	fmt.Println("=============================================================")
	fmt.Println()
	fmt.Println("Chain Parameters")
	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Printf("  Network:          Base L2 Mainnet (Chain ID 8453)\n")
	fmt.Printf("  RPC Endpoint:     %s\n", client.RPCURL())
	fmt.Printf("  EAS Contract:     %s\n", chain.EASContractAddress)
	fmt.Printf("  Schema Registry:  %s\n", chain.SchemaRegistryAddress)
	fmt.Printf("  Schema UID:       %s\n", abi.SchemaUID)
	fmt.Println()

	// --- Fetch ---
	fmt.Println("Query")
	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Printf("  Attestation UID:  %s\n", uid)
	fmt.Printf("  Method:           eth_call → getAttestation(bytes32)\n")
	fmt.Printf("  Timestamp:        %s\n", time.Now().UTC().Format(time.RFC3339))
	fmt.Println()

	att, err := client.GetAttestation(ctx, uid)
	if err != nil {
		fmt.Println("Result")
		fmt.Println("─────────────────────────────────────────────────────────────")
		fmt.Printf("  Status:           FAILED\n")
		fmt.Printf("  Error:            %v\n", err)
		fmt.Println()
		fmt.Println("=============================================================")
		os.Exit(1)
	}

	// EAS returns a zeroed struct for non-existent attestations rather than
	// reverting. Detect this by checking if the returned UID is all zeros.
	if isZeroUID(att.UID) {
		fmt.Println("Result")
		fmt.Println("─────────────────────────────────────────────────────────────")
		fmt.Printf("  Status:           NOT FOUND\n")
		fmt.Printf("  Detail:           No attestation exists with this UID on Base L2\n")
		fmt.Printf("  Queried UID:      %s\n", uid)
		fmt.Println()
		fmt.Println("=============================================================")
		os.Exit(1)
	}

	// --- On-chain metadata ---
	fmt.Println("On-Chain Attestation Record")
	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Printf("  UID:              %s\n", att.UID)
	fmt.Printf("  Schema:           %s\n", att.Schema)
	fmt.Printf("  Attester:         %s\n", att.Attester)
	fmt.Printf("  Recipient:        %s\n", att.Recipient)
	fmt.Printf("  Time:             %d (%s)\n", att.Time, formatUnixUTC(att.Time))
	fmt.Printf("  Expiration:       %s\n", formatExpiration(att.ExpirationTime))
	fmt.Printf("  Revocable:        %v\n", att.Revocable)
	fmt.Printf("  Data Size:        %d bytes\n", len(att.Data))
	fmt.Println()

	// --- Schema match ---
	schemaMatch := strings.EqualFold(att.Schema, abi.SchemaUID)
	fmt.Println("Schema Verification")
	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Printf("  Expected:         %s\n", abi.SchemaUID)
	fmt.Printf("  On-Chain:         %s\n", att.Schema)
	if schemaMatch {
		fmt.Printf("  Match:            YES\n")
	} else {
		fmt.Printf("  Match:            NO — schema mismatch\n")
	}
	fmt.Println()

	// --- Decode ---
	if len(att.Data) == 0 {
		fmt.Println("Decoded Agent Identity")
		fmt.Println("─────────────────────────────────────────────────────────────")
		fmt.Printf("  Status:           NO DATA — attestation contains no payload\n")
		fmt.Println()
		fmt.Println("=============================================================")
		os.Exit(1)
	}

	decoded, err := abi.Decode(att.Data)
	if err != nil {
		fmt.Println("Decoded Agent Identity")
		fmt.Println("─────────────────────────────────────────────────────────────")
		fmt.Printf("  Status:           DECODE FAILED\n")
		fmt.Printf("  Error:            %v\n", err)
		fmt.Printf("  Raw Data:         0x%s\n", hex.EncodeToString(att.Data))
		fmt.Println()
		fmt.Println("=============================================================")
		os.Exit(1)
	}

	fmt.Println("Decoded Agent Identity")
	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Printf("  Agent ID:         %s\n", decoded.AgentID)
	fmt.Printf("  Name:             %s\n", decoded.Name)
	fmt.Printf("  Preset ID:        %s\n", displayOrNone(decoded.PresetID))
	fmt.Printf("  Tier:             %s\n", decoded.Tier)
	fmt.Printf("  Prompt Hash:      %s\n", decoded.PromptHash)
	fmt.Printf("  Manifest Hash:    %s\n", decoded.ManifestHash)
	fmt.Printf("  Parent ID:        %s\n", displayOrNone(decoded.ParentID))
	fmt.Printf("  Owner ID:         %s\n", decoded.OwnerID)
	fmt.Printf("  Created At:       %d (%s)\n", decoded.CreatedAt, formatUnixUTC(decoded.CreatedAt))
	fmt.Println()

	// --- Verification summary ---
	fmt.Println("Verification Summary")
	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Printf("  Attestation:      FOUND on Base L2 mainnet\n")
	fmt.Printf("  ABI Decode:       SUCCESS (all 9 schema fields decoded)\n")
	if schemaMatch {
		fmt.Printf("  Schema:           MATCHES expected PIT schema\n")
	} else {
		fmt.Printf("  Schema:           MISMATCH — unexpected schema UID\n")
	}
	fmt.Printf("  Agent Identity:   %s (%s)\n", decoded.Name, decoded.AgentID)
	fmt.Println()

	// --- Explorer links ---
	fmt.Println("Independent Verification")
	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Printf("  EAS Explorer:     https://base.easscan.org/attestation/view/%s\n", uid)
	fmt.Printf("  Schema:           https://base.easscan.org/schema/view/%s\n", abi.SchemaUID)
	fmt.Printf("  Basescan:         https://basescan.org/address/%s\n", chain.EASContractAddress)
	fmt.Println()

	// --- ABI schema reference ---
	fmt.Println("ABI Schema")
	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Printf("  %s\n", abi.SchemaString)
	fmt.Println()
	fmt.Println("=============================================================")

	if !schemaMatch {
		os.Exit(1)
	}
}

// formatUnixUTC formats a unix timestamp as a human-readable UTC string.
func formatUnixUTC(ts uint64) string {
	if ts == 0 {
		return "never"
	}
	return time.Unix(int64(ts), 0).UTC().Format("2006-01-02 15:04:05 UTC")
}

// formatExpiration formats an expiration timestamp.
func formatExpiration(ts uint64) string {
	if ts == 0 {
		return "none (permanent)"
	}
	return fmt.Sprintf("%d (%s)", ts, formatUnixUTC(ts))
}

// displayOrNone returns "(none)" for empty strings.
func displayOrNone(s string) string {
	if s == "" {
		return "(none)"
	}
	return s
}

// isZeroUID checks if a UID is the zero value (0x000...000).
// EAS returns a zeroed struct for non-existent attestations.
func isZeroUID(uid string) bool {
	uid = strings.TrimPrefix(uid, "0x")
	for _, c := range uid {
		if c != '0' {
			return false
		}
	}
	return true
}
