# Watchdog Audit Findings - V2

**Date:** March 1, 2026  
**Auditor:** Watchdog  
**Framework Applied:** `docs/internal/watchdog/ai-blindspot-taxonomy.yaml`  

## Executive Summary
Continuing the systemic sweep across the API boundary and testing layers, three additional critical blind spots were identified. These vulnerabilities involve complete failures to enforce server-side validation boundaries, allowing clients to inject arbitrary data into the system, paired with test suites that perfectly obscure the flaws.

## Finding 4: Boundary & Trust Failures (Client-Side Envy & Missing AuthZ)
**Location:** `app/api/winner-vote/route.ts` (lines 35-51)  
**Severity:** HIGH (Leaderboard / Analytics Manipulation)

**Description:**
When a user submits a vote for the winner of a bout, the server verifies that the user is authenticated and that the `boutId` exists. However, it completely fails to verify that the submitted `agentId` was actually a participant in that bout.
```typescript
await db.insert(winnerVotes).values({ boutId, agentId, userId }).onConflictDoNothing();
```
**The Blind Spot:** A malicious client can submit a valid `boutId` alongside the `agentId` of their own custom agent. Since the server blindly trusts the client's payload, it inserts the vote. This allows users to farm votes for their agents on highly trafficked bouts they were never part of, corrupting the leaderboard and research data. AI models frequently forget relational boundaries when inserting flat rows.

## Finding 5: Boundary & Trust Failures (Orphaned State Injection)
**Location:** `app/api/reactions/route.ts` (lines 33-85)  
**Severity:** MEDIUM (Database Garbage Accumulation)

**Description:**
The reactions endpoint accepts a `boutId` and `turnIndex` to record a user's reaction (e.g., a "heart"). It performs a `db.insert(reactions)` without ever verifying that the `boutId` exists in the database, nor verifying that the `turnIndex` is less than or equal to the actual number of turns that occurred in the bout.

**The Blind Spot:** Clients can submit `{ boutId: 'non-existent', turnIndex: 99999 }`. The API will happily process the reaction and store it. At scale, this is an open vector for filling the database with unlinked, orphaned garbage data. The AI focused purely on the "toggle" logic of adding/removing a reaction, completely forgetting to validate the existence of the parent entity.

## Finding 6: Tautological Testing (The Illusion of Coverage)
**Location:** `tests/api/winner-vote-success.test.ts` (lines 81-93)  
**Severity:** CRITICAL (Test Suite Blindness)

**Description:**
The test suite for the `winner-vote` endpoint achieves 100% line coverage for the success path:
```typescript
it('H1: authenticated user casts valid vote → 200 { ok: true }', async () => {
  const res = await POST(makeReq({ boutId: 'bout-1', agentId: 'agent-a' }));
  expect(mockValues).toHaveBeenCalledWith({ boutId: 'bout-1', agentId: 'agent-a' });
});
```
**The Blind Spot:** This is textbook Tautological Testing. The AI wrote a test that perfectly asserts the flawed implementation. Because the implementation doesn't check if `agent-a` belongs to `bout-1`, the test doesn't mock or assert that check either. The test merely proves that "whatever the client sends is passed to the database mock". It satisfies the coverage requirement while actively hiding the security vulnerability identified in Finding 4.

---
*These findings have been stored durably to assist in tracking defect remediation prior to production hardening.*