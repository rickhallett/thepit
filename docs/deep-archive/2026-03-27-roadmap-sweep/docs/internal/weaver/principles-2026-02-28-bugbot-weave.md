# Principles — Bugbot Weave Session, 2026-02-28

Distilled from three rounds of automated review across PRs #385-#389 (bout-engine test spec, 169 cases). Each principle emerged from practice, not theory.

Source session: SD-230 (bugbot findings log), SD-231 (greppable principles).

---

## 1. Automated review is probabilistic sampling, not deterministic scanning. #principle

Round 1 found 4 issues. We fixed all 4. Round 2 found 3 completely different issues. The fixes didn't just clear findings — they changed the attention surface. Each pass samples a different region of the defect space. This means: budget for multiple rounds. The fix-review loop does not converge by default. You cannot assume round N+1 will be clean because round N was addressed.

## 2. Surface-correct code is the hardest defect class because every gate pattern-matches on shape. #principle

`expect(result.status).toBe(400)` looks right. The test is green. The gate passes. Bugbot round 1 missed it. Only round 2 caught V-03c, and only because the surrounding code changed. The entire verification chain — agent, gate, automated reviewer, human — is vulnerable to the same bias: if the output shape matches expectations, the causal path goes unexamined. This is not a testing problem. It is the fundamental failure mode of LLM-generated code.

## 3. The name that converts to the imperative is the right name. #principle

"Phantom Green" describes the symptom. "Coincidental Assertion" describes the mechanism. "Right Answer, Wrong Work" describes the gap the fix fills. "Show your work" is already the review checklist item, the static analysis rule, the assertion pattern. When naming any failure mode, choose the name whose negation is the fix.

## 4. Parallelise the work, rail the scaffolding. #principle

Two worktrees, two agents, independent files, both produced correct fixes in parallel. But the Captain immediately spotted the variance risk: worktree creation itself was left to LLM discretion. The principle: let the LLM do what LLMs are good at (contextual code changes inside a bounded scope). Make deterministic what LLMs are bad at (consistent filesystem conventions, naming, location). The boundary between "agent discretion" and "scripted rail" is the engineering decision.

## 5. Durable logging of ephemeral events creates institutional learning. #principle

Without the TSV, today's findings exist only in PR comments (which decay into noise) and conversation context (which dies at compaction). The log creates a corpus. Over time: which defect classes recur? Which review round catches them? What's the false positive rate? The log is not overhead — it is the mechanism by which the system learns from its own verification history. One line per finding, 30 tokens, append-only. The cost is negligible. The value compounds.

## 6. Each actor in the verification chain has a different eye. The value is in the diversity, not the depth. #principle

Agent writes a test. Gate checks it compiles and passes. Bugbot checks semantic correctness. Captain checks whether the pattern survives into the system. Each caught something the others missed. No single gate, no matter how thorough, replaces the chain. This is Governing Principle §6 (error dilution) made empirical: the probability reduction comes from independent verification, not from making any one verifier smarter.

---

## Meta-principle. #principle

The system that writes the code and the system that verifies the code share the same failure mode. Both pattern-match on shape. The only defence is multiplying independent perspectives until the probability of shared blind spots approaches zero. Today we watched that happen in real time — three rounds, eight findings, each round seeing what the previous rounds couldn't.
