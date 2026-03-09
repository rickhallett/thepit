// SSE streaming for bout execution — wraps turn loop with Server-Sent Events protocol.
// Creates a ReadableStream that emits SSE-formatted events as the bout progresses.
//
// Known limitation: cancel() stops event emission but does NOT abort the in-flight
// executeTurnLoop. LLM calls continue to completion. Full abort requires AbortSignal
// plumbing through the entire LLM call chain.

import type { LanguageModel } from "ai";
import { db } from "@/db";
import { bouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { TurnLoopConfig, TurnCallback } from "./engine";
import {
  executeTurnLoop,
  generateShareLine,
  computeActualCostMicro,
} from "./engine";
import type { SSEEventType, TranscriptEntry } from "./types";
import { settleCredits, refundPreauth } from "@/lib/credits/settlement";
import type { ModelId } from "@/lib/credits/catalog";

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

export interface PersistenceConfig {
  turnLoopConfig: TurnLoopConfig;
  boutId: string;
  userId: string | null;
  estimatedCostMicro: number;
  shareLineModel: LanguageModel;
  modelId: ModelId;
}

/**
 * Create a ReadableStream that streams bout execution with persistence and credit settlement.
 *
 * On success:
 *   1. Generate share line via separate Haiku LLM call
 *   2. Persist transcript + share line to DB
 *   3. Emit data-share-line SSE event
 *   4. Settle credits (if userId provided)
 *   5. Emit done event
 *
 * On error:
 *   1. Persist partial transcript with status='error'
 *   2. Refund preauth (if userId provided)
 *   3. Emit error event
 */
export function createBoutSSEStreamWithPersistence(
  config: PersistenceConfig,
): ReadableStream<Uint8Array> {
  const {
    turnLoopConfig,
    boutId,
    userId,
    estimatedCostMicro,
    shareLineModel,
    modelId,
  } = config;

  const encoder = new TextEncoder();
  let aborted = false;
  let transcript: TranscriptEntry[] = [];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      function sendEvent(
        event: SSEEventType,
        data: Record<string, unknown>,
      ): void {
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
        transcript = await executeTurnLoop(turnLoopConfig, callbacks);

        if (aborted) {
          // Client disconnected — persist partial state but skip share line
          await db
            .update(bouts)
            .set({
              status: "error",
              transcript: transcript,
            })
            .where(eq(bouts.id, boutId));

          if (userId && estimatedCostMicro > 0) {
            await refundPreauth(userId, boutId, estimatedCostMicro);
          }
          return;
        }

        // Generate share line
        const shareLine = await generateShareLine(transcript, shareLineModel);

        // Persist completed bout
        await db
          .update(bouts)
          .set({
            status: "completed",
            transcript: transcript,
            shareLine: shareLine,
          })
          .where(eq(bouts.id, boutId));

        // Emit share line event
        sendEvent("data-share-line", { shareLine });

        // Settle credits if user is authenticated.
        // Isolated try/catch: if settlement throws after bout is persisted as
        // "completed", we must NOT revert to "error" or refund the preauth —
        // that would give the user a completed bout AND their credits back.
        // Credits remain deducted at preauth level; manual reconciliation if needed.
        if (userId && estimatedCostMicro > 0) {
          try {
            const actualCostMicro = computeActualCostMicro(
              transcript,
              modelId,
            );
            await settleCredits(
              userId,
              boutId,
              actualCostMicro,
              estimatedCostMicro,
            );
          } catch (settlementErr) {
            console.error(
              `[bout:${boutId}] Settlement failed, credits remain preauthorized:`,
              settlementErr,
            );
          }
        }

        if (!aborted) {
          sendEvent("done", {});
        }
      } catch (err) {
        // Persist partial transcript with error status
        await db
          .update(bouts)
          .set({
            status: "error",
            transcript: transcript.length > 0 ? transcript : null,
          })
          .where(eq(bouts.id, boutId));

        // Refund preauth on error
        if (userId && estimatedCostMicro > 0) {
          await refundPreauth(userId, boutId, estimatedCostMicro);
        }

        if (!aborted) {
          const message = err instanceof Error ? err.message : "Unknown error";
          sendEvent("error", { code: "TURN_LOOP_ERROR", message });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed by cancel() — expected on client disconnect
        }
      }
    },

    cancel() {
      aborted = true;
    },
  });
}
