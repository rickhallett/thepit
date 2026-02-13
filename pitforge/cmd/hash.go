package cmd

import (
	"fmt"
	"os"
	"time"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
	"github.com/rickhallett/thepit/pitforge/internal/dna"
	"github.com/rickhallett/thepit/pitforge/internal/prompt"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunHash implements the "hash" command.
func RunHash(args []string) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "%s hash requires a file argument\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitforge hash <file.yaml>\n\n")
		os.Exit(1)
	}

	path := args[0]
	def, err := agent.LoadFromFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	systemPrompt := prompt.GetSystemPrompt(def)

	// Compute prompt hash.
	promptHash, err := dna.HashPrompt(systemPrompt)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s computing prompt hash: %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	// Build manifest with placeholder metadata for local hashing.
	// AgentID is derived from the slug, createdAt is now.
	agentID := agent.Slugify(def.Name) + "-local"
	createdAt := time.Now().UTC().Format(time.RFC3339)
	manifest := dna.BuildManifest(agentID, systemPrompt, def, createdAt)

	manifestHash, err := dna.HashManifest(manifest)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s computing manifest hash: %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	fmt.Printf("\n  %s\n\n", theme.Title.Render(path))
	fmt.Printf("  %-16s %s\n", theme.Muted.Render("promptHash:"), promptHash)
	fmt.Printf("  %-16s %s\n", theme.Muted.Render("manifestHash:"), manifestHash)
	fmt.Printf("  %-16s %s\n", theme.Muted.Render("agentId:"), agentID)
	fmt.Printf("  %-16s %s\n\n", theme.Muted.Render("createdAt:"), createdAt)

	// Note about manifest hash stability.
	fmt.Printf("  %s promptHash is stable (based on systemPrompt content only)\n", theme.Muted.Render("note:"))
	fmt.Printf("  %s manifestHash varies with agentId and createdAt\n\n", theme.Muted.Render("note:"))
}
