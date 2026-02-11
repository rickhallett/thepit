import { describe, expect, it } from 'vitest';
import { sha256Hex } from '@/lib/hash';

describe('sha256Hex', () => {
  it('returns deterministic 0x-prefixed hex', async () => {
    const hash = await sha256Hex('hello');
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(await sha256Hex('hello')).toBe(hash);
  });

  it('produces different hashes for different inputs', async () => {
    const a = await sha256Hex('hello');
    const b = await sha256Hex('world');
    expect(a).not.toBe(b);
  });
});
