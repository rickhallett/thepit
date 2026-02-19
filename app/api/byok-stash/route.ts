import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit } from '@/lib/rate-limit';
import { errorResponse, parseJsonBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { isValidByokKey, detectProvider, isOpenRouterModel, ALL_MODEL_IDS } from '@/lib/models';
import type { ByokProvider } from '@/lib/models';
import { getUserTier, SUBSCRIPTIONS_ENABLED } from '@/lib/tier';

export const runtime = 'nodejs';

const COOKIE_NAME = 'pit_byok';
const MAX_AGE_SECONDS = 60;
const KEY_MAX_LENGTH = 256;
const RATE_LIMIT = { name: 'byok-stash', maxRequests: 10, windowMs: 60_000 };

// ---------------------------------------------------------------------------
// Cookie encoding: provider:model:key
// ---------------------------------------------------------------------------

/** Separator used to encode provider + model + key in the cookie value. */
const COOKIE_SEP = ':||:';

/**
 * Encode a BYOK stash cookie value.
 * Format: provider:||:modelId:||:key (or just the raw key for backward compat).
 */
export function encodeByokCookie(
  provider: ByokProvider,
  key: string,
  modelId?: string,
): string {
  return `${provider}${COOKIE_SEP}${modelId ?? ''}${COOKIE_SEP}${key}`;
}

/**
 * Decode a BYOK stash cookie value.
 * Handles both new format (provider:||:model:||:key) and legacy format (raw key).
 */
export function decodeByokCookie(
  value: string,
): { provider: ByokProvider; modelId: string | undefined; key: string } {
  const parts = value.split(COOKIE_SEP);
  if (parts.length === 3) {
    return {
      provider: parts[0] as ByokProvider,
      modelId: parts[1] || undefined,
      key: parts[2],
    };
  }
  // Legacy format: raw Anthropic key (no encoding)
  return { provider: 'anthropic', modelId: undefined, key: value };
}

/**
 * Stash a BYOK key in a short-lived, HTTP-only cookie.
 * The key is read once by /api/run-bout and then deleted.
 * This eliminates the sessionStorage XSS window entirely.
 * Requires authentication to prevent cookie jar pollution.
 *
 * Accepts keys from:
 *   - Anthropic: sk-ant-*
 *   - OpenRouter: sk-or-v1-*
 *
 * When an OpenRouter key is submitted, an optional `model` field selects
 * the OpenRouter model ID (e.g. 'openai/gpt-4o'). If omitted, the
 * default curated model is used.
 */
export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  // BYOK is a subscriber-only feature
  if (SUBSCRIPTIONS_ENABLED) {
    const tier = await getUserTier(userId);
    if (tier === 'free') {
      return errorResponse(
        'BYOK is available to subscribers only. Upgrade to Pit Pass or Pit Lab.',
        403,
      );
    }
  }

  const rateCheck = checkRateLimit(RATE_LIMIT, userId);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseJsonBody<{ key?: string; model?: string }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const key = typeof payload.key === 'string' ? payload.key.trim() : '';
  if (!key) {
    return errorResponse('Missing key.', 400);
  }

  if (key.length > KEY_MAX_LENGTH) {
    return errorResponse('Key too long.', 400);
  }

  if (!isValidByokKey(key)) {
    return errorResponse('Invalid key format. Expected sk-ant-* (Anthropic) or sk-or-v1-* (OpenRouter).', 400);
  }

  const provider = detectProvider(key)!;

  // Validate model selection against curated list for each provider
  const model = typeof payload.model === 'string' ? payload.model.trim() : undefined;
  if (model) {
    if (provider === 'openrouter' && !isOpenRouterModel(model)) {
      return errorResponse('Unsupported OpenRouter model.', 400);
    }
    if (provider === 'anthropic' && !ALL_MODEL_IDS.includes(model as typeof ALL_MODEL_IDS[number])) {
      return errorResponse('Unsupported Anthropic model.', 400);
    }
  }

  // Encode provider + model + key into cookie value
  const cookieValue = encodeByokCookie(provider, key, model);

  const jar = await cookies();
  jar.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/run-bout',
    maxAge: MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true, provider });
}, 'byok-stash');

/**
 * Read and delete the stashed BYOK key (used internally by run-bout).
 * Returns the decoded provider, model, and key — or null if no cookie.
 */
export function readAndClearByokKey(
  jar: Awaited<ReturnType<typeof cookies>>,
): { provider: ByokProvider; modelId: string | undefined; key: string } | null {
  const cookie = jar.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  jar.delete(COOKIE_NAME);
  return decodeByokCookie(cookie.value);
}
