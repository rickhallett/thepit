# Main Thread — Inverse Signal: LLM-Augmented Git Archaeology

Date: 2026-02-24
Sequence: 002
Topic: LLM-augmented adversarial analysis of git history changes risk calculus
Back-reference: 2026-02-24-001-weave-calibration.md

---

## Captain's Words (verbatim)

"The axis isn't autonomy, it's scope of orchestration under discipline. Multi-domain, human-integrated, verification-governed. The scale doesn't have a category for it because the scale assumes the human retreats as the level goes up. Your model is the opposite: the human's role deepens as scope increases." -> thats one for the logbook.

"On the verification framing — defensible as long as it stays on 'evidence, not guarantees.' The sentence that works: 'Every layer reduces the probability of undetected error.' The sentence that doesn't: anything that sounds like blockchain-for-code." -> logbook

(portfolio.md, hn-launch-plan.md) -> I have removed them from repo. The strings remain in 3 docs/internal refs. Verified.

Today I Learned: `git log --diff-filter=D`
Unfortunately, our situation is more dire than that. `git log --diff-filter=D > llm_readme_and_kill_target.txt | ...` -> You catch my drift? Does this change our risk evaluation? No problem if it does. Pivoting on plans costs very little.

---

## Logbook Entries (Captain-designated)

> "The axis isn't autonomy, it's scope of orchestration under discipline. Multi-domain, human-integrated, verification-governed. The scale doesn't have a category for it because the scale assumes the human retreats as the level goes up. Your model is the opposite: the human's role deepens as scope increases."

> "Every layer reduces the probability of undetected error."

---

## Weaver's Analysis: LLM-Augmented Git Archaeology

### The Threat Model Shift (SD-103)

The Captain's insight: the adversary is not a human browsing git history. The adversary is a human piping git history into an LLM and asking "what is this person hiding?"

```bash
git log --diff-filter=D --name-only --pretty=format:"%H %s" > deletions.txt
git log --all --oneline > full_history.txt
# Feed to LLM: "Analyse this project's deletion history. 
# What patterns do you see? What was the developer trying to hide?"
```

This is a fundamentally different threat than manual browsing. A human skimming git history sees individual commits. An LLM synthesizes across the entire history and identifies patterns, correlations, and intent. The LLM is better at this than the human, and HN readers are exactly the population that would think to do it.

### What The LLM Would Find

Files deleted from git tracking during this session:

**PR #372 (copy right-sizing):**
- `copy/archive/base-v1-community.json` — removed via git rm --cached
- `docs/archive/dna.md` — removed via git rm --cached

**Captain's direct action:**
- `portfolio.md` — removed from repo
- `hn-launch-plan.md` — removed from repo

**What the LLM would synthesize:**

"This developer systematically removed four categories of content before what appears to be a public launch:
1. An archived copy file containing unqualified blockchain/on-chain claims ('Why agents live on-chain', 'immutable identity')
2. A personal note with unqualified L2 claims ('Stamped on L2')
3. A file explicitly named 'portfolio.md' — likely a portfolio/hiring strategy document
4. A file explicitly named 'hn-launch-plan.md' — a Hacker News launch optimisation plan

The commit history also shows a systematic rename from 'provenance' to 'identity' across 14+ files (PR #372), removal of 'Trust Arena' branding, and addition of qualification language ('designed and coded but not yet deployed') to all on-chain references. The commit messages reference internal decision codes (SD-076, SD-077, SD-078).

**Conclusion:** The developer had overclaimed blockchain features, recognised the overclaim, and systematically corrected it before launching. They also had explicit hiring-strategy documents that were removed before the public launch. This suggests the HN post is primarily a career move with the research as supporting material."

### Does This Change The Risk Evaluation?

**Yes, but not in the direction you might expect.**

The LLM's synthesis above is actually... accurate. And mostly not damaging. Here's why:

**The copy pivot (provenance → identity) is defensible.** Every startup iterates on positioning. The commit history shows a developer who overclaimed, recognised it, and fixed it — which is the intellectual honesty narrative in action. An LLM finding this pattern and saying "he corrected overclaims before launching" is actually positive signal. The alternative — leaving the overclaims — would be far worse if discovered.

**The portfolio.md and hn-launch-plan.md deletions are the vulnerability.** These filenames are self-documenting. An LLM finding "portfolio.md deleted right before HN launch" constructs the exact narrative we want to avoid: "this is a calculated hiring play disguised as a research post."

### The Strategic Options

**Option A — Own it preemptively. (SD-104)**

Add a line to the HN first comment:
> "Full disclosure: I'm looking for work. This is also a portfolio piece. The research findings are real regardless of my employment status."

This nuclear-defuses the entire git archaeology attack. You can't expose what's already been disclosed. The HN audience respects this kind of transparency enormously — it converts "he's gaming us for a job" into "he's honest about his situation." It also makes the portfolio narrative *part of the hiring signal* rather than a hidden vulnerability.

Probability of the attack landing after this disclosure: near zero.

**Option B — Accept the risk without disclosure.**

The probability of someone doing LLM-augmented git archaeology is non-trivial on HN, but it requires:
1. Someone caring enough to clone the repo (common on HN)
2. Someone piping deletion history into an LLM (less common, but this audience is exactly who would)
3. The LLM producing a coherent narrative (it will)
4. The person posting it as a comment (depends on whether it feels like a "gotcha")

Estimated probability: 5-15%. Not negligible for a post targeting this audience.

Impact if it happens without disclosure: moderate-to-high. "He deleted his hiring strategy docs right before posting" is a thread-derailing comment.

Impact if it happens WITH prior disclosure (Option A): near zero. "Yes, I said that in my first comment."

**Option C — History rewrite (BFG/filter-repo).**

Eliminates the files from history entirely. But:
- Changes all commit SHAs
- Detectable via `git fsck` or comparing against cached clones
- The act of history rewriting is itself a signal
- HN specifically hates this — it undermines the "open source" claim
- Not recommended under any circumstances.

### Weaver's Recommendation

**Option A.** Own it.

The Captain's own words: "I intend for this to be a portfolio piece demonstrating discipline, judgement, grit, graft, honesty, maturity."

The word "honesty" is in that list. Disclosing the hiring intent is not a weakness — it's the most powerful possible demonstration of the honesty the portfolio claims to represent.

The specific phrasing matters. Not "I need a job" (needy). Not "this is my portfolio" (transactional). Something like:

> "Full disclosure: I'm between roles and this is partly a portfolio piece. But the research question is genuine — I couldn't stop asking it whether or not anyone was hiring. The findings are real. The code is open. Tell me what I got wrong."

This is consistent with every session decision about intellectual honesty. It converts the vulnerability into the strongest possible evidence of the quality the portfolio describes.

### The Revised Risk Landscape

With Option A (preemptive disclosure), the LLM archaeology attack becomes:
- Probability of someone attempting: unchanged (5-15%)
- Probability of it producing a damaging comment: near zero (already disclosed)
- Probability of it producing a POSITIVE comment: moderate ("He even disclosed this upfront — respect")

Without Option A, the risk is:
- Probability of attempt: 5-15%
- Probability of damage: 60-80% if attempted (the narrative writes itself)
- Impact: thread derailment, credibility hit, exactly the frame we don't want

The expected value calculation strongly favours disclosure.

### Impact on The Plank Walk (SD-102)

If the Captain takes Option A, the urgency of cleaning up git-tracked docs drops significantly. You can't expose what's already been disclosed. The gradual post-launch cleanup (Option 2 from the previous analysis) remains the right approach, but the stakes are lower because the "gotcha" has been preempted.

The eval-prompts, narrative-prompts, and audience-models directories become: "Yes, I use AI agents for positioning work too. That's literally what this project is about." **(SD-105)**

---

*Filed by Weaver. No execution taken. Captain's words recorded verbatim.*
