package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
	"github.com/rickhallett/thepit/shared/theme"
)

// ValidationError represents a single validation failure.
type ValidationError struct {
	Field   string
	Message string
}

// Validate checks an agent definition against DB schema constraints.
// Returns a slice of validation errors (empty = valid).
func Validate(def *agent.Definition) []ValidationError {
	var errs []ValidationError

	// name: varchar(128), NOT NULL
	if strings.TrimSpace(def.Name) == "" {
		errs = append(errs, ValidationError{"name", "required, cannot be empty"})
	} else if len(def.Name) > 128 {
		errs = append(errs, ValidationError{"name", fmt.Sprintf("max 128 chars, got %d", len(def.Name))})
	}

	// tier: agent_tier enum, NOT NULL
	if def.Tier == "" {
		errs = append(errs, ValidationError{"tier", "required (free, premium, custom)"})
	} else if !agent.ValidTiers[def.Tier] {
		errs = append(errs, ValidationError{"tier", fmt.Sprintf("invalid %q (must be free, premium, or custom)", def.Tier)})
	}

	// model: varchar(128), nullable
	if len(def.Model) > 128 {
		errs = append(errs, ValidationError{"model", fmt.Sprintf("max 128 chars, got %d", len(def.Model))})
	}

	// responseLength: varchar(32), NOT NULL, default "standard"
	rl := def.ResponseLength
	if rl == "" {
		rl = "standard" // default
	}
	if !agent.ValidResponseLengths[rl] {
		errs = append(errs, ValidationError{"responseLength", fmt.Sprintf("invalid %q (must be short, standard, or long)", rl)})
	}

	// responseFormat: varchar(32), NOT NULL, default "plain"
	rf := def.ResponseFormat
	if rf == "" {
		rf = "plain" // default
	}
	if !agent.ValidResponseFormats[rf] {
		errs = append(errs, ValidationError{"responseFormat", fmt.Sprintf("invalid %q (must be plain, spaced, markdown, or json)", rf)})
	}

	// systemPrompt or structured fields — at least one path to a prompt is required
	hasStructured := strings.TrimSpace(def.Archetype) != "" ||
		strings.TrimSpace(def.Tone) != "" ||
		len(def.Quirks) > 0 ||
		strings.TrimSpace(def.SpeechPattern) != "" ||
		strings.TrimSpace(def.OpeningMove) != "" ||
		strings.TrimSpace(def.SignatureMove) != "" ||
		strings.TrimSpace(def.Weakness) != "" ||
		strings.TrimSpace(def.Goal) != "" ||
		strings.TrimSpace(def.Fears) != "" ||
		strings.TrimSpace(def.CustomInstructions) != ""

	if strings.TrimSpace(def.SystemPrompt) == "" && !hasStructured {
		errs = append(errs, ValidationError{"systemPrompt", "either systemPrompt or structured personality fields required"})
	}

	return errs
}

// RunValidate implements the "validate" command.
func RunValidate(args []string) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "%s validate requires a file argument\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitforge validate <file.yaml>\n\n")
		os.Exit(1)
	}

	path := args[0]
	def, err := agent.LoadFromFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	errs := Validate(def)
	if len(errs) == 0 {
		fmt.Printf("\n  %s %s is valid\n\n", theme.Success.Render("✓"), path)
		return
	}

	fmt.Fprintf(os.Stderr, "\n  %s %s has %d validation error(s):\n\n", theme.Error.Render("✗"), path, len(errs))
	for _, e := range errs {
		fmt.Fprintf(os.Stderr, "    %s  %s\n", theme.Muted.Render(e.Field+":"), e.Message)
	}
	fmt.Fprintln(os.Stderr)
	os.Exit(1)
}
