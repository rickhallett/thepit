import { describe, expect, it } from 'vitest';
import { CREDIT_PACKAGES, describeCredits } from '@/lib/credit-catalog';

describe('credit-catalog', () => {
  it('has exactly 2 packages', () => {
    expect(CREDIT_PACKAGES).toHaveLength(2);
  });

  it('starter pack has correct values', () => {
    const starter = CREDIT_PACKAGES.find((p) => p.id === 'starter');
    expect(starter).toBeDefined();
    expect(starter!.name).toBe('Starter');
    expect(starter!.priceGbp).toBe(3);
    expect(starter!.credits).toBeGreaterThan(0);
  });

  it('plus pack has correct values', () => {
    const plus = CREDIT_PACKAGES.find((p) => p.id === 'plus');
    expect(plus).toBeDefined();
    expect(plus!.name).toBe('Plus');
    expect(plus!.priceGbp).toBe(8);
    expect(plus!.credits).toBeGreaterThan(0);
  });

  it('describeCredits formats as rounded integer', () => {
    expect(describeCredits(100)).toMatch(/^\d+$/);
  });
});
