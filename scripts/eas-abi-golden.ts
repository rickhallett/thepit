#!/usr/bin/env npx tsx
/**
 * Generate golden ABI-encoded bytes from the EAS SchemaEncoder.
 *
 * This script produces the exact bytes that the EAS SDK would submit on-chain
 * for a known attestation input. The output is used as golden values in the
 * Go ABI parity test (pitnet/internal/abi/abi_parity_test.go).
 *
 * Usage: npx tsx scripts/eas-abi-golden.ts
 */

import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';

const SCHEMA_STRING =
  'string agentId,string name,string presetId,string tier,bytes32 promptHash,bytes32 manifestHash,string parentId,string ownerId,uint64 createdAt';

// Golden test case: deterministic input matching the Go parity tests
const GOLDEN_INPUT = {
  agentId: 'agent-golden-001',
  name: 'Golden Agent',
  presetId: 'preset-alpha',
  tier: 'premium',
  promptHash: '0x' + 'ab'.repeat(32),   // 0xabab...ab (64 hex chars)
  manifestHash: '0x' + 'cd'.repeat(32), // 0xcdcd...cd (64 hex chars)
  parentId: 'parent-000',
  ownerId: 'user_golden123',
  createdAt: 1700000000, // 2023-11-14T22:13:20Z
};

// Second test case: empty optional fields
const EMPTY_INPUT = {
  agentId: 'agent-empty-002',
  name: 'Empty Agent',
  presetId: '',
  tier: 'free',
  promptHash: '0x' + '00'.repeat(32),
  manifestHash: '0x' + 'ff'.repeat(32),
  parentId: '',
  ownerId: '',
  createdAt: 0,
};

function encode(input: typeof GOLDEN_INPUT): string {
  const encoder = new SchemaEncoder(SCHEMA_STRING);
  const encoded = encoder.encodeData([
    { name: 'agentId', value: input.agentId, type: 'string' },
    { name: 'name', value: input.name, type: 'string' },
    { name: 'presetId', value: input.presetId, type: 'string' },
    { name: 'tier', value: input.tier, type: 'string' },
    { name: 'promptHash', value: input.promptHash, type: 'bytes32' },
    { name: 'manifestHash', value: input.manifestHash, type: 'bytes32' },
    { name: 'parentId', value: input.parentId, type: 'string' },
    { name: 'ownerId', value: input.ownerId, type: 'string' },
    { name: 'createdAt', value: BigInt(input.createdAt), type: 'uint64' },
  ]);
  return encoded;
}

console.log('=== EAS ABI Golden Values ===');
console.log();
console.log('--- Golden Test Case ---');
console.log('Input:', JSON.stringify(GOLDEN_INPUT, null, 2));
const goldenHex = encode(GOLDEN_INPUT);
console.log('Encoded:', goldenHex);
console.log('Length:', (goldenHex.length - 2) / 2, 'bytes');
console.log();
console.log('--- Empty Fields Test Case ---');
console.log('Input:', JSON.stringify(EMPTY_INPUT, null, 2));
const emptyHex = encode(EMPTY_INPUT);
console.log('Encoded:', emptyHex);
console.log('Length:', (emptyHex.length - 2) / 2, 'bytes');
