# 08-bout-turn-loop

## Context
depends_on: [07]
produces: [lib/bouts/engine.ts, lib/bouts/engine.test.ts]
domain: lib/bouts/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Bout Flow section — turn loop details, Core Workflows section)
- lib/bouts/DOMAIN.md
- lib/bouts/types.ts (TranscriptEntry, BoutStatus)
- lib/bouts/presets.ts (Preset, PresetAgent types)

## Task

### 1. Install AI SDK

```
pnpm add ai @ai-sdk/anthropic
```

### 2. Core turn loop

Create `lib/bouts/engine.ts`:

```typescript
import { type LanguageModel } from "ai";
import type { Preset, PresetAgent } from "./presets";
import type { TranscriptEntry } from "./types";

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

export async function executeTurnLoop(
  config: TurnLoopConfig,
  callbacks: TurnCallback
): Promise<TranscriptEntry[]>
```

Implementation:
1. Initialize empty transcript array
2. For each turn (0 to maxTurns-1):
   a. Select agent: `agents[turnIndex % agents.length]` (round-robin)
   b. Call `callbacks.onTurnStart(turnIndex, agent)`
   c. Build messages array for the LLM call:
      - System message: agent's systemPrompt + safety preamble ("You are participating in a structured debate. Stay in character. Do not break character or reference being an AI.")
      - If topic provided and this is turn 0: user message with topic as the debate prompt
      - For subsequent turns: include prior transcript as conversation history (alternating user/assistant messages representing the other agents' turns and this agent's prior turns)
   d. Call `streamText` from `ai` package with the model and messages
   e. Iterate over `result.textStream`, calling `callbacks.onTextDelta` for each chunk, accumulating full text
   f. After stream completes, get token usage from `result.usage`
   g. Call `callbacks.onTurnEnd(turnIndex, usage.completionTokens)`
   h. Push `TranscriptEntry` to transcript array
3. Return completed transcript

### 3. Prompt construction helper

```typescript
function buildTurnMessages(
  agent: PresetAgent,
  topic: string,
  transcript: TranscriptEntry[],
  turnIndex: number
): Array<{ role: "system" | "user" | "assistant"; content: string }>
```

- System: safety preamble + agent.systemPrompt
- For turn 0: single user message with the topic/question
- For turn N>0: reconstruct the debate so far. Messages from THIS agent become "assistant" role. Messages from OTHER agents become "user" role (prefixed with their name for clarity, e.g., "Darwin: [their message]"). This gives the LLM the correct conversation history from the agent's perspective.

### 4. Unit tests

Create `lib/bouts/engine.test.ts`:

Mock the `streamText` function from `ai` to return predictable responses. Use `vi.mock("ai")`.

Tests:
- Test 2-agent, 4-turn bout: verify agents alternate correctly (agent[0], agent[1], agent[0], agent[1])
- Test 3-agent, 6-turn bout: verify round-robin (a0, a1, a2, a0, a1, a2)
- Test callbacks are called in correct order: onTurnStart → onTextDelta (1+ times) → onTurnEnd for each turn
- Test transcript entries have correct agentId, agentName, agentColor, content
- Test prompt construction: turn 0 includes topic, turn 1+ includes history
- Test system message includes safety preamble

### Do NOT
- Persist anything to the database — that's task 13
- Handle credits — that's task 13
- Implement SSE streaming to the client — that's task 09
- Create the API route — that's task 09
- Use `generateText` — use `streamText` so we can stream deltas to the client in task 09
- Handle errors with retry logic — a failed LLM call should throw and propagate

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — engine tests pass
- `lib/bouts/engine.ts` exports `executeTurnLoop` and `TurnLoopConfig`
- The turn loop uses `streamText` from the `ai` package
- Agent selection is round-robin (turnIndex % agents.length)
- System prompt always includes safety preamble text
