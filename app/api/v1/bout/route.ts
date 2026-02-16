import { auth } from '@clerk/nextjs/server';

import { log } from '@/lib/logger';
import { validateBoutRequest, executeBout } from '@/lib/bout-engine';
import { getUserTier, SUBSCRIPTIONS_ENABLED, TIER_CONFIG } from '@/lib/tier';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { withLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

// Synchronous bouts can take up to 120 seconds for long, multi-turn debates.
export const maxDuration = 120;

/**
 * Synchronous REST endpoint for running a bout.
 *
 * Executes the full bout (all turns + share line generation) and returns
 * the completed transcript as JSON. Requires Lab tier subscription.
 *
 * This endpoint shares all validation, tier gating, credit accounting,
 * and execution logic with the streaming POST /api/run-bout endpoint.
 */
async function rawPOST(req: Request) {
  // Lab tier gate: check before running validation (which may consume credits)
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  if (SUBSCRIPTIONS_ENABLED) {
    const tier = await getUserTier(userId);
    if (!TIER_CONFIG[tier].apiAccess) {
      return errorResponse('API access requires a Pit Lab subscription.', 403);
    }
  }

  // Shared validation (parsing, idempotency, tier, credits, rate limit)
  const validation = await validateBoutRequest(req);

  if ('error' in validation) {
    return validation.error;
  }

  const { context } = validation;

  try {
    const result = await executeBout(context);

    return Response.json({
      boutId: context.boutId,
      status: 'completed',
      transcript: result.transcript,
      shareLine: result.shareLine,
      agents: context.preset.agents.map((a) => ({
        id: a.id,
        name: a.name,
      })),
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Sync bout failed', error instanceof Error ? error : new Error(message), {
      boutId: context.boutId,
    });

    if (message.includes('timeout') || message.includes('DEADLINE')) {
      return errorResponse('The bout timed out. Try a shorter length or fewer turns.', 504);
    }
    if (message.includes('rate') || message.includes('429')) {
      return errorResponse('API rate limited. Please wait a moment and try again.', 429);
    }
    if (message.includes('overloaded') || message.includes('529')) {
      return errorResponse('The model is overloaded. Please try again shortly.', 503);
    }

    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}

export const POST = withLogging(rawPOST, 'v1-bout');
