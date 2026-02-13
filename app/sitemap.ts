// Dynamic sitemap generation for THE PIT.
//
// Includes static marketing routes plus dynamic bout replay pages.
// Uses the Next.js App Router sitemap convention.

import type { MetadataRoute } from 'next';
import { desc, eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { bouts } from '@/db/schema';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thepit.cloud';

/** Revalidate the sitemap every hour. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/arena`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/arena/custom`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/agents`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/research`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/feedback`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.5,
    },
  ];

  // Add completed bout replay pages (most recent 1000)
  let boutRoutes: MetadataRoute.Sitemap = [];
  try {
    const db = requireDb();
    const completedBouts = await db
      .select({ id: bouts.id, updatedAt: bouts.updatedAt })
      .from(bouts)
      .where(eq(bouts.status, 'completed'))
      .orderBy(desc(bouts.createdAt))
      .limit(1000);

    boutRoutes = completedBouts.map((bout) => ({
      url: `${SITE_URL}/b/${bout.id}`,
      lastModified: bout.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    }));
  } catch (error) {
    console.error('[sitemap] Failed to fetch bouts:', error);
    // DB unavailable — return static routes only
  }

  return [...staticRoutes, ...boutRoutes];
}
