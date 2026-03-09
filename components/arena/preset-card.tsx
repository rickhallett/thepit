"use client";

// PresetCard — displays a debate preset with agent lineup and start button.
// Generates a nanoid boutId on submit and navigates to /bout/{id} with query params.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import type { Preset } from "@/lib/bouts/presets";

interface PresetCardProps {
  preset: Preset;
}

export function PresetCard({ preset }: PresetCardProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [model, setModel] = useState("claude-haiku");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const boutId = nanoid(21);
    const searchParams = new URLSearchParams({
      presetId: preset.id,
      model,
    });
    if (topic.trim()) {
      searchParams.set("topic", topic.trim());
    }
    router.push(`/bout/${boutId}?${searchParams.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 border border-stone-700 bg-stone-900 p-4"
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">{preset.name}</h2>
        <p className="mt-1 text-sm text-stone-400">{preset.description}</p>
      </div>

      {/* Agent lineup */}
      <div className="flex flex-wrap gap-2">
        {preset.agents.map((agent) => (
          <span
            key={agent.id}
            className="inline-block rounded px-2 py-1 text-xs font-medium"
            style={{
              backgroundColor: `${agent.color}20`,
              color: agent.color,
              border: `1px solid ${agent.color}40`,
            }}
          >
            {agent.name}
          </span>
        ))}
      </div>

      {/* Meta */}
      <p className="text-xs text-stone-500">
        {preset.maxTurns} turns &middot; {preset.tier} tier
      </p>

      {/* Topic input */}
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Custom topic (optional)"
        className="w-full border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
      />

      {/* Model selector */}
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="w-full border border-stone-700 bg-stone-800 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
      >
        <option value="claude-haiku">Haiku (fast)</option>
        <option value="claude-sonnet" disabled>
          Sonnet (coming soon)
        </option>
      </select>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-stone-100 py-2 font-bold text-stone-900 transition-colors hover:bg-white disabled:opacity-50"
      >
        {isSubmitting ? "Starting..." : "Start Debate"}
      </button>
    </form>
  );
}
