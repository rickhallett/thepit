import { timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { agents } from '@/db/schema';
import { ALL_PRESETS } from '@/lib/presets';
import {
  buildPresetAgentId,
  registerPresetAgent,
} from '@/lib/agent-registry';
import { attestAgent, EAS_ENABLED } from '@/lib/eas';

export const runtime = 'nodejs';

const requireAdmin = (req: Request) => {
  const token = req.headers.get('x-admin-token');
  const expected = process.env.ADMIN_SEED_TOKEN;
  if (!expected) {
    throw new Error('Not configured.');
  }
  if (!token) {
    throw new Error('Unauthorized');
  }
  // Constant-time comparison to prevent timing side-channel attacks.
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    throw new Error('Unauthorized');
  }
  if (!timingSafeEqual(a, b)) {
    throw new Error('Unauthorized');
  }
};

export async function POST(req: Request) {
  try {
    requireAdmin(req);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Unauthorized', { status: 401 });
  }

  const db = requireDb();
  let created = 0;
  let attested = 0;
  const errors: string[] = [];

  for (const preset of ALL_PRESETS) {
    for (const agent of preset.agents) {
      const agentId = buildPresetAgentId(preset.id, agent.id);
      const [existing] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);

      if (!existing) {
        try {
          const registration = await registerPresetAgent({
            presetId: preset.id,
            agentId: agent.id,
            name: agent.name,
            systemPrompt: agent.systemPrompt,
            tier: preset.tier,
          });

          await db.insert(agents).values({
            id: registration.agentId,
            name: registration.manifest.name,
            systemPrompt: registration.manifest.systemPrompt,
            presetId: registration.manifest.presetId,
            tier: registration.manifest.tier,
            model: registration.manifest.model,
            responseLength: registration.manifest.responseLength,
            responseFormat: registration.manifest.responseFormat,
            createdAt: new Date(registration.manifest.createdAt),
            ownerId: registration.manifest.ownerId,
            parentId: registration.manifest.parentId,
            promptHash: registration.promptHash,
            manifestHash: registration.manifestHash,
          });
          created += 1;

          if (EAS_ENABLED) {
            const attestation = await attestAgent({
              manifest: registration.manifest,
              promptHash: registration.promptHash,
              manifestHash: registration.manifestHash,
            });
            await db
              .update(agents)
              .set({
                attestationUid: attestation.uid,
                attestationTxHash: attestation.txHash,
                attestedAt: new Date(),
              })
              .where(eq(agents.id, registration.agentId));
            attested += 1;
          }
        } catch (error) {
          console.error(`Seed agent error [${agentId}]:`, error instanceof Error ? error.message : String(error));
          errors.push(agentId);
        }
        continue;
      }

      if (EAS_ENABLED && !existing.attestationUid) {
        try {
          const registration = await registerPresetAgent({
            presetId: preset.id,
            agentId: agent.id,
            name: agent.name,
            systemPrompt: agent.systemPrompt,
            tier: preset.tier,
            createdAt: existing.createdAt?.toISOString(),
          });
          const attestation = await attestAgent({
            manifest: registration.manifest,
            promptHash: registration.promptHash,
            manifestHash: registration.manifestHash,
          });
          await db
            .update(agents)
            .set({
              attestationUid: attestation.uid,
              attestationTxHash: attestation.txHash,
              attestedAt: new Date(),
            })
            .where(eq(agents.id, registration.agentId));
          attested += 1;
        } catch (error) {
          console.error(`Seed attestation error [${agentId}]:`, error instanceof Error ? error.message : String(error));
          errors.push(agentId);
        }
      }
    }
  }

  return Response.json({ created, attested, errors: errors.length });
}
