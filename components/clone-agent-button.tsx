'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';
import { encodeAgentId } from '@/lib/agent-links';

export function CloneAgentButton({
  sourceAgentId,
  className,
  label,
  onClone,
}: {
  sourceAgentId: string;
  className?: string;
  label?: string;
  onClone?: () => void;
}) {
  const router = useRouter();

  const handleClone = () => {
    const encoded = encodeAgentId(sourceAgentId);
    router.push(`/agents/clone?source=${encoded}`);
    onClone?.();
  };

  return (
    <button
      type="button"
      onClick={handleClone}
      className={cn(
        'rounded-full border-2 border-foreground/60 px-3 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-accent hover:text-accent',
        className,
      )}
    >
      {label ?? 'Clone & remix'}
    </button>
  );
}
