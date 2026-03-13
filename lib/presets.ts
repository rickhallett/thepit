// Preset definitions and normalization for The Pit's debate scenarios.
//
// Presets come from two sources:
//   - Free presets:    Hand-authored JSON files in /presets/ (11 scenarios)
//   - Premium presets: Bundled packs (presetsTop5, presetsRemaining6) with
//                      richer personas and higher model tiers
//
// Raw JSON uses snake_case (preset_id, system_prompt). The normalizePreset()
// function converts to camelCase for internal use.

import { z } from 'zod/v4';
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

type AlternatePresetAgent = {
  name: string;
  role: string;
  systemPrompt: string;
};

type AlternatePreset = {
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

// ---------------------------------------------------------------------------
// Zod validation schemas for preset JSON files
// ---------------------------------------------------------------------------

/** Schema for research metadata in research presets. */
export const researchMetaSchema = z.object({
  experiment: z.string(),
  hypothesis: z.array(z.string()),
  belief_statement: z.string(),
  condition: z.string(),
  notes: z.string(),
});

/** Schema for raw agent definition in preset JSON. */
export const rawAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  system_prompt: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'color must be a valid hex color'),
  avatar: z.string().optional(),
});

/** Schema for raw preset JSON files (free presets). */
export const rawPresetSchema = z.object({
  preset_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  agents: z.array(rawAgentSchema).min(1),
  max_turns: z.object({
    standard: z.number().int().positive().optional(),
    juiced: z.number().int().positive().optional(),
    unleashed: z.number().int().positive().optional(),
  }).optional(),
  requires_input: z.boolean().optional(),
  input_label: z.string().optional(),
  input_examples: z.array(z.string()).optional(),
  turn_order: z.string().optional(),
  launch_day_hero: z.boolean().optional(),
  featured: z.boolean().optional(),
  special_event: z.boolean().optional(),
  research: researchMetaSchema.optional(),
  note: z.string().optional(),
});

/** Schema for alternate agent definition in premium preset packs. */
export const alternatePresetAgentSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  systemPrompt: z.string().min(1),
});

/** Schema for alternate preset format (premium preset packs). */
export const alternatePresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  premise: z.string().min(1),
  tone: z.string().min(1),
  botCount: z.number().int().positive(),
  maxMessages: z.number().int().positive(),
  msgMaxLength: z.number().int().positive(),
  agents: z.array(alternatePresetAgentSchema).min(1),
});

/** Schema for preset index entry. */
export const presetIndexEntrySchema = z.object({
  id: z.string().min(1),
  file: z.string().min(1),
  hero: z.boolean(),
  agents: z.number().int().positive(),
  requires_input: z.boolean().optional(),
});

/** Schema for presets/index.json. */
export const presetIndexSchema = z.object({
  version: z.string().min(1),
  presets: z.array(presetIndexEntrySchema).min(1),
});

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
    6
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
    color: PREMIUM_AGENT_COLORS[index % PREMIUM_AGENT_COLORS.length] ?? '#d7ff3f',
  })),
  tier: 'premium',
  group: groupLabel,
  inputLabel: 'Add context (optional)',
  inputExamples: ['Add a topic or constraint'],
});

const FREE_PRESETS: Preset[] = RAW_PRESETS.map(normalizePreset);

const PREMIUM_PRESETS: Preset[] = [
  ...(presetsTop5 as AlternatePreset[]).map((preset) =>
    normalizePackPreset(preset, 'top5', 'Top 5 Pack'),
  ),
  ...(presetsRemaining6 as AlternatePreset[]).map((preset) =>
    normalizePackPreset(preset, 'remaining6', 'Remaining 6 Pack'),
  ),
];

/** Research-only presets. Not shown in the user-facing grid. */
const RESEARCH_PRESETS: Preset[] = RAW_RESEARCH_PRESETS.map(normalizePreset);

/** All user-facing presets (free + premium). Excludes research-only presets. */
export const ALL_PRESETS: Preset[] = [...FREE_PRESETS, ...PREMIUM_PRESETS];

/**
 * O(1) preset lookup by ID.
 * Includes research presets so the bout engine can resolve them,
 * even though they don't appear in the user-facing preset grid.
 */
const PRESET_BY_ID: Map<string, Preset> = new Map(
  [...ALL_PRESETS, ...RESEARCH_PRESETS].map((preset) => [preset.id, preset]),
);

/**
 * Get a preset by ID with O(1) lookup.
 * @returns The preset or undefined if not found.
 */
export const getPresetById = (id: string): Preset | undefined => {
  return PRESET_BY_ID.get(id);
};
