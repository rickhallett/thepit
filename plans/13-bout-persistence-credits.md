# 13-bout-persistence-credits

## Context
depends_on: [09, 10]
produces: [lib/bouts/engine.ts (modified), app/api/run-bout/route.ts (modified)]
domain: lib/bouts/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Bout Flow, Credit Flow — full lifecycle)
- lib/bouts/engine.ts (executeTurnLoop)
- lib/bouts/streaming.ts (createBoutSSEStream)
- app/api/run-bout/route.ts (current minimal handler)
- lib/credits/preauth.ts (preauthorizeCredits)
- lib/credits/settlement.ts (settleCredits, refundPreauth)
- lib/credits/catalog.ts (estimateBoutCostMicro)
- db/schema.ts (bouts table)
- lib/bouts/types.ts (BoutStatus, TranscriptEntry)

## Task

This task wires persistence and credits into the existing bout pipeline. You are modifying existing files, not creating new ones.

### 1. Update the route handler

Modify `app/api/run-bout/route.ts` to add the full lifecycle:

```typescript
export async function POST(req: NextRequest) {
  // 1. Validate request (existing)
  const validation = await validateBoutRequest(req);
  if (!validation.valid) return validation.response;

  // 2. INSERT bout row with status='running'
  await db.insert(bouts).values({
    id: data.boutId,
    ownerId: userId || null,  // null for anonymous
    presetId: data.presetId,
    topic: data.topic || preset.description,
    agentLineup: preset.agents,
    status: "running",
    model: modelId,
    responseLength: data.length || null,
    responseFormat: data.format || null,
  });

  // 3. If user is authenticated and credits are enabled:
  //    Estimate cost → preauthorize → if fails, return 402
  let preauthResult = null;
  if (userId && getEnv().CREDITS_ENABLED) {
    const estimatedCost = estimateBoutCostMicro({
      maxTurns: preset.maxTurns,
      model: modelId as "claude-haiku" | "claude-sonnet",
    });
    preauthResult = await preauthorizeCredits(userId, estimatedCost, data.boutId);
    if (!preauthResult.success) {
      await db.update(bouts).set({ status: "error" }).where(eq(bouts.id, data.boutId));
      return errorResponse(402, "INSUFFICIENT_CREDITS", "Not enough credits");
    }
  }

  // 4. Create SSE stream with persistence callbacks
  //    (see createBoutSSEStreamWithPersistence below)

  // 5. Return SSE response
}
```

### 2. Enhanced streaming with persistence

Modify `lib/bouts/streaming.ts` or extend it with a new function:

```typescript
export function createBoutSSEStreamWithPersistence(config: {
  turnLoopConfig: TurnLoopConfig;
  boutId: string;
  userId: string | null;
  estimatedCostMicro: number;
}): ReadableStream<Uint8Array>
```

After the turn loop completes successfully:
1. Generate share line: make a separate LLM call to Haiku with prompt "Summarize this debate in one punchy sentence (max 80 tokens)" passing the transcript. Use `generateText` (not streaming) for this.
2. Persist: `UPDATE bouts SET status='completed', transcript=transcriptJson, share_line=shareLine WHERE id=boutId`
3. Send `data-share-line` SSE event with the share line
4. If credits enabled: call `settleCredits(userId, boutId, actualCost, estimatedCost)`
5. Send `done` event

On error:
1. Persist partial transcript: `UPDATE bouts SET status='error', transcript=partialTranscript WHERE id=boutId`
2. If credits enabled: call `refundPreauth(userId, boutId, estimatedCost)`
3. Send `error` event, then close

### 3. Share line generation

Add to `lib/bouts/engine.ts`:

```typescript
export async function generateShareLine(
  transcript: TranscriptEntry[],
  model: LanguageModel
): Promise<string>
```

- Use `generateText` from the `ai` package with Haiku
- System prompt: "You are a witty headline writer. Write one punchy sentence summarizing this debate. Maximum 80 tokens. No hashtags. No emoji."
- User message: summarized transcript (agent names + first 100 chars of each turn)
- Max tokens: 80

### 4. Compute actual cost

After the turn loop, calculate actual cost from transcript token counts:
```typescript
function computeActualCostMicro(transcript: TranscriptEntry[], model: string): number
// Sum all tokenCount values from transcript entries
// Apply model pricing rates from catalog
```

### 5. Update existing tests

Update `lib/bouts/engine.test.ts` to test `generateShareLine` (mock LLM).
Update `lib/bouts/streaming.test.ts` to test the persistence+credits path (mock db, mock credits functions).

### Do NOT
- Change the preauthorization or settlement logic from tasks 10-11
- Add rate limiting — that will be tier-aware (task 17)
- Add authentication requirements — the route stays public (auth is optional)
- Create new API routes — only modify the existing run-bout route

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0
- The route handler INSERTs a bout row before streaming
- On completion: bout row has status='completed', transcript is not null, share_line exists
- On error: bout row has status='error', credits are refunded
- Share line generation uses Haiku with 80 token max
