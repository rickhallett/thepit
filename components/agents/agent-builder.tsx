"use client";

// AgentBuilder — tabbed form for creating custom agents.
// Posts to /api/agents, redirects to detail page on success.

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "basics" | "personality" | "tactics" | "advanced";

interface FormState {
  name: string;
  archetype: string;
  goal: string;
  tone: string;
  speechPattern: string;
  quirks: string;
  openingMove: string;
  signatureMove: string;
  weakness: string;
  customInstructions: string;
}

export function AgentBuilder() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("basics");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    archetype: "",
    goal: "",
    tone: "",
    speechPattern: "",
    quirks: "",
    openingMove: "",
    signatureMove: "",
    weakness: "",
    customInstructions: "",
  });

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.name.trim()) {
      setError("Name is required");
      setActiveTab("basics");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build request body
      const body: Record<string, unknown> = {
        name: form.name.trim(),
      };

      if (form.archetype.trim()) body.archetype = form.archetype.trim();
      if (form.goal.trim()) body.goal = form.goal.trim();
      if (form.tone.trim()) body.tone = form.tone.trim();
      if (form.speechPattern.trim()) body.speechPattern = form.speechPattern.trim();
      if (form.openingMove.trim()) body.openingMove = form.openingMove.trim();
      if (form.signatureMove.trim()) body.signatureMove = form.signatureMove.trim();
      if (form.weakness.trim()) body.weakness = form.weakness.trim();

      // Parse quirks as array (comma-separated)
      if (form.quirks.trim()) {
        body.quirks = form.quirks
          .split(",")
          .map((q) => q.trim())
          .filter((q) => q.length > 0);
      }

      // Custom instructions become systemPrompt
      if (form.customInstructions.trim()) {
        body.systemPrompt = form.customInstructions.trim();
      }

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let message = "Failed to create agent";
        try {
          const data = await res.json();
          message = data.error?.message || data.message || message;
        } catch {
          // Non-JSON error response (e.g. 502 HTML) — use fallback
        }
        throw new Error(message);
      }

      const data = await res.json();
      router.push(`/agents/${data.agentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
      setIsSubmitting(false);
    }
  }

  // Generate preview of system prompt
  function generatePromptPreview(): string {
    const parts: string[] = [];

    if (form.name) parts.push(`You are ${form.name}.`);
    if (form.archetype) parts.push(`Archetype: ${form.archetype}.`);
    if (form.goal) parts.push(`Goal: ${form.goal}.`);
    if (form.tone) parts.push(`Tone: ${form.tone}.`);
    if (form.speechPattern) parts.push(`Speech pattern: ${form.speechPattern}.`);
    if (form.quirks) parts.push(`Quirks: ${form.quirks}.`);
    if (form.openingMove) parts.push(`Opening move: ${form.openingMove}.`);
    if (form.signatureMove) parts.push(`Signature move: ${form.signatureMove}.`);
    if (form.weakness) parts.push(`Weakness: ${form.weakness}.`);
    if (form.customInstructions) {
      parts.push("");
      parts.push("Custom instructions:");
      parts.push(form.customInstructions);
    }

    return parts.join("\n") || "Enter details to see a preview...";
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "basics", label: "Basics" },
    { id: "personality", label: "Personality" },
    { id: "tactics", label: "Tactics" },
    { id: "advanced", label: "Advanced" },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex gap-6">
      {/* Form panel */}
      <div className="flex-1">
        {/* Tab navigation */}
        <div className="mb-6 flex gap-2 border-b border-stone-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-stone-100 text-stone-100"
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-4">
          {activeTab === "basics" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g., The Devil's Advocate"
                  maxLength={80}
                  data-testid="agent-builder-name"
                  className="w-full border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Archetype</label>
                <input
                  type="text"
                  value={form.archetype}
                  onChange={(e) => updateField("archetype", e.target.value)}
                  placeholder="e.g., Contrarian philosopher, ruthless debate champion"
                  maxLength={200}
                  className="w-full border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Goal</label>
                <textarea
                  value={form.goal}
                  onChange={(e) => updateField("goal", e.target.value)}
                  placeholder="What does this agent aim to achieve in debates?"
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {activeTab === "personality" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Tone</label>
                <input
                  type="text"
                  value={form.tone}
                  onChange={(e) => updateField("tone", e.target.value)}
                  placeholder="e.g., Sardonic, confrontational, intellectually aggressive"
                  maxLength={200}
                  className="w-full border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Speech Pattern</label>
                <input
                  type="text"
                  value={form.speechPattern}
                  onChange={(e) => updateField("speechPattern", e.target.value)}
                  placeholder="e.g., Formal, uses rhetorical questions, ends with zingers"
                  maxLength={200}
                  className="w-full border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Quirks <span className="text-stone-500">(comma-separated)</span>
                </label>
                <textarea
                  value={form.quirks}
                  onChange={(e) => updateField("quirks", e.target.value)}
                  placeholder="e.g., Always cites obscure philosophers, makes sports analogies, uses alliteration"
                  rows={3}
                  className="w-full resize-none border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {activeTab === "tactics" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Opening Move</label>
                <textarea
                  value={form.openingMove}
                  onChange={(e) => updateField("openingMove", e.target.value)}
                  placeholder="How does this agent typically start a debate?"
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Signature Move</label>
                <textarea
                  value={form.signatureMove}
                  onChange={(e) => updateField("signatureMove", e.target.value)}
                  placeholder="What's this agent's go-to rhetorical technique?"
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Weakness</label>
                <textarea
                  value={form.weakness}
                  onChange={(e) => updateField("weakness", e.target.value)}
                  placeholder="What's this agent's Achilles' heel?"
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none border border-stone-700 bg-stone-800 px-3 py-2 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {activeTab === "advanced" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Custom Instructions
                </label>
                <p className="mb-2 text-xs text-stone-500">
                  Raw system prompt content. Overrides structured fields if provided.
                </p>
                <textarea
                  value={form.customInstructions}
                  onChange={(e) => updateField("customInstructions", e.target.value)}
                  placeholder="Write custom system prompt instructions..."
                  rows={8}
                  maxLength={10000}
                  className="w-full resize-none border border-stone-700 bg-stone-800 px-3 py-2 font-mono text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
                />
              </div>

              {/* responseLength and responseFormat fields removed — not wired to backend.
                  Re-add when AgentCreateInputSchema supports these fields. */}
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="agent-builder-submit"
          className="mt-6 w-full bg-stone-100 py-3 font-bold text-stone-900 transition-colors hover:bg-white disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Agent"}
        </button>
      </div>

      {/* Preview panel */}
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-4 border border-stone-700 bg-stone-900">
          <div className="border-b border-stone-700 px-4 py-2">
            <h3 className="text-sm font-medium">Prompt Preview</h3>
          </div>
          <div className="max-h-96 overflow-y-auto p-4">
            <pre className="whitespace-pre-wrap font-mono text-xs text-stone-400">
              {generatePromptPreview()}
            </pre>
          </div>
        </div>
      </div>
    </form>
  );
}
