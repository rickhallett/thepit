// URL encoding helpers for agent IDs (which may contain colons in preset
// composite IDs like "preset:roast-battle:judge").

export const encodeAgentId = (agentId: string) => encodeURIComponent(agentId);

export const decodeAgentId = (agentId: string) => {
  try {
    return decodeURIComponent(agentId).replace(/;/g, ':');
  } catch {
    return agentId.replace(/;/g, ':');
  }
};

export const buildAgentDetailHref = (agentId: string) =>
  `/agents/${encodeAgentId(agentId)}`;
