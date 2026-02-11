// Agent DNA: deterministic identity fingerprinting for AI personas.
//
// Every agent gets two hashes:
//   - promptHash:    SHA-256 of the canonicalized system prompt (behaviour identity)
//   - manifestHash:  SHA-256 of the full canonicalized manifest (complete identity)
//
// Canonicalization uses RFC 8785 (JSON Canonicalization Scheme) to ensure the
// same logical agent always produces the same hash regardless of key ordering.
//
// These hashes serve as the foundation for on-chain attestations (see lib/eas.ts)
// and enable tamper-evident agent identity: if someone modifies a prompt, the
// hash changes and no longer matches the attestation record.

import canonicalize from 'canonicalize';

import { sha256Hex } from '@/lib/hash';

export type AgentTier = 'free' | 'premium' | 'custom';
export type ResponseLengthId = 'short' | 'standard' | 'long';
export type ResponseFormatId = 'plain' | 'spaced' | 'markdown' | 'json';

export type AgentManifest = {
  agentId: string;
  name: string;
  systemPrompt: string;
  presetId: string | null;
  tier: AgentTier;
  model: string | null;
  responseLength: ResponseLengthId;
  responseFormat: ResponseFormatId;
  createdAt: string;
  parentId: string | null;
  ownerId: string | null;
};

export const canonicalizeAgentManifest = (manifest: AgentManifest) => {
  const canonical = canonicalize(manifest);
  if (!canonical) {
    throw new Error('Failed to canonicalize agent manifest.');
  }
  return canonical;
};

export const canonicalizePrompt = (systemPrompt: string) => {
  const canonical = canonicalize({ systemPrompt });
  if (!canonical) {
    throw new Error('Failed to canonicalize agent prompt.');
  }
  return canonical;
};

export const hashAgentManifest = async (manifest: AgentManifest) =>
  sha256Hex(canonicalizeAgentManifest(manifest));

export const hashAgentPrompt = async (systemPrompt: string) =>
  sha256Hex(canonicalizePrompt(systemPrompt));

export const buildAgentManifest = (input: {
  agentId: string;
  name: string;
  systemPrompt: string;
  presetId?: string | null;
  tier: AgentTier;
  model?: string | null;
  responseLength: ResponseLengthId;
  responseFormat: ResponseFormatId;
  createdAt?: string;
  parentId?: string | null;
  ownerId?: string | null;
}): AgentManifest => {
  return {
    agentId: input.agentId,
    name: input.name,
    systemPrompt: input.systemPrompt,
    presetId: input.presetId ?? null,
    tier: input.tier,
    model: input.model ?? null,
    responseLength: input.responseLength,
    responseFormat: input.responseFormat,
    createdAt: input.createdAt ?? new Date().toISOString(),
    parentId: input.parentId ?? null,
    ownerId: input.ownerId ?? null,
  };
};
