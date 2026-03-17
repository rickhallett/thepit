// Core bout execution engine - barrel file.
//
// Re-exports from focused modules so existing imports from
// '@/lib/bout-engine' continue to work unchanged.
//
// Decomposed in RD-010:
//   bout-validation.ts - types, helpers, validateBoutRequest()
//   bout-execution.ts  - executeBout() (turn loop, settlement, error recovery)

export {
  // Types
  type ByokKeyData,
  type BoutContext,
  type BoutResult,
  type TurnEvent,
  type BoutValidation,
  // Functions
  validateBoutRequest,
  isAnthropicModel,
  hashUserId,
  // Constants
  ANTHROPIC_CACHE_CONTROL,
} from './bout-validation';

export {
  executeBout,
  type BoutCompletionEvent,
  type OnBoutCompleted,
} from './bout-execution';
