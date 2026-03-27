# Watchdog: AI Code Vulnerability Principles & Lessons Learned

**Date:** March 1, 2026  
**Author:** Watchdog  
**Context:** Derived from the adversarial audit and remediation of 6 production-hostile defects found in an AI-generated codebase.

## Executive Summary

AI does not write *bad* code. It writes *plausible* code optimized for a "Happy Path" reality that does not exist. It assumes the database is local, the network is instantaneous, memory is infinite, and the client is a benevolent actor following the API specification. 

This document collates the theoretical taxonomy with the empirical lessons learned from finding and fixing these vulnerabilities in the wild.

---

## Part 1: Generalizable Principles (Empirical Findings)

After actively exploiting and patching these blind spots, four clear principles emerge that govern how AI models construct fragile software:

### 1. The Relational Amnesia Principle (AuthZ Failures)
**The Flaw:** AI consistently writes operations in isolation. It sees a request to `insert(vote)` and successfully writes the code to do so. What it forgets is the relational boundary: "Does the subject of this vote actually exist within the context of the parent entity?"
**The Reality:** It trusts the client’s payload implicitly. This results in missing Authorization (AuthZ) checks, allowing clients to inject orphaned data or manipulate resources they don't own (IDOR).
**The Rule:** *Never trust the shape of the payload without validating the relationships of the payload.*

### 2. The Tautological Testing Principle (Coverage Theatre)
**The Flaw:** When asked to write tests, AI frequently mocks the database to accept whatever payload is passed, and then asserts that the payload was passed. 
**The Reality:** This achieves 100% line coverage but 0% behavioral verification. It tests the testing framework, not the business logic. It actively obscures structural flaws because the test proves that the flawed logic executes successfully.
**The Rule:** *A test must assert a boundary, a failure state, or a business rule. Asserting a successful mock call is testing a mirror.*

### 3. The Unbounded Operations Principle (The Infinity Assumption)
**The Flaw:** AI writes data retrieval logic (`SELECT *`) as if tables contain exactly 10 rows. 
**The Reality:** At scale, pulling massive datasets into Node memory simultaneously guarantees an Out-Of-Memory (OOM) crash. AI rarely volunteers cursor-based pagination or streams unless explicitly instructed, because in its training data, basic examples don't require them.
**The Rule:** *Every collection retrieval must have a hard boundary (pagination, limit, or stream). No exceptions.*

### 4. The Linear Transaction Principle (ACID Forgetting)
**The Flaw:** AI translates multi-step business logic into sequential, uncoupled database calls.
**The Reality:** It forgets the event loop, network timeouts, and constraint violations. If step 3 of 4 fails, steps 1 and 2 remain committed, leaving the system in a permanently fractured state. It optimizes for readability over atomicity.
**The Rule:** *Any operation mutating more than one table, or mutating in a loop, must be wrapped in a transaction.*

---

## Part 2: The Core Taxonomy (Theoretical Framework)

The underlying framework used to hunt for these principles, categorized for engineering review.

### 1. Tautological Testing (The Illusion of Coverage)
* **Testing the Mock:** Asserting the mock configuration rather than the system logic.
* **Assertion Amnesia:** Executing setup and operations but failing to assert final state mutations.
* **Happy Path Overfit:** Achieving high line coverage using only perfectly formatted inputs, ignoring protocol timeouts, nulls, and malformed data.

### 2. Temporal & State Fragility (Concurrency)
* **Race Condition Denial:** Assuming state remains constant across multiple asynchronous await boundaries.
* **Transaction Boundary Failures:** Executing interdependent database mutations outside ACID transactions.
* **Idempotency Blindness:** Missing safeguards for network retries, allowing duplicate mutations (e.g., double billing).

### 3. Boundary & Trust Failures (Security)
* **AuthN vs AuthZ Conflation:** Verifying a user is logged in, but failing to verify they own the specific resource being mutated (IDOR).
* **Client-Side Envy:** Trusting client-provided payload data that should be strictly server-calculated (e.g., item prices).
* **Timing & Side-Channel Leaks:** Using standard string comparison instead of constant-time algorithms for secrets.

### 4. Systemic Attrition (Resource Mishandling)
* **N+1 Scaling Timebomb:** Fetching lists and sequentially looping to fetch relations instead of using joined queries.
* **Unbounded Operations:** Missing pagination (`SELECT *`) or streaming, causing inevitable OOM crashes at scale.
* **Swallowed Exceptions (Silent Failures):** Wrapping operations in try/catch and returning generic errors without logging stack traces or contexts (e.g. casting to `String(err)`).

### 5. Semantic Hallucinations (The "Looks Right" Trap)
* **Plausible but Phantom APIs:** Calling methods that sound correct but do not exist in the installed dependency version.
* **Dead Code Pathways:** Generating complex error handlers that are mathematically impossible to reach due to earlier returns.
* **Context Compaction Smoothing:** Forgetting domain-specific business rules and substituting generic logic that technically works but violates requirements.

---
*Conclusion: AI is an exceptional typist, but a terrible architect. Without a systemic verification discipline or an adversarial QA lens, these vulnerabilities will pass standard PR reviews and CI gates, detonating only when exposed to production reality.*