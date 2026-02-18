// Short link resolver — GET /s/:slug
//
// Looks up the slug, records a click for analytics (fire-and-forget),
// then 302-redirects to /b/:boutId. Unknown slugs return 404.

import { resolveShortLink, recordClick } from '@/lib/short-links';
import { log } from '@/lib/logger';
import { serverTrack } from '@/lib/posthog-server';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> | { slug: string } },
) {
  const { slug } = await params;

  if (!slug || slug.length > 32) {
    return new Response('Not found.', { status: 404 });
  }

  const link = await resolveShortLink(slug);
  if (!link) {
    return new Response('Not found.', { status: 404 });
  }

  // Record click analytics in the background — don't block redirect
  recordClick(link.id, link.boutId, req).catch((err) => {
    log.warn('Failed to record short link click', err as Error, {
      slug,
      boutId: link.boutId,
    });
  });

  // PostHog event for viral funnel tracking — complements the DB-only recordClick
  serverTrack('anonymous', 'short_link_clicked', {
    slug,
    bout_id: link.boutId,
  });

  const url = new URL(req.url);
  const destination = new URL(`/b/${link.boutId}`, url.origin);

  return Response.redirect(destination.toString(), 302);
}
