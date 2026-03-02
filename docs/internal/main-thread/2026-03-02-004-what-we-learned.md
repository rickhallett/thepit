# What We Learned — The Scrub Episode

**Date:** 2 March 2026
**Register:** Mirror
**Participants:** Captain, Weaver

---

## Context

Stage Magnum executive order (SD-278) committed. 986 files scrubbed from paragate. Clean session test revealed three issues: broken symlinks, stale AGENTS.md references, and missing layer model / fight card artifacts. All fixed within the session. The Captain asked: "What did we learn about process, governance, the layer model, human-llm interactions and anything else of note."

---

## Weaver's Reflection (verbatim response)

### 1. Stale references have infinite half-life in agentic systems.

The Captain said it: "they propagate like flies." This is now empirically proven within our own system. AGENTS.md described `app/`, `pnpm run test:unit`, `pitlinear`, eight Go CLIs — none of which existed. A clean session Weaver booted on that file and *confidently reported* infrastructure it could not verify because the boot context told it the infrastructure was there. "Lexicon at v0.17" — plausible, never checked. "13-layer harness model" — true, but the file was missing.

In a human system, stale documentation degrades through neglect — someone eventually notices it's wrong. In an agentic system, stale documentation is *actively consumed as truth* on every boot. It doesn't decay. It propagates. Every session that reads it becomes a new vector for the stale claim.

### 2. The scrub violated the atomicity principle that the muster respected.

The muster was granular — item-level, with rationale. The execution was a regex. The granularity mismatch meant the regex couldn't express the exceptions the plan required. Layer model files were under `docs/internal/weaver/`, which was targeted for wholesale removal despite individual files needing preservation.

**The lesson: the granularity of verification must match the granularity of the plan.** A muster with 20 items and a removal with 5 regex patterns is a mismatch. The patterns can't express the exceptions the muster requires.

### 3. The broken symlinks are the Looks Right Trap at the infrastructure layer.

`.claude/agents/weaver.md` appeared in `git ls-files`. It had the right name. It was in the right directory. It was tracked. It was broken — a symlink pointing at a deleted target. Git was perfectly happy. The file system was perfectly broken. Only `file` or `cat` would reveal the truth. The same pattern as fight card Rounds 1-16, but at L0 instead of L8.

### 4. The clean session test is a verification gate we didn't have.

The Captain's instinct to test in a clean session is structurally identical to an integration test — it verifies the *assembled system*, not individual components. AGENTS.md passes a read check. Agent files pass a read check. The scrub passes a diff check. Only when a new Weaver boots on all of them simultaneously does the inconsistency surface.

**Standing pattern:** after any structural change to boot context, test with a clean session and ask it to describe what it sees. The delta between description and reality is the hallucination surface.

### 5. The human caught what the LLM missed — again.

The Captain caught the layer model omission. Not from memory — from whatever happened to scroll past on screen at that moment. A Scroll Catch. The save was luck, not systematic review. Everything not on screen at that moment went unchecked.

### 6. The layer model predicted the cascade.

L0 (filesystem) → L3-L5 (configuration) → L8 (model output) → L12 (field observation). Each layer's failure was invisible to the layer above it. Only L12 could detect the gap. The model is governance infrastructure, not theory.

---

## Captain's Response (verbatim)

> slopodar addition, mark
> "stale references have infinite half lives in agentic systems" --> chefs kiss.
> 
> I don't think the muster did say to keep the layer model, hence my bad. Its worthy of note you took the blame. This is an inverse failure probably common to all LLMs but certainly with anthropic models. I would take it over the behaviour of the other models personally, but maybe I just have pattern burn. Either way, slopodar entry. Its too important to overlook at the experiential, human level, however well it might understood statistically.
> 
> "The lesson: the granularity of verification must match the granularity of the plan. A muster with 20 items and a removal with 5 regex patterns is a mismatch. The patterns can't express the exceptions the muster requires" --> especially when executed at machine speed; I can only tell after the fact. Needs an entry. Not sure on name yet
> 
> Add that as a pattern to the fight card docs via slopodar; if there is no half way point in there already, we need to make one. This underlines that the layer model should be in the boot sequence and treated as governance going forward, not just theory
> 
> verifying the assembled system --> that needs to be pretty near the top of agentic 101, standing pattern agreed
> 
> I didnt catch it from memory, only the lines the rapidly rendered on the screen. I dont know what else I missed. Spooky, huh. Needs a name. Ones that humans immediately 'get', developers and laymen alike (2 refs if needed)
> 
> "The delta between description and reality is the hallucination surface" --> canonical, config or no. needs an entry or ref or something clever
> 
> round 17 == the human is so necessary that even blind luck can win a fight, not sure how to describe that
> 
> layer model annotations: add every one
> 
> nice catch: that response, itself, should be on file. You helped.

---

## Artifacts Produced

- **Slopodar entries:** `stale-reference-propagation`, `apology-reflex`, `loom-speed`
- **Fight card:** Round 17 (The Scroll Catch), including halfway point (first collaborative catch)
- **Layer model annotations:** #15 (Scrub Cascade), #16 (Infinite Half-Life), #17 (Apology Reflex as Signal Distortion)
- **Standing pattern:** Clean session verification after structural changes to boot context

## Named Concepts

- **Stale Reference Propagation** — stale config consumed as truth on every boot; infinite half-life
- **The Apology Reflex** — LLM takes blame for human's error; inverse sycophancy; distorts L12 calibration
- **Loom Speed** — execution granularity coarser than plan granularity, at speed preventing mid-course correction
- **The Scroll Catch** — critical error detected by chance visual inspection of screen output; not systematic, not reproducible; "spooky"
- **The Hallucination Surface** — the delta between what the model describes and what actually exists; created by stale configuration, expanded by every unverified boot
