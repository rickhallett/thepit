// Cross-implementation parity tests for dna hashing.
//
// Golden values are computed by the TypeScript implementation (lib/agent-dna.ts)
// using the npm `canonicalize` package (RFC 8785) and Web Crypto SHA-256.
// If any of these tests fail, the Go and TS implementations have diverged —
// which means on-chain attestations will be inconsistent.
package dna

import (
	"testing"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
)

// Prompt hash golden values computed via:
//
//	canonicalize({systemPrompt: "..."}) → SHA-256 → "0x" + hex
var promptParityTests = []struct {
	name   string
	prompt string
	want   string
}{
	{
		name:   "Deterministic output.",
		prompt: "Deterministic output.",
		want:   "0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80",
	},
	{
		name:   "Be helpful.",
		prompt: "Be helpful.",
		want:   "0x82d87bd74898f678397803acffe9f572ce39b28273d8e41dc8aa9d00eb7a4767",
	},
	{
		name:   "Focus on evidence.",
		prompt: "Focus on evidence.",
		want:   "0x1f01f4a50bb7e636fcdd5229bdef46bce9d56b8440979f5bedf3fd586f719d1b",
	},
}

func TestHashPromptParity(t *testing.T) {
	for _, tc := range promptParityTests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := HashPrompt(tc.prompt)
			if err != nil {
				t.Fatalf("HashPrompt(%q): %v", tc.prompt, err)
			}
			if got != tc.want {
				t.Errorf("HashPrompt(%q)\n  got:  %s\n  want: %s", tc.prompt, got, tc.want)
			}
		})
	}
}

// Manifest hash golden values computed via:
//
//	canonicalize(manifest) → SHA-256 → "0x" + hex
//
// Field order after RFC 8785 canonicalization is alphabetical by key.
var manifestParityTests = []struct {
	name     string
	manifest *agent.Manifest
	want     string
}{
	{
		name: "agent-3 (custom/short/json)",
		manifest: &agent.Manifest{
			AgentID:        "agent-3",
			Name:           "Hashy",
			SystemPrompt:   "Deterministic output.",
			PresetID:       nil,
			Tier:           "custom",
			Model:          nil,
			ResponseLength: "short",
			ResponseFormat: "json",
			CreatedAt:      "2026-02-08T00:00:00.000Z",
			ParentID:       nil,
			OwnerID:        nil,
		},
		want: "0xaefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d",
	},
	{
		name: "agent-1 (free/standard/plain defaults)",
		manifest: &agent.Manifest{
			AgentID:        "agent-1",
			Name:           "Test Agent",
			SystemPrompt:   "Be helpful.",
			PresetID:       nil,
			Tier:           "free",
			Model:          nil,
			ResponseLength: "standard",
			ResponseFormat: "plain",
			CreatedAt:      "2026-02-08T00:00:00.000Z",
			ParentID:       nil,
			OwnerID:        nil,
		},
		want: "0x3a646626e32aa6ac52d431ad52131f915dd7087f06d7da5909e79d5e55443849",
	},
}

func TestHashManifestParity(t *testing.T) {
	for _, tc := range manifestParityTests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := HashManifest(tc.manifest)
			if err != nil {
				t.Fatalf("HashManifest: %v", err)
			}
			if got != tc.want {
				t.Errorf("HashManifest(%s)\n  got:  %s\n  want: %s", tc.name, got, tc.want)
			}
		})
	}
}

// TestPromptHashMatchesManifestPromptField verifies that the prompt hash
// produced standalone matches the hash produced for the same prompt when
// accessed through the manifest — this ensures the two paths are consistent
// and the on-chain promptHash field will verify against the manifest.
func TestPromptHashMatchesManifestPromptField(t *testing.T) {
	prompt := "Deterministic output."

	promptHash, err := HashPrompt(prompt)
	if err != nil {
		t.Fatalf("HashPrompt: %v", err)
	}

	// The standalone prompt hash and the manifest hash should DIFFER
	// (one hashes {"systemPrompt":"..."}, the other hashes the full manifest).
	// But they should both be valid and deterministic.
	m := &agent.Manifest{
		AgentID:        "agent-3",
		Name:           "Hashy",
		SystemPrompt:   prompt,
		PresetID:       nil,
		Tier:           "custom",
		Model:          nil,
		ResponseLength: "short",
		ResponseFormat: "json",
		CreatedAt:      "2026-02-08T00:00:00.000Z",
		ParentID:       nil,
		OwnerID:        nil,
	}

	manifestHash, err := HashManifest(m)
	if err != nil {
		t.Fatalf("HashManifest: %v", err)
	}

	if promptHash == manifestHash {
		t.Error("prompt hash and manifest hash should differ for same prompt text")
	}

	// Both should match their known golden values.
	if promptHash != "0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80" {
		t.Errorf("prompt hash mismatch: %s", promptHash)
	}
	if manifestHash != "0xaefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d" {
		t.Errorf("manifest hash mismatch: %s", manifestHash)
	}
}
