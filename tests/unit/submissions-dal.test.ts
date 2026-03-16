import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockOnConflict = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  return {
    mockDb: {
      insert: mockInsert,
      _values: mockValues,
      _onConflict: mockOnConflict,
    },
  };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  newsletterSignups: Symbol('newsletterSignups'),
  contactSubmissions: Symbol('contactSubmissions'),
  paperSubmissions: Symbol('paperSubmissions'),
  pageViews: Symbol('pageViews'),
}));

describe('lib/submissions', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.insert.mockReset();
    mockDb._values.mockReset();
    mockDb._onConflict.mockReset();

    // Re-establish chain
    mockDb._onConflict.mockResolvedValue(undefined);
    mockDb._values.mockReturnValue({ onConflictDoNothing: mockDb._onConflict });
    mockDb.insert.mockReturnValue({ values: mockDb._values });
  });

  describe('subscribeNewsletter', () => {
    it('inserts email with onConflictDoNothing', async () => {
      const { subscribeNewsletter } = await import('@/lib/submissions');
      await subscribeNewsletter('test@example.com');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb._values).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockDb._onConflict).toHaveBeenCalled();
    });
  });

  describe('submitContact', () => {
    it('inserts contact data', async () => {
      // submitContact does not use onConflictDoNothing - plain insert
      const mockPlainValues = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockPlainValues });

      const { submitContact } = await import('@/lib/submissions');
      await submitContact({ name: 'Alice', email: 'a@b.com', message: 'Hello!' });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockPlainValues).toHaveBeenCalledWith({
        name: 'Alice',
        email: 'a@b.com',
        message: 'Hello!',
      });
    });
  });

  describe('submitPaper', () => {
    it('inserts paper data with onConflictDoNothing', async () => {
      const { submitPaper } = await import('@/lib/submissions');
      await submitPaper({
        userId: 'user_1',
        arxivId: '2305.14325',
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        title: 'Test Paper',
        authors: 'Author A',
        abstract: 'Abstract text',
        justification: 'Relevant because...',
        relevanceArea: 'agent-interaction',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb._values).toHaveBeenCalledWith({
        userId: 'user_1',
        arxivId: '2305.14325',
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        title: 'Test Paper',
        authors: 'Author A',
        abstract: 'Abstract text',
        justification: 'Relevant because...',
        relevanceArea: 'agent-interaction',
      });
      expect(mockDb._onConflict).toHaveBeenCalled();
    });
  });

  describe('recordPageView', () => {
    it('inserts page view data', async () => {
      // recordPageView does not use onConflictDoNothing - plain insert
      const mockPlainValues = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockPlainValues });

      const { recordPageView } = await import('@/lib/submissions');
      await recordPageView({
        path: '/bout/abc',
        userId: 'user_1',
        sessionId: 'sess123',
        referrer: null,
        userAgent: 'test-agent',
        ipHash: 'hash123',
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        country: 'GB',
        copyVariant: null,
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockPlainValues).toHaveBeenCalledWith({
        path: '/bout/abc',
        userId: 'user_1',
        sessionId: 'sess123',
        referrer: null,
        userAgent: 'test-agent',
        ipHash: 'hash123',
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        country: 'GB',
        copyVariant: null,
      });
    });
  });
});
