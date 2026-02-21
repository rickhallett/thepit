// Package abi implements Solidity ABI encoding for the EAS attestation schema
// used by THE PIT. This is a minimal, purpose-built encoder — it handles only
// the types needed for our schema (string, bytes32, uint64) rather than the
// full ABI specification.
//
// The EAS schema:
//
//	string agentId, string name, string presetId, string tier,
//	bytes32 promptHash, bytes32 manifestHash,
//	string parentId, string ownerId, uint64 createdAt
//
// ABI encoding packs values in two regions: a "head" of fixed-size slots
// (32 bytes each) and a "tail" for dynamic data (strings). Fixed types
// (bytes32, uint64) are encoded inline; dynamic types (string) store a tail
// offset in the head slot and the actual length-prefixed data in the tail.
package abi

import (
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
)

// SchemaString is the EAS schema registered on-chain.
const SchemaString = "string agentId,string name,string presetId,string tier,bytes32 promptHash,bytes32 manifestHash,string parentId,string ownerId,uint64 createdAt"

// AttestationData holds the fields for an agent attestation.
type AttestationData struct {
	AgentID      string
	Name         string
	PresetID     string
	Tier         string
	PromptHash   string // 0x-prefixed 32-byte hex
	ManifestHash string // 0x-prefixed 32-byte hex
	ParentID     string
	OwnerID      string
	CreatedAt    uint64 // unix timestamp
}

// Encode ABI-encodes the attestation data matching the EAS schema.
// Returns the raw bytes suitable for submission to the EAS contract.
func Encode(data AttestationData) ([]byte, error) {
	promptHash, err := decodeBytes32(data.PromptHash)
	if err != nil {
		return nil, fmt.Errorf("promptHash: %w", err)
	}
	manifestHash, err := decodeBytes32(data.ManifestHash)
	if err != nil {
		return nil, fmt.Errorf("manifestHash: %w", err)
	}

	// The schema has 9 fields. Each occupies one 32-byte head slot.
	// Dynamic types (string) store a tail offset; fixed types store the value.
	const numFields = 9
	const slotSize = 32

	// Collect the string fields in order and the indices of string slots.
	strings_ := []string{
		data.AgentID,  // field 0
		data.Name,     // field 1
		data.PresetID, // field 2
		data.Tier,     // field 3
		// field 4: bytes32 (promptHash) — not a string
		// field 5: bytes32 (manifestHash) — not a string
		data.ParentID, // field 6
		data.OwnerID,  // field 7
		// field 8: uint64 (createdAt) — not a string
	}
	// Build tail data: each string is encoded as (length, padded-data).
	type tailEntry struct {
		data []byte
	}
	var tails []tailEntry
	for _, s := range strings_ {
		tails = append(tails, tailEntry{data: encodeString(s)})
	}

	// Calculate tail offsets. The head is numFields * 32 bytes.
	headSize := numFields * slotSize
	tailOffset := headSize
	offsets := make([]int, len(tails))
	for i, t := range tails {
		offsets[i] = tailOffset
		tailOffset += len(t.data)
	}

	// Build the head.
	head := make([]byte, headSize)
	stringIdx := 0
	for field := 0; field < numFields; field++ {
		slot := head[field*slotSize : (field+1)*slotSize]
		switch field {
		case 0, 1, 2, 3, 6, 7: // string fields — store tail offset
			padUint256(slot, uint64(offsets[stringIdx]))
			stringIdx++
		case 4: // bytes32 promptHash
			copy(slot, promptHash)
		case 5: // bytes32 manifestHash
			copy(slot, manifestHash)
		case 8: // uint64 createdAt
			padUint256(slot, data.CreatedAt)
		}
	}

	// Concatenate head + all tail entries.
	result := make([]byte, 0, tailOffset)
	result = append(result, head...)
	for _, t := range tails {
		result = append(result, t.data...)
	}

	return result, nil
}

// Decode ABI-decodes attestation data from raw bytes.
func Decode(data []byte) (AttestationData, error) {
	const numFields = 9
	const slotSize = 32

	if len(data) < numFields*slotSize {
		return AttestationData{}, fmt.Errorf("data too short: %d bytes, need at least %d", len(data), numFields*slotSize)
	}

	readSlot := func(field int) []byte {
		return data[field*slotSize : (field+1)*slotSize]
	}

	readOffset := func(field int) int {
		slot := readSlot(field)
		b := new(big.Int).SetBytes(slot)
		return int(b.Uint64())
	}

	readStringAt := func(offset int) (string, error) {
		if offset+slotSize > len(data) {
			return "", fmt.Errorf("string offset %d out of bounds", offset)
		}
		lenBytes := data[offset : offset+slotSize]
		strLen := int(new(big.Int).SetBytes(lenBytes).Uint64())
		start := offset + slotSize
		if start+strLen > len(data) {
			return "", fmt.Errorf("string data at offset %d exceeds data length", offset)
		}
		return string(data[start : start+strLen]), nil
	}

	readBytes32 := func(field int) string {
		return "0x" + hex.EncodeToString(readSlot(field))
	}

	readUint64 := func(field int) uint64 {
		slot := readSlot(field)
		b := new(big.Int).SetBytes(slot)
		return b.Uint64()
	}

	agentID, err := readStringAt(readOffset(0))
	if err != nil {
		return AttestationData{}, fmt.Errorf("agentId: %w", err)
	}
	name, err := readStringAt(readOffset(1))
	if err != nil {
		return AttestationData{}, fmt.Errorf("name: %w", err)
	}
	presetID, err := readStringAt(readOffset(2))
	if err != nil {
		return AttestationData{}, fmt.Errorf("presetId: %w", err)
	}
	tier, err := readStringAt(readOffset(3))
	if err != nil {
		return AttestationData{}, fmt.Errorf("tier: %w", err)
	}
	parentID, err := readStringAt(readOffset(6))
	if err != nil {
		return AttestationData{}, fmt.Errorf("parentId: %w", err)
	}
	ownerID, err := readStringAt(readOffset(7))
	if err != nil {
		return AttestationData{}, fmt.Errorf("ownerId: %w", err)
	}

	return AttestationData{
		AgentID:      agentID,
		Name:         name,
		PresetID:     presetID,
		Tier:         tier,
		PromptHash:   readBytes32(4),
		ManifestHash: readBytes32(5),
		ParentID:     parentID,
		OwnerID:      ownerID,
		CreatedAt:    readUint64(8),
	}, nil
}

// IsValidBytes32 validates a 0x-prefixed 32-byte hex string.
func IsValidBytes32(s string) bool {
	if len(s) != 66 {
		return false
	}
	if !strings.HasPrefix(s, "0x") {
		return false
	}
	_, err := hex.DecodeString(s[2:])
	return err == nil
}

// decodeBytes32 parses a 0x-prefixed hex string to 32 bytes.
func decodeBytes32(s string) ([]byte, error) {
	if !IsValidBytes32(s) {
		return nil, fmt.Errorf("invalid bytes32: %q", s)
	}
	b, _ := hex.DecodeString(s[2:])
	return b, nil
}

// padUint256 writes a uint64 value into a 32-byte big-endian slot.
func padUint256(slot []byte, v uint64) {
	b := new(big.Int).SetUint64(v)
	bBytes := b.Bytes()
	// Right-align in 32-byte slot.
	copy(slot[32-len(bBytes):], bBytes)
}

// encodeString ABI-encodes a string: 32-byte length + padded data.
func encodeString(s string) []byte {
	data := []byte(s)
	// Length slot.
	lenSlot := make([]byte, 32)
	padUint256(lenSlot, uint64(len(data)))

	// Data padded to 32-byte boundary.
	// Empty strings have paddedLen=0: just the length slot (value 0), no data slot.
	// This matches the Solidity ABI spec and the EAS SDK's SchemaEncoder.
	paddedLen := ((len(data) + 31) / 32) * 32
	padded := make([]byte, paddedLen)
	copy(padded, data)

	result := make([]byte, 0, 32+paddedLen)
	result = append(result, lenSlot...)
	result = append(result, padded...)
	return result
}
