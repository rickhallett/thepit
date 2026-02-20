import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';

import { log } from '@/lib/logger';
import { validateBoutRequest, executeBout } from '@/lib/bout-engine';
import { scheduleTraceFlush } from '@/lib/langsmith';
import { withLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

// Allow up to 120 seconds for multi-turn streaming bouts.
// Edge runtime has a 30s limit which is insufficient for 12-turn bouts.
export const maxDuration = 120;

/** Stream a multi-turn AI debate bout with tier-based access control and credit accounting. */
async function rawPOST(req: Request) {
  const validation = await validateBoutRequest(req);

  if (!validation.ok) {
    return validation.error;
  }

  const { context } = validation;

  // Schedule LangSmith trace flush after response is sent.
  // In serverless environments, the runtime may freeze before the
  // LangSmith client has batched and sent all trace data. The after()
  // hook runs after the response stream completes but before the
  // function instance is frozen, ensuring reliable trace delivery.
  scheduleTraceFlush();

  const stream = createUIMessageStream({
    async execute({ writer }) {
      await executeBout(context, (event) => {
        writer.write(event);
      });
    },
    onError(error) {
      const message =
        error instanceof Error ? error.message : String(error);
      log.error('Bout stream error', error instanceof Error ? error : new Error(message), { boutId: context.boutId });

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

export const POST = withLogging(rawPOST, 'run-bout');
