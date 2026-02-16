// Shared types for LangSmith-compatible evaluation functions.
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
