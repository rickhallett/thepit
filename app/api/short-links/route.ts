/**
 * POST /api/short-links — Create a short link for a bout.
 *
 * No auth required — anyone can create a short link for a completed bout.
 * Idempotent: same boutId always returns same slug.
 * Only completed bouts can be shared (not running or errored).
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { bouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  parseValidBody,
  errorResponse,
  API_ERRORS,
} from "@/lib/common/api-utils";
import {
  ShortLinkRequestSchema,
  createShortLink,
} from "@/lib/sharing/short-links";

export async function POST(req: NextRequest) {
  // 1. Parse body with ShortLinkRequestSchema
  const parsed = await parseValidBody(req, ShortLinkRequestSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { boutId } = parsed.data;

  // 2. Verify bout exists AND is completed (only completed bouts are shareable)
  const [bout] = await db
    .select({ id: bouts.id, status: bouts.status })
    .from(bouts)
    .where(eq(bouts.id, boutId))
    .limit(1);

  if (!bout) {
    return errorResponse(404, API_ERRORS.NOT_FOUND, "Bout not found");
  }

  if (bout.status !== "completed") {
    return errorResponse(400, "BOUT_NOT_COMPLETED", "Only completed bouts can be shared");
  }

  // 3. Create short link (idempotent)
  const slug = await createShortLink(boutId);

  // 4. Return response
  return Response.json({
    ok: true,
    slug,
    url: `/b/${slug}`,
  });
}
