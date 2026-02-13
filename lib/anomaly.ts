// Lightweight server-side anomaly detection for API routes.
//
// Runs in-memory sliding window analysis to detect:
//   1. Burst traffic from a single IP across any endpoint
//   2. Credential probing (repeated 401/403 from same IP)
//   3. Error rate spikes per route
//   4. Missing or suspicious user-agent patterns
//
// Detection is best-effort — each serverless instance has independent state.
// The anomaly detector logs warnings but does not enforce blocks. Rate limiting
// (lib/rate-limit.ts) and DB constraints handle enforcement.

import { log } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BURST_WINDOW_MS = 60_000; // 1 minute
const BURST_THRESHOLD = 100; // >100 requests/min from one IP = suspicious
const AUTH_FAIL_WINDOW_MS = 300_000; // 5 minutes
const AUTH_FAIL_THRESHOLD = 20; // >20 auth failures in 5 min = probing
const ERROR_RATE_WINDOW_MS = 300_000; // 5 minutes
const ERROR_RATE_THRESHOLD = 0.5; // >50% error rate on a route = spike
const ERROR_RATE_MIN_REQUESTS = 10; // Need at least 10 requests to evaluate

/** Known bot UA substrings that are benign (search engine crawlers). */
const BENIGN_BOTS = ['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider'];

// ---------------------------------------------------------------------------
// In-memory sliding window stores
// ---------------------------------------------------------------------------

type WindowEntry = { count: number; windowStart: number };
type RouteErrorEntry = { total: number; errors: number; windowStart: number };

const burstStore = new Map<string, WindowEntry>();
const authFailStore = new Map<string, WindowEntry>();
const routeErrorStore = new Map<string, RouteErrorEntry>();
const reportedAnomalies = new Map<string, number>(); // dedup: key → last reported ts

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of burstStore) {
    if (now - entry.windowStart > BURST_WINDOW_MS) burstStore.delete(key);
  }
  for (const [key, entry] of authFailStore) {
    if (now - entry.windowStart > AUTH_FAIL_WINDOW_MS) authFailStore.delete(key);
  }
  for (const [key, entry] of routeErrorStore) {
    if (now - entry.windowStart > ERROR_RATE_WINDOW_MS) routeErrorStore.delete(key);
  }
  for (const [key, ts] of reportedAnomalies) {
    if (now - ts > ERROR_RATE_WINDOW_MS) reportedAnomalies.delete(key);
  }
}

function increment(
  store: Map<string, WindowEntry>,
  key: string,
  windowMs: number,
): WindowEntry {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    const newEntry = { count: 1, windowStart: now };
    store.set(key, newEntry);
    return newEntry;
  }
  entry.count += 1;
  return entry;
}

/** Emit an anomaly warning at most once per key per window. */
function reportOnce(type: string, key: string, details: Record<string, unknown>) {
  const reportKey = `${type}:${key}`;
  const now = Date.now();
  const lastReported = reportedAnomalies.get(reportKey);
  if (lastReported && now - lastReported < ERROR_RATE_WINDOW_MS) return;

  reportedAnomalies.set(reportKey, now);
  log.warn('anomaly_detected', { type, ...details });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type AnomalyInput = {
  clientIp: string;
  userAgent: string;
  route: string;
  status: number;
};

/**
 * Check a completed request for anomalous patterns.
 * Non-blocking — should be called after the response is sent.
 */
export function checkAnomaly(input: AnomalyInput): void {
  cleanup();

  const { clientIp, userAgent, route, status } = input;

  // 1. Burst detection — high request volume from a single IP
  if (clientIp && clientIp !== 'unknown') {
    const burst = increment(burstStore, clientIp, BURST_WINDOW_MS);
    if (burst.count > BURST_THRESHOLD) {
      reportOnce('burst', clientIp, {
        ip: clientIp,
        count: burst.count,
        windowMs: BURST_WINDOW_MS,
      });
    }
  }

  // 2. Credential probing — repeated auth failures from same IP
  if ((status === 401 || status === 403) && clientIp && clientIp !== 'unknown') {
    const authFail = increment(authFailStore, clientIp, AUTH_FAIL_WINDOW_MS);
    if (authFail.count > AUTH_FAIL_THRESHOLD) {
      reportOnce('credential_probing', clientIp, {
        ip: clientIp,
        failCount: authFail.count,
        windowMs: AUTH_FAIL_WINDOW_MS,
      });
    }
  }

  // 3. Error rate spike per route
  const now = Date.now();
  let routeEntry = routeErrorStore.get(route);
  if (!routeEntry || now - routeEntry.windowStart > ERROR_RATE_WINDOW_MS) {
    routeEntry = { total: 0, errors: 0, windowStart: now };
    routeErrorStore.set(route, routeEntry);
  }
  routeEntry.total += 1;
  if (status >= 500) routeEntry.errors += 1;

  if (
    routeEntry.total >= ERROR_RATE_MIN_REQUESTS &&
    routeEntry.errors / routeEntry.total > ERROR_RATE_THRESHOLD
  ) {
    reportOnce('error_rate_spike', route, {
      route,
      total: routeEntry.total,
      errors: routeEntry.errors,
      rate: (routeEntry.errors / routeEntry.total).toFixed(2),
    });
  }

  // 4. Suspicious user-agent — missing UA or very short UA
  const ua = userAgent ?? '';
  if (!userAgent || userAgent.length < 10) {
    const isBot = BENIGN_BOTS.some((bot) => ua.toLowerCase().includes(bot));
    if (!isBot) {
      reportOnce('suspicious_ua', clientIp, {
        ip: clientIp,
        userAgent: userAgent || '(empty)',
        route,
      });
    }
  }
}
