// Cryptographic Integrity Test Suite — Go ABI Layer
//
// These tests exercise attack scenarios against the Go ABI encoding/decoding
// implementation. They complement the TypeScript tests in
// tests/unit/crypto-integrity.test.ts and together cover the full pipeline.
//
// Each test has a name starting with "TestIntegrity" for targeted execution:
//
//	go test -v -run Integrity ./internal/abi/
package abi

import (
	"encoding/hex"
	"strings"
	"testing"
)

// ===========================================================================
// SCENARIO 1: ABI Encode/Decode Round-Trip Integrity
// ===========================================================================
// Attack: ABI encoding silently corrupts a field (e.g., truncates a string,
// swaps hash bytes, loses precision on uint64). After encoding and decoding,
// the data no longer matches the input. An attestation written on-chain would
// contain garbage that doesn't match the agent's real identity.
//
// Proves: Every field survives the encode → decode round-trip with
// byte-identical values, across multiple diverse inputs.
// ===========================================================================

func TestIntegrityABIRoundTrip(t *testing.T) {
	cases := []struct {
		name string
		data AttestationData
	}{
		{
			name: "all fields populated",
			data: AttestationData{
				AgentID:      "agent-roundtrip-001",
				Name:         "Round Trip Agent",
				PresetID:     "preset-roundtrip",
				Tier:         "premium",
				PromptHash:   "0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80",
				ManifestHash: "0xaefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d",
				ParentID:     "parent-roundtrip",
				OwnerID:      "user_roundtrip_owner",
				CreatedAt:    1738972800,
			},
		},
		{
			name: "empty optional strings",
			data: AttestationData{
				AgentID:      "agent-empty",
				Name:         "Empty Fields Agent",
				PresetID:     "",
				Tier:         "free",
				PromptHash:   "0x0000000000000000000000000000000000000000000000000000000000000001",
				ManifestHash: "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe",
				ParentID:     "",
				OwnerID:      "",
				CreatedAt:    0,
			},
		},
		{
			name: "max uint64 createdAt",
			data: AttestationData{
				AgentID:      "agent-max-ts",
				Name:         "Max Timestamp",
				PresetID:     "",
				Tier:         "custom",
				PromptHash:   "0x" + strings.Repeat("ab", 32),
				ManifestHash: "0x" + strings.Repeat("cd", 32),
				ParentID:     "",
				OwnerID:      "",
				CreatedAt:    18446744073709551615, // max uint64
			},
		},
		{
			name: "long strings",
			data: AttestationData{
				AgentID:      strings.Repeat("a", 200),
				Name:         strings.Repeat("b", 500),
				PresetID:     strings.Repeat("c", 100),
				Tier:         "premium",
				PromptHash:   "0x1111111111111111111111111111111111111111111111111111111111111111",
				ManifestHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
				ParentID:     strings.Repeat("d", 300),
				OwnerID:      strings.Repeat("e", 150),
				CreatedAt:    1700000000,
			},
		},
		{
			name: "unicode strings",
			data: AttestationData{
				AgentID:      "agent-\u6d77\u5fc3",
				Name:         "\U0001F525 Fire Agent \U0001F4A5",
				PresetID:     "\u00e9\u00e8\u00ea\u00eb",
				Tier:         "custom",
				PromptHash:   "0x3333333333333333333333333333333333333333333333333333333333333333",
				ManifestHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
				ParentID:     "\u0430\u0431\u0432", // Cyrillic
				OwnerID:      "user_\u00fc\u00f6\u00e4",
				CreatedAt:    1738972800,
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			encoded, err := Encode(tc.data)
			if err != nil {
				t.Fatalf("Encode: %v", err)
			}

			decoded, err := Decode(encoded)
			if err != nil {
				t.Fatalf("Decode: %v", err)
			}

			if decoded.AgentID != tc.data.AgentID {
				t.Errorf("AgentID: got %q, want %q", decoded.AgentID, tc.data.AgentID)
			}
			if decoded.Name != tc.data.Name {
				t.Errorf("Name: got %q, want %q", decoded.Name, tc.data.Name)
			}
			if decoded.PresetID != tc.data.PresetID {
				t.Errorf("PresetID: got %q, want %q", decoded.PresetID, tc.data.PresetID)
			}
			if decoded.Tier != tc.data.Tier {
				t.Errorf("Tier: got %q, want %q", decoded.Tier, tc.data.Tier)
			}
			if decoded.PromptHash != tc.data.PromptHash {
				t.Errorf("PromptHash: got %q, want %q", decoded.PromptHash, tc.data.PromptHash)
			}
			if decoded.ManifestHash != tc.data.ManifestHash {
				t.Errorf("ManifestHash: got %q, want %q", decoded.ManifestHash, tc.data.ManifestHash)
			}
			if decoded.ParentID != tc.data.ParentID {
				t.Errorf("ParentID: got %q, want %q", decoded.ParentID, tc.data.ParentID)
			}
			if decoded.OwnerID != tc.data.OwnerID {
				t.Errorf("OwnerID: got %q, want %q", decoded.OwnerID, tc.data.OwnerID)
			}
			if decoded.CreatedAt != tc.data.CreatedAt {
				t.Errorf("CreatedAt: got %d, want %d", decoded.CreatedAt, tc.data.CreatedAt)
			}
		})
	}
}

// ===========================================================================
// SCENARIO 2: ABI Encoding Rejects Malformed Hashes
// ===========================================================================
// Attack: An adversary passes a malformed hash (wrong length, missing prefix,
// non-hex characters) to the ABI encoder. If the encoder silently accepts
// garbage, the on-chain attestation contains invalid data that can never be
// verified — but it LOOKS valid because it's on-chain.
//
// Proves: The ABI encoder validates bytes32 inputs and rejects malformed ones
// with an explicit error.
// ===========================================================================

func TestIntegrityABIRejectsMalformedHashes(t *testing.T) {
	validHash := "0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80"

	malformed := []struct {
		name         string
		promptHash   string
		manifestHash string
	}{
		{"missing 0x prefix on promptHash", "f2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80", validHash},
		{"missing 0x prefix on manifestHash", validHash, "aefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d"},
		{"too short promptHash", "0xabcd", validHash},
		{"too short manifestHash", validHash, "0xabcd"},
		{"too long promptHash", "0x" + strings.Repeat("a", 66), validHash},
		{"too long manifestHash", validHash, "0x" + strings.Repeat("b", 66)},
		{"non-hex chars in promptHash", "0x" + strings.Repeat("g", 64), validHash},
		{"non-hex chars in manifestHash", validHash, "0x" + strings.Repeat("z", 64)},
		{"empty promptHash", "", validHash},
		{"empty manifestHash", validHash, ""},
	}

	for _, tc := range malformed {
		t.Run(tc.name, func(t *testing.T) {
			data := AttestationData{
				AgentID:      "agent-malformed",
				Name:         "Malformed Hash Test",
				PresetID:     "",
				Tier:         "free",
				PromptHash:   tc.promptHash,
				ManifestHash: tc.manifestHash,
				ParentID:     "",
				OwnerID:      "",
				CreatedAt:    1738972800,
			}

			_, err := Encode(data)
			if err == nil {
				t.Errorf("expected error for malformed hash, got nil")
			}
		})
	}
}

// ===========================================================================
// SCENARIO 3: ABI Encoding Determinism
// ===========================================================================
// Attack: The ABI encoder uses non-deterministic memory allocation or map
// iteration order, producing different byte sequences for the same input.
// This would mean the same attestation data could produce different on-chain
// representations, breaking verification.
//
// Proves: 1000 consecutive encodings of the same data produce byte-identical
// output.
// ===========================================================================

func TestIntegrityABIEncodingDeterminism1000(t *testing.T) {
	data := AttestationData{
		AgentID:      "agent-determinism",
		Name:         "Determinism 1000",
		PresetID:     "preset-det",
		Tier:         "premium",
		PromptHash:   "0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80",
		ManifestHash: "0xaefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d",
		ParentID:     "parent-det",
		OwnerID:      "owner-det",
		CreatedAt:    1738972800,
	}

	reference, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode reference: %v", err)
	}
	refHex := hex.EncodeToString(reference)

	for i := 0; i < 1000; i++ {
		enc, err := Encode(data)
		if err != nil {
			t.Fatalf("Encode iteration %d: %v", i, err)
		}
		if hex.EncodeToString(enc) != refHex {
			t.Fatalf("iteration %d produced different output", i)
		}
	}
}

// ===========================================================================
// SCENARIO 4: ABI Decode Rejects Truncated Data
// ===========================================================================
// Attack: An adversary provides truncated ABI data (e.g., from a corrupted
// RPC response or a man-in-the-middle attack that clips the payload). If the
// decoder doesn't validate length, it could read garbage from adjacent memory
// or produce partial data that looks valid.
//
// Proves: The decoder rejects data shorter than the minimum required size
// (9 fields × 32 bytes = 288 bytes).
// ===========================================================================

func TestIntegrityABIDecodeRejectsTruncated(t *testing.T) {
	// Encode valid data first
	data := AttestationData{
		AgentID:      "agent-truncate",
		Name:         "Truncate Test",
		PresetID:     "",
		Tier:         "free",
		PromptHash:   "0x0000000000000000000000000000000000000000000000000000000000000001",
		ManifestHash: "0x0000000000000000000000000000000000000000000000000000000000000002",
		ParentID:     "",
		OwnerID:      "",
		CreatedAt:    1738972800,
	}

	encoded, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	// Try decoding progressively truncated versions
	truncations := []int{0, 1, 31, 32, 100, 287}
	for _, n := range truncations {
		if n > len(encoded) {
			continue
		}
		_, err := Decode(encoded[:n])
		if err == nil {
			t.Errorf("expected error decoding %d bytes (of %d), got nil", n, len(encoded))
		}
	}
}

// ===========================================================================
// SCENARIO 5: ABI Bytes32 Slot Position Integrity
// ===========================================================================
// Attack: The encoder places promptHash and manifestHash at wrong byte
// positions. If the Go encoder puts them at offset 96 instead of 128, or
// swaps them, the TS decoder reads the wrong data. Cross-implementation
// verification silently fails.
//
// Proves: promptHash occupies bytes [128:160] and manifestHash occupies
// bytes [160:192] in the encoded output (fields 4 and 5 of 9).
// ===========================================================================

func TestIntegrityABIHashSlotPositions(t *testing.T) {
	data := AttestationData{
		AgentID:      "agent-slots",
		Name:         "Slot Position Test",
		PresetID:     "",
		Tier:         "free",
		PromptHash:   "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		ManifestHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		ParentID:     "",
		OwnerID:      "",
		CreatedAt:    1,
	}

	encoded, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	// Fields: 0=agentId(off), 1=name(off), 2=presetId(off), 3=tier(off),
	//         4=promptHash(bytes32), 5=manifestHash(bytes32),
	//         6=parentId(off), 7=ownerId(off), 8=createdAt(uint64)
	//
	// Each slot is 32 bytes. promptHash is at slot 4 (byte 128), manifestHash at slot 5 (byte 160).
	if len(encoded) < 192 {
		t.Fatalf("encoded too short: %d bytes", len(encoded))
	}

	promptSlot := encoded[128:160]
	manifestSlot := encoded[160:192]

	wantPrompt := strings.Repeat("aa", 32)
	wantManifest := strings.Repeat("bb", 32)

	if hex.EncodeToString(promptSlot) != wantPrompt {
		t.Errorf("promptHash at wrong position or wrong value: got %s, want %s",
			hex.EncodeToString(promptSlot), wantPrompt)
	}
	if hex.EncodeToString(manifestSlot) != wantManifest {
		t.Errorf("manifestHash at wrong position or wrong value: got %s, want %s",
			hex.EncodeToString(manifestSlot), wantManifest)
	}

	// Verify they're not swapped: decode and check
	decoded, err := Decode(encoded)
	if err != nil {
		t.Fatalf("Decode: %v", err)
	}
	if decoded.PromptHash != data.PromptHash {
		t.Errorf("decoded PromptHash = %q, want %q (possible swap)", decoded.PromptHash, data.PromptHash)
	}
	if decoded.ManifestHash != data.ManifestHash {
		t.Errorf("decoded ManifestHash = %q, want %q (possible swap)", decoded.ManifestHash, data.ManifestHash)
	}
}

// ===========================================================================
// SCENARIO 6: Schema String Parity with TypeScript
// ===========================================================================
// Attack: Someone edits the Go schema constant but forgets to update TS (or
// vice versa). The two implementations silently diverge. Attestations created
// by one can't be decoded by the other.
//
// Proves: The Go SchemaString constant exactly matches the known canonical
// schema used by lib/eas.ts.
// ===========================================================================

func TestIntegritySchemaStringParity(t *testing.T) {
	// This is the exact string from lib/eas.ts EAS_SCHEMA_STRING
	expected := "string agentId,string name,string presetId,string tier,bytes32 promptHash,bytes32 manifestHash,string parentId,string ownerId,uint64 createdAt"

	if SchemaString != expected {
		t.Errorf("SchemaString mismatch\n  Go: %q\n  TS: %q", SchemaString, expected)
	}

	// Verify field count
	fields := strings.Split(SchemaString, ",")
	if len(fields) != 9 {
		t.Errorf("expected 9 fields, got %d", len(fields))
	}
}

// ===========================================================================
// SCENARIO 7: IsValidBytes32 Boundary Cases
// ===========================================================================
// Attack: The bytes32 validator has off-by-one errors or doesn't catch edge
// cases. Malformed hashes pass validation and enter the pipeline, causing
// silent data corruption downstream.
//
// Proves: The validator correctly accepts valid hashes and rejects all
// categories of invalid input.
// ===========================================================================

func TestIntegrityIsValidBytes32Boundaries(t *testing.T) {
	valid := []string{
		"0x0000000000000000000000000000000000000000000000000000000000000000",
		"0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
		"0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
		"0xABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789",
	}
	for _, v := range valid {
		if !IsValidBytes32(v) {
			t.Errorf("IsValidBytes32(%q) = false, want true", v)
		}
	}

	invalid := []string{
		"",
		"0x",
		"0x0",
		"0x" + strings.Repeat("a", 63), // 65 chars (1 short)
		"0x" + strings.Repeat("a", 65), // 67 chars (1 long)
		strings.Repeat("a", 64),        // no prefix
		"0x" + strings.Repeat("g", 64), // non-hex
		"0x" + strings.Repeat("z", 64), // non-hex
		"1x" + strings.Repeat("a", 64), // wrong prefix
		"0X" + strings.Repeat("a", 64), // uppercase X prefix
	}
	for _, v := range invalid {
		if IsValidBytes32(v) {
			t.Errorf("IsValidBytes32(%q) = true, want false", v)
		}
	}
}

// ===========================================================================
// SCENARIO 8: ABI Encoding Alignment (32-byte boundary)
// ===========================================================================
// Attack: The ABI encoder produces output that isn't aligned to 32-byte
// boundaries. The EVM reads in 32-byte words; misaligned data causes the
// EAS contract to misinterpret the payload. Everything looks fine off-chain
// but on-chain decoding fails silently.
//
// Proves: Every encoding output length is a multiple of 32 bytes.
// ===========================================================================

func TestIntegrityABIAlignmentMultipleOf32(t *testing.T) {
	cases := []AttestationData{
		{AgentID: "", Name: "", PresetID: "", Tier: "", PromptHash: "0x" + strings.Repeat("00", 32), ManifestHash: "0x" + strings.Repeat("00", 32), ParentID: "", OwnerID: "", CreatedAt: 0},
		{AgentID: "a", Name: "b", PresetID: "c", Tier: "d", PromptHash: "0x" + strings.Repeat("11", 32), ManifestHash: "0x" + strings.Repeat("22", 32), ParentID: "e", OwnerID: "f", CreatedAt: 1},
		{AgentID: strings.Repeat("x", 31), Name: strings.Repeat("y", 32), PresetID: strings.Repeat("z", 33), Tier: "premium", PromptHash: "0x" + strings.Repeat("ab", 32), ManifestHash: "0x" + strings.Repeat("cd", 32), ParentID: strings.Repeat("w", 64), OwnerID: strings.Repeat("v", 65), CreatedAt: 999999999},
	}

	for i, data := range cases {
		encoded, err := Encode(data)
		if err != nil {
			t.Fatalf("case %d: Encode: %v", i, err)
		}
		if len(encoded)%32 != 0 {
			t.Errorf("case %d: encoded length %d is not a multiple of 32", i, len(encoded))
		}
	}
}

// ===========================================================================
// SCENARIO 9: Single-Field Change Detection in ABI Encoding
// ===========================================================================
// Attack: The ABI encoder has a bug where changing one field doesn't change
// the encoded output (e.g., a field is silently ignored or overwritten by
// another). This would mean different agents produce identical attestations.
//
// Proves: Changing any single field in the attestation data produces a
// different encoded byte sequence.
// ===========================================================================

func TestIntegritySingleFieldChangeDetection(t *testing.T) {
	base := AttestationData{
		AgentID:      "agent-field-test",
		Name:         "Field Test",
		PresetID:     "preset-f",
		Tier:         "premium",
		PromptHash:   "0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80",
		ManifestHash: "0xaefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d",
		ParentID:     "parent-f",
		OwnerID:      "owner-f",
		CreatedAt:    1738972800,
	}

	baseEncoded, err := Encode(base)
	if err != nil {
		t.Fatalf("Encode base: %v", err)
	}
	baseHex := hex.EncodeToString(baseEncoded)

	variants := []struct {
		name string
		data AttestationData
	}{
		{"AgentID", AttestationData{AgentID: "agent-field-test-CHANGED", Name: base.Name, PresetID: base.PresetID, Tier: base.Tier, PromptHash: base.PromptHash, ManifestHash: base.ManifestHash, ParentID: base.ParentID, OwnerID: base.OwnerID, CreatedAt: base.CreatedAt}},
		{"Name", AttestationData{AgentID: base.AgentID, Name: "Field Test CHANGED", PresetID: base.PresetID, Tier: base.Tier, PromptHash: base.PromptHash, ManifestHash: base.ManifestHash, ParentID: base.ParentID, OwnerID: base.OwnerID, CreatedAt: base.CreatedAt}},
		{"PresetID", AttestationData{AgentID: base.AgentID, Name: base.Name, PresetID: "preset-CHANGED", Tier: base.Tier, PromptHash: base.PromptHash, ManifestHash: base.ManifestHash, ParentID: base.ParentID, OwnerID: base.OwnerID, CreatedAt: base.CreatedAt}},
		{"Tier", AttestationData{AgentID: base.AgentID, Name: base.Name, PresetID: base.PresetID, Tier: "free", PromptHash: base.PromptHash, ManifestHash: base.ManifestHash, ParentID: base.ParentID, OwnerID: base.OwnerID, CreatedAt: base.CreatedAt}},
		{"PromptHash", AttestationData{AgentID: base.AgentID, Name: base.Name, PresetID: base.PresetID, Tier: base.Tier, PromptHash: "0x0000000000000000000000000000000000000000000000000000000000000001", ManifestHash: base.ManifestHash, ParentID: base.ParentID, OwnerID: base.OwnerID, CreatedAt: base.CreatedAt}},
		{"ManifestHash", AttestationData{AgentID: base.AgentID, Name: base.Name, PresetID: base.PresetID, Tier: base.Tier, PromptHash: base.PromptHash, ManifestHash: "0x0000000000000000000000000000000000000000000000000000000000000002", ParentID: base.ParentID, OwnerID: base.OwnerID, CreatedAt: base.CreatedAt}},
		{"ParentID", AttestationData{AgentID: base.AgentID, Name: base.Name, PresetID: base.PresetID, Tier: base.Tier, PromptHash: base.PromptHash, ManifestHash: base.ManifestHash, ParentID: "parent-CHANGED", OwnerID: base.OwnerID, CreatedAt: base.CreatedAt}},
		{"OwnerID", AttestationData{AgentID: base.AgentID, Name: base.Name, PresetID: base.PresetID, Tier: base.Tier, PromptHash: base.PromptHash, ManifestHash: base.ManifestHash, ParentID: base.ParentID, OwnerID: "owner-CHANGED", CreatedAt: base.CreatedAt}},
		{"CreatedAt", AttestationData{AgentID: base.AgentID, Name: base.Name, PresetID: base.PresetID, Tier: base.Tier, PromptHash: base.PromptHash, ManifestHash: base.ManifestHash, ParentID: base.ParentID, OwnerID: base.OwnerID, CreatedAt: 9999999999}},
	}

	for _, v := range variants {
		t.Run(v.name, func(t *testing.T) {
			enc, err := Encode(v.data)
			if err != nil {
				t.Fatalf("Encode: %v", err)
			}
			if hex.EncodeToString(enc) == baseHex {
				t.Errorf("changing %s did not change the encoded output", v.name)
			}
		})
	}
}

// ===========================================================================
// SCENARIO 10: Cross-Decode Tampering Detection
// ===========================================================================
// Attack: An adversary takes a valid encoded attestation, modifies a single
// byte in the hash slots, and submits/replays it. If the decoder doesn't
// preserve exact bytes, the modified hash might decode to the original value
// (e.g., if only certain bits are read).
//
// Proves: Flipping a single byte in either hash slot of the encoded data
// produces a different decoded hash value.
// ===========================================================================

func TestIntegrityCrossDecodeTamperingDetection(t *testing.T) {
	data := AttestationData{
		AgentID:      "agent-tamper",
		Name:         "Tamper Detection",
		PresetID:     "",
		Tier:         "free",
		PromptHash:   "0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80",
		ManifestHash: "0xaefa987e8e894a687d9ee3f836442241ed11f37cb2547ec16145d7aefc102e6d",
		ParentID:     "",
		OwnerID:      "",
		CreatedAt:    1738972800,
	}

	encoded, err := Encode(data)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	// Decode the original to get baseline
	original, err := Decode(encoded)
	if err != nil {
		t.Fatalf("Decode original: %v", err)
	}

	// Tamper with promptHash slot (byte 128 = first byte of slot 4)
	tampered := make([]byte, len(encoded))
	copy(tampered, encoded)
	tampered[128] ^= 0x01 // flip one bit

	decoded, err := Decode(tampered)
	if err != nil {
		t.Fatalf("Decode tampered promptHash: %v", err)
	}
	if decoded.PromptHash == original.PromptHash {
		t.Error("tampering with promptHash byte did not change decoded PromptHash")
	}

	// Tamper with manifestHash slot (byte 160 = first byte of slot 5)
	copy(tampered, encoded)
	tampered[160] ^= 0x01

	decoded, err = Decode(tampered)
	if err != nil {
		t.Fatalf("Decode tampered manifestHash: %v", err)
	}
	if decoded.ManifestHash == original.ManifestHash {
		t.Error("tampering with manifestHash byte did not change decoded ManifestHash")
	}

	// Tamper with createdAt slot. Slot 8 spans bytes [256:288].
	// createdAt is a uint64 stored big-endian in a 32-byte slot, so the
	// significant bytes are at the end (bytes 280–287). Flipping a leading
	// zero byte at 256 won't change the uint64 value — we must flip a byte
	// in the significant region.
	copy(tampered, encoded)
	tampered[287] ^= 0x01 // last byte of slot 8 (LSB of the uint64)

	decoded, err = Decode(tampered)
	if err != nil {
		t.Fatalf("Decode tampered createdAt: %v", err)
	}
	if decoded.CreatedAt == original.CreatedAt {
		t.Error("tampering with createdAt byte did not change decoded CreatedAt")
	}
}
