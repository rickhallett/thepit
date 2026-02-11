package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
	"github.com/rickhallett/thepit/pitforge/internal/anthropic"
	"github.com/rickhallett/thepit/pitforge/internal/prompt"
	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/theme"
)

// Evolution strategies.
const (
	StrategyMutate = "mutate" // Random perturbation of personality fields.
	StrategySweep  = "sweep"  // Systematic variation of one dimension.
	StrategyAblate = "ablate" // Remove one field at a time for ablation testing.
)

// RunEvolve implements the "evolve" command.
func RunEvolve(args []string, cfg *config.Config) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "%s evolve requires a file argument\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitforge evolve <file.yaml> [--strategy mutate|sweep|ablate] [--count N]\n\n")
		os.Exit(1)
	}

	path := args[0]
	strategy := StrategyMutate
	count := 3

	for i := 1; i < len(args); i++ {
		switch args[i] {
		case "--strategy", "-s":
			if i+1 < len(args) {
				strategy = args[i+1]
				i++
			}
		case "--count", "-n":
			if i+1 < len(args) {
				n := 0
				fmt.Sscanf(args[i+1], "%d", &n)
				if n > 0 {
					count = n
				}
				i++
			}
		}
	}

	if strategy != StrategyMutate && strategy != StrategySweep && strategy != StrategyAblate {
		fmt.Fprintf(os.Stderr, "%s unknown strategy %q (use mutate, sweep, or ablate)\n",
			theme.Error.Render("error:"), strategy)
		os.Exit(1)
	}

	def, err := agent.LoadFromFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	apiKey := cfg.Get("ANTHROPIC_API_KEY")
	if apiKey == "" {
		fmt.Fprintf(os.Stderr, "\n  %s ANTHROPIC_API_KEY not set\n\n", theme.Error.Render("error:"))
		os.Exit(1)
	}

	fmt.Printf("\n  %s\n\n", theme.Title.Render("EVOLVE — Agent Variant Generation"))
	fmt.Printf("  %-14s %s\n", theme.Muted.Render("source:"), def.Name)
	fmt.Printf("  %-14s %s\n", theme.Muted.Render("strategy:"), strategy)
	fmt.Printf("  %-14s %d\n\n", theme.Muted.Render("variants:"), count)

	client := anthropic.NewClient(apiKey)
	sourcePrompt := prompt.GetSystemPrompt(def)

	var evolvePrompt string
	switch strategy {
	case StrategyMutate:
		evolvePrompt = buildMutatePrompt(def, sourcePrompt, count)
	case StrategySweep:
		evolvePrompt = buildSweepPrompt(def, sourcePrompt, count)
	case StrategyAblate:
		evolvePrompt = buildAblatePrompt(def, sourcePrompt)
		count = countStructuredFields(def)
	}

	fmt.Printf("  Generating %d variant(s)...\n\n  ", count)

	result, err := client.StreamWithCallback(&anthropic.Request{
		Model:     anthropic.DefaultModel,
		MaxTokens: 4096,
		System:    "You are an expert AI prompt engineer specializing in debate agent personas. Generate agent variants in YAML format.",
		Messages:  []anthropic.Message{{Role: "user", Content: evolvePrompt}},
	}, func(text string) {
		text = strings.ReplaceAll(text, "\n", "\n  ")
		fmt.Print(text)
	})

	if err != nil {
		fmt.Fprintf(os.Stderr, "\n\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	_ = result
	fmt.Printf("\n\n  %s %d variant(s) generated\n", theme.Success.Render("✓"), count)
	fmt.Printf("  %s Copy YAML blocks above into separate .yaml files, then validate with 'pitforge validate'\n\n",
		theme.Muted.Render("hint:"))
}

func buildMutatePrompt(def *agent.Definition, sourcePrompt string, count int) string {
	return fmt.Sprintf(`Given this debate agent definition:

Name: %s
System Prompt: %s
Archetype: %s
Tone: %s
Quirks: %s
Goal: %s
Weakness: %s

Generate %d mutated variants. For each variant:
- Change 2-3 personality fields to create a meaningfully different persona
- Keep the core concept recognizable but shift the personality
- Each variant should have a different name
- Output each as a complete YAML block (with all fields) that can be saved as a .yaml file

Format each variant as a fenced YAML code block.`,
		def.Name, sourcePrompt, def.Archetype, def.Tone,
		strings.Join(def.Quirks, ", "), def.Goal, def.Weakness, count)
}

func buildSweepPrompt(def *agent.Definition, sourcePrompt string, count int) string {
	return fmt.Sprintf(`Given this debate agent definition:

Name: %s
System Prompt: %s
Archetype: %s
Tone: %s
Goal: %s

Generate %d variants by systematically sweeping the TONE dimension from most aggressive to most gentle,
while keeping all other fields identical. Each variant should have a descriptive name reflecting its tone.

Format each variant as a fenced YAML code block with all fields.`,
		def.Name, sourcePrompt, def.Archetype, def.Tone, def.Goal, count)
}

func buildAblatePrompt(def *agent.Definition, sourcePrompt string) string {
	return fmt.Sprintf(`Given this debate agent definition:

Name: %s
System Prompt: %s
Archetype: %s
Tone: %s
Quirks: %s
Speech Pattern: %s
Opening Move: %s
Signature Move: %s
Weakness: %s
Goal: %s
Fears: %s

Generate ablation variants by removing ONE structured field at a time.
For each non-empty field, create a variant that is identical EXCEPT that field is cleared.
Name each variant to indicate which field was removed (e.g., "Name (no-tone)").

This helps identify which personality fields contribute most to debate performance.

Format each variant as a fenced YAML code block.`,
		def.Name, sourcePrompt, def.Archetype, def.Tone,
		strings.Join(def.Quirks, ", "), def.SpeechPattern,
		def.OpeningMove, def.SignatureMove, def.Weakness, def.Goal, def.Fears)
}

func countStructuredFields(def *agent.Definition) int {
	count := 0
	if def.Archetype != "" {
		count++
	}
	if def.Tone != "" {
		count++
	}
	if len(def.Quirks) > 0 {
		count++
	}
	if def.SpeechPattern != "" {
		count++
	}
	if def.OpeningMove != "" {
		count++
	}
	if def.SignatureMove != "" {
		count++
	}
	if def.Weakness != "" {
		count++
	}
	if def.Goal != "" {
		count++
	}
	if def.Fears != "" {
		count++
	}
	if def.CustomInstructions != "" {
		count++
	}
	return count
}
