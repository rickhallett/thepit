# Task IV-15: Write - Step 9: Building an Eval Culture

**Type:** Write
**Depends on:** Tasks IV-01 (format), IV-02 (internal refs), IV-05 (Tier 3 external)
**Parallelizable with:** IV-14
**Output:** `docs/bootcamp/step-iv-09-eval-culture.md`

---

## Objective

Write the full Step 9 content: "Building an Eval Culture." This is the capstone step -
how to take everything from Steps 1-8 and make it a sustainable team practice.
Field maturity: EMERGING.

Estimated target: 30-40k characters (~900-1200 lines). Shorter step focused on
organisational practice rather than technical depth.

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md` - format template
2. `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md` - internal concepts
   (definition of done, quality gate, continuous evaluation)
3. `docs/bootcamp/tasks/iv-05-research-tier3-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` lines 616-643 - the Step 9 outline

Note: Step 9 has the shortest outline section. The write task should expand beyond
the outline using the research findings while staying within the topic scope.

## Content Structure

### Mandatory Sections

1. **Why This is Step 9** - Frame: individual skill is necessary but not sufficient.
   Evaluation must be a team practice to be sustainable. This step is about making
   eval discipline stick in an organisation, not just in a person.

2. **Evals as a team practice** - How to introduce eval discipline to a team that
   currently does not have it:
   - Start with one high-risk capability (not everything at once)
   - Make it easy (templates, tooling, shared datasets)
   - Make it visible (dashboards, reports, CI integration)
   - Make it mandatory (eval as merge gate)
   - Change management: people resist new gates unless they see the value

3. **The eval review** - Treating eval design with code review rigor:
   - Does the eval measure what it claims? (construct validity from Step 1)
   - Are the edge cases adequate? (dataset quality from Step 2)
   - Is the grader calibrated? (grader accuracy from Step 3)
   - Eval review as a formal practice, not an afterthought

4. **Eval ownership** - Who maintains what:
   - Who maintains the eval suite?
   - Who updates datasets when the domain evolves?
   - Who investigates when a model update causes eval regressions?
   - The eval ownership anti-pattern: nobody owns it, so nobody maintains it

5. **The eval roadmap** - Prioritising which evals to build:
   - High-risk capabilities first
   - High-frequency use cases second
   - Edge cases third
   - ROI-driven eval development (connect to the project's ROI standing order)
   - The eval backlog as a managed artifact

6. **Eval sharing and reuse** - Building on community work:
   - Inspect AI's eval registry as a model
   - Contributing evals back to the community
   - Using published evals as baselines
   - When to build custom vs reuse existing

7. **Evals and governance** - The audit trail:
   - Evals as evidence for deployment decisions
   - The trail from eval result to deployment approval
   - Connect to Bootcamp II Step 10 (governance)
   - How eval results feed into the definition of done

8. **Continuous evaluation** - Not just pre-deployment:
   - Production monitoring as ongoing evaluation
   - Detecting model drift (provider updates change model behaviour)
   - Distribution shift (user behaviour changes over time)
   - Emerging failure modes (new attack vectors, new edge cases)
   - The catch-log as continuous eval evidence (project worked example)

### Novel Content from This Project

- The project's definition of done as a worked example of eval-integrated governance:
  gate green + 3 adversarial reviews + synthesis + pitkeel + walkthrough
- The catch-log as continuous evaluation evidence
- The observation that the gate (quality gate) is itself continuous evaluation -
  it runs on every change, blocks on failure, and the results are an audit trail

### Exercises

No explicit exercises in the outline. Design 2-3:
- Design an eval roadmap for a fictional team deploying an AI-assisted code review
  system. Prioritise: which evals to build first, second, third. Justify priorities
  using risk and frequency analysis
- Write an eval ownership document: for 3 evals, define who owns maintenance,
  what triggers a review, and what the escalation path is for regressions
- Design a continuous evaluation plan: what to monitor post-deployment, how to
  detect drift, and what thresholds trigger investigation

### Agentic Grounding

Connect to:
- Why eval culture matters more than individual eval skill
- Why continuous evaluation catches what pre-deployment evaluation misses
- Why eval ownership prevents the "nobody maintains it" failure mode

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Organisational guidance should be practical, not theoretical
- The eval roadmap example should be concrete enough to adapt
- Connect to real governance frameworks (not invented ones)
- The capstone nature of this step should tie back to Steps 1-8 explicitly
