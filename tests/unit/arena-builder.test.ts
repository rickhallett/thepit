import { describe, expect, it } from 'vitest';

import type { ArenaAgentOption } from '@/components/arena-builder';

// ---------------------------------------------------------------------------
// Arena Builder contract tests
//
// The ArenaBuilder component handles:
//   1. Agent search/filter functionality - filters by name, id, presetName
//   2. Toggle selection behavior - add/remove agents from selection
//   3. Max 6 agent cap enforcement - cannot select more than 6 agents
//   4. Form validation - submit disabled when fewer than 2 agents selected
//
// These tests verify the pure logic extracted from the component.
// ---------------------------------------------------------------------------

/**
 * Pure-logic extraction of the filter function from ArenaBuilder.
 * Matches the useMemo callback in the component.
 */
function filterAgents(
  agents: ArenaAgentOption[],
  query: string,
): ArenaAgentOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return agents;
  return agents.filter((agent) => {
    return (
      agent.name.toLowerCase().includes(q) ||
      agent.id.toLowerCase().includes(q) ||
      agent.presetName?.toLowerCase().includes(q)
    );
  });
}

/**
 * Pure-logic extraction of the toggle function from ArenaBuilder.
 * Matches the toggle function in the component.
 */
function toggleSelection(
  selected: string[],
  id: string,
  maxAgents: number = 6,
): string[] {
  if (selected.includes(id)) {
    return selected.filter((item) => item !== id);
  }
  if (selected.length >= maxAgents) return selected;
  return [...selected, id];
}

/**
 * Pure-logic extraction of the form validation from ArenaBuilder.
 * Returns true if the submit button should be disabled.
 */
function isSubmitDisabled(selectedCount: number, minAgents: number = 2): boolean {
  return selectedCount < minAgents;
}

// Test fixtures
const mockAgents: ArenaAgentOption[] = [
  { id: 'agent-001', name: 'Socrates', presetName: 'Philosopher', color: '#fff', avatar: undefined },
  { id: 'agent-002', name: 'Einstein', presetName: 'Scientist', color: '#aaa', avatar: undefined },
  { id: 'agent-003', name: 'Ada', presetName: 'Engineer', color: '#bbb', avatar: undefined },
  { id: 'agent-004', name: 'Newton', presetName: 'Scientist', color: '#ccc', avatar: undefined },
  { id: 'agent-005', name: 'Plato', presetName: 'Philosopher', color: '#ddd', avatar: undefined },
  { id: 'agent-006', name: 'Tesla', presetName: 'Inventor', color: '#eee', avatar: undefined },
  { id: 'agent-007', name: 'Curie', presetName: 'Scientist', color: '#fff', avatar: undefined },
  { id: 'agent-008', name: 'Darwin', presetName: null, color: '#111', avatar: undefined },
];

describe('arena-builder filter logic', () => {
  describe('filterAgents', () => {
    it('returns all agents when query is empty', () => {
      const result = filterAgents(mockAgents, '');
      expect(result).toEqual(mockAgents);
    });

    it('returns all agents when query is whitespace only', () => {
      const result = filterAgents(mockAgents, '   ');
      expect(result).toEqual(mockAgents);
    });

    it('filters by agent name (case insensitive)', () => {
      const result = filterAgents(mockAgents, 'socrates');
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Socrates');
    });

    it('filters by agent name with mixed case', () => {
      const result = filterAgents(mockAgents, 'EINSTEIN');
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Einstein');
    });

    it('filters by agent id', () => {
      const result = filterAgents(mockAgents, 'agent-003');
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Ada');
    });

    it('filters by partial id match', () => {
      const result = filterAgents(mockAgents, '00');
      expect(result).toHaveLength(8); // All agents have '00' in their IDs
    });

    it('filters by presetName', () => {
      const result = filterAgents(mockAgents, 'Scientist');
      expect(result).toHaveLength(3);
      expect(result.map((a) => a.name)).toEqual(['Einstein', 'Newton', 'Curie']);
    });

    it('filters by partial name match', () => {
      const result = filterAgents(mockAgents, 'ein');
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Einstein');
    });

    it('returns empty array when no matches found', () => {
      const result = filterAgents(mockAgents, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('handles agents with null presetName', () => {
      const result = filterAgents(mockAgents, 'Darwin');
      expect(result).toHaveLength(1);
      expect(result[0]?.presetName).toBeNull();
    });

    it('does not crash when filtering against null presetName', () => {
      // Searching for something that could match presetName
      const result = filterAgents(mockAgents, 'Custom');
      // Darwin has null presetName, should not crash
      expect(result).toHaveLength(0);
    });

    it('trims query before matching', () => {
      const result = filterAgents(mockAgents, '  Plato  ');
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Plato');
    });
  });
});

describe('arena-builder toggle logic', () => {
  describe('toggleSelection', () => {
    it('adds agent to empty selection', () => {
      const result = toggleSelection([], 'agent-001');
      expect(result).toEqual(['agent-001']);
    });

    it('adds agent to existing selection', () => {
      const result = toggleSelection(['agent-001'], 'agent-002');
      expect(result).toEqual(['agent-001', 'agent-002']);
    });

    it('removes agent when already selected', () => {
      const result = toggleSelection(['agent-001', 'agent-002'], 'agent-001');
      expect(result).toEqual(['agent-002']);
    });

    it('removes last agent from selection', () => {
      const result = toggleSelection(['agent-001'], 'agent-001');
      expect(result).toEqual([]);
    });

    it('preserves order when removing agent', () => {
      const result = toggleSelection(['agent-001', 'agent-002', 'agent-003'], 'agent-002');
      expect(result).toEqual(['agent-001', 'agent-003']);
    });

    it('does not mutate original array when adding', () => {
      const original = ['agent-001'];
      const result = toggleSelection(original, 'agent-002');
      expect(original).toEqual(['agent-001']);
      expect(result).toEqual(['agent-001', 'agent-002']);
    });

    it('does not mutate original array when removing', () => {
      const original = ['agent-001', 'agent-002'];
      const result = toggleSelection(original, 'agent-001');
      expect(original).toEqual(['agent-001', 'agent-002']);
      expect(result).toEqual(['agent-002']);
    });
  });

  describe('max 6 agent cap', () => {
    it('allows selecting up to 6 agents', () => {
      let selected: string[] = [];
      for (let i = 1; i <= 6; i++) {
        selected = toggleSelection(selected, `agent-00${i}`);
      }
      expect(selected).toHaveLength(6);
    });

    it('prevents selecting 7th agent when 6 already selected', () => {
      const sixSelected = ['agent-001', 'agent-002', 'agent-003', 'agent-004', 'agent-005', 'agent-006'];
      const result = toggleSelection(sixSelected, 'agent-007');
      expect(result).toEqual(sixSelected);
      expect(result).toHaveLength(6);
    });

    it('still allows deselecting when at max capacity', () => {
      const sixSelected = ['agent-001', 'agent-002', 'agent-003', 'agent-004', 'agent-005', 'agent-006'];
      const result = toggleSelection(sixSelected, 'agent-003');
      expect(result).toHaveLength(5);
      expect(result).not.toContain('agent-003');
    });

    it('allows selecting new agent after deselecting from max', () => {
      const sixSelected = ['agent-001', 'agent-002', 'agent-003', 'agent-004', 'agent-005', 'agent-006'];
      const afterRemove = toggleSelection(sixSelected, 'agent-003');
      const afterAdd = toggleSelection(afterRemove, 'agent-007');
      expect(afterAdd).toHaveLength(6);
      expect(afterAdd).toContain('agent-007');
      expect(afterAdd).not.toContain('agent-003');
    });

    it('respects custom maxAgents parameter', () => {
      const threeSelected = ['agent-001', 'agent-002', 'agent-003'];
      const result = toggleSelection(threeSelected, 'agent-004', 3);
      expect(result).toEqual(threeSelected);
      expect(result).toHaveLength(3);
    });

    it('handles boundary case of exactly max agents', () => {
      // At exactly 6, should block new additions but allow removals
      const atMax = ['agent-001', 'agent-002', 'agent-003', 'agent-004', 'agent-005', 'agent-006'];

      // Try to add - should fail
      const tryAdd = toggleSelection(atMax, 'agent-008');
      expect(tryAdd).toHaveLength(6);
      expect(tryAdd).not.toContain('agent-008');

      // Try to toggle existing - should remove
      const tryToggle = toggleSelection(atMax, 'agent-001');
      expect(tryToggle).toHaveLength(5);
    });
  });
});

describe('arena-builder form validation', () => {
  describe('isSubmitDisabled', () => {
    it('returns true when 0 agents selected', () => {
      expect(isSubmitDisabled(0)).toBe(true);
    });

    it('returns true when 1 agent selected', () => {
      expect(isSubmitDisabled(1)).toBe(true);
    });

    it('returns false when 2 agents selected', () => {
      expect(isSubmitDisabled(2)).toBe(false);
    });

    it('returns false when more than 2 agents selected', () => {
      expect(isSubmitDisabled(3)).toBe(false);
      expect(isSubmitDisabled(4)).toBe(false);
      expect(isSubmitDisabled(5)).toBe(false);
      expect(isSubmitDisabled(6)).toBe(false);
    });

    it('respects custom minimum agents parameter', () => {
      expect(isSubmitDisabled(2, 3)).toBe(true);
      expect(isSubmitDisabled(3, 3)).toBe(false);
    });
  });

  describe('form validation integration', () => {
    it('submit disabled through selection lifecycle', () => {
      let selected: string[] = [];

      // Start with empty selection - disabled
      expect(isSubmitDisabled(selected.length)).toBe(true);

      // Add first agent - still disabled
      selected = toggleSelection(selected, 'agent-001');
      expect(isSubmitDisabled(selected.length)).toBe(true);

      // Add second agent - enabled
      selected = toggleSelection(selected, 'agent-002');
      expect(isSubmitDisabled(selected.length)).toBe(false);

      // Add more - still enabled
      selected = toggleSelection(selected, 'agent-003');
      expect(isSubmitDisabled(selected.length)).toBe(false);

      // Remove down to 1 - disabled again
      selected = toggleSelection(selected, 'agent-002');
      selected = toggleSelection(selected, 'agent-003');
      expect(isSubmitDisabled(selected.length)).toBe(true);
    });
  });
});

describe('arena-builder initial state', () => {
  /**
   * Pure-logic extraction of initial agent filtering from ArenaBuilder.
   * Only pre-selects agents that exist in the available pool.
   */
  function filterInitialAgentIds(
    initialAgentIds: string[],
    availableAgents: ArenaAgentOption[],
  ): string[] {
    return initialAgentIds.filter((id) => availableAgents.some((a) => a.id === id));
  }

  it('filters out non-existent agents from initial selection', () => {
    const initialIds = ['agent-001', 'nonexistent', 'agent-003'];
    const result = filterInitialAgentIds(initialIds, mockAgents);
    expect(result).toEqual(['agent-001', 'agent-003']);
  });

  it('returns empty array when all initial agents are invalid', () => {
    const initialIds = ['invalid-1', 'invalid-2'];
    const result = filterInitialAgentIds(initialIds, mockAgents);
    expect(result).toEqual([]);
  });

  it('preserves valid initial selection', () => {
    const initialIds = ['agent-002', 'agent-005'];
    const result = filterInitialAgentIds(initialIds, mockAgents);
    expect(result).toEqual(['agent-002', 'agent-005']);
  });

  it('handles empty initial selection', () => {
    const result = filterInitialAgentIds([], mockAgents);
    expect(result).toEqual([]);
  });

  it('handles empty available agents', () => {
    const initialIds = ['agent-001', 'agent-002'];
    const result = filterInitialAgentIds(initialIds, []);
    expect(result).toEqual([]);
  });
});
