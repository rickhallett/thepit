import { describe, expect, it } from 'vitest';
import { parseJsonBody, errorResponse } from '@/lib/api-utils';

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
    expect(body.error).toBe('Invalid JSON.');
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
});
