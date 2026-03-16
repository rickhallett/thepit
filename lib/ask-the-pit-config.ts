// Configuration for the "Ask the Pit" feature: an AI assistant that can
// answer questions about the platform by reading project documentation.

import { FREE_MODEL_ID } from '@/lib/ai';
import { env } from '@/lib/env';

export const ASK_THE_PIT_ENABLED = env.ASK_THE_PIT_ENABLED;

export const ASK_THE_PIT_DOCS = [
  'README.md',
  'AGENTS.md',
];

export const ASK_THE_PIT_MODEL = env.ASK_THE_PIT_MODEL ?? FREE_MODEL_ID;

export const ASK_THE_PIT_MAX_TOKENS = 2_000;
