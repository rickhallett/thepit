// Agent detail page data: fetches a single agent's full snapshot plus its
// clone lineage (up to maxDepth generations of parent agents). Falls back to
// preset definitions when the agent isn't yet in the database.

import { requireDb } from '@/db';
import { agents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { AgentSnapshot } from '@/lib/agent-registry';
import { findPresetAgent, presetToSnapshot, rowToSnapshot } from '@/lib/agent-mapper';

type AgentLineageEntry = {
  id: string;
  name: string;
};

export type AgentDetail = AgentSnapshot & {
  lineage: AgentLineageEntry[];
};

export const getAgentDetail = async (
  agentId: string,
  maxDepth = 3,
): Promise<AgentDetail | null> => {
  const db = requireDb();
  const [row] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  let snapshot: AgentSnapshot | null = null;
  if (row) {
    const presetMatch = findPresetAgent(row.id);
    snapshot = rowToSnapshot(row, presetMatch);
  } else {
    const presetMatch = findPresetAgent(agentId);
    snapshot = presetMatch ? presetToSnapshot(agentId, presetMatch) : null;
  }

  if (!snapshot) return null;

  const lineage: AgentLineageEntry[] = [];
  let currentParent = snapshot.parentId;
  let depth = 0;

  while (currentParent && depth < maxDepth) {
    const [parentRow] = await db
      .select({ id: agents.id, name: agents.name, parentId: agents.parentId })
      .from(agents)
      .where(eq(agents.id, currentParent))
      .limit(1);

    if (parentRow) {
      lineage.push({ id: parentRow.id, name: parentRow.name });
      currentParent = parentRow.parentId ?? null;
    } else {
      /* Parent not in DB - try preset definitions (preset agents are not persisted) */
      const presetMatch = findPresetAgent(currentParent);
      if (presetMatch) {
        lineage.push({ id: currentParent, name: presetMatch.agent.name });
      }
      break; /* Preset agents have no parentId - end of chain */
    }
    depth += 1;
  }

  return { ...snapshot, lineage };
};
