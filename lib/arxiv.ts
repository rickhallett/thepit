// arXiv URL parsing and metadata extraction.
//
// Parses arXiv paper IDs from various URL formats and fetches
// title/authors/abstract from the arXiv Atom API.

import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';

/**
 * Extract an arXiv paper ID from a URL.
 *
 * Handles:
 *   - https://arxiv.org/abs/2305.14325
 *   - https://arxiv.org/pdf/2305.14325
 *   - https://arxiv.org/abs/2305.14325v2
 *   - https://arxiv.org/abs/hep-ph/0001234
 *   - http://arxiv.org/abs/2305.14325 (http)
 *
 * Returns the canonical ID (without version suffix) or null.
 */
export function parseArxivId(url: string): string | null {
  const trimmed = url.trim();

  // Match modern IDs: YYMM.NNNNN (4-5 digit suffix)
  const modernRe =
    /^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?$/i;
  const modernMatch = trimmed.match(modernRe);
  if (modernMatch) return modernMatch[1] ?? null;

  // Match old-style IDs: category/NNNNNNN
  const oldRe =
    /^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf|html)\/([\w-]+\/\d{7})(?:v\d+)?(?:\.pdf)?$/i;
  const oldMatch = trimmed.match(oldRe);
  if (oldMatch) return oldMatch[1] ?? null;

  return null;
}

export type ArxivMetadata = {
  title: string;
  authors: string;
  abstract: string;
};

/**
 * Fetch paper metadata from the arXiv Atom API.
 *
 * Returns title, authors (comma-separated), and abstract,
 * or null if the paper doesn't exist or the request fails.
 */
export async function fetchArxivMetadata(
  arxivId: string,
): Promise<ArxivMetadata | null> {
  const apiUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`;

  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/atom+xml' },
    });

    if (!res.ok) {
      log.warn('arXiv API returned non-200', { status: res.status, arxivId });
      return null;
    }

    const xml = await res.text();

    // Check for zero results
    if (/<opensearch:totalResults[^>]*>0<\/opensearch:totalResults>/.test(xml)) {
      return null;
    }

    // Check for error entries (arXiv returns an entry with id "http://arxiv.org/api/errors#...")
    if (/api\/errors#/.test(xml)) {
      return null;
    }

    const title = extractTag(xml, 'title');
    const abstract = extractTag(xml, 'summary');
    const authors = extractAuthors(xml);

    if (!title) return null;

    return {
      title: cleanWhitespace(title),
      authors,
      abstract: abstract ? cleanWhitespace(abstract) : '',
    };
  } catch (error) {
    log.warn('arXiv API fetch failed', toError(error), { arxivId });
    return null;
  }
}

/**
 * Extract the text content of the first occurrence of a given XML tag
 * from an arXiv Atom response entry.
 *
 * We scope to the first <entry>...</entry> block to avoid picking up
 * the feed-level <title> (which is always "ArXiv Query: ...").
 */
function extractTag(xml: string, tag: string): string | null {
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!entryMatch?.[1]) return null;
  const entry = entryMatch[1];

  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const match = entry.match(re);
  return match?.[1]?.trim() ?? null;
}

/** Extract all author names from <author><name>...</name></author> tags. */
function extractAuthors(xml: string): string {
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!entryMatch) return '';
  const entry = entryMatch[1]!;

  const names: string[] = [];
  const re = /<author>\s*<name>([^<]+)<\/name>/g;
  let match;
  while ((match = re.exec(entry)) !== null) {
    names.push(match[1]!.trim());
  }
  return names.join(', ');
}

/** Collapse internal whitespace to single spaces. */
function cleanWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}
