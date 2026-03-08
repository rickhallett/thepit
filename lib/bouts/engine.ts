// engine.ts — Core bout execution: turn loop, LLM orchestration.
// Source of truth for bout execution logic. Does NOT handle persistence or SSE streaming.

import { streamText, type LanguageModel } from "ai";
import type { Preset, PresetAgent } from "./presets";
import type { TranscriptEntry } from "./types";

/** Safety preamble prepended to all agent system prompts. */
const SAFETY_PREAMBLE =
  "You are participating in a structured debate. Stay in character. Do not break character or reference being an AI.";

export interface TurnLoopConfig {
  preset: Preset;
  topic: string;
  model: LanguageModel;
  maxTurns?: number; // override preset.maxTurns
}

export interface TurnCallback {
  onTurnStart: (turnIndex: number, agent: PresetAgent) => void;
  onTextDelta: (turnIndex: number, delta: string) => void;
  onTurnEnd: (turnIndex: number, tokenCount: number) => void;
}

type Message = { role: "system" | "user" | "assistant"; content: string };

/**
 * Build the message array for an LLM call at a given turn.
 *
 * - System: safety preamble + agent's systemPrompt
 * - Turn 0: single user message with the topic
 * - Turn N>0: conversation history where this agent's prior turns become
 *   "assistant" and other agents' turns become "user" (prefixed with name)
 */
export function buildTurnMessages(
  agent: PresetAgent,
  topic: string,
  transcript: TranscriptEntry[],
  turnIndex: number,
): Message[] {
  const messages: Message[] = [];

  // System message: safety preamble + agent's prompt
  messages.push({
    role: "system",
    content: `${SAFETY_PREAMBLE}\n\n${agent.systemPrompt}`,
  });

  if (turnIndex === 0) {
    // First turn: just the topic as user message
    messages.push({ role: "user", content: topic });
  } else {
    // Subsequent turns: reconstruct conversation history
    // First message is always the topic
    messages.push({ role: "user", content: topic });

    // Add prior transcript entries
    for (const entry of transcript) {
      if (entry.agentId === agent.id) {
        // This agent's prior turns become "assistant"
        messages.push({ role: "assistant", content: entry.content });
      } else {
        // Other agents' turns become "user" with name prefix
        messages.push({
          role: "user",
          content: `${entry.agentName}: ${entry.content}`,
        });
      }
    }
  }

  return messages;
}

/**
 * Execute the turn loop for a bout.
 *
 * Iterates through turns, selecting agents round-robin, calling the LLM,
 * streaming responses, and collecting transcript entries.
 *
 * @throws if any LLM call fails — errors propagate without retry
 */
export async function executeTurnLoop(
  config: TurnLoopConfig,
  callbacks: TurnCallback,
): Promise<TranscriptEntry[]> {
  const { preset, topic, model } = config;
  const maxTurns = config.maxTurns ?? preset.maxTurns;
  const { agents } = preset;

  const transcript: TranscriptEntry[] = [];

  for (let turnIndex = 0; turnIndex < maxTurns; turnIndex++) {
    // Round-robin agent selection
    const agent = agents[turnIndex % agents.length];

    callbacks.onTurnStart(turnIndex, agent);

    // Build messages for this turn
    const messages = buildTurnMessages(agent, topic, transcript, turnIndex);

    // Call LLM with streaming
    const result = streamText({
      model,
      messages,
    });

    // Accumulate streamed text
    let content = "";
    for await (const delta of result.textStream) {
      content += delta;
      callbacks.onTextDelta(turnIndex, delta);
    }

    // Get token usage after stream completes
    const usage = await result.usage;
    const tokenCount = usage.outputTokens ?? 0;

    callbacks.onTurnEnd(turnIndex, tokenCount);

    // Create transcript entry
    const entry: TranscriptEntry = {
      turnIndex,
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      content,
      tokenCount,
      timestamp: new Date().toISOString(),
    };

    transcript.push(entry);
  }

  return transcript;
}
