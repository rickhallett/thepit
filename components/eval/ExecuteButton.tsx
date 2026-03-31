// Button to trigger run execution via POST /api/runs/:id/execute.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PitButton } from '@/components/ui/button';

type ExecuteButtonProps = {
  runId: string;
};

export function ExecuteButton({ runId }: ExecuteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExecute() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/runs/${runId}/execute`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ?? `Execution failed (${res.status})`,
        );
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded border border-foreground/10 p-4">
      <h3 className="text-xs uppercase tracking-[0.3em] text-muted">
        Execute Run
      </h3>
      <p className="text-sm text-foreground/50">
        Call each contestant model and capture traces. This costs real tokens.
      </p>

      {error && (
        <div className="rounded border border-red-400/50 bg-red-400/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <PitButton
        type="button"
        onClick={handleExecute}
        disabled={loading}
      >
        {loading ? 'Executing...' : 'Execute Run'}
      </PitButton>
    </div>
  );
}
