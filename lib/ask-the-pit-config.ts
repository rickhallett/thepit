// Configuration for the "Ask the Pit" feature: an AI assistant that can
// answer questions about the platform by reading project documentation.

export const ASK_THE_PIT_ENABLED = process.env.ASK_THE_PIT_ENABLED === 'true';

export const ASK_THE_PIT_DOCS = [
  'README.md',
  'AGENTS.md',
];

import { FREE_MODEL_ID } from '@/lib/ai';

export const ASK_THE_PIT_MODEL = process.env.ASK_THE_PIT_MODEL ?? FREE_MODEL_ID;

export const ASK_THE_PIT_MAX_TOKENS = 2_000;
