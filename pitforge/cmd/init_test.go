package cmd

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
)

func TestTemplatesExist(t *testing.T) {
	expected := []string{"minimal", "full", "debate", "comedy"}
	for _, name := range expected {
		if _, ok := templates[name]; !ok {
			t.Errorf("template %q not found", name)
		}
	}
}

func TestTemplateFullHasAllFields(t *testing.T) {
	full := templates["full"]
	if full.Archetype == "" {
		t.Error("full template missing archetype")
	}
	if full.Tone == "" {
		t.Error("full template missing tone")
	}
	if len(full.Quirks) == 0 {
		t.Error("full template missing quirks")
	}
	if full.Goal == "" {
		t.Error("full template missing goal")
	}
	if full.Weakness == "" {
		t.Error("full template missing weakness")
	}
}

func TestTemplatesPassValidation(t *testing.T) {
	for name, tmpl := range templates {
		// Minimal template is intentionally incomplete (a starting point).
		if name == "minimal" {
			continue
		}
		// Give the template a name for validation.
		def := *tmpl
		def.Name = "Test Agent"
		if def.Tier == "" {
			def.Tier = "free"
		}
		errs := Validate(&def)
		if len(errs) != 0 {
			t.Errorf("template %q fails validation: %+v", name, errs)
		}
	}
}

func TestInitCreatesFile(t *testing.T) {
	dir := t.TempDir()
	orig, _ := os.Getwd()
	os.Chdir(dir)
	defer os.Chdir(orig)

	// We can't call RunInit directly because it calls os.Exit.
	// Instead, test the template application logic.
	name := "The Philosopher"
	tmpl := templates["full"]
	def := *tmpl
	def.Name = name
	def.Quirks = make([]string, len(tmpl.Quirks))
	copy(def.Quirks, tmpl.Quirks)

	slug := agent.Slugify(name)
	filename := filepath.Join(dir, slug+".yaml")

	err := agent.SaveToFile(filename, &def)
	if err != nil {
		t.Fatalf("SaveToFile failed: %v", err)
	}

	// Verify file exists and can be loaded back.
	loaded, err := agent.LoadFromFile(filename)
	if err != nil {
		t.Fatalf("LoadFromFile failed: %v", err)
	}
	if loaded.Name != name {
		t.Errorf("loaded name = %q, want %q", loaded.Name, name)
	}
	if loaded.Archetype != tmpl.Archetype {
		t.Errorf("loaded archetype = %q, want %q", loaded.Archetype, tmpl.Archetype)
	}
}
