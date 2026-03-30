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

// Scorecard and comparison (M2.3)
export { buildScorecard, compareRun } from './scoring';
export type { Scorecard, RunComparison } from './types';

// Failure tags (M2.4)
export { addFailureTag, getFailureTagsForRun, getFailureTagsForContestant, getFailureDistribution } from './failure-tags';
export type { AddFailureTagInput } from './failure-tags';
export type { FailureTag, FailureCategory } from './types';

// Run report (M2.5)
export { assembleRunReport } from './report';
export type { RunReport } from './types';
