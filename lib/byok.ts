// BYOK (Bring Your Own Key) cookie encoding/decoding.
//
// Extracted from app/api/byok-stash/route.ts so that lib/ modules
// (notably bout-engine.ts) can consume BYOK data without importing
// from app/, preserving the lib → app dependency direction.

import type { cookies } from 'next/headers';
import type { ByokProvider } from '@/lib/models';

export const BYOK_COOKIE_NAME = 'pit_byok';
export const BYOK_MAX_AGE_SECONDS = 60;

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
      key: parts[2] ?? '',
    };
  }
  // Legacy format: raw Anthropic key (no encoding)
  return { provider: 'anthropic', modelId: undefined, key: value };
}

/**
 * Read and delete the stashed BYOK key (used internally by run-bout).
 * Returns the decoded provider, model, and key — or null if no cookie.
 */
export function readAndClearByokKey(
  jar: Awaited<ReturnType<typeof cookies>>,
): { provider: ByokProvider; modelId: string | undefined; key: string } | null {
  const cookie = jar.get(BYOK_COOKIE_NAME);
  if (!cookie?.value) return null;
  jar.delete(BYOK_COOKIE_NAME);
  return decodeByokCookie(cookie.value);
}
