// Data access layer for simple form submissions and analytics inserts.
// Groups newsletter signups, contact submissions, paper submissions,
// and page view recording behind clean function boundaries so route
// handlers do not import from @/db directly.

import { requireDb } from '@/db';
import {
  newsletterSignups,
  contactSubmissions,
  paperSubmissions,
  pageViews,
} from '@/db/schema';

/**
 * Record a newsletter signup. Uses onConflictDoNothing to silently
 * handle duplicate email addresses.
 */
export async function subscribeNewsletter(email: string): Promise<void> {
  const db = requireDb();
  await db
    .insert(newsletterSignups)
    .values({ email })
    .onConflictDoNothing();
}

/**
 * Persist a contact form submission to the database.
 * Email delivery is handled separately in the route handler.
 */
export async function submitContact(data: {
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  const db = requireDb();
  await db.insert(contactSubmissions).values({
    name: data.name,
    email: data.email,
    message: data.message,
  });
}

/**
 * Record a paper submission. Uses onConflictDoNothing to handle
 * duplicate (userId, arxivId) pairs gracefully.
 */
export async function submitPaper(data: {
  userId: string;
  arxivId: string;
  arxivUrl: string;
  title: string;
  authors: string;
  abstract: string | null;
  justification: string;
  relevanceArea: string;
}): Promise<void> {
  const db = requireDb();
  await db
    .insert(paperSubmissions)
    .values({
      userId: data.userId,
      arxivId: data.arxivId,
      arxivUrl: data.arxivUrl,
      title: data.title,
      authors: data.authors,
      abstract: data.abstract,
      justification: data.justification,
      relevanceArea: data.relevanceArea,
    })
    .onConflictDoNothing();
}

/**
 * Insert a page view record into the analytics table.
 */
export async function recordPageView(data: {
  path: string;
  userId: string | null;
  sessionId: string;
  referrer: string | null;
  userAgent: string | null;
  ipHash: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  country: string | null;
  copyVariant: string | null;
}): Promise<void> {
  const db = requireDb();
  await db.insert(pageViews).values({
    path: data.path,
    userId: data.userId,
    sessionId: data.sessionId,
    referrer: data.referrer,
    userAgent: data.userAgent,
    ipHash: data.ipHash,
    utmSource: data.utmSource,
    utmMedium: data.utmMedium,
    utmCampaign: data.utmCampaign,
    utmTerm: data.utmTerm,
    utmContent: data.utmContent,
    country: data.country,
    copyVariant: data.copyVariant,
  });
}
