import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { paperSubmissions } from '@/db/schema';
import { errorResponse, parseValidBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { parseArxivId, fetchArxivMetadata } from '@/lib/arxiv';
import { ensureUserRecord } from '@/lib/users';
import { paperSubmissionSchema } from '@/lib/api-schemas';

export const runtime = 'nodejs';

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

  const parsed = await parseValidBody(req, paperSubmissionSchema);
  if (parsed.error) return parsed.error;
  const { arxivUrl, justification, relevanceArea } = parsed.data;

  const arxivId = parseArxivId(arxivUrl);
  if (!arxivId) {
    return errorResponse('Invalid arXiv URL.', 400);
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

  return Response.json({
    ok: true,
    title: metadata.title,
    authors: metadata.authors,
  });
}, 'paper-submissions');
