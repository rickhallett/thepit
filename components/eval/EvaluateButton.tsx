// Button to trigger run evaluation via POST /api/runs/:id/evaluate (M3.4).
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PitButton } from '@/components/ui/button';

type EvaluateButtonProps = {
  runId: string;
};

export function EvaluateButton({ runId }: EvaluateButtonProps) {
  const router = useRouter();
  const [rubricId, setRubricId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEvaluate() {
    if (!rubricId.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/runs/${runId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubricId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ?? `Evaluation failed (${res.status})`,
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
        Evaluate Run
      </h3>

      <div>
        <label
          htmlFor="rubric-id"
          className="mb-1 block text-sm text-foreground/70"
        >
          Rubric ID
        </label>
        <input
          id="rubric-id"
          type="text"
          value={rubricId}
          onChange={(e) => setRubricId(e.target.value)}
          placeholder="Enter rubric ID"
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded border border-red-400/50 bg-red-400/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <PitButton
        type="button"
        onClick={handleEvaluate}
        disabled={loading || !rubricId.trim()}
      >
        {loading ? 'Evaluating...' : 'Evaluate'}
      </PitButton>
    </div>
  );
}
