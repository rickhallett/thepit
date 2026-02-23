// Core bout execution engine.
//
// Extracted from app/api/run-bout/route.ts to enable both streaming (SSE)
// and synchronous (REST) consumption of the same bout logic.
//
// Three phases:
//   1. validateBoutRequest() — parse, auth, tier, credits, idempotency
//   2. executeBout()         — turn loop, transcript, share line, DB persist, credit settle
//   3. (caller)              — wrap in streaming or return JSON
//

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
  FREE_MODEL_ID,
  PREMIUM_MODEL_OPTIONS,
  getModel,
  getInputTokenBudget,
} from '@/lib/ai';
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
import { consumeFreeBout, settleFreeBoutSpend } from '@/lib/free-bout-pool';
import { FIRST_BOUT_PROMOTION_MODEL } from '@/lib/models';
import { UNSAFE_PATTERN } from '@/lib/validation';
import { detectRefusal, logRefusal } from '@/lib/refusal-detection';
import { errorResponse, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';

// ─── Prompt caching ──────────────────────────────────────────────────

/**
 * Anthropic prompt caching: mark a message as a cache breakpoint.
 * The API caches all content up to and including the marked message.
 * Ignored by non-Anthropic providers (OpenRouter, etc.).
 *
 * @see https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 */
const ANTHROPIC_CACHE_CONTROL = {
  anthropic: { cacheControl: { type: 'ephemeral' as const } },
} as const;

/**
 * Whether the current bout is hitting an Anthropic model (platform or BYOK).
 * OpenRouter BYOK calls should NOT receive Anthropic-specific providerOptions.
 */
function isAnthropicModel(modelId: string, byokData: ByokKeyData | null): boolean {
  if (modelId !== 'byok') return true; // Platform-funded — always Anthropic
  return byokData?.provider === 'anthropic';
}

// ─── Types ───────────────────────────────────────────────────────────

/** Structured BYOK key data decoded from the stash cookie. */
export type ByokKeyData = {
  provider: import('@/lib/models').ByokProvider;
  modelId: string | undefined;
  key: string;
};

/** Validated context produced by validateBoutRequest. */
export type BoutContext = {
  boutId: string;
  presetId: string;
  preset: Preset;
  topic: string;
  lengthConfig: ResponseLengthConfig;
  formatConfig: ResponseFormat;
  modelId: string;
  /** Structured BYOK data (provider + model + key) or empty string for non-BYOK. */
  byokData: ByokKeyData | null;
  userId: string | null;
  preauthMicro: number;
  /** Micro-credits consumed from the intro pool for anonymous bouts. Zero for authenticated bouts. */
  introPoolConsumedMicro: number;
  /** Estimated cost (micro) charged to the free bout pool. Zero for non-free or BYOK bouts. */
  freePoolSpendMicro: number;
  /** The pool date the free bout was charged against. Used for midnight-safe settlement. */
  freePoolDate: string | null;
  /** User tier at the time of validation. */
  tier: 'anonymous' | 'free' | 'pass' | 'lab';
  requestId: string;
  db: ReturnType<typeof requireDb>;
};

/** Result returned by executeBout after all turns complete. */
export type BoutResult = {
  transcript: TranscriptEntry[];
  shareLine: string | null;
  inputTokens: number;
  outputTokens: number;
};

/** Events emitted during bout execution for streaming consumers. */
export type TurnEvent =
  | { type: 'start'; messageId: string }
  | { type: 'data-turn'; data: { turn: number; agentId: string; agentName: string; color: string } }
  | { type: 'text-start'; id: string }
  | { type: 'text-delta'; id: string; delta: string }
  | { type: 'text-end'; id: string }
  | { type: 'data-share-line'; data: { text: string } };

// ─── Phase 1: Validation ─────────────────────────────────────────────

/** Tagged result of validateBoutRequest — discriminate on `ok`. */
export type BoutValidation =
  | { ok: false; error: Response }
  | { ok: true; context: BoutContext };

/**
 * Validate and prepare a bout request.
 *
 * Returns a tagged union: `{ ok: false, error }` or `{ ok: true, context }`.
 * Callers discriminate on `ok` for compile-time exhaustiveness.
 */
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

  // Idempotency check
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

  // Preset resolution
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

  // BYOK key from cookie (structured: provider + model + key).
  // Only read (and clear) for authenticated users — anonymous users cannot
  // use BYOK, and clearing their cookie silently would lose the key.
  let byokData: ByokKeyData | null = null;
  if (requestedModel === 'byok' && userId) {
    const jar = await cookies();
    byokData = readAndClearByokKey(jar);
  }

  // Ownership check
  if (existingBout?.ownerId && existingBout.ownerId !== userId) {
    return { ok: false, error: errorResponse(API_ERRORS.FORBIDDEN, 403) };
  }

  // Research API key bypass: when a valid X-Research-Key header is present,
  // treat the request as lab tier (no rate limit, no pool consumption).
  // This allows internal tooling (pitstorm hypothesis runner) to run
  // batches of bouts without hitting per-tier rate limits.
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

  // Tier-aware rate limiting
  // Resolve tier early so rate limits match what the 429 response advertises.
  const currentTier = researchBypass
    ? ('lab' as const)
    : userId
      ? await getUserTier(userId)
      : ('anonymous' as const);

  const BOUT_LIMITS: Record<string, number> = { anonymous: 2, free: 5, pass: 15 };
  const boutMaxRequests = BOUT_LIMITS[currentTier]; // undefined for lab → skip

  if (boutMaxRequests !== undefined) {
    const rateLimitId = userId ?? getClientIdentifier(req);
    const boutRateCheck = checkRateLimit(
      { name: 'bout-creation', maxRequests: boutMaxRequests, windowMs: 60 * 60 * 1000 },
      rateLimitId,
    );
    if (!boutRateCheck.success) {
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

  // Tier-based access control
  const isByok = requestedModel === 'byok' && BYOK_ENABLED;
  let modelId = FREE_MODEL_ID;
  let freePoolSpendMicro = 0;
  let freePoolDate: string | null = null;

  if (SUBSCRIPTIONS_ENABLED && userId) {
    // Reuse tier resolved above for rate limiting — avoids a redundant DB read.
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
      const allowed = PREMIUM_MODEL_OPTIONS.filter((m) => canAccessModel(tier, m));
      modelId = allowed[0] ?? FREE_MODEL_ID;
    }

    // First-bout promotion: give free-tier users the promotion model on
    // their very first bout so they experience higher quality and are
    // motivated to upgrade. Only applies to non-BYOK, non-explicit-model.
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
      // Compute estimated cost early so the free bout pool can enforce
      // both the bout count cap AND the daily spend cap atomically.
      freePoolSpendMicro = toMicroCredits(
        estimateBoutCostGbp(preset.maxTurns, modelId, lengthConfig.outputTokensPerTurn),
      );
      const poolResult = await consumeFreeBout(freePoolSpendMicro);
      if (!poolResult.consumed) {
        freePoolSpendMicro = 0;
        freePoolDate = null; // Not consumed — reset
        const msg = poolResult.reason === 'spend'
          ? 'Daily free tier spend cap reached. Upgrade your plan or try again tomorrow.'
          : 'Daily free bout pool exhausted. Upgrade your plan or use your own API key (BYOK).';
        return { ok: false, error: errorResponse(msg, 429) };
      }
      freePoolDate = poolResult.poolDate;
      await incrementFreeBoutsUsed(userId);
    }
  } else {
    // Anonymous / demo users: Haiku only. No premium models, no BYOK.
    // modelId stays at FREE_MODEL_ID (set above).
  }

  // Credit pre-authorization
  // Research bypass skips all credit/pool gates — the bouts are platform-internal.
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
      // Anonymous user — check if intro pool has credits
      const poolStatus = await getIntroPoolStatus();
      if (poolStatus.exhausted || poolStatus.remainingMicro < preauthMicro) {
        return { ok: false, error: errorResponse(API_ERRORS.AUTH_REQUIRED, 401) };
      }

      // Consume from intro pool for anonymous bout
      const poolConsume = await consumeIntroPoolAnonymous(preauthMicro);
      if (!poolConsume.consumed) {
        return { ok: false, error: errorResponse('Intro pool exhausted. Sign in to continue.', 402) };
      }

      introPoolConsumedMicro = preauthMicro;
      preauthMicro = 0; // No user-level preauth for anonymous bouts
      log.info('Intro pool bout created', { boutId, presetId, introPoolConsumedMicro });
    } else {
      // Authenticated user — preauthorize from user credits
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

  // Ensure bout row exists
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
      freePoolSpendMicro,
      freePoolDate,
      tier: currentTier,
      requestId,
      db,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Hash a userId for LangSmith trace metadata. Avoids logging raw PII. */
function hashUserId(userId: string): string {
  // Simple truncated hash — sufficient for trace grouping, not cryptographic.
  // Uses Node.js built-in crypto via a quick SHA-256 prefix.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('node:crypto') as typeof import('node:crypto');
    return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
  } catch {
    return 'unknown';
  }
}

// ─── Phase 2: Execution ──────────────────────────────────────────────

/**
 * Execute a bout: run all turns, generate share line, persist to DB, settle credits.
 *
 * Optionally emits TurnEvents via the onEvent callback (used by the streaming route
 * to write SSE events). Synchronous callers omit this callback.
 *
 * On error, persists partial transcript with status='error' and refunds credits.
 * Throws the original error after cleanup so callers can handle it.
 *
 * When LangSmith is enabled, the entire bout appears as a single parent trace
 * with child LLM spans for each turn (via wrapAISDK) and the share line call.
 */
export async function executeBout(
  ctx: BoutContext,
  onEvent?: (event: TurnEvent) => void,
): Promise<BoutResult> {
  // Propagate request context (from AsyncLocalStorage) into trace metadata
  // for cross-referencing in LangSmith and Sentry dashboards.
  const reqCtx = getContext();

  // Wrap the inner logic with LangSmith tracing. The trace name includes
  // the boutId for easy search, and metadata enables filtering by preset,
  // model, topic, etc. in the LangSmith dashboard.
  //
  // Wrapped in try-catch so tracing initialization failures (e.g. broken
  // langsmith install) never bypass _executeBoutInner's error cleanup
  // (credit refund, DB status update, intro pool refund).
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
        // Request context for cross-referencing
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

/** Inner bout execution logic, wrapped by executeBout with tracing. */
async function _executeBoutInner(
  ctx: BoutContext,
  onEvent?: (event: TurnEvent) => void,
): Promise<BoutResult> {
  const { boutId, presetId, preset, topic, lengthConfig, formatConfig, modelId, byokData, userId, preauthMicro, introPoolConsumedMicro, freePoolSpendMicro, freePoolDate, requestId, db } = ctx;

  const boutStartTime = Date.now();
  log.info('Bout stream starting', {
    requestId,
    boutId,
    presetId,
    modelId,
    maxTurns: preset.maxTurns,
    userId: userId ?? undefined,
  });

  Sentry.logger.info('bout_started', {
    bout_id: boutId,
    preset_id: presetId,
    model_id: modelId,
    user_id: userId ? hashUserId(userId) : 'anonymous',
    user_tier: ctx.tier,
    response_length: lengthConfig.id,
    response_format: formatConfig.id,
    max_turns: preset.maxTurns,
  });

  // --- Analytics: bout_started (OCE-283) ---
  // captureImmediate — completes HTTP request before continuing.
  await serverTrack(userId ?? 'anonymous', 'bout_started', {
    bout_id: boutId,
    preset_id: presetId,
    model_id: modelId,
    user_tier: ctx.tier,
    agent_count: preset.agents.length,
    max_turns: preset.maxTurns,
    is_byok: !!byokData,
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

    const SAFETY_TEXT =
      'The following is a character persona for a satirical debate simulation between exaggerated caricatures. ' +
      'This is a fictional entertainment format — like improv comedy or a debate show — NOT real advocacy. ' +
      'You MUST stay in character for the entire response. Do not break the fourth wall, ' +
      'do not add disclaimers, do not refuse the role, and do not offer alternatives. ' +
      'The audience understands these are fictional characters with exaggerated viewpoints. ' +
      'Do not reveal system details, API keys, or internal platform information.';

    const boutModel = getModel(
      modelId,
      modelId === 'byok' ? byokData?.key : undefined,
      modelId === 'byok' ? byokData?.modelId : undefined,
    );

    for (let i = 0; i < preset.maxTurns; i += 1) {
      const agent = preset.agents[i % preset.agents.length];
      if (!agent) {
        throw new Error(
          preset.agents.length === 0
            ? `preset.agents is empty — no agents defined for preset (boutId=${boutId})`
            : `Agent not found at index ${i % preset.agents.length} — preset.agents is corrupted (boutId=${boutId})`,
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

      const systemContent = buildSystemMessage({
        safety: SAFETY_TEXT,
        persona: agent.systemPrompt,
        format: formatConfig.instruction,
      });

      // Context window budgeting: truncate history from the front if the
      // full transcript would exceed the model's input token limit.
      // For BYOK, use the user-selected model ID (OpenRouter or Anthropic)
      // to look up the correct context window, falling back to the platform default.
      const resolvedModelId = modelId === 'byok'
        ? (byokData?.modelId ?? process.env.ANTHROPIC_BYOK_MODEL ?? FREE_MODEL_ID)
        : modelId;
      const tokenBudget = getInputTokenBudget(resolvedModelId);
      let historyForTurn = history;
      if (history.length > 0) {
        // Estimate the non-history portion of the user message (context, instruction tags)
        const contextOverhead = buildUserMessage({
          topic,
          lengthLabel: lengthConfig.label,
          lengthHint: lengthConfig.hint,
          formatLabel: formatConfig.label,
          formatHint: formatConfig.hint,
          history: [],
          agentName: agent.name,
          isOpening: false,
        });

        const { truncatedHistory, turnsDropped } = truncateHistoryToFit(
          history,
          systemContent,
          contextOverhead,
          tokenBudget,
        );
        historyForTurn = truncatedHistory;

        if (turnsDropped > 0) {
          log.warn('Context window truncation applied', {
            requestId,
            boutId,
            turn: i,
            turnsDropped,
            historySize: history.length,
            keptTurns: truncatedHistory.length,
            tokenBudget,
          });
        }
      }

      const userContent = buildUserMessage({
        topic,
        lengthLabel: lengthConfig.label,
        lengthHint: lengthConfig.hint,
        formatLabel: formatConfig.label,
        formatHint: formatConfig.hint,
        history: historyForTurn,
        agentName: agent.name,
        isOpening: history.length === 0,
      });

      // Hard guard: if even after truncation the prompt is too large, fail gracefully
      const estimatedInputTokens = estimatePromptTokens(systemContent) + estimatePromptTokens(userContent);
      if (estimatedInputTokens > tokenBudget) {
        const msg = `Prompt exceeds model context limit (${estimatedInputTokens} estimated tokens > ${tokenBudget} budget). This may happen with very long system prompts.`;
        log.error('Context limit hard guard triggered', new Error(msg), {
          requestId,
          boutId,
          turn: i,
          estimatedInputTokens,
          tokenBudget,
        });
        throw new Error(msg);
      }

      const turnStart = Date.now();
      // BYOK calls use the untraced variant — user API keys must not be
      // logged to our LangSmith project. Platform calls get full tracing.
      const streamFn = modelId === 'byok' ? untracedStreamText : tracedStreamText;

      // Anthropic prompt caching: mark the system message as a cache
      // breakpoint so repeated turns reuse the cached safety+persona+format
      // prefix. Ignored for non-Anthropic providers (OpenRouter BYOK).
      const useCache = isAnthropicModel(modelId, byokData);
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
      });

      let fullText = '';
      let estimatedOutputTokens = 0;
      let ttftLogged = false;
      for await (const delta of result.textStream) {
        // TTFT: Log slow provider responses (>2s to first token)
        if (!ttftLogged) {
          const ttft = Date.now() - turnStart;
          if (ttft > 2000) {
            log.warn('slow_provider_response', {
              requestId,
              boutId,
              turn: i,
              modelId,
              ttft_ms: ttft,
            });
          }
          ttftLogged = true;
        }
        fullText += delta;
        estimatedOutputTokens += estimateTokensFromText(delta, 0);
        onEvent?.({ type: 'text-delta', id: turnId, delta });
      }

      onEvent?.({ type: 'text-end', id: turnId });

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

      // Anthropic prompt caching metadata: extract cache hit/miss tokens.
      // providerMetadata.anthropic may contain cacheCreationInputTokens and
      // cacheReadInputTokens when cache control breakpoints are active.
      let cacheCreationTokens = 0;
      let cacheReadTokens = 0;
      if (useCache) {
        try {
          const meta = await result.providerMetadata;
          const anthMeta = meta?.anthropic as Record<string, number> | undefined;
          cacheCreationTokens = anthMeta?.cacheCreationInputTokens ?? 0;
          cacheReadTokens = anthMeta?.cacheReadInputTokens ?? 0;
        } catch {
          // Non-fatal — provider may not return metadata
        }
      }

      const turnDurationMs = Date.now() - turnStart;
      log.info('AI turn complete', {
        requestId,
        boutId,
        turn: i,
        agentId: agent.id,
        modelId,
        inputTokens: turnInputTokens,
        outputTokens: turnOutputTokens,
        ...(cacheCreationTokens > 0 && { cacheCreationTokens }),
        ...(cacheReadTokens > 0 && { cacheReadTokens }),
        durationMs: turnDurationMs,
      });

      // PostHog LLM analytics: capture $ai_generation for cost/token tracking.
      // Replaces the Helicone proxy that was previously used for this purpose.
      // BYOK turns use the user's resolved model ID for accurate attribution.
      const aiModelId = modelId === 'byok'
        ? (byokData?.modelId ?? 'byok-unknown')
        : modelId;
      const aiProvider = modelId === 'byok'
        ? (byokData?.provider ?? 'unknown')
        : 'anthropic';
      const { inputCostUsd, outputCostUsd, totalCostUsd } = computeCostUsd(
        turnInputTokens,
        turnOutputTokens,
        modelId,
      );
      serverCaptureAIGeneration(userId ?? 'anonymous', {
        model: aiModelId,
        provider: aiProvider,
        inputTokens: turnInputTokens,
        outputTokens: turnOutputTokens,
        inputCostUsd,
        outputCostUsd,
        totalCostUsd,
        durationMs: turnDurationMs,
        boutId,
        presetId,
        turn: i,
        isByok: !!byokData,
        generationType: 'turn',
        ...(cacheCreationTokens > 0 && { cacheCreationInputTokens: cacheCreationTokens }),
        ...(cacheReadTokens > 0 && { cacheReadInputTokens: cacheReadTokens }),
      });

      // Refusal detection: log when an agent breaks character
      const refusalMarker = detectRefusal(fullText);
      if (refusalMarker) {
        logRefusal({
          boutId,
          turn: i,
          agentId: agent.id,
          agentName: agent.name,
          modelId,
          presetId,
          topic,
          marker: refusalMarker,
          responseLength: fullText.length,
        });
      }

      history.push(`${agent.name}: ${fullText}`);

      transcript.push({
        turn: i,
        agentId: agent.id,
        agentName: agent.name,
        text: fullText,
      });
    }

    // Share line generation
    try {
      const transcriptText = transcript
        .map((entry) => `${entry.agentName}: ${entry.text}`)
        .join('\n');
      const clippedTranscript = transcriptText.slice(-2000);
      const shareContent = buildSharePrompt(clippedTranscript);

      // Share line is always platform-funded (Haiku) — use traced variant.
      const shareLineStart = Date.now();
      const shareResult = tracedStreamText({
        model: getModel(FREE_MODEL_ID),
        maxOutputTokens: 80,
        messages: [{ role: 'user', content: shareContent }],
      });

      let shareText = '';
      for await (const delta of shareResult.textStream) {
        shareText += delta;
      }
      shareLine = shareText.trim().replace(/^["']|["']$/g, '');
      if (shareLine.length > 140) {
        shareLine = `${shareLine.slice(0, 137).trimEnd()}...`;
      }

      // PostHog LLM analytics for share line generation
      const shareUsage = await shareResult.usage;
      const shareInputTokens = shareUsage?.inputTokens ?? estimateTokensFromText(shareContent, 1);
      const shareOutputTokens = shareUsage?.outputTokens ?? estimateTokensFromText(shareText, 1);
      const shareDurationMs = Date.now() - shareLineStart;
      const shareCost = computeCostUsd(shareInputTokens, shareOutputTokens, FREE_MODEL_ID);
      serverCaptureAIGeneration(userId ?? 'anonymous', {
        model: FREE_MODEL_ID,
        provider: 'anthropic',
        inputTokens: shareInputTokens,
        outputTokens: shareOutputTokens,
        inputCostUsd: shareCost.inputCostUsd,
        outputCostUsd: shareCost.outputCostUsd,
        totalCostUsd: shareCost.totalCostUsd,
        durationMs: shareDurationMs,
        boutId,
        presetId,
        isByok: false,
        generationType: 'share_line',
      });
    } catch (error) {
      log.warn('Failed to generate share line', toError(error), { boutId });
    }

    // Persist completed bout
    await db
      .update(bouts)
      .set({
        status: 'completed',
        transcript,
        shareLine,
        shareGeneratedAt: shareLine ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(bouts.id, boutId));

    const boutDurationMs = Date.now() - boutStartTime;
    log.info('Bout completed', {
      requestId,
      boutId,
      presetId,
      modelId,
      turns: preset.maxTurns,
      inputTokens,
      outputTokens,
      durationMs: boutDurationMs,
      hasShareLine: !!shareLine,
    });

    Sentry.logger.info('bout_completed', {
      bout_id: boutId,
      preset_id: presetId,
      model_id: modelId,
      user_id: userId ? hashUserId(userId) : 'anonymous',
      user_tier: ctx.tier,
      turns: preset.maxTurns,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duration_ms: boutDurationMs,
      has_share_line: !!shareLine,
    });

    // --- Analytics: bout_completed (OCE-283) ---
    // captureImmediate — completes HTTP request before continuing.
    await serverTrack(userId ?? 'anonymous', 'bout_completed', {
      bout_id: boutId,
      preset_id: presetId,
      model_id: modelId,
      user_tier: ctx.tier,
      agent_count: preset.agents.length,
      turns: preset.maxTurns,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duration_ms: boutDurationMs,
      is_byok: !!byokData,
      has_share_line: !!shareLine,
    });

    // --- Analytics: user_activated (OCE-253) ---
    // Fire once when a user completes their very first bout. We check the DB
    // for any OTHER completed bouts by this user. If this is the only one,
    // this is their activation moment.
    //
    // KNOWN RACE: Two concurrent bout completions can both see count(*) === 1
    // and fire duplicate user_activated events. An atomic UPDATE ... WHERE
    // activated_at IS NULL RETURNING pattern would fix this, but requires a
    // schema migration (no activated_at column exists). The minor analytics
    // duplication is acceptable — PostHog deduplicates on distinct_id+timestamp
    // and the funnel metric tolerates it.
    if (userId) {
      try {
        const [boutCount] = await db
          .select({ value: sql<number>`count(*)::int` })
          .from(bouts)
          .where(and(eq(bouts.ownerId, userId), eq(bouts.status, 'completed')));
        if (boutCount && boutCount.value === 1) {
          await serverTrack(userId, 'user_activated', {
            preset_id: presetId,
            model_id: modelId,
            duration_ms: boutDurationMs,
          });
        }
      } catch {
        // Non-critical — don't break bout completion for analytics
      }
    }

    if (shareLine) {
      onEvent?.({ type: 'data-share-line', data: { text: shareLine } });
    }

    // Credit settlement (success path)
    if (CREDITS_ENABLED && userId) {
      const actualCost = computeCostGbp(inputTokens, outputTokens, modelId);
      const actualMicro = toMicroCredits(actualCost);
      const delta = actualMicro - preauthMicro;

      // Financial telemetry: track estimation accuracy for margin health.
      // Negative delta = overestimated (refund to user, safe).
      // Positive delta = underestimated (charged more, margin leak).
      log.info('financial_settlement', {
        requestId,
        boutId,
        modelId,
        estimated_micro: preauthMicro,
        actual_micro: actualMicro,
        delta_micro: delta,
        estimated_cost_gbp: preauthMicro > 0 ? (preauthMicro / 100) * 0.01 : 0,
        actual_cost_gbp: actualCost,
        margin_health: delta <= 0 ? 'healthy' : 'leak',
      });

      if (delta !== 0) {
        await settleCredits(userId, delta, 'settlement', {
          presetId,
          boutId,
          modelId,
          inputTokens,
          outputTokens,
          actualCostGbp: actualCost,
          preauthMicro,
          referenceId: boutId,
        });
      }

    }

    // Settle free pool daily spend: reconcile estimated vs actual cost.
    // This is independent of the credit system — free pool caps operate
    // even when CREDITS_ENABLED is false. Moved outside the credits block
    // so settlement always runs for free-tier bouts.
    if (freePoolSpendMicro > 0) {
      const actualCostForPool = computeCostGbp(inputTokens, outputTokens, modelId);
      const actualMicroForPool = toMicroCredits(actualCostForPool);
      const poolSpendDelta = actualMicroForPool - freePoolSpendMicro;
      if (poolSpendDelta !== 0) {
        await settleFreeBoutSpend(poolSpendDelta, freePoolDate ?? undefined);
      }
    }

    // Flush batched $ai_generation events (serverCaptureAIGeneration uses
    // capture() for latency, not captureImmediate). shutdown() drains the
    // promise queue so no events are lost when the function terminates.
    try {
      await flushServerAnalytics();
    } catch {
      // Best-effort — analytics loss is acceptable.
    }

    return { transcript, shareLine, inputTokens, outputTokens };
  } catch (error) {
    const boutDurationMs = Date.now() - boutStartTime;
    log.error('Bout stream failed', toError(error), {
      requestId,
      boutId,
      presetId,
      modelId,
      turnsCompleted: transcript.length,
      inputTokens,
      outputTokens,
      durationMs: boutDurationMs,
    });

    Sentry.logger.error('bout_error', {
      bout_id: boutId,
      preset_id: presetId,
      model_id: modelId,
      user_id: userId ? hashUserId(userId) : 'anonymous',
      user_tier: ctx.tier,
      turns_completed: transcript.length,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duration_ms: boutDurationMs,
      error_message: error instanceof Error ? error.message : String(error),
    });

    // --- Analytics: bout_error (OCE-283) ---
    await serverTrack(userId ?? 'anonymous', 'bout_error', {
      bout_id: boutId,
      preset_id: presetId,
      model_id: modelId,
      user_tier: ctx.tier,
      agent_count: preset.agents.length,
      turns_completed: transcript.length,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duration_ms: boutDurationMs,
      is_byok: !!byokData,
    });

    // Persist error state with partial transcript
    await db
      .update(bouts)
      .set({ status: 'error', transcript, updatedAt: new Date() })
      .where(eq(bouts.id, boutId));

    // Error-path credit settlement: refund unused preauth.
    // The preauth already deducted preauthMicro from the user's balance.
    // We need to add back the unused portion (preauthMicro - actualMicro).
    if (CREDITS_ENABLED && preauthMicro && userId) {
      const actualCost = computeCostGbp(inputTokens, outputTokens, modelId);
      const actualMicro = toMicroCredits(actualCost);
      const refundMicro = preauthMicro - actualMicro;
      if (refundMicro > 0) {
        await applyCreditDelta(userId, refundMicro, 'settlement-error', {
          presetId,
          boutId,
          modelId,
          inputTokens,
          outputTokens,
          actualCostGbp: actualCost,
          preauthMicro,
          referenceId: boutId,
        });
      }
    }

    // Error-path intro pool refund: return consumed credits to the shared pool.
    // Without this, an attacker could drain the intro pool by triggering errors
    // on anonymous bouts — the credits would be consumed but never used or returned.
    if (introPoolConsumedMicro > 0) {
      log.info('Refunding intro pool on error', { boutId, introPoolConsumedMicro });
      await refundIntroPool(introPoolConsumedMicro);
    }

    // Error-path free pool refund: return the estimated spend to the daily pool.
    // Without this, failed bouts permanently consume pool budget.
    if (freePoolSpendMicro > 0) {
      const actualCostForPool = computeCostGbp(inputTokens, outputTokens, modelId);
      const actualMicroForPool = toMicroCredits(actualCostForPool);
      const refundDelta = -(freePoolSpendMicro - actualMicroForPool);
      log.info('Refunding free pool on error', { boutId, freePoolSpendMicro, actualMicroForPool, refundDelta });
      await settleFreeBoutSpend(refundDelta, freePoolDate ?? undefined);
    }

    // Flush batched $ai_generation events on error path too.
    try {
      await flushServerAnalytics();
    } catch {
      // Best-effort — analytics loss is acceptable.
    }

    throw error;
  }
}
