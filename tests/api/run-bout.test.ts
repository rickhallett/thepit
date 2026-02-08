import { describe, expect, it } from 'vitest';

import { POST } from '@/app/api/run-bout/route';

describe('run-bout api', () => {
  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing boutId', async () => {
    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: JSON.stringify({ presetId: 'darwin-special' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
