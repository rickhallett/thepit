import { describe, expect, it } from 'vitest';
import {
  ALL_PRESETS,
  ARENA_PRESET_ID,
  getPresetById,
} from '@/lib/presets';

describe('presets', () => {
  it('ARENA_PRESET_ID is "arena"', () => {
    expect(ARENA_PRESET_ID).toBe('arena');
  });

  it('ALL_PRESETS has both free and premium presets', () => {
    const freeCount = ALL_PRESETS.filter((p) => p.tier === 'free').length;
    const premiumCount = ALL_PRESETS.filter((p) => p.tier === 'premium').length;
    expect(freeCount).toBe(11);
    expect(premiumCount).toBeGreaterThan(0);
    expect(ALL_PRESETS.length).toBe(freeCount + premiumCount);
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

  it('getPresetById resolves user-facing presets', () => {
    for (const preset of ALL_PRESETS) {
      expect(getPresetById(preset.id)).toBeDefined();
    }
  });

  it('getPresetById resolves research presets', () => {
    // Research presets are not in ALL_PRESETS but are resolvable by ID
    const reaBaseline = getPresetById('rea-baseline');
    expect(reaBaseline).toBeDefined();
    expect(reaBaseline!.id).toBe('rea-baseline');
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
