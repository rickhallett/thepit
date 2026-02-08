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
    clientManifestHash?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  if (!payload.name || !payload.systemPrompt) {
    return new Response('Missing name or prompt.', { status: 400 });
  }

  const lengthConfig = resolveResponseLength(payload.responseLength);
  const formatConfig = resolveResponseFormat(payload.responseFormat);
  const { userId } = await auth();
  const agentId = nanoid();

  if (userId) {
    await ensureUserRecord(userId);
  }

  const manifest = buildAgentManifest({
    agentId,
    name: payload.name.trim(),
    systemPrompt: payload.systemPrompt.trim(),
    presetId: payload.presetId ?? null,
    tier: payload.tier ?? 'custom',
    model: payload.model ?? null,
    responseLength: lengthConfig.id,
    responseFormat: formatConfig.id,
    parentId: payload.parentId ?? null,
    ownerId: userId ?? null,
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
