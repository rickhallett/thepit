'use client';

import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

import { trackEvent } from '@/lib/analytics';
import { useCopy } from '@/lib/copy';

const CATEGORY_VALUES = ['agents', 'arena', 'presets', 'research', 'ui', 'other'] as const;

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export function FeatureRequestForm() {
  const c = useCopy();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category }),
      });

      if (!res.ok) {
        const text = await res.text();
        setErrorMessage(text);
        setStatus('error');
        return;
      }

      setStatus('success');
      trackEvent('feature_request_submitted', { category });
    } catch {
      setErrorMessage(c.featureRequest.form.error);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="border-2 border-accent/40 bg-black/40 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.featureRequest.form.success}
        </p>
        <p className="mt-4 text-sm text-muted">
          {c.featureRequest.form.successDescription}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setTitle('');
            setDescription('');
            setCategory('');
          }}
          className="mt-4 text-xs uppercase tracking-[0.3em] text-accent transition hover:underline"
        >
          {c.featureRequest.form.submitAnother}
        </button>
      </div>
    );
  }

  return (
    <div>
      <SignedOut>
        <div className="border-2 border-foreground/40 bg-black/40 p-6">
          <p className="text-sm text-muted">
            {c.featureRequest.form.signInPrompt}
          </p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="mt-4 border-2 border-accent bg-accent/10 px-6 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.featureRequest.form.fields.title}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short summary of your idea"
              required
              minLength={5}
              maxLength={200}
              className="border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.featureRequest.form.fields.category}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="border-2 border-foreground/70 bg-black/60 px-4 py-3 pr-10 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="" disabled>
                {c.featureRequest.form.fields.categoryPlaceholder}
              </option>
              {CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {c.featureRequest.form.categories[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.featureRequest.form.fields.description}
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you'd like to see, why it matters, and how it would work..."
              required
              minLength={20}
              maxLength={3000}
              className="resize-none border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-accent focus:outline-none"
            />
            <span className="text-right text-[10px] text-muted">
              {description.length}/3000
            </span>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="border-2 border-accent bg-accent/10 px-8 py-4 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background disabled:opacity-50"
          >
            {status === 'loading' ? c.featureRequest.form.submitting : c.featureRequest.form.submit}
          </button>

          {status === 'error' && (
            <p className="text-xs uppercase tracking-[0.3em] text-red-400">
              {errorMessage || c.featureRequest.form.error}
            </p>
          )}
        </form>
      </SignedIn>
    </div>
  );
}
