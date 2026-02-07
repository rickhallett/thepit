export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
        <header className="border-b-2 border-foreground/70 pb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Terms
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight">
            Terms of Service
          </h1>
        </header>
        <p className="text-sm text-muted">
          By using THE PIT you agree to follow our usage rules and not abuse the
          service. We may suspend access if we detect misuse or attempts to
          exploit the platform.
        </p>
        <p className="text-sm text-muted">
          All credit purchases are final. We do not offer refunds for unused
          credits.
        </p>
      </div>
    </main>
  );
}
