// Preset definitions and normalization for THE PIT's debate scenarios.
//
// Presets come from two sources:
//   - Free presets:    Hand-authored JSON files in /presets/ (11 scenarios)
//   - Premium presets: Bundled packs (presetsTop5, presetsRemaining6) with
//                      richer personas and higher model tiers
//
// Raw JSON uses snake_case (preset_id, system_prompt). The normalizePreset()
// function converts to camelCase for internal use.

import darwinSpecial from '@/presets/darwin-special.json';
import firstContact from '@/presets/first-contact.json';
import flatshare from '@/presets/flatshare.json';
import glovesOff from '@/presets/gloves-off.json';
import lastSupper from '@/presets/last-supper.json';
import mansion from '@/presets/mansion.json';
import onTheCouch from '@/presets/on-the-couch.json';
import roastBattle from '@/presets/roast-battle.json';
import sharkPit from '@/presets/shark-pit.json';
import summit from '@/presets/summit.json';
import writersRoom from '@/presets/writers-room.json';
import reaBaseline from '@/presets/rea-baseline.json';
import presetsTop5 from '@/presets/presets-top5.json';
import presetsRemaining6 from '@/presets/presets-remaining6.json';

// Sentinel value used as presetId when users build a custom agent lineup
// instead of selecting a curated preset. Arena bouts store their lineup in
// bouts.agentLineup (JSONB) rather than referencing a preset definition.
export const ARENA_PRESET_ID = 'arena';

/** Fallback agent color when a preset/agent doesn't specify one. */
export const DEFAULT_AGENT_COLOR = '#f8fafc';

/**
 * Default max turns for arena-mode bouts.
 * @deprecated Use DEFAULT_ARENA_TURNS from '@/lib/turns' instead.
 */
export const DEFAULT_ARENA_MAX_TURNS = 6;

export type PresetTier = 'free' | 'premium';

export type Agent = {
  id: string;
  name: string;
  systemPrompt: string;
  color: string;
  avatar?: string;
};

export type Preset = {
  id: string;
  name: string;
  description?: string;
  agents: Agent[];
  maxTurns: number;
  requiresInput?: boolean;
  inputLabel?: string;
  inputExamples?: string[];
  tier: PresetTier;
  group?: string;
};

export type AlternatePresetAgent = {
  name: string;
  role: string;
  systemPrompt: string;
};

export type AlternatePreset = {
  id: string;
  name: string;
  premise: string;
  tone: string;
  botCount: number;
  maxMessages: number;
  msgMaxLength: number;
  agents: AlternatePresetAgent[];
};

type RawAgent = {
  id: string;
  name: string;
  system_prompt: string;
  color: string;
  avatar?: string;
};

type RawPreset = {
  preset_id: string;
  name: string;
  description?: string;
  agents: RawAgent[];
  max_turns?: {
    standard?: number;
    juiced?: number;
    unleashed?: number;
  };
  requires_input?: boolean;
  input_label?: string;
  input_examples?: string[];
};

const RAW_PRESETS: RawPreset[] = [
  darwinSpecial,
  lastSupper,
  roastBattle,
  sharkPit,
  onTheCouch,
  glovesOff,
  firstContact,
  writersRoom,
  mansion,
  summit,
  flatshare,
];

// Research-only presets: resolvable by the bout engine (getPresetById) and
// pitstorm hypothesis runner, but excluded from the user-facing preset grid.
const RAW_RESEARCH_PRESETS: RawPreset[] = [
  reaBaseline,
];

const PREMIUM_AGENT_COLORS = [
  '#00D4FF',
  '#FF4444',
  '#FFD700',
  '#32CD32',
  '#FF69B4',
  '#9370DB',
  '#C0C0C0',
  '#FF6347',
  '#8B4513',
  '#2F4F4F',
  '#20B2AA',
  '#DAA520',
];

const resolveMaxTurns = (preset: RawPreset) => {
  return (
    preset.max_turns?.standard ??
    preset.max_turns?.juiced ??
    preset.max_turns?.unleashed ??
    12
  );
};

const normalizePreset = (preset: RawPreset): Preset => ({
  id: preset.preset_id,
  name: preset.name,
  description: preset.description,
  maxTurns: resolveMaxTurns(preset),
  requiresInput: preset.requires_input,
  inputLabel: preset.input_label,
  inputExamples: preset.input_examples,
  agents: preset.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    systemPrompt: agent.system_prompt,
    color: agent.color,
    avatar: agent.avatar,
  })),
  tier: 'free',
});

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const normalizePackPreset = (
  preset: AlternatePreset,
  group: string,
  groupLabel: string,
): Preset => ({
  id: `premium-${group}-${preset.id}`,
  name: preset.name,
  description: preset.premise,
  maxTurns: preset.maxMessages,
  agents: preset.agents.map((agent, index) => ({
    id: slugify(agent.name) || `agent-${index + 1}`,
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    color: PREMIUM_AGENT_COLORS[index % PREMIUM_AGENT_COLORS.length],
  })),
  tier: 'premium',
  group: groupLabel,
  inputLabel: 'Add context (optional)',
  inputExamples: ['Add a topic or constraint'],
});

export const FREE_PRESETS: Preset[] = RAW_PRESETS.map(normalizePreset);

export const PREMIUM_PRESETS: Preset[] = [
  ...(presetsTop5 as AlternatePreset[]).map((preset) =>
    normalizePackPreset(preset, 'top5', 'Top 5 Pack'),
  ),
  ...(presetsRemaining6 as AlternatePreset[]).map((preset) =>
    normalizePackPreset(preset, 'remaining6', 'Remaining 6 Pack'),
  ),
];

/** Research-only presets. Not shown in the user-facing grid. */
export const RESEARCH_PRESETS: Preset[] = RAW_RESEARCH_PRESETS.map(normalizePreset);

/** All user-facing presets (free + premium). Excludes research-only presets. */
export const ALL_PRESETS: Preset[] = [...FREE_PRESETS, ...PREMIUM_PRESETS];

export const PRESETS: Preset[] = ALL_PRESETS;

/**
 * O(1) preset lookup by ID.
 * Includes research presets so the bout engine can resolve them,
 * even though they don't appear in the user-facing preset grid.
 */
export const PRESET_BY_ID: Map<string, Preset> = new Map(
  [...ALL_PRESETS, ...RESEARCH_PRESETS].map((preset) => [preset.id, preset]),
);

/**
 * Get a preset by ID with O(1) lookup.
 * @returns The preset or undefined if not found.
 */
export const getPresetById = (id: string): Preset | undefined => {
  return PRESET_BY_ID.get(id);
};
