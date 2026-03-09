"use client";

// AgentDetails — displays full agent information with collapsible sections.
// Used on agent detail page.

import { useState } from "react";
import type { AgentDetail } from "@/lib/agents/types";

interface AgentDetailsProps {
  agent: AgentDetail;
}

export function AgentDetails({ agent }: AgentDetailsProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="agent-name">
          {agent.name}
        </h1>
        {agent.archetype && (
          <p className="mt-2 text-lg text-stone-400">{agent.archetype}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm">
        {agent.tier && (
          <span
            className={`font-medium ${
              agent.tier === "premium"
                ? "text-amber-400"
                : agent.tier === "custom"
                  ? "text-purple-400"
                  : "text-stone-500"
            }`}
          >
            {agent.tier} tier
          </span>
        )}
        {agent.createdAt && (
          <span className="text-stone-500">
            Created {agent.createdAt.toLocaleDateString("en-GB")}
          </span>
        )}
      </div>

      {/* Prompt hash */}
      {agent.promptHash && (
        <div className="border border-stone-700 bg-stone-900 p-4">
          <p className="mb-2 text-xs font-medium text-stone-500">
            PROMPT HASH (SHA-256)
          </p>
          <code
            className="block break-all font-mono text-sm text-stone-300"
            data-testid="agent-prompt-hash"
          >
            {agent.promptHash}
          </code>
        </div>
      )}

      {/* Personality section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Personality</h2>

        {agent.tone && (
          <div>
            <p className="text-xs font-medium text-stone-500">TONE</p>
            <p className="mt-1">{agent.tone}</p>
          </div>
        )}

        {agent.speechPattern && (
          <div>
            <p className="text-xs font-medium text-stone-500">SPEECH PATTERN</p>
            <p className="mt-1">{agent.speechPattern}</p>
          </div>
        )}

        {agent.quirks && agent.quirks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-stone-500">QUIRKS</p>
            <ul className="mt-1 list-inside list-disc">
              {agent.quirks.map((quirk, i) => (
                <li key={i} className="text-stone-300">
                  {quirk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tactics section */}
      {(agent.openingMove || agent.signatureMove || agent.weakness || agent.goal) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Tactics</h2>

          {agent.goal && (
            <div>
              <p className="text-xs font-medium text-stone-500">GOAL</p>
              <p className="mt-1">{agent.goal}</p>
            </div>
          )}

          {agent.openingMove && (
            <div>
              <p className="text-xs font-medium text-stone-500">OPENING MOVE</p>
              <p className="mt-1">{agent.openingMove}</p>
            </div>
          )}

          {agent.signatureMove && (
            <div>
              <p className="text-xs font-medium text-stone-500">SIGNATURE MOVE</p>
              <p className="mt-1">{agent.signatureMove}</p>
            </div>
          )}

          {agent.weakness && (
            <div>
              <p className="text-xs font-medium text-stone-500">WEAKNESS</p>
              <p className="mt-1">{agent.weakness}</p>
            </div>
          )}
        </div>
      )}

      {/* System prompt (collapsible) */}
      {agent.systemPrompt && (
        <div className="border border-stone-700">
          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex w-full items-center justify-between bg-stone-900 px-4 py-3 text-left hover:bg-stone-800"
          >
            <span className="font-medium">System Prompt</span>
            <span className="text-stone-500">{showPrompt ? "▲" : "▼"}</span>
          </button>
          {showPrompt && (
            <div className="bg-stone-950 p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm text-stone-300">
                {agent.systemPrompt}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
