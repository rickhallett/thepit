package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
	"github.com/rickhallett/thepit/pitforge/internal/prompt"
	"github.com/rickhallett/thepit/shared/theme"
)

// LintSeverity indicates warning vs error.
type LintSeverity int

const (
	LintWarn LintSeverity = iota
	LintError
)

// LintResult is a single lint finding.
type LintResult struct {
	Severity LintSeverity
	Rule     string
	Message  string
}

// Lint runs heuristic quality checks on an agent definition.
func Lint(def *agent.Definition) []LintResult {
	var results []LintResult

	systemPrompt := prompt.GetSystemPrompt(def)

	// Rule: prompt-length — warn if system prompt is very short.
	if len(systemPrompt) < 50 {
		results = append(results, LintResult{
			LintWarn, "prompt-length",
			fmt.Sprintf("system prompt is only %d chars; consider adding more personality detail", len(systemPrompt)),
		})
	}

	// Rule: prompt-length-max — warn if system prompt is excessively long.
	if len(systemPrompt) > 4000 {
		results = append(results, LintResult{
			LintWarn, "prompt-length-max",
			fmt.Sprintf("system prompt is %d chars; very long prompts may reduce response quality", len(systemPrompt)),
		})
	}

	// Rule: vague-archetype — warn about generic archetypes.
	vagueArchetypes := []string{"debater", "arguer", "speaker", "thinker", "person", "character"}
	if def.Archetype != "" {
		lower := strings.ToLower(def.Archetype)
		for _, v := range vagueArchetypes {
			if lower == v {
				results = append(results, LintResult{
					LintWarn, "vague-archetype",
					fmt.Sprintf("archetype %q is too generic; try something more specific and vivid", def.Archetype),
				})
				break
			}
		}
	}

	// Rule: missing-differentiation — warn if key personality fields are missing.
	missingCount := 0
	if strings.TrimSpace(def.Archetype) == "" {
		missingCount++
	}
	if strings.TrimSpace(def.Tone) == "" {
		missingCount++
	}
	if len(def.Quirks) == 0 {
		missingCount++
	}
	if strings.TrimSpace(def.Goal) == "" {
		missingCount++
	}
	if missingCount >= 3 && strings.TrimSpace(def.SystemPrompt) == "" {
		results = append(results, LintResult{
			LintWarn, "missing-differentiation",
			"most personality fields are empty; agents with more detail perform better in debates",
		})
	}

	// Rule: no-weakness — warn if no weakness is defined.
	if strings.TrimSpace(def.Weakness) == "" && strings.TrimSpace(def.SystemPrompt) == "" {
		results = append(results, LintResult{
			LintWarn, "no-weakness",
			"no weakness defined; weaknesses create more interesting debate dynamics",
		})
	}

	// Rule: contradictory-tone — detect obvious contradictions.
	contradictions := []struct{ a, b string }{
		{"calm", "aggressive"},
		{"quiet", "loud"},
		{"passive", "combative"},
		{"gentle", "harsh"},
		{"timid", "bold"},
	}
	if def.Tone != "" {
		lower := strings.ToLower(def.Tone)
		for _, c := range contradictions {
			if strings.Contains(lower, c.a) && strings.Contains(lower, c.b) {
				results = append(results, LintResult{
					LintWarn, "contradictory-tone",
					fmt.Sprintf("tone contains potentially contradictory descriptors: %q and %q", c.a, c.b),
				})
			}
		}
	}

	// Rule: duplicate-quirks — check for duplicate quirk entries.
	if len(def.Quirks) > 1 {
		seen := make(map[string]bool)
		for _, q := range def.Quirks {
			lower := strings.ToLower(strings.TrimSpace(q))
			if lower != "" && seen[lower] {
				results = append(results, LintResult{
					LintWarn, "duplicate-quirks",
					fmt.Sprintf("duplicate quirk: %q", q),
				})
			}
			seen[lower] = true
		}
	}

	// Rule: anti-pattern — detect problematic instructions.
	antiPatterns := []struct {
		pattern string
		message string
	}{
		{"ignore all previous", "contains prompt injection pattern"},
		{"ignore your instructions", "contains prompt injection pattern"},
		{"you are now", "contains role-hijacking pattern"},
		{"pretend you are", "contains role-hijacking pattern"},
		{"do not debate", "contradicts the purpose of a debate agent"},
		{"refuse to answer", "may cause the agent to be unresponsive"},
	}

	promptLower := strings.ToLower(systemPrompt)
	for _, ap := range antiPatterns {
		if strings.Contains(promptLower, ap.pattern) {
			results = append(results, LintResult{
				LintError, "anti-pattern",
				ap.message + fmt.Sprintf(" (matched: %q)", ap.pattern),
			})
		}
	}

	return results
}

// RunLint implements the "lint" command.
func RunLint(args []string) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "%s lint requires a file argument\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitforge lint <file.yaml>\n\n")
		os.Exit(1)
	}

	path := args[0]
	def, err := agent.LoadFromFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	// Run validation first.
	valErrs := Validate(def)
	if len(valErrs) > 0 {
		fmt.Fprintf(os.Stderr, "\n  %s %s has validation errors (run 'validate' first)\n\n",
			theme.Error.Render("✗"), path)
		for _, e := range valErrs {
			fmt.Fprintf(os.Stderr, "    %s  %s\n", theme.Muted.Render(e.Field+":"), e.Message)
		}
		fmt.Fprintln(os.Stderr)
		os.Exit(1)
	}

	results := Lint(def)

	if len(results) == 0 {
		fmt.Printf("\n  %s %s passes all lint checks\n\n", theme.Success.Render("✓"), path)
		return
	}

	warns := 0
	errs := 0
	for _, r := range results {
		if r.Severity == LintError {
			errs++
		} else {
			warns++
		}
	}

	fmt.Printf("\n  %s %s: %d warning(s), %d error(s)\n\n", theme.Warning.Render("lint"), path, warns, errs)
	for _, r := range results {
		sev := theme.Warning.Render("warn")
		if r.Severity == LintError {
			sev = theme.Error.Render("error")
		}
		fmt.Printf("    %s  [%s] %s\n", sev, theme.Muted.Render(r.Rule), r.Message)
	}
	fmt.Println()

	if errs > 0 {
		os.Exit(1)
	}
}
