import Link from 'next/link';

import { enabledSocialChannels } from '@/lib/brand';
import { getCopy } from '@/lib/copy';

export async function SiteFooter() {
  const c = await getCopy();
  const socials = enabledSocialChannels();

  return (
    <footer className="border-t-2 border-foreground/70 px-6 py-6 text-[10px] uppercase tracking-[0.35em] text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {/* Social links — only rendered when at least one channel is enabled */}
        {socials.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {socials.map((ch) => (
              <a
                key={ch.key}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
              >
                {ch.label}
              </a>
            ))}
          </div>
        )}

        {/* Navigation links */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>{c.nav.footer.copyright}</span>
          <div className="flex flex-wrap gap-3">
            {c.nav.footer.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
