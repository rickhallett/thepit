// Barrel export for the evaluation domain module.

// Legacy evaluators (bout system)
export type { EvalScore, RefusalEvalInput, PersonaEvalInput, FormatEvalInput, BeliefStanceEvalInput } from './types';

// Run evaluation model (M2.1+)
export { createRubric, getRubric, listRubrics } from './rubrics';
export type { Rubric, ListRubricsOptions, RubricCriterion } from './types';

// Evaluation model (M2.2)
export { insertEvaluation, getEvaluationsForRun, getEvaluationsForContestant, getLatestEvaluation } from './evaluations';
export { computeWeightedScore } from './scoring';
export { buildJudgePrompt, evaluateContestant, evaluateRun } from './judge';
export type { Evaluation, CriterionScore, ReconciliationEvent } from './types';
export type { JudgeConfig } from './judge';
export type { InsertEvaluationInput } from './evaluations';
