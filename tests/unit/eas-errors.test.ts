import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock heavy dependencies
const { mockEASInstance, mockSchemaEncoderInstance } = vi.hoisted(() => {
  const mockEASInstance = {
    connect: vi.fn(),
    attest: vi.fn(),
  };
  const mockSchemaEncoderInstance = {
    encodeData: vi.fn().mockReturnValue('0xencoded'),
  };
  return { mockEASInstance, mockSchemaEncoderInstance };
});

vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  EAS: vi.fn(() => mockEASInstance),
  SchemaEncoder: vi.fn(() => mockSchemaEncoderInstance),
}));

vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn(),
    Wallet: vi.fn(() => ({ address: '0xSignerAddress' })),
    ZeroHash: '0x' + '0'.repeat(64),
  },
}));

const testManifest = {
  agentId: 'test',
  name: 'Test',
  systemPrompt: 'Hello',
  presetId: null,
  tier: 'free' as const,
  model: null,
  responseLength: 'standard' as const,
  responseFormat: 'plain' as const,
  createdAt: new Date().toISOString(),
  parentId: null,
  ownerId: null,
};

describe('lib/eas error paths', () => {
  beforeEach(() => {
    vi.resetModules();
    mockEASInstance.connect.mockReset();
    mockEASInstance.attest.mockReset();
    mockSchemaEncoderInstance.encodeData.mockReset().mockReturnValue('0xencoded');
  });

  // U1: Missing EAS_RPC_URL → throws
  it('throws when EAS_RPC_URL is missing', async () => {
    process.env.EAS_ENABLED = 'true';
    process.env.EAS_SCHEMA_UID = '0x' + 'c'.repeat(64);
    process.env.EAS_RPC_URL = '';
    process.env.EAS_SIGNER_PRIVATE_KEY = '0x' + 'f'.repeat(64);

    const { attestAgent } = await import('@/lib/eas');
    await expect(
      attestAgent({
        manifest: testManifest,
        promptHash: '0x' + 'a'.repeat(64),
        manifestHash: '0x' + 'b'.repeat(64),
      }),
    ).rejects.toThrow('EAS_RPC_URL is required');
  });

  // U2: Missing EAS_SIGNER_PRIVATE_KEY → throws
  it('throws when EAS_SIGNER_PRIVATE_KEY is missing', async () => {
    process.env.EAS_ENABLED = 'true';
    process.env.EAS_SCHEMA_UID = '0x' + 'c'.repeat(64);
    process.env.EAS_RPC_URL = 'https://rpc.example.com';
    delete process.env.EAS_SIGNER_PRIVATE_KEY;

    const { attestAgent } = await import('@/lib/eas');
    await expect(
      attestAgent({
        manifest: testManifest,
        promptHash: '0x' + 'a'.repeat(64),
        manifestHash: '0x' + 'b'.repeat(64),
      }),
    ).rejects.toThrow('EAS_SIGNER_PRIVATE_KEY is required');
  });

  // U3: attest() rejects → error propagated
  it('propagates error when EAS attest() rejects', async () => {
    process.env.EAS_ENABLED = 'true';
    process.env.EAS_SCHEMA_UID = '0x' + 'c'.repeat(64);
    process.env.EAS_RPC_URL = 'https://rpc.example.com';
    process.env.EAS_SIGNER_PRIVATE_KEY = '0x' + 'f'.repeat(64);

    mockEASInstance.attest.mockRejectedValue(new Error('Network timeout'));

    const { attestAgent } = await import('@/lib/eas');
    await expect(
      attestAgent({
        manifest: testManifest,
        promptHash: '0x' + 'a'.repeat(64),
        manifestHash: '0x' + 'b'.repeat(64),
      }),
    ).rejects.toThrow('Network timeout');
  });

  // U4: receipt.transactionHash undefined → warning logged, result still returned
  it('warns but returns result when transactionHash is missing', async () => {
    const validUid = '0x' + 'a'.repeat(64);

    process.env.EAS_ENABLED = 'true';
    process.env.EAS_SCHEMA_UID = '0x' + 'c'.repeat(64);
    process.env.EAS_RPC_URL = 'https://rpc.example.com';
    process.env.EAS_SIGNER_PRIVATE_KEY = '0x' + 'f'.repeat(64);

    // No receipt.transactionHash, no tx.hash, no hash
    mockEASInstance.attest.mockResolvedValue({
      wait: vi.fn().mockResolvedValue(validUid),
      // No receipt, no tx, no hash properties → txHash will be ''
    });

    const { attestAgent } = await import('@/lib/eas');
    const result = await attestAgent({
      manifest: testManifest,
      promptHash: '0x' + 'a'.repeat(64),
      manifestHash: '0x' + 'b'.repeat(64),
    });

    expect(result.uid).toBe(validUid);
    expect(result.txHash).toBe('');
  });

  // U5: Invalid UID returned → throws
  it('throws when invalid UID is returned', async () => {
    process.env.EAS_ENABLED = 'true';
    process.env.EAS_SCHEMA_UID = '0x' + 'c'.repeat(64);
    process.env.EAS_RPC_URL = 'https://rpc.example.com';
    process.env.EAS_SIGNER_PRIVATE_KEY = '0x' + 'f'.repeat(64);

    // Return an invalid UID (too short)
    mockEASInstance.attest.mockResolvedValue({
      wait: vi.fn().mockResolvedValue('0xINVALID'),
      receipt: { transactionHash: '0x' + 'b'.repeat(64) },
    });

    const { attestAgent } = await import('@/lib/eas');
    await expect(
      attestAgent({
        manifest: testManifest,
        promptHash: '0x' + 'a'.repeat(64),
        manifestHash: '0x' + 'b'.repeat(64),
      }),
    ).rejects.toThrow('Invalid attestation UID returned');
  });
});
