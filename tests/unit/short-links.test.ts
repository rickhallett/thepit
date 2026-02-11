import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  mockSelectFrom,
  _mockSelectWhere,
  mockSelectLimit,
  mockInsertValues,
  _mockInsertOnConflict,
  mockInsertReturning,
  mockInsertClickValues,
  sha256HexMock,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn().mockResolvedValue([]);
  const _mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: _mockSelectWhere });
  const mockInsertReturning = vi
    .fn()
    .mockResolvedValue([{ slug: 'aBcDeFgH' }]);
  const _mockInsertOnConflict = vi
    .fn()
    .mockReturnValue({ returning: mockInsertReturning });
  const mockInsertValues = vi
    .fn()
    .mockReturnValue({ onConflictDoNothing: _mockInsertOnConflict });
  const mockInsertClickValues = vi.fn().mockResolvedValue(undefined);
  return {
    mockSelectFrom,
    _mockSelectWhere,
    mockSelectLimit,
    mockInsertValues,
    _mockInsertOnConflict,
    mockInsertReturning,
    mockInsertClickValues,
    sha256HexMock: vi.fn().mockResolvedValue('0xabcdef1234567890'),
  };
});

vi.mock('@/db', () => ({
  requireDb: () => ({
    select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
    insert: vi.fn().mockImplementation((table) => {
      // Distinguish between shortLinks and shortLinkClicks inserts
      if (table === Symbol.for('shortLinkClicks')) {
        return { values: mockInsertClickValues };
      }
      return { values: mockInsertValues };
    }),
  }),
}));

vi.mock('@/db/schema', () => ({
  shortLinks: Symbol.for('shortLinks'),
  shortLinkClicks: Symbol.for('shortLinkClicks'),
}));

vi.mock('@/lib/hash', () => ({
  sha256Hex: sha256HexMock,
}));

/* ------------------------------------------------------------------ */

import {
  generateSlug,
  createShortLink,
  resolveShortLink,
  getShortLinkForBout,
} from '@/lib/short-links';

describe('short-links lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectLimit.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ slug: 'aBcDeFgH' }]);
  });

  describe('generateSlug', () => {
    it('returns an 8-character string', () => {
      const slug = generateSlug();
      expect(slug).toHaveLength(8);
      expect(typeof slug).toBe('string');
    });

    it('generates unique slugs', () => {
      const slugs = new Set(Array.from({ length: 100 }, () => generateSlug()));
      expect(slugs.size).toBe(100);
    });
  });

  describe('createShortLink', () => {
    it('returns existing slug when bout already has a short link', async () => {
      mockSelectLimit.mockResolvedValueOnce([{ slug: 'existing' }]);

      const result = await createShortLink('bout_123');
      expect(result).toEqual({ slug: 'existing', created: false });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('creates new slug when bout has no short link', async () => {
      const result = await createShortLink('bout_123', 'user_456');
      expect(result.created).toBe(true);
      expect(result.slug).toBe('aBcDeFgH');
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          boutId: 'bout_123',
          createdByUserId: 'user_456',
        }),
      );
    });

    it('handles race condition gracefully', async () => {
      // First select: no existing link
      // Insert returns empty (race lost)
      mockInsertReturning.mockResolvedValueOnce([]);
      // Second select: fetch the winner
      mockSelectLimit
        .mockResolvedValueOnce([]) // first check
        .mockResolvedValueOnce([{ slug: 'winner99' }]); // race fetch

      const result = await createShortLink('bout_race');
      expect(result).toEqual({ slug: 'winner99', created: false });
    });

    it('passes null for createdByUserId when not provided', async () => {
      await createShortLink('bout_123');
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ createdByUserId: null }),
      );
    });
  });

  describe('resolveShortLink', () => {
    it('returns id and boutId for known slug', async () => {
      mockSelectLimit.mockResolvedValueOnce([
        { id: 42, boutId: 'bout_xyz' },
      ]);

      const result = await resolveShortLink('testslug');
      expect(result).toEqual({ id: 42, boutId: 'bout_xyz' });
    });

    it('returns null for unknown slug', async () => {
      const result = await resolveShortLink('unknown1');
      expect(result).toBeNull();
    });
  });

  describe('getShortLinkForBout', () => {
    it('returns slug when bout has a short link', async () => {
      mockSelectLimit.mockResolvedValueOnce([{ slug: 'myslug1' }]);

      const result = await getShortLinkForBout('bout_abc');
      expect(result).toBe('myslug1');
    });

    it('returns null when bout has no short link', async () => {
      const result = await getShortLinkForBout('bout_none');
      expect(result).toBeNull();
    });
  });
});
