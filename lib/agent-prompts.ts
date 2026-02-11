// Structured prompt composition for AI agent personas.
//
// Rather than raw freeform system prompts, agents are defined via typed fields
// (archetype, tone, quirks, etc.) that compose into an XML-structured system
// prompt string. This structured approach gives us pre-labelled taxonomy for
// research analysis and lets users tweak individual personality facets when
// cloning agents.
//
// The composed prompt is consumed by the bout orchestrator (app/api/run-bout).
// XML structure provides clear section boundaries for the model to parse,
// escaping of user-supplied content, and resistance to prompt injection.

import { buildXmlAgentPrompt } from '@/lib/xml-prompt';

export type AgentPromptFields = {
  name: string;
  archetype?: string | null;
  tone?: string | null;
  quirks?: string[] | null;
  speechPattern?: string | null;
  openingMove?: string | null;
  signatureMove?: string | null;
  weakness?: string | null;
  goal?: string | null;
  fears?: string | null;
  customInstructions?: string | null;
};

/**
 * Compose typed agent fields into an XML-structured system prompt.
 *
 * Output is a <persona> XML block consumed by the bout engine's
 * buildSystemMessage(), which wraps it alongside safety and format tags.
 */
export const buildStructuredPrompt = (fields: AgentPromptFields): string =>
  buildXmlAgentPrompt(fields);
