/**
 * Simulation Test Utilities
 *
 * Auth management, HTTP helpers, SSE stream reader, and test runner
 * infrastructure for live API simulation tests against production.
 */

import { createClerkClient } from '@clerk/backend';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const BASE_URL =
  process.env.QA_BASE_URL || 'https://www.thepit.cloud';

const SESSION_ID =
  process.env.QA_SESSION_ID || 'sess_39dsP8wcCmB2bxmZi2XXF8Xhzn5';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

let cachedToken: { jwt: string; expiresAt: number } | null = null;

/**
 * Get a valid Clerk JWT for the QA test user.
 * Caches the token and refreshes when within 10s of expiry.
 */
export async function getAuthToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10_000) {
    return cachedToken.jwt;
  }

  if (!CLERK_SECRET_KEY) {
    throw new Error(
      'CLERK_SECRET_KEY is required for authenticated tests. Set it in .env',
    );
  }

  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

  // Verify session is still active
  const session = await clerk.sessions.getSession(SESSION_ID);
  if (session.status !== 'active') {
    throw new Error(
      `Session ${SESSION_ID} is ${session.status}. Create a new session or sign in again.`,
    );
  }

  const token = await clerk.sessions.getToken(SESSION_ID);
  cachedToken = {
    jwt: token.jwt,
    expiresAt: Date.now() + 55_000, // Clerk JWTs expire in 60s; refresh at 55s
  };

  return token.jwt;
}

export function hasAuth(): boolean {
  return !!CLERK_SECRET_KEY;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  body?: unknown;
  auth?: boolean;
  timeout?: number;
  headers?: Record<string, string>;
}

export async function api(
  path: string,
  opts: ApiOptions = {},
): Promise<Response> {
  const { method = 'POST', body, auth = false, timeout = 10_000 } = opts;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };

  if (auth) {
    headers['Authorization'] = `Bearer ${await getAuthToken()}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// SSE Stream Reader
// ---------------------------------------------------------------------------

export interface SSEEvent {
  event?: string;
  data?: string;
  id?: string;
}

export interface StreamResult {
  events: SSEEvent[];
  turnCount: number;
  textLength: number;
  shareLine: string | null;
  agents: Set<string>;
  durationMs: number;
  rawText: string;
}

/**
 * Consume an SSE response stream to completion.
 * Parses all events, extracts turn data, text deltas, and share lines.
 */
export async function consumeSSEStream(
  response: Response,
  timeoutMs = 180_000,
): Promise<StreamResult> {
  const start = Date.now();
  const events: SSEEvent[] = [];
  const agents = new Set<string>();
  let turnCount = 0;
  let textLength = 0;
  let shareLine: string | null = null;
  let rawText = '';

  if (!response.body) {
    throw new Error('Response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const timer = setTimeout(() => {
    reader.cancel();
  }, timeoutMs);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete last line

      let currentEvent: SSEEvent = {};

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent.event = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          currentEvent.data = line.slice(5).trim();
        } else if (line.startsWith('id:')) {
          currentEvent.id = line.slice(3).trim();
        } else if (line === '') {
          // Empty line = end of event
          if (currentEvent.event || currentEvent.data) {
            events.push({ ...currentEvent });

            // Parse known event types
            if (currentEvent.data) {
              try {
                const parsed = JSON.parse(currentEvent.data);

                if (parsed.type === 'data-turn') {
                  turnCount++;
                  if (parsed.data?.agentName) {
                    agents.add(parsed.data.agentName);
                  }
                }

                if (parsed.type === 'text-delta' && parsed.delta) {
                  textLength += parsed.delta.length;
                  rawText += parsed.delta;
                }

                if (parsed.type === 'data-share-line' && parsed.data?.text) {
                  shareLine = parsed.data.text;
                }
              } catch {
                // Not all events are JSON (some are text deltas in ai-sdk format)
                // The AI SDK uses a custom format: 0:"text" for text deltas
                if (currentEvent.data.startsWith('0:')) {
                  try {
                    const text = JSON.parse(currentEvent.data.slice(2));
                    if (typeof text === 'string') {
                      textLength += text.length;
                      rawText += text;
                    }
                  } catch {
                    // ignore
                  }
                }
              }
            }
          }
          currentEvent = {};
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }

  return {
    events,
    turnCount,
    textLength,
    shareLine,
    agents,
    durationMs: Date.now() - start,
    rawText,
  };
}

// ---------------------------------------------------------------------------
// Unique ID generator (no nanoid dependency — simple crypto-based)
// ---------------------------------------------------------------------------

export function uniqueId(prefix = 'sim'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = prefix + '-';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// ---------------------------------------------------------------------------
// Test Runner Infrastructure
// ---------------------------------------------------------------------------

export type TestIntent = 'serious' | 'power-user' | 'adversarial' | 'ludicrous';

export interface TestDef {
  id: string;
  name: string;
  intent: TestIntent;
  requiresAuth: boolean;
  run: () => Promise<TestResult>;
}

export interface TestResult {
  passed: boolean;
  error?: string;
  evidence?: string;
  durationMs: number;
}

export interface SectionResult {
  name: string;
  tests: { def: TestDef; result: TestResult }[];
}

const INTENT_ICONS: Record<TestIntent, string> = {
  serious: '🎓',
  'power-user': '⚡',
  adversarial: '🗡️',
  ludicrous: '🤡',
};

/**
 * Run a single test with error handling and timing.
 */
export async function runTest(def: TestDef): Promise<TestResult> {
  const start = Date.now();
  try {
    if (def.requiresAuth && !hasAuth()) {
      return {
        passed: false,
        error: 'SKIP: No auth credentials',
        durationMs: 0,
      };
    }
    const result = await def.run();
    result.durationMs = Date.now() - start;
    return result;
  } catch (err) {
    return {
      passed: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Run a section of tests and print results.
 */
export async function runSection(
  name: string,
  tests: TestDef[],
): Promise<SectionResult> {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'─'.repeat(60)}`);

  const results: { def: TestDef; result: TestResult }[] = [];

  for (const def of tests) {
    const icon = INTENT_ICONS[def.intent];
    process.stdout.write(`  ${icon} ${def.id}: ${def.name}... `);

    const result = await runTest(def);
    results.push({ def, result });

    if (result.error?.startsWith('SKIP')) {
      console.log(`⏭️  (${result.error})`);
    } else if (result.passed) {
      console.log(`✅ (${result.durationMs}ms)`);
      if (result.evidence) {
        console.log(`     ${result.evidence}`);
      }
    } else {
      console.log(`❌ (${result.durationMs}ms)`);
      console.log(`     Error: ${result.error}`);
      if (result.evidence) {
        console.log(`     Evidence: ${result.evidence}`);
      }
    }
  }

  return { name, tests: results };
}

/**
 * Check if the target server is reachable.
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(BASE_URL, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok || res.status === 405;
  } catch {
    return false;
  }
}

/**
 * Print a summary of all section results.
 */
export function printSummary(sections: SectionResult[]): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  SIMULATION RESULTS');
  console.log(`${'═'.repeat(60)}`);

  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  const byIntent: Record<TestIntent, { total: number; passed: number }> = {
    serious: { total: 0, passed: 0 },
    'power-user': { total: 0, passed: 0 },
    adversarial: { total: 0, passed: 0 },
    ludicrous: { total: 0, passed: 0 },
  };

  for (const section of sections) {
    const sPass = section.tests.filter((t) => t.result.passed).length;
    const sFail = section.tests.filter(
      (t) => !t.result.passed && !t.result.error?.startsWith('SKIP'),
    ).length;
    const sSkip = section.tests.filter((t) =>
      t.result.error?.startsWith('SKIP'),
    ).length;

    console.log(
      `  ${section.name}: ${sPass}/${section.tests.length - sSkip} passed${sSkip ? ` (${sSkip} skipped)` : ''}`,
    );

    total += section.tests.length;
    passed += sPass;
    failed += sFail;
    skipped += sSkip;

    for (const { def, result } of section.tests) {
      byIntent[def.intent].total++;
      if (result.passed) byIntent[def.intent].passed++;
    }
  }

  console.log(`\n  Total: ${passed}/${total - skipped} passed, ${failed} failed, ${skipped} skipped`);
  console.log('');
  console.log('  By intent:');
  for (const [intent, counts] of Object.entries(byIntent)) {
    const icon = INTENT_ICONS[intent as TestIntent];
    console.log(
      `    ${icon} ${intent}: ${counts.passed}/${counts.total}`,
    );
  }

  console.log(`${'═'.repeat(60)}\n`);

  // Exit code reflects overall pass/fail
  if (failed > 0) {
    process.exitCode = 1;
  }
}
