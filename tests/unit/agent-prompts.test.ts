import { describe, expect, it } from 'vitest';

import { buildStructuredPrompt } from '@/lib/agent-prompts';

describe('buildStructuredPrompt', () => {
  it('formats structured prompts as XML with trimmed fields', () => {
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

    expect(prompt).toContain('<persona>');
    expect(prompt).toContain('<identity>You are Ada Lovelace, a Visionary.</identity>');
    expect(prompt).toContain('<tone>Analytical</tone>');
    expect(prompt).toContain('<quirk>loves math</quirk>');
    expect(prompt).toContain('<quirk>poetic</quirk>');
    expect(prompt).toContain('<speech-pattern>Speaks in proofs</speech-pattern>');
    expect(prompt).toContain('<opening-move>Start with a theorem</opening-move>');
    expect(prompt).toContain('<signature-move>Unexpected analogy</signature-move>');
    expect(prompt).toContain('<weakness>Overthinks</weakness>');
    expect(prompt).toContain('<goal>Explain the impossible</goal>');
    expect(prompt).toContain('<fears>Being misunderstood</fears>');
    expect(prompt).toContain('<custom-instructions>Avoid modern slang</custom-instructions>');
    expect(prompt).toContain('</persona>');
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

    expect(prompt).toBe(
      '<persona>\n<identity>You are No Frills.</identity>\n</persona>',
    );
  });

  it('escapes user-supplied values in XML output', () => {
    const prompt = buildStructuredPrompt({
      name: 'Bot<script>',
      archetype: 'Evil & dangerous',
    });

    expect(prompt).toContain('Bot&lt;script&gt;');
    expect(prompt).toContain('Evil &amp; dangerous');
    expect(prompt).not.toContain('<script>');
  });
});
