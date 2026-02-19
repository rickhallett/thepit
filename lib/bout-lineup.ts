// Shared arena lineup reconstruction from bout JSONB data.

import type { ArenaAgent } from '@/db/schema';
import {
  ARENA_PRESET_ID,
  DEFAULT_AGENT_COLOR,
  type Agent,
  type Preset,
} from '@/lib/presets';
import { DEFAULT_ARENA_TURNS } from '@/lib/turns';

/**
 * Reconstruct an arena-mode Preset from the agentLineup JSONB column.
 * Used by bout replay pages and the bout engine when resuming an arena bout.
 *
 * @param agentLineup - The agent lineup from the bout's JSONB column.
 * @param maxTurns    - Optional turn count override (from the bout row or user selection).
 *                      Falls back to DEFAULT_ARENA_TURNS (6).
 */
export function buildArenaPresetFromLineup(
  agentLineup: ArenaAgent[],
  maxTurns?: number | null,
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
    maxTurns: maxTurns ?? DEFAULT_ARENA_TURNS,
    agents,
  };
}
