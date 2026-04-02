// Configuration for the "Ask the Pit" feature: an AI assistant that can
// answer questions about the platform by reading project documentation.
//
// This file is imported by app/layout.tsx (Server Component). It must NOT
// import lib/env.ts because Turbopack may pull the transitive dependency
// into client chunks, causing env validation to fire in the browser.

import { DEFAULT_FREE_MODEL } from '@/lib/model-registry';

export const ASK_THE_PIT_ENABLED = process.env.ASK_THE_PIT_ENABLED === 'true';

export const ASK_THE_PIT_DOCS = [
  'docs/public/ask-the-pit-knowledge.md',
];

export const ASK_THE_PIT_MODEL =
  process.env.ASK_THE_PIT_MODEL ?? DEFAULT_FREE_MODEL;

export const ASK_THE_PIT_MAX_TOKENS = 2_000;
