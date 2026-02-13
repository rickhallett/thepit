package abi

import (
	"encoding/hex"
	"strings"
	"testing"
)

func h(rep string, n int) string {
	return "0x" + strings.Repeat(rep, n)
}

func TestIsValidBytes32(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"0xab", false},                          // too short
		{h("ab", 32), true},                      // valid
		{h("00", 32), true},                      // all zeros
		{h("ff", 32), true},                      // all f's
		{"0x" + strings.Repeat("gg", 32), false}, // invalid hex chars
		{strings.Repeat("00", 32), false},        // missing 0x prefix
		{"0x" + strings.Repeat("0", 63), false},  // too short
		{"0x" + strings.Repeat("0", 65), false},  // too long
		{"", false},                              // empty
	}
	for _, tt := range tests {
		got := IsValidBytes32(tt.input)
		if got != tt.want {
			t.Errorf("IsValidBytes32(%q) = %v, want %v", tt.input, got, tt.want)
		}
	}
}

func TestEncodeDecodeRoundTrip(t *testing.T) {
	data := AttestationData{
		AgentID:      "agent-123",
		Name:         "The Dialectician",
		PresetID:     "socratic-method",
		Tier:         "pro",
		PromptHash:   h("aa", 32),
		ManifestHash: h("bb", 32),
		ParentID:     "parent-456",
		OwnerID:      "user_abc",
		CreatedAt:    1700000000,
	}

	encoded, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

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
	if decoded.PresetID != data.PresetID {
		t.Errorf("PresetID = %q, want %q", decoded.PresetID, data.PresetID)
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
	if decoded.ParentID != data.ParentID {
		t.Errorf("ParentID = %q, want %q", decoded.ParentID, data.ParentID)
	}
	if decoded.OwnerID != data.OwnerID {
		t.Errorf("OwnerID = %q, want %q", decoded.OwnerID, data.OwnerID)
	}
	if decoded.CreatedAt != data.CreatedAt {
		t.Errorf("CreatedAt = %d, want %d", decoded.CreatedAt, data.CreatedAt)
	}
}

func TestEncodeEmptyStrings(t *testing.T) {
	data := AttestationData{
		AgentID:      "",
		Name:         "",
		PresetID:     "",
		Tier:         "",
		PromptHash:   h("00", 32),
		ManifestHash: h("00", 32),
		ParentID:     "",
		OwnerID:      "",
		CreatedAt:    0,
	}

	encoded, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	decoded, err := Decode(encoded)
	if err != nil {
		t.Fatalf("Decode: %v", err)
	}

	if decoded.AgentID != "" {
		t.Errorf("AgentID should be empty, got %q", decoded.AgentID)
	}
	if decoded.CreatedAt != 0 {
		t.Errorf("CreatedAt should be 0, got %d", decoded.CreatedAt)
	}
}

func TestEncodeInvalidPromptHash(t *testing.T) {
	data := AttestationData{
		PromptHash:   "invalid",
		ManifestHash: h("00", 32),
	}
	_, err := Encode(data)
	if err == nil {
		t.Error("expected error for invalid promptHash")
	}
}

func TestEncodeInvalidManifestHash(t *testing.T) {
	data := AttestationData{
		PromptHash:   h("00", 32),
		ManifestHash: "not-a-hash",
	}
	_, err := Encode(data)
	if err == nil {
		t.Error("expected error for invalid manifestHash")
	}
}

func TestDecodeTooShort(t *testing.T) {
	_, err := Decode(make([]byte, 100))
	if err == nil {
		t.Error("expected error for short data")
	}
}

func TestEncodeProducesValidHex(t *testing.T) {
	data := AttestationData{
		AgentID:      "test",
		Name:         "Test Agent",
		PresetID:     "preset-1",
		Tier:         "free",
		PromptHash:   h("ab", 32),
		ManifestHash: h("cd", 32),
		ParentID:     "",
		OwnerID:      "user_1",
		CreatedAt:    1700000000,
	}

	encoded, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	// Should be valid hex.
	hexStr := hex.EncodeToString(encoded)
	if len(hexStr) == 0 {
		t.Error("encoded data should not be empty")
	}

	// Length should be multiple of 32.
	if len(encoded)%32 != 0 {
		t.Errorf("encoded length %d is not a multiple of 32", len(encoded))
	}
}

func TestEncodeBytes32FieldsInline(t *testing.T) {
	promptHash := h("aa", 32)
	manifestHash := h("bb", 32)

	data := AttestationData{
		PromptHash:   promptHash,
		ManifestHash: manifestHash,
	}

	encoded, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	// Fields 4 and 5 (0-indexed) are at byte offsets 128 and 160.
	slot4 := encoded[128:160]
	slot5 := encoded[160:192]

	if "0x"+hex.EncodeToString(slot4) != promptHash {
		t.Errorf("slot 4 = 0x%s, want %s", hex.EncodeToString(slot4), promptHash)
	}
	if "0x"+hex.EncodeToString(slot5) != manifestHash {
		t.Errorf("slot 5 = 0x%s, want %s", hex.EncodeToString(slot5), manifestHash)
	}
}

func TestSchemaString(t *testing.T) {
	expected := "string agentId,string name,string presetId,string tier,bytes32 promptHash,bytes32 manifestHash,string parentId,string ownerId,uint64 createdAt"
	if SchemaString != expected {
		t.Errorf("SchemaString mismatch:\n  got:  %s\n  want: %s", SchemaString, expected)
	}
}
