package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
	"github.com/rickhallett/thepit/pitforge/internal/dna"
	"github.com/rickhallett/thepit/pitforge/internal/prompt"
	"github.com/rickhallett/thepit/shared/theme"
)

// FieldDiff represents a difference in a single field.
type FieldDiff struct {
	Field string
	A     string
	B     string
}

// DiffAgents computes field-by-field differences between two agent definitions.
func DiffAgents(a, b *agent.Definition) []FieldDiff {
	var diffs []FieldDiff

	check := func(field, va, vb string) {
		if va != vb {
			diffs = append(diffs, FieldDiff{field, va, vb})
		}
	}

	check("name", a.Name, b.Name)
	check("archetype", a.Archetype, b.Archetype)
	check("tone", a.Tone, b.Tone)
	check("speechPattern", a.SpeechPattern, b.SpeechPattern)
	check("openingMove", a.OpeningMove, b.OpeningMove)
	check("signatureMove", a.SignatureMove, b.SignatureMove)
	check("weakness", a.Weakness, b.Weakness)
	check("goal", a.Goal, b.Goal)
	check("fears", a.Fears, b.Fears)
	check("customInstructions", a.CustomInstructions, b.CustomInstructions)
	check("systemPrompt", a.SystemPrompt, b.SystemPrompt)
	check("tier", a.Tier, b.Tier)
	check("model", a.Model, b.Model)
	check("responseLength", a.ResponseLength, b.ResponseLength)
	check("responseFormat", a.ResponseFormat, b.ResponseFormat)

	// Quirks comparison.
	qa := strings.Join(a.Quirks, ", ")
	qb := strings.Join(b.Quirks, ", ")
	check("quirks", qa, qb)

	return diffs
}

// RunDiff implements the "diff" command.
func RunDiff(args []string) {
	if len(args) < 2 {
		fmt.Fprintf(os.Stderr, "%s diff requires two file arguments\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitforge diff <file1.yaml> <file2.yaml>\n\n")
		os.Exit(1)
	}

	defA, err := agent.LoadFromFile(args[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	defB, err := agent.LoadFromFile(args[1])
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	diffs := DiffAgents(defA, defB)

	// Also compare prompt hashes.
	hashA, err := dna.HashPrompt(prompt.GetSystemPrompt(defA))
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s hashing %s: %v\n\n", theme.Error.Render("error:"), args[0], err)
		os.Exit(1)
	}
	hashB, err := dna.HashPrompt(prompt.GetSystemPrompt(defB))
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s hashing %s: %v\n\n", theme.Error.Render("error:"), args[1], err)
		os.Exit(1)
	}

	fmt.Printf("\n  %s vs %s\n\n", theme.Title.Render(args[0]), theme.Title.Render(args[1]))

	if len(diffs) == 0 {
		fmt.Printf("  %s agents are identical\n\n", theme.Success.Render("✓"))
		return
	}

	fmt.Printf("  %d field(s) differ:\n\n", len(diffs))
	for _, d := range diffs {
		fmt.Printf("  %s\n", theme.Warning.Render(d.Field+":"))
		fmt.Printf("    %s %s\n", theme.Error.Render("-"), truncate(d.A, 120))
		fmt.Printf("    %s %s\n\n", theme.Success.Render("+"), truncate(d.B, 120))
	}

	// Hash comparison.
	hashMatch := "different"
	if hashA == hashB {
		hashMatch = "identical"
	}
	fmt.Printf("  %s %s\n\n", theme.Muted.Render("promptHash:"), hashMatch)
}

func truncate(s string, max int) string {
	s = strings.ReplaceAll(s, "\n", "\\n")
	if len(s) > max {
		return s[:max-3] + "..."
	}
	if s == "" {
		return theme.Muted.Render("(empty)")
	}
	return s
}
