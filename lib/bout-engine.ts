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
// The streaming route passes an onTurnEvent callback to write SSE events.
// The sync route omits it and gets the final result directly.

import { tracedStreamText, untracedStreamText, withTracing } from '@/lib/langsmith';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

import { requireDb } from '@/db';
import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { buildSystemMessage, buildUserMessage, buildSharePrompt, estimatePromptTokens, truncateHistoryToFit } from '@/lib/xml-prompt';
import { getRequestId } from '@/lib/request-context';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { readAndClearByokKey } from '@/app/api/byok-stash/route';
import {
  DEFAULT_PREMIUM_MODEL_ID,
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
import { consumeFreeBout } from '@/lib/free-bout-pool';
import { FIRST_BOUT_PROMOTION_MODEL } from '@/lib/models';
import { UNSAFE_PATTERN } from '@/lib/validation';
import { detectRefusal, logRefusal } from '@/lib/refusal-detection';
import { errorResponse, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';

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

/**
 * Validate and prepare a bout request.
 *
 * Returns either an error Response (caller should return it immediately)
 * or a BoutContext with all validated/resolved state needed to execute.
 */
export async function validateBoutRequest(
  req: Request,
): Promise<{ error: Response } | { context: BoutContext }> {
  let payload: {
    presetId?: string;
    boutId?: string;
    topic?: string;
    model?: string;
    length?: string;
    format?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return { error: errorResponse(API_ERRORS.INVALID_JSON, 400) };
  }

  if (!payload || typeof payload !== 'object') {
    return { error: errorResponse(API_ERRORS.INVALID_JSON, 400) };
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
    return { error: errorResponse('Missing boutId.', 400) };
  }

  if (topic.length > 500) {
    return { error: errorResponse('Topic must be 500 characters or fewer.', 400) };
  }

  if (UNSAFE_PATTERN.test(topic)) {
    return { error: errorResponse(API_ERRORS.UNSAFE_CONTENT, 400) };
  }

  let db: ReturnType<typeof requireDb>;
  try {
    db = requireDb();
  } catch {
    return { error: errorResponse(API_ERRORS.SERVICE_UNAVAILABLE, 503) };
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
      return { error: errorResponse('Bout is already running.', 409) };
    }
    if (existingBout.status === 'completed') {
      return { error: errorResponse('Bout has already completed.', 409) };
    }
  }

  if (!presetId) {
    presetId = existingBout?.presetId;
  }

  if (!presetId) {
    return { error: errorResponse('Missing presetId.', 400) };
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
      })
      .from(bouts)
      .where(eq(bouts.id, boutId))
      .limit(1);
    if (!row?.agentLineup) {
      return { error: errorResponse('Unknown preset.', 404) };
    }
    preset = buildArenaPresetFromLineup(row.agentLineup);
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
    return { error: errorResponse('Unknown preset.', 404) };
  }

  const requestedModel =
    typeof payload.model === 'string' ? payload.model.trim() : '';

  // BYOK key from cookie (structured: provider + model + key)
  let byokData: ByokKeyData | null = null;
  if (requestedModel === 'byok') {
    const jar = await cookies();
    byokData = readAndClearByokKey(jar);
  }

  const { userId } = await auth();

  // Ownership check
  if (existingBout?.ownerId && existingBout.ownerId !== userId) {
    return { error: errorResponse(API_ERRORS.FORBIDDEN, 403) };
  }

  // Rate limiting
  const rateLimitId = userId ?? getClientIdentifier(req);
  const boutMaxRequests = userId ? 5 : 2;
  const boutRateCheck = checkRateLimit(
    { name: 'bout-creation', maxRequests: boutMaxRequests, windowMs: 60 * 60 * 1000 },
    rateLimitId,
  );
  if (!boutRateCheck.success) {
    // Look up tier for upgrade context (cheap — single DB read, cached).
    const currentTier = userId
      ? await getUserTier(userId)
      : ('anonymous' as const);

    return {
      error: rateLimitResponse(boutRateCheck, {
        message: `Rate limit exceeded. Max ${boutMaxRequests} bouts per hour.`,
        limit: boutMaxRequests,
        currentTier,
        upgradeTiers:
          currentTier === 'lab'
            ? [] // Lab users see no upgrade prompt — just the timer.
            : [
                ...(currentTier !== 'pass'
                  ? [{ tier: 'pass', limit: 15, url: '/sign-up?redirect_url=/arena#upgrade' }]
                  : []),
                { tier: 'lab', limit: null, url: '/sign-up?redirect_url=/arena#upgrade' },
              ],
      }),
    };
  }

  // Tier-based access control
  const isByok = requestedModel === 'byok' && BYOK_ENABLED;
  let modelId = FREE_MODEL_ID;

  if (SUBSCRIPTIONS_ENABLED && userId) {
    const tier = await getUserTier(userId);

    const boutCheck = await canRunBout(userId, isByok);
    if (!boutCheck.allowed) {
      return { error: errorResponse(boutCheck.reason, 402) };
    }

    if (isByok) {
      if (!byokData?.key) {
        return { error: errorResponse('BYOK key required.', 400) };
      }
      modelId = 'byok';
    } else if (requestedModel && PREMIUM_MODEL_OPTIONS.includes(requestedModel)) {
      if (!canAccessModel(tier, requestedModel)) {
        return {
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

    // First-bout promotion: give free-tier users Opus on their very first
    // bout so they experience the best model quality and are motivated to
    // upgrade. Only applies to non-BYOK, non-explicit-model requests.
    if (
      !isByok &&
      tier === 'free' &&
      modelId === FREE_MODEL_ID &&
      !requestedModel
    ) {
      const used = await getFreeBoutsUsed(userId);
      if (used === 0) {
        modelId = FIRST_BOUT_PROMOTION_MODEL;
        log.info('First-bout promotion: upgraded to Opus', { userId });
      }
    }

    if (!isByok && tier === 'free') {
      const poolResult = await consumeFreeBout();
      if (!poolResult.consumed) {
        return {
          error: errorResponse(
            'Daily free bout pool exhausted. Upgrade your plan or use your own API key (BYOK).',
            429,
          ),
        };
      }
      await incrementFreeBoutsUsed(userId);
    }
  } else {
    const premiumEnabled = process.env.PREMIUM_ENABLED === 'true';
    if (preset.tier === 'premium' && !premiumEnabled) {
      return { error: errorResponse('Premium required.', 402) };
    }

    const allowPremiumModels = preset.tier === 'premium' || preset.id === ARENA_PRESET_ID;
    if (allowPremiumModels && premiumEnabled) {
      modelId = PREMIUM_MODEL_OPTIONS.includes(requestedModel)
        ? requestedModel
        : DEFAULT_PREMIUM_MODEL_ID;
    } else if (isByok) {
      if (!byokData?.key) {
        return { error: errorResponse('BYOK key required.', 400) };
      }
      modelId = 'byok';
    } else if (requestedModel === 'byok') {
      return { error: errorResponse('BYOK not enabled.', 400) };
    }
  }

  // Credit pre-authorization
  let preauthMicro = 0;
  let introPoolConsumedMicro = 0;
  if (CREDITS_ENABLED) {
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
        return { error: errorResponse(API_ERRORS.AUTH_REQUIRED, 401) };
      }

      // Consume from intro pool for anonymous bout
      const poolConsume = await consumeIntroPoolAnonymous(preauthMicro);
      if (!poolConsume.consumed) {
        return { error: errorResponse('Intro pool exhausted. Sign in to continue.', 402) };
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
        return { error: errorResponse('Insufficient credits.', 402) };
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
    return { error: errorResponse('Service temporarily unavailable.', 503) };
  }

  return {
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
      requestId,
      db,
    },
  };
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
  // Wrap the inner logic with LangSmith tracing. The trace name includes
  // the boutId for easy search, and metadata enables filtering by preset,
  // model, topic, etc. in the LangSmith dashboard.
  const traced = withTracing(_executeBoutInner, {
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
    },
    tags: ['bout', ctx.presetId, ctx.modelId].filter(Boolean),
  });
  return traced(ctx, onEvent);
}

/** Inner bout execution logic, wrapped by executeBout with tracing. */
async function _executeBoutInner(
  ctx: BoutContext,
  onEvent?: (event: TurnEvent) => void,
): Promise<BoutResult> {
  const { boutId, presetId, preset, topic, lengthConfig, formatConfig, modelId, byokData, userId, preauthMicro, introPoolConsumedMicro, requestId, db } = ctx;

  const boutStartTime = Date.now();
  log.info('Bout stream starting', {
    requestId,
    boutId,
    presetId,
    modelId,
    maxTurns: preset.maxTurns,
    userId: userId ?? undefined,
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
      const streamFn = byokData ? untracedStreamText : tracedStreamText;
      const result = streamFn({
        model: boutModel,
        maxOutputTokens: lengthConfig.maxOutputTokens,
        messages: [
          { role: 'system', content: systemContent },
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

      const turnDurationMs = Date.now() - turnStart;
      log.info('AI turn complete', {
        requestId,
        boutId,
        turn: i,
        agentId: agent.id,
        modelId,
        inputTokens: turnInputTokens,
        outputTokens: turnOutputTokens,
        durationMs: turnDurationMs,
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

    throw error;
  }
}
