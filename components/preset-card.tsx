import type { Preset } from '@/lib/presets';

export function PresetCard({
  preset,
  action,
}: {
  preset: Preset;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form
      action={action}
      className="group flex h-full flex-col gap-6 border-2 border-foreground/80 bg-black/60 p-6 shadow-[8px_8px_0_rgba(255,255,255,0.15)] transition hover:-translate-y-1"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">
            Preset
          </p>
          <h3 className="mt-2 font-sans text-2xl uppercase tracking-tight">
            {preset.name}
          </h3>
        </div>
        <button
          type="submit"
          className="rounded-full border-2 border-foreground/70 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-accent hover:text-accent"
        >
          Enter
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em]">
        {preset.agents.map((agent) => (
          <span
            key={agent.id}
            className="rounded-full border-2 px-3 py-1"
            style={{ borderColor: agent.color, color: agent.color }}
          >
            {agent.name}
          </span>
        ))}
      </div>

      <p className="text-sm text-muted">
        Max turns: <span className="text-foreground">{preset.maxTurns}</span>
      </p>
    </form>
  );
}
