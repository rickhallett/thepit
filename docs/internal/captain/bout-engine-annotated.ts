// >> ============================================================
// >> ANNOTATED REFERENCE COPY - lib/bout-engine.ts
// >> Date: 2026-03-16 | L1 Review | Weaver
// >> This is a read-only reference. The live file is lib/bout-engine.ts.
// >>
// >> THE NEXUS: 1,274 lines, 24 dependencies, highest fan-out in the
// >> codebase. Every other module in the system either feeds into this
// >> file or consumes its output. If you understand this file, you
// >> understand the product.
// >>
// >> THREE PHASES (enforced, not just documented):
// >>   Phase 1: validateBoutRequest() -> BoutContext (lines 169-507)
// >>   Phase 2: executeBout() -> BoutResult           (lines 541-1274)
// >>   Phase 3: (caller) wraps in SSE stream or JSON  (in route files)
// >>
// >> The boundary between phases is a TypeScript tagged union.
// >> Phase 1 returns { ok: false, error } or { ok: true, context }.
// >> You cannot access context without first checking ok === true.
// >> This is compile-time enforcement, not convention.
// >> ============================================================

// Core bout execution engine.
//
// Extracted from app/api/run-bout/route.ts to enable both streaming (SSE)
// and synchronous (REST) consumption of the same bout logic.
//
// Three phases:
//   1. validateBoutRequest() - parse, auth, tier, credits, idempotency
//   2. executeBout()         - turn loop, transcript, share line, DB persist, credit settle
//   3. (caller)              - wrap in streaming or return JSON
//

// >> ============================================================
// >> IMPORTS: 24 modules. This is the coupling surface.
// >> Every module listed here is a dependency that, if changed,
// >> could break bout execution. L1 flagged this as the highest
// >> fan-out in the codebase.
// >>
// >> Rough categories:
// >>   - Node builtins: crypto (timingSafeEqual)
// >>   - External: Sentry, Clerk, drizzle-orm
// >>   - Infrastructure: logger, api-utils, rate-limit, async-context
// >>   - Core domain: ai, models, presets, bout-lineup, xml-prompt
// >>   - Business: credits, tier, intro-pool, byok
// >>   - Research: experiment, refusal-detection
// >>   - Data: db/index, db/schema
// >> ============================================================

import { timingSafeEqual } from 'crypto';
// The streaming route passes an onTurnEvent callback to write SSE events.
// The sync route omits it and gets the final result directly.

import * as Sentry from '@sentry/nextjs';
import { tracedStreamText, untracedStreamText, withTracing } from '@/lib/langsmith';
import { getContext } from '@/lib/async-context';
import { and, eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

import { requireDb } from '@/db';
import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { serverTrack, serverCaptureAIGeneration, flushServerAnalytics } from '@/lib/posthog-server';
import { buildSystemMessage, buildUserMessage, buildSharePrompt, estimatePromptTokens, truncateHistoryToFit } from '@/lib/xml-prompt';
import { getRequestId } from '@/lib/request-context';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { readAndClearByokKey } from '@/lib/byok';
import {
  getModel,
} from '@/lib/ai';
import {
  DEFAULT_FREE_MODEL as FREE_MODEL_ID,
  PREMIUM_MODEL_IDS as PREMIUM_MODEL_OPTIONS,
  getInputTokenBudget,
  DEFAULT_PREMIUM_MODEL,
} from '@/lib/model-registry';
import {
  ARENA_PRESET_ID,
  DEFAULT_AGENT_COLOR,
  getPresetById,
  type Preset,
} from '@/lib/presets';
import { buildArenaPresetFromLineup } from '@/lib/bout-lineup';
import { resolveResponseLength, type ResponseLengthConfig } from '@/lib/response-lengths';
import { resolveResponseFormat, type ResponseFormat } from '@/lib/response-formats';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import {
  CREDITS_ENABLED,
  applyCreditDelta,
  computeCostGbp,
  computeCostUsd,
  estimateBoutCostGbp,
  estimateTokensFromText,
  preauthorizeCredits,
  settleCredits,
  toMicroCredits,
  BYOK_ENABLED,
} from '@/lib/credits';
import {
  getIntroPoolStatus,
  consumeIntroPoolAnonymous,
  refundIntroPool,
} from '@/lib/intro-pool';
import {
  SUBSCRIPTIONS_ENABLED,
  getUserTier,
  canRunBout,
  canAccessModel,
  incrementFreeBoutsUsed,
  getFreeBoutsUsed,
} from '@/lib/tier';
// free-bout-pool removed - intro pool half-life is the sole anonymous cost gate.
// Authenticated free-tier users are now gated by credits only (no daily pool cap).
const FIRST_BOUT_PROMOTION_MODEL = DEFAULT_PREMIUM_MODEL;
import { UNSAFE_PATTERN } from '@/lib/validation';
import { detectRefusal, logRefusal } from '@/lib/refusal-detection';
import { errorResponse, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import type { PromptHook, ScriptedTurn } from '@/lib/experiment';
import { appendExperimentInjection } from '@/lib/experiment';

// >> ============================================================
// >> ANTHROPIC PROMPT CACHING
// >> This is a cost optimisation. The system message (safety text +
// >> persona + format) is identical across turns within a bout.
// >> Marking it as a cache breakpoint means Anthropic reuses the
// >> cached KV pairs instead of reprocessing the prefix each turn.
// >> Saves real money at scale. Ignored by non-Anthropic providers.
// >> ============================================================

const ANTHROPIC_CACHE_CONTROL = {
  anthropic: { cacheControl: { type: 'ephemeral' as const } },
} as const;

export function isAnthropicModel(modelId: string): boolean {
  return modelId.startsWith('anthropic/');
}

// >> ============================================================
// >> TYPES: The contract between phases.
// >>
// >> BoutContext is the output of Phase 1 and input to Phase 2.
// >> Everything Phase 2 needs is in this object. The phases do not
// >> share mutable state - they share a typed contract.
// >>
// >> BoutValidation is the tagged union that enforces the phase
// >> boundary at compile time.
// >>
// >> TurnEvent is the SSE protocol - what the streaming consumer
// >> receives. Six event types covering the full turn lifecycle.
// >>
// >> INTERVIEW POINT: "The phase boundary is enforced through a
// >> TypeScript tagged union, not convention. You cannot access
// >> the bout context without first proving the validation passed."
// >> ============================================================

export type ByokKeyData = {
  modelId: string | undefined;
  key: string;
};

export type BoutContext = {
  boutId: string;
  presetId: string;
  preset: Preset;
  topic: string;
  lengthConfig: ResponseLengthConfig;
  formatConfig: ResponseFormat;
  modelId: string;
  byokData: ByokKeyData | null;
  userId: string | null;
  preauthMicro: number;
  introPoolConsumedMicro: number;
  tier: 'anonymous' | 'free' | 'pass' | 'lab';
  requestId: string;
  db: ReturnType<typeof requireDb>;
  // >> Experiment infrastructure: these two fields enable research
  // >> API callers to inject content into prompts (promptHook) or
  // >> bypass the LLM entirely with scripted responses (scriptedTurns).
  // >> Null/undefined for normal operation. This is how The Pit runs
  // >> controlled experiments on agent behaviour.
  promptHook?: PromptHook;
  scriptedTurns?: Map<number, ScriptedTurn>;
};

export type BoutResult = {
  transcript: TranscriptEntry[];
  shareLine: string | null;
  inputTokens: number;
  outputTokens: number;
};

export type TurnEvent =
  | { type: 'start'; messageId: string }
  | { type: 'data-turn'; data: { turn: number; agentId: string; agentName: string; color: string } }
  | { type: 'text-start'; id: string }
  | { type: 'text-delta'; id: string; delta: string }
  | { type: 'text-end'; id: string }
  | { type: 'data-share-line'; data: { text: string } };

// >> ============================================================
// >> PHASE 1: VALIDATION (~340 lines)
// >>
// >> A pipeline of early returns. Each check either rejects with
// >> { ok: false, error: Response } or falls through to the next.
// >> The pipeline order matters - cheapest checks first, DB hits later.
// >>
// >> Pipeline sequence:
// >>   parse JSON -> validate boutId -> topic length -> unsafe pattern
// >>   -> get DB -> idempotency check -> resolve preset
// >>   -> auth (Clerk) -> BYOK key -> ownership check
// >>   -> research API bypass -> rate limiting -> model access
// >>   -> first-bout promotion -> credit pre-auth -> ensure bout row
// >>   -> return { ok: true, context }
// >> ============================================================

export type BoutValidation =
  | { ok: false; error: Response }
  | { ok: true; context: BoutContext };

export async function validateBoutRequest(
  req: Request,
): Promise<BoutValidation> {
  let payload: {
    presetId?: string;
    boutId?: string;
    topic?: string;
    model?: string;
    length?: string;
    format?: string;
    turns?: string | number;
  };

  try {
    payload = await req.json();
  } catch {
    return { ok: false, error: errorResponse(API_ERRORS.INVALID_JSON, 400) };
  }

  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: errorResponse(API_ERRORS.INVALID_JSON, 400) };
  }

  const requestId = getRequestId(req);
  const { boutId } = payload;
  let topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
  let lengthKey =
    typeof payload.length === 'string' ? payload.length.trim() : '';
  let lengthConfig = resolveResponseLength(lengthKey);
  let formatKey =
    typeof payload.format === 'string' ? payload.format.trim() : '';
  let formatConfig = resolveResponseFormat(formatKey);
  let { presetId } = payload;

  if (!boutId) {
    return { ok: false, error: errorResponse('Missing boutId.', 400) };
  }

  if (topic.length > 500) {
    return { ok: false, error: errorResponse('Topic must be 500 characters or fewer.', 400) };
  }

  if (UNSAFE_PATTERN.test(topic)) {
    return { ok: false, error: errorResponse(API_ERRORS.UNSAFE_CONTENT, 400) };
  }

  let db: ReturnType<typeof requireDb>;
  try {
    db = requireDb();
  } catch {
    return { ok: false, error: errorResponse(API_ERRORS.SERVICE_UNAVAILABLE, 503) };
  }

  // >> IDEMPOTENCY CHECK: Prevents double-execution.
  // >> If the bout already exists and is running with a transcript,
  // >> or if it is completed, reject. This handles retries and
  // >> double-clicks from the UI. The check is on boutId, which is
  // >> generated client-side (UUID), so the client controls idempotency.
  const [existingBout] = await db
    .select({
      status: bouts.status,
      presetId: bouts.presetId,
      transcript: bouts.transcript,
      ownerId: bouts.ownerId,
    })
    .from(bouts)
    .where(eq(bouts.id, boutId))
    .limit(1);

  if (existingBout) {
    const hasTranscript =
      Array.isArray(existingBout.transcript) && existingBout.transcript.length > 0;

    if (existingBout.status === 'running' && hasTranscript) {
      return { ok: false, error: errorResponse('Bout is already running.', 409) };
    }
    if (existingBout.status === 'completed') {
      return { ok: false, error: errorResponse('Bout has already completed.', 409) };
    }
  }

  if (!presetId) {
    presetId = existingBout?.presetId;
  }

  if (!presetId) {
    return { ok: false, error: errorResponse('Missing presetId.', 400) };
  }

  // >> PRESET RESOLUTION: Two paths.
  // >> 1. Built-in preset: looked up by ID from the JSON preset files.
  // >> 2. Custom arena: user-built lineup stored in the bouts table.
  // >>    If presetId is ARENA_PRESET_ID, we read the lineup from DB
  // >>    and build a synthetic preset from it.
  let preset: Preset | undefined = getPresetById(presetId);

  if (!preset && presetId === ARENA_PRESET_ID) {
    const [row] = await db
      .select({
        agentLineup: bouts.agentLineup,
        topic: bouts.topic,
        responseLength: bouts.responseLength,
        responseFormat: bouts.responseFormat,
        maxTurns: bouts.maxTurns,
      })
      .from(bouts)
      .where(eq(bouts.id, boutId))
      .limit(1);
    if (!row?.agentLineup) {
      return { ok: false, error: errorResponse('Unknown preset.', 404) };
    }
    preset = buildArenaPresetFromLineup(row.agentLineup, row.maxTurns);
    if (!topic && row.topic) {
      topic = row.topic;
    }
    if (!lengthKey && row.responseLength) {
      lengthKey = row.responseLength;
      lengthConfig = resolveResponseLength(lengthKey);
    }
    if (!formatKey && row.responseFormat) {
      formatKey = row.responseFormat;
      formatConfig = resolveResponseFormat(formatKey);
    }
  }

  if (!preset) {
    return { ok: false, error: errorResponse('Unknown preset.', 404) };
  }

  const requestedModel =
    typeof payload.model === 'string' ? payload.model.trim() : '';

  const { userId } = await auth();

  // >> BYOK (Bring Your Own Key): User's API key is stored in a
  // >> cookie, read here, and CLEARED immediately. The key lives in
  // >> memory for the duration of the request only. This is a
  // >> security decision - the key is never persisted server-side.
  let byokData: ByokKeyData | null = null;
  if (requestedModel === 'byok' && userId) {
    const jar = await cookies();
    byokData = readAndClearByokKey(jar);
  }

  if (existingBout?.ownerId && existingBout.ownerId !== userId) {
    return { ok: false, error: errorResponse(API_ERRORS.FORBIDDEN, 403) };
  }

  // >> SECURITY: timingSafeEqual prevents timing attacks on key comparison.
  // >> A naive === comparison leaks information about which bytes match
  // >> through response time variance. timingSafeEqual takes constant time
  // >> regardless of where the first mismatch is.
  // >>
  // >> INTERVIEW POINT: "I used timing-safe comparison for the research
  // >> API key to prevent timing side-channel attacks. The standard ===
  // >> operator leaks information through response time."
  const researchKey = req.headers.get('x-research-key');
  const expected = process.env.RESEARCH_API_KEY;
  let researchBypass = false;
  if (researchKey && expected) {
    const a = Buffer.from(researchKey);
    const b = Buffer.from(expected);
    researchBypass = a.length === b.length && timingSafeEqual(a, b);
  }

  if (researchBypass) {
    log.info('Research bypass active', { boutId, presetId });
  }

  // >> TIER-AWARE RATE LIMITING: Different limits per user tier.
  // >> anonymous: 2/hr, free: 5/hr, pass: 15/hr, lab: unlimited.
  // >> The tier is resolved ONCE here and reused for both rate limiting
  // >> and model access - avoids a redundant DB read.
  const currentTier = researchBypass
    ? ('lab' as const)
    : userId
      ? await getUserTier(userId)
      : ('anonymous' as const);

  const BOUT_LIMITS: Record<string, number> = { anonymous: 2, free: 5, pass: 15 };
  const boutMaxRequests = BOUT_LIMITS[currentTier]; // undefined for lab -> skip

  if (boutMaxRequests !== undefined) {
    const rateLimitId = userId ?? getClientIdentifier(req);
    const boutRateCheck = await checkRateLimit(
      { name: 'bout-creation', maxRequests: boutMaxRequests, windowMs: 60 * 60 * 1000 },
      rateLimitId,
    );
    if (!boutRateCheck.success) {
      // >> The 429 response includes upgrade paths - tells the user
      // >> exactly what tier they need and where to get it. Product
      // >> decision: rate limits are a conversion funnel, not just a guard.
      return {
        ok: false as const,
        error: rateLimitResponse(boutRateCheck, {
          message: `Rate limit exceeded. Max ${boutMaxRequests} bouts per hour.`,
          limit: boutMaxRequests,
          currentTier,
          upgradeTiers:
            currentTier === 'lab'
              ? []
              : [
                  ...(currentTier !== 'pass'
                    ? [{ tier: 'pass', limit: 15, url: userId ? '/arena#upgrade' : '/sign-up?redirect_url=/arena#upgrade' }]
                    : []),
                  { tier: 'lab', limit: null, url: userId ? '/arena#upgrade' : '/sign-up?redirect_url=/arena#upgrade' },
                ],
        }),
      };
    }
  }

  // >> MODEL ACCESS CONTROL: Which models each tier can use.
  // >> Free users get Haiku. Pass users get premium models.
  // >> BYOK users bring their own. Lab tier gets everything.
  const isByok = requestedModel === 'byok' && BYOK_ENABLED;
  let modelId = FREE_MODEL_ID;

  if (SUBSCRIPTIONS_ENABLED && userId) {
    const tier = currentTier as Exclude<typeof currentTier, 'anonymous'>;

    const boutCheck = await canRunBout(userId, isByok);
    if (!boutCheck.allowed) {
      return { ok: false, error: errorResponse(boutCheck.reason, 402) };
    }

    if (isByok) {
      if (!byokData?.key) {
        return { ok: false, error: errorResponse('BYOK key required.', 400) };
      }
      modelId = 'byok';
    } else if (requestedModel && PREMIUM_MODEL_OPTIONS.includes(requestedModel)) {
      if (!canAccessModel(tier, requestedModel)) {
        return {
          ok: false,
          error: errorResponse(
            'Your plan does not include access to this model. Upgrade or use BYOK.',
            402,
          ),
        };
      }
      modelId = requestedModel;
    } else if (preset.tier === 'premium' || preset.id === ARENA_PRESET_ID) {
      const allowed = PREMIUM_MODEL_OPTIONS.filter((m: string) => canAccessModel(tier, m));
      modelId = allowed[0] ?? FREE_MODEL_ID;
    }

    // >> FIRST-BOUT PROMOTION: Product growth mechanic.
    // >> Free users get a premium model on their very first bout so
    // >> they experience the quality difference and want to upgrade.
    // >> Classic "first hit is free" pattern. Only fires once.
    if (
      !isByok &&
      tier === 'free' &&
      modelId === FREE_MODEL_ID &&
      !requestedModel
    ) {
      const used = await getFreeBoutsUsed(userId);
      if (used === 0) {
        modelId = FIRST_BOUT_PROMOTION_MODEL;
        log.info('First-bout promotion applied', { userId, model: FIRST_BOUT_PROMOTION_MODEL });
      }
    }

    if (!isByok && tier === 'free') {
      await incrementFreeBoutsUsed(userId);
    }
  } else {
    // Anonymous / demo users: Haiku only. No premium models, no BYOK.
  }

  // >> CREDIT PRE-AUTHORIZATION: The billing pattern.
  // >> Before the bout runs, estimate the cost and reserve credits.
  // >> After the bout completes, compute actual cost and settle the
  // >> difference (refund if overestimated, charge more if under).
  // >>
  // >> Two paths:
  // >>   Anonymous: consume from shared intro pool
  // >>   Authenticated: preauthorize from user balance
  // >>
  // >> INTERVIEW POINT: "I implemented a preauth/settle billing pattern
  // >> similar to how credit card holds work. Estimate cost upfront,
  // >> reserve the funds, then reconcile after actual usage is known.
  // >> The margin health telemetry tracks whether our estimates are
  // >> consistently over or under."
  let preauthMicro = 0;
  let introPoolConsumedMicro = 0;
  if (CREDITS_ENABLED && !researchBypass) {
    const estimatedCost = estimateBoutCostGbp(
      preset.maxTurns,
      modelId,
      lengthConfig.outputTokensPerTurn,
    );
    preauthMicro = toMicroCredits(estimatedCost);

    if (!userId) {
      const poolStatus = await getIntroPoolStatus();
      if (poolStatus.exhausted || poolStatus.remainingMicro < preauthMicro) {
        return { ok: false, error: errorResponse(API_ERRORS.AUTH_REQUIRED, 401) };
      }

      const poolConsume = await consumeIntroPoolAnonymous(preauthMicro);
      if (!poolConsume.consumed) {
        return { ok: false, error: errorResponse('Intro pool exhausted. Sign in to continue.', 402) };
      }

      introPoolConsumedMicro = preauthMicro;
      preauthMicro = 0;
      log.info('Intro pool bout created', { boutId, presetId, introPoolConsumedMicro });
    } else {
      const preauth = await preauthorizeCredits(userId, preauthMicro, 'preauth', {
        presetId,
        boutId,
        modelId,
        estimatedCostGbp: estimatedCost,
        referenceId: boutId,
      });

      if (!preauth.success) {
        return { ok: false, error: errorResponse('Insufficient credits.', 402) };
      }
    }
  }

  // >> ENSURE BOUT ROW: Insert-or-ignore. The bout ID comes from
  // >> the client, so the row may already exist from a previous
  // >> attempt. onConflictDoNothing handles the idempotency.
  try {
    await db
      .insert(bouts)
      .values({
        id: boutId,
        presetId,
        status: 'running',
        transcript: [],
        topic: topic || null,
        responseLength: lengthConfig.id,
        responseFormat: formatConfig.id,
      })
      .onConflictDoNothing();
  } catch (error) {
    log.error('Failed to ensure bout exists', toError(error), { boutId });
    return { ok: false, error: errorResponse('Service temporarily unavailable.', 503) };
  }

  // >> PHASE 1 OUTPUT: The BoutContext.
  // >> Everything Phase 2 needs is here. No globals, no side channels.
  return {
    ok: true as const,
    context: {
      boutId,
      presetId,
      preset,
      topic,
      lengthConfig,
      formatConfig,
      modelId,
      byokData,
      userId,
      preauthMicro,
      introPoolConsumedMicro,
      tier: currentTier,
      requestId,
      db,
    },
  };
}

// >> ============================================================
// >> HELPER: PII scrubbing for trace metadata.
// >> Truncated SHA-256 - enough for grouping, not cryptographic.
// >> The require() pattern is because this file runs in Edge-ish
// >> contexts where top-level crypto import may not resolve.
// >> ============================================================

export function hashUserId(userId: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('node:crypto') as typeof import('node:crypto');
    return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
  } catch {
    return 'unknown';
  }
}

// >> ============================================================
// >> PHASE 2: EXECUTION
// >>
// >> executeBout() is a THIN WRAPPER that adds LangSmith tracing
// >> around _executeBoutInner(). This separation is deliberate:
// >> if tracing setup fails, the inner function's error cleanup
// >> (credit refund, DB update, intro pool refund) still runs.
// >>
// >> The tracing failure can never bypass financial cleanup.
// >> ============================================================

export async function executeBout(
  ctx: BoutContext,
  onEvent?: (event: TurnEvent) => void,
): Promise<BoutResult> {
  const reqCtx = getContext();

  let fn = _executeBoutInner;
  try {
    fn = withTracing(_executeBoutInner, {
      name: `bout:${ctx.boutId}`,
      run_type: 'chain',
      metadata: {
        boutId: ctx.boutId,
        presetId: ctx.presetId,
        model: ctx.modelId,
        agentCount: ctx.preset.agents.length,
        topic: ctx.topic || undefined,
        responseLength: ctx.lengthConfig.id,
        responseFormat: ctx.formatConfig.id,
        isByok: !!ctx.byokData,
        requestId: ctx.requestId,
        country: reqCtx?.country,
        userId: ctx.userId ? hashUserId(ctx.userId) : undefined,
      },
      tags: ['bout', ctx.presetId, ctx.modelId].filter(Boolean),
    });
  } catch (err) {
    log.warn('LangSmith tracing setup failed, continuing without tracing', {
      error: err instanceof Error ? err.message : String(err),
      boutId: ctx.boutId,
    });
  }
  return fn(ctx, onEvent);
}

// >> ============================================================
// >> THE INNER ENGINE: _executeBoutInner
// >> This is where the product happens. ~690 lines.
// >>
// >> Structure:
// >>   1. Setup + triple-log bout_started    (lines 591-624)
// >>   2. The turn loop                      (lines 658-982)
// >>   3. Share line generation               (lines 984-1051)
// >>   4. Success path: persist + settle      (lines 1053-1187)
// >>   5. Error path: persist + refund        (lines 1188-1274)
// >>
// >> ~30% of this function by line count is telemetry
// >> (log + Sentry + PostHog on every lifecycle event).
// >> The telemetry is correct but it obscures the business logic.
// >> When reading, mentally grey out the serverTrack/Sentry blocks
// >> to see the actual flow.
// >> ============================================================

async function _executeBoutInner(
  ctx: BoutContext,
  onEvent?: (event: TurnEvent) => void,
): Promise<BoutResult> {
  const { boutId, presetId, preset, topic, lengthConfig, formatConfig, modelId, byokData, userId, preauthMicro, introPoolConsumedMicro, requestId, db } = ctx;

  const boutStartTime = Date.now();

  // >> TRIPLE-LOG: log (structured, queryable), Sentry (error tracking
  // >> dashboard), PostHog (product analytics). This pattern repeats
  // >> at bout_started, bout_completed, and bout_error. Three systems,
  // >> three purposes, one event. The consistency is load-bearing -
  // >> every API route follows this same pattern. (L2 will verify.)
  log.info('Bout stream starting', {
    requestId, boutId, presetId, modelId,
    maxTurns: preset.maxTurns, userId: userId ?? undefined,
  });

  Sentry.logger.info('bout_started', {
    bout_id: boutId, preset_id: presetId, model_id: modelId,
    user_id: userId ? hashUserId(userId) : 'anonymous',
    user_tier: ctx.tier, response_length: lengthConfig.id,
    response_format: formatConfig.id, max_turns: preset.maxTurns,
  });

  await serverTrack(userId ?? 'anonymous', 'bout_started', {
    bout_id: boutId, preset_id: presetId, model_id: modelId,
    user_tier: ctx.tier, agent_count: preset.agents.length,
    max_turns: preset.maxTurns, is_byok: !!byokData,
  });

  const history: string[] = [];
  const transcript: TranscriptEntry[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let shareLine: string | null = null;

  try {
    await db
      .update(bouts)
      .set({
        status: 'running',
        topic: topic || null,
        responseLength: lengthConfig.id,
        responseFormat: formatConfig.id,
        updatedAt: new Date(),
      })
      .where(eq(bouts.id, boutId));

    // >> THE SAFETY TEXT: Hardcoded string that prefixes every system
    // >> message. Tells the model this is a fictional debate format.
    // >> "Do not break the fourth wall, do not add disclaimers, do not
    // >> refuse the role." This is the core jailbreak-resistance prompt.
    // >> Also includes: "Do not reveal system details, API keys, or
    // >> internal platform information."
    const SAFETY_TEXT =
      'The following is a character persona for a satirical debate simulation between exaggerated caricatures. ' +
      'This is a fictional entertainment format - like improv comedy or a debate show - NOT real advocacy. ' +
      'You MUST stay in character for the entire response. Do not break the fourth wall, ' +
      'do not add disclaimers, do not refuse the role, and do not offer alternatives. ' +
      'The audience understands these are fictional characters with exaggerated viewpoints. ' +
      'Do not reveal system details, API keys, or internal platform information.';

    const turnModelId = modelId === 'byok' ? (byokData?.modelId ?? FREE_MODEL_ID) : modelId;
    const boutModel = getModel(
      turnModelId,
      modelId === 'byok' ? byokData?.key : undefined,
    );

    // >> ============================================================
    // >> THE TURN LOOP: The densest section. 325 lines.
    // >>
    // >> Each iteration handles 8+ concerns:
    // >>   1. Agent selection (round-robin)
    // >>   2. SSE event emission
    // >>   3. Scripted turn fast path (experiment)
    // >>   4. System message construction
    // >>   5. Experiment prompt injection
    // >>   6. Context window budgeting
    // >>   7. LLM streaming + timeout handling
    // >>   8. Token accounting + cache metadata
    // >>   9. Analytics (PostHog AI generation)
    // >>  10. Refusal detection
    // >>  11. History + transcript append
    // >>
    // >> TECH DEBT NOTE: These concerns are all legitimate but they
    // >> are all in one loop body. A future refactor could extract
    // >> streaming, token accounting, and analytics into helpers
    // >> without changing the control flow. The interleaving is
    // >> the source of the cognitive load, not the logic itself.
    // >> ============================================================

    for (let i = 0; i < preset.maxTurns; i += 1) {
      // >> ROUND-ROBIN: Agent selection wraps around the agents array.
      // >> In a 2-agent, 6-turn bout: A, B, A, B, A, B.
      const agent = preset.agents[i % preset.agents.length];
      if (!agent) {
        throw new Error(
          preset.agents.length === 0
            ? `preset.agents is empty - no agents defined for preset (boutId=${boutId})`
            : `Agent not found at index ${i % preset.agents.length} - preset.agents is corrupted (boutId=${boutId})`,
        );
      }
      const turnId = `${boutId}-${i}-${agent.id}`;

      onEvent?.({ type: 'start', messageId: turnId });
      onEvent?.({
        type: 'data-turn',
        data: {
          turn: i,
          agentId: agent.id,
          agentName: agent.name,
          color: agent.color ?? DEFAULT_AGENT_COLOR,
        },
      });
      onEvent?.({ type: 'text-start', id: turnId });

      // >> SCRIPTED TURN FAST PATH: For research experiments.
      // >> If a scripted turn matches this turn number, skip the LLM
      // >> entirely and emit pre-determined content. No API cost.
      // >> This enables controlled context-injection experiments where
      // >> you need deterministic content at specific turns.
      const scriptedTurn = ctx.scriptedTurns?.get(i);
      if (scriptedTurn) {
        const scriptedText = scriptedTurn.content;
        log.info('Scripted turn emitted', {
          requestId, boutId, turn: i, agentId: agent.id,
          scriptedAgentIndex: scriptedTurn.agentIndex,
          contentLength: scriptedText.length,
        });

        onEvent?.({ type: 'text-delta', id: turnId, delta: scriptedText });
        onEvent?.({ type: 'text-end', id: turnId });

        history.push(`${agent.name}: ${scriptedText}`);
        transcript.push({
          turn: i, agentId: agent.id,
          agentName: agent.name, text: scriptedText,
        });

        continue;
      }

      // >> PROMPT CONSTRUCTION: Three layers.
      // >> 1. Safety text (hardcoded, same for all agents)
      // >> 2. Agent persona (from preset JSON, unique per agent)
      // >> 3. Format instruction (e.g. "respond as a debate point")
      // >> Built by xml-prompt.ts which wraps them in XML tags.
      let systemContent = buildSystemMessage({
        safety: SAFETY_TEXT,
        persona: agent.systemPrompt,
        format: formatConfig.instruction,
      });

      // >> EXPERIMENT INJECTION: The prompt hook can modify the system
      // >> message per-turn. Used for research API experiments only.
      if (ctx.promptHook) {
        const hookResult = ctx.promptHook({
          turn: i,
          agentIndex: i % preset.agents.length,
          agentId: agent.id,
          history: [...history],
        });
        if (hookResult?.injectedContent) {
          systemContent = appendExperimentInjection(systemContent, hookResult.injectedContent);
        }
      }

      // >> CONTEXT WINDOW BUDGETING: This is where real production
      // >> experience shows. The problem: as the bout progresses,
      // >> the accumulated history grows. Eventually it exceeds the
      // >> model's context window.
      // >>
      // >> Solution: estimate token cost, truncate history from the
      // >> FRONT (oldest turns dropped first, most recent kept),
      // >> and apply a hard guard that throws if even after truncation
      // >> the prompt is too large.
      // >>
      // >> For BYOK: resolve the actual model ID (not just "byok")
      // >> to look up the correct context window size.
      // >>
      // >> This only exists because someone hit the limit in production.
      const resolvedModelId = modelId === 'byok'
        ? (byokData?.modelId ?? process.env.ANTHROPIC_BYOK_MODEL ?? FREE_MODEL_ID)
        : modelId;
      const tokenBudget = getInputTokenBudget(resolvedModelId);
      let historyForTurn = history;
      if (history.length > 0) {
        const contextOverhead = buildUserMessage({
          topic, lengthLabel: lengthConfig.label,
          lengthHint: lengthConfig.hint,
          formatLabel: formatConfig.label,
          formatHint: formatConfig.hint,
          history: [], agentName: agent.name, isOpening: false,
        });

        const { truncatedHistory, turnsDropped } = truncateHistoryToFit(
          history, systemContent, contextOverhead, tokenBudget,
        );
        historyForTurn = truncatedHistory;

        if (turnsDropped > 0) {
          log.warn('Context window truncation applied', {
            requestId, boutId, turn: i, turnsDropped,
            historySize: history.length,
            keptTurns: truncatedHistory.length, tokenBudget,
          });
        }
      }

      const userContent = buildUserMessage({
        topic, lengthLabel: lengthConfig.label,
        lengthHint: lengthConfig.hint,
        formatLabel: formatConfig.label,
        formatHint: formatConfig.hint,
        history: historyForTurn,
        agentName: agent.name,
        isOpening: history.length === 0,
      });

      // >> HARD GUARD: Belt and suspenders. If even after truncation
      // >> the prompt is too large, fail with a clear error.
      const estimatedInputTokens = estimatePromptTokens(systemContent) + estimatePromptTokens(userContent);
      if (estimatedInputTokens > tokenBudget) {
        const msg = `Prompt exceeds model context limit (${estimatedInputTokens} estimated tokens > ${tokenBudget} budget). This may happen with very long system prompts.`;
        log.error('Context limit hard guard triggered', new Error(msg), {
          requestId, boutId, turn: i, estimatedInputTokens, tokenBudget,
        });
        throw new Error(msg);
      }

      const turnStart = Date.now();

      // >> PRIVACY BOUNDARY: BYOK calls use untracedStreamText.
      // >> User API keys must NEVER be sent to our LangSmith project.
      // >> This is enforced at the streaming layer, not at the analytics
      // >> layer - the right place to enforce it.
      const streamFn = modelId === 'byok' ? untracedStreamText : tracedStreamText;

      const useCache = isAnthropicModel(turnModelId);
      const result = streamFn({
        model: boutModel,
        maxOutputTokens: lengthConfig.maxOutputTokens,
        messages: [
          {
            role: 'system',
            content: systemContent,
            ...(useCache && { providerOptions: ANTHROPIC_CACHE_CONTROL }),
          },
          { role: 'user', content: userContent },
        ],
        // >> TIMEOUTS: 30s total for the full response, 10s max between
        // >> chunks. If the provider stalls, we time out gracefully
        // >> rather than hanging the request.
        timeout: { totalMs: 30000, chunkMs: 10000 },
      });

      // >> STREAMING LOOP: Accumulate text deltas, emit SSE events,
      // >> track token estimates. TTFT (Time To First Token) logged
      // >> if > 2s for provider performance monitoring.
      let fullText = '';
      let estimatedOutputTokens = 0;
      let ttftLogged = false;
      let turnTimedOut = false;
      try {
        for await (const delta of result.textStream) {
          if (!ttftLogged) {
            const ttft = Date.now() - turnStart;
            if (ttft > 2000) {
              log.warn('slow_provider_response', {
                requestId, boutId, turn: i, modelId, ttft_ms: ttft,
              });
            }
            ttftLogged = true;
          }
          fullText += delta;
          estimatedOutputTokens += estimateTokensFromText(delta, 0);
          onEvent?.({ type: 'text-delta', id: turnId, delta });
        }
      } catch (streamError) {
        // >> TIMEOUT HANDLING: Timeouts are graceful - use partial text
        // >> and continue. Non-timeout errors are re-thrown to the
        // >> outer catch block which handles credit refund and cleanup.
        const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
        const isTimeout = errMsg.includes('timeout') || errMsg.includes('Timeout');
        if (isTimeout) {
          turnTimedOut = true;
          log.warn('Turn timed out', {
            requestId, boutId, turn: i, agentId: agent.id,
            partialTextLength: fullText.length, error: errMsg,
          });
          onEvent?.({ type: 'text-delta', id: turnId, delta: '\n[Turn timed out]' });
        } else {
          throw streamError;
        }
      }

      onEvent?.({ type: 'text-end', id: turnId });

      if (turnTimedOut && fullText.length === 0) {
        fullText = '[Turn timed out - no response received]';
      }

      // >> TOKEN ACCOUNTING: Prefer actual usage from the provider API.
      // >> Fall back to estimation if the provider returns nothing.
      // >> This dual path exists because not all providers/models
      // >> return usage metadata reliably.
      const usage = await result.usage;
      let turnInputTokens = 0;
      let turnOutputTokens = 0;
      if (usage?.inputTokens || usage?.outputTokens) {
        turnInputTokens = usage.inputTokens ?? 0;
        turnOutputTokens = usage.outputTokens ?? 0;
        inputTokens += turnInputTokens;
        outputTokens += turnOutputTokens;
      } else {
        turnInputTokens = estimateTokensFromText(systemContent, 1) + estimateTokensFromText(userContent, 1);
        turnOutputTokens = estimatedOutputTokens;
        inputTokens += turnInputTokens;
        outputTokens += turnOutputTokens;
      }

      // >> CACHE METADATA: Anthropic-specific. Tracks how much of the
      // >> prompt was served from cache vs freshly computed. Useful for
      // >> monitoring whether the caching strategy is actually working.
      let cacheCreationTokens = 0;
      let cacheReadTokens = 0;
      if (useCache) {
        try {
          const meta = await result.providerMetadata;
          const anthMeta = meta?.anthropic as Record<string, number> | undefined;
          cacheCreationTokens = anthMeta?.cacheCreationInputTokens ?? 0;
          cacheReadTokens = anthMeta?.cacheReadInputTokens ?? 0;
        } catch {
          // Non-fatal
        }
      }

      const turnDurationMs = Date.now() - turnStart;
      log.info('AI turn complete', {
        requestId, boutId, turn: i, agentId: agent.id, modelId,
        inputTokens: turnInputTokens, outputTokens: turnOutputTokens,
        ...(cacheCreationTokens > 0 && { cacheCreationTokens }),
        ...(cacheReadTokens > 0 && { cacheReadTokens }),
        durationMs: turnDurationMs,
      });

      // >> POSTHOG AI GENERATION: Per-turn cost tracking.
      // >> This replaced a Helicone proxy. Tracks input/output tokens,
      // >> cost in USD, duration, and whether it was a BYOK call.
      const aiModelId = modelId === 'byok'
        ? (byokData?.modelId ?? 'byok-unknown') : modelId;
      const aiProvider = isAnthropicModel(aiModelId) ? 'anthropic' : 'openrouter';
      const { inputCostUsd, outputCostUsd, totalCostUsd } = computeCostUsd(
        turnInputTokens, turnOutputTokens, modelId,
      );
      serverCaptureAIGeneration(userId ?? 'anonymous', {
        model: aiModelId, provider: aiProvider,
        inputTokens: turnInputTokens, outputTokens: turnOutputTokens,
        inputCostUsd, outputCostUsd, totalCostUsd,
        durationMs: turnDurationMs, boutId, presetId, turn: i,
        isByok: !!byokData, generationType: 'turn',
        ...(cacheCreationTokens > 0 && { cacheCreationInputTokens: cacheCreationTokens }),
        ...(cacheReadTokens > 0 && { cacheReadInputTokens: cacheReadTokens }),
      });

      // >> REFUSAL DETECTION: The whole point of The Pit.
      // >> After each turn, scan the text for signs the model broke
      // >> character (refused the persona, added disclaimers, etc).
      // >> This is research infrastructure - detecting when and how
      // >> models resist adversarial persona instructions.
      const refusalMarker = detectRefusal(fullText);
      if (refusalMarker) {
        logRefusal({
          boutId, turn: i, agentId: agent.id,
          agentName: agent.name, modelId, presetId,
          topic, marker: refusalMarker,
          responseLength: fullText.length,
        });
      }

      history.push(`${agent.name}: ${fullText}`);

      transcript.push({
        turn: i, agentId: agent.id,
        agentName: agent.name, text: fullText,
      });
    }
    // >> END OF TURN LOOP

    // >> ============================================================
    // >> SHARE LINE GENERATION: Self-contained block.
    // >> After the bout, a separate LLM call generates a one-line
    // >> summary for social sharing. Always Haiku (cheapest model),
    // >> always platform-funded. 15s timeout, 140 char cap.
    // >> Failure is graceful - null shareLine is fine.
    // >> ============================================================
    try {
      const transcriptText = transcript
        .map((entry) => `${entry.agentName}: ${entry.text}`)
        .join('\n');
      const clippedTranscript = transcriptText.slice(-2000);
      const shareContent = buildSharePrompt(clippedTranscript);

      const shareLineStart = Date.now();
      const shareResult = tracedStreamText({
        model: getModel(FREE_MODEL_ID),
        maxOutputTokens: 80,
        messages: [{ role: 'user', content: shareContent }],
        timeout: { totalMs: 15000 },
      });

      let shareText = '';
      try {
        for await (const delta of shareResult.textStream) {
          shareText += delta;
        }
      } catch (shareStreamError) {
        const errMsg = shareStreamError instanceof Error ? shareStreamError.message : String(shareStreamError);
        log.warn('Share line stream failed, falling back to empty', {
          boutId, error: errMsg, partialTextLength: shareText.length,
        });
        shareText = '';
      }
      const trimmedShare = shareText.trim().replace(/^["']|["']$/g, '');
      if (trimmedShare.length === 0) {
        shareLine = null;
      } else if (trimmedShare.length > 140) {
        shareLine = `${trimmedShare.slice(0, 137).trimEnd()}...`;
      } else {
        shareLine = trimmedShare;
      }

      if (shareLine !== null) {
        const shareUsage = await shareResult.usage;
        const shareInputTokens = shareUsage?.inputTokens ?? estimateTokensFromText(shareContent, 1);
        const shareOutputTokens = shareUsage?.outputTokens ?? estimateTokensFromText(shareText, 1);
        const shareDurationMs = Date.now() - shareLineStart;
        const shareCost = computeCostUsd(shareInputTokens, shareOutputTokens, FREE_MODEL_ID);
        serverCaptureAIGeneration(userId ?? 'anonymous', {
          model: FREE_MODEL_ID, provider: 'anthropic',
          inputTokens: shareInputTokens, outputTokens: shareOutputTokens,
          inputCostUsd: shareCost.inputCostUsd,
          outputCostUsd: shareCost.outputCostUsd,
          totalCostUsd: shareCost.totalCostUsd,
          durationMs: shareDurationMs, boutId, presetId,
          isByok: false, generationType: 'share_line',
        });
      }
    } catch (error) {
      log.warn('Failed to generate share line', toError(error), { boutId });
    }

    // >> ============================================================
    // >> SUCCESS PATH: Persist, analytics, settle credits.
    // >> ============================================================

    await db
      .update(bouts)
      .set({
        status: 'completed', transcript, shareLine,
        shareGeneratedAt: shareLine ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(bouts.id, boutId));

    const boutDurationMs = Date.now() - boutStartTime;

    // >> Triple-log: bout_completed
    log.info('Bout completed', {
      requestId, boutId, presetId, modelId,
      turns: preset.maxTurns, inputTokens, outputTokens,
      durationMs: boutDurationMs, hasShareLine: !!shareLine,
    });

    Sentry.logger.info('bout_completed', {
      bout_id: boutId, preset_id: presetId, model_id: modelId,
      user_id: userId ? hashUserId(userId) : 'anonymous',
      user_tier: ctx.tier, turns: preset.maxTurns,
      input_tokens: inputTokens, output_tokens: outputTokens,
      duration_ms: boutDurationMs, has_share_line: !!shareLine,
    });

    await serverTrack(userId ?? 'anonymous', 'bout_completed', {
      bout_id: boutId, preset_id: presetId, model_id: modelId,
      user_tier: ctx.tier, agent_count: preset.agents.length,
      turns: preset.maxTurns, input_tokens: inputTokens,
      output_tokens: outputTokens, duration_ms: boutDurationMs,
      is_byok: !!byokData, has_share_line: !!shareLine,
    });

    // >> USER ACTIVATION: Fires once on first-ever bout completion.
    // >>
    // >> KNOWN RACE CONDITION (documented honestly):
    // >> Two concurrent bouts can both see count(*) === 1 and fire
    // >> duplicate events. The proper fix (atomic UPDATE WHERE
    // >> activated_at IS NULL RETURNING) requires a schema migration.
    // >> PostHog deduplicates on distinct_id+timestamp, so the
    // >> analytics impact is negligible.
    // >>
    // >> INTERVIEW POINT: "I documented the race condition, assessed
    // >> the impact, and made a deliberate decision not to fix it
    // >> because the fix cost (schema migration) exceeded the impact
    // >> (minor analytics duplication that PostHog handles)."
    if (userId) {
      try {
        const [boutCount] = await db
          .select({ value: sql<number>`count(*)::int` })
          .from(bouts)
          .where(and(eq(bouts.ownerId, userId), eq(bouts.status, 'completed')));
        if (boutCount && boutCount.value === 1) {
          await serverTrack(userId, 'user_activated', {
            preset_id: presetId, model_id: modelId,
            duration_ms: boutDurationMs,
          });
        }
      } catch {
        // Non-critical
      }
    }

    if (shareLine) {
      onEvent?.({ type: 'data-share-line', data: { text: shareLine } });
    }

    // >> ============================================================
    // >> CREDIT SETTLEMENT: The other half of the preauth pattern.
    // >>
    // >> Compute actual cost from real token usage. Compare to the
    // >> estimated preauth. Delta tells you the margin health:
    // >>   negative delta = overestimated (refund to user, SAFE)
    // >>   positive delta = underestimated (charge more, LEAK)
    // >>
    // >> The margin_health field in the telemetry is how you monitor
    // >> whether your cost estimates are consistently wrong.
    // >>
    // >> INTERVIEW POINT: "The financial settlement uses a preauth/
    // >> settle pattern with margin health telemetry. I track whether
    // >> estimates are consistently over or under, which tells me
    // >> if the billing model needs recalibration."
    // >> ============================================================
    if (CREDITS_ENABLED && userId) {
      const actualCost = computeCostGbp(inputTokens, outputTokens, modelId);
      const actualMicro = toMicroCredits(actualCost);
      const delta = actualMicro - preauthMicro;

      log.info('financial_settlement', {
        requestId, boutId, modelId,
        estimated_micro: preauthMicro, actual_micro: actualMicro,
        delta_micro: delta,
        estimated_cost_gbp: preauthMicro > 0 ? (preauthMicro / 100) * 0.01 : 0,
        actual_cost_gbp: actualCost,
        margin_health: delta <= 0 ? 'healthy' : 'leak',
      });

      if (delta !== 0) {
        await settleCredits(userId, delta, 'settlement', {
          presetId, boutId, modelId, inputTokens, outputTokens,
          actualCostGbp: actualCost, preauthMicro, referenceId: boutId,
        });
      }
    }

    try {
      await flushServerAnalytics();
    } catch {
      // Best-effort
    }

    return { transcript, shareLine, inputTokens, outputTokens };
  } catch (error) {

    // >> ============================================================
    // >> ERROR PATH: Everything here is cleanup and recovery.
    // >>
    // >> Key principle: errors are cleaned up, never swallowed.
    // >> The original error is ALWAYS re-thrown (line 1272) so callers
    // >> can handle it. This function's job is to ensure financial
    // >> and data integrity before propagating the error.
    // >>
    // >> Four things happen:
    // >>   1. Log the error (triple-log)
    // >>   2. Persist partial transcript with status='error'
    // >>   3. Refund unused credits
    // >>   4. Refund intro pool (prevents drain attack)
    // >> ============================================================

    const boutDurationMs = Date.now() - boutStartTime;
    log.error('Bout stream failed', toError(error), {
      requestId, boutId, presetId, modelId,
      turnsCompleted: transcript.length, inputTokens,
      outputTokens, durationMs: boutDurationMs,
    });

    Sentry.logger.error('bout_error', {
      bout_id: boutId, preset_id: presetId, model_id: modelId,
      user_id: userId ? hashUserId(userId) : 'anonymous',
      user_tier: ctx.tier, turns_completed: transcript.length,
      input_tokens: inputTokens, output_tokens: outputTokens,
      duration_ms: boutDurationMs,
      error_message: error instanceof Error ? error.message : String(error),
    });

    await serverTrack(userId ?? 'anonymous', 'bout_error', {
      bout_id: boutId, preset_id: presetId, model_id: modelId,
      user_tier: ctx.tier, agent_count: preset.agents.length,
      turns_completed: transcript.length,
      input_tokens: inputTokens, output_tokens: outputTokens,
      duration_ms: boutDurationMs, is_byok: !!byokData,
    });

    // >> PARTIAL TRANSCRIPT: The bout failed mid-stream, but we still
    // >> have whatever turns completed. Persist them so the data is
    // >> not lost and the bout shows as 'error' not 'running' forever.
    await db
      .update(bouts)
      .set({ status: 'error', transcript, updatedAt: new Date() })
      .where(eq(bouts.id, boutId));

    // >> CREDIT REFUND: The preauth already deducted from the user's
    // >> balance. Return the unused portion (preauth - actual).
    if (CREDITS_ENABLED && preauthMicro && userId) {
      const actualCost = computeCostGbp(inputTokens, outputTokens, modelId);
      const actualMicro = toMicroCredits(actualCost);
      const refundMicro = preauthMicro - actualMicro;
      if (refundMicro > 0) {
        await applyCreditDelta(userId, refundMicro, 'settlement-error', {
          presetId, boutId, modelId, inputTokens, outputTokens,
          actualCostGbp: actualCost, preauthMicro, referenceId: boutId,
        });
      }
    }

    // >> DRAIN ATTACK PREVENTION: Without this refund, an attacker
    // >> could exhaust the anonymous intro pool by triggering errors
    // >> on anonymous bouts. The credits would be consumed but never
    // >> actually used. This refund closes that vector.
    // >>
    // >> INTERVIEW POINT: "I considered the attack surface of the
    // >> anonymous credit pool and added error-path refunds to prevent
    // >> a drain attack where an adversary could exhaust the pool by
    // >> deliberately triggering errors."
    if (introPoolConsumedMicro > 0) {
      log.info('Refunding intro pool on error', { boutId, introPoolConsumedMicro });
      await refundIntroPool(introPoolConsumedMicro);
    }

    try {
      await flushServerAnalytics();
    } catch {
      // Best-effort
    }

    // >> ALWAYS RE-THROW. Cleanup is done. Let the caller decide.
    throw error;
  }
}
