import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RESPONSE_LENGTH,
  RESPONSE_LENGTHS,
  resolveResponseLength,
} from '@/lib/response-lengths';

describe('response lengths', () => {
  it('exposes the short length as default', () => {
    expect(DEFAULT_RESPONSE_LENGTH).toBe('short');
  });

  it('resolves missing or unknown values to short', () => {
    expect(resolveResponseLength()).toMatchObject({ id: 'short' });
    expect(resolveResponseLength('unknown')).toMatchObject({ id: 'short' });
  });

  it('resolves known values', () => {
    const long = resolveResponseLength('long');
    expect(long).toMatchObject({ id: 'long', maxOutputTokens: 320 });
  });

  it('defines ordered configs', () => {
    expect(RESPONSE_LENGTHS.map((item) => item.id)).toEqual([
      'short',
      'standard',
      'long',
    ]);
  });
});
