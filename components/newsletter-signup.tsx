'use client';

import { useState } from 'react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;
    
    setStatus('loading');
    
    // TODO: Replace with actual API endpoint
    try {
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // For now, just log it
      console.log('Newsletter signup:', email);
      
      setStatus('success');
      setMessage("You're in. We'll ping you when the gates open.");
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Try again?');
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Get Notified
        </p>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          Strictly no spam. We have better things to do.
        </p>
      </div>
      
      {status === 'success' ? (
        <div className="border-2 border-accent/50 bg-accent/10 px-6 py-4 text-center">
          <p className="text-sm text-accent">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={status === 'loading'}
            className="flex-1 border-2 border-foreground/70 bg-black/60 px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="border-2 border-accent bg-accent/10 px-6 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background disabled:opacity-50"
          >
            {status === 'loading' ? 'Joining...' : 'Join'}
          </button>
        </form>
      )}
      
      {status === 'error' && (
        <p className="text-xs text-red-400">{message}</p>
      )}
    </div>
  );
}
