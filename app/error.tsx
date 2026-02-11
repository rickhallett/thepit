'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-xs uppercase tracking-[0.4em] text-red-400">
        Something went wrong.
      </p>
      <button
        type="button"
        onClick={reset}
        className="border-2 border-foreground/60 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-accent hover:text-accent"
      >
        Try again
      </button>
    </div>
  );
}
