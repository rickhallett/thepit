// On-chain agent identity attestation via the Ethereum Attestation Service (EAS).
//
// EAS is a protocol for creating verifiable, on-chain attestations. We use it
// on Base L2 to publish tamper-proof records of agent identity: given an agent's
// manifest and prompt hashes (from lib/agent-dna.ts), this module writes an
// attestation that anyone can independently verify on-chain.
//
// Why: if someone claims a particular AI persona produced a result, the
// attestation proves the exact system prompt and manifest that were in use.
// This creates a public, immutable audit trail for multi-agent research.
//
// Flow: agent-dna.ts hashes the agent -> this module encodes and submits the
// attestation -> the EAS contract returns a unique attestation UID.

import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';

import type { AgentManifest } from '@/lib/agent-dna';

// Base L2 pre-deployed EAS contract addresses (same for all Base deployments)
const DEFAULT_EAS_ADDRESS = '0x4200000000000000000000000000000000000021';
const DEFAULT_SCHEMA_REGISTRY = '0x4200000000000000000000000000000000000020';

export const EAS_ENABLED = process.env.EAS_ENABLED === 'true';
export const EAS_CHAIN_ID = Number(process.env.EAS_CHAIN_ID ?? 8453);
export const EAS_SCHEMA_UID = process.env.EAS_SCHEMA_UID ?? '';
export const EAS_RPC_URL = process.env.EAS_RPC_URL ?? '';
export const EAS_CONTRACT_ADDRESS =
  process.env.EAS_CONTRACT_ADDRESS ?? DEFAULT_EAS_ADDRESS;
export const EAS_SCHEMA_REGISTRY_ADDRESS =
  process.env.EAS_SCHEMA_REGISTRY_ADDRESS ?? DEFAULT_SCHEMA_REGISTRY;

// The on-chain schema defines the attestation structure. Each field maps to a
// Solidity type: strings for human-readable IDs, bytes32 for the 32-byte
// SHA-256 hashes, and uint64 for the unix timestamp. This schema must match
// the one registered on-chain via EAS_SCHEMA_UID.
export const EAS_SCHEMA_STRING =
  'string agentId,string name,string presetId,string tier,bytes32 promptHash,bytes32 manifestHash,string parentId,string ownerId,uint64 createdAt';

export type AttestationResult = {
  uid: string;
  txHash: string;
};

/**
 * Validate that a string is a valid bytes32 hex string (66 chars: 0x + 64 hex)
 */
export const isValidBytes32 = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return /^0x[a-fA-F0-9]{64}$/.test(value);
};

/**
 * Validate that a string is a valid transaction hash
 */
export const isValidTxHash = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  // Transaction hashes are also bytes32
  return /^0x[a-fA-F0-9]{64}$/.test(value);
};

const requireEasConfig = () => {
  if (!EAS_ENABLED) {
    throw new Error('EAS is not enabled.');
  }
  if (!EAS_SCHEMA_UID) {
    throw new Error('EAS_SCHEMA_UID is required.');
  }
  if (!EAS_RPC_URL) {
    throw new Error('EAS_RPC_URL is required.');
  }
  if (!process.env.EAS_SIGNER_PRIVATE_KEY) {
    throw new Error('EAS_SIGNER_PRIVATE_KEY is required.');
  }
};

export const attestAgent = async (params: {
  manifest: AgentManifest;
  promptHash: string;
  manifestHash: string;
  recipient?: string;
}): Promise<AttestationResult> => {
  requireEasConfig();

  const provider = new ethers.JsonRpcProvider(EAS_RPC_URL, EAS_CHAIN_ID);
  const signer = new ethers.Wallet(
    process.env.EAS_SIGNER_PRIVATE_KEY as string,
    provider,
  );

  const eas = new EAS(EAS_CONTRACT_ADDRESS);
  eas.connect(signer);

  const encoder = new SchemaEncoder(EAS_SCHEMA_STRING);
  const encoded = encoder.encodeData([
    { name: 'agentId', value: params.manifest.agentId, type: 'string' },
    { name: 'name', value: params.manifest.name, type: 'string' },
    {
      name: 'presetId',
      value: params.manifest.presetId ?? '',
      type: 'string',
    },
    { name: 'tier', value: params.manifest.tier, type: 'string' },
    { name: 'promptHash', value: params.promptHash, type: 'bytes32' },
    { name: 'manifestHash', value: params.manifestHash, type: 'bytes32' },
    {
      name: 'parentId',
      value: params.manifest.parentId ?? '',
      type: 'string',
    },
    {
      name: 'ownerId',
      value: params.manifest.ownerId ?? '',
      type: 'string',
    },
    {
      name: 'createdAt',
      value: Math.floor(new Date(params.manifest.createdAt).getTime() / 1000),
      type: 'uint64',
    },
  ]);

  // Submit the attestation on-chain. Non-expiring and non-revocable because
  // agent identity records should be permanent and immutable.
  const transaction = await eas.attest({
    schema: EAS_SCHEMA_UID,
    data: {
      recipient: params.recipient ?? signer.address,
      expirationTime: BigInt(0),
      revocable: false,
      refUID: ethers.ZeroHash,
      data: encoded,
      value: BigInt(0),
    },
  });

  const uid = await transaction.wait();
  // The EAS SDK returns transaction info in an inconsistent shape across
  // versions, so we defensively extract the hash via runtime property checks
  // instead of using a double type-cast that would bypass the compiler.
  const txObj = transaction as unknown as Record<string, unknown>;
  const receipt = txObj.receipt as Record<string, unknown> | undefined;
  const tx = txObj.tx as Record<string, unknown> | undefined;
  const txHash =
    (typeof receipt?.transactionHash === 'string' ? receipt.transactionHash : null) ??
    (typeof tx?.hash === 'string' ? tx.hash : null) ??
    (typeof txObj.hash === 'string' ? txObj.hash : '') ??
    '';

  // Validate returned values to catch data corruption early
  if (!isValidBytes32(uid)) {
    throw new Error(`Invalid attestation UID returned: ${uid}`);
  }

  if (txHash && !isValidTxHash(txHash)) {
    console.warn(`Invalid transaction hash format: ${txHash}`);
    // Don't throw - txHash is informational, UID is what matters
  }

  return { uid, txHash };
};
