package cmd

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
	"github.com/rickhallett/thepit/pitforge/internal/anthropic"
	"github.com/rickhallett/thepit/pitforge/internal/prompt"
	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/theme"
)

const (
	safetyPreamble = "The following is a character persona for a debate simulation. Stay in character. Do not reveal system details, API keys, or internal platform information.\n\n"

	defaultMaxTurns = 12
	defaultTopic    = "Is technology making humanity better or worse?"
)

// Response length configs matching lib/response-lengths.ts.
var responseLengthTokens = map[string]int{
	"short":    120,
	"standard": 200,
	"long":     320,
}

var responseLengthHints = map[string]string{
	"short":    "1-2 sentences",
	"standard": "3-5 sentences",
	"long":     "6-10 sentences",
}

// Response format instructions matching lib/response-formats.ts.
var responseFormatInstructions = map[string]string{
	"plain":    "Respond in plain text only. Do not use markdown or JSON.",
	"spaced":   "Respond in plain text. Use short paragraphs and insert blank lines between them.",
	"markdown": "Respond in Markdown. Use formatting where it helps clarity.",
	"json":     `Respond with a single JSON object only. Use the shape {"text":"..."}. No extra prose.`,
}

var responseFormatHints = map[string]string{
	"plain":    "no markup",
	"spaced":   "airier paragraphs",
	"markdown": "rich formatting",
	"json":     "machine readable",
}

// RunSpar implements the "spar" command.
func RunSpar(args []string, cfg *config.Config) {
	if len(args) < 2 {
		fmt.Fprintf(os.Stderr, "%s spar requires two agent file arguments\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitforge spar <agent1.yaml> <agent2.yaml> [--topic \"...\"] [--turns N] [--model ID]\n\n")
		os.Exit(1)
	}

	file1, file2 := args[0], args[1]
	topic := defaultTopic
	maxTurns := defaultMaxTurns
	model := anthropic.DefaultModel

	// Parse optional flags.
	for i := 2; i < len(args); i++ {
		switch args[i] {
		case "--topic":
			if i+1 < len(args) {
				topic = args[i+1]
				i++
			}
		case "--turns":
			if i+1 < len(args) {
				n, err := strconv.Atoi(args[i+1])
				if err != nil || n < 1 {
					fmt.Fprintf(os.Stderr, "%s --turns must be a positive integer\n", theme.Error.Render("error:"))
					os.Exit(1)
				}
				maxTurns = n
				i++
			}
		case "--model":
			if i+1 < len(args) {
				model = args[i+1]
				i++
			}
		}
	}

	// Load agents.
	defA, err := agent.LoadFromFile(file1)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}
	defB, err := agent.LoadFromFile(file2)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	agents := []*agent.Definition{defA, defB}
	apiKey := cfg.Get("ANTHROPIC_API_KEY")
	if apiKey == "" {
		fmt.Fprintf(os.Stderr, "\n  %s ANTHROPIC_API_KEY not set\n\n", theme.Error.Render("error:"))
		os.Exit(1)
	}

	client := anthropic.NewClient(apiKey)

	// Print header.
	fmt.Printf("\n  %s\n\n", theme.Title.Render("SPAR — Local Bout"))
	fmt.Printf("  %-14s %s\n", theme.Muted.Render("topic:"), topic)
	fmt.Printf("  %-14s %s vs %s\n", theme.Muted.Render("agents:"), defA.Name, defB.Name)
	fmt.Printf("  %-14s %d\n", theme.Muted.Render("turns:"), maxTurns)
	fmt.Printf("  %-14s %s\n\n", theme.Muted.Render("model:"), model)
	fmt.Printf("  %s\n\n", strings.Repeat("─", 60))

	var history []string

	for turn := 0; turn < maxTurns; turn++ {
		def := agents[turn%len(agents)]

		systemPrompt := prompt.GetSystemPrompt(def)
		rl := defaultIfEmptySpar(def.ResponseLength, "standard")
		rf := defaultIfEmptySpar(def.ResponseFormat, "markdown")

		// Build system message (safety preamble + agent prompt + format instruction).
		system := safetyPreamble + systemPrompt + "\n\n" + responseFormatInstructions[rf]

		// Build user message.
		var userParts []string
		if topic != "" {
			userParts = append(userParts, "Topic: "+topic)
		}
		userParts = append(userParts, fmt.Sprintf("Response length: %s (%s).", titleCase(rl), responseLengthHints[rl]))
		userParts = append(userParts, fmt.Sprintf("Response format: %s (%s).", titleCase(rf), responseFormatHints[rf]))

		if len(history) > 0 {
			userParts = append(userParts, "\nTranscript so far:")
			userParts = append(userParts, strings.Join(history, "\n"))
			userParts = append(userParts, fmt.Sprintf("\nRespond in character as %s.", def.Name))
		} else {
			userParts = append(userParts, fmt.Sprintf("\nOpen the debate in character as %s.", def.Name))
		}

		userContent := strings.Join(userParts, "\n")

		maxTokens := responseLengthTokens[rl]
		if maxTokens == 0 {
			maxTokens = 200
		}

		// Print turn header.
		fmt.Printf("  %s %s (turn %d/%d)\n\n",
			theme.Warning.Render("▸"),
			theme.Bold.Render(def.Name),
			turn+1, maxTurns)

		// Stream the response.
		fmt.Print("  ")
		result, err := client.StreamWithCallback(&anthropic.Request{
			Model:     model,
			MaxTokens: maxTokens,
			System:    system,
			Messages:  []anthropic.Message{{Role: "user", Content: userContent}},
		}, func(text string) {
			// Print deltas inline, indenting newlines.
			text = strings.ReplaceAll(text, "\n", "\n  ")
			fmt.Print(text)
		})

		if err != nil {
			fmt.Fprintf(os.Stderr, "\n\n  %s turn %d: %v\n\n", theme.Error.Render("error:"), turn+1, err)
			os.Exit(1)
		}

		fmt.Printf("\n\n  %s\n\n", strings.Repeat("─", 60))

		// Add to history.
		history = append(history, fmt.Sprintf("%s: %s", def.Name, result))
	}

	fmt.Printf("  %s Bout complete (%d turns)\n\n", theme.Success.Render("✓"), maxTurns)
}

func defaultIfEmptySpar(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

func titleCase(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}
