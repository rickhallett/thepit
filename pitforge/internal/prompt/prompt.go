// Package prompt implements the structured prompt composition logic,
// a faithful Go port of lib/agent-prompts.ts buildStructuredPrompt().
package prompt

import (
	"strings"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
)

// Build composes a system prompt from structured agent fields.
// This must produce identical output to the TypeScript buildStructuredPrompt().
func Build(def *agent.Definition) string {
	var lines []string

	// Identity line: "You are {name}, a {archetype}." or "You are {name}."
	name := strings.TrimSpace(def.Name)
	archetype := strings.TrimSpace(def.Archetype)
	if archetype != "" {
		lines = append(lines, "You are "+name+", a "+archetype+".")
	} else {
		lines = append(lines, "You are "+name+".")
	}

	// Structured fields.
	if v := strings.TrimSpace(def.Tone); v != "" {
		lines = append(lines, formatLine("Tone", v))
	}
	if len(def.Quirks) > 0 {
		if ql := formatList("Quirks", def.Quirks); ql != "" {
			lines = append(lines, ql)
		}
	}
	if v := strings.TrimSpace(def.SpeechPattern); v != "" {
		lines = append(lines, formatLine("Speech pattern", v))
	}
	if v := strings.TrimSpace(def.OpeningMove); v != "" {
		lines = append(lines, formatLine("Opening move", v))
	}
	if v := strings.TrimSpace(def.SignatureMove); v != "" {
		lines = append(lines, formatLine("Signature move", v))
	}
	if v := strings.TrimSpace(def.Weakness); v != "" {
		lines = append(lines, formatLine("Weakness", v))
	}
	if v := strings.TrimSpace(def.Goal); v != "" {
		lines = append(lines, formatLine("Goal", v))
	}
	if v := strings.TrimSpace(def.Fears); v != "" {
		lines = append(lines, formatLine("Fears", v))
	}
	if v := strings.TrimSpace(def.CustomInstructions); v != "" {
		lines = append(lines, formatLine("Custom instructions", v))
	}

	return strings.Join(lines, "\n")
}

// formatLine produces "Label: value".
func formatLine(label, value string) string {
	return label + ": " + value
}

// formatList produces "Label: val1, val2, val3".
func formatList(label string, values []string) string {
	var trimmed []string
	for _, v := range values {
		if s := strings.TrimSpace(v); s != "" {
			trimmed = append(trimmed, s)
		}
	}
	if len(trimmed) == 0 {
		return ""
	}
	return label + ": " + strings.Join(trimmed, ", ")
}

// GetSystemPrompt returns the effective system prompt for an agent definition.
// If SystemPrompt is explicitly set, it takes priority. Otherwise, the structured
// fields are composed via Build().
func GetSystemPrompt(def *agent.Definition) string {
	if strings.TrimSpace(def.SystemPrompt) != "" {
		return strings.TrimSpace(def.SystemPrompt)
	}
	return Build(def)
}
