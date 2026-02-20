import { describe, expect, it } from 'vitest';
import {
  ALL_PRESETS,
  FREE_PRESETS,
  PREMIUM_PRESETS,
  RESEARCH_PRESETS,
  PRESET_BY_ID,
  ARENA_PRESET_ID,
  getPresetById,
} from '@/lib/presets';

describe('presets', () => {
  it('ARENA_PRESET_ID is "arena"', () => {
    expect(ARENA_PRESET_ID).toBe('arena');
  });

  it('FREE_PRESETS has 11 presets', () => {
    expect(FREE_PRESETS).toHaveLength(11);
  });

  it('ALL_PRESETS combines free and premium', () => {
    expect(ALL_PRESETS.length).toBe(FREE_PRESETS.length + PREMIUM_PRESETS.length);
  });

  it('every preset has required fields', () => {
    for (const preset of ALL_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.agents.length).toBeGreaterThanOrEqual(2);
      expect(preset.maxTurns).toBeGreaterThan(0);
      expect(['free', 'premium']).toContain(preset.tier);
    }
  });

  it('every agent has a non-empty systemPrompt', () => {
    for (const preset of ALL_PRESETS) {
      for (const agent of preset.agents) {
        expect(agent.systemPrompt).toBeTruthy();
        expect(agent.name).toBeTruthy();
        expect(agent.id).toBeTruthy();
      }
    }
  });

  it('PRESET_BY_ID contains all user-facing presets', () => {
    expect(PRESET_BY_ID.size).toBe(ALL_PRESETS.length + RESEARCH_PRESETS.length);
    for (const preset of ALL_PRESETS) {
      expect(PRESET_BY_ID.has(preset.id)).toBe(true);
    }
  });

  it('PRESET_BY_ID contains all research presets', () => {
    for (const preset of RESEARCH_PRESETS) {
      expect(PRESET_BY_ID.has(preset.id)).toBe(true);
    }
  });

  it('getPresetById returns correct preset', () => {
    const preset = getPresetById('darwin-special');
    expect(preset).toBeDefined();
    expect(preset!.name).toBe('The Darwin Special');
  });

  it('getPresetById returns undefined for unknown ID', () => {
    expect(getPresetById('nonexistent')).toBeUndefined();
  });
});
