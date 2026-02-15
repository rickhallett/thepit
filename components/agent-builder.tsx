'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';
import { useCopy } from '@/lib/copy';
import { trackEvent } from '@/lib/analytics';
import { buildStructuredPrompt } from '@/lib/agent-prompts';
import {
  DEFAULT_RESPONSE_LENGTH,
  RESPONSE_LENGTHS,
  type ResponseLength,
} from '@/lib/response-lengths';
import {
  DEFAULT_RESPONSE_FORMAT,
  RESPONSE_FORMATS,
  type ResponseFormatId,
} from '@/lib/response-formats';

type TabId = 'basics' | 'personality' | 'tactics' | 'advanced';

export type AgentBuilderInitialValues = {
  name?: string;
  archetype?: string;
  tone?: string;
  quirks?: string[];
  speechPattern?: string;
  openingMove?: string;
  signatureMove?: string;
  weakness?: string;
  goal?: string;
  fears?: string;
  customInstructions?: string;
  responseLength?: ResponseLength;
  responseFormat?: ResponseFormatId;
  parentId?: string;
};

export function AgentBuilder({
  className,
  initialValues,
}: {
  className?: string;
  initialValues?: AgentBuilderInitialValues;
}) {
  const router = useRouter();
  const c = useCopy();
  const [activeTab, setActiveTab] = useState<TabId>('basics');
  const [name, setName] = useState(initialValues?.name ?? '');
  const [archetype, setArchetype] = useState(initialValues?.archetype ?? '');
  const [tone, setTone] = useState(initialValues?.tone ?? '');
  const [quirks, setQuirks] = useState<string[]>(initialValues?.quirks ?? []);
  const [quirkInput, setQuirkInput] = useState('');
  const [speechPattern, setSpeechPattern] = useState(initialValues?.speechPattern ?? '');
  const [openingMove, setOpeningMove] = useState(initialValues?.openingMove ?? '');
  const [signatureMove, setSignatureMove] = useState(initialValues?.signatureMove ?? '');
  const [weakness, setWeakness] = useState(initialValues?.weakness ?? '');
  const [goal, setGoal] = useState(initialValues?.goal ?? '');
  const [fears, setFears] = useState(initialValues?.fears ?? '');
  const [customInstructions, setCustomInstructions] = useState(initialValues?.customInstructions ?? '');
  const [responseLength, setResponseLength] =
    useState<ResponseLength>(initialValues?.responseLength ?? DEFAULT_RESPONSE_LENGTH);
  const [responseFormat, setResponseFormat] =
    useState<ResponseFormatId>(initialValues?.responseFormat ?? DEFAULT_RESPONSE_FORMAT);
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const parentId = initialValues?.parentId ?? null;

  const previewPrompt = useMemo(() => {
    if (!name.trim()) return '';
    return buildStructuredPrompt({
      name: name.trim(),
      archetype,
      tone,
      quirks,
      speechPattern,
      openingMove,
      signatureMove,
      weakness,
      goal,
      fears,
      customInstructions,
    });
  }, [
    archetype,
    customInstructions,
    fears,
    goal,
    name,
    openingMove,
    quirks,
    signatureMove,
    speechPattern,
    tone,
    weakness,
  ]);

  const handleAddQuirk = () => {
    const value = quirkInput.trim();
    if (!value) return;
    setQuirks((prev) => [...prev, value]);
    setQuirkInput('');
  };

  const handleRemoveQuirk = (value: string) => {
    setQuirks((prev) => prev.filter((quirk) => quirk !== value));
  };

  const handleSubmit = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(c.agentBuilder.validation.nameRequired);
      return;
    }

    const hasContent =
      archetype.trim() ||
      tone.trim() ||
      quirks.length > 0 ||
      speechPattern.trim() ||
      openingMove.trim() ||
      signatureMove.trim() ||
      weakness.trim() ||
      goal.trim() ||
      fears.trim() ||
      customInstructions.trim();

    if (!hasContent) {
      setError(c.agentBuilder.validation.personalityRequired);
      return;
    }

    setStatus('saving');

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          archetype: archetype.trim() || null,
          tone: tone.trim() || null,
          quirks,
          speechPattern: speechPattern.trim() || null,
          openingMove: openingMove.trim() || null,
          signatureMove: signatureMove.trim() || null,
          weakness: weakness.trim() || null,
          goal: goal.trim() || null,
          fears: fears.trim() || null,
          customInstructions: customInstructions.trim() || null,
          responseLength,
          responseFormat,
          parentId,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to create agent.');
      }

      const payload = (await response.json()) as { agentId?: string };
      if (payload.agentId) {
        trackEvent(parentId ? 'agent_cloned' : 'agent_created', { agentId: payload.agentId });
        router.push(`/agents/${payload.agentId}`);
        return;
      }
      throw new Error('Agent created, but no id returned.');
    } catch (submitError) {
      setError((submitError as Error).message);
      return;
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className={cn('grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]', className)}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2 border-2 border-foreground/60 bg-black/70 p-1 text-xs uppercase tracking-[0.3em]">
          {([
            { id: 'basics', label: c.agentBuilder.tabs.basics },
            { id: 'personality', label: c.agentBuilder.tabs.personality },
            { id: 'tactics', label: c.agentBuilder.tabs.tactics },
            { id: 'advanced', label: c.agentBuilder.tabs.advanced },
          ] as { id: TabId; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-2 transition',
                activeTab === tab.id
                  ? 'bg-accent text-background'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'basics' && (
          <div className="grid gap-4">
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.name}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={c.agentBuilder.fields.namePlaceholder}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.archetype}</span>
              <input
                value={archetype}
                onChange={(event) => setArchetype(event.target.value)}
                placeholder={c.agentBuilder.fields.archetypePlaceholder}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.goal}</span>
              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder={c.agentBuilder.fields.goalPlaceholder}
                rows={3}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
          </div>
        )}

        {activeTab === 'personality' && (
          <div className="grid gap-4">
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.tone}</span>
              <input
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                placeholder={c.agentBuilder.fields.tonePlaceholder}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.speechPattern}</span>
              <input
                value={speechPattern}
                onChange={(event) => setSpeechPattern(event.target.value)}
                placeholder={c.agentBuilder.fields.speechPatternPlaceholder}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <div className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.quirks}</span>
              <div className="flex flex-wrap gap-2">
                {quirks.map((quirk) => (
                  <button
                    key={quirk}
                    type="button"
                    onClick={() => handleRemoveQuirk(quirk)}
                    className="rounded-full border border-foreground/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-foreground transition hover:border-accent hover:text-accent"
                  >
                    {quirk}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={quirkInput}
                  onChange={(event) => setQuirkInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault();
                      handleAddQuirk();
                    }
                  }}
                  placeholder={c.agentBuilder.fields.quirksPlaceholder}
                  className="flex-1 border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddQuirk}
                  className="border-2 border-foreground/60 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-accent hover:text-accent"
                >
                  {c.agentBuilder.addButton}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tactics' && (
          <div className="grid gap-4">
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.openingMove}</span>
              <textarea
                value={openingMove}
                onChange={(event) => setOpeningMove(event.target.value)}
                placeholder={c.agentBuilder.fields.openingMovePlaceholder}
                rows={3}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.signatureMove}</span>
              <textarea
                value={signatureMove}
                onChange={(event) => setSignatureMove(event.target.value)}
                placeholder={c.agentBuilder.fields.signatureMovePlaceholder}
                rows={3}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.weakness}</span>
              <textarea
                value={weakness}
                onChange={(event) => setWeakness(event.target.value)}
                placeholder={c.agentBuilder.fields.weaknessPlaceholder}
                rows={3}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="grid gap-4">
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.fears}</span>
              <textarea
                value={fears}
                onChange={(event) => setFears(event.target.value)}
                placeholder={c.agentBuilder.fields.fearsPlaceholder}
                rows={3}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.customInstructions}</span>
              <textarea
                value={customInstructions}
                onChange={(event) => setCustomInstructions(event.target.value)}
                placeholder={c.agentBuilder.fields.customInstructionsPlaceholder}
                rows={6}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.responseLength}</span>
              <select
                value={responseLength}
                onChange={(event) =>
                  setResponseLength(event.target.value as ResponseLength)
                }
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                {RESPONSE_LENGTHS.map((length) => (
                  <option key={length.id} value={length.id}>
                    {length.label} · {length.hint}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.agentBuilder.fields.responseFormat}</span>
              <select
                value={responseFormat}
                onChange={(event) =>
                  setResponseFormat(event.target.value as ResponseFormatId)
                }
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                {RESPONSE_FORMATS.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.label} · {format.hint}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {error && (
          <div className="border-2 border-dashed border-red-400/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'saving'}
            className={cn(
              'border-2 border-foreground/80 px-6 py-3 text-xs uppercase tracking-[0.4em] transition hover:border-accent hover:text-accent',
              status === 'saving' && 'cursor-wait opacity-70',
            )}
          >
            {status === 'saving'
              ? parentId ? c.agentBuilder.submit.cloning : c.agentBuilder.submit.creating
              : parentId ? c.agentBuilder.submit.clone : c.agentBuilder.submit.create}
          </button>
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted">
            {parentId
              ? c.agentBuilder.warnings.cloneLineage
              : c.agentBuilder.warnings.immutable}
          </span>
        </div>
      </div>

      <aside className="flex flex-col gap-4 border-2 border-foreground/60 bg-black/70 p-5">
        <p className="text-xs uppercase tracking-[0.35em] text-muted">
          {c.agentBuilder.promptPreview.title}
        </p>
        <pre className="min-h-[280px] whitespace-pre-wrap border border-foreground/40 bg-black/60 p-4 text-sm text-foreground/90">
          {previewPrompt || c.agentBuilder.promptPreview.empty}
        </pre>
      </aside>
    </div>
  );
}
