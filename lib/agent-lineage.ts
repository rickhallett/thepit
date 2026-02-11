// Shared agent lineage resolution for display purposes.
//
// Walks the parent chain of an agent using pre-built lookup maps,
// producing a list of { id, name } entries for display in the UI.

export type LineageEntry = { id: string; name: string };

/**
 * Build a display lineage from an agent's parentId using pre-computed
 * name and parent lookup maps. Guards against cycles with a seen-set.
 */
export function buildLineage(
  parentId: string | null | undefined,
  nameLookup: Map<string, string>,
  parentLookup: Map<string, string | null>,
  maxDepth = 3,
): LineageEntry[] {
  const lineage: LineageEntry[] = [];
  const seen = new Set<string>();
  let currentParent = parentId ?? null;
  let depth = 0;

  while (currentParent && depth < maxDepth && !seen.has(currentParent)) {
    seen.add(currentParent);
    lineage.push({
      id: currentParent,
      name: nameLookup.get(currentParent) ?? currentParent,
    });
    currentParent = parentLookup.get(currentParent) ?? null;
    depth += 1;
  }

  return lineage;
}
