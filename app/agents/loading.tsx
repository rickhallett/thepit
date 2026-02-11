export default function AgentsLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="border-b-2 border-foreground/70 pb-6">
          <div className="h-3 w-16 animate-pulse rounded bg-accent/30" />
          <div className="mt-3 h-8 w-40 animate-pulse rounded bg-foreground/10" />
          <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-foreground/5" />
        </header>

        <div className="flex flex-wrap items-center gap-4">
          <div className="h-9 w-64 animate-pulse rounded border-2 border-foreground/20 bg-black/30" />
          <div className="h-9 w-52 animate-pulse rounded border-2 border-foreground/20 bg-black/30" />
          <div className="h-9 w-40 animate-pulse rounded border-2 border-foreground/20 bg-black/30" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-2 border-foreground/20 bg-black/30 p-4"
            >
              <div className="flex flex-col gap-2">
                <div className="h-4 w-36 animate-pulse rounded bg-foreground/10" />
                <div className="h-3 w-24 animate-pulse rounded bg-foreground/5" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full border-2 border-foreground/20 bg-black/30" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
