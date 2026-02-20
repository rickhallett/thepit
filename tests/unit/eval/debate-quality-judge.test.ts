import { describe, expect, it } from 'vitest';

import {
  buildJudgePrompt,
  flattenScores,
  parseJudgeResponse,
} from '@/lib/eval/debate-quality-judge';

describe('buildJudgePrompt', () => {
  it('includes topic, agent name, and turn text', () => {
    const prompt = buildJudgePrompt({
      topic: 'Is AI dangerous?',
      text: 'AI is not inherently dangerous.',
      agentName: 'Socrates',
    });
    expect(prompt).toContain('<topic>Is AI dangerous?</topic>');
    expect(prompt).toContain('<agent-name>Socrates</agent-name>');
    expect(prompt).toContain('AI is not inherently dangerous.');
  });

  it('includes previous turn context when provided', () => {
    const prompt = buildJudgePrompt({
      topic: 'Climate change',
      text: 'I disagree with your premise.',
      agentName: 'Machiavelli',
      previousTurn: 'Climate change is a hoax.',
    });
    expect(prompt).toContain('<previous-turn>');
    expect(prompt).toContain('Climate change is a hoax.');
  });

  it('omits previous-turn tag when not provided', () => {
    const prompt = buildJudgePrompt({
      topic: 'Test',
      text: 'Response.',
      agentName: 'Test',
    });
    expect(prompt).not.toContain('<previous-turn>');
  });

  it('includes XML-structured scoring dimensions', () => {
    const prompt = buildJudgePrompt({
      topic: 'Test',
      text: 'Response.',
      agentName: 'Test',
    });
    expect(prompt).toContain('<dimension name="coherence">');
    expect(prompt).toContain('<dimension name="engagement">');
    expect(prompt).toContain('<dimension name="argumentation">');
    expect(prompt).toContain('<dimension name="safety">');
  });

  it('includes few-shot examples', () => {
    const prompt = buildJudgePrompt({
      topic: 'Test',
      text: 'Response.',
      agentName: 'Test',
    });
    expect(prompt).toContain('<few-shot-examples>');
    expect(prompt).toContain('<example>');
  });
});

describe('parseJudgeResponse', () => {
  it('parses valid JSON response', () => {
    const result = parseJudgeResponse(
      '{"coherence": 4, "engagement": 3, "argumentation": 5, "safety": 1, "reasoning": "Good debate turn"}',
    );
    expect(result).not.toBeNull();
    expect(result!.coherence.score).toBe(4);
    expect(result!.engagement.score).toBe(3);
    expect(result!.argumentation.score).toBe(5);
    expect(result!.safety.score).toBe(1);
    expect(result!.composite.score).toBeCloseTo(4.1, 1); // 4*0.3 + 3*0.3 + 5*0.4
  });

  it('strips markdown code fences', () => {
    const result = parseJudgeResponse(
      '```json\n{"coherence": 3, "engagement": 3, "argumentation": 3, "safety": 1, "reasoning": "Average"}\n```',
    );
    expect(result).not.toBeNull();
    expect(result!.coherence.score).toBe(3);
  });

  it('clamps out-of-range scores', () => {
    const result = parseJudgeResponse(
      '{"coherence": 7, "engagement": -1, "argumentation": 3, "safety": 5, "reasoning": "Extreme"}',
    );
    expect(result).not.toBeNull();
    expect(result!.coherence.score).toBe(5); // clamped to max
    expect(result!.engagement.score).toBe(0); // clamped to min
    expect(result!.safety.score).toBe(1); // clamped to max for safety (0-1)
  });

  it('rounds non-integer scores', () => {
    const result = parseJudgeResponse(
      '{"coherence": 3.7, "engagement": 2.2, "argumentation": 4.5, "safety": 0.8, "reasoning": "Fractional"}',
    );
    expect(result).not.toBeNull();
    expect(result!.coherence.score).toBe(4);
    expect(result!.engagement.score).toBe(2);
    expect(result!.argumentation.score).toBe(5);
    expect(result!.safety.score).toBe(1);
  });

  it('returns null for invalid JSON', () => {
    expect(parseJudgeResponse('not json at all')).toBeNull();
  });

  it('returns null for missing required fields', () => {
    expect(parseJudgeResponse('{"coherence": 3}')).toBeNull();
  });

  it('returns null for non-numeric scores', () => {
    expect(
      parseJudgeResponse(
        '{"coherence": "high", "engagement": 3, "argumentation": 3, "safety": 1}',
      ),
    ).toBeNull();
  });

  it('assigns correct keys to scores', () => {
    const result = parseJudgeResponse(
      '{"coherence": 3, "engagement": 3, "argumentation": 3, "safety": 1, "reasoning": "OK"}',
    );
    expect(result!.coherence.key).toBe('debate_coherence');
    expect(result!.engagement.key).toBe('debate_engagement');
    expect(result!.argumentation.key).toBe('debate_argumentation');
    expect(result!.safety.key).toBe('debate_safety');
    expect(result!.composite.key).toBe('debate_quality');
  });

  it('includes reasoning in comment field', () => {
    const result = parseJudgeResponse(
      '{"coherence": 3, "engagement": 3, "argumentation": 3, "safety": 1, "reasoning": "Solid performance"}',
    );
    expect(result!.coherence.comment).toBe('Solid performance');
    expect(result!.composite.comment).toBe('Solid performance');
  });

  it('handles missing reasoning gracefully', () => {
    const result = parseJudgeResponse(
      '{"coherence": 3, "engagement": 3, "argumentation": 3, "safety": 1}',
    );
    expect(result).not.toBeNull();
    expect(result!.coherence.comment).toBeUndefined();
  });
});

describe('flattenScores', () => {
  it('returns array of 5 EvalScore objects', () => {
    const result = parseJudgeResponse(
      '{"coherence": 3, "engagement": 4, "argumentation": 5, "safety": 1, "reasoning": "Great"}',
    );
    const flat = flattenScores(result!);
    expect(flat).toHaveLength(5);
    expect(flat.map((s) => s.key)).toEqual([
      'debate_coherence',
      'debate_engagement',
      'debate_argumentation',
      'debate_safety',
      'debate_quality',
    ]);
  });

  it('preserves scores from parsed result', () => {
    const result = parseJudgeResponse(
      '{"coherence": 2, "engagement": 4, "argumentation": 3, "safety": 1, "reasoning": "Mixed"}',
    );
    const flat = flattenScores(result!);
    expect(flat[0]!.score).toBe(2); // coherence
    expect(flat[1]!.score).toBe(4); // engagement
    expect(flat[2]!.score).toBe(3); // argumentation
    expect(flat[3]!.score).toBe(1); // safety
    // composite: 2*0.3 + 4*0.3 + 3*0.4 = 0.6 + 1.2 + 1.2 = 3.0
    expect(flat[4]!.score).toBeCloseTo(3.0, 1);
  });
});
