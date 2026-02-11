export default function ArenaLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
        <header className="flex flex-col gap-5 border-b-2 border-foreground/70 pb-8">
          <div className="h-10 w-64 animate-pulse rounded bg-foreground/10 md:w-80" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-foreground/5" />
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex h-40 flex-col gap-4 border-2 border-foreground/20 bg-black/30 p-6"
            >
              <div className="h-3 w-20 animate-pulse rounded bg-foreground/10" />
              <div className="h-6 w-48 animate-pulse rounded bg-foreground/10" />
              <div className="h-3 w-full max-w-xs animate-pulse rounded bg-foreground/5" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
