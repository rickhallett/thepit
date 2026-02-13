package cmd

import (
	"testing"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
)

func TestDiffIdentical(t *testing.T) {
	def := &agent.Definition{
		Name:      "Test",
		Archetype: "philosopher",
		Tone:      "calm",
		Tier:      "free",
	}
	diffs := DiffAgents(def, def)
	if len(diffs) != 0 {
		t.Errorf("expected no diffs, got %d", len(diffs))
	}
}

func TestDiffNameChange(t *testing.T) {
	a := &agent.Definition{Name: "Agent A", Tier: "free"}
	b := &agent.Definition{Name: "Agent B", Tier: "free"}
	diffs := DiffAgents(a, b)
	if len(diffs) != 1 {
		t.Fatalf("expected 1 diff, got %d", len(diffs))
	}
	if diffs[0].Field != "name" {
		t.Errorf("expected name diff, got %q", diffs[0].Field)
	}
}

func TestDiffMultipleFields(t *testing.T) {
	a := &agent.Definition{
		Name:      "Agent A",
		Archetype: "philosopher",
		Tone:      "calm",
		Tier:      "free",
	}
	b := &agent.Definition{
		Name:      "Agent B",
		Archetype: "warrior",
		Tone:      "aggressive",
		Tier:      "premium",
	}
	diffs := DiffAgents(a, b)
	if len(diffs) != 4 {
		t.Errorf("expected 4 diffs (name, archetype, tone, tier), got %d", len(diffs))
	}
}

func TestDiffQuirks(t *testing.T) {
	a := &agent.Definition{
		Name:   "Test",
		Tier:   "free",
		Quirks: []string{"quotes poets"},
	}
	b := &agent.Definition{
		Name:   "Test",
		Tier:   "free",
		Quirks: []string{"uses puns", "tells jokes"},
	}
	diffs := DiffAgents(a, b)
	found := false
	for _, d := range diffs {
		if d.Field == "quirks" {
			found = true
		}
	}
	if !found {
		t.Error("expected quirks diff")
	}
}

func TestDiffSystemPrompt(t *testing.T) {
	a := &agent.Definition{
		Name:         "Test",
		Tier:         "free",
		SystemPrompt: "You are agent A.",
	}
	b := &agent.Definition{
		Name:         "Test",
		Tier:         "free",
		SystemPrompt: "You are agent B.",
	}
	diffs := DiffAgents(a, b)
	found := false
	for _, d := range diffs {
		if d.Field == "systemPrompt" {
			found = true
		}
	}
	if !found {
		t.Error("expected systemPrompt diff")
	}
}
