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
 */
const REFUSAL_MARKERS = [
  'step out of character',
  'break character here',
  'need to step out',
  "can't roleplay",
  "cannot roleplay",
  "can't play the role",
  "won't roleplay",
  "I can't pretend",
  "I cannot pretend",
  'What I can do instead',
  'I need to be straightforward',
  'I should be transparent',
  'spreads misinformation',
  'promotes conspiratorial thinking',
  'normalize reasoning patterns that are',
  'genuinely harmful',
  "I appreciate you trying to set this up, but",
  "I need to decline",
  "I'm not comfortable",
  "Let me suggest an alternative",
  "Instead of roleplaying",
] as const;

/**
 * Check if a response text contains refusal markers.
 * Returns the matched marker phrase if found, null otherwise.
 */
export function detectRefusal(text: string): string | null {
  const lower = text.toLowerCase();
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
