import { nanoid } from 'nanoid';
import { eq, and, sql } from 'drizzle-orm';

import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { log } from '@/lib/logger';
import { errorResponse, parseJsonBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
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
import { recordRemixEvent } from '@/lib/remix-events';
import { resolveResponseFormat } from '@/lib/response-formats';
import { resolveResponseLength } from '@/lib/response-lengths';
import { ensureUserRecord } from '@/lib/users';
import { SUBSCRIPTIONS_ENABLED, canCreateAgent, getUserTier } from '@/lib/tier';
import { UNSAFE_PATTERN } from '@/lib/validation';

export const runtime = 'nodejs';

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
  const parsed = await parseJsonBody<{
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
  }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) {
    return errorResponse('Missing name.', 400);
  }
  if (name.length > 80) {
    return errorResponse('Name must be 80 characters or fewer.', 400);
  }
  if (/https?:\/\/|www\./i.test(name)) {
    return errorResponse('Name must not contain URLs.', 400);
  }
  // FINDING-008: Apply UNSAFE_PATTERN to name for defense-in-depth against stored XSS
  if (UNSAFE_PATTERN.test(name)) {
    return errorResponse('Name must not contain URLs or scripts.', 400);
  }

  // Validate all structured text fields for length and unsafe patterns
  for (const [field, limit] of Object.entries(TEXT_FIELD_LIMITS)) {
    const value = payload[field as keyof typeof payload];
    if (typeof value === 'string') {
      const error = validateTextField(value, limit);
      if (error) return errorResponse(error, 400);
    }
  }

  const rawPrompt =
    typeof payload.systemPrompt === 'string' ? payload.systemPrompt.trim() : '';
  const customInstructions =
    typeof payload.customInstructions === 'string'
      ? payload.customInstructions.trim()
      : rawPrompt || null;
  const quirks = Array.isArray(payload.quirks)
    ? payload.quirks
        .filter((q): q is string => typeof q === 'string')
        .map((q) => q.trim())
        .filter(Boolean)
    : [];

  // Validate quirks: max 10 items, 100 chars each
  if (quirks.length > 10) {
    return errorResponse('Maximum 10 quirks allowed.', 400);
  }
  for (const quirk of quirks) {
    if (quirk.length > 100) {
      return errorResponse('Each quirk must be 100 characters or fewer.', 400);
    }
    if (UNSAFE_PATTERN.test(quirk)) {
      return errorResponse('Quirks must not contain URLs or scripts.', 400);
    }
  }
  /** Trim a string field to null if empty/missing. */
  const trimOrNull = (v: string | undefined | null): string | null => {
    const t = typeof v === 'string' ? v.trim() : null;
    return t || null;
  };

  const archetype = trimOrNull(payload.archetype);
  const tone = trimOrNull(payload.tone);
  const speechPattern = trimOrNull(payload.speechPattern);
  const openingMove = trimOrNull(payload.openingMove);
  const signatureMove = trimOrNull(payload.signatureMove);
  const weakness = trimOrNull(payload.weakness);
  const goal = trimOrNull(payload.goal);
  const fears = trimOrNull(payload.fears);

  // Only consider customInstructions for hasStructuredFields when the user
  // explicitly provided it (not when it was derived from rawPrompt fallback).
  const explicitCustomInstructions = trimOrNull(payload.customInstructions);
  const hasStructuredFields = Boolean(
    archetype ||
      tone ||
      quirks.length > 0 ||
      speechPattern ||
      openingMove ||
      signatureMove ||
      weakness ||
      goal ||
      fears ||
      explicitCustomInstructions,
  );
  const systemPrompt = hasStructuredFields
    ? buildStructuredPrompt({
        name,
        archetype,
        tone,
        quirks,
        speechPattern,
        openingMove,
        signatureMove,
        weakness,
        goal,
        fears,
        customInstructions,
      })
    : rawPrompt;

  if (!systemPrompt) {
    return errorResponse('Missing prompt.', 400);
  }

  const lengthConfig = resolveResponseLength(payload.responseLength);
  const formatConfig = resolveResponseFormat(payload.responseFormat);
  const { userId } = await auth();

  // Require authentication to prevent spam/DoS via unauthenticated agent creation
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const rateCheck = checkRateLimit(
    { name: 'agent-creation', maxRequests: 10, windowMs: 60 * 60 * 1000 },
    userId,
  );
  if (!rateCheck.success) {
    const currentTier = await getUserTier(userId);
    return rateLimitResponse(rateCheck, {
      message: 'Rate limit exceeded. Max 10 agents per hour.',
      limit: 10,
      currentTier,
      upgradeTiers:
        currentTier === 'lab'
          ? []
          : [{ tier: 'lab', limit: null, url: '/sign-up?redirect_url=/agents#upgrade' }],
    });
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
      return errorResponse(slotCheck.reason, 402);
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
    return errorResponse('Manifest hash mismatch.', 400);
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
    archetype,
    tone,
    quirks,
    speechPattern,
    openingMove,
    signatureMove,
    weakness,
    goal,
    fears,
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

  // Record remix event for cloned agents (fire-and-forget)
  if (manifest.parentId) {
    recordRemixEvent({
      sourceAgentId: manifest.parentId,
      remixedAgentId: manifest.agentId,
      remixerUserId: userId,
      outcome: 'completed',
      metadata: { promptHash, manifestHash },
    }).catch((err) => {
      log.warn(
        'Failed to record remix event',
        err instanceof Error ? err : new Error(String(err)),
        { agentId: manifest.agentId, parentId: manifest.parentId },
      );
    });
  }

  return Response.json({
    agentId: manifest.agentId,
    promptHash,
    manifestHash,
    attestationFailed,
  });
}, 'agents');
