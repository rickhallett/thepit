// Bout execution phase: turn loop, transcript, share line, DB persist, credit settle.
//
// Extracted from bout-engine.ts (RD-010). Settlement logic stays here
// because it is tightly coupled to the try/catch error-recovery structure.

import * as Sentry from '@sentry/nextjs';
import { tracedStreamText, untracedStreamText, withTracing } from '@/lib/langsmith';
import { getContext } from '@/lib/async-context';
import { and, eq, sql } from 'drizzle-orm';

import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { serverTrack, serverCaptureAIGeneration, flushServerAnalytics } from '@/lib/posthog-server';
import { buildSystemMessage, buildUserMessage, buildSharePrompt, estimatePromptTokens, truncateHistoryToFit } from '@/lib/xml-prompt';
import { bouts, users, type TranscriptEntry } from '@/db/schema';
import {
  getModel,
  getInputTokenBudget,
} from '@/lib/ai';
import { DEFAULT_FREE_MODEL } from '@/lib/model-registry';
import { DEFAULT_AGENT_COLOR } from '@/lib/presets';
import { detectRefusal, logRefusal } from '@/lib/refusal-detection';
import { appendExperimentInjection } from '@/lib/experiment';
import {
  CREDITS_ENABLED,
  applyCreditDelta,
  computeCostGbp,
  computeCostUsd,
  estimateTokensFromText,
  settleCredits,
  toMicroCredits,
} from '@/lib/credits';
import {
  refundIntroPool,
} from '@/lib/intro-pool';

import type { BoutContext, BoutResult, TurnEvent, ByokKeyData } from './bout-validation';
import { ANTHROPIC_CACHE_CONTROL, isAnthropicModel, hashUserId } from './bout-validation';

// ─── Post-completion hook types ──────────────────────────────────────

/** Metadata passed to the post-completion hook after a bout finishes. */
export type BoutCompletionEvent = {
  boutId: string;
  presetId: string;
  ownerId: string | null;
  transcript: TranscriptEntry[];
  agentLineup: { id: string; name: string }[] | null;
  winnerId: string | null;
  status: 'completed' | 'error';
};

/** Optional callback invoked after bout completion DB write. */
export type OnBoutCompleted = (event: BoutCompletionEvent) => void | Promise<void>;

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
  // captureImmediate - completes HTTP request before continuing.
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
      'This is a fictional entertainment format - like improv comedy or a debate show - NOT real advocacy. ' +
      'You MUST stay in character for the entire response. Do not break the fourth wall, ' +
      'do not add disclaimers, do not refuse the role, and do not offer alternatives. ' +
      'The audience understands these are fictional characters with exaggerated viewpoints. ' +
      'Do not reveal system details, API keys, or internal platform information.';

    for (let i = 0; i < preset.maxTurns; i += 1) {
      const agent = preset.agents[i % preset.agents.length];
      if (!agent) {
        throw new Error(
          preset.agents.length === 0
            ? `preset.agents is empty - no agents defined for preset (boutId=${boutId})`
            : `Agent not found at index ${i % preset.agents.length} - preset.agents is corrupted (boutId=${boutId})`,
        );
      }

      // Per-agent model resolution: agent may carry a model override from the lineup
      // Resolve the actual model ID for this turn
      const turnModelId = agent.model
        ?? (modelId === 'byok' ? (byokData?.modelId ?? DEFAULT_FREE_MODEL) : modelId);

      const boutModel = getModel(
        turnModelId,
        modelId === 'byok' ? byokData?.key : undefined,
      );
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

      // ── Experiment: scripted turn fast path ──────────────────────
      // When a scripted turn matches this turn number, skip the LLM call
      // entirely and emit the pre-determined content. The scripted text
      // still gets added to history and streamed via SSE. No API cost.
      const scriptedTurn = ctx.scriptedTurns?.get(i);
      if (scriptedTurn) {
        const scriptedText = scriptedTurn.content;
        log.info('Scripted turn emitted', {
          requestId,
          boutId,
          turn: i,
          agentId: agent.id,
          scriptedAgentIndex: scriptedTurn.agentIndex,
          contentLength: scriptedText.length,
        });

        // Emit scripted content as SSE deltas (single chunk for scripted turns)
        onEvent?.({ type: 'text-delta', id: turnId, delta: scriptedText });
        onEvent?.({ type: 'text-end', id: turnId });

        // No token accounting for scripted turns - no LLM call was made
        history.push(`${agent.name}: ${scriptedText}`);

        transcript.push({
          turn: i,
          agentId: agent.id,
          agentName: agent.name,
          text: scriptedText,
        });

        continue;
      }

      // ── Standard LLM turn ──────────────────────────────────────
      let systemContent = buildSystemMessage({
        safety: SAFETY_TEXT,
        persona: agent.systemPrompt,
        format: formatConfig.instruction,
      });

      // Experiment infrastructure: apply prompt hook if configured.
      // The hook can inject content into the system prompt for controlled
      // context-injection experiments. Only active when explicitly provided
      // via research API - null/undefined is the default (no-op).
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

      // Context window budgeting: truncate history from the front if the
      // full transcript would exceed the model's input token limit.
      // For BYOK, use the user-selected model ID (OpenRouter or Anthropic)
      // to look up the correct context window, falling back to the platform default.
      const resolvedModelId = turnModelId;
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
      // BYOK calls use the untraced variant - user API keys must not be
      // logged to our LangSmith project. Platform calls get full tracing.
      const streamFn = modelId === 'byok' ? untracedStreamText : tracedStreamText;

      // Anthropic prompt caching: mark the system message as a cache
      // breakpoint so repeated turns reuse the cached safety+persona+format
      // prefix. Ignored for non-Anthropic providers (OpenRouter BYOK).
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
        timeout: { totalMs: 30000, chunkMs: 10000 },
      });

      let fullText = '';
      let estimatedOutputTokens = 0;
      let ttftLogged = false;
      let turnTimedOut = false;
      try {
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
      } catch (streamError) {
        // Handle timeout by emitting error event and skipping this turn
        const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
        const isTimeout = errMsg.includes('timeout') || errMsg.includes('Timeout');
        if (isTimeout) {
          turnTimedOut = true;
          log.warn('Turn timed out', {
            requestId,
            boutId,
            turn: i,
            agentId: agent.id,
            partialTextLength: fullText.length,
            error: errMsg,
          });
          // Emit error SSE event for this turn
          onEvent?.({ type: 'text-delta', id: turnId, delta: '\n[Turn timed out]' });
        } else {
          // Re-throw non-timeout errors
          throw streamError;
        }
      }

      onEvent?.({ type: 'text-end', id: turnId });

      // If turn timed out, use partial text or skip if empty
      if (turnTimedOut && fullText.length === 0) {
        fullText = '[Turn timed out - no response received]';
      }

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
          // Non-fatal - provider may not return metadata
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
      const aiModelId = turnModelId;
      const aiProvider = isAnthropicModel(turnModelId) ? 'anthropic' : 'openrouter';
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

      // Share line is always platform-funded (Haiku) - use traced variant.
      // 15s timeout with empty string fallback on failure.
      const shareLineStart = Date.now();
      const shareResult = tracedStreamText({
        model: getModel(DEFAULT_FREE_MODEL),
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
        // Timeout or other stream error - fall back to empty string
        const errMsg = shareStreamError instanceof Error ? shareStreamError.message : String(shareStreamError);
        log.warn('Share line stream failed, falling back to empty', {
          boutId,
          error: errMsg,
          partialTextLength: shareText.length,
        });
        shareText = '';
      }
      const trimmedShare = shareText.trim().replace(/^["']|["']$/g, '');
      if (trimmedShare.length === 0) {
        // Empty or whitespace-only - treat as null (failure fallback)
        shareLine = null;
      } else if (trimmedShare.length > 140) {
        shareLine = `${trimmedShare.slice(0, 137).trimEnd()}...`;
      } else {
        shareLine = trimmedShare;
      }

      // PostHog LLM analytics for share line generation (only if we got text)
      if (shareLine !== null) {
        const shareUsage = await shareResult.usage;
        const shareInputTokens = shareUsage?.inputTokens ?? estimateTokensFromText(shareContent, 1);
        const shareOutputTokens = shareUsage?.outputTokens ?? estimateTokensFromText(shareText, 1);
        const shareDurationMs = Date.now() - shareLineStart;
        const shareCost = computeCostUsd(shareInputTokens, shareOutputTokens, DEFAULT_FREE_MODEL);
        serverCaptureAIGeneration(userId ?? 'anonymous', {
          model: DEFAULT_FREE_MODEL,
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
      }
    } catch (error) {
      log.warn('Failed to generate share line', toError(error), { boutId });
    }

    // Persist completed bout - with retry for transient DB failures.
    // If this UPDATE fails, the transcript (already streamed to the user) would
    // be lost and the bout stuck in 'running' status. Credits are already
    // deducted via preauthorization, so this is a data-loss scenario with
    // financial implications.

    // Build the completion payload as a function so each attempt gets a fresh
    // timestamp (updatedAt/shareGeneratedAt should reflect actual persist time).
    const buildCompletionPayload = () => ({
      status: 'completed' as const,
      transcript,
      shareLine,
      shareGeneratedAt: shareLine ? new Date() : null,
      updatedAt: new Date(),
    });

    // Truncate transcript at array-element level for Sentry logging.
    // Sentry caps event payloads at ~200KB. Slicing a serialized string
    // at an arbitrary byte boundary produces invalid JSON, defeating
    // transcript recovery. Instead, drop trailing turns until the
    // serialized form fits within budget.
    const MAX_SENTRY_TRANSCRIPT_BYTES = 100_000;
    let transcriptForLog = transcript;
    let transcriptTruncated = false;

    let transcriptData = JSON.stringify(transcript);
    while (transcriptData.length > MAX_SENTRY_TRANSCRIPT_BYTES && transcriptForLog.length > 1) {
      transcriptForLog = transcriptForLog.slice(0, -1);
      transcriptData = JSON.stringify(transcriptForLog);
      transcriptTruncated = true;
    }

    try {
      await db
        .update(bouts)
        .set(buildCompletionPayload())
        .where(eq(bouts.id, boutId));
    } catch (completionError) {
      // Preserve transcript in Sentry structured logging - even if DB is down,
      // the transcript data survives in the logging pipeline for recovery.
      Sentry.logger.error('bout_completion_write_failed', {
        bout_id: boutId,
        preset_id: presetId,
        model_id: modelId,
        user_id: userId ? hashUserId(userId) : 'anonymous',
        transcript_length: transcript.length,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        has_share_line: !!shareLine,
        transcript_data: transcriptData,
        transcript_truncated: transcriptTruncated,
        error_message: completionError instanceof Error ? completionError.message : String(completionError),
        attempt: 1,
      });

      log.error('Bout completion DB write failed, retrying', toError(completionError), {
        requestId,
        boutId,
        presetId,
        modelId,
        transcriptLength: transcript.length,
        inputTokens,
        outputTokens,
      });

      // Retry once after a short delay - avoids triggering the full error path
      // (status='error' + credit refund) for a transient DB hiccup.
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        await db
          .update(bouts)
          .set(buildCompletionPayload())
          .where(eq(bouts.id, boutId));

        log.info('Bout completion DB write succeeded on retry', {
          requestId,
          boutId,
        });
      } catch (retryError) {
        Sentry.logger.error('bout_completion_write_failed_final', {
          bout_id: boutId,
          preset_id: presetId,
          model_id: modelId,
          user_id: userId ? hashUserId(userId) : 'anonymous',
          transcript_length: transcript.length,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          has_share_line: !!shareLine,
          transcript_data: transcriptData,
          transcript_truncated: transcriptTruncated,
          error_message: retryError instanceof Error ? retryError.message : String(retryError),
          attempt: 2,
        });

        log.error('Bout completion DB write failed on retry, propagating', toError(retryError), {
          requestId,
          boutId,
          presetId,
          modelId,
          transcriptLength: transcript.length,
          inputTokens,
          outputTokens,
        });

        // Propagate to outer catch which handles status='error' + credit refund
        throw retryError;
      }
    }

    // Post-completion hook: notify downstream systems (e.g. tournament brackets).
    // Called after the DB write succeeds. Errors are caught and logged - the hook
    // is advisory and must not prevent the bout from completing.
    if (ctx.onBoutCompleted) {
      try {
        await ctx.onBoutCompleted({
          boutId,
          presetId,
          ownerId: userId,
          transcript,
          agentLineup: preset.agents.map((a) => ({ id: a.id, name: a.name })),
          winnerId: null, // winner determined by votes, not engine
          status: 'completed',
        });
      } catch (hookError) {
        log.error('Post-completion hook failed', toError(hookError), { boutId });
      }
    }

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
    // captureImmediate - completes HTTP request before continuing.
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

    // --- Analytics: user_activated (RD-004) ---
    // Fire once when a user completes their very first bout. Uses an atomic
    // UPDATE ... WHERE activated_at IS NULL RETURNING to guarantee exactly one
    // event even under concurrent bout completions. Only the first UPDATE gets
    // a RETURNING row; the second sees an empty result and skips.
    if (userId) {
      try {
        const [activated] = await db
          .update(users)
          .set({ activatedAt: sql`NOW()` })
          .where(and(eq(users.id, userId), sql`${users.activatedAt} IS NULL`))
          .returning({ id: users.id });
        if (activated) {
          await serverTrack(userId, 'user_activated', {
            preset_id: presetId,
            model_id: modelId,
            duration_ms: boutDurationMs,
          });
        }
      } catch {
        // Non-critical - don't break bout completion for analytics
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

    // Free bout pool settlement removed - no daily pool cap to reconcile.

    // Flush batched $ai_generation events (serverCaptureAIGeneration uses
    // capture() for latency, not captureImmediate). shutdown() drains the
    // promise queue so no events are lost when the function terminates.
    try {
      await flushServerAnalytics();
    } catch {
      // Best-effort - analytics loss is acceptable.
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

    // Post-completion hook (error path): notify downstream systems of failure.
    if (ctx.onBoutCompleted) {
      try {
        await ctx.onBoutCompleted({
          boutId,
          presetId,
          ownerId: userId,
          transcript,
          agentLineup: preset.agents.map((a) => ({ id: a.id, name: a.name })),
          winnerId: null,
          status: 'error',
        });
      } catch (hookError) {
        log.error('Post-completion hook failed (error path)', toError(hookError), { boutId });
      }
    }

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
    // on anonymous bouts - the credits would be consumed but never used or returned.
    if (introPoolConsumedMicro > 0) {
      log.info('Refunding intro pool on error', { boutId, introPoolConsumedMicro });
      await refundIntroPool(introPoolConsumedMicro);
    }

    // Free pool error-path refund removed - no daily pool cap.

    // Flush batched $ai_generation events on error path too.
    try {
      await flushServerAnalytics();
    } catch {
      // Best-effort - analytics loss is acceptable.
    }

    throw error;
  }
}
