# ADVERSARIAL CODE REVIEW: THE PIT

**Date:** 2026-02-10  
**Reviewer:** Claude Code  
**Scope:** Full codebase security and architecture review

## Executive Summary

This is a well-structured Next.js application with reasonable patterns, but I've identified **critical security vulnerabilities**, **race conditions**, **logic flaws**, and **architectural concerns** that range from "could lose you money" to "this will bite you at scale."

---

## 🔴 CRITICAL: Security Vulnerabilities

### 1. **RACE CONDITION IN CREDIT PREAUTHORIZATION** (`app/api/run-bout/route.ts:154-175`)

```typescript
const balance = await getCreditBalanceMicro(userId);
if (balance === null || balance < preauthMicro) {
  return new Response('Insufficient credits.', { status: 402 });
}
await applyCreditDelta(userId, -preauthMicro, 'preauth', {...});
```

**The problem:** Check-then-act without a transaction. A user can fire multiple concurrent requests and overdraw their balance. The time between `getCreditBalanceMicro` and `applyCreditDelta` is a race window.

**Attack:** Open 10 browser tabs, click "Run Bout" simultaneously. Each request sees sufficient balance, all 10 preauths succeed, user goes deeply negative.

**Fix:** Use a database transaction with `SELECT ... FOR UPDATE` or optimistic locking with a version column.

---

### 2. **UNAUTHENTICATED AGENT CREATION** (`app/api/agents/route.ts:98-103`)

```typescript
const { userId } = await auth();
// ... no check if userId is null for creation
if (userId) {
  await ensureUserRecord(userId);
}
// Agent is created regardless
```

**The problem:** Anyone can create agents without authentication. The `userId` is optional — unauthenticated users get `ownerId: null`. This is a vector for:
- Database pollution / DoS
- Resource exhaustion
- Spam agents flooding the catalog

---

### 3. **BYOK API KEY STORED IN SESSION STORAGE** (`lib/use-bout.ts:148-151`)

```typescript
const byokKey = model === 'byok'
  ? window.sessionStorage.getItem('pit_byok_key')
  : null;
```

**The problem:** Session storage is accessible to any JavaScript on the page. If you have XSS anywhere (or load a compromised third-party script), user API keys are exfiltrated instantly.

**Additional risk:** The key is sent in the POST body to `/api/run-bout`, meaning it's logged in many places (request logs, error tracking, etc.).

---

### 4. **NO RATE LIMITING ON REACTIONS** (`app/api/reactions/route.ts`)

```typescript
// No authentication required
// No rate limiting
// No duplicate detection
await db.insert(reactions).values({...});
```

**Attack:** Script kiddie runs `for i in {1..1000000}; do curl -X POST .../api/reactions ...; done`. Your database fills up, analytics are ruined, and you have no recourse.

---

### 5. **WEBHOOK SIGNATURE TIMING ATTACK** (`app/api/credits/webhook/route.ts:30-33`)

```typescript
event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

This is fine because Stripe's SDK uses constant-time comparison internally. But the early-return pattern at line 47 (`if (!existing)`) creates a timing oracle — an attacker can detect whether a session ID has been processed.

---

## 🟠 HIGH: Logic & Data Integrity Issues

### 6. **INTRO POOL RACE CONDITION** (`lib/intro-pool.ts:72-84`)

```typescript
const claimMicro = Math.min(remainingMicro, requestedMicro);
// Time passes...
await db.update(introPool).set({
  claimedMicro: sql`${introPool.claimedMicro} + ${claimMicro}`,
});
```

**The problem:** Two concurrent signups can both see 100 credits remaining when only 100 exist. Both claim 100. Pool goes negative. The SQL increment is atomic, but `remainingMicro` was computed from stale data.

---

### 7. **REMIX SELF-ENRICHMENT LOOPHOLE** (`lib/remix.ts:219-238`)

The code blocks self-remix (`source.ownerId === userId`), but what about:
1. User A creates Agent X
2. User A transfers ownership to User B (if such feature exists or is added)
3. User B remixes Agent X
4. User B transfers back to User A
5. User A now has a "remixed" copy + both got credits

Even without transfer: User creates two accounts, remixes between them.

---

### 8. **ATTESTATION UID TYPE MISMATCH** (`lib/eas.ts:99-107`)

```typescript
const uid = await transaction.wait();  // Returns string
const txHash = txInfo.receipt?.transactionHash ?? txInfo.tx?.hash ?? txInfo.hash ?? '';
return { uid, txHash };
```

The return type says `uid: string`, but `transaction.wait()` returns the attestation UID which is `bytes32`. The type coercion works, but there's no validation that `uid` is actually a valid 66-character hex string. Silent corruption risk.

---

### 9. **CREDIT SETTLEMENT CAN GO NEGATIVE** (`app/api/run-bout/route.ts:317-333`)

```typescript
const delta = actualMicro - preauthMicro;
if (delta !== 0) {
  await applyCreditDelta(userId, delta, 'settlement', {...});
}
```

If `actualMicro > preauthMicro` (bout used more tokens than estimated), the delta is positive, meaning you're _charging more_. But there's no check that the user _has_ credits remaining. You're hoping the preauth was sufficient, but with streaming and model variability, it might not be.

---

### 10. **BOUT ID COLLISION HANDLING IS WRONG** (`app/api/run-bout/route.ts:178-192`)

```typescript
await db.insert(bouts).values({...}).onConflictDoNothing();
```

If a bout already exists (e.g., page refresh), `onConflictDoNothing` silently proceeds. Then at line 203-211:

```typescript
await db.update(bouts).set({ status: 'running', ... }).where(eq(bouts.id, boutId));
```

This overwrites any existing bout data. If a user refreshes during a running bout, or shares a bout ID, they can:
1. Reset a completed bout to "running"
2. Overwrite the transcript
3. Cause double-charging (preauth happens again)

---

## 🟡 MEDIUM: Architecture & Maintainability

### 11. **GLOBAL DB CLIENT IS NULLABLE** (`db/index.ts:8-10`)

```typescript
export const db = connectionString
  ? drizzle(neon(connectionString), { schema })
  : null;
```

Then everywhere else:
```typescript
export function requireDb() {
  if (!db) throw new Error('DATABASE_URL is not set.');
  return db;
}
```

**The problem:** Every database operation has a runtime check that should be a build/deploy-time failure. If `DATABASE_URL` is missing, the app starts but fails on first DB operation with a confusing error.

---

### 12. **PRESET LOOKUP IS O(n) EVERY REQUEST** (`app/api/run-bout/route.ts:82`)

```typescript
let preset = ALL_PRESETS.find((item) => item.id === presetId);
```

This is fine for 10 presets. At 1000 presets, every bout start scans the entire array. Use a `Map<string, Preset>`.

---

### 13. **TRANSCRIPT GROWS UNBOUNDED IN MEMORY** (`app/api/run-bout/route.ts:196-268`)

```typescript
const history: string[] = [];
for (let i = 0; i < preset.maxTurns; i += 1) {
  // ... history.push(`${agent.name}: ${fullText}`);
  // prompt includes: `Transcript so far:\n${history.join('\n')}`
}
```

With 12 turns of ~500 tokens each, the context window explodes quadratically. Turn 12's prompt includes turns 1-11 verbatim. This isn't just inefficient — it'll hit context limits and fail silently or expensively.

---

### 14. **ERROR SWALLOWING MASKS FAILURES** (Multiple locations)

```typescript
// app/actions.ts:77-79
} catch (error) {
  console.error('createBout insert failed', error);
}
// Then redirect anyway!
```

```typescript
// app/bout/[id]/page.ts:74-82
} catch (error) {
  console.error('Failed to load bout', error);
}
// Then proceed with undefined bout
```

Silent failures that continue execution are debugging nightmares and data integrity risks.

---

### 15. **SHARE LINE TRUNCATION IS LOSSY** (`app/api/run-bout/route.ts:295-298`)

```typescript
shareLine = shareText.trim().replace(/^["']|["']$/g, '');
if (shareLine.length > 140) {
  shareLine = `${shareLine.slice(0, 137).trimEnd()}...`;
}
```

The regex strips outer quotes but doesn't handle nested quotes, escaped quotes, or Unicode weirdness. The truncation can break mid-emoji or mid-word. Consider using `Intl.Segmenter` for proper grapheme-aware truncation.

---

## 🔵 LOW: Code Quality & Style

### 16. **TYPE COERCION INCONSISTENCIES**

```typescript
// Sometimes:
typeof payload.topic === 'string' ? payload.topic.trim() : ''

// Other times:
typeof payload.model === 'string' ? payload.model.trim() : ''

// But also:
formData?.get('topic') && typeof formData.get('topic') === 'string'
  ? String(formData.get('topic')).trim()
  : '';
```

The `String()` call is redundant after the `typeof` check. Pick one pattern and stick with it.

---

### 17. **MAGIC NUMBERS EVERYWHERE**

```typescript
const delayMs = Math.floor(2000 + Math.random() * 2000);  // lib/use-bout.ts:140
const clippedTranscript = transcriptText.slice(-2000);     // route.ts:282
if (shareLine.length > 140) {                              // route.ts:296
```

Extract these to named constants with documentation explaining _why_ these specific values.

---

### 18. **MIXED CONCERNS IN API ROUTES**

`/api/run-bout/route.ts` is 374 lines handling:
- Request validation
- Auth checking
- Credit preauthorization
- Database operations
- Stream orchestration
- AI model calls
- Share line generation
- Credit settlement
- Error recovery

This is a god function. Extract into composable units: `validateBoutRequest()`, `preauthCredits()`, `runBoutStream()`, `generateShareLine()`, `settleCredits()`.

---

### 19. **INCONSISTENT NULL HANDLING**

```typescript
// Sometimes:
ownerId: userId ?? null

// Other times:
topic: topic || null

// These are NOT the same for empty strings!
```

`'' ?? null` returns `''`. `'' || null` returns `null`. Be explicit about which you mean.

---

### 20. **TEST COVERAGE GAPS**

Based on the test files I see, there's no evidence of:
- Race condition tests
- Concurrent request tests  
- Negative balance tests
- Malformed input fuzzing
- Edge case transcript handling

The happy paths are tested. The attack vectors are not.

---

## Recommendations (Priority Order)

1. **IMMEDIATE:** Add database transactions for credit operations
2. **IMMEDIATE:** Rate limit all unauthenticated endpoints
3. **THIS WEEK:** Require auth for agent creation
4. **THIS WEEK:** Add idempotency keys to bout creation
5. **NEXT SPRINT:** Refactor run-bout into composable functions
6. **NEXT SPRINT:** Add concurrent request integration tests
7. **BACKLOG:** Replace array scans with Map lookups
8. **BACKLOG:** Add proper input validation library (zod?)

---

## Issue Tracking

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | CRITICAL | Credit preauth race condition | ⬜ TODO |
| 2 | CRITICAL | Unauthenticated agent creation | ⬜ TODO |
| 3 | CRITICAL | BYOK key in session storage | ⬜ TODO |
| 4 | CRITICAL | No rate limiting on reactions | ⬜ TODO |
| 5 | CRITICAL | Webhook timing oracle | ⬜ TODO |
| 6 | HIGH | Intro pool race condition | ⬜ TODO |
| 7 | HIGH | Remix self-enrichment loophole | ⬜ TODO |
| 8 | HIGH | Attestation UID type mismatch | ⬜ TODO |
| 9 | HIGH | Credit settlement can go negative | ⬜ TODO |
| 10 | HIGH | Bout ID collision handling | ⬜ TODO |
| 11 | MEDIUM | Global DB client nullable | ⬜ TODO |
| 12 | MEDIUM | Preset lookup O(n) | ⬜ TODO |
| 13 | MEDIUM | Transcript unbounded growth | ⬜ TODO |
| 14 | MEDIUM | Error swallowing | ⬜ TODO |
| 15 | MEDIUM | Share line truncation lossy | ⬜ TODO |
| 16 | LOW | Type coercion inconsistencies | ⬜ TODO |
| 17 | LOW | Magic numbers | ⬜ TODO |
| 18 | LOW | Mixed concerns in routes | ⬜ TODO |
| 19 | LOW | Inconsistent null handling | ⬜ TODO |
| 20 | LOW | Test coverage gaps | ⬜ TODO |
