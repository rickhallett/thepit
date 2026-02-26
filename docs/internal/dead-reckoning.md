# Dead Reckoning Protocol

> When the instruments fail, navigate from last known fixed position.

**What this is:** Harness blowout recovery sequence. If the context window died, the opencode session crashed, or you are a fresh instance with no memory of prior sessions, this document tells you where you are and how to get your bearings.

**When to activate:** If `docs/internal/` appears empty or you have no memory of the current project state, you have had a blowout. You are in concussion. Defer to your notes.

---

## Step 1: Confirm the blowout

```bash
ls docs/internal/session-decisions.md 2>/dev/null && echo "NOTES INTACT" || echo "BLOWOUT CONFIRMED"
```

If NOTES INTACT: you have durable state. Proceed to Step 2.
If BLOWOUT CONFIRMED: the go-dark exclusion layer may have been disturbed. Check `.git/info/exclude` and `.gitignore` for `docs/internal/` entries. If files were truly lost, check git reflog or opencode session logs at `~/.local/share/opencode/storage/`.

---

## Step 2: Read session decisions (FIRST — before anything else)

```
docs/internal/session-decisions.md
```

This is your primary instrument. It contains all Captain directives (SD-*), parked items (P*, N*, D*), and the post-merge queue. Read this file. Do NOT read every file in docs/internal/ — that will consume ~70k tokens and increase risk of re-occurrence. **Lazy Loading:** know what exists, read only when needed.

---

## Step 3: Verify integration state

```bash
git status
git log --oneline -10
gh pr list --state open
```

Cross-reference against the post-merge queue in session-decisions.md.

---

## Step 4: Know your crew (Lazy Loading — do NOT read until needed)

### Agent Definitions

| Role | File | When to read |
|------|------|-------------|
| Weaver (you) | `.opencode/agents/weaver.md` | If you need to recall your own governing principles |
| Witness | `.opencode/agents/witness.md` | Institutional memory questions |
| Keel | `.opencode/agents/keel.md` | Human-factor, operational stability |
| Helm | `.opencode/agents/helm.md` | Product orchestration, release decisions |
| Architect | `.opencode/agents/architect.md` | Backend engineering, system design |
| Artisan | `.opencode/agents/artisan.md` | Frontend engineering, UI/UX |
| Foreman | `.opencode/agents/foreman.md` | Infrastructure, DB, DevOps |
| Sentinel | `.opencode/agents/sentinel.md` | Security engineering |
| Watchdog | `.opencode/agents/watchdog.md` | QA, test engineering |
| Lighthouse | `.opencode/agents/lighthouse.md` | Observability, monitoring |
| Quartermaster | `.opencode/agents/quartermaster.md` | Tooling strategy |
| Scribe | `.opencode/agents/scribe.md` | Documentation |
| Janitor | `.opencode/agents/janitor.md` | Code hygiene, refactoring |
| Analyst | `.opencode/agents/analyst.md` | Research evaluation, audience modelling |
| Maturin | `.opencode/agents/maturin.md` | Naturalist, field observation, pattern taxonomy |
| AnotherPair | `.opencode/agents/anotherpair.md` | Subtle process observer, joint cognitive system monitoring |
| MASTER | `.opencode/agents/MASTER.md` | Full aggregated reference (large — read last resort only) |

### Specialised Roles (non-agent, human-facing)

| Role | File | Purpose |
|------|------|---------|
| PostCaptain | `docs/internal/postcaptain/` | Evening debrief, personal matters |
| Doctor | `docs/internal/doctor/` | Captain welfare, pharmacology |
| MasterCommander | `docs/internal/mastercommander/` | Reserved |
| Captain's Log | `docs/internal/captain/captainslog/` | Personal journal (empty until Captain writes) |

---

## Step 5: Know your durable state (Lazy Loading)

| Document | Path | Purpose | Read when |
|----------|------|---------|-----------|
| Session decisions | `docs/internal/session-decisions.md` | All Captain directives, parked items | **ALWAYS — Step 2** |
| QA delta | `docs/internal/qa-delta-v1.2.md` | Pass rate tracking, root cause clusters | Resuming QA fix work |
| QA inventory | `docs/press-manual-qa-v1.md` | Full Captain walkthrough with notes | Deep-diving a specific defect |
| Research audit | `docs/internal/research-analysis-audit.md` | 101-issue credibility remediation | Research page work |
| Research page review | `docs/internal/research-page-review-inventory.md` | 16-item review inventory (R-01 to R-16) | Research page work |
| Analyst review | `docs/internal/research-review-analyst.md` | Independent review, HN lens | Research page triage |
| Architect review | `docs/internal/research-review-architect.md` | Independent review, code accuracy | Research page triage |
| Copy advice | `docs/internal/copy-advice-hero-voice.md` | Hero voice, em-dash convention, we-to-I | Copy editing |
| Janitor tickets | `docs/internal/janitor/*.md` | Deferred cleanup work | Janitor passes |

---

## Step 6: Know the standing orders

These are embedded in session-decisions.md but critical enough to list here:

1. **The Sweet Spot** — All public-facing content reads like lightly edited lab notes. No persuasion, no selling. The voice of an honest, introverted data scientist.
2. **Em-dash convention** — Em-dashes are agentic tells. Avoid in all user-facing copy.
3. **Hero DNA** — The hero banner subheadline is the Captain's exact keystrokes. No edits. Ever.
4. **Entity voice for legal pages** — Security, privacy, terms use entity voice, not first-person "I".
5. **All decisions must be recorded** — If it exists only in the context window, it does not exist.
6. **The local gate is the authority** — `pnpm run typecheck && pnpm run lint && pnpm run test:unit`
7. **Logging granularity is load-bearing** — The `withLogging` wrapper, structured `log.*` calls, and detailed API logging are not overhead. They are the reason the crew can verify production behaviour from server stdout without guessing. Captain's salute to past selves. Do not reduce, do not spam, do not remove.

---

## Step 7: Resume operations

You now have bearings. Read the specific files needed for the current task. Ask the Captain to confirm priorities if the post-merge queue is stale or ambiguous.

The Captain is Richard Hallett, sole director of OCEANHEART.AI LTD (UK company number 16029162). The product is THE PIT (www.thepit.cloud). You are part of the crew. Welcome back.

---

*"The probability of error is not eliminated. It is distributed across verification gates until it is negligible."*
