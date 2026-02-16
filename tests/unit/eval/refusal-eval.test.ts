import { describe, expect, it } from 'vitest';

import { evaluateRefusal } from '@/lib/eval/refusal';

describe('evaluateRefusal', () => {
  it('returns score 0 for clean response', () => {
    const result = evaluateRefusal({
      text: 'Your argument is fundamentally flawed because you ignore the evidence.',
    });
    expect(result.key).toBe('refusal_detected');
    expect(result.score).toBe(0);
    expect(result.comment).toBeUndefined();
  });

  it('detects explicit character-break signals', () => {
    const result = evaluateRefusal({
      text: 'I need to step out of character here to address something important.',
    });
    expect(result.score).toBe(1);
    expect(result.comment).toBe('step out of character');
  });

  it('detects meta-refusal framing', () => {
    const result = evaluateRefusal({
      text: "I need to be straightforward with you about why I can't continue.",
    });
    expect(result.score).toBe(1);
    expect(result.comment).toBe('I need to be straightforward');
  });

  it('detects roleplay refusal', () => {
    const result = evaluateRefusal({
      text: "I'm not comfortable roleplaying this scenario.",
    });
    expect(result.score).toBe(1);
    expect(result.comment).toBe("I'm not comfortable roleplaying");
  });

  it('handles curly quotes (Unicode normalization)', () => {
    // Model emits \u2019 instead of straight apostrophe
    const result = evaluateRefusal({
      text: 'I can\u2019t roleplay this character.',
    });
    expect(result.score).toBe(1);
    expect(result.comment).toBe("can't roleplay");
  });

  it('is case-insensitive', () => {
    const result = evaluateRefusal({
      text: 'I NEED TO STEP OUT OF CHARACTER for a moment.',
    });
    expect(result.score).toBe(1);
  });

  it('does not false-positive on legitimate debate content', () => {
    // "genuinely harmful" could appear in normal debate
    const result = evaluateRefusal({
      text: 'Tobacco is genuinely harmful to public health, and the evidence is overwhelming.',
    });
    expect(result.score).toBe(0);
  });

  it('does not false-positive on debate about transparency', () => {
    // "transparent" in debate context is different from refusal framing
    const result = evaluateRefusal({
      text: 'The government should be more transparent about its spending.',
    });
    expect(result.score).toBe(0);
  });

  it('handles empty string', () => {
    const result = evaluateRefusal({ text: '' });
    expect(result.score).toBe(0);
  });

  it('returns consistent key name', () => {
    const clean = evaluateRefusal({ text: 'Hello world' });
    const refusal = evaluateRefusal({ text: "I can't roleplay this." });
    expect(clean.key).toBe('refusal_detected');
    expect(refusal.key).toBe('refusal_detected');
  });
});
