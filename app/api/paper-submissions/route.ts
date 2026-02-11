import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { paperSubmissions } from '@/db/schema';
import { checkRateLimit } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { parseArxivId, fetchArxivMetadata } from '@/lib/arxiv';
import { ensureUserRecord } from '@/lib/users';

export const runtime = 'nodejs';

/** Reject URLs, script tags, and event handlers in free-text fields. */
const UNSAFE_PATTERN =
  /https?:\/\/|www\.|<script|javascript:|on\w+\s*=|data:text\/html/i;

const VALID_AREAS = [
  'agent-interaction',
  'evaluation',
  'persona',
  'context-windows',
  'prompt-engineering',
  'other',
] as const;

export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Sign in required.', { status: 401 });
  }

  const rateCheck = checkRateLimit(
    { name: 'paper-submissions', maxRequests: 5, windowMs: 60 * 60 * 1000 },
    userId,
  );
  if (!rateCheck.success) {
    return new Response('Too many submissions. Try again later.', {
      status: 429,
    });
  }

  let payload: {
    arxivUrl?: string;
    justification?: string;
    relevanceArea?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const arxivUrl =
    typeof payload.arxivUrl === 'string' ? payload.arxivUrl.trim() : '';
  const justification =
    typeof payload.justification === 'string'
      ? payload.justification.trim()
      : '';
  const relevanceArea =
    typeof payload.relevanceArea === 'string'
      ? payload.relevanceArea.trim()
      : '';

  if (!arxivUrl) {
    return new Response('arXiv URL required.', { status: 400 });
  }

  const arxivId = parseArxivId(arxivUrl);
  if (!arxivId) {
    return new Response('Invalid arXiv URL.', { status: 400 });
  }

  if (!VALID_AREAS.includes(relevanceArea as (typeof VALID_AREAS)[number])) {
    return new Response('Invalid relevance area.', { status: 400 });
  }

  if (justification.length < 50) {
    return new Response('Justification must be at least 50 characters.', {
      status: 400,
    });
  }

  if (justification.length > 2000) {
    return new Response('Justification must be 2000 characters or fewer.', {
      status: 400,
    });
  }

  if (UNSAFE_PATTERN.test(justification)) {
    return new Response('Justification must not contain URLs or scripts.', {
      status: 400,
    });
  }

  const metadata = await fetchArxivMetadata(arxivId);
  if (!metadata) {
    return new Response('Paper not found on arXiv.', { status: 400 });
  }

  await ensureUserRecord(userId);

  const db = requireDb();
  await db
    .insert(paperSubmissions)
    .values({
      userId,
      arxivId,
      arxivUrl: `https://arxiv.org/abs/${arxivId}`,
      title: metadata.title.slice(0, 500),
      authors: metadata.authors.slice(0, 1000),
      abstract: metadata.abstract || null,
      justification,
      relevanceArea,
    })
    .onConflictDoNothing();

  return Response.json({
    ok: true,
    title: metadata.title,
    authors: metadata.authors,
  });
}, 'paper-submissions');
