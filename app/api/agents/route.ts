import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { agents } from '@/db/schema';
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

export const runtime = 'nodejs';

export async function POST(req: Request) {
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

  const rawPrompt =
    typeof payload.systemPrompt === 'string' ? payload.systemPrompt.trim() : '';
  const customInstructions =
    typeof payload.customInstructions === 'string'
      ? payload.customInstructions.trim()
      : rawPrompt || null;
  const quirks = Array.isArray(payload.quirks)
    ? payload.quirks.map((quirk) => quirk.trim()).filter(Boolean)
    : [];
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

  await ensureUserRecord(userId);
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

  let attestationError: string | null = null;

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
      attestationError = (error as Error).message;
    }
  }

  return Response.json({
    agentId: manifest.agentId,
    promptHash,
    manifestHash,
    attestationError,
  });
}
