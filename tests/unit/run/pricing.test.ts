import { describe, expect, it } from 'vitest';

import {
  computeCostMicro,
  getModelPricing,
  MODEL_PRICING,
} from '@/lib/run/pricing';

describe('lib/run/pricing', () => {
  // ── getModelPricing ─────────────────────────────────────────────────────

  describe('getModelPricing', () => {
    it.each(Object.keys(MODEL_PRICING))(
      'returns pricing for %s',
      (model) => {
        const pricing = getModelPricing(model);
        expect(pricing).not.toBeNull();
        expect(pricing!.inputPer1kTokens).toBeGreaterThan(0);
        expect(pricing!.outputPer1kTokens).toBeGreaterThan(0);
      },
    );

    it('returns null for unknown model', () => {
      expect(getModelPricing('unknown-model-xyz')).toBeNull();
    });
  });

  // ── computeCostMicro ────────────────────────────────────────────────────

  describe('computeCostMicro', () => {
    it('computes correctly for gpt-4o', () => {
      // gpt-4o: input $0.0025/1k, output $0.01/1k
      // 1000 input tokens = 0.0025 * 1_000_000 = 2500 microdollars
      // 500 output tokens = (500/1000) * 0.01 * 1_000_000 = 5000 microdollars
      const result = computeCostMicro('gpt-4o', 1000, 500);
      expect(result).not.toBeNull();
      expect(result!.inputCostMicro).toBe(2500);
      expect(result!.outputCostMicro).toBe(5000);
      expect(result!.totalCostMicro).toBe(7500);
    });

    it('returns null for unknown model', () => {
      expect(computeCostMicro('nonexistent-model', 100, 50)).toBeNull();
    });

    it('rounds to integer microdollars', () => {
      // gpt-4o-mini: input $0.00015/1k, output $0.0006/1k
      // 1 input token = (1/1000) * 0.00015 * 1_000_000 = 0.15 -> rounds to 0
      // 1 output token = (1/1000) * 0.0006 * 1_000_000 = 0.6 -> rounds to 1
      const result = computeCostMicro('gpt-4o-mini', 1, 1);
      expect(result).not.toBeNull();
      expect(Number.isInteger(result!.inputCostMicro)).toBe(true);
      expect(Number.isInteger(result!.outputCostMicro)).toBe(true);
      expect(Number.isInteger(result!.totalCostMicro)).toBe(true);
      expect(result!.inputCostMicro).toBe(0);
      expect(result!.outputCostMicro).toBe(1);
    });

    it('handles zero tokens', () => {
      const result = computeCostMicro('gpt-4o', 0, 0);
      expect(result).not.toBeNull();
      expect(result!.inputCostMicro).toBe(0);
      expect(result!.outputCostMicro).toBe(0);
      expect(result!.totalCostMicro).toBe(0);
    });

    it('computes correctly for gemini-2.0-flash', () => {
      // gemini-2.0-flash: input $0.0001/1k, output $0.0004/1k
      // 10000 input = (10000/1000) * 0.0001 * 1_000_000 = 1000
      // 5000 output = (5000/1000) * 0.0004 * 1_000_000 = 2000
      const result = computeCostMicro('gemini-2.0-flash', 10000, 5000);
      expect(result).not.toBeNull();
      expect(result!.inputCostMicro).toBe(1000);
      expect(result!.outputCostMicro).toBe(2000);
      expect(result!.totalCostMicro).toBe(3000);
    });
  });
});
