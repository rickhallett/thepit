package cmd

import (
	"testing"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
)

func TestValidateMinimalValid(t *testing.T) {
	def := &agent.Definition{
		Name:      "Test Agent",
		Tier:      "free",
		Archetype: "philosopher",
	}
	errs := Validate(def)
	if len(errs) != 0 {
		t.Errorf("expected no errors, got %d: %+v", len(errs), errs)
	}
}

func TestValidateWithSystemPrompt(t *testing.T) {
	def := &agent.Definition{
		Name:         "Test Agent",
		Tier:         "free",
		SystemPrompt: "You are a test agent.",
	}
	errs := Validate(def)
	if len(errs) != 0 {
		t.Errorf("expected no errors, got %d: %+v", len(errs), errs)
	}
}

func TestValidateEmptyName(t *testing.T) {
	def := &agent.Definition{
		Tier:      "free",
		Archetype: "philosopher",
	}
	errs := Validate(def)
	if len(errs) == 0 {
		t.Fatal("expected errors for empty name")
	}
	found := false
	for _, e := range errs {
		if e.Field == "name" {
			found = true
		}
	}
	if !found {
		t.Error("expected name error")
	}
}

func TestValidateNameTooLong(t *testing.T) {
	def := &agent.Definition{
		Name:      string(make([]byte, 129)),
		Tier:      "free",
		Archetype: "philosopher",
	}
	errs := Validate(def)
	found := false
	for _, e := range errs {
		if e.Field == "name" {
			found = true
		}
	}
	if !found {
		t.Error("expected name length error")
	}
}

func TestValidateInvalidTier(t *testing.T) {
	def := &agent.Definition{
		Name:      "Test",
		Tier:      "invalid",
		Archetype: "philosopher",
	}
	errs := Validate(def)
	found := false
	for _, e := range errs {
		if e.Field == "tier" {
			found = true
		}
	}
	if !found {
		t.Error("expected tier error")
	}
}

func TestValidateEmptyTier(t *testing.T) {
	def := &agent.Definition{
		Name:      "Test",
		Archetype: "philosopher",
	}
	errs := Validate(def)
	found := false
	for _, e := range errs {
		if e.Field == "tier" {
			found = true
		}
	}
	if !found {
		t.Error("expected tier error for empty tier")
	}
}

func TestValidateInvalidResponseLength(t *testing.T) {
	def := &agent.Definition{
		Name:           "Test",
		Tier:           "free",
		Archetype:      "philosopher",
		ResponseLength: "huge",
	}
	errs := Validate(def)
	found := false
	for _, e := range errs {
		if e.Field == "responseLength" {
			found = true
		}
	}
	if !found {
		t.Error("expected responseLength error")
	}
}

func TestValidateInvalidResponseFormat(t *testing.T) {
	def := &agent.Definition{
		Name:           "Test",
		Tier:           "free",
		Archetype:      "philosopher",
		ResponseFormat: "xml",
	}
	errs := Validate(def)
	found := false
	for _, e := range errs {
		if e.Field == "responseFormat" {
			found = true
		}
	}
	if !found {
		t.Error("expected responseFormat error")
	}
}

func TestValidateNoPromptPath(t *testing.T) {
	def := &agent.Definition{
		Name: "Test",
		Tier: "free",
		// No systemPrompt and no structured fields.
	}
	errs := Validate(def)
	found := false
	for _, e := range errs {
		if e.Field == "systemPrompt" {
			found = true
		}
	}
	if !found {
		t.Error("expected systemPrompt error when no prompt path exists")
	}
}

func TestValidateAllTiersValid(t *testing.T) {
	for _, tier := range []string{"free", "premium", "custom"} {
		def := &agent.Definition{
			Name:      "Test",
			Tier:      tier,
			Archetype: "philosopher",
		}
		errs := Validate(def)
		if len(errs) != 0 {
			t.Errorf("tier %q should be valid, got errors: %+v", tier, errs)
		}
	}
}

func TestValidateModelTooLong(t *testing.T) {
	def := &agent.Definition{
		Name:      "Test",
		Tier:      "free",
		Archetype: "philosopher",
		Model:     string(make([]byte, 129)),
	}
	errs := Validate(def)
	found := false
	for _, e := range errs {
		if e.Field == "model" {
			found = true
		}
	}
	if !found {
		t.Error("expected model length error")
	}
}
