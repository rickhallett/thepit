// Robots.txt configuration for The Pit.
//
// Allows all crawlers for public pages. Disallows API routes,
// admin endpoints, and internal paths.

import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thepit.cloud';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/s/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
