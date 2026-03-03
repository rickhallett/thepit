import { loadSlopodar, getDomains } from "@/lib/common/slopodar";
import { SlopticsBrowser } from "./sloptics-browser";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sloptics — The Slopodar | The Pit",
  description:
    "A field taxonomy of LLM authenticity anti-patterns. Named patterns caught in the wild, not theorised in advance.",
};

export default function SlopticsPage() {
  const patterns = loadSlopodar();
  const domains = getDomains(patterns);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 border-b border-white/20 pb-6">
        <h1 className="font-mono text-3xl font-bold uppercase tracking-tight">
          Slopodar
        </h1>
        <p className="mt-2 font-mono text-sm text-white/50">
          /slop·o·dar/ — n. A radar for slop. A field taxonomy of LLM
          authenticity anti-patterns from one project, one model family, 23
          days.
        </p>
        <p className="mt-1 font-mono text-xs text-white/30">
          {patterns.length} patterns across {domains.length} domains. Entries
          added when caught in the wild.
        </p>
      </div>
      <SlopticsBrowser
        patterns={JSON.parse(JSON.stringify(patterns))}
        domains={domains}
      />
    </div>
  );
}
