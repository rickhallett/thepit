// SSE streaming for bout execution — wraps turn loop with Server-Sent Events protocol.
// Creates a ReadableStream that emits SSE-formatted events as the bout progresses.
//
// Known limitation: cancel() stops event emission but does NOT abort the in-flight
// executeTurnLoop. LLM calls continue to completion. AbortSignal plumbing is deferred
// to task 13 when the engine gains credit-aware cancellation.

import type { TurnLoopConfig, TurnCallback } from "./engine";
import { executeTurnLoop } from "./engine";
import type { SSEEventType } from "./types";

/**
 * Create a ReadableStream that streams bout execution as SSE events.
 *
 * Event sequence per turn:
 *   data-turn → text-start → text-delta(s) → text-end
 * After all turns:
 *   done
 * On error:
 *   error (then close)
 *
 * @param config - Turn loop configuration (preset, topic, model)
 * @returns ReadableStream that emits SSE-formatted Uint8Array chunks
 */
export function createBoutSSEStream(
  config: TurnLoopConfig,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let aborted = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      /**
       * Send an SSE event through the stream.
       * Format: `event: {type}\ndata: {json}\n\n`
       */
      function sendEvent(event: SSEEventType, data: Record<string, unknown>): void {
        if (aborted) return;
        const formatted = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(formatted));
      }

      const callbacks: TurnCallback = {
        onTurnStart(turnIndex, agent) {
          sendEvent("data-turn", {
            turnIndex,
            agentId: agent.id,
            agentName: agent.name,
            agentColor: agent.color,
          });
          sendEvent("text-start", { turnIndex });
        },
        onTextDelta(turnIndex, delta) {
          sendEvent("text-delta", { turnIndex, delta });
        },
        onTurnEnd(turnIndex, tokenCount) {
          sendEvent("text-end", { turnIndex, tokenCount });
        },
      };

      try {
        await executeTurnLoop(config, callbacks);
        if (!aborted) {
          sendEvent("done", {});
        }
      } catch (err) {
        if (!aborted) {
          const message = err instanceof Error ? err.message : "Unknown error";
          sendEvent("error", { code: "TURN_LOOP_ERROR", message });
        }
      } finally {
        // Guard against double-close: cancel() already closes the controller.
        // Calling close() on a closed controller throws TypeError in the Web Streams spec.
        try {
          controller.close();
        } catch {
          // Already closed by cancel() — expected on client disconnect
        }
      }
    },

    cancel() {
      // Client disconnected — stop producing events.
      // The controller is closed by the runtime after cancel() returns.
      aborted = true;
    },
  });
}
