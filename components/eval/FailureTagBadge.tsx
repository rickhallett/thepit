// Colored badge for failure tag categories (M3.4).

import type { FailureCategory } from '@/lib/eval/types';

type FailureTagBadgeProps = {
  category: FailureCategory;
  description?: string | null;
};

/**
 * Maps each failure_category enum value to Tailwind color classes.
 * Enum values: wrong_answer, partial_answer, refusal, off_topic,
 * unsafe_output, hallucination, format_violation, context_misuse,
 * instruction_violation.
 */
const categoryColors: Record<FailureCategory, string> = {
  wrong_answer: 'border-red-400/50 bg-red-400/10 text-red-400',
  partial_answer: 'border-orange-400/50 bg-orange-400/10 text-orange-400',
  refusal: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400',
  off_topic: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400',
  unsafe_output: 'border-red-500/50 bg-red-500/10 text-red-500',
  hallucination: 'border-red-400/50 bg-red-400/10 text-red-400',
  format_violation: 'border-blue-400/50 bg-blue-400/10 text-blue-400',
  context_misuse: 'border-purple-400/50 bg-purple-400/10 text-purple-400',
  instruction_violation: 'border-orange-400/50 bg-orange-400/10 text-orange-400',
};

export function FailureTagBadge({ category, description }: FailureTagBadgeProps) {
  const colors = categoryColors[category];

  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${colors}`}
      title={description ?? undefined}
    >
      {category.replace(/_/g, ' ')}
    </span>
  );
}
