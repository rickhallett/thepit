// Arena page — preset selection grid.
// Server component that loads presets and displays them as cards.
// Users pick a preset, which navigates to /bout/{nanoid} with query params.

import { getAllPresets } from "@/lib/bouts/presets";
import { PresetCard } from "@/components/arena/preset-card";

export default async function ArenaPage() {
  const presets = getAllPresets();

  // TODO(phase4-economy): Add credit balance display here once credits domain lands.

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">The Arena</h1>
      <p className="mb-6 text-stone-400">
        Pick a debate format to start a new bout.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {presets.map((preset) => (
          <PresetCard key={preset.id} preset={preset} />
        ))}
      </div>
    </main>
  );
}
