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
import { ALL_PRESETS } from '@/lib/presets';
import { resolveResponseLength } from '@/lib/response-lengths';
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
  };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const { boutId } = payload;
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
  const lengthConfig = resolveResponseLength(payload.length);
  let { presetId } = payload;

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

  const preset = ALL_PRESETS.find((item) => item.id === presetId);
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
  if (preset.tier === 'premium' && premiumEnabled) {
    modelId = PREMIUM_MODEL_OPTIONS.includes(requestedModel)
      ? requestedModel
      : DEFAULT_PREMIUM_MODEL_ID;
  } else if (requestedModel === 'byok' && BYOK_ENABLED) {
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

      try {
        await db
          .update(bouts)
          .set({ status: 'running' })
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
              color: agent.color,
            },
          });
          writer.write({ type: 'text-start', id: turnId });

          const topicLine = topic ? `Topic: ${topic}\n\n` : '';
          const lengthLine = `Response length: ${lengthConfig.label} (${lengthConfig.hint}).\n\n`;
          const prompt =
            history.length > 0
              ? `${topicLine}${lengthLine}Transcript so far:\n${history.join('\n')}\n\nRespond in character as ${agent.name}.`
              : `${topicLine}${lengthLine}Open the debate in character as ${agent.name}.`;
          inputTokens += estimateTokensFromText(agent.systemPrompt, 1);
          inputTokens += estimateTokensFromText(prompt, 1);

          const result = streamText({
            model: getModel(modelId),
            maxOutputTokens: lengthConfig.maxOutputTokens,
            messages: [
              { role: 'system', content: agent.systemPrompt },
              { role: 'user', content: prompt },
            ],
          });

          let fullText = '';
          for await (const delta of result.textStream) {
            fullText += delta;
            outputTokens += estimateTokensFromText(delta, 0);
            writer.write({ type: 'text-delta', id: turnId, delta });
          }

          writer.write({ type: 'text-end', id: turnId });

          history.push(`${agent.name}: ${fullText}`);

          transcript.push({
            turn: i,
            agentId: agent.id,
            agentName: agent.name,
            text: fullText,
          });
        }

        await db
          .update(bouts)
          .set({ status: 'completed', transcript })
          .where(eq(bouts.id, boutId));

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
