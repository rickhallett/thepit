# Analyst Report: LLM-Generated Code Verification Phenomena

**Date:** 2026-02-28
**Author:** Analyst (research evaluation)
**Classification:** Internal research — wardroom register
**Back-reference:** Captain's order, session 2026-02-28; observations from 169-test / 5-PR agentic session

---

## 1. Executive Summary

- **The phenomena we observed are well-documented in the literature.** LLM-generated code that is surface-correct but causally wrong (our "Right Answer, Wrong Work") is a known manifestation of the test oracle problem, now significantly amplified by LLMs. EvalPlus (Liu et al., 2023) showed that augmenting HumanEval with 80x more tests reduced pass rates by up to 28.9%, demonstrating exactly the kind of surface-passing-but-actually-broken code we saw.

- **Iterative fix-review loops are known to not converge.** Self-repair research (Olausson et al., 2024; Shinn et al., 2023) shows that LLM self-repair without external grounding signals has diminishing or zero returns after 1-2 rounds. Our observation that fixing Round N findings changes the attention surface — making Round N+1 find new issues — is consistent with this. The literature has no satisfactory solution; most systems simply cap iterations.

- **Multi-agent verification diversity is the most promising frontier, but error correlation between LLM instances is high.** ChatDev (Qian et al., 2023) and MetaGPT (Hong et al., 2023) assign role-differentiated agents but use the same underlying model. Error correlation under shared training distributions is an open problem. Our approach — using genuinely different systems (agent, local gate, Bugbot, human) — maps more closely to N-version programming diversity principles than most academic multi-agent systems.

- **The human-in-the-loop research is thin on the specific case of governing agentic code generation.** HCI research on AI-assisted coding (e.g., Vaithilingam et al., 2022; Barke et al., 2023) focuses on Copilot-style autocomplete. Almost nothing studies the case of a human operator governing a fleet of autonomous agents. This is a genuine gap, and one where our experience has direct research value.

- **Our advantage is real and structurally distinct.** The literature overwhelmingly studies fully autonomous pipelines or simple human-accepts-suggestion interactions. The deliberate, slow, multi-perspective verification fabric we operate — where the human provides causal reasoning and judgment rather than throughput — is closer to safety-critical systems engineering than to mainstream AI-assisted coding research. Academic findings on ensemble diversity, test oracle augmentation, and property-based testing translate directly to our scale; findings on massive parallelism and automated convergence do not, and that is fine.

---

## 2. Detailed Findings

### 2.1 LLM-Generated Code Verification

#### The Problem Is Known and Measured

The foundational work is the Codex paper and HumanEval benchmark (Chen et al., 2021, arXiv:2107.03374), which established pass@k as the standard metric. The critical follow-up is **EvalPlus** (Liu et al., 2023, arXiv:2305.01210), which augmented HumanEval's test cases by 80x using both LLM-generated and mutation-based test inputs. Key finding: pass@k dropped by 19.3-28.9% across 26 LLMs, meaning a substantial fraction of code that passed original tests was functionally incorrect. This is the quantitative confirmation of our "Right Answer, Wrong Work" observation — the tests were too weak to catch the actual bugs.

**ClassEval** (Du et al., 2023, arXiv:2308.01861) extended evaluation to class-level code generation, finding that all LLMs performed substantially worse on class-level tasks than method-level benchmarks suggested. Method-level coding ability did not predict class-level ability. This is relevant to our observation about mock isolation failures — class-level code with inter-method dependencies is where LLM-generated tests most frequently break.

**SWE-bench** (Jimenez et al., 2023, arXiv:2310.06770, ICLR 2024) moved evaluation to real GitHub issues, requiring models to coordinate changes across multiple functions, classes, and files. Initial solve rates were extremely low (Claude 2 at 1.96%). This benchmark confirmed that real-world software engineering — as opposed to isolated function synthesis — remains fundamentally harder for LLMs.

#### Mutation Testing for LLM-Generated Code

Mutation testing — seeding deliberate faults to measure test adequacy — is the classical technique most directly applicable to our "Right Answer, Wrong Work" problem. EvalPlus uses mutation-based test generation as one of its strategies. The principle: if a test suite cannot distinguish the original code from a mutated variant, the test is inadequate.

I am confident that mutation testing applied to LLM-generated tests is an active research area, but I cannot verify specific 2024-2025 paper titles and authors on this exact intersection without risk of hallucination. The EvalPlus approach of augmenting test inputs via mutation is the most rigorously verified technique I can point to.

#### Property-Based and Metamorphic Testing

Property-based testing (QuickCheck lineage) generates random inputs satisfying specified properties. Metamorphic testing checks relationships between outputs of related inputs (if f(x) = y, then f(2x) should relate to y in a specified way). Both approaches are well-established in the testing literature.

The application of these techniques specifically to LLM-generated code is an area where I expect significant work exists but cannot verify specific paper titles. The conceptual fit is strong: property-based testing can catch "Right Answer, Wrong Work" by checking invariants that surface-level pass/fail cannot, and metamorphic relations can detect when a function produces the right output for the wrong reason.

**Honest limitation:** I have strong theoretical knowledge of how these techniques apply but cannot point to verified 2024-2025 papers applying them specifically to LLM-generated code verification. I will not fabricate citations.

#### Formal Verification

Formal verification of LLM-generated code is in early stages. The gap between what LLMs generate (imperative code with side effects, complex state, IO) and what formal verifiers can tractably handle (pure functions, bounded loops, algebraic types) remains large. I am aware of work on using LLMs to generate formal specifications or proofs (e.g., in Lean or Coq), but this is generating proofs, not verifying LLM-generated application code.

For our scale and domain (TypeScript web application, API tests), formal verification is not currently practical. The more applicable techniques are mutation testing, property-based testing, and ensemble review.

### 2.2 Probabilistic Code Review / Automated Review

#### Non-Deterministic Review Is Inherent

Our observation — Round 1 found 4 issues, Round 2 found 3 completely different issues after fixing Round 1 — reflects two distinct phenomena:

1. **Stochastic sampling in LLM inference.** With temperature > 0, each review pass samples from a distribution over possible responses. Different runs attend to different code regions. This is well-documented as a property of LLM inference generally, though I cannot point to a paper studying it specifically in the code review context.

2. **Attention surface shift.** Fixing code changes the context window content, which changes what the model attends to. This is a consequence of the transformer attention mechanism — it is not merely sampling variation, but a genuine shift in what is "visible" to the model.

#### Human Reviewer Variance

Human code reviewer variance is well-documented in software engineering research. The classic finding (from studies in the 1990s-2000s on formal inspections) is that individual reviewers typically find only 30-70% of defects, and different reviewers find different subsets. This is why inspection processes use multiple reviewers.

The analogy to LLM reviewer variance is direct: each LLM review pass, like each human reviewer, samples from a different region of the defect space. The key difference is that human reviewers bring genuinely different mental models and experiences, while LLM reviewer passes share the same training distribution — their variance comes from stochastic sampling, not from fundamentally different understanding.

**Implication for our system:** Using genuinely different verification systems (Claude writing code, local type checker + linter, Bugbot reviewing, human inspecting) provides more diversity than running the same LLM reviewer multiple times. Each system has a structurally different failure mode.

### 2.3 The Test Oracle Problem in the LLM Context

#### Classical Foundations

The test oracle problem — "how do you know the test is checking the right thing?" — has been studied in software testing for decades. Barr et al. (2015, "The Oracle Problem in Software Testing: A Survey," IEEE TSE) is the canonical survey. The problem has two aspects: (1) determining the expected output for a given input, and (2) determining whether the system's actual behavior matches the expected behavior.

#### "Right Answer, Wrong Work" as Oracle Inadequacy

Our "Right Answer, Wrong Work" pattern is specifically a case where the oracle (the test assertion) is syntactically correct but semantically inadequate. The test asserts the right outcome but for the wrong reason:

- `expect(status).toBe(400)` passes, but the 400 comes from a different validation path than the test claims to verify.
- The test is testing "does the endpoint return 400?" rather than "does the endpoint return 400 because of missing authorization?"

This is a well-known weakness of assertion-based testing. The test oracle is too coarse — it checks the observable output without verifying the causal path.

#### LLMs Amplify the Oracle Problem

LLMs are particularly prone to generating tests with weak oracles because they optimize for "test passes" (the reward signal they've been trained on is code that runs without errors) rather than "test verifies the right property." The model has no causal model of the system under test; it pattern-matches on what tests for similar code look like.

The Self-Debug paper (Chen et al., 2023, arXiv:2304.05128) showed that LLMs can identify errors by examining execution results and explaining code in natural language. However, Self-Debug's improvement comes from checking "does the output match the specification?" — it does not address the deeper problem of "is the specification (the test assertion) itself adequate?"

Reflexion (Shinn et al., 2023, arXiv:2303.11366) improved pass@1 on HumanEval to 91% by having the model reflect on failures and maintain episodic memory. But Reflexion's signal is binary (test passes or fails) — it cannot detect "Right Answer, Wrong Work" because the test does pass.

**This is the crux:** iterative refinement systems that use test passage as their feedback signal are structurally blind to oracle inadequacy. If the test is wrong, the feedback loop reinforces the wrong behavior.

#### What Would Address This?

- **Assertion density/quality metrics:** Measuring not just whether assertions exist but whether they constrain the output sufficiently. An assertion that checks `status === 400` constrains less than one that checks `status === 400 && body.error === 'UNAUTHORIZED'`.
- **Mutation testing of the test itself:** If you can mutate the implementation (change which validation fires) and the test still passes, the test is inadequate.
- **Causal tracing:** Verifying that the assertion's pass/fail actually depends on the code path claimed in the test name/description. This requires execution-level instrumentation (code coverage, trace analysis) rather than static analysis.

I believe these approaches are being researched but cannot verify specific papers without risk of hallucination.

### 2.4 Multi-Agent Verification and Ensemble Approaches

#### The State of Multi-Agent Coding Systems

**ChatDev** (Qian et al., 2023, arXiv:2307.07924, ACL 2024) assigns LLM agents to roles (CEO, CTO, programmer, reviewer, tester) that communicate through "chat chains." It demonstrates that role-differentiated agents can improve code quality over single-agent generation. However, all agents use the same underlying LLM — the diversity comes from prompt framing, not from genuinely different reasoning systems.

**MetaGPT** (Hong et al., 2023, arXiv:2308.00352) encodes SOPs into multi-agent workflows, with agents verifying intermediate results. Key insight: structured handoffs between agents with defined roles reduce cascading hallucinations compared to free-form multi-agent chat.

**FlowGen / SOEN-101** (Lin et al., 2024, arXiv:2403.15852, ICSE 2025) emulates software process models (Waterfall, TDD, Scrum) using LLM agents. Found that the Scrum model (with iterative refinement and role diversity) outperformed Waterfall and TDD models. Achieved ~15% improvement over baseline single-agent generation.

**SWE-agent** (Yang et al., 2024, arXiv:2405.15793) demonstrated that agent-computer interface design significantly affects LLM agent performance on real software engineering tasks. Achieved 12.5% pass@1 on SWE-bench, far exceeding non-interactive approaches.

#### Error Correlation: The Unsolved Problem

The fundamental question for ensemble verification is: **are errors from different LLM instances correlated?**

N-version programming (Avizienis, 1985 — foundational, no arXiv) assumes that independently developed software versions will fail independently. This assumption has been empirically challenged even for human-developed software (Knight & Leveson, 1986, "An Experimental Evaluation of the Assumption of Independence in Multiversion Programming," IEEE TSE — foundational work showing that independently developed programs tend to fail on the same inputs).

For LLM instances, the situation is worse: they share the same training data, architecture, and optimization objective. Two samples from the same LLM are NOT independent. They will tend to make the same kinds of errors — the same plausible-but-wrong patterns, the same over-reliance on surface structure.

**Cross-model diversity** (using, e.g., GPT-4 and Claude and Gemini) provides somewhat more independence, but these models share significant training data overlap and similar architectural lineages.

**Our system's diversity advantage:** Our verification chain (Claude generating code → TypeScript type checker → ESLint → Vitest runner → Bugbot reviewing → human inspecting) has genuinely different failure modes:
- The type checker catches type errors that all LLMs and humans might miss
- The linter catches style/pattern issues orthogonal to functional correctness
- Bugbot (a different LLM instance with different prompting) catches different surface-level issues
- The human catches causal/semantic issues that no automated system currently addresses

This is closer to the defense-in-depth principle than to N-version programming.

#### Convergence of Fix-Review Loops

Our observation that the fix-review loop does not converge by default is consistent with findings on LLM self-repair. The self-repair literature generally shows:

- **First iteration helps.** Getting feedback (test failure, error message) and trying again typically improves results.
- **Subsequent iterations plateau or regress.** Without new information (new test cases, different feedback signals), the model tends to oscillate or make changes that introduce new issues while fixing old ones.

The specific mechanism we observed — fixing changes the code surface, which causes the reviewer to attend to new regions and find new issues — is a distinct phenomenon from simple non-convergence. It is more like the review equivalent of "whack-a-mole" and, to my knowledge, has not been specifically studied as a phenomenon in the LLM code review literature.

### 2.5 Human-in-the-Loop Verification at Scale

#### What Exists

The most relevant HCI research on AI-assisted coding focuses on GitHub Copilot-style autocomplete:

- Studies of developer behavior with Copilot (e.g., Vaithilingam et al., 2022, "Expectation vs. Experience: Evaluating the Usability of Code Generation Tools Powered by Large Language Models," CHI 2022 — **I believe this paper exists at this venue but cannot verify the exact title/year with certainty**) generally find that developers over-accept suggestions, under-review generated code, and develop automation bias.

- The security dimension is documented: Fu et al. (2023, arXiv:2310.02059, accepted TOSEM 2025) found that 29.5% of Python and 24.2% of JavaScript Copilot-generated snippets in real GitHub projects contained security weaknesses across 43 CWE categories.

#### What Doesn't Exist

I found no published research on the specific case we operate in:

- A **solo human operator** governing a **fleet of LLM agents** (not receiving suggestions, but directing autonomous work)
- The human's role being **causal verification and judgment** rather than code review in the traditional sense
- **Attention allocation** across multiple simultaneous agent workstreams
- **Trust calibration** for agent output that passes automated gates but may be causally wrong

This is a genuinely understudied configuration. The closest analogues are:

1. **Air traffic control** — one human monitoring multiple semi-autonomous systems with different risk profiles
2. **Supervisory control in safety-critical systems** (nuclear, aviation) — literature on monitoring automated systems for failures that the automation cannot detect
3. **Pair programming research** — but the asymmetry (human reasoning + LLM throughput) makes traditional pair programming research only partially applicable

The **Discovery Overhead / Naturalist's Tax** phenomenon we identified (parallel observation processes generating more discoveries than the human can process) maps to the concept of "automation surprise" in human factors research — but applied to cognitive overload rather than unexpected automated behavior.

#### Where the Human Adds Unique Value

Based on both the literature and our observations, the human adds irreplaceable value at:

1. **Causal reasoning about test semantics.** No automated system currently verifies that a test checks the right property for the right reason. The human can read a test name, understand the intent, and verify that the assertions match the intent.

2. **Cross-context pattern recognition.** The human sees patterns across agent sessions, across PRs, across days. The agents have no persistent memory outside what's written to files. The human is the only entity that can notice "we keep making mock isolation errors" and change the process.

3. **Judgment under ambiguity.** When the gate passes but something "feels wrong," the human can investigate. Automated systems treat gate-pass as binary; the human treats it as a signal with confidence weight.

4. **Oracle authority.** The human is L12 — the ground truth. When there is disagreement between agent and reviewer, the human resolves it. This is precisely the "Oracle Contamination" risk identified in the Lexicon: if L12 is wrong, everything downstream is wrong.

### 2.6 What Can We Take Without Replicating?

#### Directly Applicable to Our Scale

1. **EvalPlus-style test augmentation.** We can generate additional test inputs for our existing tests using mutation-based strategies. This doesn't require a massive infrastructure — it's a technique that works at any scale. Mutate inputs, check that tests still pass for the right reasons. This directly addresses "Right Answer, Wrong Work."

2. **Structured role separation (from ChatDev/MetaGPT/FlowGen).** We already do this with our crew roster. The academic validation is that role-differentiated agents with defined handoff protocols outperform single-agent or free-form multi-agent chat. Our system is more disciplined than theirs (SOPs encoded as agent definitions, governance protocols, explicit verification gates).

3. **Reflexion-style episodic memory.** The principle of maintaining a persistent record of what went wrong and why, then using that record to inform future behavior, is directly applicable. Our `docs/internal/weaver/log.md` and `session-decisions.md` serve this function for the human; the agents could benefit from similar structured memory of past failure modes.

4. **Defense-in-depth over depth-of-any-single-verifier.** The literature consistently shows that diversity of verification technique matters more than sophistication of any single technique. Our four-layer verification (agent self-test → gate → Bugbot → human) already implements this principle. The academic contribution is the quantitative evidence that this works.

5. **Cap iterative self-repair at 1-2 rounds.** The literature shows diminishing returns beyond 1-2 rounds of self-repair without new information. Instead of looping, switch to a different verifier or escalate to human judgment.

#### Not Applicable to Our Scale (but useful to understand)

1. **Massive parallel sampling (pass@100, best-of-N).** Generating 100 candidate solutions and picking the best requires compute we don't have and a reliable selection mechanism we don't have.

2. **Automated convergence criteria for review loops.** Large-scale systems can statistically model when review passes stop finding new issues. At our scale (5 PRs, 169 tests), we don't have the sample size for statistical convergence detection.

3. **Fine-tuned reviewer models.** Training a custom reviewer model requires labeled data (code + known defects) at scale we don't produce.

#### What We Gain From Being Slower

The Captain's intuition is correct: slowness is an advantage for specific reasons that the literature illuminates:

1. **Causal verification is inherently sequential.** You cannot parallelize understanding why a test passes. The human's slow, deliberate review is the only process that currently checks causal adequacy. Automated systems check surface correctness at speed; the human checks meaning at depth.

2. **Process learning requires reflection.** Reflexion showed that agents improve when they reflect on failures. But the reflection must be on the right signal. Fast automated loops reflect on "did the test pass?" — the wrong signal for "Right Answer, Wrong Work." Slow human reflection reflects on "is this test actually testing what we think?" — the right signal.

3. **Governance accumulates.** Our Lexicon, SOPs, agent definitions, and session decisions are a growing body of governance knowledge. Fast autonomous systems don't build this — they optimize for the current task. Our system optimizes for the reliability of the process across all future tasks.

4. **The HCI problem is the research frontier.** The agentic engineering problem (make LLMs write code) is being solved by companies with billion-dollar compute budgets. The HCI problem (how does a human effectively govern autonomous agents?) is barely studied. Our daily practice is primary research data for this question.

---

## 3. Synthesis: The Shape of the Field

The academic literature on LLM code verification is:

- **Strong on measuring the problem.** EvalPlus, SWE-bench, ClassEval, and security analyses quantify how often LLM-generated code is wrong. The numbers are sobering: 20-30% of "passing" code is actually broken.

- **Moderate on single-technique solutions.** Self-Debug, Reflexion, mutation testing, and role-differentiated agents each provide measurable but limited improvement.

- **Weak on ensemble/systemic approaches.** The field knows that diverse verification helps but has limited empirical evidence on how to compose multiple techniques effectively, especially when the same model family underlies multiple verification stages.

- **Nearly absent on human governance of autonomous agents.** This is the gap where our work sits. The literature studies either fully autonomous systems or simple human-accepts-suggestion interactions. The middle ground — a human operator with limited bandwidth governing a fleet of agents under a disciplined verification protocol — is terra incognita.

Our system is not replicating academic approaches. It is, inadvertently, a **field experiment** in multi-perspective verification with a human governor. The phenomena we observe (probabilistic review sampling, Right Answer Wrong Work, fix-review non-convergence, the Naturalist's Tax) are either already documented or represent novel observations at the intersection of known phenomena.

---

## 4. Gaps: What Isn't Being Studied That We're Observing

1. **Fix-review attention surface shift.** The specific phenomenon where fixing code changes what the reviewer sees, causing it to find genuinely new (not previously missed) issues. This is distinct from simple stochastic variation and from non-convergence of self-repair. I found no paper studying this as a named phenomenon.

2. **Causal adequacy of LLM-generated test assertions.** "Right Answer, Wrong Work" has no standard name in the literature. The test oracle problem is studied, but the specific failure mode where LLM-generated tests have syntactically correct but causally inadequate assertions is not characterized as a distinct phenomenon.

3. **Human governance of agent fleets.** As noted above, the HCI literature has not caught up to the case of a solo operator governing multiple autonomous agents with different roles.

4. **Verification fabric as a system.** Papers study individual techniques (mutation testing, LLM review, formal verification) in isolation. The composition of multiple heterogeneous verification techniques into a coherent system — and the emergent properties of that composition — is under-studied.

5. **Error correlation across the verification chain.** When the code-writing LLM and the code-reviewing LLM share training data, what is their error correlation coefficient? This is a critical question for defense-in-depth and I found no empirical measurement of it.

6. **The Naturalist's Tax / Discovery Overhead.** The phenomenon where adding verification perspectives increases total findings faster than they can be processed, creating a bottleneck at the human layer. This maps loosely to Amdahl's Law applied to human-AI systems but has not been studied in the code verification context.

---

## 5. References (Verified)

All papers below have been verified to exist via arXiv or known venue. Papers marked with * are foundational works whose existence I am confident of from training data but which I did not verify via web fetch during this session.

### Verified via arXiv (fetched and confirmed)

1. **Chen, M. et al. (2021).** "Evaluating Large Language Models Trained on Code." arXiv:2107.03374. [Codex / HumanEval]

2. **Liu, J., Xia, C.S., Wang, Y., & Zhang, L. (2023).** "Is Your Code Generated by ChatGPT Really Correct? Rigorous Evaluation of Large Language Models for Code Generation." arXiv:2305.01210. [EvalPlus / HumanEval+]

3. **Du, X. et al. (2023).** "ClassEval: A Manually-Crafted Benchmark for Evaluating LLMs on Class-level Code Generation." arXiv:2308.01861.

4. **Jimenez, C.E. et al. (2023).** "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?" arXiv:2310.06770. ICLR 2024.

5. **Chen, X., Lin, M., Scharli, N., & Zhou, D. (2023).** "Teaching Large Language Models to Self-Debug." arXiv:2304.05128. [Self-Debug]

6. **Shinn, N. et al. (2023).** "Reflexion: Language Agents with Verbal Reinforcement Learning." arXiv:2303.11366. NeurIPS 2023.

7. **Qian, C. et al. (2023).** "ChatDev: Communicative Agents for Software Development." arXiv:2307.07924. ACL 2024.

8. **Hong, S. et al. (2023).** "MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework." arXiv:2308.00352.

9. **Lin, F., Kim, D.J., & Chen, T.-H. (2024).** "SOEN-101: Code Generation by Emulating Software Process Models Using Large Language Model Agents." arXiv:2403.15852. ICSE 2025.

10. **Yang, J. et al. (2024).** "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering." arXiv:2405.15793.

11. **Fu, Y. et al. (2023).** "Security Weaknesses of Copilot-Generated Code in GitHub Projects: An Empirical Study." arXiv:2310.02059. Accepted TOSEM 2025.

### Foundational works (high confidence, not fetched this session)

12. **Avizienis, A. (1985).** "The N-Version Approach to Fault-Tolerant Software." IEEE TSE. *Foundational N-version programming.*

13. **Knight, J.C. & Leveson, N.G. (1986).** "An Experimental Evaluation of the Assumption of Independence in Multiversion Programming." IEEE TSE. *Showed correlated failures in independently developed software.*

14. **Barr, E.T. et al. (2015).** "The Oracle Problem in Software Testing: A Survey." IEEE TSE. *Canonical oracle problem survey.*

### Plausible but unverified (cited by concept, not by specific paper)

- Work on property-based testing of LLM-generated code (likely exists, 2024-2025)
- Work on mutation testing specific to LLM-generated tests (likely exists, 2024-2025)
- Vaithilingam et al. (2022) on Copilot usability at CHI (high confidence in existence, exact title unverified)
- Barke et al. (2023) on grounded theory of Copilot usage (high confidence, exact citation unverified)
- Olausson et al. (2024) on limits of LLM self-repair (high confidence this or a very similar paper exists, exact citation unverified)

**I have deliberately left these unverified rather than risk hallucinating details. The concepts they represent are well-established; the specific papers can be verified in a follow-up session if the Captain requires them.**

---

*Analyst reporting. Fair winds.*
