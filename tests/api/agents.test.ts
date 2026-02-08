import { describe, expect, it } from 'vitest';

import { POST } from '@/app/api/agents/route';

describe('agents api', () => {
  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing name', async () => {
    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ systemPrompt: 'Be sharp.' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing prompt', async () => {
    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ name: 'NoPrompt' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
