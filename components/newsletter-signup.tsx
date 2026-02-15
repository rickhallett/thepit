'use client';

import { useState } from 'react';
import { useCopy } from '@/lib/copy';

export function NewsletterSignup() {
  const c = useCopy();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw new Error('Failed');
      }
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="border-2 border-foreground/60 bg-black/50 p-6">
      <p className="text-xs uppercase tracking-[0.4em] text-accent">
        {c.newsletter.label}
      </p>
      <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight">
        {c.newsletter.title}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {c.newsletter.description}
      </p>
      <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight">
        Get Darwin Day updates
      </h2>
      <p className="mt-2 text-sm text-muted">
        We’ll send launch updates, new presets, and major milestones.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={c.newsletter.placeholder}
          required
          className="flex-1 border-2 border-foreground/60 bg-black/60 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="border-2 border-accent bg-accent/10 px-6 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {status === 'loading' ? c.newsletter.loading : c.newsletter.submit}
        </button>
      </form>
      {status === 'success' && (
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-accent">
          {c.newsletter.success}
        </p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-red-400">
          {c.newsletter.error}
        </p>
      )}
    </div>
  );
}
