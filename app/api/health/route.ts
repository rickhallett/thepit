import { sql } from 'drizzle-orm';

import { db } from '@/db';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/tier';
import { CREDITS_ENABLED, BYOK_ENABLED } from '@/lib/credits';
import { ASK_THE_PIT_ENABLED } from '@/lib/ask-the-pit-config';
import { EAS_ENABLED } from '@/lib/eas';
import { withLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const startedAt = new Date().toISOString();

/** Lightweight health check for uptime monitors and pitctl. */
async function rawGET() {
  let dbStatus: 'ok' | 'error' = 'error';
  let dbLatencyMs = -1;

  if (db) {
    const start = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = 'ok';
      dbLatencyMs = Date.now() - start;
    } catch {
      dbLatencyMs = Date.now() - start;
    }
  }

  const healthy = dbStatus === 'ok';

  const body = {
    status: healthy ? 'ok' : 'degraded',
    startedAt,
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    features: {
      subscriptions: SUBSCRIPTIONS_ENABLED,
      credits: CREDITS_ENABLED,
      byok: BYOK_ENABLED,
      eas: EAS_ENABLED,
      askThePit: ASK_THE_PIT_ENABLED,
    },
  };

  return Response.json(body, {
    status: healthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export const GET = withLogging(rawGET, 'health');
