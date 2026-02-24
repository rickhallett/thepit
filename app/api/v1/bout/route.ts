import { timingSafeEqual } from 'crypto';
import { auth } from '@clerk/nextjs/server';

import { log } from '@/lib/logger';
import { validateBoutRequest, executeBout } from '@/lib/bout-engine';
import { scheduleTraceFlush } from '@/lib/langsmith';
import { getUserTier, SUBSCRIPTIONS_ENABLED, TIER_CONFIG } from '@/lib/tier';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { withLogging } from '@/lib/api-logging';
import {
  validateExperimentConfig,
  compilePromptHook,
  compileScriptedTurns,
  type ExperimentConfig,
} from '@/lib/experiment';

export const runtime = 'nodejs';

// Synchronous bouts can take up to 120 seconds for long, multi-turn debates.
export const maxDuration = 120;

/**
 * Verify the X-Research-Key header against the RESEARCH_API_KEY env var.
 * Returns true only if both are present and match (timing-safe).
 */
function verifyResearchKey(req: Request): boolean {
  const researchKey = req.headers.get('x-research-key');
  const expected = process.env.RESEARCH_API_KEY;
  if (!researchKey || !expected) return false;
  const a = Buffer.from(researchKey);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Synchronous REST endpoint for running a bout.
 *
 * Executes the full bout (all turns + share line generation) and returns
 * the completed transcript as JSON. Requires Lab tier subscription.
 *
 * This endpoint shares all validation, tier gating, credit accounting,
 * and execution logic with the streaming POST /api/run-bout endpoint.
 *
 * Optionally accepts an `experimentConfig` in the request body for
 * controlled context-injection experiments. Requires X-Research-Key header.
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

  // Pre-parse request body to extract experimentConfig before validateBoutRequest
  // consumes it. Clone the request so validateBoutRequest gets a fresh body.
  let rawBody: Record<string, unknown>;
  try {
    rawBody = await req.clone().json();
  } catch {
    rawBody = {};
  }

  const rawExperimentConfig = rawBody.experimentConfig;

  // Shared validation (parsing, idempotency, tier, credits, rate limit)
  const validation = await validateBoutRequest(req);

  if (!validation.ok) {
    return validation.error;
  }

  const { context } = validation;

  // ── Experiment config: validate and attach to context ──────────
  // Only accepted when a valid X-Research-Key header is present.
  // Without the research key, experimentConfig is silently ignored
  // to maintain zero regression for normal API usage.
  if (rawExperimentConfig !== undefined) {
    const isResearch = verifyResearchKey(req);
    if (!isResearch) {
      return errorResponse('experimentConfig requires X-Research-Key authentication.', 403);
    }

    const experimentValidation = validateExperimentConfig(
      rawExperimentConfig,
      context.preset.maxTurns,
      context.preset.agents.length,
    );

    if (!experimentValidation.ok) {
      return errorResponse(experimentValidation.error, 400);
    }

    const experimentConfig: ExperimentConfig = experimentValidation.config;

    // Compile declarative config into executable hooks
    const promptHook = compilePromptHook(experimentConfig);
    const scriptedTurns = compileScriptedTurns(experimentConfig);

    if (promptHook) context.promptHook = promptHook;
    if (scriptedTurns) context.scriptedTurns = scriptedTurns;

    log.info('Experiment config attached', {
      boutId: context.boutId,
      hasPromptInjections: !!experimentConfig.promptInjections?.length,
      hasScriptedTurns: !!experimentConfig.scriptedTurns?.length,
    });
  }

  // Schedule LangSmith trace flush after response is sent.
  scheduleTraceFlush();

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
