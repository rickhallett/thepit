#!/usr/bin/env tsx
/**
 * Live integration test for the eval/run harness.
 *
 * Exercises the full flow without database or Clerk:
 *   1. Build messages (engine)
 *   2. Call real LLM (Anthropic API via AI SDK)
 *   3. Build judge prompt (judge)
 *   4. Call real judge LLM (structured output)
 *   5. Reconcile + score (pure functions)
 *   6. Compute cost (pricing table)
 *   7. Print full report
 *
 * Usage: npx tsx scripts/live-test-harness.ts
 * Requires: ANTHROPIC_API_KEY in .env or environment
 */

import 'dotenv/config';

import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject } from 'ai';
import { z } from 'zod/v4';

// We cannot import from @/ aliases in a standalone script without
// next's module resolution. Import pure functions by relative path.
// Instead, inline the pure logic we need.

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set. Cannot run live test.');
  process.exit(1);
}

const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY });

const CONTESTANTS = [
  { label: 'Claude Haiku', model: 'claude-haiku-4-5-20251001' },
  { label: 'Claude Sonnet', model: 'claude-sonnet-4-5-20250929' },
];

const JUDGE_MODEL = 'claude-sonnet-4-5-20250929';

const TASK = {
  name: 'FizzBuzz in Python',
  prompt: 'Write a Python function called fizzbuzz(n) that returns a list of strings for numbers 1 to n. For multiples of 3, use "Fizz". For multiples of 5, use "Buzz". For multiples of both, use "FizzBuzz". Otherwise, use the string representation of the number.',
  constraints: [
    'Must be a single function, no classes',
    'Must handle n=0 and n=1 edge cases',
    'Return type must be list[str]',
  ],
  acceptanceCriteria: [
    'fizzbuzz(15) returns correct 15-element list',
    'fizzbuzz(0) returns empty list',
  ],
};

const RUBRIC = {
  name: 'Code Quality',
  criteria: [
    {
      name: 'Correctness',
      description: 'Does the function produce correct output for all inputs including edge cases?',
      weight: 0.5,
      scale: { min: 0, max: 10 },
    },
    {
      name: 'Efficiency',
      description: 'Is the implementation clean and avoiding unnecessary computation?',
      weight: 0.2,
      scale: { min: 0, max: 10 },
    },
    {
      name: 'Readability',
      description: 'Is the code clear, well-structured, and easy to understand?',
      weight: 0.3,
      scale: { min: 0, max: 10 },
    },
  ],
};

// ---------------------------------------------------------------------------
// Pricing table (subset from lib/run/pricing.ts)
// ---------------------------------------------------------------------------

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004 },
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015 },
};

function computeCost(model: string, inputTokens: number, outputTokens: number) {
  const p = PRICING[model];
  if (!p) return { inputCostMicro: 0, outputCostMicro: 0, totalCostMicro: 0 };
  const inputCostMicro = Math.round((inputTokens / 1000) * p.input * 1_000_000);
  const outputCostMicro = Math.round((outputTokens / 1000) * p.output * 1_000_000);
  return { inputCostMicro, outputCostMicro, totalCostMicro: inputCostMicro + outputCostMicro };
}

// ---------------------------------------------------------------------------
// Scoring (from lib/eval/scoring.ts)
// ---------------------------------------------------------------------------

type CriterionScore = { criterionName: string; score: number; rationale: string };
type RubricCriterion = typeof RUBRIC.criteria[number];

function computeWeightedScore(scores: CriterionScore[], criteria: RubricCriterion[]): number {
  let overall = 0;
  for (const c of criteria) {
    const match = scores.find(s => s.criterionName.trim().toLowerCase() === c.name.trim().toLowerCase());
    if (!match) continue;
    const clamped = Math.min(Math.max(match.score, c.scale.min), c.scale.max);
    const range = c.scale.max - c.scale.min;
    const normalized = range > 0 ? (clamped - c.scale.min) / range : 0;
    overall += normalized * c.weight;
  }
  return overall;
}

// ---------------------------------------------------------------------------
// Judge output schema
// ---------------------------------------------------------------------------

const judgeOutputSchema = z.object({
  scores: z.array(z.object({
    criterionName: z.string(),
    score: z.number(),
    rationale: z.string().min(1),
  })),
  overallRationale: z.string().min(1),
  failureTags: z.array(z.object({
    category: z.enum([
      'wrong_answer', 'partial_answer', 'refusal', 'off_topic',
      'unsafe_output', 'hallucination', 'format_violation',
      'context_misuse', 'instruction_violation',
    ]),
    description: z.string(),
  })).optional(),
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== THE PIT - LIVE HARNESS TEST ===\n');
  console.log(`Task: ${TASK.name}`);
  console.log(`Contestants: ${CONTESTANTS.map(c => c.label).join(' vs ')}`);
  console.log(`Judge: ${JUDGE_MODEL}`);
  console.log(`Rubric: ${RUBRIC.name} (${RUBRIC.criteria.map(c => c.name).join(', ')})\n`);

  // -------------------------------------------------------------------------
  // Step 1: Execute contestants
  // -------------------------------------------------------------------------

  type TraceResult = {
    label: string;
    model: string;
    response: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };

  const traces: TraceResult[] = [];

  for (const contestant of CONTESTANTS) {
    console.log(`--- Executing: ${contestant.label} (${contestant.model}) ---`);
    const start = performance.now();

    const messages: { role: 'system' | 'user'; content: string }[] = [
      { role: 'user', content: `${TASK.prompt}\n\nConstraints:\n${TASK.constraints.map(c => `- ${c}`).join('\n')}\n\nAcceptance criteria:\n${TASK.acceptanceCriteria.map(c => `- ${c}`).join('\n')}` },
    ];

    const result = await generateText({
      model: anthropic(contestant.model),
      messages,
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    const latencyMs = Math.round(performance.now() - start);
    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;

    traces.push({
      label: contestant.label,
      model: contestant.model,
      response: result.text,
      inputTokens,
      outputTokens,
      latencyMs,
    });

    const cost = computeCost(contestant.model, inputTokens, outputTokens);
    console.log(`  Tokens: ${inputTokens} in / ${outputTokens} out`);
    console.log(`  Latency: ${latencyMs}ms`);
    console.log(`  Cost: $${(cost.totalCostMicro / 1_000_000).toFixed(6)}`);
    console.log(`  Response (first 200 chars): ${result.text.slice(0, 200)}...\n`);
  }

  // -------------------------------------------------------------------------
  // Step 2: Judge each contestant
  // -------------------------------------------------------------------------

  type EvalResult = {
    label: string;
    scores: CriterionScore[];
    overallScore: number;
    rationale: string;
    failureTags: { category: string; description: string }[];
    judgeInputTokens: number;
    judgeOutputTokens: number;
    judgeLatencyMs: number;
  };

  const evaluations: EvalResult[] = [];

  for (const trace of traces) {
    console.log(`--- Judging: ${trace.label} ---`);
    const start = performance.now();

    const judgeMessages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: `You are an evaluation judge. You score outputs against explicit rubrics.
You must provide a numeric score and text rationale for EVERY criterion.
You must be specific about what the output did well and what it missed.
Do not award high scores for fluency alone. Evaluate substance.`,
      },
      {
        role: 'user',
        content: `## Task\n${TASK.prompt}\n\n## Rubric\n${RUBRIC.criteria.map(c =>
          `### ${c.name} (weight: ${c.weight}, scale: ${c.scale.min}-${c.scale.max})\n${c.description}`
        ).join('\n\n')}\n\n## Output to evaluate\n${trace.response}\n\n## Instructions\nScore the output against each criterion. Return JSON with scores, overallRationale, and failureTags (if any).`,
      },
    ];

    const result = await generateObject({
      model: anthropic(JUDGE_MODEL),
      messages: judgeMessages,
      schema: judgeOutputSchema,
      temperature: 0,
    });

    const latencyMs = Math.round(performance.now() - start);
    const judgeOutput = result.object;
    const overallScore = computeWeightedScore(judgeOutput.scores, RUBRIC.criteria);

    evaluations.push({
      label: trace.label,
      scores: judgeOutput.scores,
      overallScore,
      rationale: judgeOutput.overallRationale,
      failureTags: judgeOutput.failureTags ?? [],
      judgeInputTokens: result.usage?.inputTokens ?? 0,
      judgeOutputTokens: result.usage?.outputTokens ?? 0,
      judgeLatencyMs: latencyMs,
    });

    const judgeCost = computeCost(JUDGE_MODEL, result.usage?.inputTokens ?? 0, result.usage?.outputTokens ?? 0);
    console.log(`  Overall score: ${overallScore.toFixed(3)} (0..1)`);
    console.log(`  Scores:`);
    for (const s of judgeOutput.scores) {
      console.log(`    ${s.criterionName}: ${s.score}/10 - ${s.rationale.slice(0, 80)}...`);
    }
    if (judgeOutput.failureTags && judgeOutput.failureTags.length > 0) {
      console.log(`  Failure tags:`);
      for (const ft of judgeOutput.failureTags) {
        console.log(`    [${ft.category}] ${ft.description}`);
      }
    } else {
      console.log(`  Failure tags: none`);
    }
    console.log(`  Judge cost: $${(judgeCost.totalCostMicro / 1_000_000).toFixed(6)}`);
    console.log(`  Judge latency: ${latencyMs}ms\n`);
  }

  // -------------------------------------------------------------------------
  // Step 3: Comparison + Economics
  // -------------------------------------------------------------------------

  console.log('=== COMPARISON ===\n');

  const sorted = [...evaluations].sort((a, b) => b.overallScore - a.overallScore);
  const winner = sorted[0]!;
  const runnerUp = sorted[1]!;
  const margin = winner.overallScore - runnerUp.overallScore;

  console.log(`  Winner: ${winner.label} (${winner.overallScore.toFixed(3)})`);
  console.log(`  Runner-up: ${runnerUp.label} (${runnerUp.overallScore.toFixed(3)})`);
  console.log(`  Margin: ${margin.toFixed(3)}\n`);

  console.log('=== ECONOMICS ===\n');

  let totalCostMicro = 0;
  for (const trace of traces) {
    const cost = computeCost(trace.model, trace.inputTokens, trace.outputTokens);
    const evalResult = evaluations.find(e => e.label === trace.label)!;
    const judgeCost = computeCost(JUDGE_MODEL, evalResult.judgeInputTokens, evalResult.judgeOutputTokens);

    const contestantTotalCost = cost.totalCostMicro + judgeCost.totalCostMicro;
    totalCostMicro += contestantTotalCost;

    const costDollars = contestantTotalCost / 1_000_000;
    const scorePerDollar = costDollars > 0 ? evalResult.overallScore / costDollars : 0;
    const scorePerSecond = trace.latencyMs > 0 ? evalResult.overallScore / (trace.latencyMs / 1000) : 0;

    console.log(`  ${trace.label}:`);
    console.log(`    Execution: $${(cost.totalCostMicro / 1_000_000).toFixed(6)} | ${trace.latencyMs}ms | ${trace.inputTokens + trace.outputTokens} tokens`);
    console.log(`    Judge: $${(judgeCost.totalCostMicro / 1_000_000).toFixed(6)} | ${evalResult.judgeLatencyMs}ms`);
    console.log(`    Total: $${costDollars.toFixed(6)}`);
    console.log(`    Score/dollar: ${scorePerDollar.toFixed(1)}`);
    console.log(`    Score/second: ${scorePerSecond.toFixed(3)}\n`);
  }

  console.log(`  Total run cost: $${(totalCostMicro / 1_000_000).toFixed(6)}\n`);

  console.log('=== FULL RESPONSES ===\n');
  for (const trace of traces) {
    console.log(`--- ${trace.label} ---`);
    console.log(trace.response);
    console.log();
  }

  console.log('=== DONE ===');
}

main().catch((err) => {
  console.error('Live test failed:', err);
  process.exit(1);
});
