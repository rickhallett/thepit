// Run list table component (M3.5). Server component.

import Link from 'next/link';
import type { Run } from '@/lib/run/types';
import { StatusBadge } from './StatusBadge';

type RunListProps = {
  runs: Run[];
};

/** Format a Date or string timestamp for display. */
function formatDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export function RunList({ runs }: RunListProps) {
  if (runs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/50">
        No runs found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-xs uppercase tracking-[0.2em] text-muted">
            <th className="pb-2 pr-4">Run ID</th>
            <th className="pb-2 pr-4">Task ID</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="border-b border-foreground/5 transition hover:bg-foreground/[0.02]"
            >
              <td className="py-2 pr-4">
                <Link
                  href={`/runs/${run.id}`}
                  className="font-mono text-accent transition hover:underline"
                >
                  {run.id}
                </Link>
              </td>
              <td className="py-2 pr-4 font-mono text-foreground/50">
                {run.taskId}
              </td>
              <td className="py-2 pr-4">
                <StatusBadge status={run.status} />
              </td>
              <td className="py-2 font-mono text-foreground/50">
                {formatDate(run.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
