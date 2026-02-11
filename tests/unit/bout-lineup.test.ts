import { describe, expect, it } from 'vitest';
import { buildArenaPresetFromLineup } from '@/lib/bout-lineup';
import { ARENA_PRESET_ID, DEFAULT_AGENT_COLOR } from '@/lib/presets';

describe('buildArenaPresetFromLineup', () => {
  it('creates a valid arena preset from agent lineup', () => {
    const lineup = [
      { id: 'a1', name: 'Agent 1', systemPrompt: 'Be Agent 1', color: '#ff0000', avatar: 'star' },
      { id: 'a2', name: 'Agent 2', systemPrompt: 'Be Agent 2' },
    ];

    const preset = buildArenaPresetFromLineup(lineup);

    expect(preset.id).toBe(ARENA_PRESET_ID);
    expect(preset.name).toBe('Arena Mode');
    expect(preset.tier).toBe('free');
    expect(preset.agents).toHaveLength(2);
    expect(preset.agents[0].id).toBe('a1');
    expect(preset.agents[0].color).toBe('#ff0000');
    expect(preset.agents[0].avatar).toBe('star');
  });

  it('applies DEFAULT_AGENT_COLOR when agent has no color', () => {
    const lineup = [
      { id: 'a1', name: 'Agent 1', systemPrompt: 'prompt' },
    ];

    const preset = buildArenaPresetFromLineup(lineup);
    expect(preset.agents[0].color).toBe(DEFAULT_AGENT_COLOR);
  });

  it('preserves undefined avatar', () => {
    const lineup = [
      { id: 'a1', name: 'Agent 1', systemPrompt: 'prompt' },
    ];

    const preset = buildArenaPresetFromLineup(lineup);
    expect(preset.agents[0].avatar).toBeUndefined();
  });
});
