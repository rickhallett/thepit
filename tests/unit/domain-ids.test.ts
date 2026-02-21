import { describe, expect, it } from 'vitest';
import {
  asBoutId,
  asUserId,
  asAgentId,
  asMicroCredits,
  isBoutId,
  isUserId,
  isAgentId,
  isMicroCredits,
  type BoutId,
  type UserId,
  type AgentId,
  type MicroCredits,
} from '@/lib/domain-ids';

describe('domain-ids', () => {
  describe('brand constructors', () => {
    it('asBoutId returns the same string value', () => {
      const raw = 'bout-abc123def456789';
      const branded: BoutId = asBoutId(raw);
      expect(branded).toBe(raw);
      // At runtime, branded types are invisible — the value is unchanged
      expect(typeof branded).toBe('string');
    });

    it('asUserId returns the same string value', () => {
      const raw = 'user_clerk_abc123';
      const branded: UserId = asUserId(raw);
      expect(branded).toBe(raw);
    });

    it('asAgentId returns the same string value', () => {
      const raw = 'preset:roast-battle:judge';
      const branded: AgentId = asAgentId(raw);
      expect(branded).toBe(raw);
    });

    it('asMicroCredits returns the same number value', () => {
      const raw = 5000;
      const branded: MicroCredits = asMicroCredits(raw);
      expect(branded).toBe(raw);
      expect(typeof branded).toBe('number');
    });

    it('branded values are interoperable with their base type operations', () => {
      // String operations
      const boutId = asBoutId('bout-123');
      expect(boutId.length).toBe(8);
      expect(boutId.startsWith('bout-')).toBe(true);

      // Number operations
      const credits = asMicroCredits(5000);
      expect(credits + asMicroCredits(3000)).toBe(8000);
      expect(credits > 0).toBe(true);
    });
  });

  describe('type guards', () => {
    it('isBoutId returns true for non-empty strings', () => {
      expect(isBoutId('bout-abc')).toBe(true);
      expect(isBoutId('x')).toBe(true);
    });

    it('isBoutId returns false for empty string', () => {
      expect(isBoutId('')).toBe(false);
    });

    it('isUserId returns true for non-empty strings', () => {
      expect(isUserId('user_123')).toBe(true);
    });

    it('isUserId returns false for empty string', () => {
      expect(isUserId('')).toBe(false);
    });

    it('isAgentId returns true for non-empty strings', () => {
      expect(isAgentId('preset:debate:host')).toBe(true);
    });

    it('isAgentId returns false for empty string', () => {
      expect(isAgentId('')).toBe(false);
    });

    it('isMicroCredits returns true for finite numbers', () => {
      expect(isMicroCredits(0)).toBe(true);
      expect(isMicroCredits(-500)).toBe(true);
      expect(isMicroCredits(100000)).toBe(true);
    });

    it('isMicroCredits returns false for non-finite numbers', () => {
      expect(isMicroCredits(Infinity)).toBe(false);
      expect(isMicroCredits(-Infinity)).toBe(false);
      expect(isMicroCredits(NaN)).toBe(false);
    });
  });

  describe('compile-time safety (type assertions)', () => {
    // These tests verify that the branded types work correctly at the
    // value level. The compile-time safety (preventing BoutId from being
    // assigned to UserId) is enforced by TypeScript's type system and
    // can't be tested at runtime. The following test documents the intent:

    it('branded types preserve their string/number identity', () => {
      const boutId = asBoutId('b-1');
      const userId = asUserId('u-1');
      const agentId = asAgentId('a-1');
      const credits = asMicroCredits(100);

      // All branded strings are still strings
      const strings: string[] = [boutId, userId, agentId];
      expect(strings).toHaveLength(3);

      // Branded number is still a number
      const num: number = credits;
      expect(num).toBe(100);
    });
  });
});
