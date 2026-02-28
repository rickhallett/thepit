import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock heavy dependencies (EAS SDK + ethers) — type import @/lib/agent-dna is NOT mocked.
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

describe('lib/eas', () => {
  beforeEach(() => {
    vi.resetModules();
    mockEASInstance.connect.mockReset();
    mockEASInstance.attest.mockReset();
    mockSchemaEncoderInstance.encodeData.mockReset().mockReturnValue('0xencoded');
  });

  describe('isValidBytes32', () => {
    it('returns true for valid 0x + 64 hex chars', async () => {
      const { isValidBytes32 } = await import('@/lib/eas');
      const valid = '0x' + 'a'.repeat(64);
      expect(isValidBytes32(valid)).toBe(true);
    });

    it('returns false for too short', async () => {
      const { isValidBytes32 } = await import('@/lib/eas');
      expect(isValidBytes32('0x' + 'a'.repeat(63))).toBe(false);
    });

    it('returns false for missing 0x prefix', async () => {
      const { isValidBytes32 } = await import('@/lib/eas');
      expect(isValidBytes32('a'.repeat(64))).toBe(false);
    });

    it('returns false for non-hex characters', async () => {
      const { isValidBytes32 } = await import('@/lib/eas');
      expect(isValidBytes32('0x' + 'g'.repeat(64))).toBe(false);
    });

    it('returns false for non-string input', async () => {
      const { isValidBytes32 } = await import('@/lib/eas');
      expect(isValidBytes32(123)).toBe(false);
      expect(isValidBytes32(null)).toBe(false);
      expect(isValidBytes32(undefined)).toBe(false);
    });
  });

  describe('isValidTxHash', () => {
    it('returns true for valid hash', async () => {
      const { isValidTxHash } = await import('@/lib/eas');
      expect(isValidTxHash('0x' + 'b'.repeat(64))).toBe(true);
    });

    it('returns false for invalid input', async () => {
      const { isValidTxHash } = await import('@/lib/eas');
      expect(isValidTxHash('not-a-hash')).toBe(false);
      expect(isValidTxHash('0x123')).toBe(false);
    });

    it('returns false for non-string input', async () => {
      const { isValidTxHash } = await import('@/lib/eas');
      expect(isValidTxHash(42)).toBe(false);
      expect(isValidTxHash(null)).toBe(false);
    });
  });

  describe('attestAgent', () => {
    it('throws when EAS is not enabled', async () => {
      process.env.EAS_ENABLED = 'false';
      delete process.env.EAS_SCHEMA_UID;
      delete process.env.EAS_RPC_URL;
      delete process.env.EAS_SIGNER_PRIVATE_KEY;

      const { attestAgent } = await import('@/lib/eas');
      await expect(
        attestAgent({
          manifest: {
            agentId: 'test',
            name: 'Test',
            systemPrompt: 'Hello',
            presetId: null,
            tier: 'free',
            model: null,
            responseLength: 'standard',
            responseFormat: 'plain',
            createdAt: new Date().toISOString(),
            parentId: null,
            ownerId: null,
          },
          promptHash: '0x' + 'a'.repeat(64),
          manifestHash: '0x' + 'b'.repeat(64),
        }),
      ).rejects.toThrow('EAS is not enabled');
    });

    it('throws when EAS_SCHEMA_UID is missing', async () => {
      process.env.EAS_ENABLED = 'true';
      process.env.EAS_SCHEMA_UID = '';
      process.env.EAS_RPC_URL = 'https://rpc.example.com';
      process.env.EAS_SIGNER_PRIVATE_KEY = '0x' + 'f'.repeat(64);

      const { attestAgent } = await import('@/lib/eas');
      await expect(
        attestAgent({
          manifest: {
            agentId: 'test',
            name: 'Test',
            systemPrompt: 'Hello',
            presetId: null,
            tier: 'free',
            model: null,
            responseLength: 'standard',
            responseFormat: 'plain',
            createdAt: new Date().toISOString(),
            parentId: null,
            ownerId: null,
          },
          promptHash: '0x' + 'a'.repeat(64),
          manifestHash: '0x' + 'b'.repeat(64),
        }),
      ).rejects.toThrow('EAS_SCHEMA_UID is required');
    });

    it('succeeds with mocked EAS provider', async () => {
      const validUid = '0x' + 'a'.repeat(64);
      const validTxHash = '0x' + 'b'.repeat(64);

      process.env.EAS_ENABLED = 'true';
      process.env.EAS_SCHEMA_UID = '0x' + 'c'.repeat(64);
      process.env.EAS_RPC_URL = 'https://rpc.example.com';
      process.env.EAS_SIGNER_PRIVATE_KEY = '0x' + 'f'.repeat(64);

      mockEASInstance.attest.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(validUid),
        receipt: { transactionHash: validTxHash },
      });

      const { attestAgent } = await import('@/lib/eas');
      const result = await attestAgent({
        manifest: {
          agentId: 'test-agent',
          name: 'Test Agent',
          systemPrompt: 'You are a test agent.',
          presetId: 'test-preset',
          tier: 'free',
          model: null,
          responseLength: 'standard',
          responseFormat: 'plain',
          createdAt: '2025-01-01T00:00:00.000Z',
          parentId: null,
          ownerId: 'user-1',
        },
        promptHash: '0x' + 'd'.repeat(64),
        manifestHash: '0x' + 'e'.repeat(64),
      });

      expect(result.uid).toBe(validUid);
      expect(result.txHash).toBe(validTxHash);
      expect(mockEASInstance.connect).toHaveBeenCalledWith(
        expect.objectContaining({ address: '0xSignerAddress' }),
      );
      expect(mockEASInstance.attest).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: '0x' + 'c'.repeat(64),
          data: expect.objectContaining({
            revocable: false,
            data: '0xencoded',
          }),
        }),
      );
    });
  });
});
