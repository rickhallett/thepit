'use client';

import { useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { trackEvent } from '@/lib/analytics';

function SubmitButton() {
  const { pending } = useFormStatus();
  const wasIdle = useRef(true);

  useEffect(() => {
    if (pending && wasIdle.current) {
      trackEvent('credit_purchase_initiated');
    }
    wasIdle.current = !pending;
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border-2 border-foreground/60 px-3 py-2 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {pending ? 'Processing...' : 'Buy credits'}
    </button>
  );
}

export function BuyCreditsButton() {
  return <SubmitButton />;
}
