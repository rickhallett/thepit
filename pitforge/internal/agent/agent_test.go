package agent

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseMinimal(t *testing.T) {
	yaml := `name: "The Contrarian"`
	def, err := Parse([]byte(yaml))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if def.Name != "The Contrarian" {
		t.Errorf("Name = %q, want The Contrarian", def.Name)
	}
}

func TestParseFull(t *testing.T) {
	yaml := `
name: "The Contrarian"
archetype: "devil's advocate philosopher"
tone: "measured but provocative"
quirks:
  - "begins every response with 'But consider...'"
  - "occasionally agrees just to disagree"
speechPattern: "Socratic questioning"
openingMove: "finds the weakest premise"
signatureMove: "reductio ad absurdum"
weakness: "gets lost in abstraction"
goal: "expose hidden assumptions"
fears: "being boring"
customInstructions: "always challenge the consensus"
tier: "custom"
model: null
responseLength: "standard"
responseFormat: "markdown"
`
	def, err := Parse([]byte(yaml))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}

	if def.Name != "The Contrarian" {
		t.Errorf("Name = %q", def.Name)
	}
	if def.Archetype != "devil's advocate philosopher" {
		t.Errorf("Archetype = %q", def.Archetype)
	}
	if len(def.Quirks) != 2 {
		t.Errorf("Quirks len = %d, want 2", len(def.Quirks))
	}
	if def.Tier != "custom" {
		t.Errorf("Tier = %q, want custom", def.Tier)
	}
	if def.ResponseLength != "standard" {
		t.Errorf("ResponseLength = %q", def.ResponseLength)
	}
}

func TestFileRoundTrip(t *testing.T) {
	def := &Definition{
		Name:      "Test Agent",
		Archetype: "tester",
		Tone:      "dry",
		Quirks:    []string{"says 'indeed' a lot"},
		Tier:      "custom",
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "test-agent.yaml")

	if err := SaveToFile(path, def); err != nil {
		t.Fatalf("SaveToFile: %v", err)
	}

	loaded, err := LoadFromFile(path)
	if err != nil {
		t.Fatalf("LoadFromFile: %v", err)
	}

	if loaded.Name != def.Name {
		t.Errorf("Name = %q, want %q", loaded.Name, def.Name)
	}
	if loaded.Archetype != def.Archetype {
		t.Errorf("Archetype = %q, want %q", loaded.Archetype, def.Archetype)
	}
	if len(loaded.Quirks) != 1 || loaded.Quirks[0] != "says 'indeed' a lot" {
		t.Errorf("Quirks = %v", loaded.Quirks)
	}
}

func TestLoadFromFileNotFound(t *testing.T) {
	_, err := LoadFromFile(filepath.Join(t.TempDir(), "nonexistent-agent-file.yaml"))
	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestParseInvalidYAML(t *testing.T) {
	_, err := Parse([]byte("{{invalid yaml"))
	if err == nil {
		t.Error("expected error for invalid YAML")
	}
}

func TestSlugify(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"The Contrarian", "the-contrarian"},
		{"Devil's Advocate", "devils-advocate"},
		{"  spaces  around  ", "spaces-around"},
		{"ALL CAPS NAME", "all-caps-name"},
		{"agent_123", "agent123"},
		{"", ""},
		{"a--b--c", "a-b-c"},
		{"\"quoted\"", "quoted"},
	}

	for _, tc := range tests {
		got := Slugify(tc.input)
		if got != tc.want {
			t.Errorf("Slugify(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestSlugifyFileWrite(t *testing.T) {
	// Verify slugified names are valid filenames.
	slug := Slugify("The Nihilist's Revenge")
	dir := t.TempDir()
	path := filepath.Join(dir, slug+".yaml")
	if err := os.WriteFile(path, []byte("test"), 0644); err != nil {
		t.Errorf("could not create file with slugified name %q: %v", slug, err)
	}
}
