"use client";

import { useState } from "react";
import type { SlopodarPattern } from "@/lib/common/slopodar";

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    high: "border-red-500 text-red-400",
    medium: "border-yellow-500 text-yellow-400",
    low: "border-green-500 text-green-400",
  };
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-xs uppercase ${colors[severity] ?? "border-white/30 text-white/50"}`}
    >
      {severity}
    </span>
  );
}

function DomainTag({ domain }: { domain: string }) {
  const colors: Record<string, string> = {
    "prose-style": "bg-purple-900/40 text-purple-300",
    "relationship-sycophancy": "bg-red-900/40 text-red-300",
    "governance-process": "bg-blue-900/40 text-blue-300",
    "analytical-measurement": "bg-amber-900/40 text-amber-300",
    code: "bg-green-900/40 text-green-300",
    metacognitive: "bg-cyan-900/40 text-cyan-300",
    tests: "bg-orange-900/40 text-orange-300",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 font-mono text-xs ${colors[domain] ?? "bg-white/10 text-white/50"}`}
    >
      {domain}
    </span>
  );
}

function PatternCard({
  pattern,
  index,
}: {
  pattern: SlopodarPattern;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="border border-white/20 bg-white/[0.02]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full cursor-pointer px-4 py-4 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-white/30">
                #{index + 1}
              </span>
              <h2 className="font-mono text-lg font-bold text-white">
                {pattern.name}
              </h2>
            </div>
            <p className="mt-1 font-mono text-xs text-white/40 italic">
              &ldquo;{pattern.trigger}&rdquo;
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DomainTag domain={pattern.domain} />
            <SeverityBadge severity={pattern.severity} />
            <span className="font-mono text-xs text-white/30">
              {expanded ? "−" : "+"}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-white/10 px-4 py-4">
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/60">
              What it is
            </h3>
            <p className="mt-1 font-mono text-sm leading-relaxed text-white/80">
              {pattern.description}
            </p>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/60">
              What it signals
            </h3>
            <p className="mt-1 font-mono text-sm leading-relaxed text-white/80">
              {pattern.signal}
            </p>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/60">
              What a human would write instead
            </h3>
            <p className="mt-1 font-mono text-sm leading-relaxed text-white/80">
              {pattern.instead}
            </p>
          </div>

          {pattern.refs && pattern.refs.length > 0 && (
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/60">
                Where caught
              </h3>
              <ul className="mt-1 space-y-0.5">
                {pattern.refs.map((ref, i) => (
                  <li
                    key={i}
                    className="font-mono text-xs text-white/40"
                  >
                    → {ref}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-4 border-t border-white/10 pt-3 font-mono text-xs text-white/30">
            <span>id: {pattern.id}</span>
            <span>detected: {pattern.detected}</span>
            {pattern.signal_strength && (
              <span>signal: {pattern.signal_strength}</span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export function SlopticsBrowser({
  patterns,
  domains,
}: {
  patterns: SlopodarPattern[];
  domains: string[];
}) {
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const filtered = patterns.filter((p) => {
    const matchesDomain = !activeDomain || p.domain === activeDomain;
    if (!search) return matchesDomain;

    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.trigger.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q);

    return matchesDomain && matchesSearch;
  });

  return (
    <div>
      {/* Search + filter bar */}
      <div className="mb-6 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patterns..."
          className="w-full border border-white/20 bg-black px-4 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveDomain(null)}
            className={`cursor-pointer border px-2 py-1 font-mono text-xs transition-colors ${
              !activeDomain
                ? "border-white bg-white text-black"
                : "border-white/20 text-white/50 hover:border-white/40"
            }`}
          >
            all ({patterns.length})
          </button>
          {domains.map((domain) => {
            const count = patterns.filter((p) => p.domain === domain).length;
            return (
              <button
                key={domain}
                onClick={() =>
                  setActiveDomain(activeDomain === domain ? null : domain)
                }
                className={`cursor-pointer border px-2 py-1 font-mono text-xs transition-colors ${
                  activeDomain === domain
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-white/50 hover:border-white/40"
                }`}
              >
                {domain} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="py-8 text-center font-mono text-sm text-white/30">
            No patterns match.
          </p>
        )}
        {filtered.map((pattern, i) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            index={patterns.indexOf(pattern)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-white/10 pt-4 font-mono text-xs text-white/20">
        <p>
          Source: docs/internal/slopodar.yaml — canonical taxonomy, append-only.
        </p>
        <p>
          Patterns are hypotheses. If you recognise them in your own work, they
          replicate.
        </p>
      </div>
    </div>
  );
}
