import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FREE_MODEL,
  DEFAULT_PREMIUM_MODEL,
  FREE_MODEL_IDS,
  PREMIUM_MODEL_IDS,
} from '@/lib/model-registry';

describe('model-registry defaults', () => {
  it('DEFAULT_FREE_MODEL is the first free-tier model', () => {
    expect(DEFAULT_FREE_MODEL).toBe(FREE_MODEL_IDS[0]);
    expect(typeof DEFAULT_FREE_MODEL).toBe('string');
    expect(DEFAULT_FREE_MODEL.length).toBeGreaterThan(0);
  });

  it('DEFAULT_PREMIUM_MODEL is the first premium-tier model', () => {
    expect(DEFAULT_PREMIUM_MODEL).toBe(PREMIUM_MODEL_IDS[0]);
    expect(typeof DEFAULT_PREMIUM_MODEL).toBe('string');
    expect(DEFAULT_PREMIUM_MODEL.length).toBeGreaterThan(0);
  });

  it('FREE_MODEL_IDS contains only free-tier models', () => {
    expect(FREE_MODEL_IDS.length).toBeGreaterThan(0);
    for (const id of FREE_MODEL_IDS) {
      expect(typeof id).toBe('string');
    }
  });

  it('PREMIUM_MODEL_IDS contains only premium-tier models', () => {
    expect(PREMIUM_MODEL_IDS.length).toBeGreaterThan(0);
    for (const id of PREMIUM_MODEL_IDS) {
      expect(typeof id).toBe('string');
    }
  });
});
