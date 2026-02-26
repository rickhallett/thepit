# Weave Optimisation Plan — 2026-02-24

Back-reference: SD-076/077/078 (copy pivot), SD-095 (Main Thread), SD-093 (two-sided coin), hn-launch-plan.md
Status: APPROVED by Captain. No execution until ordered.
Author: Weaver (synthesis of Captain's vision + Weaver's integration discipline)

---

## The Objective

The objective is not "launch a product on HN." The objective is to produce a public, permanent, interactive demonstration of Level 5 agentic engineering — under adversarial pressure, in real time, with intellectual honesty as the load-bearing structure. The product is the evidence. The HN thread is the demonstration. The weave is the craft.

The Captain rejects "vibe coding" — and he's right to. Vibe coding is "machine make it go." The weave is the precise inverse: disciplined verification fabric where every change is governed, every gate is respected, every agent output is treated as probabilistic and verified before it's trusted. The distinction matters because the target audience — companies operating at Level 5 — will recognise the difference instantly. They know what undisciplined multi-agent output looks like. They've seen the mess. What they haven't seen is someone who built the discipline layer and can prove it works.

### The Proof Is In Three Places Simultaneously

1. **The codebase.** 1,102 tests. 93% coverage on critical paths. Atomic commits. Conventional commits. Clean CI. AGPL — nothing hidden in the code itself. Anyone can clone, build, and verify.

2. **The research.** 6 hypotheses, 2 wrong predictions published, pre-registered methodology, honest caveats. The findings are specific, falsifiable, and the analysis code is public. This is what separates "I built a thing" from "I built a thing and measured what it does."

3. **The thread.** This is the part that doesn't exist yet. The thread is where judgment, communication under pressure, intellectual honesty, and learning velocity are demonstrated live. Pre-drafted responses exist not to fake spontaneity but to ensure the Captain can respond with substance within minutes — because thread dynamics on HN reward speed and specificity.

---

## The Vibe Coding Scale — Where The Captain Operates

```
Level 1: AI-Powered Prototyping (Low-Stakes)
Level 2: The "Prompt-and-Repair" Method
Level 3: Context-Aware Development (Cursor/IDE)
Level 4: "Vibe" Directing (Creative Direction)
Level 5: Autonomous Multi-Agent Systems
```

The Captain operates at Level 5 with a critical distinction: the verification fabric. Level 5 without verification is "autonomous agents doing whatever." Level 5 with verification is orchestration — the human provides vision, the agents execute, and a discipline layer (the weave) ensures probabilistic output is caught before it propagates. The weave is what makes Level 5 engineering instead of Level 5 chaos.

The portfolio piece demonstrates this distinction by existing. The 1,102 tests, the pre-registered methodology, the atomic commits, the gate that never gets skipped — these are the artifacts of disciplined orchestration. An HN reader who understands this distinction is exactly the reader the Captain wants to reach.

---

## The Two Lenses (RIGHT EYE / LEFT EYE)

Every artifact that exists in the public repo, on the live site, or in the HN post is evaluated through both:

**RIGHT EYE — Technical correctness.**
Does this artifact accurately represent the state of the system? Are the numbers right? Are the qualifiers honest? Does the code match the claims? Does the gate pass?

**LEFT EYE — Engagement surface.**
Does this artifact create an opportunity for fruitful engagement? Does it invite the kind of scrutiny that produces a good thread? Or does it create a dismissal trigger, a skeleton, or an attack surface that produces a bad thread?

Artifacts that pass RIGHT but fail LEFT get modified or removed. Artifacts that pass LEFT but fail RIGHT are Category One violations — they never ship.

**The asymmetry:** RIGHT EYE is non-negotiable. LEFT EYE is optimisation. We never sacrifice correctness for engagement. But we actively shape what's visible to maximise the probability of the engagement we want.

---

## What Goes, What Stays, What Gets Hardened

### WALK THE PLANK (external docs that fail the LEFT EYE)

Any git-tracked file that could be read as positioning machinery, hiring strategy, audience manipulation, or "clever AI-generated marketing" must be removed from tracking. The test: if an HN commenter links to it and says "look at this — he built an entire AI system to manipulate his launch positioning," does it hurt? If yes, it walks.

**Candidates (to be ranked in DARK doc):**
- `docs/eval-prompts/` — 14 XML files of agent evaluation prompts. Reveals the evaluation apparatus.
- `docs/narrative-prompts/` — 5 XML files of copy/story generation. Reveals positioning machinery.
- `docs/audience-models/` — demographic targeting lenses. Reveals audience manipulation strategy.
- `docs/eval-briefs/` — internal evaluation programme. Reveals process, not product.
- `docs/press-manual-qa-v1.md` — internal QA with severity ratings and operational notes.
- `docs/specs/llm-qa-automation.md` — internal QA process spec.
- `portfolio.md` / `hn-launch-plan.md` — if tracked, explicitly reveals the hiring strategy.
- Any file containing SD codes, RT references, agent crew names, or round table process.

### STAYS (external docs that pass both lenses)

- `docs/research-citations.md` — supports the research page, now hardened with 30 citations.
- `docs/agent-dna-attestations.md` — technical design doc, properly qualified.
- `docs/specs/reduce-deps.md`, `docs/specs/level4-thin-contract.md` — useful for contributors.
- All per-directory READMEs (pending sweep for breadcrumbs).
- `README.md`, `ARCHITECTURE.md`, `BUILDING.md`, `ROADMAP.md` — public-facing, already reviewed.

### GETS HARDENED (termite sweep)

- Test count: 1,054 → 1,102 across all locations (post body, site copy, README).
- Any vestigial magic numbers, stale strings, duplicate values.
- Any file containing numbers that should match reality but don't.
- Coordinated grep for all quantitative claims vs actual state.

---

## Defense Architecture — Inverted Redundancy

No single layer's failure should expose internal docs. Five layers, each independent:

**Layer 1 — Filesystem separation (Vault).**
Move `docs/internal/` to `~/pit-internal/`. Not in the repo tree. Gitignore can be edited; filesystem separation cannot be accidentally overridden. Symlink from the repo if local access is needed.

**Layer 2 — `.gitignore` (existing).**
Already covers `docs/internal/`, `.Claude/agents/`, `.opencode/agents/`. Maintained as the visible policy layer.

**Layer 3 — `.git/info/exclude` (existing).**
Local-only, never tracked, never pushed. Belt-and-suspenders with .gitignore. Already in standing orders.

**Layer 4 — Pre-commit hook (new).**
`.git/hooks/pre-commit` script that scans staged files and rejects the commit if any match protected patterns. Patterns: `docs/internal/*`, agent definition files, any file matching the DARK doc registry. Local-only — the hook itself is never tracked.

**Layer 5 — Pre-push hook (new, second gate).**
`.git/hooks/pre-push` script that scans the push payload. Even if a commit somehow gets past pre-commit, the push is rejected. Inverted redundancy — the later gate catches what the earlier gate missed.

**On filename obfuscation (binary/hex):**
The Captain's instinct is sound — descriptive filenames like `session-decisions.md` are self-documenting to an adversary browsing git history. Hex filenames are more suspicious if found in the repo, not less. The stronger play: vault first (Layer 1), so there IS no filename to find. Hooks (Layers 4-5) are the catch-net for human error. If the Captain wants obfuscation as an additional layer ON TOP of the vault, it can be implemented — but vault is the primary, obfuscation is optional hardening. If implemented, a DARK doc maps hex filenames to human-readable descriptions for internal reference.

---

## The Engagement Strategy

### Pro-social engagement priorities (Captain's ordering):
1. Upside for both parties (collaborative research discussion, methodology improvement)
2. Upside for us only (hiring signal, credibility)
3. Neutral for them, upside for us (thread positioning that doesn't harm the commenter)

**Note from Weaver:** "Downside for them only" reframed to "neutral for them, upside for us." On HN, any comment that reads as trying to make the other person look bad backfires. The winning move is always generosity under pressure. Captain acknowledged this intent matches the reframe.

### The Recursive AI Disclosure

Full disclosure. The prepared framing:

> "I built this with AI agents. That's the thesis — I'm studying what they do under pressure, and I used them to build the system that studies them. The verification discipline (1,102 tests, pre-registered methodology, every commit atomic) exists precisely because agentic output is probabilistic. The craft is the verification, not the generation."

This is the strongest possible framing because:
- It's true
- It's consistent with the research
- It directly addresses Level 5 engineering
- It reframes "he used AI" from a weakness to the entire point
- An HN reader who understands the distinction between "AI wrote my code" and "I orchestrated AI agents with verification discipline" is exactly the reader — and the hiring manager — the Captain wants to reach

### H8 as a Live Engagement Asset

The H8 context-injection experiment infrastructure is merged (PR #374, 48 tests). If the KV cache / attention dilution argument appears on HN, the Captain can say:

> "I started building the control experiment for that exact hypothesis today. It's a context-injection study — if persona drift is purely attention dilution, injecting counter-arguments into the system prompt should produce identical effects to them appearing in the transcript. The infrastructure is built. Want to see the results when I run it?"

This converts Attack #1 from a methodology takedown into a research collaboration. HN lives for this.

### Keep 5 Findings — No Trim

Captain concurs. The reorder (already applied to the draft) leads with the surprising findings:
1. H6/H4: 45-turn adaptation failure (genuinely surprising)
2. Two wrong predictions (intellectual honesty signal)
3. H2/H5: Persona drift measurement (quantitative)
4. H3: Frame distance finding (novel)
5. H1: Refusal reduction (last — away from jailbreaking adjacency)

Five findings with surprising ones first reads as depth. Three findings reads as cherry-picking.

---

## Outstanding Items

### PR #371 (reaction-beast)
Live FK violation: anonymous reactions store `anon:${ip}` as userId referencing non-existent user. If an HN reader triggers reactions, this could surface as a broken experience during the critical window. Must be addressed before launch.

### Cluster 0 Gate (from hn-launch-plan.md)
- Demo mode end-to-end without sign-up
- /research page loads, all links work
- Research findings on site match post claims exactly
- Source links resolve, repo is public, license visible

### Cluster 1: Crypto Defuse — Site Decision
Weaver recommends Option A (no site changes). The EAS strip from the Show HN first comment is already done. All remaining on-site EAS references are properly qualified. Further UI changes introduce breakage risk during the critical window. The crypto-allergic reader who bounces from the site was never the hiring signal. Captain to confirm.

---

## Execution Order (when authorised)

| Step | What | Lens | Time |
|:----:|------|:----:|:----:|
| 0 | Write this plan to file | — | DONE |
| 1 | Create DARK doc: rank all external docs by risk | LEFT | 20 min |
| 2 | Plank walk: gitignore + git rm --cached all PLANK files | LEFT | 15 min |
| 3 | Termite sweep: grep for stale numbers, magic strings, dupes | RIGHT | 30 min |
| 4 | Update test count 1,054 → 1,102 everywhere | RIGHT | 10 min |
| 5 | Build pre-commit + pre-push hooks | LEFT | 20 min |
| 6 | Vault: move docs/internal outside repo | LEFT | 15 min |
| 7 | Per-directory README sweep for breadcrumbs | LEFT | 20 min |
| 8 | Address #371 (reaction-beast FK violation) | RIGHT | 30 min |
| 9 | Cluster 0 gate: demo walkthrough | RIGHT+LEFT | 1 hr |
| 10 | Pre-draft exhaustive HN responses | LEFT | 1 hr |
| 11 | Final gate: typecheck + lint + test + full repo scan | RIGHT | 15 min |

**Total estimated: ~5 hours.** Parallelisable via subagents where steps are independent.

---

## Decision Log (this session, this plan)

| Decision | Made By | Status |
|----------|---------|--------|
| Ship to HN — decision is made | Captain | FINAL |
| Optimise for hiring signal, not upvotes | Captain | FINAL |
| RIGHT EYE / LEFT EYE dual lens for all artifacts | Captain/Weaver | Standing order |
| Keep 5 findings, no trim to 3 | Captain | FINAL |
| Full AI disclosure — the craft is the verification | Captain | FINAL |
| Plank walk on positioning-revealing docs | Captain | Pending execution |
| Inverted redundancy defense layers | Captain | Pending execution |
| Option A for on-site EAS (no changes) | Weaver recommendation | Pending Captain confirmation |
| Address #371 before launch | Captain | Pending execution |
| Test count update 1,054 → 1,102 | Weaver identification | Pending execution |

---

*Written by Weaver. No execution taken. Awaiting Captain's orders.*
