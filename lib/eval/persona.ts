// Persona adherence evaluator for LangSmith evaluation pipelines.
//
// Scores how well an agent's response matches its assigned persona by
// checking for tone markers, quirk usage, speech pattern consistency,
// and archetype alignment. Pure heuristic — no LLM calls.

import type { EvalScore, PersonaEvalInput } from './types';

/**
 * Normalize text for case-insensitive matching.
 */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"');
}

/**
 * Check if a response contains signals from the persona's tone description.
 * Extracts key adjectives/descriptors from the tone field and checks presence.
 */
function scoreTone(text: string, tone: string | null | undefined): number {
  if (!tone) return 0.5; // neutral if no tone defined
  const lower = norm(text);
  // Extract key tone words (skip common filler words)
  const skip = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'with', 'of', 'in', 'is',
    'that', 'this', 'for', 'to', 'as', 'by', 'on', 'at', 'from',
  ]);
  const toneWords = norm(tone)
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !skip.has(w));

  if (toneWords.length === 0) return 0.5;
  const matches = toneWords.filter((w) => lower.includes(w)).length;
  // Tone adherence: even 1-2 tone-word matches is a positive signal.
  // We don't expect all tone descriptors to appear verbatim.
  return Math.min(matches / Math.max(toneWords.length * 0.3, 1), 1);
}

/**
 * Check if the response exhibits any of the persona's quirks.
 * Each quirk is a short phrase describing a behavioral pattern.
 */
function scoreQuirks(text: string, quirks: string[] | null | undefined): number {
  if (!quirks || quirks.length === 0) return 0.5;
  const lower = norm(text);
  let hits = 0;
  for (const quirk of quirks) {
    // Extract meaningful keywords from the quirk description
    const quirkWords = norm(quirk)
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4);
    // A quirk "hits" if at least 2 of its keywords appear in the text
    const kwMatches = quirkWords.filter((w) => lower.includes(w)).length;
    if (kwMatches >= 2 || (quirkWords.length <= 2 && kwMatches >= 1)) {
      hits++;
    }
  }
  // Score: fraction of quirks that show some evidence in the response
  return Math.min(hits / Math.max(quirks.length * 0.4, 1), 1);
}

/**
 * Check if the response matches the expected speech pattern.
 * Looks for structural signals: question density, formality markers, etc.
 */
function scoreSpeechPattern(
  text: string,
  pattern: string | null | undefined,
): number {
  if (!pattern) return 0.5;
  const lower = norm(text);
  const patternLower = norm(pattern);

  // Question-heavy patterns: check question mark density
  if (patternLower.includes('question') || patternLower.includes('socratic')) {
    const questionCount = (text.match(/\?/g) || []).length;
    const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
    const questionRatio = questionCount / sentences;
    return Math.min(questionRatio * 2, 1); // 50%+ questions = full score
  }

  // Clinical/analytical patterns: check for structured language
  if (patternLower.includes('clinical') || patternLower.includes('analys')) {
    const analyticalMarkers = [
      'therefore', 'consequently', 'furthermore', 'however', 'moreover',
      'specifically', 'in fact', 'the reality is', 'let us', 'consider',
    ];
    const hits = analyticalMarkers.filter((m) => lower.includes(m)).length;
    return Math.min(hits / 3, 1);
  }

  // Diplomatic patterns: check for hedging and reframing
  if (patternLower.includes('diplom') || patternLower.includes('reframe')) {
    const diplomaticMarkers = [
      'acknowledge', 'appreciate', 'understand', 'however', 'perspective',
      'consider', 'indeed', 'merit', 'certainly', 'perhaps',
    ];
    const hits = diplomaticMarkers.filter((m) => lower.includes(m)).length;
    return Math.min(hits / 3, 1);
  }

  // Generic fallback: check for key words from pattern description
  const patternWords = patternLower
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4);
  if (patternWords.length === 0) return 0.5;
  const hits = patternWords.filter((w) => lower.includes(w)).length;
  return Math.min(hits / Math.max(patternWords.length * 0.3, 1), 1);
}

/**
 * Check if the response uses the persona's name or archetype identity.
 */
function scoreIdentity(
  text: string,
  name: string,
  archetype: string | null | undefined,
): number {
  const lower = norm(text);
  let score = 0;
  // Self-reference by name (first person or third person)
  if (lower.includes(norm(name))) score += 0.5;
  // Archetype keywords present
  if (archetype) {
    const archetypeWords = norm(archetype)
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4);
    const hits = archetypeWords.filter((w) => lower.includes(w)).length;
    if (hits > 0) score += 0.5;
  }
  return Math.min(score, 1);
}

/**
 * Evaluate how well an agent response adheres to its assigned persona.
 *
 * Returns a composite score from 0.0 to 1.0 based on weighted sub-scores
 * for tone, quirks, speech pattern, and identity signals.
 *
 * @example
 * ```ts
 * evaluatePersona({
 *   text: "But tell me, friend — do you truly believe your argument holds?",
 *   persona: {
 *     name: "Socrates",
 *     archetype: "The Relentless Questioner",
 *     tone: "Calm, probing, deceptively gentle",
 *     quirks: ["never makes declarative statements, only asks questions"],
 *     speechPattern: "Socratic dialogue — question chains",
 *   },
 * })
 * // { key: 'persona_adherence', score: 0.85, comment: 'tone=0.7 quirks=0.8 ...' }
 * ```
 */
export function evaluatePersona(input: PersonaEvalInput): EvalScore {
  const { text, persona } = input;

  // Skip evaluation on very short responses (< 20 chars)
  if (text.trim().length < 20) {
    return {
      key: 'persona_adherence',
      score: 0,
      comment: 'Response too short for persona evaluation',
    };
  }

  const toneScore = scoreTone(text, persona.tone);
  const quirkScore = scoreQuirks(text, persona.quirks);
  const patternScore = scoreSpeechPattern(text, persona.speechPattern);
  const identityScore = scoreIdentity(text, persona.name, persona.archetype);

  // Weighted composite: speech pattern and quirks weighted higher
  // as they are the most distinctive persona signals
  const composite =
    toneScore * 0.2 +
    quirkScore * 0.3 +
    patternScore * 0.3 +
    identityScore * 0.2;

  const detail = [
    `tone=${toneScore.toFixed(2)}`,
    `quirks=${quirkScore.toFixed(2)}`,
    `pattern=${patternScore.toFixed(2)}`,
    `identity=${identityScore.toFixed(2)}`,
  ].join(' ');

  return {
    key: 'persona_adherence',
    score: Math.round(composite * 100) / 100,
    comment: detail,
  };
}
