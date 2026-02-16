'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useCopy } from '@/lib/copy-client';

export default function ContactPage() {
  const c = useCopy();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        throw new Error('Failed');
      }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.contact.success.title}
          </p>
          <h1 className="mt-6 font-sans text-3xl uppercase tracking-tight">
            {c.contact.success.subtitle}
          </h1>
          <p className="mt-4 text-sm text-muted">
            {c.contact.success.description}
          </p>
          <Link
            href="/"
            className="mt-8 border-2 border-foreground/40 px-6 py-3 text-xs uppercase tracking-[0.3em] text-foreground/80 transition hover:border-accent hover:text-accent"
          >
            {c.contact.backToThePit}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-2xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">{c.contact.label}</p>
        <h1 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
          {c.contact.title}
        </h1>
        <p className="mt-4 text-sm text-muted">
          {c.contact.description}
        </p>
        <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.contact.form.name}
            </label>
            <input
              value={formData.name}
              onChange={(event) =>
                setFormData({ ...formData, name: event.target.value })
              }
              required
              className="border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.contact.form.email}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(event) =>
                setFormData({ ...formData, email: event.target.value })
              }
              required
              className="border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.contact.form.message}
            </label>
            <textarea
              rows={6}
              value={formData.message}
              onChange={(event) =>
                setFormData({ ...formData, message: event.target.value })
              }
              required
              className="resize-none border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="border-2 border-accent bg-accent/10 px-8 py-4 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background disabled:opacity-50"
          >
            {status === 'loading' ? c.contact.form.sending : c.contact.form.send}
          </button>
          {status === 'error' && (
            <p className="text-xs uppercase tracking-[0.3em] text-red-400">
              {c.contact.form.error}
            </p>
          )}
        </form>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-12 text-center">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-muted transition hover:text-accent"
        >
          {c.contact.backToThePit}
        </Link>
      </section>
    </main>
  );
}
