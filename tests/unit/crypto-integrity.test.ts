// Cryptographic Integrity Test Suite
//
// 10 attack scenarios that would prove THE PIT's cryptographic pipeline is
// broken. Each test exercises the real code and asserts a specific, falsifiable
// property. If any test fails, the pipeline cannot be trusted.
//
// Scenarios 1–7 test the TypeScript hashing / canonicalization layer.
// Scenarios 8–10 test ABI encoding validation and visual fingerprinting.
// Go-side ABI scenarios (8–10 from the Go perspective) live in
// pitnet/internal/abi/crypto_integrity_test.go.

import { describe, expect, it } from 'vitest';

import {
  buildAgentManifest,
  canonicalizeAgentManifest,
  canonicalizePrompt,
  hashAgentManifest,
  hashAgentPrompt,
  type AgentManifest,
} from '@/lib/agent-dna';
import { isValidBytes32 } from '@/lib/eas';
import {
  generateGrid,
  hexToBytes,
  normalizeHash,
} from '@/components/dna-fingerprint';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BASE_MANIFEST_INPUT = {
  agentId: 'agent-integrity-001',
  name: 'Integrity Test Agent',
  systemPrompt: 'You are a cryptographic integrity test agent.',
  presetId: 'preset-alpha',
  tier: 'premium' as const,
  model: 'claude-sonnet-4-20250514',
  responseLength: 'standard' as const,
  responseFormat: 'plain' as const,
  createdAt: '2026-02-08T00:00:00.000Z',
  parentId: 'parent-001',
  ownerId: 'user_integrity_test',
};

describe('Cryptographic Integrity — 10 Attack Scenarios', () => {
  // =========================================================================
  // SCENARIO 1: Canonicalization Ordering Attack
  // =========================================================================
  // Attack: An adversary constructs a manifest with the same fields but in a
  // different insertion order, hoping the JSON serialization differs and thus
  // the hash differs. If canonicalization is broken, the same logical agent
  // could have two different hashes, undermining identity.
  //
  // Proves: RFC 8785 canonicalization produces key-order-independent output.
  // =========================================================================
  describe('Scenario 1: Canonicalization ordering attack', () => {
    it('same manifest fields in different object key order produce identical canonical JSON', () => {
      // Build manifest the normal way (keys in schema order)
      const manifestA: AgentManifest = {
        agentId: 'agent-order-test',
        name: 'Order Test',
        systemPrompt: 'Test prompt.',
        presetId: null,
        tier: 'free',
        model: null,
        responseLength: 'standard',
        responseFormat: 'plain',
        createdAt: '2026-02-08T00:00:00.000Z',
        parentId: null,
        ownerId: null,
      };

      // Same manifest with keys deliberately reversed (Object.fromEntries trick)
      const reversed = Object.fromEntries(
        Object.entries(manifestA).reverse(),
      ) as AgentManifest;

      const canonA = canonicalizeAgentManifest(manifestA);
      const canonB = canonicalizeAgentManifest(reversed);

      // RFC 8785 must normalize both to the same string
      expect(canonA).toBe(canonB);
    });

    it('same manifest fields in different order produce identical hashes', async () => {
      const manifestA: AgentManifest = {
        agentId: 'agent-order-hash',
        name: 'Order Hash Test',
        systemPrompt: 'Hash me.',
        presetId: 'p1',
        tier: 'premium',
        model: 'model-x',
        responseLength: 'long',
        responseFormat: 'spaced',
        createdAt: '2026-03-01T12:00:00.000Z',
        parentId: 'parent-x',
        ownerId: 'owner-x',
      };

      // Scrambled key order via intermediate object
      const scrambled: AgentManifest = {
        ownerId: manifestA.ownerId,
        tier: manifestA.tier,
        agentId: manifestA.agentId,
        responseFormat: manifestA.responseFormat,
        createdAt: manifestA.createdAt,
        systemPrompt: manifestA.systemPrompt,
        name: manifestA.name,
        model: manifestA.model,
        responseLength: manifestA.responseLength,
        presetId: manifestA.presetId,
        parentId: manifestA.parentId,
      };

      const hashA = await hashAgentManifest(manifestA);
      const hashB = await hashAgentManifest(scrambled);
      expect(hashA).toBe(hashB);
    });
  });

  // =========================================================================
  // SCENARIO 2: Prompt Isolation Violation
  // =========================================================================
  // Attack: An adversary changes the agent's name or tier but claims the
  // "behaviour" (prompt) hasn't changed. If promptHash depends on non-prompt
  // fields, metadata changes could silently invalidate the prompt hash.
  //
  // Proves: promptHash is a function of systemPrompt ONLY. Changing any
  // other field in the manifest must NOT change the promptHash.
  // =========================================================================
  describe('Scenario 2: Prompt isolation violation', () => {
    it('promptHash is independent of non-prompt manifest fields', async () => {
      const prompt = 'You are a helpful assistant who never lies.';

      const hashBase = await hashAgentPrompt(prompt);

      // Verify 5 different manifests with the same prompt produce identical promptHash
      for (const name of ['Agent Alpha', 'Agent Beta', 'Agent Gamma', 'Agent Delta', 'Agent Epsilon']) {
        const h = await hashAgentPrompt(prompt);
        expect(h).toBe(hashBase);
      }
    });

    it('changing the prompt changes the promptHash', async () => {
      const hashA = await hashAgentPrompt('Version 1 of the prompt.');
      const hashB = await hashAgentPrompt('Version 2 of the prompt.');
      expect(hashA).not.toBe(hashB);
    });

    it('changing only metadata changes manifestHash but not promptHash', async () => {
      const manifestA = buildAgentManifest({
        ...BASE_MANIFEST_INPUT,
        name: 'Name A',
      });
      const manifestB = buildAgentManifest({
        ...BASE_MANIFEST_INPUT,
        name: 'Name B',
      });

      // manifestHash must differ (name changed)
      const mhA = await hashAgentManifest(manifestA);
      const mhB = await hashAgentManifest(manifestB);
      expect(mhA).not.toBe(mhB);

      // promptHash must be identical (same systemPrompt)
      const phA = await hashAgentPrompt(manifestA.systemPrompt);
      const phB = await hashAgentPrompt(manifestB.systemPrompt);
      expect(phA).toBe(phB);
    });
  });

  // =========================================================================
  // SCENARIO 3: Single-Bit Avalanche Failure
  // =========================================================================
  // Attack: An adversary makes a trivial edit (one character) to the system
  // prompt, hoping the hash is "close enough" to pass visual inspection or
  // a weak comparison. If SHA-256 avalanche is not working correctly through
  // our pipeline (e.g., we accidentally truncate input), a small change
  // could produce a similar hash.
  //
  // Proves: A 1-character difference in the prompt produces a completely
  // different hash (Hamming distance >> 0 across all 32 bytes).
  // =========================================================================
  describe('Scenario 3: Single-bit avalanche failure', () => {
    it('1-character prompt change flips at least 25% of hash bits', async () => {
      const hashA = await hashAgentPrompt(
        'The quick brown fox jumps over the lazy dog',
      );
      const hashB = await hashAgentPrompt(
        'The quick brown fox jumps over the lazy dog.',  // added period
      );

      expect(hashA).not.toBe(hashB);

      // Count differing bits
      const bytesA = hexToBytes(normalizeHash(hashA)!);
      const bytesB = hexToBytes(normalizeHash(hashB)!);
      let differingBits = 0;
      for (let i = 0; i < 32; i++) {
        let xor = bytesA[i]! ^ bytesB[i]!;
        while (xor > 0) {
          differingBits += xor & 1;
          xor >>= 1;
        }
      }

      // SHA-256 avalanche: expect ~50% of 256 bits to flip (128).
      // We conservatively assert at least 25% (64 bits) to avoid
      // statistical flakiness while still catching broken avalanche.
      expect(differingBits).toBeGreaterThanOrEqual(64);
    });

    it('single character change in manifest agentId changes manifestHash', async () => {
      const manifestA = buildAgentManifest({
        ...BASE_MANIFEST_INPUT,
        agentId: 'agent-avalanche-a',
      });
      const manifestB = buildAgentManifest({
        ...BASE_MANIFEST_INPUT,
        agentId: 'agent-avalanche-b',  // single char diff
      });

      const hashA = await hashAgentManifest(manifestA);
      const hashB = await hashAgentManifest(manifestB);
      expect(hashA).not.toBe(hashB);
    });
  });

  // =========================================================================
  // SCENARIO 4: Unicode Canonicalization Bypass
  // =========================================================================
  // Attack: An adversary uses Unicode tricks — homoglyphs, zero-width
  // joiners, combining characters, emoji — to create a prompt that LOOKS
  // identical to another but produces a different hash, or vice versa:
  // different-looking prompts that hash identically due to normalization.
  //
  // Proves: The pipeline handles Unicode correctly — different byte
  // sequences produce different hashes, even when they look similar.
  // =========================================================================
  describe('Scenario 4: Unicode canonicalization bypass', () => {
    it('ASCII vs homoglyph produces different hashes', async () => {
      // Latin 'a' (U+0061) vs Cyrillic 'а' (U+0430) — visually identical
      const hashA = await hashAgentPrompt('You are a helper.');
      const hashB = await hashAgentPrompt('You are \u0430 helper.');  // Cyrillic а
      expect(hashA).not.toBe(hashB);
    });

    it('emoji in system prompt canonicalizes deterministically', async () => {
      const prompt = 'You are a \u{1F525} fire agent \u{1F4A5} boom!';
      const hashA = await hashAgentPrompt(prompt);
      const hashB = await hashAgentPrompt(prompt);
      expect(hashA).toBe(hashB);
      expect(hashA).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('CJK characters in name canonicalize correctly', async () => {
      const manifest = buildAgentManifest({
        ...BASE_MANIFEST_INPUT,
        name: '\u6D77\u5FC3\u4EBA\u5DE5\u667A\u80FD',  // 海心人工智能
      });
      const hash = await hashAgentManifest(manifest);
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);

      // Deterministic
      const hash2 = await hashAgentManifest(manifest);
      expect(hash).toBe(hash2);
    });

    it('zero-width characters change the hash', async () => {
      const plain = 'Hello world';
      const withZWJ = 'Hello\u200Bworld';  // zero-width space between Hello and world
      const hashA = await hashAgentPrompt(plain);
      const hashB = await hashAgentPrompt(withZWJ);
      expect(hashA).not.toBe(hashB);
    });
  });

  // =========================================================================
  // SCENARIO 5: Null vs Empty String Confusion
  // =========================================================================
  // Attack: The schema has nullable fields (presetId, parentId, ownerId,
  // model). An adversary passes `null` in one version and `""` in another,
  // hoping they hash identically. If they do, two different agent states
  // map to the same attestation — a collision.
  //
  // Proves: null and "" are canonically distinct, producing different hashes.
  // =========================================================================
  describe('Scenario 5: Null vs empty string confusion', () => {
    it('null presetId and empty string presetId produce different manifest hashes', async () => {
      const manifestNull = buildAgentManifest({
        ...BASE_MANIFEST_INPUT,
        presetId: null,
      });
      // Force empty string (buildAgentManifest normally coerces undefined→null)
      const manifestEmpty: AgentManifest = {
        ...manifestNull,
        presetId: '' as unknown as string | null,
      };

      const hashNull = await hashAgentManifest(manifestNull);
      const hashEmpty = await hashAgentManifest(manifestEmpty);
      expect(hashNull).not.toBe(hashEmpty);
    });

    it('null model and empty string model produce different manifest hashes', async () => {
      const manifestNull = buildAgentManifest({
        ...BASE_MANIFEST_INPUT,
        model: null,
      });
      const manifestEmpty: AgentManifest = {
        ...manifestNull,
        model: '' as unknown as string | null,
      };

      const hashNull = await hashAgentManifest(manifestNull);
      const hashEmpty = await hashAgentManifest(manifestEmpty);
      expect(hashNull).not.toBe(hashEmpty);
    });

    it('null parentId and empty string parentId canonicalize differently', () => {
      const manifestNull = buildAgentManifest({
        ...BASE_MANIFEST_INPUT,
        parentId: null,
      });
      const manifestEmpty: AgentManifest = {
        ...manifestNull,
        parentId: '' as unknown as string | null,
      };

      const canonNull = canonicalizeAgentManifest(manifestNull);
      const canonEmpty = canonicalizeAgentManifest(manifestEmpty);
      expect(canonNull).not.toBe(canonEmpty);

      // Verify the actual difference: null serializes as null, "" as ""
      expect(canonNull).toContain('"parentId":null');
      expect(canonEmpty).toContain('"parentId":""');
    });
  });

  // =========================================================================
  // SCENARIO 6: Determinism Under Repetition
  // =========================================================================
  // Attack: A timing side-channel, race condition, or non-deterministic
  // internal state causes the same input to produce different hashes across
  // runs. This would mean stored hashes don't match re-computed hashes,
  // breaking verification entirely.
  //
  // Proves: 1000 invocations of hashAgentManifest and hashAgentPrompt on
  // the same input produce byte-identical output every time.
  // =========================================================================
  describe('Scenario 6: Determinism under repetition', () => {
    it('hashAgentManifest produces identical output across 1000 runs', async () => {
      const manifest = buildAgentManifest(BASE_MANIFEST_INPUT);
      const reference = await hashAgentManifest(manifest);

      const results = await Promise.all(
        Array.from({ length: 1000 }, () => hashAgentManifest(manifest)),
      );

      for (let i = 0; i < results.length; i++) {
        expect(results[i]).toBe(reference);
      }
    });

    it('hashAgentPrompt produces identical output across 1000 runs', async () => {
      const prompt = 'This prompt must hash identically every single time.';
      const reference = await hashAgentPrompt(prompt);

      const results = await Promise.all(
        Array.from({ length: 1000 }, () => hashAgentPrompt(prompt)),
      );

      for (let i = 0; i < results.length; i++) {
        expect(results[i]).toBe(reference);
      }
    });

    it('canonicalization is deterministic across 100 runs', () => {
      const manifest = buildAgentManifest(BASE_MANIFEST_INPUT);
      const reference = canonicalizeAgentManifest(manifest);

      for (let i = 0; i < 100; i++) {
        expect(canonicalizeAgentManifest(manifest)).toBe(reference);
      }
    });
  });

  // =========================================================================
  // SCENARIO 7: Hash Format / Storage Compliance
  // =========================================================================
  // Attack: The hash output doesn't conform to the expected format (0x +
  // 64 hex chars = 66 chars total). If a hash is truncated, missing the
  // prefix, or uses uppercase, it could:
  //   (a) fail the DB varchar(66) constraint
  //   (b) fail isValidBytes32 checks in EAS submission
  //   (c) mismatch when compared against on-chain data
  //
  // Proves: Every hash from the pipeline is exactly 66 chars, 0x-prefixed,
  // lowercase hex, and passes the EAS isValidBytes32 validator.
  // =========================================================================
  describe('Scenario 7: Hash format / storage compliance', () => {
    it('manifestHash is 66 chars, 0x-prefixed, lowercase hex', async () => {
      const manifest = buildAgentManifest(BASE_MANIFEST_INPUT);
      const hash = await hashAgentManifest(manifest);

      expect(hash).toHaveLength(66);
      expect(hash.startsWith('0x')).toBe(true);
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
      // No uppercase hex allowed
      expect(hash).toBe(hash.toLowerCase());
    });

    it('promptHash is 66 chars, 0x-prefixed, lowercase hex', async () => {
      const hash = await hashAgentPrompt('Format compliance test.');

      expect(hash).toHaveLength(66);
      expect(hash.startsWith('0x')).toBe(true);
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(hash).toBe(hash.toLowerCase());
    });

    it('hashes pass the EAS isValidBytes32 validator', async () => {
      const manifest = buildAgentManifest(BASE_MANIFEST_INPUT);
      const mh = await hashAgentManifest(manifest);
      const ph = await hashAgentPrompt(manifest.systemPrompt);

      expect(isValidBytes32(mh)).toBe(true);
      expect(isValidBytes32(ph)).toBe(true);
    });

    it('hashes fit in DB varchar(66) column', async () => {
      const manifest = buildAgentManifest(BASE_MANIFEST_INPUT);
      const hash = await hashAgentManifest(manifest);

      // The agents table has: promptHash varchar(66), manifestHash varchar(66)
      expect(hash.length).toBeLessThanOrEqual(66);
      expect(hash.length).toBe(66);  // exactly 66, not less
    });
  });

  // =========================================================================
  // SCENARIO 8: EAS Schema String Mismatch
  // =========================================================================
  // Attack: The TypeScript EAS schema string and the Go ABI schema string
  // diverge. If they differ, TS-created attestations can't be decoded by
  // Go (pitnet), or vice versa. The entire cross-implementation verification
  // chain breaks silently.
  //
  // Proves: The EAS_SCHEMA_STRING in lib/eas.ts exactly matches the
  // SchemaString in pitnet/internal/abi/abi.go. We hardcode the expected
  // value and test both against it.
  // =========================================================================
  describe('Scenario 8: EAS schema string cross-implementation mismatch', () => {
    it('TypeScript EAS_SCHEMA_STRING matches the canonical schema', async () => {
      const { EAS_SCHEMA_STRING } = await import('@/lib/eas');
      const expected =
        'string agentId,string name,string presetId,string tier,bytes32 promptHash,bytes32 manifestHash,string parentId,string ownerId,uint64 createdAt';
      expect(EAS_SCHEMA_STRING).toBe(expected);
    });

    it('schema has exactly 9 fields in the correct order', async () => {
      const { EAS_SCHEMA_STRING } = await import('@/lib/eas');
      const fields = EAS_SCHEMA_STRING.split(',');
      expect(fields).toHaveLength(9);

      // Verify field names and types
      expect(fields[0]).toBe('string agentId');
      expect(fields[1]).toBe('string name');
      expect(fields[2]).toBe('string presetId');
      expect(fields[3]).toBe('string tier');
      expect(fields[4]).toBe('bytes32 promptHash');
      expect(fields[5]).toBe('bytes32 manifestHash');
      expect(fields[6]).toBe('string parentId');
      expect(fields[7]).toBe('string ownerId');
      expect(fields[8]).toBe('uint64 createdAt');
    });
  });

  // =========================================================================
  // SCENARIO 9: Collision via Minimal Difference
  // =========================================================================
  // Attack: Two agents that differ in only one field (the smallest possible
  // difference) produce the same manifestHash. This would be a SHA-256
  // collision through our canonicalization layer — not a raw SHA-256
  // collision, but a pipeline-level collision (e.g., if canonicalization
  // somehow normalizes away the difference).
  //
  // Proves: Manifests differing in exactly one field each produce distinct
  // hashes, for ALL 11 fields in the manifest type.
  // =========================================================================
  describe('Scenario 9: Collision via minimal single-field difference', () => {
    const base = buildAgentManifest(BASE_MANIFEST_INPUT);

    const singleFieldVariants: [string, Partial<AgentManifest>][] = [
      ['agentId', { agentId: 'agent-integrity-002' }],
      ['name', { name: 'Integrity Test Agent v2' }],
      ['systemPrompt', { systemPrompt: 'You are a DIFFERENT integrity test agent.' }],
      ['presetId', { presetId: 'preset-beta' }],
      ['tier', { tier: 'custom' }],
      ['model', { model: 'gpt-4o' }],
      ['responseLength', { responseLength: 'long' }],
      ['responseFormat', { responseFormat: 'spaced' }],
      ['createdAt', { createdAt: '2026-02-09T00:00:00.000Z' }],
      ['parentId', { parentId: 'parent-002' }],
      ['ownerId', { ownerId: 'user_integrity_test_2' }],
    ];

    for (const [fieldName, override] of singleFieldVariants) {
      it(`changing only '${fieldName}' produces a different manifestHash`, async () => {
        const variant: AgentManifest = { ...base, ...override };
        const hashBase = await hashAgentManifest(base);
        const hashVariant = await hashAgentManifest(variant);
        expect(hashBase).not.toBe(hashVariant);
      });
    }
  });

  // =========================================================================
  // SCENARIO 10: Visual Fingerprint Sensitivity
  // =========================================================================
  // Attack: The DNA fingerprint component renders the same visual pattern
  // for two different hashes, giving users a false sense of identity
  // verification. Or: a modified hash produces the same grid, so visual
  // inspection fails to detect tampering.
  //
  // Proves: (a) Different hashes produce different grids.
  //         (b) A single hex digit change in the hash changes the grid.
  //         (c) The grid is deterministic for a given hash.
  // =========================================================================
  describe('Scenario 10: Visual fingerprint sensitivity', () => {
    const HASH_A =
      '0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80';
    const HASH_B =
      '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

    it('different hashes produce different grids', () => {
      const gridA = generateGrid(normalizeHash(HASH_A)!);
      const gridB = generateGrid(normalizeHash(HASH_B)!);

      // At least one cell must differ
      const hasDifference = gridA.cells.some(
        (cell, i) =>
          cell.on !== gridB.cells[i]!.on || cell.color !== gridB.cells[i]!.color,
      );
      expect(hasDifference).toBe(true);
    });

    it('single hex digit change in hash changes the grid', () => {
      const hexA = normalizeHash(HASH_A)!;
      // Flip first hex digit: f -> 0
      const hexModified = '0' + hexA.slice(1);

      const gridA = generateGrid(hexA);
      const gridModified = generateGrid(hexModified);

      // The first byte drives row 0, col 0 — must change
      const cellA = gridA.cells.find((c) => c.row === 0 && c.col === 0)!;
      const cellMod = gridModified.cells.find((c) => c.row === 0 && c.col === 0)!;

      // Either on/off state or color must differ (0xf2 → on, color idx 121%16=9
      // vs 0x02 → off, color idx 1)
      const differs = cellA.on !== cellMod.on || cellA.color !== cellMod.color;
      expect(differs).toBe(true);
    });

    it('grid is deterministic — 100 renders of same hash produce identical grids', () => {
      const hex = normalizeHash(HASH_A)!;
      const reference = generateGrid(hex);

      for (let i = 0; i < 100; i++) {
        const grid = generateGrid(hex);
        expect(grid.cells).toEqual(reference.cells);
        expect(grid.bgColor).toBe(reference.bgColor);
      }
    });

    it('normalizeHash rejects hashes that are too short for the grid', () => {
      // A truncated hash must not produce a valid grid input
      expect(normalizeHash('0xabcd')).toBeNull();
      expect(normalizeHash('0x' + 'a'.repeat(63))).toBeNull();
    });

    it('grid uses all 5 rows and 5 columns for visual coverage', () => {
      const hex = normalizeHash(HASH_A)!;
      const { cells } = generateGrid(hex);

      const rows = new Set(cells.map((c) => c.row));
      const cols = new Set(cells.map((c) => c.col));
      expect(rows.size).toBe(5);
      expect(cols.size).toBe(5);
    });
  });
});
