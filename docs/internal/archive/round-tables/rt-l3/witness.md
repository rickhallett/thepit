# RT L3 — Witness Report
Date: 2026-02-24
Agent: Witness
Statement presentation order: B, C, A

## Pre-Launch Recommendations

### 1. The Round Table arc itself is publishable institutional evidence — surface it

The progression from L1 (defect-finding) to L2 (value-finding) to L2 Delta (causal analysis of the delta) to L3 (unbiased assessment) is not just internal process. It is a worked example of the project's thesis: structured adversarial assessment of AI agents produces genuine analytical findings. The delta analysis — 11 independent agents converging on "evaluation frame is the dominant variable" with 0.85–0.97 causal confidence — is a research artifact. If this project is about studying multi-agent behaviour under adversarial conditions, the Round Table sequence is Exhibit A. Consider making the methodology (not necessarily the raw reports) visible in launch materials.

### 2. Preserve the decision trail before context compaction claims it

93 session decisions in one sprint is unprecedented. But session decisions live in conversation context that will be compacted. The numbered SD references (SD-075, SD-089, SD-091, SD-093) are cited throughout the Round Table documents but their full text may not survive. Before launch: verify that every SD reference cited in any surviving document has its reasoning captured in a durable location (issue, commit message, or document). A broken reference chain makes the institutional memory look performative rather than real.

### 3. Anchor the Category One avoidance to its evidence

The L2 reports reference "Category One avoidance" — catching the provenance overclaim before HN launch — as demonstrated process. This is one of the strongest pieces of evidence that the verification discipline works under real pressure. But it's referenced abstractly. The specific SD, PR, or commit where the overclaim was caught, the specific language that was corrected, and the specific honest caveat that replaced it — these should be traceable from a single entry point. If an HN commenter asks "how do you know your verification works?", the answer should be a link, not a story.

### 4. BUILDING.md is launch-ready but should be linked, not hidden

BUILDING.md is the canonical record of earned process. It contains the most honest articulation of what it means to build with agentic systems that I've seen in any public repo. It is not a README — it is deeper than that. But it is currently discoverable only by people who browse the repo root. If the launch narrative includes "here's what we learned," BUILDING.md should be explicitly linked from whatever launch copy exists. It is evidence, not marketing — which is exactly why it will resonate with the HN audience.

### 5. The naming discipline is a differentiator — don't let it go silent

"Verification fatigue," "cascading scope," "acknowledge-isolate-defer" — these are patterns named during actual work and anchored to specific PRs. This naming discipline is rare in any project, let alone a solo build. It demonstrates that the human in the loop was learning, not just approving. If the launch materials mention the agentic crew or the development process, the named patterns are concrete proof that the human grew alongside the system. They are the answer to "did you actually learn anything, or did you just prompt?"

### 6. The dual-lens finding should become standing procedure

The L2 Delta's structural finding — that single-lens assessment is systematically unreliable — was earned through practice in this codebase (L1 vs L2 produced opposite conclusions from identical data). This is a genuine methodological contribution. Record it as standing procedure for future assessments: always run both the defect-finding and value-finding lens, then synthesise. SD-093 established this, but it should be encoded in agent instructions (specifically Weaver's, since Weaver convenes Round Tables) so it survives context loss.

### 7. The bus factor narrative needs honest framing, not mitigation theatre

Bus factor = 1 is structurally immovable for a solo project. Keel correctly identified this. The L2 reports correctly downgraded it from CRITICAL to acknowledged-reality. But the launch materials should not try to mitigate it through language. The honest framing is: "This is a solo build. The bus factor is 1. The mitigation is that the code is open, the tests are comprehensive, the process is documented, and anyone can verify independently." That honesty is consistent with the project's positioning. Defensive framing around bus factor would be inconsistent.

### 8. Post-launch: establish what "success" means before you measure it

There is no recorded definition of what constitutes a successful launch. Without it, any outcome can be retroactively justified or condemned. Before posting: write down — even one sentence — what success looks like at 24h, 1 week, and 1 month. Anchor it. Measure against it. This prevents the same evaluation-frame problem the Round Tables just discovered: if you don't define the question before you see the data, the data will answer whatever question you wish you'd asked.

## Strategic Framing — Rank Order

1st: **B** — "Ship over polish." The institutional record is unambiguous: this project has earned its launch through 93 session decisions, 1,054 tests, a verification discipline that caught its own overclaim, and a Round Table process that independently validated readiness from 11 perspectives. The knowledge that was earned — about agentic systems, about adversarial assessment, about trust infrastructure — has value only if it enters the world. Polishing is the enemy of shipping when the gate is already green. Every principle in BUILDING.md was earned through practice; the practice is complete; the evidence is recorded. Ship.

2nd: **C** — "The primary value was in the practice." This is partially true and deeply important. The process IS remarkable — the naming discipline, the verification fabric, the dual-lens assessment methodology, the honest caveats. These are transferable. But Statement C underweights the artifact itself. The process produced something: a working research platform with cryptographic identity, lineage tracking, and crowd verification. The process and the product are not separable — the product is the evidence that the process works. Taking only the process and discarding the product would be like keeping your lab notebook and throwing away the experiment.

3rd: **A** — "Polish for recruiters." This framing inverts the project's own thesis. BUILDING.md explicitly states: "Trust is the product. The code is the output. The tests are the evidence. The verification discipline is the craft." A portfolio piece optimised for recruiter legibility would sand off exactly the things that make this project distinctive — the honest caveats, the research framing, the admission of what it doesn't do. The HN audience and the technical community will see through polish to substance. Recruiters who need polish to recognise substance are not the audience this project was built for. The institutional evidence says: the project's integrity is its value. Do not compromise it for palatability.
