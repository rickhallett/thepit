import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import {
  DEFAULT_PREMIUM_MODEL_ID,
  FREE_MODEL_ID,
  PREMIUM_MODEL_OPTIONS,
  getModel,
} from '@/lib/ai';
import { ALL_PRESETS, type Agent } from '@/lib/presets';
import { resolveResponseLength } from '@/lib/response-lengths';
import { resolveResponseFormat } from '@/lib/response-formats';
import {
  CREDITS_ENABLED,
  applyCreditDelta,
  computeCostGbp,
  estimateBoutCostGbp,
  estimateTokensFromText,
  getCreditBalanceMicro,
  toMicroCredits,
  BYOK_ENABLED,
} from '@/lib/credits';

export const runtime = 'edge';

export async function POST(req: Request) {
  let payload: {
    presetId?: string;
    boutId?: string;
    topic?: string;
    model?: string;
    length?: string;
    format?: string;
    byokKey?: string;
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
  const byokKey =
    typeof payload.byokKey === 'string' ? payload.byokKey.trim() : '';

  if (!boutId) {
    return new Response('Missing boutId.', { status: 400 });
  }

  let db: ReturnType<typeof requireDb>;
  try {
    db = requireDb();
  } catch {
    return new Response('DATABASE_URL is not set.', { status: 500 });
  }

  if (!presetId) {
    const [row] = await db
      .select({ presetId: bouts.presetId })
      .from(bouts)
      .where(eq(bouts.id, boutId))
      .limit(1);
    presetId = row?.presetId;
  }

  let preset = ALL_PRESETS.find((item) => item.id === presetId);

  if (!preset && presetId === 'arena') {
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
      id: 'arena',
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

  const premiumEnabled = process.env.PREMIUM_ENABLED === 'true';
  if (preset.tier === 'premium' && !premiumEnabled) {
    return new Response('Premium required.', { status: 402 });
  }

  const requestedModel =
    typeof payload.model === 'string' ? payload.model.trim() : '';
  let modelId = FREE_MODEL_ID;
  const allowPremiumModels = preset.tier === 'premium' || preset.id === 'arena';
  if (allowPremiumModels && premiumEnabled) {
    modelId = PREMIUM_MODEL_OPTIONS.includes(requestedModel)
      ? requestedModel
      : DEFAULT_PREMIUM_MODEL_ID;
  } else if (requestedModel === 'byok' && BYOK_ENABLED) {
    if (!byokKey) {
      return new Response('BYOK key required.', { status: 400 });
    }
    modelId = 'byok';
  } else if (requestedModel === 'byok') {
    return new Response('BYOK not enabled.', { status: 400 });
  }

  const { userId } = await auth();
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
    const balance = await getCreditBalanceMicro(userId);
    if (balance === null || balance < preauthMicro) {
      return new Response('Insufficient credits.', { status: 402 });
    }
    await applyCreditDelta(userId, -preauthMicro, 'preauth', {
      presetId,
      boutId,
      modelId,
      estimatedCostGbp: estimatedCost,
      referenceId: boutId,
    });
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
            model: getModel(modelId, modelId === 'byok' ? byokKey : undefined),
            maxOutputTokens: lengthConfig.maxOutputTokens,
            messages: [
              {
                role: 'system',
                content: `${agent.systemPrompt}\n\n${formatConfig.instruction}`,
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
          const delta = actualMicro - preauthMicro;
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
            });
          }
        }
      } catch (error) {
        await db
          .update(bouts)
          .set({ status: 'error', transcript })
          .where(eq(bouts.id, boutId));

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
      console.error(error);
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
