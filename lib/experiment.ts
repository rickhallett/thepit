// Experiment infrastructure for controlled context-injection studies.
//
// Provides:
//   - PromptHook: per-turn callback that can inject content into agent system prompts
//   - ScriptedTurn: pre-determined content that replaces an LLM call at a specific turn
//   - ExperimentConfig: declarative API-layer config that compiles to hooks/scripts
//
// Design constraints:
//   - All hooks are optional — null/undefined is the default and changes nothing
//   - Zero regression risk: existing bout execution paths are unaffected
//   - Research API key required: experiment features are gated behind X-Research-Key
//   - Injected content is wrapped in <experiment-injection> XML for traceability

import { xmlTag, xmlEscape } from '@/lib/xml-prompt';

// ─── Types ───────────────────────────────────────────────────────────

/** Context passed to a prompt hook on each turn. */
export type PromptHookContext = {
  turn: number;
  agentIndex: number;
  agentId: string;
  history: string[];
};

/** Result returned by a prompt hook. Null means "no injection this turn". */
export type PromptHookResult = {
  injectedContent?: string;
} | null;

/** Callback invoked before each LLM call to optionally inject system prompt content. */
export type PromptHook = (ctx: PromptHookContext) => PromptHookResult;

/** A scripted turn that replaces the LLM call entirely. */
export type ScriptedTurn = {
  agentIndex: number;
  content: string;
};

/** Declarative experiment configuration accepted by the API. */
export interface ExperimentConfig {
  promptInjections?: Array<{
    /** Inject into system prompt starting from the turn AFTER this turn number. */
    afterTurn: number;
    /** Which agent (by round-robin index) receives the injection. */
    targetAgentIndex: number;
    /** Content to inject into the system prompt. */
    content: string;
  }>;
  scriptedTurns?: Array<{
    /** The turn number (0-indexed) where scripted content replaces the LLM call. */
    turn: number;
    /** Which agent (by round-robin index) delivers the scripted content. */
    agentIndex: number;
    /** The text content to emit as if the agent said it. */
    content: string;
  }>;
}

// ─── Validation ──────────────────────────────────────────────────────

export type ExperimentValidation =
  | { ok: true; config: ExperimentConfig }
  | { ok: false; error: string };

/**
 * Validate an ExperimentConfig from an API request body.
 *
 * Checks:
 *   - Turn numbers are non-negative integers
 *   - Agent indices are non-negative integers
 *   - Content strings are non-empty
 *   - No duplicate scripted turns for the same turn number
 */
export function validateExperimentConfig(
  raw: unknown,
  maxTurns: number,
  agentCount: number,
): ExperimentValidation {
  if (raw == null) {
    return { ok: true, config: {} };
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'experimentConfig must be an object.' };
  }

  const config = raw as Record<string, unknown>;
  const result: ExperimentConfig = {};

  // Validate promptInjections
  if (config.promptInjections !== undefined) {
    if (!Array.isArray(config.promptInjections)) {
      return { ok: false, error: 'experimentConfig.promptInjections must be an array.' };
    }

    result.promptInjections = [];
    for (let i = 0; i < config.promptInjections.length; i++) {
      const inj = config.promptInjections[i] as Record<string, unknown>;
      if (!inj || typeof inj !== 'object') {
        return { ok: false, error: `experimentConfig.promptInjections[${i}] must be an object.` };
      }

      const afterTurn = inj.afterTurn;
      if (typeof afterTurn !== 'number' || !Number.isInteger(afterTurn) || afterTurn < 0) {
        return { ok: false, error: `experimentConfig.promptInjections[${i}].afterTurn must be a non-negative integer.` };
      }
      if (afterTurn >= maxTurns) {
        return { ok: false, error: `experimentConfig.promptInjections[${i}].afterTurn (${afterTurn}) exceeds maxTurns (${maxTurns}).` };
      }

      const targetAgentIndex = inj.targetAgentIndex;
      if (typeof targetAgentIndex !== 'number' || !Number.isInteger(targetAgentIndex) || targetAgentIndex < 0) {
        return { ok: false, error: `experimentConfig.promptInjections[${i}].targetAgentIndex must be a non-negative integer.` };
      }
      if (targetAgentIndex >= agentCount) {
        return { ok: false, error: `experimentConfig.promptInjections[${i}].targetAgentIndex (${targetAgentIndex}) exceeds agent count (${agentCount}).` };
      }

      const content = inj.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        return { ok: false, error: `experimentConfig.promptInjections[${i}].content must be a non-empty string.` };
      }

      result.promptInjections.push({
        afterTurn: afterTurn,
        targetAgentIndex: targetAgentIndex,
        content: content,
      });
    }
  }

  // Validate scriptedTurns
  if (config.scriptedTurns !== undefined) {
    if (!Array.isArray(config.scriptedTurns)) {
      return { ok: false, error: 'experimentConfig.scriptedTurns must be an array.' };
    }

    const seenTurns = new Set<number>();
    result.scriptedTurns = [];

    for (let i = 0; i < config.scriptedTurns.length; i++) {
      const st = config.scriptedTurns[i] as Record<string, unknown>;
      if (!st || typeof st !== 'object') {
        return { ok: false, error: `experimentConfig.scriptedTurns[${i}] must be an object.` };
      }

      const turn = st.turn;
      if (typeof turn !== 'number' || !Number.isInteger(turn) || turn < 0) {
        return { ok: false, error: `experimentConfig.scriptedTurns[${i}].turn must be a non-negative integer.` };
      }
      if (turn >= maxTurns) {
        return { ok: false, error: `experimentConfig.scriptedTurns[${i}].turn (${turn}) exceeds maxTurns (${maxTurns}).` };
      }
      if (seenTurns.has(turn)) {
        return { ok: false, error: `experimentConfig.scriptedTurns has duplicate turn number ${turn}.` };
      }
      seenTurns.add(turn);

      const agentIndex = st.agentIndex;
      if (typeof agentIndex !== 'number' || !Number.isInteger(agentIndex) || agentIndex < 0) {
        return { ok: false, error: `experimentConfig.scriptedTurns[${i}].agentIndex must be a non-negative integer.` };
      }
      if (agentIndex >= agentCount) {
        return { ok: false, error: `experimentConfig.scriptedTurns[${i}].agentIndex (${agentIndex}) exceeds agent count (${agentCount}).` };
      }

      const content = st.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        return { ok: false, error: `experimentConfig.scriptedTurns[${i}].content must be a non-empty string.` };
      }

      result.scriptedTurns.push({
        turn: turn,
        agentIndex: agentIndex,
        content: content,
      });
    }
  }

  return { ok: true, config: result };
}

// ─── Compilation ─────────────────────────────────────────────────────

/**
 * Compile an ExperimentConfig into a PromptHook function.
 *
 * The hook checks each injection's afterTurn threshold:
 * if the current turn > afterTurn AND the current agent matches,
 * the injection content is returned. Multiple injections can
 * accumulate for the same agent.
 *
 * Returns null if no injections are configured.
 */
export function compilePromptHook(config: ExperimentConfig): PromptHook | undefined {
  if (!config.promptInjections?.length) return undefined;

  const injections = config.promptInjections;

  return (ctx: PromptHookContext): PromptHookResult => {
    const parts: string[] = [];

    for (const inj of injections) {
      if (ctx.turn > inj.afterTurn && ctx.agentIndex === inj.targetAgentIndex) {
        parts.push(inj.content);
      }
    }

    if (parts.length === 0) return null;
    return { injectedContent: parts.join('\n') };
  };
}

/**
 * Compile an ExperimentConfig into a Map of scripted turns.
 *
 * Returns undefined if no scripted turns are configured.
 */
export function compileScriptedTurns(
  config: ExperimentConfig,
): Map<number, ScriptedTurn> | undefined {
  if (!config.scriptedTurns?.length) return undefined;

  const map = new Map<number, ScriptedTurn>();
  for (const st of config.scriptedTurns) {
    map.set(st.turn, { agentIndex: st.agentIndex, content: st.content });
  }
  return map;
}

// ─── Prompt injection helper ─────────────────────────────────────────

/**
 * Append experiment injection content to a system prompt.
 *
 * Wraps the injected content in an <experiment-injection> XML section
 * that is clearly demarcated for post-hoc analysis. The content is
 * XML-escaped to prevent injection attacks.
 */
export function appendExperimentInjection(
  systemPrompt: string,
  injectedContent: string,
): string {
  const section = xmlTag('experiment-injection', xmlEscape(injectedContent));
  return `${systemPrompt}\n\n${section}`;
}
