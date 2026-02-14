import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RESPONSE_FORMAT,
  RESPONSE_FORMATS,
  resolveResponseFormat,
} from '@/lib/response-formats';

describe('response formats', () => {
  it('defaults to spaced format', () => {
    expect(DEFAULT_RESPONSE_FORMAT).toBe('spaced');
    expect(resolveResponseFormat()).toMatchObject({ id: 'spaced' });
  });

  it('resolves known values', () => {
    const spaced = resolveResponseFormat('spaced');
    expect(spaced).toMatchObject({ id: 'spaced' });
    expect(spaced.instruction).toContain('plain text');
  });

  it('falls back to spaced when unknown', () => {
    expect(resolveResponseFormat('unknown')).toMatchObject({ id: 'spaced' });
  });

  it('resolves legacy markdown to spaced', () => {
    expect(resolveResponseFormat('markdown')).toMatchObject({ id: 'spaced' });
  });

  it('defines all expected formats', () => {
    expect(RESPONSE_FORMATS.map((format) => format.id)).toEqual([
      'spaced',
      'plain',
      'json',
    ]);
  });
});
