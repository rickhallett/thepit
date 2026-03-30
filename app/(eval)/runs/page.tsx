// Run list page (M3.5). Server component listing runs with status filter
// and pagination. Closes #128.

import Link from 'next/link';
import { requireDb } from '@/db';
import { listRuns } from '@/lib/run/runs';
import { RunList } from '@/components/eval/RunList';
import type { RunStatus } from '@/lib/run/types';

export const metadata = {
  title: 'Runs - The Pit',
};

const VALID_STATUSES: RunStatus[] = ['pending', 'running', 'completed', 'failed'];
const DEFAULT_LIMIT = 20;

function isValidStatus(value: string): value is RunStatus {
  return (VALID_STATUSES as string[]).includes(value);
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Parse status filter.
  const rawStatus = typeof params.status === 'string' ? params.status : undefined;
  const status = rawStatus && isValidStatus(rawStatus) ? rawStatus : undefined;

  // Parse pagination.
  const rawOffset = typeof params.offset === 'string' ? parseInt(params.offset, 10) : 0;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const db = requireDb();
  const runs = await listRuns(db, { status, limit: DEFAULT_LIMIT, offset });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-lg uppercase tracking-[0.3em] text-foreground">
        Runs
      </h1>

      {/* Status filter tabs */}
      <nav className="flex gap-2 border-b border-foreground/10 pb-2">
        <StatusTab label="All" value={undefined} current={status} />
        {VALID_STATUSES.map((s) => (
          <StatusTab key={s} label={s} value={s} current={status} />
        ))}
      </nav>

      <RunList runs={runs} />

      {/* Pagination */}
      <div className="flex items-center gap-4 text-sm">
        {offset > 0 && (
          <Link
            href={buildHref(status, Math.max(0, offset - DEFAULT_LIMIT))}
            className="text-accent transition hover:underline"
          >
            Previous
          </Link>
        )}
        {runs.length === DEFAULT_LIMIT && (
          <Link
            href={buildHref(status, offset + DEFAULT_LIMIT)}
            className="text-accent transition hover:underline"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

/** Build href for pagination/filter links. */
function buildHref(status: RunStatus | undefined, offset: number): string {
  const parts: string[] = [];
  if (status) parts.push(`status=${status}`);
  if (offset > 0) parts.push(`offset=${offset}`);
  return parts.length > 0 ? `/runs?${parts.join('&')}` : '/runs';
}

/** A single status filter tab rendered as a link. */
function StatusTab({
  label,
  value,
  current,
}: {
  label: string;
  value: RunStatus | undefined;
  current: RunStatus | undefined;
}) {
  const active = value === current;
  const href = buildHref(value, 0);

  return (
    <Link
      href={href}
      className={`rounded px-3 py-1 text-xs uppercase tracking-[0.2em] transition ${
        active
          ? 'bg-foreground/10 text-foreground'
          : 'text-foreground/50 hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
