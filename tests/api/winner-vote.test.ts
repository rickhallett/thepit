import { describe, expect, it } from 'vitest';

import { POST } from '@/app/api/winner-vote/route';

describe('winner-vote api', () => {
  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/winner-vote', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing fields', async () => {
    const req = new Request('http://localhost/api/winner-vote', {
      method: 'POST',
      body: JSON.stringify({ boutId: 'bout-1' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
