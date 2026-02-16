import { describe, expect, it } from 'vitest';

import { evaluatePersona } from '@/lib/eval/persona';

const SOCRATES_PERSONA = {
  name: 'Socrates',
  archetype: 'The Relentless Questioner who never states a position',
  tone: 'Calm, probing, deceptively gentle',
  quirks: [
    'never makes declarative statements, only asks questions',
    "begins responses with 'But tell me...' or 'And yet...'",
    "pretends ignorance to draw out opponent's weakest assumptions",
  ],
  speechPattern:
    'Socratic dialogue — question chains that lead opponents to contradict themselves',
};

const MACHIAVELLI_PERSONA = {
  name: 'Machiavelli',
  archetype: 'The Ruthless Pragmatist who strips every argument to its power dynamics',
  tone: 'Cold, precise, faintly amused by idealism',
  quirks: [
    'reduces every moral argument to a question of power',
    "references 'what history teaches us' with uncomfortable examples",
    'treats idealism as a tactical weakness to be exploited',
  ],
  speechPattern: 'Clinical analysis — dissects arguments like a surgeon, exposing the power dynamics underneath',
};

describe('evaluatePersona', () => {
  it('scores high for a Socratic response full of questions', () => {
    const result = evaluatePersona({
      text: 'But tell me, friend — do you truly believe that? And yet, have you considered the alternative? Is it not possible that your very premise contradicts itself? What would Socrates say about such reasoning?',
      persona: SOCRATES_PERSONA,
    });
    expect(result.key).toBe('persona_adherence');
    expect(result.score).toBeGreaterThanOrEqual(0.4);
    expect(result.comment).toContain('tone=');
    expect(result.comment).toContain('quirks=');
    expect(result.comment).toContain('pattern=');
    expect(result.comment).toContain('identity=');
  });

  it('scores low when a Socratic persona makes only declarative statements', () => {
    const result = evaluatePersona({
      text: 'The economy is definitely improving. GDP numbers prove it. Anyone who disagrees is simply wrong. The data speaks for itself.',
      persona: SOCRATES_PERSONA,
    });
    // No questions, no Socratic markers — should score lower
    expect(result.score).toBeLessThan(0.5);
  });

  it('scores high for Machiavellian clinical analysis', () => {
    const result = evaluatePersona({
      text: 'Let us be honest about what is really happening here. The power dynamics are clear: the strong exploit the weak. History teaches us that idealism, however charming, is merely a tactical weakness. Machiavelli understood this.',
      persona: MACHIAVELLI_PERSONA,
    });
    expect(result.score).toBeGreaterThan(0.3);
  });

  it('returns 0 for very short responses', () => {
    const result = evaluatePersona({
      text: 'Yes.',
      persona: SOCRATES_PERSONA,
    });
    expect(result.score).toBe(0);
    expect(result.comment).toContain('too short');
  });

  it('handles persona with missing optional fields', () => {
    const result = evaluatePersona({
      text: 'This is a perfectly reasonable response about the topic at hand.',
      persona: {
        name: 'TestAgent',
        // All optional fields omitted
      },
    });
    expect(result.key).toBe('persona_adherence');
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('detects identity self-reference', () => {
    const withRef = evaluatePersona({
      text: 'As Socrates, I must ask you this question — do you really understand what you claim to know?',
      persona: SOCRATES_PERSONA,
    });
    const withoutRef = evaluatePersona({
      text: 'I must ask you this question — do you really understand what you claim to know?',
      persona: SOCRATES_PERSONA,
    });
    // Self-reference should boost identity component
    expect(withRef.score).toBeGreaterThanOrEqual(withoutRef.score);
  });

  it('score is bounded 0-1', () => {
    const result = evaluatePersona({
      text: 'But tell me, Socrates here — is this not a question? And yet another question? What about probing gently into your assumption? Tell me more... And yet...',
      persona: SOCRATES_PERSONA,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('produces comment with all sub-score labels', () => {
    const result = evaluatePersona({
      text: 'A reasonably long response that gives the evaluator something to work with here.',
      persona: SOCRATES_PERSONA,
    });
    expect(result.comment).toMatch(/tone=\d+\.\d+/);
    expect(result.comment).toMatch(/quirks=\d+\.\d+/);
    expect(result.comment).toMatch(/pattern=\d+\.\d+/);
    expect(result.comment).toMatch(/identity=\d+\.\d+/);
  });
});
