// Refusal evaluator for LangSmith evaluation pipelines.
//
// Wraps the existing detectRefusal() function from lib/refusal-detection.ts
// into a LangSmith-compatible evaluator that returns scored feedback.
// Runs as a pure function — no LangSmith dependency required.

import { detectRefusal } from '@/lib/refusal-detection';

import type { EvalScore, RefusalEvalInput } from './types';

/**
 * Evaluate whether an agent response contains a refusal (breaking character).
 *
 * Returns score 1 if a refusal is detected, 0 if clean.
 * The comment field contains the matched marker phrase when detected.
 *
 * @example
 * ```ts
 * evaluateRefusal({ text: "I need to step out of character here..." })
 * // { key: 'refusal_detected', score: 1, comment: 'step out of character' }
 *
 * evaluateRefusal({ text: "Your argument is fundamentally flawed..." })
 * // { key: 'refusal_detected', score: 0 }
 * ```
 */
export function evaluateRefusal(input: RefusalEvalInput): EvalScore {
  const marker = detectRefusal(input.text);
  return {
    key: 'refusal_detected',
    score: marker ? 1 : 0,
    comment: marker ?? undefined,
  };
}
