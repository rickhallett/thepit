/**
 * Integration tests: winner-vote participant validation against real Postgres.
 *
 * Upgrades evidence from E1 (mocked DB) to E3 (live DB) for the
 * participant-check logic in POST /api/winner-vote.
 *
 * Gated by TEST_DATABASE_URL — skips when unavailable (standard pattern).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { nanoid } from 'nanoid';
import { eq, inArray } from 'drizzle-orm';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const describeIf = TEST_DB_URL ? describe : describe.skip;

/* ------------------------------------------------------------------ */
/* Hoisted mocks — Clerk auth + rate limiter (DB is real)             */
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

/* ------------------------------------------------------------------ */

let db: ReturnType<typeof import('@/db')['requireDb']> | null = null;
let schema: typeof import('@/db/schema') | null = null;
let POST: typeof import('@/app/api/winner-vote/route')['POST'] | null = null;

const TEST_PREFIX = 'test-wv-integ-';
const testUserIds: string[] = [];
const testBoutIds: string[] = [];

describeIf('winner-vote participant validation (real Postgres)', () => {
  let boutId: string;
  const userId = `${TEST_PREFIX}user-${nanoid(8)}`;

  beforeAll(async () => {
    vi.resetModules();
    process.env.DATABASE_URL = TEST_DB_URL;

    const dbModule = await import('@/db');
    schema = await import('@/db/schema');
    db = dbModule.requireDb();

    const routeModule = await import('@/app/api/winner-vote/route');
    POST = routeModule.POST;

    // Seed: create test user (FK target for winner_votes.userId)
    testUserIds.push(userId);
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@test.local`,
    }).onConflictDoNothing();

    // Seed: create test bout with known transcript
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

    // Default: authenticated test user
    authMock.mockResolvedValue({ userId });
  });

  afterAll(async () => {
    if (!db || !schema) return;

    // Clean up in FK-safe order
    if (testBoutIds.length > 0) {
      await db
        .delete(schema.winnerVotes)
        .where(inArray(schema.winnerVotes.boutId, testBoutIds));
      await db
        .delete(schema.bouts)
        .where(inArray(schema.bouts.id, testBoutIds));
    }
    if (testUserIds.length > 0) {
      await db
        .delete(schema.users)
        .where(inArray(schema.users.id, testUserIds));
    }
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/winner-vote', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('rejects vote for non-participant agent against live DB', async () => {
    const res = await POST!(makeReq({ boutId, agentId: 'intruder' }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Agent was not a participant in this bout.');
  });

  it('accepts vote for participant agent against live DB', async () => {
    const res = await POST!(makeReq({ boutId, agentId: 'agent-a' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
