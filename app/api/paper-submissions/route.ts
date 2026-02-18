import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { paperSubmissions } from '@/db/schema';
import { errorResponse, parseJsonBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { parseArxivId, fetchArxivMetadata } from '@/lib/arxiv';
import { ensureUserRecord } from '@/lib/users';
import { UNSAFE_PATTERN } from '@/lib/validation';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';

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
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const rateCheck = checkRateLimit(
    { name: 'paper-submissions', maxRequests: 5, windowMs: 60 * 60 * 1000 },
    userId,
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseJsonBody<{
    arxivUrl?: string;
    justification?: string;
    relevanceArea?: string;
  }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

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
    return errorResponse('arXiv URL required.', 400);
  }

  const arxivId = parseArxivId(arxivUrl);
  if (!arxivId) {
    return errorResponse('Invalid arXiv URL.', 400);
  }

  if (!VALID_AREAS.includes(relevanceArea as (typeof VALID_AREAS)[number])) {
    return errorResponse('Invalid relevance area.', 400);
  }

  if (justification.length < 50) {
    return errorResponse('Justification must be at least 50 characters.', 400);
  }

  if (justification.length > 2000) {
    return errorResponse('Justification must be 2000 characters or fewer.', 400);
  }

  if (UNSAFE_PATTERN.test(justification)) {
    return errorResponse('Justification must not contain URLs or scripts.', 400);
  }

  const metadata = await fetchArxivMetadata(arxivId);
  if (!metadata) {
    return errorResponse('Paper not found on arXiv.', 400);
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

  log.info('paper.submitted', {
    userId,
    arxivId,
    title: metadata.title.slice(0, 120),
    relevanceArea,
  });

  return Response.json({
    ok: true,
    title: metadata.title,
    authors: metadata.authors,
  });
}, 'paper-submissions');
