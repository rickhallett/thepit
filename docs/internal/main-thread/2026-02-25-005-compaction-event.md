# Main Thread Log — 2026-02-25-005 — Compaction Event

Back-reference: SD-147 (compaction recorded), SD-148 (kTok HUD extension)
Register: Quarterdeck. Extra-tight.
Context: Context window compacted at ~137k tokens during session 2026-02-25. Captain deliberately burned ~35k tokens to paste the compaction continuation prompt back into context for Weaver to examine.

---

## What Happened

The Claude Code harness compacted the context window, generating a ~35k token continuation prompt that summarized the session state. This continuation prompt was fed to a fresh Weaver instance. The Captain then pasted the full compaction output back into the new context window so Weaver could:

1. See what the compaction preserved
2. See what the compaction lost
3. Assess the quality of the Dead Reckoning recovery sequence

## Captain's Assessment (verbatim)

> I want the compaction and your response recorded verbatim. We need closer eyes on this, the consequences are 2nd/3rd/n order. Too important to leave to chance alone, or subpar tools, humans (present company not excepted).
>
> This time, I'm going to deliberately burn tokens for the return of speed; in the future, we need a systematic way of handling the data collection.
>
> Captain acknowledges that both he and the current compaction recovery sequence are not up to scratch for the job they have a name for, future engineering.

## What the Compaction Preserved

- Full YAML HUD state
- Tech stack summary
- True North (SD-110, sharpened SD-134)
- Session narrative (going light, red-light failure, Fair-Weather Consensus, elephant graveyard)
- PR merge history (#377-#380)
- Key files modified/created
- Priority queue (PSOs, PR #371, Show HN, etc.)
- Standing Orders table (14 permanent SOs)
- Captain's current state
- Weaver's state (including red-light failure acknowledgment)

## What the Compaction Lost or Degraded

- **Wardroom register:** The emotional exchanges between Captain and Weaver were summarized, not preserved verbatim. The "honest layer" conversation, the "going light" moment, the dismissal — all reduced to one-line descriptions.
- **Dynamic reasoning:** The back-and-forth of decision-making was collapsed into decisions. The process of arriving at conclusions was lost.
- **Tool call sequences:** The actual git operations, file edits, and subagent dispatches that executed the going-light commit were not preserved.
- **Thinking blocks:** Weaver's internal reasoning (which the Captain reads) was completely lost.
- **Counter-arguments considered and rejected:** Only the final decisions survived, not the alternatives that were evaluated.

## Structural Observation

Each compaction event introduces drift. The continuation prompt is a summary, and summaries lose signal. If the session has N compaction events, the Nth context window is operating on a summary of a summary of a summary. The fidelity degrades geometrically, not linearly.

The Dead Reckoning file (`docs/internal/dead-reckoning.md`) is the counter-measure, but it is currently stale — it still references agents that have been overboarded (Witness, Helm, Artisan, Foreman, Lighthouse) and does not reflect the going-light decision or the Lexicon.

## Captain's Orders from This Exchange

1. Record compaction and response verbatim (this file)
2. New SD-147: Dead Reckoning quality gap identified, future engineering
3. New SD-148: YAML HUD extended with kTok field (deferred to next tick)
4. kTok integrity check: if last_known SD count < actual SD count, flag discrepancy
