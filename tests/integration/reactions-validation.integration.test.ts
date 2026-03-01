/**
 * Integration tests: reactions bout/turn validation against real Postgres.
 *
 * Upgrades evidence from E1 (mocked DB) to E3 (live DB) for the
 * bout-exists and turn-index checks in POST /api/reactions.
 *
 * Gated by TEST_DATABASE_URL — skips when unavailable (standard pattern).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { nanoid } from 'nanoid';
import { inArray } from 'drizzle-orm';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const describeIf = TEST_DB_URL ? describe : describe.skip;

/* ------------------------------------------------------------------ */
/* Hoisted mocks — Clerk auth + rate limiter + hash (DB is real)      */
/* ------------------------------------------------------------------ */

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ success: true, remaining: 29, resetAt: Date.now() + 60_000 }),
  getClientIdentifier: () => '127.0.0.1',
}));

vi.mock('@/lib/hash', () => ({
  sha256Hex: vi.fn().mockResolvedValue('0xtest_fingerprint'),
}));

/* ------------------------------------------------------------------ */

let db: ReturnType<typeof import('@/db')['requireDb']> | null = null;
let schema: typeof import('@/db/schema') | null = null;
let POST: typeof import('@/app/api/reactions/route')['POST'] | null = null;

const TEST_PREFIX = 'test-rx-integ-';
const testBoutIds: string[] = [];

describeIf('reactions bout/turn validation (real Postgres)', () => {
  let boutId: string;

  beforeAll(async () => {
    vi.resetModules();
    process.env.DATABASE_URL = TEST_DB_URL;

    const dbModule = await import('@/db');
    schema = await import('@/db/schema');
    db = dbModule.requireDb();

    const routeModule = await import('@/app/api/reactions/route');
    POST = routeModule.POST;

    // Seed: create test bout with 2-turn transcript
    boutId = `${TEST_PREFIX}${nanoid(8)}`;
    testBoutIds.push(boutId);
    await db.insert(schema.bouts).values({
      id: boutId,
      presetId: 'test-preset',
      status: 'completed',
      transcript: [
        { turn: 0, agentId: 'agent-a', agentName: 'Alpha', text: 'Hello' },
        { turn: 1, agentId: 'agent-b', agentName: 'Bravo', text: 'World' },
      ],
    });

    // Anonymous user (reactions allow anonymous)
    authMock.mockResolvedValue({ userId: null });
  });

  afterAll(async () => {
    if (!db || !schema) return;

    // Clean up in FK-safe order (reactions cascade from bouts)
    if (testBoutIds.length > 0) {
      await db
        .delete(schema.reactions)
        .where(inArray(schema.reactions.boutId, testBoutIds));
      await db
        .delete(schema.bouts)
        .where(inArray(schema.bouts.id, testBoutIds));
    }
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('rejects reaction for non-existent bout against live DB', async () => {
    const fakeBoutId = `${TEST_PREFIX}${nanoid(8)}`;

    const res = await POST!(makeReq({
      boutId: fakeBoutId,
      turnIndex: 0,
      reactionType: 'heart',
    }));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Bout not found.');
  });

  it('rejects reaction for out-of-bounds turnIndex against live DB', async () => {
    const res = await POST!(makeReq({
      boutId,
      turnIndex: 99,
      reactionType: 'fire',
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid turn index.');
  });
});
