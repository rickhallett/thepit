export default function ReplayLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 animate-pulse rounded bg-accent/30" />
          <div className="h-3 w-32 animate-pulse rounded bg-foreground/10" />
        </div>

        <div className="border-2 border-foreground/20 bg-black/30 p-6">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-3 w-24 animate-pulse rounded bg-foreground/10" />
                <div className="h-4 w-full animate-pulse rounded bg-foreground/5" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
