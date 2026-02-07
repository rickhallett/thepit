import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';

import type { AgentManifest } from '@/lib/agent-dna';

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

export const EAS_SCHEMA_STRING =
  'string agentId,string name,string presetId,string tier,bytes32 promptHash,bytes32 manifestHash,string parentId,string ownerId,uint64 createdAt';

export type AttestationResult = {
  uid: string;
  txHash: string;
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
  const txInfo = transaction as unknown as {
    receipt?: { transactionHash?: string };
    tx?: { hash?: string };
    hash?: string;
  };
  const txHash =
    txInfo.receipt?.transactionHash ?? txInfo.tx?.hash ?? txInfo.hash ?? '';
  return { uid, txHash };
};
