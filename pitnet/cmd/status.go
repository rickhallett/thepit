package cmd

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/rickhallett/thepit/pitnet/internal/chain"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunStatus checks the Base L2 / EAS service connectivity and state.
func RunStatus(args []string) {
	rpcURL := ""
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--rpc", "-r":
			if i+1 >= len(args) {
				fmt.Fprintf(os.Stderr, "%s --rpc requires a value\n", theme.Error.Render("error:"))
				os.Exit(1)
			}
			rpcURL = args[i+1]
			i++
		}
	}

	cfg := chain.Config{RPCURL: rpcURL}
	if envRPC := os.Getenv("EAS_RPC_URL"); envRPC != "" && rpcURL == "" {
		cfg.RPCURL = envRPC
	}
	client := chain.New(cfg)

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Base L2 / EAS Status"))
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("rpc:"), client.RPCURL())
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("eas contract:"), chain.EASContractAddress)
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("schema registry:"), chain.SchemaRegistryAddress)
	fmt.Printf("  %-22s %d\n\n", theme.Muted.Render("expected chain:"), chain.DefaultChainID)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Check chain ID.
	start := time.Now()
	chainID, err := client.ChainID(ctx)
	latency := time.Since(start)
	if err != nil {
		fmt.Printf("  %-22s %s (%v)\n", theme.Muted.Render("chain id:"),
			theme.Error.Render("unreachable"), err)
		os.Exit(1)
	}

	if chainID == uint64(chain.DefaultChainID) {
		fmt.Printf("  %-22s %s (%d, %v)\n", theme.Muted.Render("chain id:"),
			theme.Success.Render("OK"), chainID, latency.Round(time.Millisecond))
	} else {
		fmt.Printf("  %-22s %s (got %d, want %d)\n", theme.Muted.Render("chain id:"),
			theme.Warning.Render("MISMATCH"), chainID, chain.DefaultChainID)
	}

	// Check latest block.
	blockNum, err := client.BlockNumber(ctx)
	if err != nil {
		fmt.Printf("  %-22s %s (%v)\n", theme.Muted.Render("latest block:"),
			theme.Error.Render("failed"), err)
	} else {
		fmt.Printf("  %-22s %s (#%d)\n", theme.Muted.Render("latest block:"),
			theme.Success.Render("OK"), blockNum)
	}

	// Check schema UID if configured.
	schemaUID := os.Getenv("EAS_SCHEMA_UID")
	if schemaUID != "" {
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("schema uid:"), schemaUID)
	} else {
		fmt.Printf("  %-22s %s\n", theme.Muted.Render("schema uid:"),
			theme.Warning.Render("not configured (set EAS_SCHEMA_UID)"))
	}

	fmt.Println()
}
