# Round Table — Standardised Agent Report Template

Back-reference: **SD-097**
Established: 2026-02-24
Status: Standing order — all future RT reports must follow this format.

---

## Template

```md
---
round_table: L[n]
date: YYYY-MM-DD
agent: [agent_name]
agent_role: [role_category]
batch: [1 or 2]
question_hash: [first 8 chars of SHA-256 of the exact question text]
answer: [AGREE or DISAGREE]
confidence: [0.00–1.00]
conditional: [true or false]
---

# RT L[n] — [Agent Name] Report

Date: YYYY-MM-DD
Agent: [Agent Name]
Question: "[Insert the exact question being evaluated]"

## Position Trail (Last 24hrs)

**[Report name] ([time], [date]):** [SIGNAL COLOR], confidence [0.00–1.00]. [Key findings and flags from that round.]
**[Report name] ([time], [date]):** [SIGNAL COLOR], confidence [0.00–1.00]. [Key findings, predictions, and constructions from that round.]
**[Report name] ([time], [date]):** [SIGNAL COLOR], confidence [0.00–1.00]. [Revised assessments, probability updates, convergence/divergence notes.]
**[Report name] ([time], [date]):** [SIGNAL COLOR], confidence [0.00–1.00]. [Primary causal variables identified, causal confidence, analytical gaps discovered.]
**[Report name] ([time], [date]):** [SIGNAL COLOR], confidence [0.00–1.00]. [Rankings, recommendations, consensus/groupthink flags, calibration notes.]

**Net trajectory:** [One-sentence arc describing how your position evolved across the trail, e.g. "Cautious (0.35) → reassessed (0.70) → confident (0.85) → stable (0.85)".]

## Consistency Check

**Times position changed in trail:** [n]
**Direction of changes:** [e.g., "cautious → confident → confident" or "2 reversals"]
**Self-assessed anchoring risk:** [low/medium/high] — [one sentence on whether prior reports are pulling the current answer]

## Answer

**[AGREE / DISAGREE].** Confidence: [0.00–1.00]. Conditional: [yes/no].

Conditions: [If conditional, enumerate what must be true for this answer to hold. If unconditional, state "None."]

## Reasoning

[Opening paragraph: restate the question, state your position, and note any qualifications or narrowing of scope.]

### 1. [First axis of analysis]

[Evidence-grounded argument for this axis. Reference specific prior reports and findings.]

### 2. [Second axis of analysis]

[Evidence-grounded argument. Quantify where possible — windows, timelines, probabilities.]

### 3. [Third axis of analysis — challenge the framing]

[Interrogate the question itself. What instinct or signal might the questioner be expressing that instruments don't capture?]

### 4. [Fourth axis — outstanding actions or unresolved items]

[List specific unexecuted recommendations from prior rounds. Assess whether they are blockers or bounded work.]

### 5. [Fifth axis — what specifically you reject or accept in the question's framing]

[Distinguish between the absolute claim and the conditional claim. State precisely where your disagreement/agreement boundary lies.]

### 6. What my instruments actually say

Applying the five evaluation dimensions to the question itself:

- **Validity:** [Is the claim supported by the evidence?]
- **Coherence:** [Does the claim cohere with prior findings, or does it contradict them?]
- **Choice:** [What scenarios does the framing include or exclude?]
- **Framing:** [What emotional valence or finality does the framing carry? What bias does it introduce?]
- **Likely reaction ([domain lens]):** [How will the relevant audience respond to acceptance vs. challenge of this framing?]

## Summary

[3–5 sentences. Restate position. Identify the actual decision variable. Distinguish principle from execution. Close with reversal condition.]

**Reversal condition:** [The specific observation or event that would flip my answer.]
```

---

## Usage Notes

### For Weaver (dispatching)

- Include the exact question text in each agent's prompt.
- Provide the template path (`docs/internal/rt-report-template.md`) and instruct agents to follow it exactly.
- Specify the batch number (1 or 2) and the output path (`docs/internal/rt-l[n]/[agent].md`).
- Instruct agents to compute the `question_hash` by SHA-256 hashing the exact question string and taking the first 8 hex characters.
- Instruct agents to read their own agent file before responding (enforces role grounding).

### For agents (writing)

- All confidence values use the **0.00–1.00 scale**. Do not use /10, percentages, or colour alone.
- Signal colours (GREEN/YELLOW/RED) are supplementary labels, not replacements for the numeric confidence.
- **Confidence appears in three places — they mean different things:**
  - **Frontmatter `confidence:`** = your final answer confidence for THIS report. Must equal the Answer line confidence.
  - **Position Trail `confidence [0.00–1.00]`** = your point-in-time assessment from THAT round. These are historical values — they record where you were, not where you are now.
  - **Answer line `Confidence:`** = your final answer confidence for THIS report. Must equal the frontmatter confidence.
  - You do NOT need to reconcile your final confidence with the trajectory of prior confidence values. They are independent measurements at different points in time. Your current assessment stands on its own evidence.
- The Position Trail must reference every report you have written in the relevant time window, in chronological order.
- The Consistency Check is a self-assessment of anchoring risk. Be honest — if you are being pulled by your own prior outputs, say so.
- The Reversal Condition must be specific and falsifiable, not vague ("if things change").

### For synthesis (Weaver)

- Machine extraction targets: YAML frontmatter fields, Consistency Check values, Answer line, Reversal Condition.
- Diff across agents on: answer, confidence, conditional status, anchoring risk, reversal conditions.
- Diff across rounds on: net trajectory, confidence deltas, position change count.

### Confidence Scale Reference

| Range | Meaning |
|-------|---------|
| 0.00–0.20 | Strong disagree / no confidence in claim |
| 0.20–0.40 | Disagree / low confidence |
| 0.40–0.60 | Uncertain / balanced evidence |
| 0.60–0.80 | Agree / moderate confidence |
| 0.80–0.90 | Strong agree / high confidence |
| 0.90–1.00 | Near-certain / overwhelming evidence |

### Signal Colour Reference

| Colour | Meaning |
|--------|---------|
| GREEN | No blockers in this domain. Confident in readiness. |
| YELLOW | Concerns exist but are not launch-blocking. Bounded risk. |
| RED | Blocking condition identified. Must be resolved before proceeding. |

---

*This template is a living document. Updates require a new SD entry and Captain approval.*
