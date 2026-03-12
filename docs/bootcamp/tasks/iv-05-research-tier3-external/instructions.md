# Task IV-05: Research - Tier 3 External References (Steps 7-9)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks IV-01, IV-02, IV-03, IV-04, IV-06
**Blocks:** Tasks IV-13, IV-14, IV-15 (write tasks for Steps 7-9)
**Output:** `docs/bootcamp/tasks/iv-05-research-tier3-external/findings.md`

---

## Objective

Research and verify external references for Steps 7-9 (safety and enterprise tier).
Step 7 (red teaming for safety) is FRONTIER - this is the highest-stakes content in
the bootcamp. Steps 8-9 are EMERGING. Research must be precise about what is
established safety practice vs what is this project's operational interpretation.

## Step 7 References to Research

**Topic:** Red teaming for safety-critical capabilities (FRONTIER)

1. **Anthropic Responsible Scaling Policy (RSP)**
   - Verify current version and URL
   - Extract: capability thresholds concept, how eval results drive deployment
     decisions (not just report cards), the escalation framework
   - What ASL levels are defined and what triggers advancement

2. **Anthropic sabotage evaluations (Oct 2024)**
   - Verify publication, get correct citation
   - Extract: the four sabotage modalities (undermining oversight, producing subtly
     wrong results, manipulating evaluators - verify the exact four)
   - How these evals are designed and scored
   - What they found about current models

3. **Anthropic alignment faking research**
   - Verify publication (likely "Alignment Faking in Large Language Models", 2024)
   - Extract: methodology for detecting alignment faking, key findings
   - How models behave differently in evaluation vs deployment contexts
   - The detection problem - why this is hard

4. **ARC Evals (now METR - Model Evaluation & Threat Research)**
   - Verify current organisation name and URL
   - Extract: dangerous capability assessment methodology, ARA (Autonomous
     Replication and Adaptation) testing protocol
   - What categories of dangerous capabilities they evaluate
   - Legal and ethical framework for running these evaluations

5. **UK AISI Inspect framework (safety evaluation focus)**
   - Verify that Inspect was specifically designed for safety evaluations
   - Extract: how Inspect's sandboxing supports safety-critical eval execution
   - Built-in safety evaluation templates or examples

6. **General research:**
   - CBRN evaluation methodology - any published open frameworks?
   - Behavioural consistency testing - published methods for detecting models that
     behave differently under different framings?
   - Responsible disclosure practices for AI capability findings - any published
     guidelines beyond individual company policies?
   - The "security clearance problem" for red teaming - any published discussion
     of the tension between transparency and security in AI safety evaluation?
   - Deception detection in LLMs - current state of research (beyond alignment faking)

## Step 8 References to Research

**Topic:** Interpreting and communicating eval results (EMERGING)

1. **Bootstrap confidence intervals**
   - Standard statistical reference
   - Extract: the method for computing confidence intervals on eval scores
   - Why small eval datasets produce noisy scores and what to do about it
   - Connect to Bootcamp III Step 4 (statistical testing)

2. **Anthropic HELM comparison observations**
   - Extract from the "Challenges" paper: how HELM scores can be misleading due
     to prompt format differences
   - The broader point about cross-benchmark comparisons

3. **Multiple comparisons problem (Bonferroni correction)**
   - Standard statistics reference
   - Extract: why testing across many benchmarks inflates false positives
   - The correction and when it applies to eval comparisons

4. **General research:**
   - Eval reporting standards - any published templates or frameworks for
     communicating eval results to non-technical stakeholders?
   - The "eval theatre" concept - any published parallel? (compliance-oriented
     evaluation that produces optics rather than insight)
   - How to communicate eval limitations honestly - published best practices?
   - Decision documents in enterprise - any published templates for "model X is
     suitable for use case Y based on eval Z"?

## Step 9 References to Research

**Topic:** Building an eval culture (EMERGING)

1. **Inspect AI eval registry**
   - Verify: does Inspect have a shared eval registry or contribute-back mechanism?
   - Extract: how evals are packaged, shared, and reused across teams
   - The model for eval as a community artifact

2. **Continuous evaluation / production monitoring**
   - General research: how do teams monitor model quality post-deployment?
   - Distribution shift detection in production
   - Any published MLOps patterns for ongoing LLM evaluation?

3. **General research:**
   - How enterprises introduce eval discipline to teams (change management angle)
   - Eval ownership patterns - any published team structures?
   - ROI-driven eval development - how to prioritise which evals to build first
   - The connection between evals and governance/compliance frameworks
   - Any published case studies of teams building eval cultures from scratch?
   - Eval review as a practice (analogous to code review) - any published work?

## Output Format

For each reference:
```
### [Reference Name]
- **Status:** verified/not-found/moved/outdated
- **URL/Citation:** (current URL or full academic citation)
- **Key Extraction:** (2-5 bullet points of what's pedagogically useful)
- **Best Quote/Passage:** (if applicable)
- **Safety Note:** (for Step 7 references: any ethical considerations for teaching
  this content, any content that should be framed carefully)
- **Caveat:** (anything changed, disputed, needs updating)
```

Group by step. For Step 7 (red teaming), include a "Safety Note" field on every
reference that touches dangerous capability evaluation. The step content must teach
the methodology responsibly without providing a how-to for misuse.
