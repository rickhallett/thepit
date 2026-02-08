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

const formatLine = (label: string, value?: string | null) => {
  if (!value) return null;
  return `${label}: ${value}`;
};

const formatList = (label: string, values?: string[] | null) => {
  if (!values || values.length === 0) return null;
  return `${label}: ${values.join(', ')}`;
};

export const buildStructuredPrompt = (fields: AgentPromptFields) => {
  const lines: string[] = [];
  const archetype = fields.archetype?.trim();
  const identity = archetype
    ? `You are ${fields.name}, a ${archetype}.`
    : `You are ${fields.name}.`;
  lines.push(identity);

  const toneLine = formatLine('Tone', fields.tone?.trim() || null);
  if (toneLine) lines.push(toneLine);

  const quirksLine = formatList(
    'Quirks',
    fields.quirks?.map((quirk) => quirk.trim()).filter(Boolean) || null,
  );
  if (quirksLine) lines.push(quirksLine);

  const speechLine = formatLine(
    'Speech pattern',
    fields.speechPattern?.trim() || null,
  );
  if (speechLine) lines.push(speechLine);

  const openingLine = formatLine(
    'Opening move',
    fields.openingMove?.trim() || null,
  );
  if (openingLine) lines.push(openingLine);

  const signatureLine = formatLine(
    'Signature move',
    fields.signatureMove?.trim() || null,
  );
  if (signatureLine) lines.push(signatureLine);

  const weaknessLine = formatLine(
    'Weakness',
    fields.weakness?.trim() || null,
  );
  if (weaknessLine) lines.push(weaknessLine);

  const goalLine = formatLine('Goal', fields.goal?.trim() || null);
  if (goalLine) lines.push(goalLine);

  const fearLine = formatLine('Fears', fields.fears?.trim() || null);
  if (fearLine) lines.push(fearLine);

  const customLine = formatLine(
    'Additional instructions',
    fields.customInstructions?.trim() || null,
  );
  if (customLine) lines.push(customLine);

  return lines.join('\n');
};
