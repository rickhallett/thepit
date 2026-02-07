export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
        <header className="border-b-2 border-foreground/70 pb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Privacy
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight">
            Privacy Policy
          </h1>
        </header>
        <p className="text-sm text-muted">
          We store minimal data required to operate bouts, credits, and account
          access. We do not sell your data. Third-party providers (model
          inference, auth, hosting) process data to deliver the service.
        </p>
        <p className="text-sm text-muted">
          If you want to request deletion of your data, contact support and we
          will handle it manually.
        </p>
      </div>
    </main>
  );
}
