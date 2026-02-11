import { describe, expect, it } from 'vitest';
import {
  parseJsonBody,
  errorResponse,
  rateLimitResponse,
  API_ERRORS,
} from '@/lib/api-utils';

describe('parseJsonBody', () => {
  it('parses valid JSON and returns data', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await parseJsonBody<{ foo: string }>(req);
    expect(result.data).toEqual({ foo: 'bar' });
    expect(result.error).toBeUndefined();
  });

  it('returns 400 error Response for invalid JSON', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: '{invalid',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await parseJsonBody(req);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Response);
    expect(result.error!.status).toBe(400);
    const body = await result.error!.json();
    expect(body.error).toBe(API_ERRORS.INVALID_JSON);
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

  it('uses custom message when provided', async () => {
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
