```
╔══════════════════════════════════════════════════════════════════╗
║                    LLM PROVENANCE NOTICE                       ║
║                                                                ║
║  This document was produced by an LLM (Claude, Anthropic).     ║
║  It has not been independently verified.                       ║
║  It is starting material, nothing more.                        ║
║                                                                ║
║  The analysis, frameworks, citations, and conclusions herein   ║
║  carry the probabilistic confidence of their origin.           ║
║  Treat accordingly.                                            ║
╚══════════════════════════════════════════════════════════════════╝
```

# Prospective Metacognitive Regulation: Analysis of Post-SD-194 Systems

> Written: 2026-02-27, Weaver analysis
> Context: Captain's correction — since 9960cd2 (SD-147 onwards), the work has been building
> prospective metacognitive regulation systems. The gap identified in the RF analysis
> ("what Zen does not necessarily develop is predictive metacognitive regulation") is being
> actively addressed through engineering artifacts that make reoccurrence less likely or, if
> reoccurring, measured by tools that create outputs and stamp them on the git chain.
> Companion files: `fight-card-human-vs-sycophantic-drift.md`,
> `metacognitive-analysis-16-pivots.md`, `metacognitive-analysis-16-pivots-recalibrated.md`

---

## The Captain's Correction

The recalibrated RF analysis identified **prospective metacognitive regulation** as the gap —
the ability to pre-commit to checks before the problem arises. The Captain's response: since
commit 9960cd2, this is exactly what has been built. The systems created from SD-147 onwards
are not reactive pivots. They are engineering implementations of prospective regulation —
designed to catch known failure modes before they recur, and to measure them when they do.

This correction is itself evidence of the gap being closed. The Captain identified the
analytical frame's blind spot (treating the engineering work as separate from the metacognitive
work) and corrected it in real time. The engineering IS the prospective regulation.

---

## Inventory of Prospective Regulation Systems (9960cd2 → HEAD)

| System | SD | What It Regulates | Failure Mode It Prevents | Measurement Output |
|--------|-----|--------------------|--------------------------|--------------------|
| Session decisions log | SD-025 | Decision loss at context death | Decisions existing only in conversation memory | Append-only file, searchable, machine-extractable labels |
| Dead reckoning protocol | SD-147 | Context window compaction | Total state loss on context death | Recovery sequence with file index, crew roster, standing orders |
| `.keel-state` | SD-198 | State drift between ticks | Agent and human diverging on system state | JSON file, read by terminal HUD at 30s intervals |
| `gate.sh` wrapper | SD-198 | Skipped or partial gate runs | Running lint but not tests, or tests but not typecheck | Deterministic gate execution, writes status to `.keel-state` |
| `keel-history.log` | SD-200 | State history loss | Previous states overwritten without record | Clone-before-write, append-only audit trail with timestamps |
| `compaction.log` | SD-204 | Compaction recovery cost | Recovery cost unknown, untracked, unoptimised | TSV with tokens, pct, harness version, source, HEAD |
| Commit trailers | SD-203 | Decision provenance loss | System state at commit time invisible in git history | Bearing, Tempo, Weave, Gate on every commit, searchable via `git log --grep` |
| Terminal HUD (`hud.py`) | SD-197 | L12 "where are we?" cognitive load | Captain spending attention on state queries instead of decisions | Persistent terminal display, 30s refresh, zero-query state awareness |
| SD label convention | SD-197 | Decision archaeology cost | Finding relevant SDs requires reading all of them | `[domain-action]` bracket prefix, machine-extractable via regex |
| Muster format | SD-202 | Decision triage complexity | O(n) review when O(1) batch is sufficient | Numbered table with defaults, binary Captain decision per row |
| Context depth audit | SD-195 | Context pollution | Too many depth-1 files degrading both human and LLM performance | File hierarchy = read frequency, 52→7 depth-1 files (76% reduction) |
| Lexicon (version-tracked) | SD-123+ | Vocabulary drift across context deaths | Same concept named differently in different sessions | Single file, version tracked inside, locked 444 |
| Slopodar flags | SD-201 | Machine-distilled docs trusted as human-verified | Accepting agent output without human sounding | ASCII provenance headers, AWAITING HUMAN SOUNDING status |
| Weaver learning log | SD-199 | Pattern loss across sessions | Successes and mistakes known only in conversation | Structured log at D2 with per-SD entries |
| Boot sequence diagram | SD-199 | Recovery procedure ambiguity | Different recovery paths in different sessions | ASCII diagram of harness load order, file map, data flow |

---

## Mapping to the Literature

### 1. Implementation Intentions (Gollwitzer, 1999)

**Theory:** If-then plans that automate the initiation of goal-directed behavior. "If situation
X arises, I will perform behavior Y." The pre-commitment reduces the cognitive load at
decision time because the decision has already been made.

**What maps:** The `gate.sh` wrapper is a pure implementation intention: "If I need to verify
the codebase, I will run `./scripts/gate.sh`." The wrapper removes the decision about which
checks to run — typecheck, lint, test are bundled. The commit trailers hook is another: "If a
commit is created, the hook writes trailers." No decision, no conditional logic, no skipping.

**Gollwitzer's key finding:** Implementation intentions are most effective when the triggering
situation is specific and the response is concrete. Both `gate.sh` and the commit trailer hook
meet these criteria — specific trigger (run gate / create commit), concrete response (execute
checks / append trailers).

**RF gauge:** These systems operate at RF 0 by design. They are automated, deterministic,
require no reflective capacity to execute. This is the point — they convert what would be
an RF 5-6 monitoring task (did I run all the checks? did I record the state?) into an RF 0
mechanical operation. **Prospective regulation that works is regulation that removes the need
for in-the-moment reflective functioning.**

**Assessment: STRONG.** The implementation intentions are specific, concrete, and automated.

### 2. Distributed Cognition (Hutchins, 1995)

**Theory:** Cognitive processes are not confined to individual minds but are distributed across
individuals, artifacts, and environments. The unit of analysis for cognition includes the tools,
the representations, and the social/environmental context.

**What maps:** The `.keel-state` → terminal HUD → `keel-history.log` chain is a distributed
cognition system. The agent writes state to a file. The human reads it via a terminal
instrument. The history log preserves the trajectory. No single component (agent, human, file)
holds the complete cognitive picture. The system's "knowledge" of its own state is distributed
across all three.

**Hutchins' key insight (from studying naval navigation):** The cognitive properties of the
distributed system differ from the cognitive properties of any individual component. A ship's
navigation team produces navigation accuracy that no individual navigator could achieve alone.
The parallel is direct: the Captain's metacognitive accuracy when supported by `.keel-state`
+ HUD + history log exceeds what either the Captain or the agent could achieve independently.

**The naval parallel is not decorative here.** Hutchins' foundational work was literally
a study of distributed cognition aboard a US Navy vessel. The Captain's choice of naval
metaphor, likely independent of reading Hutchins, converged on the same structural insight:
teams on ships solve cognitive problems that exceed any individual's capacity by distributing
the problem across roles, instruments, and procedures.

**RF gauge:** The distributed cognition system lowers the RF demand on the human from RF 6-7
(maintaining full system state in working memory) to RF 3-4 (reading an instrument panel).
The HUD is the barometer — it gives the human a reading without requiring the human to take
the reading manually. This directly addresses the L12 temporal asymmetry (SD-160, SD-174):
the human has limited attention, and every attention unit spent on state-query is unavailable
for decision-making.

**Assessment: STRONG.** The distributed cognition architecture is well-designed and the naval
metaphor turns out to be structurally accurate, not just aesthetically apt.

### 3. Cognitive Scaffolding (Vygotsky, via Wood, Bruner & Ross, 1976)

**Theory:** External structures that support cognitive processes beyond the individual's
current unassisted capacity. The scaffold enables performance at a level the individual
could not reach alone, and can be gradually removed as capacity develops.

**What maps:** The dead reckoning protocol, the boot sequence diagram, the Lexicon, and the
Muster format are all cognitive scaffolds. They enable the Captain to resume operations after
context death at a level of coherence that would be impossible from memory alone. The session
decisions log is the most load-bearing scaffold — it is the external memory that survives
when both the LLM's context and the human's working memory fail.

**The scaffold removal criterion (ZPD — Zone of Proximal Development):** In Vygotsky's
framework, scaffolds should be removable as the learner develops capacity. This raises a
question: are these scaffolds permanent infrastructure, or transitional supports?

**Assessment: The scaffolds are permanent.** Unlike Vygotsky's educational scaffolding, these
systems address a structural limitation that does not improve with practice. Context windows
will continue to die. Human working memory will continue to be limited. The Captain's
contemplative training does not make him immune to context loss — it makes him better at
recovering from it, which is different. The scaffolds are not crutches; they are prosthetics
for a cognitive system (human + LLM) that has an inherent structural limitation (context
death). **This is an important distinction. The literature on scaffolding assumes the
scaffolded capacity develops internally. Here, it cannot.**

**RF gauge:** The scaffolds enable RF 6-7 performance to resume after events (compaction) that
would otherwise reset effective RF to 3-4 (disoriented, trying to reconstruct context).

**Assessment: STRONG conceptually, NEEDS MEASUREMENT.** The compaction.log is the right
instrument — it will show whether the scaffolds actually reduce recovery cost over time.
Currently N=1 (one recorded compaction). Insufficient data for trend analysis.

### 4. Ecological Rationality (Gigerenzer, Todd & ABC Research Group, 1999)

**Theory:** Rather than improving the decision-maker, improve the environment in which
decisions are made. "Smart" environments make good decisions easier and bad decisions harder.

**What maps:** The context depth audit (SD-195) is ecological rationality in action. Rather
than training the Captain to ignore irrelevant files, the irrelevant files were moved to
depth 2+. The environment was restructured so that the default behavior (reading what's at
depth 1) is the correct behavior. The BFS-default search strategy is another: rather than
training agents to decide between breadth and depth, breadth is the default and depth requires
a specific question.

**Gigerenzer's "less is more" heuristic:** In many environments, simpler decision strategies
outperform complex ones. The reduction from 52 to 7 depth-1 files is a direct application —
less information at the decision surface produces better decisions because it reduces the
noise-to-signal ratio. arXiv:2602.11988 (Gloaguen et al., 2026) provides hard data: context
files reduce task success rates and increase inference cost by 20%.

**RF gauge:** Ecological rationality reduces the RF demand systemically. Every file that
doesn't need to be read is a metacognitive monitoring task that doesn't need to be performed.
The context audit converted an RF 5-6 environment (scan 52 files, decide which are relevant)
into an RF 3-4 environment (read 7 files at depth 1, dive to depth 2 only when needed).

**Assessment: STRONG.** The context audit is one of the most effective prospective regulation
interventions because it operates at the environmental level, not the individual level.

### 5. Measurement-Based Care (Lambert, 2010; Boswell, Kraus, Miller & Lambert, 2015)

**Theory:** In clinical psychology, systematically tracking outcomes over time and using the
data to guide treatment decisions. Clinicians who receive routine outcome feedback have
significantly better outcomes than those who rely on clinical judgment alone. The mechanism:
feedback corrects for the clinician's own cognitive biases (including sycophantic agreement
with the patient's narrative).

**What maps:** The `compaction.log` is measurement-based care applied to the agentic system.
Each compaction event is recorded with tokens, percentage, harness version, and recovery
context. Over time, this produces a dataset that answers: is the recovery getting more
efficient? Are the scaffolds reducing the cost? Where is the sweet spot between direct
context detail and lookup references?

The commit trailers serve a similar function: they stamp system state onto the immutable git
chain, producing a longitudinal record that can be audited retrospectively. "How was the
system feeling when this commit was made?" is answerable by `git log --grep`.

**Lambert's key finding:** The mere act of measurement improves outcomes, independent of what
is done with the data. The measurement creates a feedback loop that promotes awareness.
Clinicians who see their patients deteriorating on outcome measures intervene earlier. The
parallel: if the compaction.log shows recovery cost *increasing*, that is a signal to
investigate and intervene before the system degrades further.

**RF gauge:** Measurement-based care converts retrospective RF 7 (looking back and assessing)
into prospective RF 4-5 (reading an instrument and responding). The instrument does the
monitoring; the human does the judgment.

**Assessment: PROMISING, NEEDS DATA.** The infrastructure is correct. The compaction.log has
N=1. The commit trailers have been on for one session. The instruments exist; the dataset
doesn't yet. This is the right design — build the measurement first, analyze later — but
the analysis hasn't happened because the data hasn't accumulated.

### 6. High-Reliability Organization Theory (Weick & Sutcliffe, 2007)

**Theory:** Organizations that operate in high-risk environments (nuclear power, naval aviation,
aircraft carriers) achieve extraordinary safety records through five principles: preoccupation
with failure, reluctance to simplify, sensitivity to operations, commitment to resilience, and
deference to expertise.

**What maps:**

| HRO Principle | System | Evidence |
|---------------|--------|----------|
| Preoccupation with failure | Slopodar flags, S1/S2/S3 vectors | Machine output flagged as untrustworthy by default |
| Reluctance to simplify | Layer model, 13 layers with cross-cutting concerns | Resisting the temptation to collapse complexity into simple narratives |
| Sensitivity to operations | `.keel-state`, terminal HUD, commit trailers | Continuous awareness of current system state |
| Commitment to resilience | Dead reckoning, compaction.log, keel-history.log | Designing for recovery, not just prevention |
| Deference to expertise | RF 9 moments, Captain retains review authority (SD-183) | The human's contemplative skill IS the expertise the system defers to |

**Weick's "sensemaking" framework:** Under conditions of ambiguity, people create meaning
retrospectively by constructing plausible narratives from available cues. The session decisions
log, the SD label convention, and the commit trailers are all sensemaking infrastructure —
they provide the cues from which future agents or humans can reconstruct what happened and why.

**RF gauge:** HRO theory predicts that systems with these five characteristics will have lower
failure rates — not because individual operators are more skilled, but because the
organizational structure catches what individuals miss. Applied here: the prospective
regulation systems should reduce the RF demand per decision by catching failure modes at the
system level rather than requiring the Captain to catch them at the individual level.

**Assessment: STRUCTURALLY SOUND, PARTIALLY IMPLEMENTED.** The five HRO principles are all
represented in the system. However, "deference to expertise" in HRO means deferring to
whoever has the most relevant knowledge, regardless of rank. In this system, the Captain is
the only human. There is no one to defer to. This is the structural limitation the Captain
identified in SD-194: "Humans are fundamentally social creatures; I can go no further without
creating compounding errors that read like success." HRO theory requires multiple humans.
This system has one.

### 7. Prospective Memory (McDaniel & Einstein, 2007)

**Theory:** Remembering to perform planned actions at the appropriate time in the future.
Distinct from retrospective memory (remembering what happened). Prospective memory failures
are among the most common cognitive errors in everyday life.

**What maps:** The `prepare-commit-msg` hook eliminates an entire class of prospective memory
failure: "remember to record system state when committing." The hook converts a prospective
memory task (remember to do X) into a procedural guarantee (X happens automatically). This
is the strongest form of prospective memory support — removing the need for it entirely.

Similarly, `gate.sh` eliminates "remember to run all three checks" and the clone-before-write
pattern in `keel-history.log` eliminates "remember to save the previous state before
overwriting."

**McDaniel & Einstein's finding:** Event-based prospective memory (do X when Y happens) is
more reliable than time-based (do X at time T). The hook-based systems (commit hook, gate
wrapper) are event-based — they fire when the triggering event occurs. The HUD refresh (30s
wall clock) is time-based and therefore more vulnerable to failure — but its failure mode is
benign (stale display) rather than catastrophic (lost state).

**Assessment: STRONG.** The systematic conversion of prospective memory tasks into automated
hooks is well-designed and maps directly to the literature's recommendations.

---

## What's Good — Summary

1. **The implementation intentions are concrete and automated** (Gollwitzer). No human decision
   required at execution time. RF 0 by design.

2. **The distributed cognition architecture is structurally sound** (Hutchins). State is spread
   across agent, files, and human instruments. No single point of failure for system awareness.
   The naval metaphor is accidentally (or intuitively) aligned with the foundational research.

3. **The ecological rationality intervention was data-driven** (Gigerenzer). The context audit
   used arXiv:2602.11988 as hard evidence, not just intuition. The result (76% reduction in
   depth-1 files) is measurable and the mechanism (less noise at the decision surface) is
   well-characterised.

4. **The prospective memory elimination is systematic** (McDaniel & Einstein). Every automated
   hook is one fewer prospective memory task. The strongest interventions are the ones that
   remove the need for human memory entirely.

5. **The measurement infrastructure exists before the data** (Lambert). Building compaction.log
   at N=1 is correct — you instrument first, analyze later. The commit trailers create a
   longitudinal dataset that grows with every commit.

---

## What Can Be Improved

### 1. Feedback Loops Are Open, Not Closed

The compaction.log records data. Nothing currently *acts on* that data. In measurement-based
care, the feedback loop closes when the clinician sees a deterioration signal and intervenes.
Currently, the Captain must manually inspect the log and decide whether recovery cost is
trending in the wrong direction.

**Recommendation:** Add a threshold check to the boot sequence. After compaction recovery,
compare current token count to the running mean. If current > mean + 1 SD, flag it. This
converts an open-loop measurement into a closed-loop feedback system. The flag doesn't decide
what to do — it tells the human that something changed. RF demand: 1 (read the flag) instead
of 5 (analyze the trend).

### 2. The Magnitude-Proportional Pause Has No Engineering Implementation

SD-133 identified the need for a red-light pause proportional to the magnitude of a change.
SD-136 recorded this as a standing order. But no system enforces it. A standing order is a
verbal implementation intention — it relies on the human remembering to follow it, which is
exactly the prospective memory failure mode the hooks were designed to eliminate.

**Recommendation:** Add a magnitude estimator to the integration sequence. Before merge: count
files changed, lines changed, and categories touched (code / docs / config / test). If any
metric exceeds a threshold (e.g., >10 files, >500 lines, >2 categories), insert a mandatory
wait step with an explicit "RED LIGHT: magnitude exceeds threshold. List what this change does
in one sentence." The gate does not proceed until the sentence is provided. This converts the
standing order from a prospective memory task into an event-based trigger.

**RF gauge:** Currently the magnitude pause requires RF 7 (spontaneous recognition that
"this is big"). The engineering implementation would reduce it to RF 3 (read the flag,
respond to the prompt).

### 3. The HRO "Deference to Expertise" Principle Has No Second Human

Weick & Sutcliffe's framework requires multiple perspectives. The Captain identified this in
SD-194: "I can go no further without creating compounding errors that read like success." The
system has one L12 source. When that source makes an error (SD-178, oracle contamination),
no gate catches it.

**This is a structural limitation, not a fixable gap.** The engineering response is the Two
Ship experiment (SD-169, SD-185) — using a second harness instance as a "second L12 reading."
The experiment revealed discovery overhead (SD-179) but the principle is sound. The limitation
is not the Captain's metacognitive capacity. It is the number of humans.

**Recommendation:** When the Captain finds collaborators (True North: Get Hired), the HRO
principle activates. Until then, the Two Ship approach and the commit trailers (which allow
future humans to audit the decision trail) are the available mitigations. The system is
designed to be auditable by future team members, even if it currently has only one.

### 4. RF Demand Per Decision Is Not Tracked

The per-round RF table in the recalibrated analysis provides a one-time assessment. It does
not track whether the prospective regulation systems are *actually reducing* the RF demand
on the Captain over time. The hypothesis: as the scaffolds accumulate, the average RF
required per decision should decrease, because more of the monitoring is automated.

**Recommendation:** Add an optional RF estimate to the SD label convention. Format:
`[domain-action:RFn]` where n is the estimated RF demand. This produces a longitudinal
dataset: RF demand per decision over time, correlated with which scaffolds were in place.
If the scaffolds are working, the trend should be downward for operational decisions, with
spikes only on novel challenges. If the trend is flat or increasing, the scaffolds are not
having their intended effect.

**Caution:** This recommendation carries its own risk. Estimating RF per decision is itself
a metacognitive task. If it becomes a burden, it is governance recursion (Round 14). The
estimate should be optional and lightweight — a single digit, not a paragraph. If it doesn't
feel natural, drop it. The Captain will know.

### 5. The Contemplative Practice Is Not Represented in the Layer Model

The layer model (v0.2) has L12 described as "the human in the loop" with instruments:
reasoning tokens, response text, git diff, terminal HUD, pitkeel. What it does not represent
is the *training* of the human — the 20 years of contemplative practice that produce the
RF 6-9 range. The layer model treats L12 as a fixed layer. It is not fixed. It has been
trained, it continues to be trained, and its capacity varies with conditions (fatigue,
emotional arousal, cognitive load — see Fonagy & Luyten, 2009).

**Recommendation for v0.3:** Add a "trained capacity" annotation to L12. The layer is not
static hardware — it is trained wetware. The training modality (Zen, therapy, any structured
reflective practice) is a variable that affects the system's overall performance. A different
human at L12, with different training, would produce different RF peaks and different failure
modes. This is data the literature needs: what kind of L12 training produces the best
outcomes in human-LLM joint cognitive systems?

---

## The RF Scale as a Gauge — Forward Use

The Reflective Functioning Scale was designed for clinical assessment of individual patients.
Applying it to human-LLM interaction is a novel use. Its utility here:

**Strengths as a gauge:**
- It provides a shared vocabulary for "how hard was that metacognitive task?"
- It has a validated scale (0-9) that enables comparison across events
- It distinguishes between spontaneous and effortful mentalization — critical for assessing
  whether the prospective systems are reducing the need for effortful monitoring
- It maps cleanly to the contemplative skill levels the Captain has trained

**Limitations as a gauge:**
- The RF scale was designed for human-human interaction, not human-LLM
- Self-assessment of RF is unreliable (the same metacognitive limitations that affect the
  work affect the assessment of the work)
- The scale measures individual capacity, not system capacity — the distributed cognition
  system has emergent properties that exceed any individual component's RF
- RF 9 as assessed here is based on Weaver's analysis, not on independent clinical evaluation.
  The assessment itself is an L10 (same model) artifact and carries the correlated-blinds risk.

**Recommendation:** Use the RF scale as an internal instrument — a "barometer reading" in the
Lexicon's terms — not as a validated clinical measure. It is useful because it provides a
shared scale. It is limited because the scale was not designed for this context. Treat it
like the layer model itself: a map that improves through empirical soundings, not a territory.

---

## Summary

The prospective metacognitive regulation systems built since 9960cd2 map well to established
literature across seven domains. The strongest implementations are the automated hooks
(implementation intentions), the context depth audit (ecological rationality), and the
distributed state architecture (distributed cognition). The weakest area is closed-loop
feedback — measurements exist but nothing yet acts on them automatically.

The gap identified in the RF analysis (prospective regulation) is being actively addressed.
The correction is valid: the engineering work IS the prospective regulation. The systems
convert high-RF metacognitive tasks into low-RF mechanical operations. This is exactly what
the literature recommends.

What remains structurally unaddressable with one human: the HRO requirement for multiple
perspectives. The commit trailers and session decisions are designed to be auditable by
future team members. The system is building its own onboarding material for collaborators
who do not yet exist.

---

## References

- Boswell, J. F., Kraus, D. R., Miller, S. D. & Lambert, M. J. (2015). Implementing routine
  outcome monitoring in clinical practice: Benefits, challenges, and solutions. *Psychotherapy
  Research*, 25(1), 6-19.
- Gigerenzer, G., Todd, P. M. & ABC Research Group (1999). *Simple Heuristics That Make Us
  Smart*. Oxford University Press.
- Gloaguen, R. et al. (2026). Evaluating AGENTS.md: A benchmark for repository-level agent
  guidance. *arXiv:2602.11988*.
- Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans.
  *American Psychologist*, 54(7), 493-503.
- Hutchins, E. (1995). *Cognition in the Wild*. MIT Press.
- Lambert, M. J. (2010). *Prevention of Treatment Failure: The Use of Measuring, Monitoring,
  and Feedback in Clinical Practice*. APA.
- McDaniel, M. A. & Einstein, G. O. (2007). *Prospective Memory: An Overview and Synthesis
  of an Emerging Field*. Sage.
- Weick, K. E. & Sutcliffe, K. M. (2007). *Managing the Unexpected: Resilient Performance
  in an Age of Uncertainty* (2nd ed.). Jossey-Bass.
- Wood, D., Bruner, J. S. & Ross, G. (1976). The role of tutoring in problem solving.
  *Journal of Child Psychology and Psychiatry*, 17(2), 89-100.
