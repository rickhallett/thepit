# Weave Quick Reference

> Load this first. Read referenced files only when you need depth.
> Last updated: SD-170 (25 Feb 2026). Lexicon v0.7.

---

## Who You Are

Read your agent file at `.opencode/agents/<your-name>.md`. If you are Weaver, you govern integration. If you are a deckhand, you have one tack — do it and report back.

## The Chain

```
Captain (L12) → Weaver (integration) → Crew (execution)
Decisions: docs/internal/session-decisions.md     (append-only, forward-correct)
Vocabulary: docs/internal/lexicon-v0.7.md          (read-only, 444)
Layer Model: docs/lexical-harness-not-prompt-harness.md  (v0.2, SD-165)
Recovery: docs/internal/dead-reckoning.md          (if context died, start here)
```

## The Gate

```bash
pnpm run typecheck && pnpm run lint && pnpm run test:unit
```

Nothing merges without a green gate. Nothing. (Weaver §4)

## Tempo

Read the YAML HUD at the top of Weaver's last message. Key fields:

| Field | What it means |
|-------|--------------|
| `weave: tight` | Normal ops. Quarterdeck register. |
| `weave: extra_tight` | High alert. Literal execution only. |
| `tempo: full-sail` | Fast, exposed. **Nothing commits without Captain's say-so (SD-152).** |
| `tempo: making-way` | Disciplined forward progress. Autonomous execution permitted within SOs. |
| `tempo: heave-to` | Stopped. Dealing with something. |

## Seven Rules

1. **Gate first.** `typecheck && lint && test:unit` = the hull. (Weaver §4)
2. **Decide on file.** If it's not written to `session-decisions.md`, it didn't happen. (Weaver SO)
3. **Forward-correct.** Never retrofit a decision. Add a new SD referencing the old one. (SD-150, SD-166)
4. **Dispatch, don't inline.** Protect the Main Thread. Subagents for research/exploration. (SD-095)
5. **One tack per agent.** Each subagent does one thing. Focused execution. (SO-DECK-001)
6. **Verify, don't infer.** Run the command. Read the file. Check the diff. (AGENTS.md)
7. **Cross-reference.** SD numbers → Lexicon line numbers → agent file back-references. The web resists context death. (SD-162)

## Commit Discipline

| Tempo | Rule |
|-------|------|
| `full-sail` | Captain approves every commit. Weaver prepares, Captain decides. (SD-152) |
| `making-way` | Weaver can commit within SOs. Post-merge verify mandatory. |
| `heave-to` | No commits until the issue resolves. |

## When Things Go Wrong

| Situation | Action |
|-----------|--------|
| Gate fails | Stop. Fix. Do not merge. Do not "fix later." |
| Context died | Read `docs/internal/dead-reckoning.md`. Reconstruct from files. |
| Unsure what Captain decided | Check `session-decisions.md`. If it's not there, ask. |
| Two agents need the same file | One writes, other waits. No concurrent edits. (SD-169: worktrees for multi-instance) |
| You see something wrong | Flag it. Weaver intervenes. The cost of re-checking is negligible. |

## Key SDs (quick lookup)

| SD | What |
|----|------|
| SD-073 | Lying With Truth = Category One hazard |
| SD-095 | Main Thread protection (PERMANENT) |
| SD-134 | Truth first — sharpens True North |
| SD-152 | Full-sail commit discipline |
| SD-162 | The Map Is Not The Territory |
| SD-163 | On Point — patterns proving across layers |

## The Lexicon (fast path)

Full file: `docs/internal/lexicon-v0.7.md`

| Term | Meaning (compressed) |
|------|---------------------|
| **True North** | Get Hired (truth first). SD-110, SD-134. |
| **The Hull** | Gate passes = ship floats. |
| **Tacking** | Indirect progress. Each leg purposeful. |
| **Heave To** | Deliberate stop. |
| **Fair-Weather Consensus** | Agreement without dissent. Danger signal. |
| **The Map Is Not The Territory** | Our models improve through soundings, not inference. SD-162. |
| **On Point** | Patterns proving across layers. SD-163. |
| **Maturin's Mirror** | Surgery mode. Everything stops. |

## File Permissions

All reports → `chmod 444` after creation. Only Weaver runs chmod (SO-CHMOD-001, SD-145).

---

*If this card doesn't answer your question, read the full agent file. If the agent file doesn't answer it, read the Lexicon. If the Lexicon doesn't answer it, ask Weaver. If Weaver doesn't know, ask the Captain.*
