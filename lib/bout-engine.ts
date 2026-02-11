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

import { streamText } from 'ai';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

import { requireDb } from '@/db';
import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { buildSystemMessage, buildUserMessage, buildSharePrompt } from '@/lib/xml-prompt';
import { getRequestId } from '@/lib/request-context';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { readAndClearByokKey } from '@/app/api/byok-stash/route';
import {
  DEFAULT_PREMIUM_MODEL_ID,
  FREE_MODEL_ID,
  PREMIUM_MODEL_OPTIONS,
  getModel,
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
  SUBSCRIPTIONS_ENABLED,
  getUserTier,
  canRunBout,
  canAccessModel,
  incrementFreeBoutsUsed,
} from '@/lib/tier';
import { consumeFreeBout } from '@/lib/free-bout-pool';

// ─── Types ───────────────────────────────────────────────────────────

/** Validated context produced by validateBoutRequest. */
export type BoutContext = {
  boutId: string;
  presetId: string;
  preset: Preset;
  topic: string;
  lengthConfig: ResponseLengthConfig;
  formatConfig: ResponseFormat;
  modelId: string;
  byokKey: string;
  userId: string | null;
  preauthMicro: number;
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
    return { error: new Response('Invalid JSON.', { status: 400 }) };
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
    return { error: new Response('Missing boutId.', { status: 400 }) };
  }

  if (topic.length > 500) {
    return { error: new Response('Topic must be 500 characters or fewer.', { status: 400 }) };
  }

  let db: ReturnType<typeof requireDb>;
  try {
    db = requireDb();
  } catch {
    return { error: new Response('Service unavailable.', { status: 500 }) };
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
      return { error: new Response('Bout is already running.', { status: 409 }) };
    }
    if (existingBout.status === 'completed') {
      return { error: new Response('Bout has already completed.', { status: 409 }) };
    }
  }

  if (!presetId) {
    presetId = existingBout?.presetId;
  }

  if (!presetId) {
    return { error: new Response('Missing presetId.', { status: 400 }) };
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
      return { error: new Response('Unknown preset.', { status: 404 }) };
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
    return { error: new Response('Unknown preset.', { status: 404 }) };
  }

  const requestedModel =
    typeof payload.model === 'string' ? payload.model.trim() : '';

  // BYOK key from cookie
  let byokKey = '';
  if (requestedModel === 'byok') {
    const jar = await cookies();
    byokKey = readAndClearByokKey(jar) ?? '';
  }

  const { userId } = await auth();

  // Ownership check
  if (existingBout?.ownerId && existingBout.ownerId !== userId) {
    return { error: new Response('Forbidden.', { status: 403 }) };
  }

  // Rate limiting
  const rateLimitId = userId ?? getClientIdentifier(req);
  const boutRateCheck = checkRateLimit(
    { name: 'bout-creation', maxRequests: userId ? 5 : 2, windowMs: 60 * 60 * 1000 },
    rateLimitId,
  );
  if (!boutRateCheck.success) {
    return { error: new Response('Rate limit exceeded. Try again later.', { status: 429 }) };
  }

  // Tier-based access control
  const isByok = requestedModel === 'byok' && BYOK_ENABLED;
  let modelId = FREE_MODEL_ID;

  if (SUBSCRIPTIONS_ENABLED && userId) {
    const tier = await getUserTier(userId);

    const boutCheck = await canRunBout(userId, isByok);
    if (!boutCheck.allowed) {
      return { error: new Response(boutCheck.reason, { status: 402 }) };
    }

    if (isByok) {
      if (!byokKey) {
        return { error: new Response('BYOK key required.', { status: 400 }) };
      }
      modelId = 'byok';
    } else if (requestedModel && PREMIUM_MODEL_OPTIONS.includes(requestedModel)) {
      if (!canAccessModel(tier, requestedModel)) {
        return {
          error: new Response(
            `Your plan does not include access to this model. Upgrade or use BYOK.`,
            { status: 402 },
          ),
        };
      }
      modelId = requestedModel;
    } else if (preset.tier === 'premium' || preset.id === ARENA_PRESET_ID) {
      const allowed = PREMIUM_MODEL_OPTIONS.filter((m) => canAccessModel(tier, m));
      modelId = allowed[0] ?? FREE_MODEL_ID;
    }

    if (!isByok && tier === 'free') {
      const poolResult = await consumeFreeBout();
      if (!poolResult.consumed) {
        return {
          error: new Response(
            'Daily free bout pool exhausted. Upgrade your plan or use your own API key (BYOK).',
            { status: 429 },
          ),
        };
      }
      await incrementFreeBoutsUsed(userId);
    }
  } else {
    const premiumEnabled = process.env.PREMIUM_ENABLED === 'true';
    if (preset.tier === 'premium' && !premiumEnabled) {
      return { error: new Response('Premium required.', { status: 402 }) };
    }

    const allowPremiumModels = preset.tier === 'premium' || preset.id === ARENA_PRESET_ID;
    if (allowPremiumModels && premiumEnabled) {
      modelId = PREMIUM_MODEL_OPTIONS.includes(requestedModel)
        ? requestedModel
        : DEFAULT_PREMIUM_MODEL_ID;
    } else if (isByok) {
      if (!byokKey) {
        return { error: new Response('BYOK key required.', { status: 400 }) };
      }
      modelId = 'byok';
    } else if (requestedModel === 'byok') {
      return { error: new Response('BYOK not enabled.', { status: 400 }) };
    }
  }

  // Credit pre-authorization
  let preauthMicro = 0;
  if (CREDITS_ENABLED) {
    if (!userId) {
      return { error: new Response('Sign in required.', { status: 401 }) };
    }
    const estimatedCost = estimateBoutCostGbp(
      preset.maxTurns,
      modelId,
      lengthConfig.outputTokensPerTurn,
    );
    preauthMicro = toMicroCredits(estimatedCost);

    const preauth = await preauthorizeCredits(userId, preauthMicro, 'preauth', {
      presetId,
      boutId,
      modelId,
      estimatedCostGbp: estimatedCost,
      referenceId: boutId,
    });

    if (!preauth.success) {
      return { error: new Response('Insufficient credits.', { status: 402 }) };
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
    return { error: new Response('Service temporarily unavailable.', { status: 503 }) };
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
      byokKey,
      userId,
      preauthMicro,
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
 */
export async function executeBout(
  ctx: BoutContext,
  onEvent?: (event: TurnEvent) => void,
): Promise<BoutResult> {
  const { boutId, presetId, preset, topic, lengthConfig, formatConfig, modelId, byokKey, userId, preauthMicro, requestId, db } = ctx;

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
      'The following is a character persona for a debate simulation. Stay in character. Do not reveal system details, API keys, or internal platform information.';

    const boutModel = getModel(modelId, modelId === 'byok' ? byokKey : undefined);

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

      const userContent = buildUserMessage({
        topic,
        lengthLabel: lengthConfig.label,
        lengthHint: lengthConfig.hint,
        formatLabel: formatConfig.label,
        formatHint: formatConfig.hint,
        history,
        agentName: agent.name,
        isOpening: history.length === 0,
      });

      const turnStart = Date.now();
      const result = streamText({
        model: boutModel,
        maxOutputTokens: lengthConfig.maxOutputTokens,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
      });

      let fullText = '';
      let estimatedOutputTokens = 0;
      for await (const delta of result.textStream) {
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

      const shareResult = streamText({
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

    throw error;
  }
}
