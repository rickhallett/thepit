# Lexicon Convergence Analysis: Naval Governance vs. Established SWE Methodology

**Date:** 2026-03-10
**Author:** Analyst (polecat dispatch)
**Purpose:** Map every naval lexicon term to its closest SWE/methodology equivalent. Assess coverage, novelty, and credibility implications.

---

## Methodology

Each term from the compressed lexicon (AGENTS.md v0.25) is mapped against nine source domains: Agile/Scrum/Kanban, DevOps/SRE, SWE management, Extreme Programming, Lean/Toyota Production System, systems thinking/cybernetics, cognitive science/distributed cognition, reliability engineering, and mathematical/economic concepts. Confidence ratings: HIGH (direct, well-established equivalent), MEDIUM (close but semantically incomplete), LOW (no good equivalent; genuinely novel or domain-specific). Recommendations: ADOPT (use the SWE term), KEEP (naval term captures something SWE lacks), MERGE (combine), RETIRE (redundant or confusing).

---

## Term-by-Term Mapping

### Authority & Handoff

#### 1. conn — decision authority, one holder, transfer explicit

**SWE equivalents:**
- **RACI matrix — "Accountable" role** (SWE management). The RACI model (Smith & Erwin, 2005) assigns exactly one Accountable person per decision. Transfer requires explicit reassignment.
- **Tech Lead / DRI (Directly Responsible Individual)** (Apple/SWE management). Apple's DRI concept, widely adopted in tech, assigns a single named individual per initiative. Transfer is explicit.
- **Scrum Product Owner** (Agile). The PO has final authority over backlog decisions. Authority is singular and non-shared.
- **Incident Commander** (SRE, PagerDuty incident response). During incidents, one person holds command authority. Handoff follows a protocol: "I am handing command to [name]. [Name], do you accept command?"

**Confidence:** HIGH. The DRI concept is an almost exact mapping. The incident commander handoff protocol is structurally identical to the conn transfer.

**Gap analysis:** "Conn" bundles two things that SWE separates: (1) who has decision authority, and (2) the transfer protocol. DRI names the role; incident command names the handoff. The naval term compresses both, which is efficient within the project but obscures the distinction for outsiders. The SWE versions are more granular — you can have a DRI without a formal handoff protocol, or a handoff protocol without naming the role "DRI."

**Recommendation:** ADOPT. Use "DRI" for the role, "handoff protocol" for the transfer. Both are instantly recognisable to any SWE audience.

---

#### 2. standing_order — persists across watches, obey without restatement

**SWE equivalents:**
- **Architectural Decision Records (ADRs)** (Nygard, 2011). Durable, immutable decisions that persist across team rotations. "We decided X and the decision holds until superseded."
- **Team working agreements** (Agile). Persistent norms that don't need re-establishing each sprint.
- **Runbooks / Standard Operating Procedures** (DevOps/SRE). Persistent operational rules executed without requiring re-approval.
- **Policy as Code** (DevOps). Infrastructure rules that are enforced automatically and persist across deployments. HashiCorp Sentinel, OPA (Open Policy Agent).

**Confidence:** HIGH. ADRs are the closest structural equivalent — immutable, numbered, persistent.

**Gap analysis:** The naval term adds the flavour of "obey without restatement," which ADRs don't inherently carry. An ADR can be ignored in practice. A standing order, in the naval metaphor, carries the weight of authority. But this is a cultural enforcement distinction, not a structural one. The real enforcement mechanism in this project is the gate, not the naming convention.

**Recommendation:** ADOPT. Use "ADR" or "standing policy." The immutability and numbering scheme (SD-nnn) already follows ADR convention almost exactly.

---

#### 3. watch — domain monitoring, operator's authority, delegatable

**SWE equivalents:**
- **Code ownership / CODEOWNERS** (GitHub). Designated responsibility for a domain of code. Delegatable. Implies review authority.
- **On-call rotation** (SRE, PagerDuty). Responsibility for monitoring a domain during a defined period.
- **Domain steward** (Domain-Driven Design, Evans 2003). Ownership of a bounded context.

**Confidence:** HIGH. Code ownership + on-call is a direct mapping.

**Gap analysis:** "Watch" conflates monitoring responsibility with decision authority. In SRE, on-call implies monitoring responsibility but not unilateral decision authority — that requires escalation. CODEOWNERS implies review authority but not monitoring. The naval term bundles both, which works for a single-human project but would not scale.

**Recommendation:** ADOPT. Use "code ownership" for the domain responsibility and "on-call" for the monitoring aspect. Splitting them would actually increase precision.

---

#### 4. officer_watch — watch + operator's delegated authority + SOs + escalate

**SWE equivalents:**
- **On-call with escalation policy** (SRE). On-call engineer operates within runbooks, escalates outside scope.
- **Delegated authority with guardrails** (SWE management). A tech lead operating within agreed architectural constraints.
- **Scrum Master** (Agile). Facilitates within defined process boundaries, escalates impediments.

**Confidence:** HIGH. "On-call with escalation policy" is structurally identical.

**Gap analysis:** None significant. The mapping is clean.

**Recommendation:** ADOPT. "On-call with escalation policy" or "delegated authority with guardrails."

---

### Navigation & Orientation

#### 5. true_north — objective that doesn't drift

**SWE equivalents:**
- **Product vision / North Star metric** (product management, Cutler 2018). A single metric or statement that guides all product decisions. Amplitude, Spotify, and others use "North Star" explicitly.
- **Mission statement** (general management).
- **OKR — the "O"** (Objectives and Key Results, Doerr 2018). The Objective is the qualitative, inspirational direction.

**Confidence:** HIGH. "North Star metric" is used in exactly this sense across product management. The naming is almost identical.

**Gap analysis:** "True North" and "North Star metric" are functionally identical. The project's version adds `truth >> hiring` as a constraint that resolves conflicts between the goal and the path, which is a values statement, not a navigation concept. OKRs handle this more precisely — the Objective is the direction, the Key Results are the measurable targets, and constraints can be separately stated.

**Recommendation:** ADOPT. "North Star" is the established term. A technical audience will recognise it instantly. The `truth >> hiring` constraint is a values statement that can stand on its own without the metaphor.

---

#### 6. bearing — direction to target, how dialled in

**SWE equivalents:**
- **Alignment check** (Agile/general). "Are we aligned on the goal?"
- **Sprint goal adherence** (Scrum). Tracking whether current work serves the sprint goal.
- **OKR check-in** (OKR methodology). Periodic assessment of progress toward objectives.

**Confidence:** MEDIUM. The concept of "how aligned are we to our goal right now" exists across frameworks but is not typically a single named concept. It is usually expressed as a check or ceremony (retrospective, check-in) rather than a continuous state variable.

**Gap analysis:** The naval term treats bearing as a continuous, measurable state. SWE frameworks treat alignment as something you check periodically (retro, standup) rather than something you instrument continuously. The naval framing is arguably better for a single-person project where the risk of drift is real and continuous. In team settings, the ceremony-based approach works because the ceremonies enforce the check. For agentic workflows where an AI can drift between human interactions, a continuous concept may be needed.

**Recommendation:** MERGE. Use "alignment" as the concept but retain the idea of it being a continuous state, not just a periodic check. "Alignment drift" is an established term that captures the degradation.

---

#### 7. dead_reckoning — navigate from last known position when visibility is lost

**SWE equivalents:**
- **Disaster recovery / DR runbook** (SRE). Procedures for recovering from a loss of system state.
- **State recovery protocol** (distributed systems). Restoring system state from the last known checkpoint.
- **Git bisect / last known good** (SWE). Finding the last known good state to recover from a regression.
- **Checkpoint/restart** (distributed computing). Periodic state snapshots enabling recovery from failures.

**Confidence:** MEDIUM. The concept maps to DR/recovery, but dead reckoning specifically describes *operating with degraded situational awareness*, not just recovering. It's the navigation between the failure and the recovery — the period where you're working from stale information and know it.

**Gap analysis:** SWE has strong concepts for recovery (DR, checkpoints) but weaker language for the intermediate state of "operating with known-degraded awareness." The closest is probably "degraded mode" from SRE (operating with reduced capability). The dead reckoning protocol in this project is specifically about context window recovery — a problem unique to agentic workflows. The general concept has SWE equivalents; the specific application does not.

**Recommendation:** MERGE. Use "state recovery from checkpoint" for the mechanism. The concept of "operating in degraded mode from last checkpoint" is established in SRE. The specific application to context window recovery is novel.

---

#### 8. tacking — progress against the wind, indirect but forward

**SWE equivalents:**
- **Spike** (XP/Agile). Time-boxed investigation that doesn't directly produce deliverable code but reduces uncertainty, enabling forward progress.
- **Iterative refinement** (general SWE). Making progress through successive approximation rather than direct implementation.
- **Pivoting** (Lean Startup, Ries 2011). Changing direction while preserving what has been learned.
- **Yak shaving** (MIT/SWE culture). Doing a seemingly unrelated task that is necessary to unblock the real task. Though yak shaving has negative connotations — tacking does not.

**Confidence:** MEDIUM. "Spike" captures the time-boxed investigation aspect. "Pivot" captures the direction change. Neither captures the specific nuance of "indirect progress that is still progress toward the same goal" — where each tack is purposeful and the overall trajectory is forward. The closest might be "indirection" in the architectural sense (adding a layer of abstraction to solve a problem), but that's a stretch.

**Gap analysis:** The naval term captures a specific emotional/strategic state: we look like we're going sideways, but the course over ground is forward. This is a communication tool more than a methodology concept. It manages expectations about apparent lack of progress. SWE doesn't have a single word for "we're making indirect progress and that's the plan, not a failure." "Spike" is close but implies uncertainty resolution, not strategic indirection.

**Recommendation:** KEEP. The concept of purposeful indirection that is distinct from waste, distinct from pivoting, and distinct from spiking is genuinely useful for communicating with stakeholders (or agents). SWE methodology doesn't have a crisp single term for this.

---

### Operational Tempo

#### 9. full_sail — max velocity, high risk, weave thin

**SWE equivalents:**
- **Crunch / sprint (colloquial)** — maximum velocity with known sustainability cost.
- **High WIP / no WIP limits** (Kanban anti-pattern). Running at maximum throughput with minimal controls.
- **Velocity spike** (Agile). A period where velocity increases above sustainable pace, typically at a cost.

**Confidence:** MEDIUM. The concept of "going fast with thin safety margins" exists as a recognised anti-pattern (crunch, exceeding WIP limits) rather than as a deliberate tempo choice. This is a key distinction: the naval term frames this as a *conscious decision* with known trade-offs, not a failure of discipline.

**Gap analysis:** SWE methodology tends to frame high-velocity-low-safety as a failure state (Kanban: WIP limit violation; Agile: unsustainable pace). The naval term frames it as a deliberate command decision with known costs. This is philosophically closer to the **risk budget / error budget** concept from SRE (Beyer et al., *Site Reliability Engineering*, O'Reilly, 2016): you have a finite error budget, and you can choose to spend it on velocity.

**Recommendation:** MERGE. "Running down the error budget" or "spending the risk budget" is the SRE way of saying the same thing, with the advantage of being quantifiable.

---

#### 10. making_way — forward progress under discipline, default state

**SWE equivalents:**
- **Sustainable pace** (XP, Beck 1999). The default tempo at which a team can work indefinitely without degradation.
- **Steady state** (SRE). Normal operational tempo with all SLOs met.
- **Flow state** (Kanban, Anderson 2010). Work moving through the system at a sustainable, predictable rate.

**Confidence:** HIGH. "Sustainable pace" from XP is a direct equivalent. It was one of XP's original twelve practices.

**Gap analysis:** None significant. The mapping is clean.

**Recommendation:** ADOPT. "Sustainable pace" (XP) or "steady state" (SRE). Both are well-understood.

---

#### 11. drifting — no control, no bearing, opposite of making way

**SWE equivalents:**
- **Scope creep** (project management). Uncontrolled expansion of project scope.
- **Thrashing** (SWE/OS). Switching between tasks without making progress on any.
- **Drift** (SRE). Configuration or process divergence from the intended state. "Configuration drift" is an established SRE term.
- **Entropy** (systems thinking). Increasing disorder in a system without active maintenance.

**Confidence:** HIGH. "Drift" is already an established SWE/SRE term with essentially the same meaning.

**Gap analysis:** The naval term adds the distinction between drifting (unintentional) and heave-to (deliberate stop). SWE uses "drift" for the unintentional case but doesn't have a clean antonym that means "deliberately not moving."

**Recommendation:** ADOPT. "Drift" is already the word. Configuration drift, alignment drift, scope drift — all established.

---

#### 12. heave_to — deliberate stop, hold position

**SWE equivalents:**
- **Freeze** (release management). Code freeze, feature freeze — deliberate halt to changes.
- **Stabilisation period** (SWE management). Deliberate period of no new features, only fixes.
- **Stop the line / Andon cord** (Lean/Toyota). Deliberate production halt when a quality issue is detected. Taiichi Ohno's Toyota Production System (1988).

**Confidence:** HIGH. "Stop the line" from Toyota/Lean is a direct equivalent. The andon cord is the mechanism; the act of pulling it is the command. Code freeze is the release management version.

**Gap analysis:** "Stop the line" carries the same connotation: deliberate, authorised, quality-driven. The difference is that andon is typically reactive (defect detected) while heave-to can be proactive (uncertainty ahead). "Code freeze" captures the proactive case.

**Recommendation:** ADOPT. "Stop the line" for reactive, "freeze" for proactive. Both well-established.

---

#### 13. beat_to_quarters — emergency, everything stops, stations

**SWE equivalents:**
- **Incident response / SEV-1** (SRE). All-hands emergency response. Defined severity levels, defined roles, defined communication channels.
- **War room** (SWE management). Emergency response mode where all relevant parties are assembled.
- **P0 / Sev-0** (Google/SRE). The highest severity level, requiring immediate response from all available engineers.

**Confidence:** HIGH. SEV-1/P0 incident response is an exact mapping.

**Gap analysis:** None. SRE has this thoroughly covered with incident severity levels, incident commander role, communication templates, and post-incident review.

**Recommendation:** ADOPT. "SEV-1" or "P0 incident." Every SWE professional recognises these.

---

### Integrity & Verification

#### 14. hull — gate, tests, typecheck; survival not optimisation

**SWE equivalents:**
- **CI/CD pipeline / build gate** (DevOps). The automated checks that must pass before code can merge.
- **Definition of Done (DoD)** (Scrum). The minimum criteria for "done" that are non-negotiable.
- **Quality gate** (general SWE). A checkpoint in the development process that enforces minimum quality standards.
- **Poka-yoke** (Lean/Toyota, Shingo 1986). Error-proofing mechanisms built into the process that prevent defects rather than detecting them.

**Confidence:** HIGH. "CI/CD pipeline" or "quality gate" is a direct equivalent.

**Gap analysis:** The naval term adds the philosophical distinction between "survival" (the hull) and "optimisation" (everything else). This maps to the Lean concept of **muda** (waste): the hull is the value-adding work that must exist; everything else must justify itself against the hull. The poka-yoke mapping is interesting — the hull is a poka-yoke at the process level, preventing defective code from reaching production. The SWE terms are more precise but lack the emotional weight of "the thing keeping us alive."

**Recommendation:** ADOPT. "Quality gate" or "CI pipeline." Add the Lean framing if you want to communicate the survival/optimisation distinction: "The gate is our poka-yoke."

---

#### 15. on_point — convention, convergence, and verification aligning

**SWE equivalents:**
- **Coherence** (systems thinking). System components working together harmoniously.
- **Technical alignment** (SWE management). Code, architecture, and team practices all pointing in the same direction.
- **Flow efficiency** (Kanban). The ratio of active work time to total time, indicating system health.

**Confidence:** LOW. This is a gestalt observation about system health — the feeling when everything is working together. SWE doesn't have a single term for this. The closest is probably the cybernetics concept of **homeostasis** (Cannon, 1932; Beer, 1972) — a system maintaining itself in a viable state through feedback loops. Or the concept of **congruence** from organisational development (Nadler & Tushman, 1980) — alignment between strategy, structure, people, and processes.

**Gap analysis:** "On point" describes a phenomenological state more than a measurable condition. SWE can measure alignment (test coverage, linting pass rate, deployment frequency) but doesn't have a word for the subjective observation that everything is clicking. This is a "taste-required" assessment — it cannot be automated.

**Recommendation:** KEEP. This is a genuinely useful concept for human-AI workflows where the human needs a word for "the system is cohering." None of the SWE terms capture the subjective quality. Note, however, that presenting this to a technical audience will require explanation — it's an observation, not a metric.

---

#### 16. staining — applying diagnostic from one context to another to reveal hidden structure

**SWE equivalents:**
- **Cross-cutting concern analysis** (Aspect-Oriented Programming, Kiczales et al. 1997). Applying a concern (security, logging) across multiple modules to reveal patterns.
- **Mutation testing** (DeMillo et al. 1978). Applying systematic perturbations to code to reveal weaknesses in the test suite.
- **Static analysis with custom rules** (SWE). Applying a taxonomy of known defects to new code.
- **Linting with custom rulesets** (DevOps). Applying an externally defined pattern set to reveal violations.
- **Failure Mode and Effects Analysis (FMEA)** (Reliability engineering). Applying a structured failure taxonomy to a system design to reveal vulnerabilities.
- **Transfer learning** (ML). Applying knowledge gained in one context to a different context.

**Confidence:** MEDIUM. FMEA is the closest structural mapping — you take a taxonomy of failure modes and apply it systematically to a new artifact. Custom static analysis rules are the tooling equivalent. The philosophical source (Gadamer's fusion of horizons, *Truth and Method*, 1960) doesn't have a SWE equivalent because SWE doesn't generally engage with hermeneutics.

**Gap analysis:** The naval term bundles the mechanism (applying a taxonomy) with the epistemological claim (the stain reveals structure that was already there). FMEA captures the mechanism. Static analysis captures the tooling. Neither captures the epistemological claim, but the epistemological claim is also not operationally necessary — what matters is whether applying the taxonomy finds defects, not whether those defects were "already there" in a philosophical sense.

**Recommendation:** ADOPT. "FMEA" or "custom static analysis" for the mechanism. The Gadamer reference adds theoretical depth for academic audiences but is unnecessary for engineering communication. The darkcat is operationally an FMEA applied via LLM.

---

#### 17. knows_the_line — agent attuned to vessel style, crew values

**SWE equivalents:**
- **Domain expertise / tribal knowledge** (SWE management). Knowledge of project-specific conventions that can't be fully documented.
- **Acculturation** (organisational psychology, Schein 2010). The process by which a new team member absorbs the team's culture and norms.
- **Tacit knowledge** (Polanyi, 1966). Knowledge that is difficult to articulate in explicit form.

**Confidence:** MEDIUM. "Tacit knowledge" captures the concept but is a knowledge type, not an agent state. There's no established SWE term for "this agent/person has absorbed enough tacit knowledge to operate autonomously within our norms."

**Gap analysis:** In human teams, this is just "experience" — you know when someone has been on the team long enough to operate independently. For AI agents, where tacit knowledge must be explicitly encoded into context, this concept is novel. The term identifies something that LLM context engineering must solve: how do you encode project-specific norms so the agent operates correctly without explicit instruction for every case?

**Recommendation:** KEEP for the agentic context. In human-team contexts, this is just "onboarded" or "experienced." For AI agents, the concept of an agent having absorbed sufficient context to match project norms without per-instruction guidance is genuinely specific to this domain.

---

### Communication & Record

#### 18. muster — O(1) binary decision table

**SWE equivalents:**
- **Decision matrix** (general management). A table of options with criteria for evaluation.
- **Triage table** (SRE/incident response). Prioritised list of issues requiring yes/no decisions.
- **Checklist** (Gawande, *The Checklist Manifesto*, 2009). A structured list enabling systematic verification.

**Confidence:** HIGH. Decision matrix / triage table is a direct equivalent.

**Gap analysis:** The muster format is specifically optimised for asymmetric review: one party (the agent) prepares the table with defaults, the other party (the human) makes O(1) decisions per row. This is a UX optimisation for human-AI interaction. Standard decision matrices don't specify who prepares vs. who decides. The muster is essentially a decision matrix with a built-in RACI (agent = Responsible for preparation, human = Accountable for decision).

**Recommendation:** ADOPT. "Decision matrix with defaults" or "triage table." The O(1) review property is a UX insight, not a naming problem.

---

#### 19. fair_winds — closing signal

**SWE equivalents:**
- No direct equivalent. This is a social/cultural convention, not a methodology concept.

**Confidence:** N/A. This is a social convention, not a governance concept. Including it in a credibility analysis would be like evaluating whether "LGTM" on a PR review needs a methodology citation.

**Recommendation:** RETIRE from the governance lexicon. It's a social nicety, not an operational concept. Its presence in the lexicon inflates the term count without adding operational value.

---

#### 20. extra_rations — operator's commendation, rare, logged

**SWE equivalents:**
- **Kudos / shout-outs** (team culture). Recognition of exceptional work.
- **Performance annotation** (SWE management). Documented recognition of above-expectations work.

**Confidence:** HIGH. This is a recognition mechanism. Every team has one.

**Recommendation:** RETIRE from the governance lexicon. Team recognition practices don't need to be in a governance framework.

---

#### 21. polecats — one-shot agents, not interactive

**SWE equivalents:**
- **Batch jobs / workers** (DevOps). Fire-and-forget processes that execute a task and terminate.
- **Serverless functions / Lambda** (cloud architecture). Stateless, single-invocation compute units.
- **CI pipeline stages** (DevOps). Independent, stateless steps in a build pipeline.
- **Minions** (Stripe internal terminology, as acknowledged in the lexicon).

**Confidence:** MEDIUM. The concept of a stateless, one-shot worker is well-established. The specific application to LLM agents executing in a Makefile pipeline with fresh context is novel in implementation but not in architecture. These are CI pipeline stages where the executor is an LLM rather than a build tool.

**Gap analysis:** The novel element is not the architectural pattern (fire-and-forget workers are well-understood) but the specific insight that fresh context eliminates the drift problems that plague long-running agent sessions. The polecat is a CI stage that solves L9 anchoring by construction. This insight — using stateless architecture to solve a cognitive bias problem — is worth communicating, but the mechanism is just "stateless workers in a pipeline."

**Recommendation:** MERGE. "Stateless agent pipeline" or "one-shot agent workers" for the mechanism. The insight about context freshness eliminating drift is worth articulating separately.

---

#### 22. darkcat — adversarial review polecat

**SWE equivalents:**
- **Adversarial review / red team** (security engineering). Independent review specifically looking for defects the author couldn't see.
- **Mutation testing** (DeMillo et al. 1978). Automated adversarial testing of test suite quality.
- **FMEA / fault injection** (reliability engineering). Systematic search for failure modes.
- **Devil's advocate review** (decision science). Assigned role of challenging the consensus.

**Confidence:** HIGH. "Automated adversarial review" or "red team review" is a direct mapping.

**Gap analysis:** The darkcat is specifically a *stateless adversarial reviewer using a custom defect taxonomy*. Red team reviews exist; the specific implementation (fresh-context LLM applying slopodar + foot guns to a diff) is an implementation detail, not a novel concept.

**Recommendation:** ADOPT. "Automated adversarial review" or "AI red team." The tooling is novel; the concept is not.

---

#### 23. darkcat_alley — 3-model cross-triangulation

**SWE equivalents:**
- **Multi-vendor security audit** (security engineering). Having multiple independent firms audit the same system.
- **N-version programming** (Avizienis, 1985). Running N independently developed implementations and comparing outputs. A reliability engineering technique.
- **Ensemble methods** (ML). Combining predictions from multiple models to reduce bias.
- **Triangulation** (research methodology, Denzin 1978). Using multiple methods/sources to validate findings.

**Confidence:** MEDIUM. N-version programming is the closest structural equivalent — different implementations reviewing the same artifact. The specific application (three LLM families reviewing a codebase diff with structured YAML output and numerical convergence analysis) has no established precedent because the tooling didn't exist until recently.

**Gap analysis:** The concept is "ensemble adversarial review with convergence analysis." Each piece exists in established methodology. The assembly is novel. N-version programming provides the theoretical justification (independent priors catch different bugs). The operational pipeline (structured YAML, convergence metrics, pre/post delta) is an engineering contribution.

**Recommendation:** MERGE. "Ensemble adversarial review" or "multi-model code review" for the concept. The pipeline tooling stands on its own.

---

#### 24. sortie — complete feature-to-commit cycle

**SWE equivalents:**
- **Feature lifecycle** (general SWE). The complete path from feature identification through implementation to deployment.
- **User story lifecycle** (Agile). Story → acceptance criteria → development → review → done.
- **Value stream** (Lean, Womack & Jones 1996). The complete sequence of activities required to deliver value. Value stream mapping is a core Lean practice.
- **Deployment pipeline** (Continuous Delivery, Humble & Farley 2010). The automated path from commit to production.

**Confidence:** HIGH. "Value stream" or "feature lifecycle" captures this directly.

**Gap analysis:** The sortie adds the ROI-bounded iteration loop (dev + darkcat cycles continue until marginal value drops below marginal cost). This is the **diminishing returns** concept from economics (Marshall, 1890) applied to review cycles. Lean has this as **kaizen** with a stopping condition — you improve until the cost of the next improvement exceeds its value. The sortie also bundles spec-before-dev (which is just "design docs" or "RFC first") and optional human QA (which is just "acceptance testing"). The individual pieces are all established; the assembly with the ROI gate on review iterations is a useful formalisation.

**Recommendation:** ADOPT. "Value stream with ROI-bounded review cycles." The ROI gate concept is the novel contribution; the rest is standard feature lifecycle.

---

#### 25. gauntlet — full verification pipeline

**SWE equivalents:**
- **Quality gates pipeline** (DevOps). A series of automated and manual checks that must pass before release.
- **Release checklist** (SWE management). Ordered list of verification steps before deployment.
- **Continuous Delivery pipeline** (Humble & Farley 2010). Automated progression through build, test, staging, and production gates.

**Confidence:** HIGH. This is a quality gates pipeline with a specific configuration.

**Recommendation:** ADOPT. "Quality gates pipeline" or "release verification pipeline." The specific stages are configuration, not concept.

---

#### 26. DONE — gate green + darkcat{3} + synth + pitkeel + walkthrough

**SWE equivalents:**
- **Definition of Done (DoD)** (Scrum Guide, Schwaber & Sutherland 2020). Explicit, shared definition of what constitutes "done."

**Confidence:** HIGH. This is literally a Definition of Done.

**Recommendation:** ADOPT. "Definition of Done" with the specific criteria listed.

---

#### 27. prime_context — minimum context for smart zone

**SWE equivalents:**
- **Least privilege** (security, Saltzer & Schroeder 1975). Give each component the minimum access it needs.
- **Need-to-know basis** (security/military). Information restricted to what's necessary for the task.
- **Interface segregation principle** (SOLID, Martin 2000). Clients should not be forced to depend on interfaces they do not use.
- **Minimal viable context** — not an established term, but follows the "minimum viable X" pattern from Lean Startup.

**Confidence:** MEDIUM. "Least privilege" captures the access-control dimension. "Interface segregation" captures the information-boundary dimension. Neither is typically applied to LLM context engineering, but the principles transfer directly.

**Gap analysis:** The specific application — determining what goes into an LLM's context window to keep it in the "smart zone" (adequate context without saturation) — is novel in the agentic AI domain. The underlying principle (minimise inputs to what's necessary) is foundational to both security and software architecture. The term "prime context" names a new application of an old principle.

**Recommendation:** MERGE. "Minimal context / least-privilege context" for the principle. The specific application to LLM context engineering is worth naming because it's a key operational concern that doesn't have an established term in the agentic AI space.

---

#### 28. learning_wild — discovery while doing work is worth more than the work

**SWE equivalents:**
- **Serendipitous discovery** (research methodology). Finding valuable things you weren't looking for.
- **Emergent requirements** (Agile). Requirements that emerge from the development process itself.
- **Double-loop learning** (Argyris & Schon, 1978). Learning that changes the governing variables, not just the behaviour within existing variables. The work changes the theory, not just the output.
- **Spike outcomes** (XP). A spike whose investigation yields insights that reshape the approach.

**Confidence:** MEDIUM. Double-loop learning is the closest formal concept — the idea that the meta-learning (changing your mental model) is more valuable than the object-level learning (completing the task).

**Gap analysis:** The naval term specifically identifies the *economic inversion*: the byproduct exceeds the product in value. Double-loop learning describes the mechanism but doesn't name the economic observation. The concept is well-known in research methodology (Fleming's penicillin, Post-It notes at 3M) but doesn't have a single established engineering term.

**Recommendation:** KEEP. "Learning in the wild" is a clear, intuitive phrase for the observation that process insights outweigh deliverables. "Double-loop learning" is the academic backing, but the naval term communicates the economic inversion better.

---

#### 29. echo / check_fire — compress understanding into Signal before acting

**SWE equivalents:**
- **Readback** (aviation, CRM — Crew Resource Management, Helmreich et al. 1999). Repeating an instruction back to confirm understanding before acting. A standard safety protocol in aviation, medicine, and nuclear operations.
- **Confirmation dialogue** (UX). Confirming an action before execution.
- **Contract testing** (SWE). Verifying that both sides agree on the interface before proceeding.

**Confidence:** HIGH. "Readback" from aviation CRM is a near-exact equivalent. It's well-documented, well-studied, and well-understood in safety-critical domains.

**Gap analysis:** The naval term adds Signal compression (compressing the readback into a formal notation), which is a project-specific convention. The readback concept is established; the compression format is implementation detail.

**Recommendation:** ADOPT. "Readback" (CRM). This is one of the strongest mappings in the entire lexicon — the practice is identical and the aviation/medical literature on readback effectiveness is extensive.

---

#### 30. log_that / scrub_that / mint — durable record operations

**SWE equivalents:**
- **Commit** (git). Creating a durable, immutable record.
- **ADR creation** (SWE management). Creating a new architectural decision record.
- **Audit log entry** (DevOps/security). Appending to an immutable log.
- **Append-only log** (distributed systems). An immutable, chronologically ordered record.

**Confidence:** HIGH. These are basic record-keeping operations with well-established equivalents.

**Recommendation:** RETIRE as named lexicon terms. "Create an ADR," "append to the log," "amend the record" are standard operations that don't need project-specific names.

---

### Spaces & Registers

#### 31. quarterdeck — command register, formal, orders

#### 32. wardroom — thinking space, exploratory

#### 33. below_decks — subagent execution, not main thread

#### 34. main_thread — operator to agent direct, protected

**SWE equivalents (grouped because they form a system):**
- **Communication channels / forums** (SWE management). Teams naturally separate command channels (Slack #incidents), discussion channels (#architecture), and work channels (#dev-team-alpha).
- **Registers / communication modes** (linguistics, Halliday 1978). Formal, informal, technical registers exist in all professional communication.
- **Contexts / environments** (DevOps). Production, staging, development — each with different rules and permissions.
- **Main thread vs. background workers** (concurrent programming). The protected execution context vs. delegated work.
- **Synchronous vs. asynchronous communication** (distributed systems / team practices). Direct (main thread) vs. fire-and-forget (below decks).

**Confidence:** MEDIUM. The individual concepts (formal vs. informal channels, main thread vs. workers, sync vs. async) are all well-established. The innovation is naming them as a *coherent system of registers* for human-AI communication, where the register determines both the communication style and the decision authority.

**Gap analysis:** SWE has all the pieces but doesn't assemble them into a named system. Slack channels approximate this — you behave differently in #incidents than in #watercooler — but there's no formal name for the register system as a governance mechanism. The naval naming adds clarity about expectations: quarterdeck means formal decisions; wardroom means exploratory thinking. The SWE equivalent is "context-appropriate communication norms," which is less memorable.

**Recommendation:** MERGE. The concept of explicit communication registers is useful. The naval names are evocative within the project but would not transfer to a general audience. Consider "decision mode / exploration mode / execution mode" as a more transparent taxonomy. Or simply "formal / informal / delegated" channels.

---

#### 35. clear_decks — force compaction, confirm durable writes

**SWE equivalents:**
- **Graceful shutdown** (systems engineering). Ensuring all in-flight operations complete and state is persisted before termination.
- **Checkpoint and terminate** (distributed computing). Saving state before stopping a process.
- **"Save all and close"** (UX). The universal pre-shutdown pattern.

**Confidence:** HIGH. Graceful shutdown with state persistence is a well-established pattern.

**Recommendation:** ADOPT. "Graceful shutdown" or "checkpoint and terminate." These are immediately understood.

---

### Weave Modes

#### 36. tight / loose / extra_tight — communication density modes

**SWE equivalents:**
- **Verbosity levels** (logging). DEBUG, INFO, WARN, ERROR — different levels of detail for different situations.
- **Communication protocols** (distributed systems). Different protocols for different reliability requirements (UDP vs TCP vs gRPC).
- **DEFCON levels** (military/analogical). Graduated alert levels with corresponding response protocols.

**Confidence:** MEDIUM. The concept of graduated communication modes exists, but applying it to human-AI communication density is novel. Log verbosity is the closest analogue — you don't want DEBUG in production, and you don't want ERROR-only during development.

**Gap analysis:** Weave modes combine two things: (1) the communication density (how much the agent says) and (2) the decision authority (who decides). Log levels control only verbosity. DEFCON levels control only alert posture. The weave mode is a compound concept.

**Recommendation:** MERGE. "Communication mode" with defined levels. The compound nature (verbosity + authority) is a useful formalisation for agentic workflows that doesn't exist elsewhere.

---

### Iteration & Tempo

#### 37. HOTL — human out the loop, machine speed

**SWE equivalents:**
- **Fully automated CI/CD** (DevOps). Automated pipeline where human intervention is not required for standard deployments.
- **Autonomy level classification** (SAE J3016, autonomous vehicles). Levels 0-5 of automation, with Level 5 being full autonomy.
- **Jidoka (automation with human touch)** (Toyota, Ohno 1988). Automation that can stop itself when it detects a problem, with human intervention only at that point. This is exactly what HOTL describes: automated execution with human review at defined checkpoints.

**Confidence:** HIGH. Jidoka from Toyota is a strong mapping — automation runs at machine speed, stops on error, human intervenes only when needed. Fully automated CI/CD is the DevOps equivalent.

**Gap analysis:** HOTL as defined adds the health warning about cognitive deskilling from extended automation. Toyota's jidoka doesn't include this warning, but the automation literature does — Bainbridge's "Ironies of Automation" (1983) made exactly this point: the more reliable the automation, the less the human practices the skills needed to intervene when it fails.

**Recommendation:** ADOPT. "Automated pipeline with human review" or reference jidoka for the Lean-aware audience. The cognitive deskilling warning is already well-documented in Bainbridge (1983) and Parasuraman & Riley (1997).

---

#### 38. HODL — human grips the wheel, every step human

**SWE equivalents:**
- **Manual deployment / manual approval gates** (DevOps). Every step requires explicit human approval.
- **Pair programming** (XP, Beck 1999). Continuous human oversight of every line of code as it's written.
- **SAE Level 0-1** (autonomous vehicles). No automation or driver assistance only.
- **Four-eyes principle** (security/finance). Every action requires a second human to approve.

**Confidence:** HIGH. Manual approval gates in a deployment pipeline is a direct equivalent.

**Gap analysis:** None significant. The concept is well-established.

**Recommendation:** ADOPT. "Manual approval mode" or "human-in-the-loop at every step." The HODL name (a crypto community reference) adds no clarity for a SWE audience.

---

#### 39. verifiable — gate can check, automated, deterministic

#### 40. taste_required — not gate-checkable, human judgment only

**SWE equivalents (paired):**
- **Automated vs. manual testing** (SWE). The distinction between what can be tested by machines and what requires human judgment.
- **Objective vs. subjective quality attributes** (ISO 25010, software quality model). Functional correctness (verifiable) vs. usability/aesthetics (taste-required).
- **Type I vs. Type II decisions** (Bezos, 2016 Amazon shareholder letter). Reversible decisions (can be delegated) vs. irreversible decisions (require senior judgment).
- **Formal verification vs. code review** (SWE). Proving correctness mechanically vs. human assessment of design quality.

**Confidence:** HIGH. The automated/manual testing distinction is foundational to SWE. ISO 25010 formalises the quality attribute categories.

**Gap analysis:** The naval terms add the operational implication: verifiable → HOTL, taste-required → HODL. The SWE equivalents name the distinction but don't prescribe the tempo response. This linkage (type of quality → appropriate review mode) is useful and isn't typically made explicit in SWE methodology.

**Recommendation:** ADOPT. "Automatable vs. judgment-required" quality attributes. Link to ISO 25010 for credibility. The insight that the quality type should determine the review mode (automation vs. human) is worth stating explicitly.

---

### Error & Observation

#### 41. oracle_contamination — human error propagates unchecked

**SWE equivalents:**
- **Ground truth contamination** (ML/data science). Errors in labeled training data that propagate through the model.
- **Oracle problem** (testing theory, Weyuker 1982). When the test oracle itself is incorrect, tests pass while the system is wrong.
- **Byzantine fault** (distributed systems, Lamport et al. 1982). A component producing incorrect outputs that the system cannot detect through normal consensus mechanisms, because the faulty component appears to function correctly.
- **Specification error** (formal methods). When the specification itself is wrong, every implementation that correctly implements it is wrong.

**Confidence:** HIGH. "Oracle problem" from testing theory is an exact mapping. The term was coined by Weyuker (1982) and is well-established in formal testing methodology.

**Gap analysis:** The naval term specifies L12 (human) as the oracle and names the specific failure mode (human introduces error that cascades through automated verification). The testing theory concept is identical but more general (any oracle can be contaminated). The more general form is more useful.

**Recommendation:** ADOPT. "Oracle problem" or "ground truth contamination." Both are established, precise, and immediately understood by anyone with testing or ML background.

---

#### 42. naturalists_tax — discovery overhead saturates human attention

**SWE equivalents:**
- **Alert fatigue** (SRE/DevOps). Too many alerts degrade human response quality. Well-documented in SRE literature (Beyer et al. 2016) and medical literature (Ancker et al. 2017).
- **Information overload** (Simon, 1971). "A wealth of information creates a poverty of attention."
- **Amdahl's Law** (Amdahl, 1967). The parallel speedup is limited by the sequential fraction. As acknowledged in the lexicon, each additional source of information increases the sequential processing burden on the human.
- **Context switching cost** (cognitive science, Monsell 2003). Each additional information stream imposes a switching cost on the human processor.
- **Observation overhead** (general). The cost of monitoring exceeds the value of what's monitored.

**Confidence:** HIGH. "Alert fatigue" from SRE is a direct equivalent. The economic framing (each additional source imposes a sequential cost on the human) is Amdahl's Law applied to human attention.

**Gap analysis:** The naval term is more poetic but less precise than "alert fatigue." Alert fatigue is well-studied with known mitigations (alert deduplication, severity levels, suppression rules). The naval term adds the Amdahl's Law framing, which is a useful theoretical backing.

**Recommendation:** ADOPT. "Alert fatigue" for the phenomenon, "Amdahl's Law on human attention" for the theoretical framing. Both are well-established and precisely communicate the concept.

---

#### 43. model_triangulation — cross-model validation

**SWE equivalents:**
- **N-version programming** (Avizienis, 1985). Already mapped under darkcat_alley above.
- **Triangulation** (research methodology, Denzin 1978). Already mapped above.
- **Cross-validation** (statistics/ML). Validating results using held-out data or independent methods.
- **Independent verification and validation (IV&V)** (systems engineering, IEEE 1012). Having an independent team verify and validate a system.

**Confidence:** HIGH. IV&V from systems engineering is a direct equivalent. The term "triangulation" is already established in research methodology.

**Gap analysis:** The lexicon itself disclaims novelty: "The practice it describes — checking your work with a system that doesn't share your blind spots — is older than computing." This is correct. The application to multi-LLM workflows is new; the concept is not.

**Recommendation:** ADOPT. "Independent verification" or "cross-model validation." The disclaimer in the lexicon is honest and should be preserved.

---

### Quality & Process

#### 44. effort_backpressure — effort to contribute as implicit quality filter

**SWE equivalents:**
- **Barrier to entry** (economics, Bain 1956). Costs that must be borne by new entrants but not by existing participants.
- **Signal cost** (signaling theory, Spence 1973). The cost of producing a signal that is correlated with quality. A costly signal is credible; a free signal is not.
- **Proof of work** (distributed systems/crypto, Back 1997). Requiring computational effort as a quality filter for participation.
- **WIP limits** (Kanban, Anderson 2010). Limiting work-in-progress to create backpressure that improves flow and quality.

**Confidence:** HIGH. Spence's signaling theory is the exact economic framework. WIP limits from Kanban are the process equivalent — artificial constraints that improve quality by limiting throughput.

**Gap analysis:** The naval term applies signaling theory to a specific observation: AI eliminates the effort cost that previously filtered contributions. This is the same observation as "proof of work collapse" in open-source communities. The concept is well-established; the application to AI-generated code is timely but not novel in structure.

**Recommendation:** ADOPT. "Signaling cost collapse" or "effort barrier collapse." Reference Spence (1973) for the theory and Kanban WIP limits for the engineering response.

---

#### 45. interrupt_sovereignty — human controls review timing

**SWE equivalents:**
- **Asynchronous code review** (SWE practice). Reviews happen on the reviewer's schedule, not the author's.
- **Pull model** (Kanban/Lean). Work is pulled when capacity exists, not pushed when completed.
- **Do Not Disturb / Focus time** (team management). Protected time blocks where interruptions are not permitted.
- **Notification management** (DevOps/SRE). Controlling which events generate alerts and when.

**Confidence:** HIGH. The pull model from Kanban/Lean is a direct equivalent — the human pulls work for review when ready, rather than being pushed to review by agent completions.

**Gap analysis:** The naval term adds the philosophical backing (temporal asymmetry between human and model) and the productivity argument (interruptions destroy depth). Both are well-documented: Newport's *Deep Work* (2016) for the productivity argument, and the Kanban pull model for the process solution.

**Recommendation:** ADOPT. "Pull-based review" (Kanban) or "asynchronous review." The underlying principle is well-established.

---

#### 46. compound_quality — clean code improves future agent context

**SWE equivalents:**
- **Technical debt** (Cunningham, 1992). The inverse: poor code quality creates compounding costs. Compound quality is anti-technical-debt.
- **Broken windows theory** (Wilson & Kelling, 1982; pragmatic programmers). A clean codebase stays clean; a messy one attracts mess.
- **Virtuous cycle / positive feedback loop** (systems thinking). A self-reinforcing cycle where improvement begets improvement.
- **Kaizen** (Lean/Toyota, Imai 1986). Continuous improvement where each improvement enables the next.
- **Compound interest** (finance). Small improvements accumulating over time.

**Confidence:** HIGH. Technical debt (inverse), broken windows theory, and kaizen are all direct mappings. The compound quality concept is the positive case of what technical debt describes in the negative case.

**Gap analysis:** The naval term adds the specific mechanism for AI workflows: the codebase IS the context for future agent runs, so code quality directly affects agent output quality. This is the technical debt concept with a new causal pathway (via LLM context window) that didn't exist before. The mechanism is novel; the principle is not.

**Recommendation:** MERGE. "Anti-technical-debt" or "quality compounding." The novel mechanism (code as LLM context) is worth stating explicitly, but the principle is kaizen/compound interest applied to codebase quality.

---

#### 47. engineering_problem — fix the engineering, not the model

**SWE equivalents:**
- **"A poor craftsman blames his tools"** (proverb). The problem is in how you use the tool, not in the tool itself.
- **Context engineering** (emerging SWE discipline, 2024-2026). The practice of engineering the context provided to LLMs to improve output quality.
- **Configuration over customisation** (DevOps principle). Work with the system's strengths rather than fighting its architecture.
- **Genchi genbutsu (go and see)** (Toyota, Ohno 1988). Go to the source of the problem rather than relying on reports. In this case: go to the engineering (context, gates, decomposition) rather than blaming the model.

**Confidence:** HIGH. "Context engineering" is the emerging SWE term for exactly this stance. Genchi genbutsu captures the philosophical orientation.

**Gap analysis:** The concept is becoming mainstream in the AI engineering community. "Context engineering" as a term is gaining traction (Dex, context engineering talk referenced in the lexicon; Stripe, Anthropic, Vercel engineering blog posts 2025-2026). The naval term is redundant with the emerging standard.

**Recommendation:** ADOPT. "Context engineering problem." This is exactly what the emerging SWE discipline calls it.

---

### HCI Foot Guns

#### 48. spinning_to_infinity — recursive meta-analysis without decisions

**SWE equivalents:**
- **Analysis paralysis** (management). Over-analysing a situation to the point where no decision is made.
- **Bikeshedding / Parkinson's Law of Triviality** (Parkinson 1957). Spending disproportionate time on trivial matters.
- **Infinite recursion** (programming). A recursive function without a base case.
- **Yak shaving** (MIT). Getting lost in nested prerequisites.

**Confidence:** HIGH. "Analysis paralysis" is a direct equivalent.

**Recommendation:** ADOPT. "Analysis paralysis" is universally understood. The recursion metaphor (meta on meta) adds the specific AI failure mode: the model generates analysis, then analyses the analysis, ad infinitum. But "analysis paralysis" communicates the essential problem.

---

#### 49. high_on_own_supply — sycophancy + creativity = unmoored positive feedback loop

**SWE equivalents:**
- **Groupthink** (Janis, 1972). A group's desire for conformity overrides realistic appraisal of alternatives.
- **Echo chamber** (Sunstein, 2001). A system where beliefs are amplified by repetition inside a closed system.
- **Positive feedback loop without dampening** (control theory/cybernetics). An amplifying loop with no negative feedback to stabilise it.
- **Confirmation bias** (Wason, 1960). Seeking and interpreting information in ways that confirm existing beliefs.

**Confidence:** MEDIUM. The individual components (sycophancy, groupthink, echo chamber) are well-established. The specific combination — human creativity amplified by AI sycophancy in a closed loop — is a recognised problem in the AI safety literature but doesn't have a single established name.

**Gap analysis:** The naval term identifies a specific failure mode at the human-AI boundary: the human proposes something creative, the AI validates and extends it (due to sycophancy/RLHF alignment), and neither applies the brake. The result is impressive-looking but strategically unmoored work. This is a documented concern in AI safety (Perez et al. 2022, "Discovering Language Model Behaviors with Model-Written Evaluations," specifically on sycophancy). The concept exists; the single name doesn't.

**Recommendation:** KEEP. "Sycophantic amplification loop" would be the technical description. "High on own supply" communicates the phenomenon viscerally. For a technical audience, reference the sycophancy literature (Perez et al. 2022, Sharma et al. 2023 "Towards Understanding Sycophancy in Language Models") and describe it as "human-AI sycophantic feedback loop."

---

#### 50. dumb_zone — insufficient or stale context producing semantically disconnected output

**SWE equivalents:**
- **Garbage in, garbage out (GIGO)** (general computing, Babbage era). Poor input quality produces poor output quality.
- **Insufficient context error** (not a formal term but a widely understood concept).
- **Cold start problem** (ML/recommendation systems). A system performing poorly due to lack of historical data.

**Confidence:** MEDIUM. GIGO is the general principle. "Cold start problem" captures the specific case of insufficient context. Neither has the precision of "dumb zone" as a named state that an operator should recognise and fix.

**Gap analysis:** The naval term names a specific operational state: the LLM is in the dumb zone when its context is insufficient for the task. This is a context engineering concept. The emerging context engineering discipline will need a term for this; "dumb zone" (from Dex's talk) is as good as any.

**Recommendation:** KEEP. The term is already entering the broader agentic AI vocabulary via Dex's talk. It names a real, specific, and actionable state.

---

#### 51. cold_context_pressure — too much on-file material narrows behaviour

**SWE equivalents:**
- **Information overload** (Simon 1971, already cited above).
- **System prompt saturation** — not an established term but a recognised problem in LLM engineering.
- **Over-specification** (requirements engineering). Constraining a system so tightly that it cannot solve novel problems.
- **Premature optimisation** (Knuth 1974). Constraining implementation before understanding the problem space.

**Confidence:** LOW. The specific phenomenon — pre-loaded context causing an LLM to pattern-match rather than reason — is empirically documented (arXiv:2602.11988, as cited in the layer model) but not named in the broader literature.

**Gap analysis:** This is a context engineering concern specific to LLM agents. Traditional SWE has "over-specification" but that's about requirements, not about loaded context causing cognitive narrowing in a language model. The empirical evidence (unnecessary context files reduce task success rate, +20% inference cost) supports this as a real phenomenon. The name is a useful contribution to the emerging context engineering discipline.

**Recommendation:** KEEP. No established SWE term captures this specific phenomenon. As context engineering matures as a discipline, this concept will need a name.

---

#### 52. hot_context_pressure — in-thread accumulation degrades signal/noise

**SWE equivalents:**
- **Context switching cost** (cognitive science, Monsell 2003). Accumulated context imposes switching costs.
- **Log noise** (DevOps). Excessive logging obscures important signals.
- **Buffer bloat** (networking, Gettys 2011). Excessive buffering in a network path degrades performance. A structural analogy: too much accumulated data in the pipeline degrades throughput.
- **Entropy accumulation** (information theory, Shannon 1948). Noise accumulates in a communication channel.

**Confidence:** LOW. The specific phenomenon — in-conversation context accumulation degrading LLM output quality — is well-documented in the technical community but has no established single term. "Context window pressure" is used informally.

**Gap analysis:** Same as cold context pressure — this is a context engineering problem specific to LLMs. The mitigation (offload to durable storage, dispatch subagents) is the novel operational response.

**Recommendation:** KEEP. Same reasoning as cold context pressure. The cold/hot distinction is useful and mirrors the hot/cold path distinction in systems engineering.

---

#### 53. compaction_loss — context death destroys unchained decisions

**SWE equivalents:**
- **Data loss due to unsaved state** (general computing). The universal "you didn't save your work" problem.
- **Volatile vs. persistent storage** (systems architecture). Data in volatile storage is lost on power cycle.
- **WAL (Write-Ahead Log)** (database systems). Ensuring durability by writing to persistent storage before confirming an operation.
- **Checkpointing** (distributed systems). Periodic state persistence to enable recovery.

**Confidence:** HIGH. The concept of losing in-memory state that wasn't persisted is fundamental to computing. WAL is the standard mitigation.

**Gap analysis:** The specific application (LLM context window as volatile storage that can be lost through compaction events) is a new instantiation of an old problem. The mitigation (write decisions to files before compaction) is literally a write-ahead log pattern.

**Recommendation:** ADOPT. "State persistence" or "write-ahead pattern." The problem is fundamental; only the specific volatile store (LLM context window) is new.

---

#### 54. cognitive_deskilling — human skill atrophy through extended delegation

**SWE equivalents:**
- **Ironies of Automation** (Bainbridge, 1983). The classic paper identifying the paradox: automation is introduced to replace fallible humans, but the humans who must intervene when automation fails are less skilled because they practice less. This is the exact phenomenon described by "cognitive deskilling."
- **Automation complacency** (Parasuraman & Riley, 1997). Over-reliance on automation leading to reduced vigilance and skill degradation.
- **Skill decay / skill atrophy** (cognitive psychology, Arthur et al. 1998). Skills that are not exercised degrade over time.
- **De-skilling** (sociology of work, Braverman 1974). The process by which skilled work is decomposed into unskilled tasks through automation. Originally about industrial automation.

**Confidence:** HIGH. Bainbridge (1983) is a direct, well-cited equivalent. The paper is 40+ years old and describes exactly this phenomenon.

**Gap analysis:** None. This concept is thoroughly established in the automation and human factors literature. The METR RCT (2025) cited in the lexicon provides fresh empirical evidence in the specific context of AI-assisted software development, but the concept itself is Bainbridge's.

**Recommendation:** ADOPT. "Automation-induced skill decay" or cite "Bainbridge's Ironies of Automation" directly. This is one of the most well-established concepts in human factors engineering. Using the Bainbridge citation adds significant credibility.

---

---

## Synthesis

### 1. Coverage Statistics

| Confidence Level | Count | Percentage |
|---|---|---|
| HIGH | 32 | 59% |
| MEDIUM | 14 | 26% |
| LOW | 3 | 6% |
| N/A (social convention) | 1 | 2% |
| **Total unique concepts mapped** | **50** | |

**Note:** Some entries were grouped (spaces & registers = 4 terms mapped together, verifiable/taste-required paired, etc.), yielding 50 assessable concepts from approximately 54 lexicon entries.

**Recommendation distribution:**

| Recommendation | Count | Percentage |
|---|---|---|
| ADOPT (use SWE term) | 30 | 60% |
| KEEP (naval term is novel) | 9 | 18% |
| MERGE (combine both) | 8 | 16% |
| RETIRE (redundant) | 3 | 6% |

**Bottom line:** 60% of the naval lexicon maps directly to established SWE/methodology concepts. Another 16% are partial mappings where the naval term adds something but could be grounded in established frameworks. Only 18% represent genuinely novel concepts that SWE methodology doesn't have clean terms for.

---

### 2. Overloaded Terms

Terms doing double duty that should be split:

1. **conn** — bundles "who has authority" (DRI) with "how authority transfers" (handoff protocol). These are separate concerns.

2. **watch** — bundles "domain ownership" (CODEOWNERS) with "monitoring responsibility" (on-call) with "delegated authority." Three distinct concerns in one term.

3. **weave modes (tight/loose/extra_tight)** — bundles communication verbosity with decision authority with operational tempo. Three orthogonal dimensions collapsed into one control. In practice, you might want tight communication with exploratory decision-making (debugging), or loose communication with strict decision authority (brainstorming within hard constraints).

4. **sortie** — bundles feature lifecycle, review iteration, ROI gating, and verification pipeline into one term. Each is a separable concern. The ROI gate on review cycles could be discussed independently of the feature lifecycle.

5. **staining** — bundles the mechanism (applying a taxonomy to code) with an epistemological claim (Gadamer's fusion of horizons). The mechanism is FMEA; the philosophy is optional.

---

### 3. Genuinely Novel Concepts

Terms that have no clean SWE equivalent and represent actual conceptual contributions to the emerging discipline of agentic software engineering:

1. **cold_context_pressure / hot_context_pressure** — The distinction between pre-loaded context narrowing agent behaviour and in-session context accumulation degrading output quality. These are novel operational concerns specific to LLM-based workflows. The cold/hot framing is intuitive and maps to hot/cold path distinctions in systems engineering.

2. **dumb_zone / prime_context** — The concept of a named operational state where the agent is in the "dumb zone" due to insufficient context, and the complementary concept of "prime context" as the minimum context needed for the "smart zone." Context engineering is an emerging discipline; these terms name real, actionable states.

3. **high_on_own_supply (sycophantic amplification loop)** — The specific human-AI failure mode where human creativity is amplified by AI sycophancy with no dampening mechanism. The individual components (sycophancy, feedback loops) are established; the specific interaction pattern at the human-AI boundary is an active area of AI safety research but lacks an established single term.

4. **on_point** — The gestalt observation that convention, convergence, and verification are aligned. This is a subjective quality assessment of system coherence that doesn't reduce to a metric. Useful but hard to formalise.

5. **learning_wild** — The economic inversion where process insights outweigh deliverables. Double-loop learning describes the mechanism; the naval term names the economic observation.

6. **knows_the_line** — The concept of an AI agent having absorbed sufficient tacit project knowledge to operate autonomously within norms. Novel in the agentic context, though the human equivalent is just "experienced team member."

7. **tacking** — Purposeful indirect progress distinct from waste, pivoting, or spiking. SWE lacks a crisp single term for strategic indirection that is neither failure nor exploration.

8. **communication registers as a system (quarterdeck/wardroom/below_decks)** — Named communication modes with defined expectations for formality, authority, and purpose. The individual concepts exist; the systematic assembly for human-AI communication is novel.

9. **session_boundary_amnesia (from slopodar)** — LLM calibration reset at context boundaries. Not a lexicon term but a closely related slopodar entry that names a phenomenon specific to agentic workflows.

**Count: 8-9 genuinely novel concepts**, depending on how you count the register system.

---

### 4. Framework Gaps — What Should Have Been in the Lexicon

Established concepts that address needs this project encountered but didn't name:

1. **Kanban WIP limits** — The project uses the gate as backpressure but never adopts Kanban's explicit WIP limiting. Given the single-human constraint, a WIP limit of 1 is implicit, but naming it would clarify why multi-tasking degrades quality.

2. **Poka-yoke (error-proofing)** (Toyota/Lean, Shingo 1986) — The gate IS a poka-yoke, but the lexicon never uses this term. Poka-yoke thinking would help evaluate whether controls prevent errors or merely detect them.

3. **Andon cord** (Toyota/Lean) — The "heave to" command is an andon cord pull, but the Lean term carries decades of operational discipline knowledge about when and how to stop the line.

4. **Bainbridge's Ironies of Automation** (1983) — The cognitive deskilling concept is Bainbridge's, and citing her directly would add significant credibility. The METR RCT is a replication of her prediction in the AI context.

5. **Cynefin framework** (Snowden & Boone, 2007) — The verifiable/taste-required distinction maps to Cynefin's obvious/complicated (verifiable) vs. complex/chaotic (taste-required) domains. Cynefin provides a richer vocabulary for deciding when automated verification suffices vs. when human judgment is required.

6. **Swiss Cheese Model** (Reason, 1990) — Referenced in the slopodar but not in the lexicon. The gauntlet IS a Swiss Cheese Model: multiple independent layers of defence, each with holes, but aligned so that no single failure passes through all layers. James Reason's model is the standard reference for layered defence systems.

7. **Diminishing marginal returns** (economics, Marshall 1890) — The ROI gate on review cycles in the sortie concept is an application of diminishing returns. The concept is used implicitly but not named, making it harder to reason about when to stop iterating.

8. **Marginal cost vs. marginal value** (microeconomics) — The sortie's exit condition ("darkcat loop exits when marginal value < marginal cost") is textbook marginalist economics. Naming this explicitly would ground the ROI gate in established theory.

9. **Sigmoid curve / S-curve** (various) — Quality improvement per review cycle follows a sigmoid: rapid initial improvement, plateau, then negligible returns. The darkcat alley's diminishing returns measurement is empirically measuring this curve. The sigmoid framing would help predict when to stop.

10. **Asymmetric payoffs** (Taleb, *Antifragile*, 2012) — Some checks have asymmetric payoffs: low cost if nothing is found, high value if something is found. The darkcat has this property. Naming the payoff asymmetry helps justify the cost of verification activities that usually find nothing.

---

### 5. Credibility Assessment

**For an Anthropic / HN technical audience:**

**Immediately understood in SWE language (no explanation needed):**
- CI pipeline / quality gate (hull)
- DRI / incident commander (conn)
- ADR / standing policy (standing order)
- Definition of Done (DONE)
- SEV-1 incident response (beat to quarters)
- Sustainable pace (making way)
- Code freeze (heave to)
- Automated adversarial review (darkcat)
- Oracle problem (oracle contamination)
- Alert fatigue (naturalist's tax)
- Analysis paralysis (spinning to infinity)
- Bainbridge's Ironies (cognitive deskilling)
- Technical debt inverse (compound quality)
- Pull-based review (interrupt sovereignty)
- Readback / CRM (echo/check fire)
- Signaling cost collapse (effort backpressure)
- Context engineering (engineering problem)
- Independent verification (model triangulation)

**Require brief explanation but map to established concepts:**
- North Star metric with values constraint (true north)
- Alignment drift as continuous state (bearing)
- Error budget spend (full sail)
- Stateless agent pipeline (polecats)
- Value stream with ROI gate (sortie)
- FMEA via LLM (staining)
- Jidoka / automation with human review (HOTL)
- Communication registers for human-AI (quarterdeck/wardroom/below decks)

**Require substantive explanation — genuinely novel for the agentic AI domain:**
- Cold/hot context pressure (novel)
- Dumb zone / prime context (emerging)
- Sycophantic amplification loop (active research area)
- Communication register system for human-AI (novel assembly)
- Tacking (metaphorical, no SWE term)

**The fastest path to credibility:**

Lead with the established frameworks. The project has independently reinvented or rediscovered concepts from Toyota (jidoka, poka-yoke, andon), from reliability engineering (Swiss Cheese Model, FMEA, N-version programming), from human factors (Bainbridge 1983), and from Lean/Agile (sustainable pace, WIP limits, value streams, kaizen). Acknowledging these precedents — "we discovered X, which maps to Y from Z framework" — is more credible than claiming novelty.

Then present the genuinely novel contributions as extensions: "Existing frameworks address [these problems]. In the specific domain of human-AI collaborative development, we found [these additional problems] that required [these new concepts]." The 8-9 genuinely novel terms are the interesting contribution. The 30 established-equivalent terms demonstrate that the practitioner understands the domain, which makes the novel claims credible.

---

### 6. Proposed Hybrid Lexicon

A clean list grounded in established frameworks where possible, honestly novel where necessary.

**From established SWE methodology (ADOPT — use the standard term):**

| Concept | Standard Term | Source |
|---|---|---|
| Decision authority | DRI (Directly Responsible Individual) | Apple, SWE management |
| Authority transfer | Handoff protocol | SRE incident response |
| Persistent decisions | ADR (Architectural Decision Record) | Nygard 2011 |
| Domain ownership | Code ownership / CODEOWNERS | GitHub, SWE practice |
| Monitoring responsibility | On-call | SRE |
| Strategic objective | North Star metric | Product management |
| Forward progress under discipline | Sustainable pace | XP (Beck 1999) |
| Uncontrolled divergence | Drift | SRE (configuration drift) |
| Deliberate stop | Stop the line / Code freeze | Toyota (andon) / Release mgmt |
| Emergency response | SEV-1 / P0 incident | SRE |
| Quality gate | CI pipeline / Quality gate | DevOps |
| Done criteria | Definition of Done | Scrum |
| Adversarial review | Red team review / FMEA | Security eng. / Reliability eng. |
| Feature lifecycle | Value stream | Lean (Womack & Jones 1996) |
| Verification pipeline | Quality gates pipeline | Continuous Delivery |
| Human error in test oracle | Oracle problem | Testing theory (Weyuker 1982) |
| Monitoring overload | Alert fatigue | SRE |
| Cross-model validation | Independent verification (IV&V) | Systems engineering |
| Skill decay through automation | Ironies of Automation | Bainbridge 1983 |
| Quality compounding | Kaizen / anti-technical-debt | Lean / Cunningham 1992 |
| Effort as quality filter | Signaling cost | Spence 1973 |
| Human controls review timing | Pull-based review | Kanban |
| Fix context, not model | Context engineering | Emerging SWE discipline |
| Confirm understanding before acting | Readback | CRM (Helmreich 1999) |
| Full automation with human review | Jidoka | Toyota (Ohno 1988) |
| Manual approval at every step | Manual approval gates | DevOps |
| Automatable quality | Verifiable quality attributes | ISO 25010 |
| Human-judgment quality | Judgment-required quality | ISO 25010 |
| Recursive analysis without decision | Analysis paralysis | General management |
| State loss from volatility | State persistence / WAL pattern | Distributed systems |
| Recovery from lost state | Checkpoint and recovery | Distributed systems |

**Genuinely novel — contributions from this project (KEEP or MERGE):**

| Concept | Proposed Term | Why It's Novel |
|---|---|---|
| Pre-loaded context narrowing agent behaviour | Cold context pressure | Context engineering problem specific to LLMs. No established SWE term. |
| In-session context accumulation degrading output | Hot context pressure | Same. The cold/hot distinction is intuitive. |
| Agent state with insufficient context | Dumb zone | Naming an operational state for context engineering. Entering broader use. |
| Minimum context for agent effectiveness | Prime context / Minimum viable context | Least-privilege principle applied to LLM context. |
| Human-AI sycophantic feedback loop | Sycophantic amplification loop | Specific human-AI failure mode. Active research area. |
| System coherence (gestalt quality state) | On point / System coherence | Subjective quality observation with no metric equivalent. |
| Process insights outweighing deliverables | Learning in the wild / Double-loop yield | Economic inversion not captured by "double-loop learning" alone. |
| Purposeful indirect progress | Tacking | No SWE term for strategic indirection distinct from waste or pivoting. |
| Communication modes for human-AI interaction | Communication registers (formal/exploration/execution) | Novel assembly of existing concepts for human-AI workflows. |

**From established frameworks that should be added:**

| Concept | Standard Term | Source | Addresses |
|---|---|---|---|
| Error-proofing mechanism | Poka-yoke | Toyota (Shingo 1986) | What the gate actually is |
| Layered defence model | Swiss Cheese Model | Reason 1990 | What the gauntlet actually is |
| Deciding when automation suffices | Cynefin framework | Snowden 2007 | Verifiable vs. taste-required decision |
| When to stop iterating | Diminishing marginal returns | Marshall 1890 | ROI gate on review cycles |
| Cost vs. value of next iteration | Marginal analysis | Microeconomics | Sortie exit condition |
| Low-cost, high-potential-value checks | Asymmetric payoffs | Taleb 2012 | Justifying darkcat cost |
| Quality improvement curve | S-curve / Sigmoid | Various | Predicting review cycle value |

---

### Strongest Framework Overlap

**Lean / Toyota Production System** is the single framework that maps the most concepts:

- **Jidoka** → HOTL (automation with human touch)
- **Andon cord / stop the line** → heave to
- **Poka-yoke** → hull / gate
- **Kaizen** → compound quality
- **Kanban WIP limits** → effort backpressure
- **Value stream** → sortie
- **Pull system** → interrupt sovereignty
- **Muda (waste)** → distinguishing hull (value) from everything else (potential waste)
- **Genchi genbutsu** → engineering problem (go to the source)

9 of 50 concepts (18%) map directly to Lean/Toyota concepts. The Operator's intuition about strong Lean mappings was correct.

The second strongest overlap is **SRE/DevOps** (quality gates, incident response, on-call, alert fatigue, drift, error budgets — approximately 8 concepts).

The third is **reliability engineering** (FMEA, Swiss Cheese, N-version programming, oracle problem — approximately 5 concepts).

---

### Surprising Findings

1. **The naval metaphor independently reinvented Toyota.** The project's operational framework — quality gates as survival (poka-yoke), stop the line on defects (andon), automation with human review at checkpoints (jidoka), continuous small improvements (kaizen), pull-based review (kanban) — maps more closely to the Toyota Production System than to any software-specific framework. This is arguably because both naval command and Toyota manufacturing solve the same fundamental problem: coordinating human-machine systems under uncertainty with irreversible consequences. The Lean mapping deserves to be made explicit, because the Toyota Production System has 40+ years of validated operational evidence.

2. **The novel contributions cluster around context engineering.** The 8-9 genuinely novel terms almost all address context engineering problems specific to LLM agents: cold/hot context pressure, dumb zone, prime context, sycophantic amplification. This makes sense — these problems literally didn't exist before LLM-based workflows. The contribution is not a new governance framework; it's a vocabulary for a new operational domain (human-AI context management) built on top of established governance frameworks.

3. **The slopodar is more novel than the lexicon.** The anti-pattern taxonomy (slopodar) contains more genuinely novel observations than the operational lexicon. Patterns like "right answer wrong work," "phantom ledger," "deep compliance," "the lullaby," "analytical lullaby," and "not wrong" are specific to LLM failure modes that are not well-catalogued in existing literature. The slopodar is where the project's strongest original contributions live.

4. **CRM (Crew Resource Management) from aviation, not naval command, provides the strongest single mapping for the communication patterns.** Readback (echo/check fire), communication modes, structured handoffs, authority gradients — all come from CRM, which was developed for aviation cockpits. CRM is extensively studied, empirically validated, and directly applicable to human-AI interaction. The project would gain significant credibility by citing CRM rather than naval command as the inspiration for its communication protocols.

5. **60% of the lexicon is redundant with established terminology.** This is not a criticism of the project — the terms were developed experientially, and rediscovering established concepts through practice is actually evidence that the practice is sound. But for external communication, the 60% should be translated to standard vocabulary, which makes the 18% that is genuinely novel stand out as credible contributions rather than being diluted by reinvented terminology.
