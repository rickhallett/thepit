// Cross-implementation parity tests for ABI encoding.
//
// These tests verify that the ABI encoder works correctly with
// real hash values produced by the dna package (which are verified
// against the TypeScript implementation in dna_parity_test.go).
// This creates a complete chain: TS hashes -> Go hashes -> ABI encoding.
package abi

import (
	"encoding/hex"
	"testing"
)

// TestEncodeDecodeWithRealHashes verifies the full pipeline using
// actual hash values that are verified to match the TS implementation.
func TestEncodeDecodeWithRealHashes(t *testing.T) {
	// These hashes are golden values from dna_parity_test.go,
	// verified to be byte-identical with lib/agent-dna.ts output.
	data := AttestationData{
		AgentID:      "agent-3",
		Name:         "Hashy",
		PresetID:     "",
		Tier:         "custom",
		PromptHash:   "0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80",
		ManifestHash: "0xaefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d",
		ParentID:     "",
		OwnerID:      "",
		CreatedAt:    1738972800, // 2026-02-08T00:00:00Z as unix
	}

	encoded, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	// Verify encoding is well-formed.
	if len(encoded)%32 != 0 {
		t.Errorf("encoded length %d is not a multiple of 32", len(encoded))
	}

	// Guard: encoded must be at least 192 bytes to contain both hash slots.
	if len(encoded) < 192 {
		t.Fatalf("encoded length %d is too short (need at least 192 bytes for hash slots)", len(encoded))
	}

	// Verify the bytes32 fields are at the correct positions.
	promptHashSlot := encoded[128:160]
	manifestHashSlot := encoded[160:192]

	wantPrompt := "f2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80"
	wantManifest := "aefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d"

	if hex.EncodeToString(promptHashSlot) != wantPrompt {
		t.Errorf("prompt hash slot = %s, want %s", hex.EncodeToString(promptHashSlot), wantPrompt)
	}
	if hex.EncodeToString(manifestHashSlot) != wantManifest {
		t.Errorf("manifest hash slot = %s, want %s", hex.EncodeToString(manifestHashSlot), wantManifest)
	}

	// Verify roundtrip.
	decoded, err := Decode(encoded)
	if err != nil {
		t.Fatalf("Decode: %v", err)
	}

	if decoded.AgentID != data.AgentID {
		t.Errorf("AgentID = %q, want %q", decoded.AgentID, data.AgentID)
	}
	if decoded.Name != data.Name {
		t.Errorf("Name = %q, want %q", decoded.Name, data.Name)
	}
	if decoded.Tier != data.Tier {
		t.Errorf("Tier = %q, want %q", decoded.Tier, data.Tier)
	}
	if decoded.PromptHash != data.PromptHash {
		t.Errorf("PromptHash = %q, want %q", decoded.PromptHash, data.PromptHash)
	}
	if decoded.ManifestHash != data.ManifestHash {
		t.Errorf("ManifestHash = %q, want %q", decoded.ManifestHash, data.ManifestHash)
	}
	if decoded.CreatedAt != data.CreatedAt {
		t.Errorf("CreatedAt = %d, want %d", decoded.CreatedAt, data.CreatedAt)
	}
}

// TestEncodeDecodeAgentOneHashes verifies with agent-1 golden values.
func TestEncodeDecodeAgentOneHashes(t *testing.T) {
	data := AttestationData{
		AgentID:      "agent-1",
		Name:         "Test Agent",
		PresetID:     "",
		Tier:         "free",
		PromptHash:   "0x82d87bd74898f678397803acffe9f572ce39b28273d8e41dc8aa9d00eb7a4767",
		ManifestHash: "0x3a646626e32aa6ac52d431ad52131f915dd7087f06d7da5909e79d5e55443849",
		ParentID:     "",
		OwnerID:      "",
		CreatedAt:    1738972800,
	}

	encoded, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	decoded, err := Decode(encoded)
	if err != nil {
		t.Fatalf("Decode: %v", err)
	}

	if decoded.PromptHash != data.PromptHash {
		t.Errorf("PromptHash roundtrip failed: got %s, want %s", decoded.PromptHash, data.PromptHash)
	}
	if decoded.ManifestHash != data.ManifestHash {
		t.Errorf("ManifestHash roundtrip failed: got %s, want %s", decoded.ManifestHash, data.ManifestHash)
	}
}

// TestEncodeDeterministic verifies that encoding the same data twice
// produces byte-identical output.
func TestEncodeDeterministic(t *testing.T) {
	data := AttestationData{
		AgentID:      "agent-deterministic",
		Name:         "Determinism Test",
		PresetID:     "preset-1",
		Tier:         "premium",
		PromptHash:   "0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80",
		ManifestHash: "0xaefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d",
		ParentID:     "parent-1",
		OwnerID:      "owner-1",
		CreatedAt:    1738972800,
	}

	enc1, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode 1: %v", err)
	}

	enc2, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode 2: %v", err)
	}

	if hex.EncodeToString(enc1) != hex.EncodeToString(enc2) {
		t.Error("encoding is not deterministic: two identical inputs produced different output")
	}
}
