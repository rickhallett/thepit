// lib/byok.ts
// BYOK (Bring Your Own Key) cookie encoding/decoding.
//
// All BYOK keys are OpenRouter keys (sk-or-v1-*). The cookie encodes
// modelId:||:key. No provider field needed.

import type { cookies } from 'next/headers';

export const BYOK_COOKIE_NAME = 'pit_byok';
export const BYOK_MAX_AGE_SECONDS = 60;

const COOKIE_SEP = ':||:';

/**
 * Encode a BYOK stash cookie value.
 * Format: modelId:||:key
 */
export function encodeByokCookie(key: string, modelId?: string): string {
  return `${modelId ?? ''}${COOKIE_SEP}${key}`;
}

/**
 * Decode a BYOK stash cookie value.
 * Handles new format (modelId:||:key) and legacy format (raw key).
 */
export function decodeByokCookie(
  value: string,
): { modelId: string | undefined; key: string } {
  const sep = value.indexOf(COOKIE_SEP);
  if (sep === -1) return { modelId: undefined, key: value };
  return {
    modelId: value.slice(0, sep) || undefined,
    key: value.slice(sep + COOKIE_SEP.length),
  };
}

/**
 * Read and delete the stashed BYOK key.
 * Returns decoded model and key, or null if no cookie.
 */
export function readAndClearByokKey(
  jar: Awaited<ReturnType<typeof cookies>>,
): { modelId: string | undefined; key: string } | null {
  const cookie = jar.get(BYOK_COOKIE_NAME);
  if (!cookie?.value) return null;
  jar.delete(BYOK_COOKIE_NAME);
  return decodeByokCookie(cookie.value);
}
