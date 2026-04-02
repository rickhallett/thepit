// Bout validation phase: parse, auth, tier, credits, idempotency.
//
// Extracted from bout-engine.ts (RD-010) to isolate the validation
// boundary from the execution loop. All types and helpers shared
// between validation and execution live here.

import { timingSafeEqual } from 'crypto';

import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { bouts } from '@/db/schema';
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
  estimateBoutCostGbp,
  preauthorizeCredits,
  toMicroCredits,
  BYOK_ENABLED,
} from '@/lib/credits';
import {
  getIntroPoolStatus,
  consumeIntroPoolAnonymous,
} from '@/lib/intro-pool';
import {
  SUBSCRIPTIONS_ENABLED,
  getUserTier,
  canRunBout,
  canAccessModel,
  incrementFreeBoutsUsed,
  getFreeBoutsUsed,
} from '@/lib/tier';
import { FIRST_BOUT_PROMOTION_MODEL } from '@/lib/models';
import { UNSAFE_PATTERN } from '@/lib/validation';
import { errorResponse, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { getRequestId } from '@/lib/request-context';
import type { PromptHook, ScriptedTurn } from '@/lib/experiment';
import type { OnBoutCompleted } from './bout-execution';

// ─── Prompt caching ──────────────────────────────────────────────────

/**
 * Anthropic prompt caching: mark a message as a cache breakpoint.
 * The API caches all content up to and including the marked message.
 * Ignored by non-Anthropic providers (OpenRouter, etc.).
 *
 * @see https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 */
export const ANTHROPIC_CACHE_CONTROL = {
  anthropic: { cacheControl: { type: 'ephemeral' as const } },
} as const;

/**
 * Whether the current bout is hitting an Anthropic model (platform or BYOK).
 * OpenRouter BYOK calls should NOT receive Anthropic-specific providerOptions.
 * @internal Exported for testing only - do not use outside bout-engine.
 */
export function isAnthropicModel(modelId: string, byokData: ByokKeyData | null): boolean {
  if (modelId !== 'byok') return true; // Platform-funded - always Anthropic
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
  /** User tier at the time of validation. */
  tier: 'anonymous' | 'free' | 'pass' | 'lab';
  requestId: string;
  db: ReturnType<typeof requireDb>;
  /** Per-agent model overrides validated against tier rules. Maps agentId to modelId. */
  agentModelOverrides?: Record<string, string>;
  // ─── Experiment infrastructure (optional) ────────────────────────
  /** Per-turn callback to inject content into agent system prompts. Research API only. */
  promptHook?: PromptHook;
  /** Pre-scripted turns that bypass the LLM call. Research API only. */
  scriptedTurns?: Map<number, ScriptedTurn>;
  // ─── Post-completion hook (optional) ────────────────────────────
  /** Callback invoked after bout completion DB write. Advisory - errors are caught and logged. */
  onBoutCompleted?: OnBoutCompleted;
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

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Hash a userId for LangSmith trace metadata. Avoids logging raw PII.
 * @internal Exported for testing only - do not use outside bout-engine.
 */
export function hashUserId(userId: string): string {
  // Simple truncated hash - sufficient for trace grouping, not cryptographic.
  // Uses Node.js built-in crypto via a quick SHA-256 prefix.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('node:crypto') as typeof import('node:crypto');
    return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
  } catch {
    return 'unknown';
  }
}

// Re-export TranscriptEntry for use by bout-execution.ts
import { type TranscriptEntry } from '@/db/schema';
export type { TranscriptEntry };

// ─── Phase 1: Validation ─────────────────────────────────────────────

/** Tagged result of validateBoutRequest - discriminate on `ok`. */
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
  // Only read (and clear) for authenticated users - anonymous users cannot
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
  const boutMaxRequests = BOUT_LIMITS[currentTier]; // undefined for lab -> skip

  if (boutMaxRequests !== undefined) {
    const rateLimitId = userId ?? getClientIdentifier(req);
    const boutRateCheck = await checkRateLimit(
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
  // freePoolSpendMicro/freePoolDate removed - no daily pool cap.

  if (SUBSCRIPTIONS_ENABLED && userId) {
    // Reuse tier resolved above for rate limiting - avoids a redundant DB read.
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
      // Free-tier users are now gated by their credit balance only
      // (no daily pool cap). Track bout usage for analytics.
      await incrementFreeBoutsUsed(userId);
    }
  } else {
    // Anonymous / demo users: Haiku only. No premium models, no BYOK.
    // modelId stays at FREE_MODEL_ID (set above).
  }

  // Per-agent model overrides: validate each agent's model against tier rules.
  // Only enabled when subscriptions are active and user is authenticated.
  // Invalid overrides are silently dropped (agent falls back to global modelId).
  const agentModelOverrides: Record<string, string> = {};
  if (preset.id === ARENA_PRESET_ID && SUBSCRIPTIONS_ENABLED && userId) {
    const tier = currentTier as Exclude<typeof currentTier, 'anonymous'>;
    for (const agent of preset.agents) {
      if (agent.model && agent.model !== modelId && agent.model !== 'byok') {
        if (canAccessModel(tier, agent.model) && (PREMIUM_MODEL_OPTIONS.includes(agent.model) || agent.model === FREE_MODEL_ID)) {
          agentModelOverrides[agent.id] = agent.model;
        }
      }
    }
  }

  // Credit pre-authorization uses the most expensive model for worst-case estimate.
  const allModelsInBout = [modelId, ...Object.values(agentModelOverrides)];
  const worstCaseModelId = allModelsInBout.length > 1
    ? allModelsInBout.reduce((worst, m) => {
        const wCost = estimateBoutCostGbp(1, worst);
        const mCost = estimateBoutCostGbp(1, m);
        return mCost > wCost ? m : worst;
      })
    : modelId;

  // Credit pre-authorization
  // Research bypass skips all credit/pool gates - the bouts are platform-internal.
  let preauthMicro = 0;
  let introPoolConsumedMicro = 0;
  if (CREDITS_ENABLED && !researchBypass) {
    const estimatedCost = estimateBoutCostGbp(
      preset.maxTurns,
      worstCaseModelId,
      lengthConfig.outputTokensPerTurn,
    );
    preauthMicro = toMicroCredits(estimatedCost);

    if (!userId) {
      // Anonymous user - check if intro pool has credits
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
      // Authenticated user - preauthorize from user credits
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
      tier: currentTier,
      requestId,
      db,
      agentModelOverrides: Object.keys(agentModelOverrides).length > 0
        ? agentModelOverrides
        : undefined,
    },
  };
}
