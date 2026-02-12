package dna

import (
	"strings"
	"testing"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
)

func TestHashPromptFormat(t *testing.T) {
	hash, err := HashPrompt("You are a test agent.")
	if err != nil {
		t.Fatalf("HashPrompt: %v", err)
	}
	// Must be 0x-prefixed, 66 chars total (0x + 64 hex chars).
	if !strings.HasPrefix(hash, "0x") {
		t.Errorf("hash missing 0x prefix: %s", hash)
	}
	if len(hash) != 66 {
		t.Errorf("hash length = %d, want 66", len(hash))
	}
}

func TestHashPromptDeterministic(t *testing.T) {
	prompt := "You are The Philosopher, a classical philosopher."
	h1, err := HashPrompt(prompt)
	if err != nil {
		t.Fatalf("HashPrompt: %v", err)
	}
	h2, err := HashPrompt(prompt)
	if err != nil {
		t.Fatalf("HashPrompt: %v", err)
	}
	if h1 != h2 {
		t.Errorf("hash not deterministic: %s != %s", h1, h2)
	}
}

func TestHashPromptDifferentInputs(t *testing.T) {
	h1, err := HashPrompt("prompt A")
	if err != nil {
		t.Fatalf("HashPrompt: %v", err)
	}
	h2, err := HashPrompt("prompt B")
	if err != nil {
		t.Fatalf("HashPrompt: %v", err)
	}
	if h1 == h2 {
		t.Error("different prompts produced same hash")
	}
}

func TestHashManifestFormat(t *testing.T) {
	m := &agent.Manifest{
		AgentID:        "test-agent",
		Name:           "Test",
		SystemPrompt:   "You are a test.",
		PresetID:       nil,
		Tier:           "custom",
		Model:          nil,
		ResponseLength: "standard",
		ResponseFormat: "plain",
		CreatedAt:      "2026-01-01T00:00:00.000Z",
		ParentID:       nil,
		OwnerID:        nil,
	}

	hash, err := HashManifest(m)
	if err != nil {
		t.Fatalf("HashManifest: %v", err)
	}
	if !strings.HasPrefix(hash, "0x") {
		t.Errorf("hash missing 0x prefix: %s", hash)
	}
	if len(hash) != 66 {
		t.Errorf("hash length = %d, want 66", len(hash))
	}
}

func TestHashManifestDeterministic(t *testing.T) {
	m := &agent.Manifest{
		AgentID:        "test-agent",
		Name:           "Test",
		SystemPrompt:   "You are a test.",
		PresetID:       nil,
		Tier:           "custom",
		Model:          nil,
		ResponseLength: "standard",
		ResponseFormat: "plain",
		CreatedAt:      "2026-01-01T00:00:00.000Z",
		ParentID:       nil,
		OwnerID:        nil,
	}

	h1, err := HashManifest(m)
	if err != nil {
		t.Fatalf("HashManifest: %v", err)
	}
	h2, err := HashManifest(m)
	if err != nil {
		t.Fatalf("HashManifest: %v", err)
	}
	if h1 != h2 {
		t.Errorf("hash not deterministic: %s != %s", h1, h2)
	}
}

func TestHashManifestDiffersFromPromptHash(t *testing.T) {
	prompt := "You are a test."
	promptHash, err := HashPrompt(prompt)
	if err != nil {
		t.Fatalf("HashPrompt: %v", err)
	}

	m := &agent.Manifest{
		AgentID:        "test",
		Name:           "Test",
		SystemPrompt:   prompt,
		Tier:           "custom",
		ResponseLength: "standard",
		ResponseFormat: "plain",
		CreatedAt:      "2026-01-01T00:00:00.000Z",
	}
	manifestHash, err := HashManifest(m)
	if err != nil {
		t.Fatalf("HashManifest: %v", err)
	}

	if promptHash == manifestHash {
		t.Error("prompt hash and manifest hash should differ")
	}
}

func TestBuildManifestDefaults(t *testing.T) {
	def := &agent.Definition{
		Name: "Test Agent",
		Tier: "custom",
	}

	m := BuildManifest("agent-123", "You are Test Agent.", def, "2026-01-01T00:00:00.000Z")

	if m.AgentID != "agent-123" {
		t.Errorf("AgentID = %q", m.AgentID)
	}
	if m.ResponseLength != "standard" {
		t.Errorf("ResponseLength = %q, want standard", m.ResponseLength)
	}
	if m.ResponseFormat != "plain" {
		t.Errorf("ResponseFormat = %q, want plain", m.ResponseFormat)
	}
	if m.PresetID != nil {
		t.Errorf("PresetID = %v, want nil", m.PresetID)
	}
	if m.Model != nil {
		t.Errorf("Model = %v, want nil", m.Model)
	}
}

func TestBuildManifestWithModel(t *testing.T) {
	def := &agent.Definition{
		Name:  "Test",
		Tier:  "premium",
		Model: "claude-sonnet-4-5",
	}

	m := BuildManifest("agent-456", "prompt", def, "2026-01-01T00:00:00.000Z")
	if m.Model == nil || *m.Model != "claude-sonnet-4-5" {
		t.Errorf("Model = %v, want claude-sonnet-4-5", m.Model)
	}
}

// This test verifies that the null-handling in JSON serialization
// matches the TypeScript pattern (null for missing optional fields).
func TestManifestNullFieldsSerialization(t *testing.T) {
	m := &agent.Manifest{
		AgentID:        "test",
		Name:           "Test",
		SystemPrompt:   "prompt",
		PresetID:       nil,
		Tier:           "custom",
		Model:          nil,
		ResponseLength: "standard",
		ResponseFormat: "plain",
		CreatedAt:      "2026-01-01T00:00:00.000Z",
		ParentID:       nil,
		OwnerID:        nil,
	}

	hash1, err := HashManifest(m)
	if err != nil {
		t.Fatalf("HashManifest: %v", err)
	}

	// Same manifest with empty strings instead of nil should produce
	// a DIFFERENT hash (null != "").
	s := ""
	m2 := &agent.Manifest{
		AgentID:        "test",
		Name:           "Test",
		SystemPrompt:   "prompt",
		PresetID:       &s,
		Tier:           "custom",
		Model:          &s,
		ResponseLength: "standard",
		ResponseFormat: "plain",
		CreatedAt:      "2026-01-01T00:00:00.000Z",
		ParentID:       &s,
		OwnerID:        &s,
	}

	hash2, err := HashManifest(m2)
	if err != nil {
		t.Fatalf("HashManifest: %v", err)
	}

	if hash1 == hash2 {
		t.Error("null fields and empty string fields should produce different hashes")
	}
}
