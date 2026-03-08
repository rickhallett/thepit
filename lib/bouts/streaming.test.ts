/**
 * streaming.test.ts — SSE streaming tests.
 *
 * Tests createBoutSSEStream: event format, order, error handling, client disconnect.
 * Mocks executeTurnLoop to control callback timing.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TurnCallback, TurnLoopConfig } from "./engine";
import type { PresetAgent } from "./presets";

// Mock the engine module
vi.mock("./engine", () => ({
  executeTurnLoop: vi.fn(),
}));

import { executeTurnLoop } from "./engine";
import { createBoutSSEStream } from "./streaming";

const mockExecuteTurnLoop = vi.mocked(executeTurnLoop);

interface ParsedSSEEvent {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Read all SSE events from a stream until it closes.
 */
async function readSSEStream(
  stream: ReadableStream<Uint8Array>,
): Promise<ParsedSSEEvent[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: ParsedSSEEvent[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse complete SSE events (double newline terminated)
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || ""; // Keep incomplete event in buffer

    for (const part of parts) {
      if (!part.trim()) continue;

      const lines = part.split("\n");
      let eventType = "";
      let eventData = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7);
        } else if (line.startsWith("data: ")) {
          eventData = line.slice(6);
        }
      }

      if (eventType && eventData) {
        events.push({
          event: eventType,
          data: JSON.parse(eventData),
        });
      }
    }
  }

  return events;
}

const agent1: PresetAgent = {
  id: "agent1",
  name: "Agent One",
  systemPrompt: "You are agent one.",
  color: "#FF0000",
};

const agent2: PresetAgent = {
  id: "agent2",
  name: "Agent Two",
  systemPrompt: "You are agent two.",
  color: "#00FF00",
};

const mockConfig: TurnLoopConfig = {
  preset: {
    id: "test-preset",
    name: "Test Preset",
    description: "Test description",
    agents: [agent1, agent2],
    maxTurns: 4,
    defaultModel: "claude-haiku",
    tier: "free",
  },
  topic: "Test topic",
  model: {} as TurnLoopConfig["model"],
};

describe("createBoutSSEStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("event ordering", () => {
    it("produces events in correct order: data-turn → text-start → text-delta(s) → text-end for each turn, then done", async () => {
      mockExecuteTurnLoop.mockImplementation(async (_config, callbacks) => {
        // Simulate 2 turns
        callbacks.onTurnStart(0, agent1);
        callbacks.onTextDelta(0, "Hello ");
        callbacks.onTextDelta(0, "world");
        callbacks.onTurnEnd(0, 10);

        callbacks.onTurnStart(1, agent2);
        callbacks.onTextDelta(1, "Response");
        callbacks.onTurnEnd(1, 5);

        return [];
      });

      const stream = createBoutSSEStream(mockConfig);
      const events = await readSSEStream(stream);

      // Turn 0: data-turn, text-start, text-delta, text-delta, text-end
      // Turn 1: data-turn, text-start, text-delta, text-end
      // Final: done
      expect(events).toHaveLength(10);

      // Turn 0
      expect(events[0].event).toBe("data-turn");
      expect(events[0].data).toEqual({
        turnIndex: 0,
        agentId: "agent1",
        agentName: "Agent One",
        agentColor: "#FF0000",
      });
      expect(events[1].event).toBe("text-start");
      expect(events[1].data).toEqual({ turnIndex: 0 });
      expect(events[2].event).toBe("text-delta");
      expect(events[2].data).toEqual({ turnIndex: 0, delta: "Hello " });
      expect(events[3].event).toBe("text-delta");
      expect(events[3].data).toEqual({ turnIndex: 0, delta: "world" });
      expect(events[4].event).toBe("text-end");
      expect(events[4].data).toEqual({ turnIndex: 0, tokenCount: 10 });

      // Turn 1
      expect(events[5].event).toBe("data-turn");
      expect(events[5].data.turnIndex).toBe(1);
      expect(events[6].event).toBe("text-start");
      expect(events[6].data.turnIndex).toBe(1);
      expect(events[7].event).toBe("text-delta");
      expect(events[8].event).toBe("text-end");

      // Done
      expect(events[9].event).toBe("done");
      expect(events[9].data).toEqual({});
    });

    it("done event is always last on success", async () => {
      mockExecuteTurnLoop.mockImplementation(async (_config, callbacks) => {
        callbacks.onTurnStart(0, agent1);
        callbacks.onTextDelta(0, "Text");
        callbacks.onTurnEnd(0, 5);
        return [];
      });

      const stream = createBoutSSEStream(mockConfig);
      const events = await readSSEStream(stream);

      expect(events[events.length - 1].event).toBe("done");
    });
  });

  describe("SSE format", () => {
    it("each event has event: and data: lines separated by double newline", async () => {
      mockExecuteTurnLoop.mockImplementation(async (_config, callbacks) => {
        callbacks.onTurnStart(0, agent1);
        callbacks.onTurnEnd(0, 0);
        return [];
      });

      const stream = createBoutSSEStream(mockConfig);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let rawOutput = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawOutput += decoder.decode(value, { stream: true });
      }

      // Check SSE format: each event should be "event: X\ndata: Y\n\n"
      const eventBlocks = rawOutput.split("\n\n").filter((b) => b.trim());

      for (const block of eventBlocks) {
        expect(block).toMatch(/^event: \S+\ndata: .+$/);
      }
    });

    it("turnIndex is included in every event for deduplication", async () => {
      mockExecuteTurnLoop.mockImplementation(async (_config, callbacks) => {
        callbacks.onTurnStart(0, agent1);
        callbacks.onTextDelta(0, "delta");
        callbacks.onTurnEnd(0, 5);
        return [];
      });

      const stream = createBoutSSEStream(mockConfig);
      const events = await readSSEStream(stream);

      // All events except 'done' should have turnIndex
      const eventsWithTurnIndex = events.filter(
        (e) => e.event !== "done",
      );

      for (const event of eventsWithTurnIndex) {
        expect(event.data).toHaveProperty("turnIndex");
        expect(typeof event.data.turnIndex).toBe("number");
      }
    });
  });

  describe("error handling", () => {
    it("emits error event with code and message when turn loop throws", async () => {
      mockExecuteTurnLoop.mockImplementation(async () => {
        throw new Error("LLM API failure");
      });

      const stream = createBoutSSEStream(mockConfig);
      const events = await readSSEStream(stream);

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe("error");
      expect(events[0].data).toEqual({
        code: "TURN_LOOP_ERROR",
        message: "LLM API failure",
      });
    });

    it("emits error after successful turns if loop throws mid-bout", async () => {
      mockExecuteTurnLoop.mockImplementation(async (_config, callbacks) => {
        // Turn 0 succeeds
        callbacks.onTurnStart(0, agent1);
        callbacks.onTextDelta(0, "First turn content");
        callbacks.onTurnEnd(0, 10);

        // Turn 1 fails
        callbacks.onTurnStart(1, agent2);
        throw new Error("Turn 2 failed");
      });

      const stream = createBoutSSEStream(mockConfig);
      const events = await readSSEStream(stream);

      // Should have turn 0 events, turn 1 partial events, then error
      const eventTypes = events.map((e) => e.event);

      // Turn 0 should complete
      expect(eventTypes).toContain("data-turn");
      expect(eventTypes).toContain("text-start");
      expect(eventTypes).toContain("text-delta");
      expect(eventTypes).toContain("text-end");

      // Last event should be error with full structure
      expect(events[events.length - 1].event).toBe("error");
      expect(events[events.length - 1].data).toEqual({
        code: "TURN_LOOP_ERROR",
        message: "Turn 2 failed",
      });
    });

    it("handles non-Error throws gracefully", async () => {
      mockExecuteTurnLoop.mockImplementation(async () => {
        throw "string error"; // Not an Error instance
      });

      const stream = createBoutSSEStream(mockConfig);
      const events = await readSSEStream(stream);

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe("error");
      expect(events[0].data.message).toBe("Unknown error");
    });
  });

  describe("client disconnect", () => {
    it("stops producing events when cancelled", async () => {
      let callbacksReceived: TurnCallback | null = null;
      let loopPromiseResolve: (() => void) | null = null;

      mockExecuteTurnLoop.mockImplementation(async (_config, callbacks) => {
        callbacksReceived = callbacks;
        // Wait for external signal to complete
        await new Promise<void>((resolve) => {
          loopPromiseResolve = resolve;
        });
        return [];
      });

      const stream = createBoutSSEStream(mockConfig);
      const reader = stream.getReader();

      // Start reading
      const readPromise = reader.read();

      // Wait for callbacks to be registered
      await vi.waitFor(() => {
        expect(callbacksReceived).not.toBeNull();
      });

      // Send first turn
      callbacksReceived!.onTurnStart(0, agent1);
      callbacksReceived!.onTextDelta(0, "Start");

      // Read what we have so far
      await readPromise;

      // Cancel the stream (simulates client disconnect)
      await reader.cancel();

      // Complete the loop
      loopPromiseResolve!();

      // The stream should be closed, no events should be queued after cancel
      const finalRead = await reader.read();
      expect(finalRead.done).toBe(true);
    });

    it("cleanup runs without throwing on cancel", async () => {
      let loopStarted = false;
      mockExecuteTurnLoop.mockImplementation(async () => {
        loopStarted = true;
        // Simulate long-running operation
        await new Promise((resolve) => setTimeout(resolve, 100));
        return [];
      });

      const stream = createBoutSSEStream(mockConfig);
      const reader = stream.getReader();

      // Start reading
      reader.read();

      // Wait for loop to start
      await vi.waitFor(() => {
        expect(loopStarted).toBe(true);
      });

      // Cancel should not throw
      await expect(reader.cancel()).resolves.toBeUndefined();
    });
  });

  describe("controller.close()", () => {
    it("is always called on success", async () => {
      mockExecuteTurnLoop.mockImplementation(async (_config, callbacks) => {
        callbacks.onTurnStart(0, agent1);
        callbacks.onTurnEnd(0, 0);
        return [];
      });

      const stream = createBoutSSEStream(mockConfig);
      const events = await readSSEStream(stream);

      // If we can read all events and the stream ends, close was called
      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].event).toBe("done");
    });

    it("is always called on error", async () => {
      mockExecuteTurnLoop.mockImplementation(async () => {
        throw new Error("Test error");
      });

      const stream = createBoutSSEStream(mockConfig);
      const events = await readSSEStream(stream);

      // If we can read all events and the stream ends, close was called
      expect(events.length).toBe(1);
      expect(events[0].event).toBe("error");
    });

    it("handles cancel without throwing (double-close guarded)", async () => {
      let loopResolver: (() => void) | null = null;

      mockExecuteTurnLoop.mockImplementation(async () => {
        await new Promise<void>((resolve) => {
          loopResolver = resolve;
        });
        return [];
      });

      const stream = createBoutSSEStream(mockConfig);
      const reader = stream.getReader();

      // Start reading
      reader.read();

      // Wait for loop to be set up
      await vi.waitFor(() => {
        expect(loopResolver).not.toBeNull();
      });

      // Cancel the stream — this closes the controller via the runtime.
      // The finally block in start() will attempt controller.close() again.
      // Without the try/catch guard, this would throw TypeError: Controller is already closed.
      await reader.cancel();

      // Resolve the loop to trigger the finally block (which attempts close)
      loopResolver!();

      // Allow the finally block to execute
      await new Promise((resolve) => setTimeout(resolve, 10));

      // If we reach here without unhandled rejection, the double-close guard works.
      // Verify the stream is in terminal state.
      const result = await reader.read();
      expect(result.done).toBe(true);
    });
  });
});
