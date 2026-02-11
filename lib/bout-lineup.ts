// Shared arena lineup reconstruction from bout JSONB data.

import type { ArenaAgent } from '@/db/schema';
import {
  ARENA_PRESET_ID,
  DEFAULT_AGENT_COLOR,
  DEFAULT_ARENA_MAX_TURNS,
  type Agent,
  type Preset,
} from '@/lib/presets';

/**
 * Reconstruct an arena-mode Preset from the agentLineup JSONB column.
 * Used by bout replay pages and the bout engine when resuming an arena bout.
 */
export function buildArenaPresetFromLineup(
  agentLineup: ArenaAgent[],
): Preset {
  const agents: Agent[] = agentLineup.map((agent) => ({
    id: agent.id,
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    color: agent.color ?? DEFAULT_AGENT_COLOR,
    avatar: agent.avatar,
  }));
  return {
    id: ARENA_PRESET_ID,
    name: 'Arena Mode',
    description: 'Custom lineup',
    tier: 'free',
    maxTurns: DEFAULT_ARENA_MAX_TURNS,
    agents,
  };
}
