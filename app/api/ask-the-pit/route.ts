import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

import {
  ASK_THE_PIT_ENABLED,
  ASK_THE_PIT_DOCS,
  ASK_THE_PIT_MODEL,
  ASK_THE_PIT_MAX_TOKENS,
} from '@/lib/ask-the-pit-config';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const SYSTEM_PROMPT_PREFIX =
  "You are The Pit's assistant. Answer questions about the platform based on the documentation provided. Be concise and direct. If you don't know, say so.";

function loadDocs(): string {
  return ASK_THE_PIT_DOCS.map((docPath) => {
    try {
      const fullPath = join(process.cwd(), docPath);
      return readFileSync(fullPath, 'utf-8');
    } catch {
      return `[Could not load ${docPath}]`;
    }
  }).join('\n\n---\n\n');
}

export async function POST(req: Request) {
  if (!ASK_THE_PIT_ENABLED) {
    return new Response('Ask The Pit is not enabled.', { status: 404 });
  }

  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(
    { name: 'ask-the-pit', maxRequests: 5, windowMs: 60 * 1000 },
    clientId,
  );
  if (!rateCheck.success) {
    return new Response('Rate limit exceeded. Max 5 requests per minute.', {
      status: 429,
    });
  }

  let payload: { message?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const message =
    typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message) {
    return new Response('Missing message.', { status: 400 });
  }

  const docs = loadDocs();
  const systemPrompt = `${SYSTEM_PROMPT_PREFIX}\n\n--- Documentation ---\n\n${docs}`;

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const result = streamText({
    model: anthropic(ASK_THE_PIT_MODEL),
    maxOutputTokens: ASK_THE_PIT_MAX_TOKENS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
  });

  return result.toTextStreamResponse();
}
