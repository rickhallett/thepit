import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { log } from '@/lib/logger';
import { agents } from '@/db/schema';
import { ALL_PRESETS } from '@/lib/presets';
import {
  buildPresetAgentId,
  registerPresetAgent,
} from '@/lib/agent-registry';
import { hashAgentPrompt, hashAgentManifest, buildAgentManifest } from '@/lib/agent-dna';
import { attestAgent, EAS_ENABLED } from '@/lib/eas';
import { requireAdmin } from '@/lib/admin-auth';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { SEED_AGENTS, buildSeedAgentPrompt } from '@/lib/seed-agents';
import { DEFAULT_RESPONSE_FORMAT } from '@/lib/response-formats';
import { DEFAULT_RESPONSE_LENGTH } from '@/lib/response-lengths';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    requireAdmin(req);
  } catch {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
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
          log.error('Seed agent error', error instanceof Error ? error : new Error(String(error)), { agentId });
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
          log.error('Seed attestation error', error instanceof Error ? error : new Error(String(error)), { agentId });
          errors.push(agentId);
        }
      }
    }
  }

  // Seed high-DNA standalone agents for arena selection
  let dnaCreated = 0;
  for (const seedAgent of SEED_AGENTS) {
    const agentId = `dna:${seedAgent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const [existing] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!existing) {
      try {
        const systemPrompt = buildSeedAgentPrompt(seedAgent);
        const manifest = buildAgentManifest({
          agentId,
          name: seedAgent.name,
          systemPrompt,
          presetId: null,
          tier: 'custom',
          responseLength: DEFAULT_RESPONSE_LENGTH,
          responseFormat: DEFAULT_RESPONSE_FORMAT,
        });
        const [promptHash, manifestHash] = await Promise.all([
          hashAgentPrompt(systemPrompt),
          hashAgentManifest(manifest),
        ]);

        await db.insert(agents).values({
          id: agentId,
          name: seedAgent.name,
          systemPrompt,
          presetId: null,
          tier: 'custom',
          model: null,
          responseLength: DEFAULT_RESPONSE_LENGTH,
          responseFormat: DEFAULT_RESPONSE_FORMAT,
          archetype: seedAgent.archetype,
          tone: seedAgent.tone,
          quirks: seedAgent.quirks,
          speechPattern: seedAgent.speechPattern,
          openingMove: seedAgent.openingMove,
          signatureMove: seedAgent.signatureMove,
          weakness: seedAgent.weakness,
          goal: seedAgent.goal,
          fears: seedAgent.fears,
          customInstructions: seedAgent.customInstructions,
          promptHash,
          manifestHash,
          ownerId: null,
          parentId: null,
        });
        dnaCreated += 1;
      } catch (error) {
        log.error('Seed DNA agent error', error instanceof Error ? error : new Error(String(error)), { agentId });
        errors.push(agentId);
      }
    }
  }

  log.info('audit', { action: 'seed_agents', created, dnaCreated, attested, errors: errors.length });
  return Response.json({ created, dnaCreated, attested, errors: errors.length });
}
