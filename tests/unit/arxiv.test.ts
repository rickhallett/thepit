import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { parseArxivId, fetchArxivMetadata } from '@/lib/arxiv';

/* ------------------------------------------------------------------ */
/* parseArxivId                                                        */
/* ------------------------------------------------------------------ */

describe('parseArxivId', () => {
  it('extracts ID from standard abs URL', () => {
    expect(parseArxivId('https://arxiv.org/abs/2305.14325')).toBe('2305.14325');
  });

  it('extracts ID from pdf URL', () => {
    expect(parseArxivId('https://arxiv.org/pdf/2305.14325')).toBe('2305.14325');
  });

  it('extracts ID from html URL', () => {
    expect(parseArxivId('https://arxiv.org/html/2305.14325')).toBe('2305.14325');
  });

  it('extracts ID with version suffix (strips version)', () => {
    expect(parseArxivId('https://arxiv.org/abs/2305.14325v2')).toBe('2305.14325');
  });

  it('extracts ID with .pdf extension', () => {
    expect(parseArxivId('https://arxiv.org/pdf/2305.14325.pdf')).toBe('2305.14325');
  });

  it('extracts 5-digit suffix ID', () => {
    expect(parseArxivId('https://arxiv.org/abs/2402.05120')).toBe('2402.05120');
  });

  it('extracts old-style category/ID format', () => {
    expect(parseArxivId('https://arxiv.org/abs/hep-ph/0001234')).toBe('hep-ph/0001234');
  });

  it('handles http:// URLs', () => {
    expect(parseArxivId('http://arxiv.org/abs/2305.14325')).toBe('2305.14325');
  });

  it('handles www. prefix', () => {
    expect(parseArxivId('https://www.arxiv.org/abs/2305.14325')).toBe('2305.14325');
  });

  it('handles leading/trailing whitespace', () => {
    expect(parseArxivId('  https://arxiv.org/abs/2305.14325  ')).toBe('2305.14325');
  });

  it('returns null for non-arxiv URL', () => {
    expect(parseArxivId('https://example.com/abs/2305.14325')).toBeNull();
  });

  it('returns null for bare ID (no URL)', () => {
    expect(parseArxivId('2305.14325')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseArxivId('')).toBeNull();
  });

  it('returns null for random text', () => {
    expect(parseArxivId('not a url at all')).toBeNull();
  });

  it('returns null for arxiv URL with no ID', () => {
    expect(parseArxivId('https://arxiv.org/abs/')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* fetchArxivMetadata                                                  */
/* ------------------------------------------------------------------ */

describe('fetchArxivMetadata', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const VALID_ATOM_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">1</opensearch:totalResults>
  <title>ArXiv Query: id_list=2305.14325</title>
  <entry>
    <title>Improving Factuality and Reasoning in Language Models through Multiagent Debate</title>
    <summary>We propose a simple approach to improve language model outputs:
    multiple instances debate their individual responses over multiple rounds.</summary>
    <author><name>Yilun Du</name></author>
    <author><name>Shuang Li</name></author>
    <author><name>Antonio Torralba</name></author>
  </entry>
</feed>`;

  const ZERO_RESULTS_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">0</opensearch:totalResults>
  <title>ArXiv Query: id_list=0000.00000</title>
</feed>`;

  const ERROR_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/api/errors#incorrect_id_format_for_0000</id>
    <title>Error</title>
    <summary>incorrect id format for 0000</summary>
  </entry>
</feed>`;

  it('parses a valid arXiv API response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(VALID_ATOM_RESPONSE, { status: 200 }),
    );

    const result = await fetchArxivMetadata('2305.14325');

    expect(result).not.toBeNull();
    expect(result!.title).toBe(
      'Improving Factuality and Reasoning in Language Models through Multiagent Debate',
    );
    expect(result!.authors).toBe('Yilun Du, Shuang Li, Antonio Torralba');
    expect(result!.abstract).toContain('multiple instances debate');
  });

  it('returns null for zero-result response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(ZERO_RESULTS_RESPONSE, { status: 200 }),
    );

    const result = await fetchArxivMetadata('0000.00000');
    expect(result).toBeNull();
  });

  it('returns null for error response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(ERROR_RESPONSE, { status: 200 }),
    );

    const result = await fetchArxivMetadata('0000');
    expect(result).toBeNull();
  });

  it('returns null for non-200 HTTP response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Service Unavailable', { status: 503 }),
    );

    const result = await fetchArxivMetadata('2305.14325');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const result = await fetchArxivMetadata('2305.14325');
    expect(result).toBeNull();
  });

  it('cleans multi-line whitespace in title and abstract', async () => {
    const messyResponse = VALID_ATOM_RESPONSE.replace(
      '<title>Improving Factuality and Reasoning in Language Models through Multiagent Debate</title>',
      '<title>Improving\n   Factuality   and\n  Reasoning</title>',
    );
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(messyResponse, { status: 200 }),
    );

    const result = await fetchArxivMetadata('2305.14325');
    expect(result!.title).toBe('Improving Factuality and Reasoning');
  });
});
