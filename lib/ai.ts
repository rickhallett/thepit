import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const aiModel = anthropic(
  process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
);
