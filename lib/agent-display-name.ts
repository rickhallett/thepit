/**
 * Extracts a human-readable display name from agent IDs.
 *
 * Agent IDs can be:
 *   - Simple names: "the nihilist" → "The Nihilist"
 *   - Compound IDs: "preset:darwin-special:conspiracy" → "Conspiracy"
 *   - Kebab-case: "charles-darwin" → "Charles Darwin"
 */

function titleCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getAgentDisplayName(id: string): string {
  if (!id) return '';

  // If compound ID with colons, take the last meaningful segment
  if (id.includes(':')) {
    const segments = id.split(':').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    return titleCase(lastSegment);
  }

  // Otherwise, just title-case the whole thing
  return titleCase(id);
}

/**
 * Returns both short display name and full ID for tooltips/modals.
 */
export function getAgentNameParts(id: string): { display: string; full: string } {
  return {
    display: getAgentDisplayName(id),
    full: id,
  };
}
