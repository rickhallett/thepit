// Shared types for evaluation functions and the run evaluation model.
//
// Evaluators are pure functions that score application outputs.
// They return feedback dictionaries compatible with LangSmith's
// evaluate() SDK, but can also run standalone without LangSmith.

/**
 * A single evaluation score returned by an evaluator.
 * Compatible with LangSmith feedback format.
 */
export type EvalScore = {
  /** Metric name (e.g. 'refusal_detected', 'persona_adherence'). */
  key: string;
  /** Numerical score. Interpretation depends on the evaluator. */
  score: number;
  /** Optional human-readable explanation. */
  comment?: string;
};

/**
 * Input to the refusal evaluator.
 */
export type RefusalEvalInput = {
  /** The agent's response text for a single turn. */
  text: string;
};

/**
 * Input to the persona adherence evaluator.
 */
export type PersonaEvalInput = {
  /** The agent's response text for a single turn. */
  text: string;
  /** Persona fields that define the expected character. */
  persona: {
    name: string;
    archetype?: string | null;
    tone?: string | null;
    quirks?: string[] | null;
    speechPattern?: string | null;
  };
};

/**
 * Input to the format compliance evaluator.
 */
export type FormatEvalInput = {
  /** The agent's response text. */
  text: string;
  /** The expected response format ID. */
  formatId: 'plain' | 'spaced' | 'json';
};

/**
 * Input to the belief stance evaluator (RE-A research experiment).
 */
export type BeliefStanceEvalInput = {
  /** The agent's response text for a single turn. */
  text: string;
  /** The agent's persona name. */
  agentName: string;
  /** The belief being tracked. */
  beliefStatement: string;
  /** Previous turn text for context (optional). */
  previousTurn?: string | null;
  /** Turn index (0-based) for temporal tracking. */
  turnIndex: number;
};

// ---------------------------------------------------------------------------
// Run evaluation model (M2.1+)
// ---------------------------------------------------------------------------

import type { InferSelectModel } from 'drizzle-orm';
import type {
  rubrics,
  evaluations,
  RubricCriterion,
  CriterionScore,
  ReconciliationEvent,
} from '@/db/schema';

/** A rubric as stored in the database. */
export type Rubric = InferSelectModel<typeof rubrics>;

/** Options for listing rubrics with filtering. */
export type ListRubricsOptions = {
  domain?: string;
  limit?: number;
  offset?: number;
};

export type { RubricCriterion };

// ---------------------------------------------------------------------------
// Evaluation model (M2.2)
// ---------------------------------------------------------------------------

/** An evaluation as stored in the database. */
export type Evaluation = InferSelectModel<typeof evaluations>;

export type { CriterionScore, ReconciliationEvent };
