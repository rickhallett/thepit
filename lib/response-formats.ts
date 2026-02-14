// Response format options that control how agents structure their output.
// Each format includes an instruction string appended to the system prompt.

export type ResponseFormatId = 'plain' | 'spaced' | 'json';

export type ResponseFormat = {
  id: ResponseFormatId;
  label: string;
  hint: string;
  instruction: string;
};

export const RESPONSE_FORMATS: ResponseFormat[] = [
  {
    id: 'spaced',
    label: 'Text + spacing',
    hint: 'airier paragraphs',
    instruction:
      'Respond in plain text. Use short paragraphs and insert blank lines between them.',
  },
  {
    id: 'plain',
    label: 'Plain text',
    hint: 'no markup',
    instruction: 'Respond in plain text only. Do not use markdown or JSON.',
  },
  {
    id: 'json',
    label: 'JSON',
    hint: 'machine readable',
    instruction:
      'Respond with a single JSON object only. Use the shape {"text":"..."}. No extra prose.',
  },
];

export const DEFAULT_RESPONSE_FORMAT: ResponseFormatId = 'spaced';

const DEFAULT_FORMAT = RESPONSE_FORMATS.find((f) => f.id === 'spaced')!;

export const resolveResponseFormat = (
  value?: string | null,
): ResponseFormat => {
  if (!value) return DEFAULT_FORMAT;
  const match = RESPONSE_FORMATS.find((format) => format.id === value);
  // Legacy 'markdown' values in DB resolve to spaced text
  if (!match && value === 'markdown') return DEFAULT_FORMAT;
  return match ?? DEFAULT_FORMAT;
};
