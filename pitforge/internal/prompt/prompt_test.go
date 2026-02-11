package prompt

import (
	"strings"
	"testing"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
)

func TestBuildMinimal(t *testing.T) {
	def := &agent.Definition{Name: "The Bot"}
	got := Build(def)
	if got != "You are The Bot." {
		t.Errorf("Build() = %q, want %q", got, "You are The Bot.")
	}
}

func TestBuildWithArchetype(t *testing.T) {
	def := &agent.Definition{
		Name:      "The Philosopher",
		Archetype: "classical philosopher",
	}
	got := Build(def)
	want := "You are The Philosopher, a classical philosopher."
	if got != want {
		t.Errorf("Build() = %q, want %q", got, want)
	}
}

func TestBuildFullFields(t *testing.T) {
	def := &agent.Definition{
		Name:               "The Contrarian",
		Archetype:          "devil's advocate",
		Tone:               "measured but provocative",
		Quirks:             []string{"says 'but consider'", "reframes everything"},
		SpeechPattern:      "Socratic questioning",
		OpeningMove:        "attacks weakest premise",
		SignatureMove:      "reductio ad absurdum",
		Weakness:           "gets lost in abstraction",
		Goal:               "expose hidden assumptions",
		Fears:              "being boring",
		CustomInstructions: "always challenge consensus",
	}

	got := Build(def)

	// Verify each field appears in the output.
	expects := []string{
		"You are The Contrarian, a devil's advocate.",
		"Tone: measured but provocative",
		"Quirks: says 'but consider', reframes everything",
		"Speech pattern: Socratic questioning",
		"Opening move: attacks weakest premise",
		"Signature move: reductio ad absurdum",
		"Weakness: gets lost in abstraction",
		"Goal: expose hidden assumptions",
		"Fears: being boring",
		"Custom instructions: always challenge consensus",
	}

	for _, exp := range expects {
		if !strings.Contains(got, exp) {
			t.Errorf("Build() missing %q\n\ngot:\n%s", exp, got)
		}
	}

	// Verify line count matches (identity + 9 fields = 10 lines).
	lines := strings.Split(got, "\n")
	if len(lines) != 10 {
		t.Errorf("Build() has %d lines, want 10", len(lines))
	}
}

func TestBuildSkipsEmptyFields(t *testing.T) {
	def := &agent.Definition{
		Name: "Sparse Agent",
		Tone: "calm",
		// All other fields empty.
	}

	got := Build(def)
	lines := strings.Split(got, "\n")
	if len(lines) != 2 {
		t.Errorf("Build() has %d lines, want 2 (identity + tone)", len(lines))
	}
}

func TestBuildSkipsEmptyQuirks(t *testing.T) {
	def := &agent.Definition{
		Name:   "No Quirks",
		Quirks: []string{"", "  ", ""},
	}
	got := Build(def)
	// Empty quirks should be filtered out, resulting in no "Quirks:" label line.
	if strings.Contains(got, "Quirks:") {
		t.Error("Build() should not include Quirks: line when all quirks are empty/whitespace")
	}
}

func TestBuildTrimsWhitespace(t *testing.T) {
	def := &agent.Definition{
		Name:      "  Trimmed  ",
		Archetype: "  archetype  ",
		Tone:      "  tone  ",
	}
	got := Build(def)
	if !strings.HasPrefix(got, "You are Trimmed, a archetype.") {
		t.Errorf("Build() did not trim name/archetype: %q", got)
	}
	if !strings.Contains(got, "Tone: tone") {
		t.Errorf("Build() did not trim tone: %q", got)
	}
}

func TestGetSystemPromptExplicit(t *testing.T) {
	def := &agent.Definition{
		Name:         "Agent",
		Archetype:    "ignored when systemPrompt is set",
		SystemPrompt: "You are a custom agent with explicit instructions.",
	}
	got := GetSystemPrompt(def)
	if got != "You are a custom agent with explicit instructions." {
		t.Errorf("GetSystemPrompt() = %q, expected explicit systemPrompt", got)
	}
}

func TestGetSystemPromptFallsBackToBuild(t *testing.T) {
	def := &agent.Definition{
		Name:      "Fallback",
		Archetype: "tester",
	}
	got := GetSystemPrompt(def)
	if got != "You are Fallback, a tester." {
		t.Errorf("GetSystemPrompt() = %q, expected Build() output", got)
	}
}
