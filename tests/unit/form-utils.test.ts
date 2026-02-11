import { describe, expect, it } from 'vitest';

import { getFormString } from '@/lib/form-utils';

describe('lib/form-utils', () => {
  // H1: Extracts and trims string
  it('extracts and trims a string value', () => {
    const fd = new FormData();
    fd.append('name', '  hello world  ');
    expect(getFormString(fd, 'name')).toBe('hello world');
  });

  // H2: Returns '' for missing key
  it('returns empty string for missing key', () => {
    const fd = new FormData();
    expect(getFormString(fd, 'missing')).toBe('');
  });

  // U1: null FormData
  it('returns empty string for null FormData', () => {
    expect(getFormString(null, 'key')).toBe('');
  });

  // U2: undefined FormData
  it('returns empty string for undefined FormData', () => {
    expect(getFormString(undefined, 'key')).toBe('');
  });

  // U3: Non-string value (File)
  it('returns empty string for non-string (File) value', () => {
    const fd = new FormData();
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    fd.append('file', file);
    expect(getFormString(fd, 'file')).toBe('');
  });
});
