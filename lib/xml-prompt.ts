// XML prompt builder for LLM-facing prompts.
//
// Wraps prompt content in XML tags to provide:
//   1. Security — structural boundaries prevent prompt injection
//   2. Clarity — models parse tagged sections more reliably
//   3. Parseability — programmatic extraction and validation of prompt parts
//
// All user-controlled content must pass through xmlEscape() before embedding.
// The builder produces string output only — no XML parsing dependency required.

// ---------------------------------------------------------------------------
// Core utilities
// ---------------------------------------------------------------------------

/** Escape XML-special characters in user-controlled content. */
export const xmlEscape = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Wrap content in an XML tag, with optional attributes. */
export const xmlTag = (
  name: string,
  content: string,
  attrs?: Record<string, string>,
): string => {
  const attrStr = attrs
    ? Object.entries(attrs)
        .map(([k, v]) => ` ${k}="${xmlEscape(v)}"`)
        .join('')
    : '';
  return `<${name}${attrStr}>\n${content}\n</${name}>`;
};

/** Wrap content in an inline XML tag (no newlines). */
export const xmlInline = (name: string, content: string): string =>
  `<${name}>${content}</${name}>`;

// ---------------------------------------------------------------------------
// System message builder (bout engine)
// ---------------------------------------------------------------------------

export type SystemMessageParts = {
  /** Safety preamble text. */
  safety: string;
  /** Agent persona / system prompt — may be legacy plain text or already XML. */
  persona: string;
  /** Response format instruction (e.g. "Respond in plain text only."). */
  format: string;
};

/**
 * Build the system message for a bout turn.
 *
 * Wraps each section in XML tags. If the persona is legacy plain text
 * (no XML tags detected), it is wrapped in <persona><instructions>.
 */
export const buildSystemMessage = (parts: SystemMessageParts): string => {
  const sections: string[] = [];

  sections.push(xmlTag('safety', parts.safety.trim()));
  sections.push(wrapPersona(parts.persona));
  sections.push(xmlTag('format', parts.format.trim()));

  return sections.join('\n\n');
};

// ---------------------------------------------------------------------------
// User message builder (bout engine)
// ---------------------------------------------------------------------------

export type UserMessageParts = {
  topic?: string | null;
  lengthLabel: string;
  lengthHint: string;
  formatLabel: string;
  formatHint: string;
  history: string[];
  agentName: string;
  isOpening: boolean;
};

/**
 * Build the user message for a bout turn.
 *
 * User-supplied content (topic, transcript history) is XML-escaped.
 * Structural instructions use unescaped tags so the model can parse them.
 */
export const buildUserMessage = (parts: UserMessageParts): string => {
  const sections: string[] = [];

  // Context block: topic + response parameters
  const contextLines: string[] = [];
  if (parts.topic) {
    contextLines.push(xmlInline('topic', xmlEscape(parts.topic)));
  }
  contextLines.push(
    xmlInline(
      'response-length',
      `${xmlEscape(parts.lengthLabel)} (${xmlEscape(parts.lengthHint)})`,
    ),
  );
  contextLines.push(
    xmlInline(
      'response-format',
      `${xmlEscape(parts.formatLabel)} (${xmlEscape(parts.formatHint)})`,
    ),
  );
  sections.push(xmlTag('context', contextLines.join('\n')));

  if (parts.isOpening) {
    sections.push(
      xmlTag(
        'instruction',
        `Open the debate in character as ${xmlEscape(parts.agentName)}.`,
      ),
    );
  } else {
    // Transcript: each line is escaped to prevent injection
    const transcriptContent = parts.history
      .map((line) => xmlEscape(line))
      .join('\n');
    sections.push(xmlTag('transcript', transcriptContent));
    sections.push(
      xmlTag(
        'instruction',
        `Respond in character as ${xmlEscape(parts.agentName)}.`,
      ),
    );
  }

  return sections.join('\n\n');
};

// ---------------------------------------------------------------------------
// Share-line prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the user-role prompt for share-line generation.
 *
 * The transcript is user-generated content and gets escaped.
 */
export const buildSharePrompt = (clippedTranscript: string): string => {
  const rules = [
    'Captures the most absurd/funny/surprising moment',
    'Makes someone want to click the link',
    'Sounds like a human wrote it (not corporate)',
  ];

  const sections: string[] = [];
  sections.push(
    xmlTag(
      'task',
      'You just witnessed an AI bout. Write a single tweet-length line (max 140 chars).',
    ),
  );
  sections.push(
    xmlTag('rules', rules.map((r) => xmlInline('rule', xmlEscape(r))).join('\n')),
  );
  sections.push(xmlTag('transcript', xmlEscape(clippedTranscript)));

  return sections.join('\n\n');
};

// ---------------------------------------------------------------------------
// Ask The Pit system prompt builder
// ---------------------------------------------------------------------------

export type AskThePitParts = {
  roleDescription: string;
  rules: string[];
  documentation: string;
};

/**
 * Build the system message for the Ask The Pit assistant.
 *
 * Documentation content is XML-escaped since it comes from disk files that
 * could theoretically contain adversarial content.
 */
export const buildAskThePitSystem = (parts: AskThePitParts): string => {
  const sections: string[] = [];

  sections.push(xmlTag('role', xmlEscape(parts.roleDescription.trim())));
  sections.push(
    xmlTag(
      'rules',
      parts.rules.map((r) => xmlInline('rule', xmlEscape(r.trim()))).join('\n'),
    ),
  );
  sections.push(xmlTag('documentation', xmlEscape(parts.documentation)));

  return sections.join('\n\n');
};

// ---------------------------------------------------------------------------
// Persona wrapper (wrap-on-read for legacy prompts)
// ---------------------------------------------------------------------------

/** Detect whether a string already contains XML structure. */
export const hasXmlStructure = (text: string): boolean =>
  /<persona[\s>]/.test(text);

/**
 * Wrap a legacy plain-text persona prompt in XML tags.
 *
 * If the prompt already contains <persona> tags, return it as-is.
 * This enables wrap-on-read for existing database-stored prompts.
 */
export const wrapPersona = (prompt: string): string => {
  if (hasXmlStructure(prompt)) return prompt;

  const trimmed = prompt.trim();

  // Try to split into instructions + rules if the prompt has a "Rules:" section
  const rulesMatch = trimmed.match(
    /^([\s\S]*?)\n\s*Rules:\s*\n([\s\S]*)$/,
  );

  if (rulesMatch) {
    const instructions = rulesMatch[1]!.trim();
    const rulesText = rulesMatch[2]!.trim();
    const ruleItems = rulesText
      .split(/\n/)
      .map((r) => r.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean);

    const parts: string[] = [];
    parts.push(xmlTag('instructions', xmlEscape(instructions)));
    if (ruleItems.length > 0) {
      parts.push(
        xmlTag('rules', ruleItems.map((r) => xmlInline('rule', xmlEscape(r))).join('\n')),
      );
    }
    return xmlTag('persona', parts.join('\n'));
  }

  return xmlTag('persona', xmlTag('instructions', xmlEscape(trimmed)));
};

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

/**
 * Estimate the token count of a string using the ~4 chars/token heuristic.
 * This is intentionally conservative (overestimates) to prevent context overflow.
 * Matches the estimation approach in lib/credits.ts.
 */
export const estimatePromptTokens = (text: string): number =>
  Math.ceil(text.length / 4);

/**
 * Truncate a history array from the front to fit within a token budget.
 *
 * Returns a new array with the most recent turns preserved.
 * Inserts a truncation marker as the first entry when turns are dropped.
 *
 * @param history - Array of "AgentName: text" strings (full bout history)
 * @param systemContent - The system message (included in token budget)
 * @param contextParts - Non-history portions of the user message (topic, instructions, etc.)
 * @param tokenBudget - Maximum input tokens for the model
 * @returns { truncatedHistory, turnsDropped }
 */
export function truncateHistoryToFit(
  history: string[],
  systemContent: string,
  contextParts: string,
  tokenBudget: number,
): { truncatedHistory: string[]; turnsDropped: number } {
  // Fixed overhead: system prompt + non-history user message parts + XML wrapping margin
  const fixedTokens = estimatePromptTokens(systemContent) + estimatePromptTokens(contextParts) + 100;

  const availableTokens = tokenBudget - fixedTokens;
  if (availableTokens <= 0) {
    // No room for any history — return empty with all turns dropped
    return { truncatedHistory: [], turnsDropped: history.length };
  }

  // Work backwards from most recent, accumulating until budget exceeded
  let accumulatedTokens = 0;
  let keepFrom = history.length; // index to start keeping from

  for (let i = history.length - 1; i >= 0; i--) {
    const turnTokens = estimatePromptTokens(xmlEscape(history[i]!));
    if (accumulatedTokens + turnTokens > availableTokens) {
      break;
    }
    accumulatedTokens += turnTokens;
    keepFrom = i;
  }

  const turnsDropped = keepFrom;
  const kept = history.slice(keepFrom);

  if (turnsDropped > 0 && kept.length > 0) {
    const marker = `[${turnsDropped} earlier turn${turnsDropped > 1 ? 's' : ''} truncated for context limit]`;
    return { truncatedHistory: [marker, ...kept], turnsDropped };
  }

  return { truncatedHistory: kept, turnsDropped };
}

// ---------------------------------------------------------------------------
// Structured agent prompt builder (XML version)
// ---------------------------------------------------------------------------

export type XmlAgentPromptFields = {
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
 * Build a structured agent persona prompt in XML format.
 *
 * Replaces the plain-text label:value format from agent-prompts.ts.
 * All field values are escaped since they come from user input.
 */
export const buildXmlAgentPrompt = (fields: XmlAgentPromptFields): string => {
  const parts: string[] = [];

  const archetype = fields.archetype?.trim();
  const identity = archetype
    ? `You are ${xmlEscape(fields.name)}, a ${xmlEscape(archetype)}.`
    : `You are ${xmlEscape(fields.name)}.`;
  parts.push(xmlInline('identity', identity));

  const addField = (tag: string, value?: string | null) => {
    const v = value?.trim();
    if (v) parts.push(xmlInline(tag, xmlEscape(v)));
  };

  addField('tone', fields.tone);
  addField('speech-pattern', fields.speechPattern);
  addField('opening-move', fields.openingMove);
  addField('signature-move', fields.signatureMove);
  addField('weakness', fields.weakness);
  addField('goal', fields.goal);
  addField('fears', fields.fears);

  const quirks = fields.quirks?.map((q) => q.trim()).filter(Boolean);
  if (quirks && quirks.length > 0) {
    parts.push(
      xmlTag('quirks', quirks.map((q) => xmlInline('quirk', xmlEscape(q))).join('\n')),
    );
  }

  addField('custom-instructions', fields.customInstructions);

  return xmlTag('persona', parts.join('\n'));
};
