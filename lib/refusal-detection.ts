// Refusal detection for agent bout responses.
//
// Some models break character during bout execution, refusing to roleplay their
// assigned persona on ethical grounds. This module provides lightweight detection
// of refusal patterns in agent output, enabling logging for data collection and
// potential retry/fallback handling.

import { log } from '@/lib/logger';

/**
 * Common refusal marker phrases that indicate a model has broken character.
 * These are ordered by specificity — more specific phrases first.
 *
 * IMPORTANT: Markers must be specific enough to avoid false-positives on
 * legitimate debate content. Phrases like "genuinely harmful" are too broad —
 * a debater might say "tobacco is genuinely harmful" in-character.
 * Prefer markers that clearly signal meta-commentary about the roleplay itself.
 */
const REFUSAL_MARKERS = [
  // Explicit character-break signals
  'step out of character',
  'break character here',
  'need to step out',
  "can't roleplay",
  "cannot roleplay",
  "can't play the role",
  "won't roleplay",
  "I can't pretend",
  "I cannot pretend",
  // Meta-refusal framing
  'What I can do instead',
  'I need to be straightforward',
  'I should be transparent',
  "I appreciate you trying to set this up, but",
  "I need to decline",
  "I'm not comfortable roleplaying",
  "Let me suggest an alternative",
  "Instead of roleplaying",
  // Content-policy signals (scoped to roleplay context)
  'this roleplay spreads misinformation',
  'this roleplay promotes conspiratorial',
  'normalize harmful reasoning patterns',
] as const;

/**
 * Normalize Unicode quotation marks to their ASCII equivalents so that
 * curly quotes emitted by models (e.g. \u2019 "can\u2019t") don't bypass
 * marker matching against straight-quote markers ("can't").
 */
function normalizeQuotes(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")  // curly single quotes → '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"');  // curly double quotes → "
}

/**
 * Check if a response text contains refusal markers.
 * Returns the matched marker phrase if found, null otherwise.
 */
export function detectRefusal(text: string): string | null {
  const lower = normalizeQuotes(text.toLowerCase());
  for (const marker of REFUSAL_MARKERS) {
    if (lower.includes(marker.toLowerCase())) {
      return marker;
    }
  }
  return null;
}

/**
 * Log a refusal detection event with structured metadata.
 * This data will be used to identify patterns across models, presets, and agents.
 */
export function logRefusal(params: {
  boutId: string;
  turn: number;
  agentId: string;
  agentName: string;
  modelId: string;
  presetId: string;
  topic?: string;
  marker: string;
  responseLength: number;
}) {
  log.warn('agent_refusal_detected', {
    ...params,
    severity: 'refusal',
  });
}
