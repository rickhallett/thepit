import { describe, expect, it } from 'vitest';

import { agents } from '@/db/schema';
import { normalizeHash } from '@/components/dna-fingerprint';

// ---------------------------------------------------------------------------
// DnaFingerprint wiring contract tests
//
// The DnaFingerprint component was wired into 4 locations (PR #341):
//   1. app/agents/[id]/page.tsx   — agent detail page
//   2. components/agent-details-modal.tsx — agent DNA overlay
//   3. components/agents-catalog.tsx      — agent listing cards
//   4. components/leaderboard-table.tsx   — agent rankings
//
// Each location passes `agent.manifestHash` or `agent.promptHash` to the
// DnaFingerprint component's `hash` prop (type: string).
//
// We can't render React components in node-env tests, but we CAN verify:
//   - The schema carries the required fields
//   - The fields are the right type for the component's prop
//   - Valid and edge-case hash values work with the normalizeHash pipeline
// ---------------------------------------------------------------------------

describe('DnaFingerprint wiring contract', () => {
  describe('agents schema includes hash fields', () => {
    it('has a promptHash column', () => {
      expect(agents.promptHash).toBeDefined();
      expect(agents.promptHash.name).toBe('prompt_hash');
    });

    it('has a manifestHash column', () => {
      expect(agents.manifestHash).toBeDefined();
      expect(agents.manifestHash.name).toBe('manifest_hash');
    });

    it('promptHash column has varchar type with length 66', () => {
      // 0x prefix (2 chars) + 64 hex chars = 66 chars total
      expect(agents.promptHash.columnType).toBe('PgVarchar');
      // `length` exists at runtime on PgVarchar but isn't in the base Column type
      expect((agents.promptHash as unknown as { length: number }).length).toBe(66);
    });

    it('manifestHash column has varchar type with length 66', () => {
      expect(agents.manifestHash.columnType).toBe('PgVarchar');
      expect((agents.manifestHash as unknown as { length: number }).length).toBe(66);
    });

    it('both hash columns are notNull', () => {
      expect(agents.promptHash.notNull).toBe(true);
      expect(agents.manifestHash.notNull).toBe(true);
    });
  });

  describe('hash values are valid for DnaFingerprint component', () => {
    const VALID_HASH =
      '0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80';

    it('a SHA-256 hash string (0x-prefixed, 66 chars) is valid input', () => {
      expect(VALID_HASH).toHaveLength(66);
      expect(VALID_HASH.startsWith('0x')).toBe(true);
      const normalized = normalizeHash(VALID_HASH);
      expect(normalized).not.toBeNull();
      expect(normalized).toHaveLength(64);
    });

    it('hash without 0x prefix (64 chars) is also valid', () => {
      const hashNoPrefix =
        'f2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80';
      expect(hashNoPrefix).toHaveLength(64);
      const normalized = normalizeHash(hashNoPrefix);
      expect(normalized).not.toBeNull();
    });

    it('empty string hash returns null from normalizeHash (graceful degradation)', () => {
      const normalized = normalizeHash('');
      expect(normalized).toBeNull();
    });

    it('typeof hash values from schema are string (varchar)', () => {
      // The drizzle column dataType confirms the DB stores these as strings
      expect(agents.promptHash.dataType).toBe('string');
      expect(agents.manifestHash.dataType).toBe('string');
    });
  });

  describe('hash field presence matches wiring locations', () => {
    // These tests document that the 4 wiring locations all depend on
    // the same two fields existing on the agent record.
    const requiredFields = ['promptHash', 'manifestHash'] as const;

    it.each(requiredFields)(
      'agents schema includes %s (required by all 4 wiring locations)',
      (field) => {
        expect(field in agents).toBe(true);
        expect(agents[field]).toBeDefined();
      },
    );

    it('both hash fields are siblings in the same table', () => {
      // Both fields exist on the same `agents` table, so any query that
      // fetches one can also fetch the other without a join.
      // Drizzle stores the table name on a well-known symbol.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableName = (agents as any)[Symbol.for('drizzle:Name')];
      expect(tableName).toBe('agents');
    });
  });
});
