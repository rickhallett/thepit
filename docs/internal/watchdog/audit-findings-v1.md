# Watchdog Audit Findings - V1

**Date:** March 1, 2026  
**Auditor:** Watchdog  
**Framework Applied:** `docs/internal/watchdog/ai-blindspot-taxonomy.yaml`  

## Executive Summary
An initial sweep of the `tspit` codebase, applying the AI Blindspot Taxonomy, revealed multiple instances of production-hostile vulnerabilities characteristic of AI-generated code. These are not syntax errors; they are structural fragilities that surface only under scale, load, or failure states.

## Finding 1: Systemic Attrition (Unbounded Operations)
**Location:** `lib/research-exports.ts` (lines ~42-52)  
**Severity:** HIGH (Guaranteed OOM under scale)

**Description:**
The `generateResearchExport` function pulls all completed bouts, reactions, and winner votes into Node memory simultaneously:
```typescript
const boutRows = await db.select().from(bouts).where(eq(bouts.status, 'completed'));
const reactionRows = await db.select().from(reactions);
const voteRows = await db.select().from(winnerVotes);
```
**The Blind Spot:** AI assumes databases hold 10 rows. At production scale, loading hundreds of thousands of reactions into memory at once will inevitably trigger an Out-Of-Memory (OOM) crash, bringing down the entire container. This requires cursor-based pagination or a Postgres stream.

## Finding 2: Temporal & State Fragility (Transaction Boundary Failures)
**Location:** `app/api/admin/seed-agents/route.ts` (lines ~50-155)  
**Severity:** MEDIUM (State Corruption)

**Description:**
The admin seeding route loops over sets of agents and performs sequential `db.insert(agents)` calls. 
**The Blind Spot:** It fails to wrap the loop in a single `db.transaction`. If an insert fails halfway through the loop (e.g., due to a constraint violation or network timeout), the earlier inserts remain committed. This leaves the system in a permanently fractured, partially seeded state. AI code frequently models multi-step writes linearly without ACID boundaries.

## Finding 3: Systemic Attrition (Swallowed Exceptions)
**Location:** `app/api/contact/route.ts` (line 64)  
**Severity:** LOW/MEDIUM (Observability Degradation)

**Description:**
When attempting to notify admins via the Resend API, network errors are caught and logged as strings:
```typescript
} catch (err) {
  log.warn('Resend API fetch failed (contact captured to DB)', { error: String(err) });
}
```
**The Blind Spot:** Casting the error to a String (`String(err)`) completely obliterates the stack trace. When this fails in production, the logs will merely show "Error: fetch failed", giving engineers zero context on the origin or nature of the failure. This is a classic case of AI trying to be "safe" by catching errors, but making the system un-debuggable.

---
*These findings have been stored durably to assist in tracking defect remediation prior to production hardening.*