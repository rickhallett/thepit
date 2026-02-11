import { nanoid } from 'nanoid';
import { eq, and, sql } from 'drizzle-orm';

import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { log } from '@/lib/logger';
import { withLogging } from '@/lib/api-logging';
import { agents } from '@/db/schema';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  buildAgentManifest,
  hashAgentManifest,
  hashAgentPrompt,
} from '@/lib/agent-dna';
import { buildStructuredPrompt } from '@/lib/agent-prompts';
import { attestAgent, EAS_ENABLED } from '@/lib/eas';
import { resolveResponseFormat } from '@/lib/response-formats';
import { resolveResponseLength } from '@/lib/response-lengths';
import { ensureUserRecord } from '@/lib/users';
import { SUBSCRIPTIONS_ENABLED, canCreateAgent } from '@/lib/tier';

export const runtime = 'nodejs';

/** Reject URLs, script tags, and event handlers in free-text fields. */
const UNSAFE_PATTERN =
  /https?:\/\/|www\.|<script|javascript:|on\w+\s*=|data:text\/html/i;

type TextFieldLimit = { maxLen: number; label: string };

const TEXT_FIELD_LIMITS: Record<string, TextFieldLimit> = {
  archetype: { maxLen: 200, label: 'Archetype' },
  tone: { maxLen: 200, label: 'Tone' },
  speechPattern: { maxLen: 200, label: 'Speech pattern' },
  openingMove: { maxLen: 500, label: 'Opening move' },
  signatureMove: { maxLen: 500, label: 'Signature move' },
  weakness: { maxLen: 500, label: 'Weakness' },
  goal: { maxLen: 500, label: 'Goal' },
  fears: { maxLen: 500, label: 'Fears' },
  customInstructions: { maxLen: 5000, label: 'Custom instructions' },
};

/** Validate a text field against length and safety constraints. Returns an error message or null. */
function validateTextField(
  value: string | undefined | null,
  limit: TextFieldLimit,
): string | null {
  if (!value) return null;
  if (value.length > limit.maxLen) {
    return `${limit.label} must be ${limit.maxLen} characters or fewer.`;
  }
  if (UNSAFE_PATTERN.test(value)) {
    return `${limit.label} must not contain URLs or scripts.`;
  }
  return null;
}

/** Create a new agent with tier-based slot limits and content validation. */
export const POST = withLogging(async function POST(req: Request) {
  let payload: {
    name?: string;
    systemPrompt?: string;
    presetId?: string;
    tier?: 'free' | 'premium' | 'custom';
    model?: string;
    responseLength?: string;
    responseFormat?: string;
    parentId?: string;
    archetype?: string;
    tone?: string;
    quirks?: string[];
    speechPattern?: string;
    openingMove?: string;
    signatureMove?: string;
    weakness?: string;
    goal?: string;
    fears?: string;
    customInstructions?: string;
    clientManifestHash?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) {
    return new Response('Missing name.', { status: 400 });
  }
  if (name.length > 80) {
    return new Response('Name must be 80 characters or fewer.', { status: 400 });
  }
  if (/https?:\/\/|www\./i.test(name)) {
    return new Response('Name must not contain URLs.', { status: 400 });
  }

  // Validate all structured text fields for length and unsafe patterns
  for (const [field, limit] of Object.entries(TEXT_FIELD_LIMITS)) {
    const value = payload[field as keyof typeof payload];
    if (typeof value === 'string') {
      const error = validateTextField(value, limit);
      if (error) return new Response(error, { status: 400 });
    }
  }

  const rawPrompt =
    typeof payload.systemPrompt === 'string' ? payload.systemPrompt.trim() : '';
  const customInstructions =
    typeof payload.customInstructions === 'string'
      ? payload.customInstructions.trim()
      : rawPrompt || null;
  const quirks = Array.isArray(payload.quirks)
    ? payload.quirks.map((quirk) => quirk.trim()).filter(Boolean)
    : [];

  // Validate quirks: max 10 items, 100 chars each
  if (quirks.length > 10) {
    return new Response('Maximum 10 quirks allowed.', { status: 400 });
  }
  for (const quirk of quirks) {
    if (quirk.length > 100) {
      return new Response('Each quirk must be 100 characters or fewer.', { status: 400 });
    }
    if (UNSAFE_PATTERN.test(quirk)) {
      return new Response('Quirks must not contain URLs or scripts.', { status: 400 });
    }
  }
  const hasStructuredFields = Boolean(
    payload.archetype ||
      payload.tone ||
      quirks.length > 0 ||
      payload.speechPattern ||
      payload.openingMove ||
      payload.signatureMove ||
      payload.weakness ||
      payload.goal ||
      payload.fears ||
      payload.customInstructions,
  );
  const systemPrompt = hasStructuredFields
    ? buildStructuredPrompt({
        name,
        archetype: payload.archetype,
        tone: payload.tone,
        quirks,
        speechPattern: payload.speechPattern,
        openingMove: payload.openingMove,
        signatureMove: payload.signatureMove,
        weakness: payload.weakness,
        goal: payload.goal,
        fears: payload.fears,
        customInstructions,
      })
    : rawPrompt;

  if (!systemPrompt) {
    return new Response('Missing prompt.', { status: 400 });
  }

  const lengthConfig = resolveResponseLength(payload.responseLength);
  const formatConfig = resolveResponseFormat(payload.responseFormat);
  const { userId } = await auth();

  // Require authentication to prevent spam/DoS via unauthenticated agent creation
  if (!userId) {
    return new Response('Sign in required.', { status: 401 });
  }

  const rateCheck = checkRateLimit(
    { name: 'agent-creation', maxRequests: 10, windowMs: 60 * 60 * 1000 },
    userId,
  );
  if (!rateCheck.success) {
    return new Response('Rate limit exceeded. Max 10 agents per hour.', { status: 429 });
  }

  await ensureUserRecord(userId);

  // Tier-based agent slot limit
  if (SUBSCRIPTIONS_ENABLED) {
    const db = requireDb();
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(
        and(
          eq(agents.ownerId, userId),
          eq(agents.archived, false),
        ),
      );
    const currentCount = countResult?.count ?? 0;
    const slotCheck = await canCreateAgent(userId, currentCount);
    if (!slotCheck.allowed) {
      return new Response(slotCheck.reason, { status: 402 });
    }
  }
  const agentId = nanoid();

  const manifest = buildAgentManifest({
    agentId,
    name,
    systemPrompt,
    presetId: payload.presetId ?? null,
    tier: payload.tier ?? 'custom',
    model: payload.model ?? null,
    responseLength: lengthConfig.id,
    responseFormat: formatConfig.id,
    parentId: payload.parentId ?? null,
    ownerId: userId,
  });

  const [promptHash, manifestHash] = await Promise.all([
    hashAgentPrompt(manifest.systemPrompt),
    hashAgentManifest(manifest),
  ]);

  if (payload.clientManifestHash && payload.clientManifestHash !== manifestHash) {
    return new Response('Manifest hash mismatch.', { status: 400 });
  }

  const db = requireDb();
  await db.insert(agents).values({
    id: manifest.agentId,
    name: manifest.name,
    systemPrompt: manifest.systemPrompt,
    presetId: manifest.presetId,
    tier: manifest.tier,
    model: manifest.model,
    responseLength: manifest.responseLength,
    responseFormat: manifest.responseFormat,
    archetype: payload.archetype ?? null,
    tone: payload.tone ?? null,
    quirks,
    speechPattern: payload.speechPattern ?? null,
    openingMove: payload.openingMove ?? null,
    signatureMove: payload.signatureMove ?? null,
    weakness: payload.weakness ?? null,
    goal: payload.goal ?? null,
    fears: payload.fears ?? null,
    customInstructions,
    createdAt: new Date(manifest.createdAt),
    ownerId: manifest.ownerId,
    parentId: manifest.parentId,
    promptHash,
    manifestHash,
  });

  let attestationFailed = false;

  if (EAS_ENABLED) {
    try {
      const attestation = await attestAgent({
        manifest,
        promptHash,
        manifestHash,
      });
      await db
        .update(agents)
        .set({
          attestationUid: attestation.uid,
          attestationTxHash: attestation.txHash,
          attestedAt: new Date(),
        })
        .where(eq(agents.id, manifest.agentId));
    } catch (error) {
      log.error('Agent attestation failed', error instanceof Error ? error : new Error(String(error)), { agentId: manifest.agentId });
      attestationFailed = true;
    }
  }

  return Response.json({
    agentId: manifest.agentId,
    promptHash,
    manifestHash,
    attestationFailed,
  });
}, 'agents');
