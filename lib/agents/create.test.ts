/**
 * create.test.ts — agent creation unit tests.
 *
 * Tests prompt hash determinism and format.
 * No database required for pure function tests.
 *
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import { computePromptHash } from "./create";

describe("computePromptHash", () => {
  it("is deterministic — same input produces same hash", () => {
    const input = { name: "TestAgent", systemPrompt: "You are a helpful bot" };

    const hash1 = computePromptHash(input);
    const hash2 = computePromptHash(input);

    expect(hash1).toBe(hash2);
  });

  it("returns 0x-prefixed 64-char hex string", () => {
    const input = { name: "TestAgent", systemPrompt: "You are a helpful bot" };

    const hash = computePromptHash(input);

    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("uses systemPrompt when provided", () => {
    const withPrompt = { name: "Agent", systemPrompt: "Custom prompt" };
    const withDifferentPrompt = { name: "Agent", systemPrompt: "Different" };

    const hash1 = computePromptHash(withPrompt);
    const hash2 = computePromptHash(withDifferentPrompt);

    expect(hash1).not.toBe(hash2);
  });

  it("falls back to structured fields when no systemPrompt", () => {
    const input1 = { name: "Agent", tone: "friendly" };
    const input2 = { name: "Agent", tone: "aggressive" };

    const hash1 = computePromptHash(input1);
    const hash2 = computePromptHash(input2);

    expect(hash1).not.toBe(hash2);
  });

  it("includes all structured fields in hash when no systemPrompt", () => {
    const base = { name: "Agent" };
    const withArchetype = { name: "Agent", archetype: "hero" };
    const withGoal = { name: "Agent", goal: "win" };

    const hashBase = computePromptHash(base);
    const hashArch = computePromptHash(withArchetype);
    const hashGoal = computePromptHash(withGoal);

    // All different
    expect(hashBase).not.toBe(hashArch);
    expect(hashBase).not.toBe(hashGoal);
    expect(hashArch).not.toBe(hashGoal);
  });

  it("produces different hash for different systemPrompts", () => {
    const input1 = { name: "Agent", systemPrompt: "Prompt A" };
    const input2 = { name: "Agent", systemPrompt: "Prompt B" };

    expect(computePromptHash(input1)).not.toBe(computePromptHash(input2));
  });

  it("structured field hash is deterministic across calls", () => {
    const input = {
      name: "Agent",
      tone: "sarcastic",
      archetype: "trickster",
      quirks: ["laughs", "puns"],
    };

    const hash1 = computePromptHash(input);
    const hash2 = computePromptHash(input);

    expect(hash1).toBe(hash2);
  });
});
