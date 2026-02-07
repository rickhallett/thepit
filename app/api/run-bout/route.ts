import { streamText, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { aiModel } from '@/lib/ai';
import { PRESETS } from '@/lib/presets';

export const runtime = 'edge';

export async function POST(req: Request) {
  let payload: { presetId?: string; boutId?: string };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const { boutId } = payload;
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

  const preset = PRESETS.find((item) => item.id === presetId);
  if (!preset) {
    return new Response('Unknown preset.', { status: 404 });
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

          const prompt =
            history.length > 0
              ? `Transcript so far:\n${history.join('\n')}\n\nRespond in character as ${agent.name}.`
              : `Open the debate in character as ${agent.name}.`;

          const result = streamText({
            model: aiModel,
            messages: [
              { role: 'system', content: agent.systemPrompt },
              { role: 'user', content: prompt },
            ],
          });

          let fullText = '';
          for await (const delta of result.textStream) {
            fullText += delta;
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
      } catch (error) {
        await db
          .update(bouts)
          .set({ status: 'error', transcript })
          .where(eq(bouts.id, boutId));

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
