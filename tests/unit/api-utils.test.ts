import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import {
  parseValidBody,
  errorResponse,
  rateLimitResponse,
  API_ERRORS,
} from '@/lib/api-utils';

const testSchema = z.object({
  foo: z.string(),
});

describe('parseValidBody', () => {
  it('parses and validates valid JSON against schema', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await parseValidBody(req, testSchema);
    expect(result.data).toEqual({ foo: 'bar' });
    expect(result.error).toBeUndefined();
  });

  it('returns 400 error Response for invalid JSON', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: '{invalid',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await parseValidBody(req, testSchema);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Response);
    expect(result.error!.status).toBe(400);
    const body = await result.error!.json();
    expect(body.error).toBe(API_ERRORS.INVALID_JSON);
  });

  it('returns 400 when body fails schema validation', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ foo: 123 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await parseValidBody(req, testSchema);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Response);
    expect(result.error!.status).toBe(400);
  });

  it('returns 400 when required field is missing', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await parseValidBody(req, testSchema);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Response);
    expect(result.error!.status).toBe(400);
  });
});

describe('errorResponse', () => {
  it('creates a JSON error response with correct status', async () => {
    const response = errorResponse('Not found', 404);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Not found');
  });

  it('sets Content-Type to application/json', () => {
    const response = errorResponse('Error', 500);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('includes code when provided', async () => {
    const response = errorResponse('Bad request', 400, { code: 'INVALID_TOPIC' });
    const body = await response.json();
    expect(body.error).toBe('Bad request');
    expect(body.code).toBe('INVALID_TOPIC');
  });

  it('omits code field when not provided', async () => {
    const response = errorResponse('Bad request', 400);
    const body = await response.json();
    expect(body.code).toBeUndefined();
  });

  it('includes custom headers when provided', () => {
    const response = errorResponse('Error', 500, {
      headers: { 'X-Custom': 'value' },
    });
    expect(response.headers.get('X-Custom')).toBe('value');
  });
});

describe('rateLimitResponse', () => {
  it('returns 429 with Retry-After and X-RateLimit headers', async () => {
    const now = Date.now();
    const result = {
      success: false,
      remaining: 0,
      resetAt: now + 30_000,
    };

    const response = rateLimitResponse(result);
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.error).toBe(API_ERRORS.RATE_LIMITED);

    expect(response.headers.get('Retry-After')).toBeTruthy();
    const retryAfter = Number(response.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThanOrEqual(29);
    expect(retryAfter).toBeLessThanOrEqual(31);

    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(String(result.resetAt));
  });

  it('uses custom message when provided as a string (backward compat)', async () => {
    const result = { success: false, remaining: 0, resetAt: Date.now() + 5000 };
    const response = rateLimitResponse(result, 'Custom rate limit message.');
    const body = await response.json();
    expect(body.error).toBe('Custom rate limit message.');
  });

  it('floors Retry-After at 0 when reset is in the past', () => {
    const result = { success: false, remaining: 0, resetAt: Date.now() - 1000 };
    const response = rateLimitResponse(result);
    expect(Number(response.headers.get('Retry-After'))).toBe(0);
  });

  it('includes RATE_LIMITED code and structured metadata in body', async () => {
    const resetAt = Date.now() + 60_000;
    const result = { success: false, remaining: 0, resetAt };
    const response = rateLimitResponse(result);
    const body = await response.json();

    expect(body.code).toBe('RATE_LIMITED');
    expect(body.remaining).toBe(0);
    expect(body.resetAt).toBe(resetAt);
  });

  it('includes limit and tier context when provided via options object', async () => {
    const resetAt = Date.now() + 60_000;
    const result = { success: false, remaining: 0, resetAt };
    const response = rateLimitResponse(result, {
      message: 'Rate limit exceeded. Max 5 bouts per hour.',
      limit: 5,
      currentTier: 'free',
      upgradeTiers: [
        { tier: 'pass', limit: 15, url: '/sign-up?redirect_url=/arena#upgrade' },
        { tier: 'lab', limit: null, url: '/sign-up?redirect_url=/arena#upgrade' },
      ],
    });
    const body = await response.json();

    expect(body.error).toBe('Rate limit exceeded. Max 5 bouts per hour.');
    expect(body.code).toBe('RATE_LIMITED');
    expect(body.limit).toBe(5);
    expect(body.currentTier).toBe('free');
    expect(body.upgradeTiers).toHaveLength(2);
    expect(body.upgradeTiers[0]).toEqual({
      tier: 'pass',
      limit: 15,
      url: '/sign-up?redirect_url=/arena#upgrade',
    });
    expect(body.upgradeTiers[1]).toEqual({
      tier: 'lab',
      limit: null,
      url: '/sign-up?redirect_url=/arena#upgrade',
    });
  });

  it('omits optional fields when not provided', async () => {
    const result = { success: false, remaining: 0, resetAt: Date.now() + 5000 };
    const response = rateLimitResponse(result);
    const body = await response.json();

    expect(body.limit).toBeUndefined();
    expect(body.currentTier).toBeUndefined();
    expect(body.upgradeTiers).toBeUndefined();
  });

  it('omits upgradeTiers when array is empty', async () => {
    const result = { success: false, remaining: 0, resetAt: Date.now() + 5000 };
    const response = rateLimitResponse(result, {
      currentTier: 'lab',
      upgradeTiers: [],
    });
    const body = await response.json();

    expect(body.currentTier).toBe('lab');
    expect(body.upgradeTiers).toBeUndefined();
  });

  it('uses default message when options object has no message', async () => {
    const result = { success: false, remaining: 0, resetAt: Date.now() + 5000 };
    const response = rateLimitResponse(result, { limit: 10 });
    const body = await response.json();

    expect(body.error).toBe(API_ERRORS.RATE_LIMITED);
    expect(body.limit).toBe(10);
  });
});

describe('API_ERRORS', () => {
  it('exposes standard error message constants', () => {
    expect(API_ERRORS.AUTH_REQUIRED).toBe('Authentication required.');
    expect(API_ERRORS.FORBIDDEN).toBe('Forbidden.');
    expect(API_ERRORS.INVALID_JSON).toBe('Invalid JSON.');
    expect(API_ERRORS.NOT_FOUND).toBe('Not found.');
    expect(API_ERRORS.RATE_LIMITED).toBe('Rate limit exceeded.');
    expect(API_ERRORS.INTERNAL).toBe('Internal server error.');
    expect(API_ERRORS.SERVICE_UNAVAILABLE).toBe('Service unavailable.');
    expect(API_ERRORS.UNSAFE_CONTENT).toBe('Input contains disallowed content.');
  });
});
