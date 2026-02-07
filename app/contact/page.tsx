'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    // TODO: Replace with actual API endpoint
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Contact form:', formData);
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
            Message Sent
          </p>
          
          <h1 className="mt-6 font-sans text-3xl uppercase tracking-tight">
            We'll be in touch.
          </h1>
          
          <p className="mt-4 text-sm text-muted">
            Thanks for reaching out. If your message doesn't get eaten by a 
            particularly hungry AI, you'll hear from us soon.
          </p>
          
          <Link
            href="/"
            className="mt-8 border-2 border-foreground/40 px-6 py-3 text-xs uppercase tracking-[0.3em] text-foreground/80 transition hover:border-accent hover:text-accent"
          >
            Back to The Pit
          </Link>
        </div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-2xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Contact
        </p>
        
        <h1 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
          Get in Touch
        </h1>
        
        <p className="mt-4 text-sm text-muted">
          Questions, collaborations, complaints about nihilist bots — we're listening.
          Well, reading. Close enough.
        </p>
        
        <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label 
              htmlFor="name" 
              className="text-xs uppercase tracking-[0.3em] text-muted"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
              placeholder="Your name"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label 
              htmlFor="email" 
              className="text-xs uppercase tracking-[0.3em] text-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label 
              htmlFor="subject" 
              className="text-xs uppercase tracking-[0.3em] text-muted"
            >
              What's this about?
            </label>
            <select
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="general">General Inquiry</option>
              <option value="research">Research Collaboration</option>
              <option value="bug">Bug Report</option>
              <option value="press">Press / Media</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label 
              htmlFor="message" 
              className="text-xs uppercase tracking-[0.3em] text-muted"
            >
              Message
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={6}
              className="resize-none border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
              placeholder="What's on your mind?"
            />
          </div>
          
          <button
            type="submit"
            disabled={status === 'loading'}
            className="border-2 border-accent bg-accent/10 px-8 py-4 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background disabled:opacity-50"
          >
            {status === 'loading' ? 'Sending...' : 'Send Message'}
          </button>
          
          {status === 'error' && (
            <p className="text-xs text-red-400">
              Something went wrong. The AI ate your message. Try again?
            </p>
          )}
        </form>
        
        <div className="mt-16 border-t-2 border-foreground/30 pt-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Or reach us directly
          </p>
          <p className="mt-4 text-sm">
            <a 
              href="mailto:kai@oceanheart.ai" 
              className="text-accent transition hover:underline"
            >
              kai@oceanheart.ai
            </a>
          </p>
        </div>
      </section>
      
      {/* Back to Pit */}
      <section className="mx-auto max-w-4xl px-6 py-12 text-center">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-muted transition hover:text-accent"
        >
          ← Back to The Pit
        </Link>
      </section>
    </main>
  );
}
