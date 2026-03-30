// Multi-step form for creating a run with task + contestants (M3.3).
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ModelSelector } from '@/components/eval/ModelSelector';
import { PitButton } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskData = {
  name: string;
  prompt: string;
  constraints: string[];
  acceptanceCriteria: string[];
};

type ContestantData = {
  label: string;
  model: string;
  systemPrompt: string;
  temperature: number;
};

function emptyContestant(): ContestantData {
  return { label: '', model: '', systemPrompt: '', temperature: 0.7 };
}

// ---------------------------------------------------------------------------
// Step 1: Task definition
// ---------------------------------------------------------------------------

function TaskStep({
  task,
  onUpdate,
  onNext,
}: {
  task: TaskData;
  onUpdate: (t: TaskData) => void;
  onNext: () => void;
}) {
  function addConstraint() {
    onUpdate({ ...task, constraints: [...task.constraints, ''] });
  }

  function removeConstraint(idx: number) {
    onUpdate({
      ...task,
      constraints: task.constraints.filter((_, i) => i !== idx),
    });
  }

  function updateConstraint(idx: number, value: string) {
    const next = [...task.constraints];
    next[idx] = value;
    onUpdate({ ...task, constraints: next });
  }

  function addCriterion() {
    onUpdate({
      ...task,
      acceptanceCriteria: [...task.acceptanceCriteria, ''],
    });
  }

  function removeCriterion(idx: number) {
    onUpdate({
      ...task,
      acceptanceCriteria: task.acceptanceCriteria.filter((_, i) => i !== idx),
    });
  }

  function updateCriterion(idx: number, value: string) {
    const next = [...task.acceptanceCriteria];
    next[idx] = value;
    onUpdate({ ...task, acceptanceCriteria: next });
  }

  const canProceed = task.name.trim().length > 0 && task.prompt.trim().length > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xs uppercase tracking-[0.3em] text-muted">
        Step 1 / Task Definition
      </h2>

      <div>
        <label htmlFor="task-name" className="mb-1 block text-sm text-foreground/70">
          Name
        </label>
        <input
          id="task-name"
          type="text"
          value={task.name}
          onChange={(e) => onUpdate({ ...task, name: e.target.value })}
          placeholder="e.g. Summarise quarterly report"
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="task-prompt" className="mb-1 block text-sm text-foreground/70">
          Prompt
        </label>
        <textarea
          id="task-prompt"
          value={task.prompt}
          onChange={(e) => onUpdate({ ...task, prompt: e.target.value })}
          rows={4}
          placeholder="The prompt that each contestant will receive."
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none"
        />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm text-foreground/70">
          Constraints
        </legend>
        <div className="space-y-2">
          {task.constraints.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={c}
                onChange={(e) => updateConstraint(idx, e.target.value)}
                placeholder={`Constraint ${idx + 1}`}
                className="flex-1 rounded border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none"
              />
              <PitButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeConstraint(idx)}
              >
                Remove
              </PitButton>
            </div>
          ))}
        </div>
        <PitButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={addConstraint}
          className="mt-2"
        >
          Add constraint
        </PitButton>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm text-foreground/70">
          Acceptance Criteria
        </legend>
        <div className="space-y-2">
          {task.acceptanceCriteria.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={c}
                onChange={(e) => updateCriterion(idx, e.target.value)}
                placeholder={`Criterion ${idx + 1}`}
                className="flex-1 rounded border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none"
              />
              <PitButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCriterion(idx)}
              >
                Remove
              </PitButton>
            </div>
          ))}
        </div>
        <PitButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={addCriterion}
          className="mt-2"
        >
          Add criterion
        </PitButton>
      </fieldset>

      <div className="flex justify-end pt-2">
        <PitButton type="button" disabled={!canProceed} onClick={onNext}>
          Next
        </PitButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Contestants
// ---------------------------------------------------------------------------

function ContestantCard({
  index,
  data,
  onUpdate,
  onRemove,
  canRemove,
}: {
  index: number;
  data: ContestantData;
  onUpdate: (d: ContestantData) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded border border-foreground/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.3em] text-muted">
          Contestant {index + 1}
        </h3>
        {canRemove && (
          <PitButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
          >
            Remove
          </PitButton>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor={`contestant-label-${index}`}
            className="mb-1 block text-sm text-foreground/70"
          >
            Label
          </label>
          <input
            id={`contestant-label-${index}`}
            type="text"
            value={data.label}
            onChange={(e) => onUpdate({ ...data, label: e.target.value })}
            placeholder="e.g. GPT-4o baseline"
            className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`contestant-model-${index}`}
            className="mb-1 block text-sm text-foreground/70"
          >
            Model
          </label>
          <ModelSelector
            id={`contestant-model-${index}`}
            value={data.model}
            onChange={(model) => onUpdate({ ...data, model })}
          />
        </div>

        <div>
          <label
            htmlFor={`contestant-system-${index}`}
            className="mb-1 block text-sm text-foreground/70"
          >
            System Prompt
          </label>
          <textarea
            id={`contestant-system-${index}`}
            value={data.systemPrompt}
            onChange={(e) =>
              onUpdate({ ...data, systemPrompt: e.target.value })
            }
            rows={3}
            placeholder="Optional system prompt for this contestant."
            className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`contestant-temp-${index}`}
            className="mb-1 block text-sm text-foreground/70"
          >
            Temperature: {data.temperature}
          </label>
          <input
            id={`contestant-temp-${index}`}
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={data.temperature}
            onChange={(e) =>
              onUpdate({ ...data, temperature: parseFloat(e.target.value) })
            }
            className="w-full accent-accent"
          />
        </div>
      </div>
    </div>
  );
}

function ContestantsStep({
  contestants,
  onUpdate,
  onBack,
  onNext,
}: {
  contestants: ContestantData[];
  onUpdate: (c: ContestantData[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  function addContestant() {
    onUpdate([...contestants, emptyContestant()]);
  }

  function removeContestant(idx: number) {
    onUpdate(contestants.filter((_, i) => i !== idx));
  }

  function updateContestant(idx: number, data: ContestantData) {
    const next = [...contestants];
    next[idx] = data;
    onUpdate(next);
  }

  const allValid = contestants.length >= 2 &&
    contestants.every(
      (c) =>
        c.label.trim().length > 0 &&
        c.model.trim().length > 0,
    );

  return (
    <div className="space-y-4">
      <h2 className="text-xs uppercase tracking-[0.3em] text-muted">
        Step 2 / Contestants
      </h2>

      <div className="space-y-4">
        {contestants.map((c, idx) => (
          <ContestantCard
            key={idx}
            index={idx}
            data={c}
            onUpdate={(d) => updateContestant(idx, d)}
            onRemove={() => removeContestant(idx)}
            canRemove={contestants.length > 2}
          />
        ))}
      </div>

      <PitButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={addContestant}
      >
        Add contestant
      </PitButton>

      <div className="flex justify-between pt-2">
        <PitButton type="button" variant="ghost" onClick={onBack}>
          Back
        </PitButton>
        <PitButton type="button" disabled={!allValid} onClick={onNext}>
          Next
        </PitButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Confirm and submit
// ---------------------------------------------------------------------------

function ConfirmStep({
  task,
  contestants,
  onBack,
  onSubmit,
  submitting,
  error,
}: {
  task: TaskData;
  contestants: ContestantData[];
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs uppercase tracking-[0.3em] text-muted">
        Step 3 / Confirm
      </h2>

      <div className="rounded border border-foreground/10 p-4">
        <h3 className="mb-2 text-xs uppercase tracking-[0.3em] text-muted">
          Task
        </h3>
        <p className="text-sm">
          <span className="text-foreground/70">Name:</span> {task.name}
        </p>
        <p className="mt-1 text-sm">
          <span className="text-foreground/70">Prompt:</span>{' '}
          {task.prompt.length > 200
            ? task.prompt.slice(0, 200) + '...'
            : task.prompt}
        </p>
        {task.constraints.length > 0 && (
          <div className="mt-2">
            <span className="text-sm text-foreground/70">Constraints:</span>
            <ul className="ml-4 list-disc text-sm">
              {task.constraints
                .filter((c) => c.trim())
                .map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
            </ul>
          </div>
        )}
        {task.acceptanceCriteria.length > 0 && (
          <div className="mt-2">
            <span className="text-sm text-foreground/70">
              Acceptance Criteria:
            </span>
            <ul className="ml-4 list-disc text-sm">
              {task.acceptanceCriteria
                .filter((c) => c.trim())
                .map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded border border-foreground/10 p-4">
        <h3 className="mb-2 text-xs uppercase tracking-[0.3em] text-muted">
          Contestants ({contestants.length})
        </h3>
        <div className="space-y-2">
          {contestants.map((c, idx) => (
            <div
              key={idx}
              className="flex items-baseline gap-3 text-sm"
            >
              <span className="font-mono text-accent">{idx + 1}.</span>
              <span>{c.label}</span>
              <span className="text-foreground/50">{c.model}</span>
              <span className="text-foreground/50">t={c.temperature}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-400/50 bg-red-400/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <PitButton
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </PitButton>
        <PitButton
          type="button"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? 'Creating...' : 'Create Run'}
        </PitButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RunForm (root)
// ---------------------------------------------------------------------------

export function RunForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRunId, setCreatedRunId] = useState<string | null>(null);

  const [task, setTask] = useState<TaskData>({
    name: '',
    prompt: '',
    constraints: [],
    acceptanceCriteria: [],
  });

  const [contestants, setContestants] = useState<ContestantData[]>([
    emptyContestant(),
    emptyContestant(),
  ]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      const body = {
        task: {
          name: task.name,
          prompt: task.prompt,
          constraints: task.constraints.filter((c) => c.trim()),
          acceptanceCriteria: task.acceptanceCriteria.filter((c) => c.trim()),
        },
        contestants: contestants.map((c) => ({
          label: c.label,
          model: c.model,
          systemPrompt: c.systemPrompt || undefined,
          temperature: c.temperature,
        })),
      };

      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ?? `Failed to create run (${res.status})`,
        );
      }

      const data = await res.json();
      setCreatedRunId(data.id);
      router.push(`/runs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }, [task, contestants, router]);

  if (createdRunId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-foreground/70">
          Run created successfully.
        </p>
        <a
          href={`/runs/${createdRunId}`}
          className="text-sm text-accent underline"
        >
          View run {createdRunId}
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="mb-6 flex gap-2">
        {['Task', 'Contestants', 'Confirm'].map((label, idx) => (
          <div
            key={label}
            className={`flex-1 border-b-2 pb-2 text-center text-xs uppercase tracking-[0.2em] ${
              idx === step
                ? 'border-accent text-accent'
                : idx < step
                  ? 'border-foreground/30 text-foreground/50'
                  : 'border-foreground/10 text-foreground/30'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <TaskStep
          task={task}
          onUpdate={setTask}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <ContestantsStep
          contestants={contestants}
          onUpdate={setContestants}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <ConfirmStep
          task={task}
          contestants={contestants}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  );
}
