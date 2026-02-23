# Codebase Evaluation Protocol — Multi-Model Statistical Convergence

**Date:** 2026-02-20
**Target:** The Pit (`tspit`) — Full-stack TypeScript + Go codebase
**Analyst:** Analyst agent
**Version:** 1.0

---

## Purpose

This protocol defines the methodology for evaluating every technical dimension of the tspit codebase using structured XML prompts executed across multiple LLMs (Anthropic Claude, OpenAI GPT-4o, Google Gemini 2.0 Pro) in multiple iterations. The goal is to produce operationalized metrics that can be statistically analysed to differentiate signal from noise, and converge on confidence bands that represent the voice of many, not the opinion of one.

---

## Evaluation Panels

| ID | Panel | File | Metrics | Expertise Required |
|----|-------|------|---------|--------------------|
| 101 | Architecture & Systems Design | `101-architecture.xml` | 8 | Systems architect, 10+ years distributed systems |
| 102 | Code Quality & Craft | `102-code-quality.xml` | 8 | Senior engineer, polyglot, code review lead |
| 103 | Security Engineering | `103-security.xml` | 10 | AppSec engineer, OWASP, penetration testing |
| 104 | Type System & Safety | `104-type-system.xml` | 6 | TypeScript expert, type theory, compiler design |
| 105 | Database Engineering | `105-database.xml` | 8 | DBA, query optimization, distributed databases |
| 106 | API Design | `106-api-design.xml` | 7 | API architect, REST/GraphQL, developer experience |
| 107 | AI/LLM Integration | `107-ai-integration.xml` | 8 | ML engineer, prompt engineering, LLM ops |
| 108 | Frontend Engineering | `108-frontend.xml` | 7 | Senior frontend engineer, React, accessibility |
| 109 | DevOps & Operational Readiness | `109-devops.xml` | 7 | SRE, CI/CD, cloud infrastructure |
| 110 | Engineering Culture & Practice | `110-culture.xml` | 6 | Engineering manager, tech lead, team scaling |
| 111 | Scalability & Production Readiness | `111-scalability.xml` | 7 | Performance engineer, capacity planning |
| 112 | Testing Philosophy | `112-testing.xml` | 12 | QA architect, TDD practitioner, testing philosopher |
| 113 | Aggregation & Synthesis | `113-aggregation.xml` | — | Meta-evaluator (consumes panel outputs) |

**Total operationalized metrics:** 94 (across panels 101-112)

---

## Scoring System

### Scale: 1-10 (Integer)

All metrics use a 1-10 integer scale. Half-points are not permitted (forces commitment). Each metric has 5 anchored reference points.

| Score | Anchor | Meaning |
|-------|--------|---------|
| 1-2 | **Critical** | Fundamentally broken. Would fail a code review at any serious company. Requires rewrite. |
| 3-4 | **Deficient** | Below industry standard. Obvious gaps that a competent engineer would flag. Fixable but requires significant work. |
| 5-6 | **Adequate** | Meets the bar for a production codebase at a typical startup. Has rough edges but nothing dangerous. |
| 7-8 | **Strong** | Above average. Shows deliberate engineering choices. Would pass review at a top-tier company. |
| 9-10 | **Exceptional** | Best-in-class for the domain. Could serve as a reference implementation. Rare at any company. |

### Context Calibration

The evaluator MUST account for the following context when scoring:
- **Solo developer.** This codebase was built by one person in under two weeks.
- **Stage.** This is an early-stage product, not a mature enterprise system.
- **Stack.** Next.js 14 (App Router), TypeScript (strict), Drizzle ORM, Neon Postgres, Vercel deployment, Clerk auth, Stripe payments, Anthropic AI SDK.
- **Scoring baseline.** A score of 5-6 means "what a competent solo developer would produce under time pressure." A score of 9-10 means "what a well-resourced team would produce with months of iteration."

---

## Execution Protocol

### Phase 1: Data Collection

**Models:** 3 (Claude Opus 4, GPT-4o, Gemini 2.0 Pro)
**Iterations per model per panel:** 5
**Temperature settings:** 0.0, 0.2, 0.4, 0.2, 0.0 (varied to estimate within-model noise)
**Total evaluations:** 3 models × 12 panels × 5 iterations = **180 evaluation runs**

Each run produces a structured JSON output with integer scores for all metrics in that panel. This yields 180 score vectors that can be analyzed statistically.

### Phase 2: Noise Estimation

For each metric:

1. **Within-model variance (σ²_within):** Variance across the 5 iterations for a single model.
   - High within-model variance = the metric is sensitive to temperature / prompt interpretation.
   - Action: If σ²_within > 2.0 for any model, the metric's rubric needs tightening.

2. **Between-model variance (σ²_between):** Variance across the 3 model means.
   - High between-model variance = models disagree on interpretation.
   - Action: If σ²_between > 3.0, generate a follow-up prompt asking each model to justify its score.

3. **Intraclass Correlation Coefficient (ICC):**
   - ICC(2,1) — two-way random effects, single measures.
   - ICC > 0.75: excellent agreement (strong signal).
   - ICC 0.50-0.75: moderate agreement (usable signal with caveats).
   - ICC < 0.50: poor agreement (noise dominates; metric needs revision or removal).

### Phase 3: Confidence Bands

For each metric, compute:

- **Grand mean (μ):** Mean across all 15 data points (3 models × 5 iterations).
- **Standard error (SE):** SD / √n, where n = 15.
- **95% confidence interval:** μ ± 1.96 × SE.
- **Model-stratified means:** Separate means for each model, to detect systematic model bias.

Report each metric as: **μ [95% CI: lower, upper] | ICC | Model agreement: {Converged|Moderate|Divergent}**

### Phase 4: Signal Detection

Classify each metric into signal tiers:

| Tier | Criteria | Interpretation |
|------|----------|----------------|
| **Signal** | ICC ≥ 0.75 AND σ²_within ≤ 1.5 | Models agree, measurements are stable. This is a real property of the codebase. |
| **Probable Signal** | ICC ≥ 0.50 AND σ²_within ≤ 2.5 | Models mostly agree. Treat with moderate confidence. |
| **Ambiguous** | ICC 0.30-0.50 OR σ²_within > 2.5 | Models partially disagree or measurements are noisy. Use directionally but don't cite specific numbers. |
| **Noise** | ICC < 0.30 | Models fundamentally disagree. This metric measures evaluator bias, not codebase quality. Drop it or redesign the rubric. |

### Phase 5: Adversarial Follow-Up

For every metric classified as **Ambiguous** or **Noise**:

1. Present each model's score AND justification to a fresh instance of each model.
2. Ask: "Given these three evaluations, which score is most defensible and why?"
3. If convergence improves (ICC increases by > 0.15), adopt the revised score.
4. If convergence does not improve, mark the metric as **unresolvable** and report the divergence as a finding.

---

## Codebase Presentation Strategy

The codebase is too large to present in a single context window. Each panel prompt specifies which files are relevant to its evaluation. The codebase is presented in sections:

### Section A: Core Library Layer
All files in `lib/` — the shared business logic, AI integration, security, database access.

### Section B: API Routes & Server Actions
All files in `app/api/`, `app/actions.ts` — the HTTP interface layer.

### Section C: Frontend Components & Pages
All files in `components/`, `app/**/page.tsx`, `app/**/layout.tsx` — the UI layer.

### Section D: Test Suite
All files in `tests/` — unit, API, integration, E2E tests.

### Section E: Configuration & Infrastructure
`next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `middleware.ts`, `drizzle/`, `.gitignore`, `package.json`.

### Section F: Go CLI Tools
All files in `pitctl/`, `pitforge/`, `pitlab/`, `pitlinear/`, `pitnet/`, `pitstorm/`, `pitbench/`, `shared/`.

### Section G: Database Schema
`drizzle/schema.ts`, migration files, `db/index.ts`.

Each panel prompt specifies which sections (A-G) are required and which are optional context.

---

## Output Schema (Universal)

Every panel prompt requires output in this exact JSON structure:

```json
{
  "panel_id": "101",
  "panel_name": "Architecture & Systems Design",
  "evaluator_model": "claude-opus-4",
  "iteration": 1,
  "temperature": 0.0,
  "timestamp": "2026-02-20T10:00:00Z",
  "metrics": [
    {
      "id": "101.1",
      "name": "Module Boundary Clarity",
      "score": 7,
      "justification": "Clear separation between lib/, app/, and components/. The bout-engine.ts is a deliberate integration hub with 20+ imports, which is appropriate for the domain but creates a high fan-in risk.",
      "strongest_criticism": "bout-engine.ts imports from 20+ modules, making it a single point of failure for refactoring.",
      "strongest_defence": "The fan-in is intentional — it's the orchestration layer. Each imported module is independently testable.",
      "evidence": ["lib/bout-engine.ts imports", "lib/ directory structure", "test file per module pattern"]
    }
  ],
  "overall_assessment": "2-3 sentence synthesis of this panel's findings.",
  "top_3_strengths": ["...", "...", "..."],
  "top_3_risks": ["...", "...", "..."],
  "recommended_actions": [
    {
      "priority": 1,
      "action": "Extract credit lifecycle from bout-engine into a dedicated credit-orchestrator module.",
      "effort": "medium",
      "impact": "high"
    }
  ]
}
```

This schema is machine-parseable for statistical aggregation. Every evaluator MUST output this exact structure.

---

## Statistical Analysis Procedure

After all 180 evaluations are collected:

### Step 1: Parse & Validate
- Parse all 180 JSON outputs.
- Validate each metric score is an integer 1-10.
- Flag and exclude any response that doesn't conform to the schema (record exclusion rate per model).

### Step 2: Compute Summary Statistics
For each of the 94 metrics:
- Grand mean, median, SD, IQR.
- Per-model mean, SD.
- Within-model variance (average across 5 iterations).
- Between-model variance (variance of the 3 model means).

### Step 3: Compute Agreement Statistics
- ICC(2,1) for each metric.
- Krippendorff's alpha for each metric (ordinal, 3 raters with 5 observations each).
- Cohen's weighted kappa for each model pair (Claude-GPT, Claude-Gemini, GPT-Gemini).

### Step 4: Identify Systematic Biases
- Compare per-model means across all metrics.
- If one model's mean is consistently > 1.0 higher/lower than others, apply a correction factor.
- Report raw and corrected scores.

### Step 5: Generate the Composite Report
For each panel:
- Panel-level composite score (mean of metric scores within the panel, weighted by ICC).
- Confidence band (ICC-weighted mean ± SE).
- Signal tier for each metric.

For the codebase overall:
- Grand composite score (mean of panel composites, weighted by panel ICC).
- Radar chart data (12 panel scores on 12 axes).
- Priority matrix: metrics where score < 5 AND ICC > 0.75 = confirmed weaknesses.
- Priority matrix: metrics where score > 7 AND ICC > 0.75 = confirmed strengths.

---

## Special Instructions for Panel 112: Testing Philosophy

This panel receives elevated treatment because the user specifically requested that tests be evaluated against human institutional standards, not merely against code coverage metrics.

**The core distinction:**
- **Tautological tests** verify that the code does what the code does. They mirror implementation and break when implementation changes, even if behavior is preserved. They create maintenance burden without safety.
- **Specification tests** verify that the code meets a written contract. They survive refactoring because they test the interface, not the internals.
- **Behavioral tests** verify that the code produces the experience the user expects. They encode domain knowledge, not implementation knowledge.
- **Adversarial tests** verify that the code handles what it shouldn't receive. They encode the reality that inputs come from hostile or incompetent sources.
- **Institutional tests** are artifacts of human organizational constraints: regression tests from production incidents, integration tests from team boundaries, smoke tests from deployment anxiety. They encode institutional memory.

The testing panel asks the evaluator to classify every test file into these categories and score accordingly. A test suite that is 80% tautological and 20% behavioral is weaker than one that is 20% tautological and 80% behavioral, regardless of coverage numbers.

**The key question:** Given that an AI can generate tests with no time pressure, no cognitive fatigue, and no context-switching cost, what would a test suite look like if it tested what the code SHOULD do, not what it DOES do? Score the current suite against that aspirational standard.

---

## Execution Checklist

- [ ] Prepare codebase sections A-G as text files for context injection
- [ ] Execute panels 101-112 across all 3 models × 5 iterations (180 runs)
- [ ] Parse outputs, validate schema conformance
- [ ] Compute ICC, Krippendorff's alpha, confidence intervals for all 94 metrics
- [ ] Classify metrics into signal tiers
- [ ] Run adversarial follow-up on Ambiguous/Noise metrics
- [ ] Execute panel 113 (aggregation) with all panel outputs as input
- [ ] Generate composite report with radar chart data
- [ ] Identify confirmed weaknesses (score < 5, ICC > 0.75)
- [ ] Identify confirmed strengths (score > 7, ICC > 0.75)
- [ ] Present findings to Captain for action planning
