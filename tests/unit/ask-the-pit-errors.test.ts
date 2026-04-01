import { describe, expect, it } from 'vitest';

import { getErrorMessage } from '@/components/ask-the-pit';

describe('getErrorMessage', () => {
  it('returns rate limit message for 429', () => {
    expect(getErrorMessage(429)).toBe(
      'Too many questions. Try again in a moment.',
    );
  });

  it('returns unavailable message for 404', () => {
    expect(getErrorMessage(404)).toBe(
      'Ask The Pit is currently unavailable.',
    );
  });

  it('returns service error message for 503', () => {
    expect(getErrorMessage(503)).toBe(
      'The Pit could not generate a response. Try again.',
    );
  });

  it('returns generic message for other status codes', () => {
    expect(getErrorMessage(500)).toBe('Something went wrong. Try again.');
    expect(getErrorMessage(401)).toBe('Something went wrong. Try again.');
    expect(getErrorMessage(400)).toBe('Something went wrong. Try again.');
  });

  it('ignores body content and maps by status only', () => {
    expect(getErrorMessage(429, { error: 'Rate limit exceeded' })).toBe(
      'Too many questions. Try again in a moment.',
    );
    expect(getErrorMessage(404, { error: 'Ask The Pit is not enabled.' })).toBe(
      'Ask The Pit is currently unavailable.',
    );
  });
});
