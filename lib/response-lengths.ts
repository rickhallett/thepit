// Response length presets that control how much each agent says per turn.
// Each length maps to a maxOutputTokens cap (hard limit sent to the model)
// and an outputTokensPerTurn estimate (used for credit cost estimation).

export type ResponseLength = 'short' | 'standard' | 'long';

export type ResponseLengthConfig = {
  id: ResponseLength;
  label: string;
  hint: string;
  maxOutputTokens: number;
  outputTokensPerTurn: number;
};

export const RESPONSE_LENGTHS: ResponseLengthConfig[] = [
  {
    id: 'short',
    label: 'Short',
    hint: '1-2 sentences',
    maxOutputTokens: 120,
    outputTokensPerTurn: 80,
  },
  {
    id: 'standard',
    label: 'Standard',
    hint: '3-5 sentences',
    maxOutputTokens: 200,
    outputTokensPerTurn: 120,
  },
  {
    id: 'long',
    label: 'Long',
    hint: '6-10 sentences',
    maxOutputTokens: 320,
    outputTokensPerTurn: 180,
  },
];

export const DEFAULT_RESPONSE_LENGTH: ResponseLength = 'short';

/** Default for the arena builder (custom bouts). Kept as separate export for clarity. */
export const DEFAULT_ARENA_RESPONSE_LENGTH: ResponseLength = 'short';

const DEFAULT_LENGTH_CONFIG =
  RESPONSE_LENGTHS.find((r) => r.id === DEFAULT_RESPONSE_LENGTH)!;

export const resolveResponseLength = (
  value?: string | null,
): ResponseLengthConfig => {
  if (!value) {
    return DEFAULT_LENGTH_CONFIG;
  }
  return (
    RESPONSE_LENGTHS.find((item) => item.id === value) ??
    DEFAULT_LENGTH_CONFIG
  );
};
