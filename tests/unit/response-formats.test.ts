import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RESPONSE_FORMAT,
  RESPONSE_FORMATS,
  resolveResponseFormat,
} from '@/lib/response-formats';

describe('response formats', () => {
  it('defaults to markdown format', () => {
    expect(DEFAULT_RESPONSE_FORMAT).toBe('markdown');
    expect(resolveResponseFormat()).toMatchObject({ id: 'markdown' });
  });

  it('resolves known values', () => {
    const markdown = resolveResponseFormat('markdown');
    expect(markdown).toMatchObject({ id: 'markdown' });
    expect(markdown.instruction).toContain('Markdown');
  });

  it('falls back to markdown when unknown', () => {
    expect(resolveResponseFormat('unknown')).toMatchObject({ id: 'markdown' });
  });

  it('defines all expected formats', () => {
    expect(RESPONSE_FORMATS.map((format) => format.id)).toEqual([
      'plain',
      'spaced',
      'markdown',
      'json',
    ]);
  });
});
