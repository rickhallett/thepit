# The Hit List — People, Communities, and Playbooks

All links verified 2 March 2026 unless marked otherwise.

---

## Part A: Named People at Target Companies

### Verified from primary sources

| Name | Title | Company | Source |
|------|-------|---------|--------|
| **Dario Amodei** | CEO | Anthropic | anthropic.com/company |
| **Daniela Amodei** | President | Anthropic | anthropic.com/company |
| **Jared Kaplan** | CSO, Responsible Scaling Officer | Anthropic | RSP blog post, Oct 2024 |
| **Sam McCandlish** | CTO | Anthropic | RSP blog post, Oct 2024 |
| **Helen King** | VP Responsibility, co-chairs RSC | Google DeepMind | deepmind.google/responsibility-and-safety |
| **Lila Ibrahim** | COO, co-chairs RSC | Google DeepMind | deepmind.google/responsibility-and-safety |
| **Shane Legg** | Co-Founder, Chief AGI Scientist | Google DeepMind | deepmind.google/responsibility-and-safety |
| **Demis Hassabis** | CEO | Google DeepMind | deepmind.google |
| **Anna Makanju** | Public Policy | OpenAI | openai.com/careers |
| **Marius Hobbhahn** | CEO/Director | Apollo Research | MATS alumni page, verified |

### Not publicly named (verified absence, not gaps in research)

- Anthropic: Trust & Safety lead, Frontier Red Team lead, Alignment team lead — **not surfaced on any public page**
- OpenAI: Preparedness team lead, SAG members — **not named in published framework**
- DeepMind: ReDI team lead, Ethics Foresight lead — **not named on career/research pages**
- METR: leadership — **not listed on fetched pages**
- Scale AI: leadership — **site did not render for automated scraping**

**Action required:** These names must be found via LinkedIn search and warm introductions. The absence from public pages is itself a signal — these are operational roles, not public-facing. The path to them is through the community (Part B), not through the front door.

---

## Part B: Communities

### Alignment Forum
- **URL:** [alignmentforum.org](https://www.alignmentforum.org/)
- **What:** Curated forum for AI alignment research. Active posts from researchers at Anthropic, MATS, Redwood, Apollo, METR.
- **How to engage:** Read current work. Post the build-reflect piece and the process observations. The bar for posting is genuine contribution, not credentials.
- **Playbook:** Lurk for 1 week to calibrate tone. Then post the piece. The community values empirical observations from novel setups over theoretical contributions.

### LessWrong
- **URL:** [lesswrong.com](https://www.lesswrong.com/)
- **What:** Broader rationality and AI community. MATS alumni post here. AI Safety Camp reports here.
- **How to engage:** Cross-post from Alignment Forum. Engage in comments on AI safety posts. This is the wider funnel — more eyes, less curation.
- **Playbook:** Post the build-reflect piece here simultaneously. Tag it "AI Safety" and "Empirical Results." Respond to every substantive comment within 24 hours.

### AI Safety Camp (AISC)
- **URL:** [aisafety.camp](https://aisafety.camp/)
- **What:** Online part-time AI safety research programme, 10 hrs/week, team-based projects. Currently on 11th edition. 27 active projects.
- **Directly relevant projects in current edition:**
  - Project #11: "Democratising Red Teaming & Evals" — your work is a data point for this
  - Project #15: "Rare AI Agent Behaviors Elicitation" — your fight card documents rare agent behaviours
  - Project #22: "Novel AI Control Protocol Classes" — your governance framework is a control protocol
- **How to engage:** AISC11 applications closed. Sign up for AISC12 notifications. Consider proposing a project based on your data.
- **Playbook:** Email the organisers with your work as evidence of fit. Propose a project: "Empirical study of human-AI build-reflect cycles in sustained agentic engineering." Offer your dataset.

### MATS (ML Alignment Theory Scholars)
- **URL:** [matsprogram.org](https://www.matsprogram.org/)
- **What:** 12-week research fellowship in Berkeley and London. 446+ alumni, 170+ publications. $15K stipend, $12K compute. Alumni go to Anthropic, DeepMind, OpenAI, METR, Apollo, Redwood.
- **Current status:** Summer 2026 applications closed. Expression of Interest still being collected.
- **How to engage:** Submit EOI. Reference your published work.
- **Playbook:** MATS is the single strongest pipeline into the entire AI safety ecosystem. If timing works, apply. If not, the community connections from AISC and Alignment Forum achieve the same effect more slowly.
- **MATS is also hiring staff:** Programme Systems Associate, Talent Manager, Research Manager (Berkeley/London).

### X/Twitter — Verified accounts to follow and engage

| Account | Organisation |
|---------|-------------|
| [@AnthropicAI](https://twitter.com/AnthropicAI) | Anthropic |
| [@PatronusAI](https://twitter.com/PatronusAI) | Patronus AI |
| [@ValsAI](https://twitter.com/ValsAI) | Vals AI |
| [@apolloaievals](https://twitter.com/apolloaievals) | Apollo Research |
| [@METR_Evals](https://twitter.com/METR_Evals) | METR |
| [@redwood_ai](https://twitter.com/redwood_ai) | Redwood Research |
| [@MATSprogram](https://twitter.com/MATSprogram) | MATS |

---

## Part C: Programmes and Fellowships

| Programme | What | Comp | Location | URL |
|-----------|------|------|----------|-----|
| **Anthropic AI Safety Fellow** | Safety research fellowship | Not listed | London/Ontario/Remote/SF | [Apply](https://job-boards.greenhouse.io/anthropic/jobs/5023394008) |
| **Anthropic AI Security Fellow** | Security fellowship | Not listed | London/Ontario/Remote/SF | [Apply](https://job-boards.greenhouse.io/anthropic/jobs/5030244008) |
| **MATS** | 12-week alignment research | $15K stipend + $12K compute | Berkeley/London | [EOI](https://www.matsprogram.org/) |
| **AI Safety Camp** | Part-time research, team projects | Volunteer | Remote | [Apply](https://aisafety.camp/) |
| **Constellation Astra Fellowship** | 3-6 month mentored safety research | Fully funded | Various | Referenced by Redwood Research |
| **OpenAI Red Teaming Network** | Per-project external red teaming | Compensated | Remote | Watch openai.com/safety for rounds |

---

## Part D: Per-Target Playbooks

### Playbook: Anthropic

**Their culture:** High-trust, low-ego. Empirical pragmatism. "Do the simple thing that works." They frame safety as competitive advantage, not compliance. They don't publish capabilities work.

**What to lead with:** 350+ hours using their model under governance discipline. 18+ documented instances where output passed automated checks and was wrong — not hallucination, but sycophantic drift, epistemic theatre, context degradation. Describe what happened and what was learned. The calibration run (noopit) is now stress-testing whether compressed governance and cross-model validation catch framing errors. This is engineering process work, not prompt engineering and not a research study.

**What to show:** The anti-pattern taxonomy as a practical quality tool. The governance framework and its honest self-assessment (SD-190, SD-194). The build-reflect correlation as methodology. Both repos are public.

**How to approach:** Apply to Red Team Engineer (Safeguards) and AI Safety Fellow simultaneously. In the cover material, reference the documented observations and link to both repos. Keep outreach under 200 words. The work is there to read.

**What they'll worry about:** No ML publication record. No PhD. Non-traditional background. Their own hiring page says "about half our technical staff had no prior ML experience" and "we care about what you can do, not where you learned it."

---

### Playbook: Google DeepMind

**Their culture:** Academic rigour meets operational scale. Interdisciplinary. The ReDI team bridges policy and engineering. PhD valued but "equivalent experience" is stated.

**What to lead with:** The build-reflect correlation analysis. This is their language — empirical findings, quantified, with methodology you can explain. The governance framework as an operational artifact, not a policy document.

**What to show:** The correlation data (velocity vs narrative density). The phase analysis (17.8x shift). The generalisability analysis connecting to established engineering patterns.

**How to approach:** Apply to the AI Ethics and Safety Policy Researcher role. The 12-month FTC role (deadline 10 March) is a lower-risk entry point — apply immediately. In the application, reference the quantitative findings and the methodology. DeepMind values rigour — show the Spearman coefficients, the ballast correction, the phase analysis.

**Time-critical: 10 March deadline for FTC role.**

---

### Playbook: OpenAI

**Their culture:** Move fast, ship iteratively, safety through deployment. "Feel the AGI." More startup energy than the others.

**What to lead with:** The Preparedness Framework alignment. Your project implements their pipeline at small scale: evaluate capabilities, build safeguards, verify effectiveness, governance review. Show that you understand their framework and have practiced it.

**What to show:** The documented observations as practical evaluation experience. The governance framework as safeguards design. The correlation analysis as measurement methodology.

**How to approach:** Apply to Data Scientist (Preparedness) and AI Emerging Risks Analyst. Register interest in the Red Teaming Network for the next round. In the application, reference the Preparedness Framework v2 by name and show how your work maps to their pipeline.

---

### Playbook: METR

**Their culture:** Research nonprofit. Gold standard credibility. Small team, high bar. $250K-$450K comp signals they compete with frontier labs for talent.

**What to lead with:** The evaluation methodology and the honest assessment of its limitations. METR values rigorous measurement — describe the correlation analysis, the phase analysis, and the honest limitations (n=1, 25 arcs, borderline significance).

**What to show:** The methodology (controlling for ballast, Spearman rank correlation, phase analysis). The governance framework as a practical control protocol, honestly assessed. SD-190 — the moment the project caught itself "blowing smoke."

**How to approach:** Apply to Research Engineer/Scientist. Describe the methodology and its limitations plainly. The honest self-assessment is the differentiator.

---

### Playbook: Apollo Research (London)

**Their culture:** Safety PBC. Scheming behaviour research. Partners with all major labs. Founded by MATS alumnus.

**What to lead with:** 18+ documented instances of catching output that appeared correct while drifting — the learning process of recognising what these failure modes look like in practice. Scheming detection requires the same skill: evaluating systems that pass every surface check.

**What to show:** The documented observations as practical experience with the failure mode they study. The governance self-assessment as evidence of intellectual honesty.

**How to approach:** Apply to Research Scientist/Engineer (Evaluations). London-based — if you're UK-based, this removes the visa barrier that affects US roles. Mention Marius Hobbhahn's MATS background to signal community awareness.

---

### Playbook: Tier 2 Companies (Vals AI, Patronus AI, Redwood)

**Their culture:** Smaller teams, less process, more direct impact. Your work is closer to their product than to a role within a larger organisation.

**What to lead with:** The slopodar as a deliverable. These companies sell evaluation — your anti-pattern taxonomy is the kind of artifact they ship to clients.

**How to approach:** Apply directly through career pages. Smaller companies read every application. The one-page story is sufficient. No need for extensive customisation — your work is their work.
