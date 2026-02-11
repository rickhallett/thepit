import { describe, expect, it } from 'vitest';

import { anonymizeUserId, anonymizeOwnerId } from '@/lib/research-anonymize';

describe('research-anonymize', () => {
  describe('anonymizeUserId', () => {
    it('returns 0x-prefixed hex string for valid input', async () => {
      const result = await anonymizeUserId('user_123');
      expect(result).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('returns null for null input', async () => {
      expect(await anonymizeUserId(null)).toBeNull();
    });

    it('returns null for undefined input', async () => {
      expect(await anonymizeUserId(undefined)).toBeNull();
    });

    it('is deterministic (same input → same output)', async () => {
      const a = await anonymizeUserId('user_abc');
      const b = await anonymizeUserId('user_abc');
      expect(a).toBe(b);
    });

    it('different inputs produce different outputs', async () => {
      const a = await anonymizeUserId('user_123');
      const b = await anonymizeUserId('user_456');
      expect(a).not.toBe(b);
    });
  });

  describe('anonymizeOwnerId', () => {
    it('returns 0x-prefixed hex string for valid input', async () => {
      const result = await anonymizeOwnerId('owner_123');
      expect(result).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('returns null for null input', async () => {
      expect(await anonymizeOwnerId(null)).toBeNull();
    });

    it('same raw ID produces different hash than anonymizeUserId', async () => {
      const userId = await anonymizeUserId('same_id');
      const ownerId = await anonymizeOwnerId('same_id');
      expect(userId).not.toBe(ownerId);
    });
  });
});
