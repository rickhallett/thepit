import { describe, expect, it } from 'vitest';

import { buildStructuredPrompt } from '@/lib/agent-prompts';

describe('buildStructuredPrompt', () => {
  it('formats structured prompts with trimmed fields', () => {
    const prompt = buildStructuredPrompt({
      name: 'Ada Lovelace',
      archetype: '  Visionary  ',
      tone: '  Analytical ',
      quirks: [' loves math ', '  ', 'poetic'],
      speechPattern: ' Speaks in proofs ',
      openingMove: ' Start with a theorem ',
      signatureMove: ' Unexpected analogy ',
      weakness: ' Overthinks ',
      goal: ' Explain the impossible ',
      fears: ' Being misunderstood ',
      customInstructions: ' Avoid modern slang ',
    });

    expect(prompt).toBe(
      [
        'You are Ada Lovelace, a Visionary.',
        'Tone: Analytical',
        'Quirks: loves math, poetic',
        'Speech pattern: Speaks in proofs',
        'Opening move: Start with a theorem',
        'Signature move: Unexpected analogy',
        'Weakness: Overthinks',
        'Goal: Explain the impossible',
        'Fears: Being misunderstood',
        'Additional instructions: Avoid modern slang',
      ].join('\n'),
    );
  });

  it('skips optional lines when fields are empty', () => {
    const prompt = buildStructuredPrompt({
      name: 'No Frills',
      archetype: null,
      tone: '   ',
      quirks: [],
      speechPattern: undefined,
      openingMove: undefined,
      signatureMove: undefined,
      weakness: undefined,
      goal: undefined,
      fears: undefined,
      customInstructions: undefined,
    });

    expect(prompt).toBe('You are No Frills.');
  });
});
