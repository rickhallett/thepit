import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  generateResearchExportMock,
  getLatestExportMetadataMock,
  getExportPayloadMock,
} = vi.hoisted(() => ({
  generateResearchExportMock: vi.fn(),
  getLatestExportMetadataMock: vi.fn(),
  getExportPayloadMock: vi.fn(),
}));

vi.mock('@/lib/research-exports', () => ({
  generateResearchExport: generateResearchExportMock,
  getLatestExportMetadata: getLatestExportMetadataMock,
  getExportPayload: getExportPayloadMock,
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/admin/research-export/route';
import { GET } from '@/app/api/research/export/route';

const ADMIN_TOKEN = 'test-admin-token';

describe('research export APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ADMIN_SEED_TOKEN', ADMIN_TOKEN);
  });

  describe('POST /api/admin/research-export', () => {
    function makeReq(body: unknown, token?: string) {
      return new Request('http://localhost/api/admin/research-export', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-admin-token': token } : {}),
        },
      });
    }

    it('H1: generates export with valid token and version', async () => {
      generateResearchExportMock.mockResolvedValue({
        id: 1,
        version: 'v1.0.0',
        generatedAt: '2026-02-11T00:00:00Z',
        boutCount: 100,
        reactionCount: 500,
        voteCount: 200,
        agentCount: 50,
      });

      const res = await POST(makeReq({ version: 'v1.0.0' }, ADMIN_TOKEN));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.version).toBe('v1.0.0');
      expect(json.boutCount).toBe(100);
      expect(generateResearchExportMock).toHaveBeenCalledWith('v1.0.0');
    });

    it('U1: rejects without admin token', async () => {
      const res = await POST(makeReq({ version: 'v1.0.0' }));
      expect(res.status).toBe(401);
    });

    it('U2: rejects wrong admin token', async () => {
      const res = await POST(makeReq({ version: 'v1.0.0' }, 'wrong-token'));
      expect(res.status).toBe(401);
    });

    it('U3: rejects missing version', async () => {
      const res = await POST(makeReq({}, ADMIN_TOKEN));
      expect(res.status).toBe(400);
    });

    it('U4: rejects too-long version', async () => {
      const res = await POST(
        makeReq({ version: 'x'.repeat(17) }, ADMIN_TOKEN),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/research/export', () => {
    function makeReq(params?: string) {
      return new Request(
        `http://localhost/api/research/export${params ?? ''}`,
        { method: 'GET' },
      );
    }

    it('H1: returns latest export metadata', async () => {
      getLatestExportMetadataMock.mockResolvedValue({
        id: 1,
        version: 'v1.0.0',
        generatedAt: '2026-02-11T00:00:00Z',
        boutCount: 100,
        reactionCount: 500,
        voteCount: 200,
        agentCount: 50,
      });

      const res = await GET(makeReq());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.available).toBe(true);
      expect(json.version).toBe('v1.0.0');
    });

    it('H2: returns { available: false } when no exports exist', async () => {
      getLatestExportMetadataMock.mockResolvedValue(null);

      const res = await GET(makeReq());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.available).toBe(false);
    });

    it('H3: returns full payload as download for ?id=N', async () => {
      getExportPayloadMock.mockResolvedValue({
        exportVersion: 'v1.0.0',
        bouts: [],
      });

      const res = await GET(makeReq('?id=1'));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Disposition')).toContain(
        'thepit-research-export-1.json',
      );
      const json = JSON.parse(await res.text());
      expect(json.exportVersion).toBe('v1.0.0');
    });

    it('U1: returns 404 for unknown export ID', async () => {
      getExportPayloadMock.mockResolvedValue(null);

      const res = await GET(makeReq('?id=999'));
      expect(res.status).toBe(404);
    });

    it('U2: returns 400 for invalid export ID', async () => {
      const res = await GET(makeReq('?id=abc'));
      expect(res.status).toBe(400);
    });
  });
});
