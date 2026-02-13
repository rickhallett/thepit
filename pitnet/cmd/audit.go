package cmd

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"

	"github.com/rickhallett/thepit/pitnet/internal/abi"
	"github.com/rickhallett/thepit/pitnet/internal/chain"
	"github.com/rickhallett/thepit/shared/theme"
)

// AgentRecord represents an agent row with attestation fields from the DB.
type AgentRecord struct {
	AgentID           string
	Name              string
	PromptHash        string
	ManifestHash      string
	AttestationUID    sql.NullString
	AttestationTxHash sql.NullString
}

// RunAudit audits agents with attestation UIDs against on-chain data.
// It reads from the database (DATABASE_URL) and verifies each attestation
// exists on-chain with matching hashes.
func RunAudit(args []string) {
	rpcURL := ""
	dbURL := os.Getenv("DATABASE_URL")

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--rpc", "-r":
			if i+1 < len(args) {
				rpcURL = args[i+1]
				i++
			}
		case "--db":
			if i+1 < len(args) {
				dbURL = args[i+1]
				i++
			}
		}
	}

	if dbURL == "" {
		fmt.Fprintf(os.Stderr, "%s DATABASE_URL is required for audit\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Set DATABASE_URL in .env or pass --db <url>\n\n")
		os.Exit(1)
	}

	cfg := chain.Config{RPCURL: rpcURL}
	if envRPC := os.Getenv("EAS_RPC_URL"); envRPC != "" && rpcURL == "" {
		cfg.RPCURL = envRPC
	}
	client := chain.New(cfg)

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Attestation Audit"))
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("rpc:"), client.RPCURL())
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("contract:"), chain.EASContractAddress)

	// Connect to database.
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s connecting to database: %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Query agents with attestation UIDs.
	rows, err := db.QueryContext(ctx,
		`SELECT id, name, prompt_hash, manifest_hash, attestation_uid, attestation_tx_hash
		 FROM agents
		 WHERE attestation_uid IS NOT NULL AND attestation_uid != ''
		 ORDER BY created_at DESC`)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s querying agents: %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}
	defer rows.Close()

	var agents []AgentRecord
	for rows.Next() {
		var a AgentRecord
		if err := rows.Scan(&a.AgentID, &a.Name, &a.PromptHash, &a.ManifestHash,
			&a.AttestationUID, &a.AttestationTxHash); err != nil {
			fmt.Fprintf(os.Stderr, "\n  %s scanning row: %v\n\n", theme.Error.Render("error:"), err)
			os.Exit(1)
		}
		agents = append(agents, a)
	}
	if err := rows.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s scanning rows: %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	if len(agents) == 0 {
		fmt.Printf("\n  %s\n\n", theme.Muted.Render("No attested agents found."))
		return
	}

	fmt.Printf("  %-22s %d\n\n", theme.Muted.Render("attested agents:"), len(agents))

	// Audit header.
	fmt.Printf("  %-16s %-24s %-12s %s\n",
		theme.Muted.Render("Agent"),
		theme.Muted.Render("Name"),
		theme.Muted.Render("Status"),
		theme.Muted.Render("Detail"))
	fmt.Printf("  %s\n", strings.Repeat("─", 72))

	passed := 0
	failed := 0

	for _, agent := range agents {
		uid := agent.AttestationUID.String
		if !abi.IsValidBytes32(uid) {
			fmt.Printf("  %-16s %-24s %s %s\n",
				truncate(agent.AgentID, 14),
				truncate(agent.Name, 22),
				theme.Error.Render("INVALID"),
				"bad UID format")
			failed++
			continue
		}

		att, err := client.GetAttestation(ctx, uid)
		if err != nil {
			fmt.Printf("  %-16s %-24s %s %s\n",
				truncate(agent.AgentID, 14),
				truncate(agent.Name, 22),
				theme.Error.Render("FAIL"),
				err.Error())
			failed++
			continue
		}

		// Decode on-chain data and verify hashes match.
		if len(att.Data) == 0 {
			fmt.Printf("  %-16s %-24s %s %s\n",
				truncate(agent.AgentID, 14),
				truncate(agent.Name, 22),
				theme.Warning.Render("MISSING"),
				"no attestation data")
			failed++
			continue
		}
		decoded, err := abi.Decode(att.Data)
		if err != nil {
			fmt.Printf("  %-16s %-24s %s %s\n",
				truncate(agent.AgentID, 14),
				truncate(agent.Name, 22),
				theme.Warning.Render("DECODE"),
				"could not decode attestation data")
			failed++
			continue
		}

		// Compare hashes.
		if decoded.PromptHash != agent.PromptHash {
			fmt.Printf("  %-16s %-24s %s %s\n",
				truncate(agent.AgentID, 14),
				truncate(agent.Name, 22),
				theme.Error.Render("MISMATCH"),
				"prompt hash differs")
			failed++
			continue
		}
		if decoded.ManifestHash != agent.ManifestHash {
			fmt.Printf("  %-16s %-24s %s %s\n",
				truncate(agent.AgentID, 14),
				truncate(agent.Name, 22),
				theme.Error.Render("MISMATCH"),
				"manifest hash differs")
			failed++
			continue
		}

		fmt.Printf("  %-16s %-24s %s\n",
			truncate(agent.AgentID, 14),
			truncate(agent.Name, 22),
			theme.Success.Render("OK"))
		passed++
	}

	fmt.Printf("\n  %s\n\n", strings.Repeat("─", 72))
	fmt.Printf("  %s %d passed, %d failed, %d total\n\n",
		theme.Bold.Render("Summary:"), passed, failed, len(agents))

	if failed > 0 {
		os.Exit(1)
	}
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-2] + ".."
}
