// Package dna implements deterministic agent identity hashing,
// a faithful Go port of lib/agent-dna.ts.
//
// Two hashes per agent:
//   - promptHash: SHA-256 of canonicalized {"systemPrompt": "..."}
//   - manifestHash: SHA-256 of canonicalized full AgentManifest
//
// Both return 0x-prefixed hex strings identical to the TypeScript implementation.
package dna

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
	"github.com/rickhallett/thepit/pitforge/internal/canon"
)

// HashPrompt computes the prompt hash: sha256(canonicalize({"systemPrompt": prompt})).
// This matches lib/agent-dna.ts hashAgentPrompt().
func HashPrompt(systemPrompt string) (string, error) {
	obj := map[string]string{"systemPrompt": systemPrompt}
	jsonBytes, err := json.Marshal(obj)
	if err != nil {
		return "", fmt.Errorf("marshaling prompt object: %w", err)
	}

	canonical, err := canon.Canonicalize(jsonBytes)
	if err != nil {
		return "", fmt.Errorf("canonicalizing prompt: %w", err)
	}

	hash := sha256.Sum256(canonical)
	return "0x" + hex.EncodeToString(hash[:]), nil
}

// HashManifest computes the manifest hash: sha256(canonicalize(manifest)).
// This matches lib/agent-dna.ts hashAgentManifest().
func HashManifest(m *agent.Manifest) (string, error) {
	if m == nil {
		return "", fmt.Errorf("manifest is nil")
	}
	jsonBytes, err := json.Marshal(m)
	if err != nil {
		return "", fmt.Errorf("marshaling manifest: %w", err)
	}

	canonical, err := canon.Canonicalize(jsonBytes)
	if err != nil {
		return "", fmt.Errorf("canonicalizing manifest: %w", err)
	}

	hash := sha256.Sum256(canonical)
	return "0x" + hex.EncodeToString(hash[:]), nil
}

// BuildManifest creates an AgentManifest from a Definition with the provided metadata.
// This matches lib/agent-dna.ts buildAgentManifest().
func BuildManifest(
	agentID string,
	systemPrompt string,
	def *agent.Definition,
	createdAt string,
) *agent.Manifest {
	m := &agent.Manifest{
		AgentID:        agentID,
		Name:           def.Name,
		SystemPrompt:   systemPrompt,
		PresetID:       nil, // custom agents have no preset
		Tier:           def.Tier,
		Model:          nilIfEmpty(def.Model),
		ResponseLength: defaultIfEmpty(def.ResponseLength, "standard"),
		ResponseFormat: defaultIfEmpty(def.ResponseFormat, "plain"),
		CreatedAt:      createdAt,
		ParentID:       nil,
		OwnerID:        nil,
	}
	return m
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func defaultIfEmpty(s, def string) string {
	if s == "" {
		return def
	}
	return s
}
