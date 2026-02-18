'use client';

import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

import { trackEvent } from '@/lib/analytics';
import { useCopy } from '@/lib/copy-client';

const RELEVANCE_VALUES = [
  'agent-interaction',
  'evaluation',
  'persona',
  'context-windows',
  'prompt-engineering',
  'other',
] as const;

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export function PaperSubmissionForm() {
  const c = useCopy();
  const [arxivUrl, setArxivUrl] = useState('');
  const [justification, setJustification] = useState('');
  const [relevanceArea, setRelevanceArea] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedTitle, setExtractedTitle] = useState('');
  const [extractedAuthors, setExtractedAuthors] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/paper-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arxivUrl, justification, relevanceArea }),
      });

      if (!res.ok) {
        const text = await res.text();
        setErrorMessage(text);
        setStatus('error');
        return;
      }

      const json = await res.json();
      setExtractedTitle(json.title);
      setExtractedAuthors(json.authors);
      setStatus('success');
      trackEvent('paper_submitted', { relevance_area: relevanceArea });
    } catch {
      setErrorMessage(c.common.error);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="border-2 border-accent/40 bg-black/40 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.paperSubmission.success}
        </p>
        <p className="mt-4 text-sm font-bold text-foreground">
          {extractedTitle}
        </p>
        <p className="mt-1 text-xs text-muted">{extractedAuthors}</p>
        <p className="mt-4 text-xs text-muted">
          {c.paperSubmission.successDescription}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setArxivUrl('');
            setJustification('');
            setRelevanceArea('');
          }}
          className="mt-4 text-xs uppercase tracking-[0.3em] text-accent transition hover:underline"
        >
          {c.paperSubmission.submitAnother}
        </button>
      </div>
    );
  }

  return (
    <div>
      <SignedOut>
        <div className="border-2 border-foreground/40 bg-black/40 p-6">
          <p className="text-sm text-muted">
            {c.paperSubmission.signInPrompt}
          </p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="mt-4 border-2 border-accent bg-accent/10 px-6 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
            >
              {c.common.signIn}
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.paperSubmission.fields.arxivUrl}
            </label>
            <input
              type="url"
              value={arxivUrl}
              onChange={(e) => setArxivUrl(e.target.value)}
              placeholder="https://arxiv.org/abs/2305.14325"
              required
              className="border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.paperSubmission.fields.relevanceArea}
            </label>
            <select
              value={relevanceArea}
              onChange={(e) => setRelevanceArea(e.target.value)}
              required
              className="border-2 border-foreground/70 bg-black/60 px-4 py-3 pr-10 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="" disabled>
                {c.paperSubmission.fields.areaPlaceholder}
              </option>
              {RELEVANCE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {c.paperSubmission.relevanceAreas[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.paperSubmission.fields.whyItMatters}
            </label>
            <textarea
              rows={4}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain how this research is relevant to multi-agent debate, agent design, or evaluation..."
              required
              minLength={50}
              maxLength={2000}
              className="resize-none border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-accent focus:outline-none"
            />
            <span className="text-right text-[10px] text-muted">
              {justification.length}/2000
            </span>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="border-2 border-accent bg-accent/10 px-8 py-4 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background disabled:opacity-50"
          >
            {status === 'loading' ? c.paperSubmission.validating : c.paperSubmission.submit}
          </button>

          {status === 'error' && (
            <p className="text-xs uppercase tracking-[0.3em] text-red-400">
              {errorMessage || c.common.error}
            </p>
          )}
        </form>
      </SignedIn>
    </div>
  );
}
