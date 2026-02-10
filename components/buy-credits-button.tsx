'use client';

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
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
