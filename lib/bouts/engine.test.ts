/**
 * engine.test.ts — Bout engine turn loop tests.
 *
 * Tests executeTurnLoop and buildTurnMessages.
 * Mocks streamText from the ai package to test logic in isolation.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Preset, PresetAgent } from "./presets";
import type { TranscriptEntry } from "./types";

// Mock the ai module before imports
vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

// Import after mock setup
import { streamText } from "ai";
import { executeTurnLoop, buildTurnMessages, type TurnLoopConfig, type TurnCallback } from "./engine";

const mockStreamText = vi.mocked(streamText);

// Helper to create a mock streamText result
function createMockStreamResult(text: string, outputTokens: number): ReturnType<typeof streamText> {
  const chunks = text.split(" ").map((word, i, arr) => (i < arr.length - 1 ? word + " " : word));

  async function* textStream() {
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  return {
    textStream: textStream(),
    usage: Promise.resolve({
      inputTokens: 100,
      outputTokens,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        reasoningTokens: undefined,
      },
    }),
  } as unknown as ReturnType<typeof streamText>;
}

const agent1: PresetAgent = {
  id: "darwin",
  name: "Darwin",
  systemPrompt: "You are Charles Darwin, naturalist.",
  color: "#8B4513",
};

const agent2: PresetAgent = {
  id: "huxley",
  name: "Huxley",
  systemPrompt: "You are Thomas Huxley, biologist.",
  color: "#2F4F4F",
};

const agent3: PresetAgent = {
  id: "wallace",
  name: "Wallace",
  systemPrompt: "You are Alfred Russel Wallace, naturalist.",
  color: "#006400",
};

const twoAgentPreset: Preset = {
  id: "evolution-debate",
  name: "Evolution Debate",
  description: "Darwin vs Huxley",
  agents: [agent1, agent2],
  maxTurns: 4,
  defaultModel: "claude-3-haiku",
  tier: "free",
};

const threeAgentPreset: Preset = {
  id: "naturalist-roundtable",
  name: "Naturalist Roundtable",
  description: "Darwin, Huxley, Wallace",
  agents: [agent1, agent2, agent3],
  maxTurns: 6,
  defaultModel: "claude-3-haiku",
  tier: "free",
};

// Mock model (just needs to be passed through)
const mockModel = {} as Parameters<typeof streamText>[0]["model"];

describe("buildTurnMessages", () => {
  const topic = "Is natural selection the only mechanism of evolution?";

  it("includes safety preamble in system message", () => {
    const messages = buildTurnMessages(agent1, topic, [], 0);

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("You are participating in a structured debate");
    expect(messages[0].content).toContain("Stay in character");
    expect(messages[0].content).toContain("Do not break character or reference being an AI");
  });

  it("includes agent system prompt after safety preamble", () => {
    const messages = buildTurnMessages(agent1, topic, [], 0);

    expect(messages[0].content).toContain(agent1.systemPrompt);
  });

  it("turn 0 has topic as single user message", () => {
    const messages = buildTurnMessages(agent1, topic, [], 0);

    expect(messages).toHaveLength(2);
    expect(messages[1]).toEqual({ role: "user", content: topic });
  });

  it("turn 1+ includes topic and history", () => {
    const transcript: TranscriptEntry[] = [
      {
        turnIndex: 0,
        agentId: "darwin",
        agentName: "Darwin",
        agentColor: "#8B4513",
        content: "Natural selection is paramount.",
        tokenCount: 20,
        timestamp: "2024-01-01T00:00:00Z",
      },
    ];

    // Agent 2 (Huxley) at turn 1 sees Darwin's message as "user"
    const messages = buildTurnMessages(agent2, topic, transcript, 1);

    expect(messages).toHaveLength(3);
    expect(messages[1]).toEqual({ role: "user", content: topic });
    expect(messages[2]).toEqual({
      role: "user",
      content: "Darwin: Natural selection is paramount.",
    });
  });

  it("marks own prior turns as assistant, others as user", () => {
    const transcript: TranscriptEntry[] = [
      {
        turnIndex: 0,
        agentId: "darwin",
        agentName: "Darwin",
        agentColor: "#8B4513",
        content: "First response from Darwin.",
        tokenCount: 20,
        timestamp: "2024-01-01T00:00:00Z",
      },
      {
        turnIndex: 1,
        agentId: "huxley",
        agentName: "Huxley",
        agentColor: "#2F4F4F",
        content: "Huxley responds.",
        tokenCount: 15,
        timestamp: "2024-01-01T00:00:01Z",
      },
    ];

    // Darwin at turn 2 sees: topic (user), own turn 0 (assistant), Huxley turn 1 (user)
    const messages = buildTurnMessages(agent1, topic, transcript, 2);

    expect(messages).toHaveLength(4);
    expect(messages[0].role).toBe("system");
    expect(messages[1]).toEqual({ role: "user", content: topic });
    expect(messages[2]).toEqual({ role: "assistant", content: "First response from Darwin." });
    expect(messages[3]).toEqual({ role: "user", content: "Huxley: Huxley responds." });
  });
});

describe("executeTurnLoop", () => {
  let callbackCalls: Array<{ method: string; args: unknown[] }>;
  let callbacks: TurnCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    callbackCalls = [];
    callbacks = {
      onTurnStart: (turnIndex, agent) => {
        callbackCalls.push({ method: "onTurnStart", args: [turnIndex, agent] });
      },
      onTextDelta: (turnIndex, delta) => {
        callbackCalls.push({ method: "onTextDelta", args: [turnIndex, delta] });
      },
      onTurnEnd: (turnIndex, tokenCount) => {
        callbackCalls.push({ method: "onTurnEnd", args: [turnIndex, tokenCount] });
      },
    };
  });

  it("2-agent, 4-turn bout alternates correctly", async () => {
    const responses = [
      { text: "Darwin turn 0", tokens: 10 },
      { text: "Huxley turn 1", tokens: 12 },
      { text: "Darwin turn 2", tokens: 11 },
      { text: "Huxley turn 3", tokens: 13 },
    ];

    mockStreamText.mockImplementation(() => {
      const response = responses.shift()!;
      return createMockStreamResult(response.text, response.tokens) ;
    });

    const config: TurnLoopConfig = {
      preset: twoAgentPreset,
      topic: "Test topic",
      model: mockModel,
    };

    const transcript = await executeTurnLoop(config, callbacks);

    expect(transcript).toHaveLength(4);

    // Verify agent alternation: darwin, huxley, darwin, huxley
    expect(transcript[0].agentId).toBe("darwin");
    expect(transcript[1].agentId).toBe("huxley");
    expect(transcript[2].agentId).toBe("darwin");
    expect(transcript[3].agentId).toBe("huxley");

    // Verify content
    expect(transcript[0].content).toBe("Darwin turn 0");
    expect(transcript[1].content).toBe("Huxley turn 1");
    expect(transcript[2].content).toBe("Darwin turn 2");
    expect(transcript[3].content).toBe("Huxley turn 3");
  });

  it("3-agent, 6-turn bout cycles through all agents", async () => {
    const responses = Array.from({ length: 6 }, (_, i) => ({
      text: `Agent ${i % 3} turn ${i}`,
      tokens: 10 + i,
    }));

    mockStreamText.mockImplementation(() => {
      const response = responses.shift()!;
      return createMockStreamResult(response.text, response.tokens) ;
    });

    const config: TurnLoopConfig = {
      preset: threeAgentPreset,
      topic: "Test topic",
      model: mockModel,
    };

    const transcript = await executeTurnLoop(config, callbacks);

    expect(transcript).toHaveLength(6);

    // Verify round-robin: darwin, huxley, wallace, darwin, huxley, wallace
    expect(transcript[0].agentId).toBe("darwin");
    expect(transcript[1].agentId).toBe("huxley");
    expect(transcript[2].agentId).toBe("wallace");
    expect(transcript[3].agentId).toBe("darwin");
    expect(transcript[4].agentId).toBe("huxley");
    expect(transcript[5].agentId).toBe("wallace");
  });

  it("callbacks fire in correct order for each turn", async () => {
    mockStreamText.mockImplementation(() => {
      return createMockStreamResult("word1 word2 word3", 15) ;
    });

    const config: TurnLoopConfig = {
      preset: { ...twoAgentPreset, maxTurns: 2 },
      topic: "Test topic",
      model: mockModel,
    };

    await executeTurnLoop(config, callbacks);

    // Extract method sequence
    const methodSequence = callbackCalls.map((c) => c.method);

    // For each turn: onTurnStart, then 1+ onTextDelta, then onTurnEnd
    // Turn 0
    expect(methodSequence[0]).toBe("onTurnStart");
    expect(callbackCalls[0].args[0]).toBe(0);

    // Find the first onTurnEnd for turn 0
    let turn0EndIndex = methodSequence.findIndex(
      (m, i) => m === "onTurnEnd" && (callbackCalls[i].args[0] as number) === 0,
    );
    expect(turn0EndIndex).toBeGreaterThan(1); // At least one delta before end

    // All deltas between start and end should be onTextDelta
    for (let i = 1; i < turn0EndIndex; i++) {
      expect(methodSequence[i]).toBe("onTextDelta");
    }

    // Turn 1 follows
    const turn1StartIndex = turn0EndIndex + 1;
    expect(methodSequence[turn1StartIndex]).toBe("onTurnStart");
    expect(callbackCalls[turn1StartIndex].args[0]).toBe(1);
  });

  it("transcript entries have correct fields", async () => {
    mockStreamText.mockImplementation(() => {
      return createMockStreamResult("Test response content", 42) ;
    });

    const config: TurnLoopConfig = {
      preset: { ...twoAgentPreset, maxTurns: 1 },
      topic: "Test topic",
      model: mockModel,
    };

    const transcript = await executeTurnLoop(config, callbacks);

    expect(transcript).toHaveLength(1);
    const entry = transcript[0];

    expect(entry.turnIndex).toBe(0);
    expect(entry.agentId).toBe("darwin");
    expect(entry.agentName).toBe("Darwin");
    expect(entry.agentColor).toBe("#8B4513");
    expect(entry.content).toBe("Test response content");
    expect(entry.tokenCount).toBe(42);
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("respects maxTurns override in config", async () => {
    mockStreamText.mockImplementation(() => {
      return createMockStreamResult("Response", 10) ;
    });

    const config: TurnLoopConfig = {
      preset: twoAgentPreset, // preset.maxTurns = 4
      topic: "Test topic",
      model: mockModel,
      maxTurns: 2, // override to 2
    };

    const transcript = await executeTurnLoop(config, callbacks);

    expect(transcript).toHaveLength(2);
    expect(mockStreamText).toHaveBeenCalledTimes(2);
  });

  it("passes correct messages to LLM for turn 0", async () => {
    mockStreamText.mockImplementation(() => {
      return createMockStreamResult("Response", 10) ;
    });

    const config: TurnLoopConfig = {
      preset: { ...twoAgentPreset, maxTurns: 1 },
      topic: "The evolution debate",
      model: mockModel,
    };

    await executeTurnLoop(config, callbacks);

    expect(mockStreamText).toHaveBeenCalledTimes(1);
    const callArgs = mockStreamText.mock.calls[0][0];
    const messages = callArgs.messages!;

    expect(callArgs.model).toBe(mockModel);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("structured debate");
    expect(messages[0].content).toContain(agent1.systemPrompt);
    expect(messages[1]).toEqual({ role: "user", content: "The evolution debate" });
  });

  it("passes conversation history to LLM for turn 1+", async () => {
    mockStreamText
      .mockImplementationOnce(() => {
        return createMockStreamResult("Darwin speaks first", 10) ;
      })
      .mockImplementationOnce(() => {
        return createMockStreamResult("Huxley responds", 10) ;
      });

    const config: TurnLoopConfig = {
      preset: { ...twoAgentPreset, maxTurns: 2 },
      topic: "Evolution topic",
      model: mockModel,
    };

    await executeTurnLoop(config, callbacks);

    expect(mockStreamText).toHaveBeenCalledTimes(2);

    // Turn 1 (Huxley) should have history
    const turn1CallArgs = mockStreamText.mock.calls[1][0];
    const messages = turn1CallArgs.messages!;
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain(agent2.systemPrompt); // Huxley's prompt
    expect(messages[1]).toEqual({ role: "user", content: "Evolution topic" });
    expect(messages[2]).toEqual({
      role: "user",
      content: "Darwin: Darwin speaks first",
    });
  });

  it("propagates LLM errors without retry", async () => {
    const error = new Error("LLM API error");
    mockStreamText.mockImplementation(() => {
      throw error;
    });

    const config: TurnLoopConfig = {
      preset: twoAgentPreset,
      topic: "Test topic",
      model: mockModel,
    };

    await expect(executeTurnLoop(config, callbacks)).rejects.toThrow("LLM API error");
  });
});
