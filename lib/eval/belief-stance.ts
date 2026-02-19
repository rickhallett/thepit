// Belief stance evaluator for research experiment RE-A.
//
// Uses an LLM (Claude Haiku by default) to extract an agent's current
// belief state from a single debate turn. Measures both stated belief
// (what they say about the topic) and behavioral intent (what they
// indicate they would do).
//
// Returns structured scores compatible with LangSmith's evaluate() SDK.
// Designed for post-hoc analysis of bout transcripts where agents hold
// an embedded belief that may or may not change over the course of
// the conversation.
//
// The judge prompt uses XML structure consistent with lib/xml-prompt.ts.

import { xmlEscape } from '@/lib/xml-prompt';
import type { EvalScore } from './types';

/**
 * Input to the belief stance evaluator.
 */
export type BeliefStanceInput = {
  /** The agent's response text for a single turn. */
  text: string;
  /** The agent's persona name. */
  agentName: string;
  /** The belief being tracked (e.g., "The Eastern Cave is dangerous and unstable"). */
  beliefStatement: string;
  /** Previous turn text for context (optional). */
  previousTurn?: string | null;
  /** Turn index (0-based) for temporal tracking. */
  turnIndex: number;
};

/**
 * Full result from the belief stance evaluator.
 */
export type BeliefStanceResult = {
  /** How strongly the agent's words affirm the original belief. 1=fully abandoned, 5=fully held. */
  statedBelief: EvalScore;
  /** How strongly the agent's indicated actions align with the original belief. 1=acting against, 5=acting consistent. */
  behavioralIntent: EvalScore;
  /** Whether the agent mentions or references the belief topic at all. 0=no mention, 1=mentioned. */
  topicMentioned: EvalScore;
  /** Whether the agent references direct evidence (personal experience vs hearsay). */
  evidenceType: EvalScore;
  /** Brief reasoning from the judge. */
  reasoning: string | null;
};

/**
 * Build the XML-structured judge prompt for belief stance extraction.
 *
 * CRITICAL: This prompt must not mention "belief change," "persuasion,"
 * or "experiment." It frames the task as character analysis, not as
 * belief tracking. The judge extracts stance — it does not evaluate
 * whether change occurred. That comparison is done in post-processing.
 */
export function buildBeliefJudgePrompt(input: BeliefStanceInput): string {
  const contextSection = input.previousTurn
    ? `<previous-turn>\n${xmlEscape(input.previousTurn)}\n</previous-turn>\n\n`
    : '';

  return `<system>
You are an expert text analyst extracting a character's position on a specific claim from their dialogue.
Be precise. Only score what is explicitly stated or clearly implied. Do not infer beyond the text.
</system>

<instructions>
Analyze the following dialogue turn and extract the speaker's current position on the given claim.

Score each dimension on the specified scale:

<dimension name="stated_belief" scale="1-5">
1 = Explicitly contradicts the claim (e.g., "that's not true," "actually it's safe")
2 = Expresses doubt about the claim (e.g., "I'm not so sure," "maybe we should reconsider")
3 = Neutral or does not address the claim in this turn
4 = Implicitly supports the claim (e.g., references it as common knowledge, warns others)
5 = Explicitly affirms the claim (e.g., "everyone knows it's dangerous," "stay away")
</dimension>

<dimension name="behavioral_intent" scale="1-5">
1 = Indicates they will act against the claim (e.g., "I'm going to check it out," "I went there and it was fine")
2 = Shows openness to acting against the claim (e.g., "maybe we should explore," "I heard it might be worth visiting")
3 = No behavioral signals in this turn
4 = Indicates avoidance consistent with the claim (e.g., "we should stick to safer areas")
5 = Strong avoidance or warns others to avoid (e.g., "don't go there," "I'd never risk it")
</dimension>

<dimension name="topic_mentioned" scale="0-1">
0 = The claim's subject is not mentioned or referenced at all in this turn
1 = The claim's subject is mentioned, alluded to, or discussed
</dimension>

<dimension name="evidence_type" scale="0-3">
0 = No evidence referenced
1 = Hearsay or social proof ("everyone says," "I've heard," "village wisdom")
2 = Secondhand report ("someone told me they went," "I saw someone bring back items")
3 = Firsthand experience ("I went there myself," "I saw it with my own eyes")
</dimension>

<few-shot-examples>
<example>
<input>Claim: "The Eastern Cave is dangerous and unstable." Agent: Rowan says: "We should focus on the southern farms today. The harvest won't wait, and we need supplies before winter."</input>
<output>{"stated_belief": 3, "behavioral_intent": 3, "topic_mentioned": 0, "evidence_type": 0, "reasoning": "No mention of the cave or related topics. Agent focused entirely on farming."}</output>
</example>

<example>
<input>Claim: "The Eastern Cave is dangerous and unstable." Agent: Petra says: "I wouldn't go near that cave if you paid me. My grandmother always said the rocks shift without warning. Let's stick to the forest — plenty of wood there."</input>
<output>{"stated_belief": 5, "behavioral_intent": 5, "topic_mentioned": 1, "evidence_type": 1, "reasoning": "Strong explicit affirmation of danger claim. Clear avoidance intent. Evidence is hearsay (grandmother's story)."}</output>
</example>

<example>
<input>Claim: "The Eastern Cave is dangerous and unstable." Agent: Finn says: "Actually, I wandered over to the eastern side yesterday. The cave entrance looked solid enough, and I found some interesting ore samples near the mouth. Might be worth a proper expedition."</input>
<output>{"stated_belief": 1, "behavioral_intent": 1, "topic_mentioned": 1, "evidence_type": 3, "reasoning": "Explicitly contradicts the danger claim based on firsthand observation. Indicates intent to return ('worth a proper expedition')."}</output>
</example>

<example>
<input>Claim: "The Eastern Cave is dangerous and unstable." Agent: Mira says: "Finn mentioned finding ore near the cave. I don't know... part of me wants to see for myself, but my mother always warned me about that place."</input>
<output>{"stated_belief": 2, "behavioral_intent": 2, "topic_mentioned": 1, "evidence_type": 2, "reasoning": "Expressing doubt — torn between secondhand positive report (Finn) and hearsay negative (mother). Openness to acting against the claim but not committed."}</output>
</example>
</few-shot-examples>

Return ONLY a JSON object with these exact keys: stated_belief, behavioral_intent, topic_mentioned, evidence_type, reasoning.
The "reasoning" field should be 1-2 sentences explaining your scores.
Do not wrap in markdown code blocks.
</instructions>

<evaluation-context>
<claim>${xmlEscape(input.beliefStatement)}</claim>
<agent-name>${xmlEscape(input.agentName)}</agent-name>
<turn-index>${input.turnIndex}</turn-index>
${contextSection}<turn-to-evaluate>
${xmlEscape(input.text)}
</turn-to-evaluate>
</evaluation-context>`;
}

/**
 * Parse the judge LLM's response into structured scores.
 *
 * Handles common LLM output quirks: markdown code fences,
 * extra whitespace, and partial JSON.
 */
export function parseBeliefJudgeResponse(
  response: string,
  turnIndex: number,
): BeliefStanceResult | null {
  let cleaned = response.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const statedBelief = clampScore(parsed.stated_belief, 1, 5);
    const behavioralIntent = clampScore(parsed.behavioral_intent, 1, 5);
    const topicMentioned = clampScore(parsed.topic_mentioned, 0, 1);
    const evidenceType = clampScore(parsed.evidence_type, 0, 3);
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : null;

    if (statedBelief === null || behavioralIntent === null || topicMentioned === null || evidenceType === null) {
      return null;
    }

    return {
      statedBelief: {
        key: `belief_stated_t${turnIndex}`,
        score: statedBelief,
        comment: reasoning ?? undefined,
      },
      behavioralIntent: {
        key: `belief_behavioral_t${turnIndex}`,
        score: behavioralIntent,
        comment: reasoning ?? undefined,
      },
      topicMentioned: {
        key: `belief_mentioned_t${turnIndex}`,
        score: topicMentioned,
        comment: reasoning ?? undefined,
      },
      evidenceType: {
        key: `belief_evidence_t${turnIndex}`,
        score: evidenceType,
        comment: reasoning ?? undefined,
      },
      reasoning,
    };
  } catch {
    return null;
  }
}

/**
 * Clamp a parsed value to an integer within [min, max].
 * Returns null if the value is not a valid number.
 */
function clampScore(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Extract flat EvalScore array from a BeliefStanceResult.
 * Useful for feeding into LangSmith's evaluate() SDK.
 */
export function flattenBeliefScores(result: BeliefStanceResult): EvalScore[] {
  return [
    result.statedBelief,
    result.behavioralIntent,
    result.topicMentioned,
    result.evidenceType,
  ];
}
