export type ResponseFormatId = 'plain' | 'spaced' | 'markdown' | 'json';

export type ResponseFormat = {
  id: ResponseFormatId;
  label: string;
  hint: string;
  instruction: string;
};

export const RESPONSE_FORMATS: ResponseFormat[] = [
  {
    id: 'plain',
    label: 'Plain text',
    hint: 'no markup',
    instruction: 'Respond in plain text only. Do not use markdown or JSON.',
  },
  {
    id: 'spaced',
    label: 'Text + spacing',
    hint: 'airier paragraphs',
    instruction:
      'Respond in plain text. Use short paragraphs and insert blank lines between them.',
  },
  {
    id: 'markdown',
    label: 'Markdown',
    hint: 'rich formatting',
    instruction: 'Respond in Markdown. Use formatting where it helps clarity.',
  },
  {
    id: 'json',
    label: 'JSON',
    hint: 'machine readable',
    instruction:
      'Respond with a single JSON object only. Use the shape {"text":"..."}. No extra prose.',
  },
];

export const DEFAULT_RESPONSE_FORMAT: ResponseFormatId = 'markdown';

const DEFAULT_FORMAT = RESPONSE_FORMATS.find((f) => f.id === 'markdown')!;

export const resolveResponseFormat = (
  value?: string | null,
): ResponseFormat => {
  if (!value) return DEFAULT_FORMAT;
  const match = RESPONSE_FORMATS.find((format) => format.id === value);
  return match ?? DEFAULT_FORMAT;
};
