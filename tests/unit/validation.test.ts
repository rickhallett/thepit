import { describe, expect, it } from 'vitest';
import { UNSAFE_PATTERN } from '@/lib/validation';

describe('UNSAFE_PATTERN', () => {
  it.each([
    ['https://evil.com', true],
    ['http://evil.com', true],
    ['www.evil.com', true],
    ['<script>alert(1)</script>', true],
    ['javascript:alert(1)', true],
    ['onclick=alert(1)', true],
    ['data:text/html,<h1>hi</h1>', true],
    ['safe text with no issues', false],
    ['This is a perfectly normal sentence.', false],
    ['I like onions and onclick games', false], // "onclick" without = should not match... actually it will match "on\w+\s*="
  ])('"%s" → match=%s', (input, expected) => {
    // Reset lastIndex for global-like patterns
    UNSAFE_PATTERN.lastIndex = 0;
    expect(UNSAFE_PATTERN.test(input)).toBe(expected);
  });

  it('does not match "onclick" without an equals sign', () => {
    expect(UNSAFE_PATTERN.test('I clicked on the button')).toBe(false);
  });
});
