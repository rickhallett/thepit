import { describe, expect, it } from 'vitest';

import { POST } from '@/app/api/reactions/route';

describe('reactions api', () => {
  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing fields', async () => {
    const req = new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: JSON.stringify({ boutId: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid reaction type', async () => {
    const req = new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: JSON.stringify({
        boutId: 'bout-1',
        turnIndex: 1,
        reactionType: 'lol',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
