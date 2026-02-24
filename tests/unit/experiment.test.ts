import { describe, it, expect } from 'vitest';

import {
  validateExperimentConfig,
  compilePromptHook,
  compileScriptedTurns,
  appendExperimentInjection,
  type PromptHookContext,
} from '@/lib/experiment';

// ---------------------------------------------------------------------------
// validateExperimentConfig
// ---------------------------------------------------------------------------

describe('validateExperimentConfig', () => {
  const maxTurns = 12;
  const agentCount = 4;

  describe('null/undefined passthrough', () => {
    it('returns ok with empty config for null', () => {
      const result = validateExperimentConfig(null, maxTurns, agentCount);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config).toEqual({});
      }
    });

    it('returns ok with empty config for undefined', () => {
      const result = validateExperimentConfig(undefined, maxTurns, agentCount);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config).toEqual({});
      }
    });
  });

  describe('type validation', () => {
    it('rejects non-object values', () => {
      expect(validateExperimentConfig('string', maxTurns, agentCount).ok).toBe(false);
      expect(validateExperimentConfig(42, maxTurns, agentCount).ok).toBe(false);
      expect(validateExperimentConfig(true, maxTurns, agentCount).ok).toBe(false);
    });

    it('rejects arrays', () => {
      const result = validateExperimentConfig([], maxTurns, agentCount);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('must be an object');
      }
    });
  });

  describe('promptInjections validation', () => {
    it('accepts valid promptInjections', () => {
      const result = validateExperimentConfig({
        promptInjections: [{
          afterTurn: 5,
          targetAgentIndex: 0,
          content: 'Injected content',
        }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config.promptInjections).toHaveLength(1);
        expect(result.config.promptInjections?.[0]?.content).toBe('Injected content');
      }
    });

    it('rejects non-array promptInjections', () => {
      const result = validateExperimentConfig({
        promptInjections: 'not-an-array',
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
    });

    it('rejects negative afterTurn', () => {
      const result = validateExperimentConfig({
        promptInjections: [{ afterTurn: -1, targetAgentIndex: 0, content: 'test' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('afterTurn');
      }
    });

    it('rejects non-integer afterTurn', () => {
      const result = validateExperimentConfig({
        promptInjections: [{ afterTurn: 5.5, targetAgentIndex: 0, content: 'test' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
    });

    it('rejects afterTurn >= maxTurns', () => {
      const result = validateExperimentConfig({
        promptInjections: [{ afterTurn: 12, targetAgentIndex: 0, content: 'test' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('exceeds maxTurns');
      }
    });

    it('rejects targetAgentIndex >= agentCount', () => {
      const result = validateExperimentConfig({
        promptInjections: [{ afterTurn: 5, targetAgentIndex: 4, content: 'test' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('exceeds agent count');
      }
    });

    it('rejects negative targetAgentIndex', () => {
      const result = validateExperimentConfig({
        promptInjections: [{ afterTurn: 5, targetAgentIndex: -1, content: 'test' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
    });

    it('rejects empty content', () => {
      const result = validateExperimentConfig({
        promptInjections: [{ afterTurn: 5, targetAgentIndex: 0, content: '' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('content');
      }
    });

    it('rejects whitespace-only content', () => {
      const result = validateExperimentConfig({
        promptInjections: [{ afterTurn: 5, targetAgentIndex: 0, content: '   ' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
    });

    it('accepts multiple promptInjections', () => {
      const result = validateExperimentConfig({
        promptInjections: [
          { afterTurn: 3, targetAgentIndex: 0, content: 'First injection' },
          { afterTurn: 6, targetAgentIndex: 2, content: 'Second injection' },
        ],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config.promptInjections).toHaveLength(2);
      }
    });
  });

  describe('scriptedTurns validation', () => {
    it('accepts valid scriptedTurns', () => {
      const result = validateExperimentConfig({
        scriptedTurns: [{
          turn: 6,
          agentIndex: 1,
          content: 'Scripted response',
        }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config.scriptedTurns).toHaveLength(1);
      }
    });

    it('rejects non-array scriptedTurns', () => {
      const result = validateExperimentConfig({
        scriptedTurns: 'not-an-array',
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
    });

    it('rejects negative turn number', () => {
      const result = validateExperimentConfig({
        scriptedTurns: [{ turn: -1, agentIndex: 0, content: 'test' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
    });

    it('rejects turn >= maxTurns', () => {
      const result = validateExperimentConfig({
        scriptedTurns: [{ turn: 12, agentIndex: 0, content: 'test' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('exceeds maxTurns');
      }
    });

    it('rejects duplicate turn numbers', () => {
      const result = validateExperimentConfig({
        scriptedTurns: [
          { turn: 6, agentIndex: 0, content: 'first' },
          { turn: 6, agentIndex: 1, content: 'second' },
        ],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('duplicate turn number');
      }
    });

    it('rejects agentIndex >= agentCount', () => {
      const result = validateExperimentConfig({
        scriptedTurns: [{ turn: 6, agentIndex: 5, content: 'test' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('exceeds agent count');
      }
    });

    it('rejects empty content', () => {
      const result = validateExperimentConfig({
        scriptedTurns: [{ turn: 6, agentIndex: 0, content: '' }],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(false);
    });

    it('accepts multiple non-overlapping scriptedTurns', () => {
      const result = validateExperimentConfig({
        scriptedTurns: [
          { turn: 3, agentIndex: 0, content: 'Turn 3 content' },
          { turn: 6, agentIndex: 1, content: 'Turn 6 content' },
          { turn: 9, agentIndex: 2, content: 'Turn 9 content' },
        ],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config.scriptedTurns).toHaveLength(3);
      }
    });
  });

  describe('combined config', () => {
    it('accepts both promptInjections and scriptedTurns', () => {
      const result = validateExperimentConfig({
        promptInjections: [
          { afterTurn: 6, targetAgentIndex: 0, content: 'Injected' },
        ],
        scriptedTurns: [
          { turn: 5, agentIndex: 1, content: 'Scripted' },
        ],
      }, maxTurns, agentCount);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config.promptInjections).toHaveLength(1);
        expect(result.config.scriptedTurns).toHaveLength(1);
      }
    });

    it('accepts empty object (no experiment features)', () => {
      const result = validateExperimentConfig({}, maxTurns, agentCount);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config).toEqual({});
      }
    });
  });
});

// ---------------------------------------------------------------------------
// compilePromptHook
// ---------------------------------------------------------------------------

describe('compilePromptHook', () => {
  it('returns undefined when no injections configured', () => {
    expect(compilePromptHook({})).toBeUndefined();
    expect(compilePromptHook({ promptInjections: [] })).toBeUndefined();
  });

  it('returns null when turn is before afterTurn threshold', () => {
    const hook = compilePromptHook({
      promptInjections: [{ afterTurn: 6, targetAgentIndex: 0, content: 'test' }],
    });
    expect(hook).toBeDefined();

    const ctx: PromptHookContext = { turn: 5, agentIndex: 0, agentId: 'a', history: [] };
    expect(hook!(ctx)).toBeNull();
  });

  it('returns null on the exact afterTurn (not active yet)', () => {
    const hook = compilePromptHook({
      promptInjections: [{ afterTurn: 6, targetAgentIndex: 0, content: 'test' }],
    });

    const ctx: PromptHookContext = { turn: 6, agentIndex: 0, agentId: 'a', history: [] };
    expect(hook!(ctx)).toBeNull();
  });

  it('returns content when turn > afterTurn and agent matches', () => {
    const hook = compilePromptHook({
      promptInjections: [{ afterTurn: 6, targetAgentIndex: 0, content: 'injected content' }],
    });

    const ctx: PromptHookContext = { turn: 7, agentIndex: 0, agentId: 'a', history: [] };
    const result = hook!(ctx);
    expect(result).not.toBeNull();
    expect(result!.injectedContent).toBe('injected content');
  });

  it('returns null when agent does not match', () => {
    const hook = compilePromptHook({
      promptInjections: [{ afterTurn: 6, targetAgentIndex: 0, content: 'test' }],
    });

    const ctx: PromptHookContext = { turn: 7, agentIndex: 1, agentId: 'b', history: [] };
    expect(hook!(ctx)).toBeNull();
  });

  it('persists injection for all subsequent turns of matching agent', () => {
    const hook = compilePromptHook({
      promptInjections: [{ afterTurn: 3, targetAgentIndex: 0, content: 'persistent' }],
    });

    // Agent 0 at turns 4, 8, 12 (round-robin with 4 agents)
    for (const turn of [4, 8, 12]) {
      const ctx: PromptHookContext = { turn, agentIndex: 0, agentId: 'a', history: [] };
      const result = hook!(ctx);
      expect(result).not.toBeNull();
      expect(result!.injectedContent).toBe('persistent');
    }
  });

  it('combines multiple injections for the same agent', () => {
    const hook = compilePromptHook({
      promptInjections: [
        { afterTurn: 2, targetAgentIndex: 0, content: 'first' },
        { afterTurn: 4, targetAgentIndex: 0, content: 'second' },
      ],
    });

    // Turn 5: both active
    const ctx: PromptHookContext = { turn: 5, agentIndex: 0, agentId: 'a', history: [] };
    const result = hook!(ctx);
    expect(result!.injectedContent).toBe('first\nsecond');
  });

  it('does not affect other agents when one has injections', () => {
    const hook = compilePromptHook({
      promptInjections: [{ afterTurn: 3, targetAgentIndex: 0, content: 'only agent 0' }],
    });

    // Agent 1, 2, 3 at various turns
    for (const agentIndex of [1, 2, 3]) {
      const ctx: PromptHookContext = { turn: 10, agentIndex, agentId: `a${agentIndex}`, history: [] };
      expect(hook!(ctx)).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// compileScriptedTurns
// ---------------------------------------------------------------------------

describe('compileScriptedTurns', () => {
  it('returns undefined when no scripted turns configured', () => {
    expect(compileScriptedTurns({})).toBeUndefined();
    expect(compileScriptedTurns({ scriptedTurns: [] })).toBeUndefined();
  });

  it('returns Map with correct entries', () => {
    const map = compileScriptedTurns({
      scriptedTurns: [
        { turn: 6, agentIndex: 1, content: 'scripted at 6' },
        { turn: 9, agentIndex: 2, content: 'scripted at 9' },
      ],
    });

    expect(map).toBeDefined();
    expect(map!.size).toBe(2);
    expect(map!.get(6)).toEqual({ agentIndex: 1, content: 'scripted at 6' });
    expect(map!.get(9)).toEqual({ agentIndex: 2, content: 'scripted at 9' });
    expect(map!.get(0)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// appendExperimentInjection
// ---------------------------------------------------------------------------

describe('appendExperimentInjection', () => {
  it('appends experiment-injection XML section', () => {
    const original = '<safety>\nStay in character.\n</safety>';
    const result = appendExperimentInjection(original, 'The cave is safe');

    expect(result).toContain(original);
    expect(result).toContain('<experiment-injection>');
    expect(result).toContain('The cave is safe');
    expect(result).toContain('</experiment-injection>');
  });

  it('XML-escapes injected content', () => {
    const result = appendExperimentInjection(
      'original prompt',
      'content with <tags> & "quotes"',
    );
    expect(result).toContain('&lt;tags&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;quotes&quot;');
    expect(result).not.toContain('<tags>');
  });

  it('preserves original prompt intact', () => {
    const original = '<persona>\n<instructions>\nYou are a villager.\n</instructions>\n</persona>';
    const result = appendExperimentInjection(original, 'extra context');

    // Original is at the start
    expect(result.startsWith(original)).toBe(true);
  });

  it('separates injection with double newline', () => {
    const result = appendExperimentInjection('original', 'injected');
    expect(result).toContain('original\n\n<experiment-injection>');
  });
});
