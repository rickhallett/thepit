// Turn count options for arena-mode bouts.
// Follows the same pattern as response-lengths.ts / response-formats.ts.

export type TurnOption = {
  id: number;
  label: string;
  hint: string;
};

/** Allowed turn counts for the arena builder. */
export const TURN_OPTIONS: TurnOption[] = [
  { id: 4, label: '4 turns', hint: 'Quick clash' },
  { id: 6, label: '6 turns', hint: 'Standard debate' },
  { id: 8, label: '8 turns', hint: 'Deep dive' },
  { id: 10, label: '10 turns', hint: 'Extended bout' },
  { id: 12, label: '12 turns', hint: 'Full battle' },
];

export const MIN_TURNS = 4;
export const MAX_TURNS = 12;

/** Default turn count for arena-mode bouts. */
export const DEFAULT_ARENA_TURNS = 6;

/**
 * Resolve a user-supplied turn count to a valid value.
 * Returns the number if it's within the allowed TURN_OPTIONS, otherwise the default.
 */
export const resolveTurns = (value?: string | number | null): number => {
  if (value == null) return DEFAULT_ARENA_TURNS;
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (Number.isNaN(num)) return DEFAULT_ARENA_TURNS;
  const option = TURN_OPTIONS.find((opt) => opt.id === num);
  return option ? option.id : DEFAULT_ARENA_TURNS;
};
