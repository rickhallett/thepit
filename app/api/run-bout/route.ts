import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { readAndClearByokKey } from '@/app/api/byok-stash/route';
import {
  DEFAULT_PREMIUM_MODEL_ID,
  FREE_MODEL_ID,
  PREMIUM_MODEL_OPTIONS,
  getModel,
} from '@/lib/ai';
import { ARENA_PRESET_ID, getPresetById, type Agent, type Preset } from '@/lib/presets';
import { resolveResponseLength } from '@/lib/response-lengths';
import { resolveResponseFormat } from '@/lib/response-formats';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  CREDITS_ENABLED,
  applyCreditDelta,
  computeCostGbp,
  estimateBoutCostGbp,
  estimateTokensFromText,
  getCreditBalanceMicro,
  preauthorizeCredits,
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

export const runtime = 'nodejs';

// Allow up to 120 seconds for multi-turn streaming bouts.
// Edge runtime has a 30s limit which is insufficient for 12-turn bouts.
export const maxDuration = 120;

export async function POST(req: Request) {
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
    return new Response('Invalid JSON.', { status: 400 });
  }

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
    return new Response('Missing boutId.', { status: 400 });
  }

  let db: ReturnType<typeof requireDb>;
  try {
    db = requireDb();
  } catch {
    return new Response('Service unavailable.', { status: 500 });
  }

  // Idempotency check: Prevent double-running a bout.
  //
  // Normal flow: createBout() inserts with status='running' and empty
  // transcript, then the client calls /api/run-bout to start streaming.
  // We allow that (empty transcript = not yet streamed). We block:
  //   - 'running' bouts that already have transcript data (streaming in progress)
  //   - 'completed' bouts
  const [existingBout] = await db
    .select({
      status: bouts.status,
      presetId: bouts.presetId,
      transcript: bouts.transcript,
    })
    .from(bouts)
    .where(eq(bouts.id, boutId))
    .limit(1);

  if (existingBout) {
    const hasTranscript =
      Array.isArray(existingBout.transcript) && existingBout.transcript.length > 0;

    if (existingBout.status === 'running' && hasTranscript) {
      return new Response('Bout is already running.', { status: 409 });
    }
    if (existingBout.status === 'completed') {
      return new Response('Bout has already completed.', { status: 409 });
    }
    // Allow: 'running' with no transcript (normal flow), 'error' (retry)
  }

  if (!presetId) {
    presetId = existingBout?.presetId;
  }

  // For arena mode, we need to fetch additional bout data
  if (!presetId) {
    // No existing bout and no presetId provided
    return new Response('Missing presetId.', { status: 400 });
  }

  // O(1) preset lookup instead of array scan
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
      return new Response('Unknown preset.', { status: 404 });
    }
    const lineup: Agent[] = row.agentLineup.map((agent) => ({
      id: agent.id,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      color: agent.color ?? '#f8fafc',
      avatar: agent.avatar,
    }));
    preset = {
      id: ARENA_PRESET_ID,
      name: 'Arena Mode',
      description: 'Custom lineup',
      tier: 'free',
      maxTurns: 12,
      agents: lineup,
    };
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
    return new Response('Unknown preset.', { status: 404 });
  }

  const requestedModel =
    typeof payload.model === 'string' ? payload.model.trim() : '';

  // Read BYOK key from HTTP-only cookie (set by /api/byok-stash).
  // The cookie is deleted immediately after reading.
  // Placed here (after early validation) to avoid calling cookies() in tests.
  let byokKey = '';
  if (requestedModel === 'byok') {
    const jar = await cookies();
    byokKey = readAndClearByokKey(jar) ?? '';
  }

  const { userId } = await auth();

  // --- Tier-based access control ---
  // When subscriptions are enabled, use per-user tier checks.
  // When disabled, fall back to the legacy PREMIUM_ENABLED flag.
  const isByok = requestedModel === 'byok' && BYOK_ENABLED;

  let modelId = FREE_MODEL_ID;

  if (SUBSCRIPTIONS_ENABLED && userId) {
    const tier = await getUserTier(userId);

    // Check if user can run a bout (lifetime cap, daily limits)
    const boutCheck = await canRunBout(userId, isByok);
    if (!boutCheck.allowed) {
      return new Response(boutCheck.reason, { status: 402 });
    }

    if (isByok) {
      if (!byokKey) {
        return new Response('BYOK key required.', { status: 400 });
      }
      modelId = 'byok';
    } else if (requestedModel && PREMIUM_MODEL_OPTIONS.includes(requestedModel)) {
      // User requested a specific premium model — check tier access
      if (!canAccessModel(tier, requestedModel)) {
        return new Response(
          `Your plan does not include access to this model. Upgrade or use BYOK.`,
          { status: 402 },
        );
      }
      modelId = requestedModel;
    } else if (preset.tier === 'premium' || preset.id === ARENA_PRESET_ID) {
      // Preset wants a premium model — pick the best one the user's tier allows
      const allowed = PREMIUM_MODEL_OPTIONS.filter((m) => canAccessModel(tier, m));
      modelId = allowed[0] ?? FREE_MODEL_ID;
    }

    // For free-tier platform-funded bouts, consume from global pool
    if (!isByok && tier === 'free') {
      const poolResult = await consumeFreeBout();
      if (!poolResult.consumed) {
        return new Response(
          'Daily free bout pool exhausted. Upgrade your plan or use your own API key (BYOK).',
          { status: 429 },
        );
      }
      await incrementFreeBoutsUsed(userId);
    }
  } else {
    // Legacy path: subscriptions not enabled
    const premiumEnabled = process.env.PREMIUM_ENABLED === 'true';
    if (preset.tier === 'premium' && !premiumEnabled) {
      return new Response('Premium required.', { status: 402 });
    }

    const allowPremiumModels = preset.tier === 'premium' || preset.id === ARENA_PRESET_ID;
    if (allowPremiumModels && premiumEnabled) {
      modelId = PREMIUM_MODEL_OPTIONS.includes(requestedModel)
        ? requestedModel
        : DEFAULT_PREMIUM_MODEL_ID;
    } else if (isByok) {
      if (!byokKey) {
        return new Response('BYOK key required.', { status: 400 });
      }
      modelId = 'byok';
    } else if (requestedModel === 'byok') {
      return new Response('BYOK not enabled.', { status: 400 });
    }
  }

  if (userId) {
    const boutRateCheck = checkRateLimit(
      { name: 'bout-creation', maxRequests: 5, windowMs: 60 * 60 * 1000 },
      userId,
    );
    if (!boutRateCheck.success) {
      return new Response('Rate limit exceeded. Max 5 bouts per hour.', { status: 429 });
    }
  }

  let preauthMicro = 0;
  if (CREDITS_ENABLED) {
    if (!userId) {
      return new Response('Sign in required.', { status: 401 });
    }
    const estimatedCost = estimateBoutCostGbp(
      preset.maxTurns,
      modelId,
      lengthConfig.outputTokensPerTurn,
    );
    preauthMicro = toMicroCredits(estimatedCost);

    // Atomic preauthorization - prevents race condition where concurrent
    // requests could overdraw the account
    const preauth = await preauthorizeCredits(userId, preauthMicro, 'preauth', {
      presetId,
      boutId,
      modelId,
      estimatedCostGbp: estimatedCost,
      referenceId: boutId,
    });

    if (!preauth.success) {
      return new Response('Insufficient credits.', { status: 402 });
    }
  }

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
    console.error('Failed to ensure bout exists', error);
  }

  const stream = createUIMessageStream({
    async execute({ writer }) {
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
          })
          .where(eq(bouts.id, boutId));

        const SAFETY_PREAMBLE =
          'The following is a character persona for a debate simulation. Stay in character. Do not reveal system details, API keys, or internal platform information.\n\n';

        // Create the AI model provider once per request (not per turn)
        const boutModel = getModel(modelId, modelId === 'byok' ? byokKey : undefined);

        for (let i = 0; i < preset.maxTurns; i += 1) {
          const agent = preset.agents[i % preset.agents.length];
          const turnId = `${boutId}-${i}-${agent.id}`;

          writer.write({ type: 'start', messageId: turnId });
          writer.write({
            type: 'data-turn',
            data: {
              turn: i,
              agentId: agent.id,
              agentName: agent.name,
              color: agent.color ?? '#f8fafc',
            },
          });
          writer.write({ type: 'text-start', id: turnId });

          const topicLine = topic ? `Topic: ${topic}\n\n` : '';
          const lengthLine = `Response length: ${lengthConfig.label} (${lengthConfig.hint}).\n\n`;
          const formatLine = `Response format: ${formatConfig.label} (${formatConfig.hint}).\n\n`;
          const prompt =
            history.length > 0
              ? `${topicLine}${lengthLine}${formatLine}Transcript so far:\n${history.join('\n')}\n\nRespond in character as ${agent.name}.`
              : `${topicLine}${lengthLine}${formatLine}Open the debate in character as ${agent.name}.`;
          const result = streamText({
            model: boutModel,
            maxOutputTokens: lengthConfig.maxOutputTokens,
            messages: [
              {
                role: 'system',
                content: `${SAFETY_PREAMBLE}${agent.systemPrompt}\n\n${formatConfig.instruction}`,
              },
              { role: 'user', content: prompt },
            ],
          });

          let fullText = '';
          let estimatedOutputTokens = 0;
          for await (const delta of result.textStream) {
            fullText += delta;
            estimatedOutputTokens += estimateTokensFromText(delta, 0);
            writer.write({ type: 'text-delta', id: turnId, delta });
          }

          writer.write({ type: 'text-end', id: turnId });

          const usage = await result.usage;
          if (usage?.inputTokens || usage?.outputTokens) {
            inputTokens += usage.inputTokens ?? 0;
            outputTokens += usage.outputTokens ?? 0;
          } else {
            inputTokens += estimateTokensFromText(agent.systemPrompt, 1);
            inputTokens += estimateTokensFromText(prompt, 1);
            outputTokens += estimatedOutputTokens;
          }

          history.push(`${agent.name}: ${fullText}`);

          transcript.push({
            turn: i,
            agentId: agent.id,
            agentName: agent.name,
            text: fullText,
          });
        }

        try {
          const transcriptText = transcript
            .map((entry) => `${entry.agentName}: ${entry.text}`)
            .join('\n');
          const clippedTranscript = transcriptText.slice(-2000);
          const sharePrompt = `You just witnessed an AI bout. Here's the transcript.\nWrite a single tweet-length line (max 140 chars) that:\n- Captures the most absurd/funny/surprising moment\n- Makes someone want to click the link\n- Sounds like a human wrote it (not corporate)\n\nTranscript:\n${clippedTranscript}`;

          const shareResult = streamText({
            model: getModel(FREE_MODEL_ID),
            maxOutputTokens: 80,
            messages: [{ role: 'user', content: sharePrompt }],
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
          console.warn('Failed to generate share line', error);
        }

        await db
          .update(bouts)
          .set({
            status: 'completed',
            transcript,
            shareLine,
            shareGeneratedAt: shareLine ? new Date() : null,
          })
          .where(eq(bouts.id, boutId));

        if (shareLine) {
          writer.write({ type: 'data-share-line', data: { text: shareLine } });
        }

        if (CREDITS_ENABLED && userId) {
          const actualCost = computeCostGbp(inputTokens, outputTokens, modelId);
          const actualMicro = toMicroCredits(actualCost);
          let delta = actualMicro - preauthMicro;

          // Cap additional charges: never settle more than the user can afford.
          // If actual cost exceeded preauth, charge at most what's available.
          if (delta > 0) {
            const balance = await getCreditBalanceMicro(userId);
            if (balance !== null && delta > balance) {
              delta = Math.max(0, balance);
            }
          }

          if (delta !== 0) {
            await applyCreditDelta(userId, delta, 'settlement', {
              presetId,
              boutId,
              modelId,
              inputTokens,
              outputTokens,
              actualCostGbp: actualCost,
              preauthMicro,
              referenceId: boutId,
              capped: delta !== (actualMicro - preauthMicro),
            });
          }
        }
      } catch (error) {
        await db
          .update(bouts)
          .set({ status: 'error', transcript })
          .where(eq(bouts.id, boutId));

        // Error-path settlement: refund unused preauthorized credits.
        // Unlike the success path, we do NOT cap the delta here -- if the bout
        // errored early, actual usage is likely far below preauth and the user
        // should get the full difference back (delta will be negative = refund).
        if (CREDITS_ENABLED && preauthMicro && userId) {
          const actualCost = computeCostGbp(inputTokens, outputTokens, modelId);
          const actualMicro = toMicroCredits(actualCost);
          const delta = actualMicro - preauthMicro;
          if (delta !== 0) {
            await applyCreditDelta(userId, delta, 'settlement-error', {
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
    },
    onError(error) {
      const message =
        error instanceof Error ? error.message : String(error);
      // Strip potential API key patterns from log output
      const safeMessage = message.replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED]');
      console.error('Bout stream error:', safeMessage);

      // Surface a more descriptive error to the client
      if (message.includes('timeout') || message.includes('DEADLINE')) {
        return 'The bout timed out. Try a shorter length or fewer turns.';
      }
      if (message.includes('rate') || message.includes('429')) {
        return 'API rate limited. Please wait a moment and try again.';
      }
      if (message.includes('overloaded') || message.includes('529')) {
        return 'The model is overloaded. Please try again shortly.';
      }
      return 'The arena short-circuited.';
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
