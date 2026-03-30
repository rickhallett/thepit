// Colored badge for run status values (M3.5).

import type { RunStatus } from '@/lib/run/types';

type StatusBadgeProps = {
  status: RunStatus;
};

const statusColors: Record<RunStatus, string> = {
  pending: 'border-gray-400/50 bg-gray-400/10 text-gray-400',
  running: 'border-blue-400/50 bg-blue-400/10 text-blue-400',
  completed: 'border-green-400/50 bg-green-400/10 text-green-400',
  failed: 'border-red-400/50 bg-red-400/10 text-red-400',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status];

  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${colors}`}
    >
      {status}
    </span>
  );
}
