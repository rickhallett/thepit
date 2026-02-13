package cmd

import (
	"fmt"
	"strings"

	"github.com/rickhallett/thepit/pitlab/internal/dataset"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunCodebook implements the "codebook" command — generates a research codebook.
func RunCodebook(ds *dataset.Dataset) {
	stats := ds.Stats()

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Research Codebook — THE PIT"))
	fmt.Printf("  %s\n\n", strings.Repeat("─", 60))

	// Dataset metadata.
	section("Dataset")
	field("source", "thepit.cloud research export")
	field("version", stats.ExportVersion)
	field("generated", stats.GeneratedAt)
	field("records", fmt.Sprintf("%d bouts, %d agents, %d votes, %d reactions",
		stats.BoutCount, stats.AgentCount, stats.VoteCount, stats.ReactionCount))
	field("anonymization", "all user IDs SHA-256 hashed with salt")

	// Bout variables.
	section("Table: bouts")
	variable("id", "string", "Unique bout identifier (nanoid, 21 chars)")
	variable("presetId", "string", "Debate scenario preset identifier")
	variable("topic", "string?", "Debate topic (null for preset-defined topics)")
	variable("responseLength", "enum", "short | standard | long — controls max output tokens")
	variable("responseFormat", "enum", "plain | spaced | markdown | json — output format constraint")
	variable("turnCount", "integer", "Number of turns in the debate (typically 4-48)")
	variable("ownerId", "string?", "Anonymized SHA-256 hash of the user who created the bout")
	variable("createdAt", "ISO 8601", "UTC timestamp of bout creation")

	// Agent variables.
	section("Table: agents")
	variable("id", "string", "Unique agent identifier (max 128 chars)")
	variable("name", "string", "Display name (max 128 chars)")
	variable("presetId", "string?", "Preset this agent belongs to (null for custom agents)")
	variable("tier", "enum", "free | premium | custom — access tier")
	variable("responseLength", "enum", "short | standard | long")
	variable("responseFormat", "enum", "plain | spaced | markdown | json")
	variable("ownerId", "string?", "Anonymized SHA-256 hash of the agent creator")
	variable("parentId", "string?", "ID of the agent this was cloned from (lineage tracking)")
	variable("createdAt", "ISO 8601", "UTC timestamp")

	// Vote variables.
	section("Table: votes (winner_votes)")
	variable("boutId", "string", "References bouts.id")
	variable("agentId", "string", "References agents.id — the voted-for agent")
	variable("userId", "string", "Anonymized SHA-256 hash of the voter")
	variable("createdAt", "ISO 8601", "UTC timestamp of vote")
	note("Constraint: one vote per user per bout (unique on boutId+userId)")

	// Reaction variables.
	section("Table: reactions")
	variable("boutId", "string", "References bouts.id")
	variable("turnIndex", "integer", "0-indexed turn position within the bout")
	variable("reactionType", "string", "Reaction type identifier (e.g., fire, skull, mic_drop)")
	variable("createdAt", "ISO 8601", "UTC timestamp")
	note("Constraint: one reaction per type per user per turn (unique on boutId+turnIndex+reactionType+userId)")

	// Derived metrics.
	section("Derived Metrics")
	derived("win", "Agent with most votes in a bout. Ties = shared win.")
	derived("winRate", "wins / boutAppearances for a given agent")
	derived("positionBias", "Win rate difference between first and second speakers")
	derived("engagementDensity", "Reactions per bout at a given turn position")

	// Important notes.
	section("Research Notes")
	note("Transcript text is NOT included in exports to protect user-generated content")
	note("Agent system prompts are NOT included to protect intellectual property")
	note("Token counts are NOT persisted — can be estimated at ~4 chars/token")
	note("Model ID is NOT stored per bout — infer from agent tier (free=Haiku, premium=Sonnet)")
	note("Turn order is sequential round-robin: agents[turnIndex % agentCount]")

	fmt.Printf("\n  %s\n\n", strings.Repeat("─", 60))
}

func section(name string) {
	fmt.Printf("\n  %s\n\n", theme.Bold.Render(name))
}

func field(label, value string) {
	fmt.Printf("    %-20s %s\n", theme.Muted.Render(label+":"), value)
}

func variable(name, typ, desc string) {
	fmt.Printf("    %-20s %-14s %s\n", theme.Warning.Render(name), theme.Muted.Render(typ), desc)
}

func derived(name, desc string) {
	fmt.Printf("    %-20s %s\n", theme.Accent.Render(name), desc)
}

func note(text string) {
	fmt.Printf("    %s %s\n", theme.Muted.Render("*"), text)
}
