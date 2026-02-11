import { describe, expect, it } from 'vitest';
import { toErrorMessage, toError } from '@/lib/errors';

describe('toErrorMessage', () => {
  it('extracts message from Error instances', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns string values directly', () => {
    expect(toErrorMessage('raw string error')).toBe('raw string error');
  });

  it('returns "Unknown error" for non-Error, non-string values', () => {
    expect(toErrorMessage(42)).toBe('Unknown error');
    expect(toErrorMessage(null)).toBe('Unknown error');
    expect(toErrorMessage(undefined)).toBe('Unknown error');
    expect(toErrorMessage({ code: 500 })).toBe('Unknown error');
  });
});

describe('toError', () => {
  it('returns Error instances as-is', () => {
    const err = new Error('original');
    expect(toError(err)).toBe(err);
  });

  it('wraps string values in an Error', () => {
    const result = toError('string error');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('string error');
  });

  it('wraps unknown types with "Unknown error"', () => {
    const result = toError(42);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Unknown error');
  });
});
