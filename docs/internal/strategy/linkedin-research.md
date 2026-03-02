# LinkedIn Intelligence Research — Team Leads at Target Companies

Compiled 2 March 2026. All findings sourced from publicly accessible pages.
Verification status marked on every entry. No names have been fabricated.

---

## Methodology

Sources searched:
- Company websites (team pages, about pages, responsibility pages)
- Published research papers on arXiv (author lists with affiliations)
- Anthropic blog posts (attribution to specific teams)
- METR about/team page
- Apollo Research team page
- OpenAI safety page and Preparedness Framework v2 document
- DeepMind responsibility and safety page

Sources NOT searched (require human login):
- LinkedIn directly (blocked for automated scraping)
- Twitter/X profiles (require auth for full profile access)
- Google Scholar author pages (would require additional passes)

**Honest limitation:** I cannot access LinkedIn profiles, Twitter/X bios, or conference speaker databases from this harness. The research below is limited to what is published on company and arXiv pages. The Captain will need to perform LinkedIn searches manually for the specific names identified here.

---

## Part A: Verified People by Company

### Anthropic

#### Leadership (previously verified in plank-3)

| Name | Title | Source | Verified |
|------|-------|--------|----------|
| Dario Amodei | CEO | anthropic.com/company | YES |
| Daniela Amodei | President | anthropic.com/company | YES |
| Jared Kaplan | CSO, Responsible Scaling Officer | RSP blog post, Oct 2024; arXiv papers | YES |
| Sam McCandlish | CTO | RSP blog post | YES |

#### Research Team Structure (from anthropic.com/research)

Anthropic's research page names **four teams**, but does NOT name team leads:
1. **Alignment** — "works to understand the risks of AI models and develop ways to ensure that future ones remain helpful, honest, and harmless"
2. **Interpretability** — "discover and understand how large language models work internally"
3. **Societal Impacts** — "explores how AI is used in the real world" (works with Policy and Safeguards teams)
4. **Frontier Red Team** — "analyzes the implications of frontier AI models for cybersecurity, biosecurity, and autonomous systems"

The blog posts refer to additional internal team names:
- **Anthropic Safeguards Research Team** (Constitutional Classifiers paper, Feb 2025)
- **Alignment Science team** (Alignment Faking paper, Dec 2024; Sabotage Evaluations, Oct 2024)

**Neither of these team names appears on the public research page.** The Safeguards team and Alignment Science team are internal designations surfaced only in paper attributions.

#### People identified from arXiv papers

**Alignment Faking paper** (arXiv:2412.14093, Dec 2024) — Anthropic Alignment Science + Redwood Research collaboration:

| Name | Role inference | Source | Notes |
|------|---------------|--------|-------|
| **Evan Hubinger** | Likely Alignment Science lead or senior researcher | Submitting author on arXiv; last author position | Well-known alignment researcher. Previously at MIRI. |
| **Ryan Greenblatt** | Researcher, Alignment Science or Redwood Research | First author on alignment faking paper | Also affiliated with Redwood Research |
| **Carson Denison** | Researcher | Co-author | |
| **Ethan Perez** | Senior researcher, Safeguards/Alignment | Co-author on both alignment faking AND Constitutional Classifiers papers | Appears on both major safety papers — likely senior figure |
| **Samuel R. Bowman** | Senior researcher | Co-author on both papers | Previously NYU professor, well-known in NLP |
| **Buck Shlegeris** | Researcher (Redwood Research affiliation) | Co-author | CEO/co-founder of Redwood Research |
| **Linda Petrini** | Researcher | Co-author on both papers | |
| **Fabien Roger** | Researcher | Co-author | |
| **Sam Marks** | Researcher | Co-author | |

**Constitutional Classifiers paper** (arXiv:2501.18837, Jan 2025) — Anthropic Safeguards Research Team:

| Name | Role inference | Source | Notes |
|------|---------------|--------|-------|
| **Mrinank Sharma** | Likely Safeguards team lead or project lead | Submitting author on arXiv; first author | |
| **Meg Tong** | Researcher, Safeguards | Second author | |
| **Jan Leike** | Senior researcher/lead | Near-last author position (seniority convention) | **Previously OpenAI Alignment lead**. Departed OpenAI mid-2024. Joined Anthropic. High-profile hire. |
| **Jared Kaplan** | CSO | Last author | Confirms executive oversight of safety research |
| **Ethan Perez** | Senior researcher | Near-last author | Appears again — confirmed senior figure |
| **Amanda Askell** | Researcher | Co-author | Known for work on Claude's character/personality |
| **Catherine Olsson** | Researcher | Co-author | Previously Google Brain; well-known safety researcher |
| **Cem Anil** | Researcher | Co-author | |
| **Jesse Mu** | Researcher | Co-author | |
| **Jerry Wei** | Researcher | Co-author | |

**Key finding for Captain:**
- **Jan Leike** is now at Anthropic. He was OpenAI's head of Alignment/Superalignment before departing publicly in mid-2024. His presence as near-last-author on the Constitutional Classifiers paper suggests he holds a senior safety role at Anthropic.
- **Evan Hubinger** is the most visible face of Anthropic's alignment research (submitting author on alignment faking).
- **Ethan Perez** appears on both major safety papers in senior author positions — likely leads or co-leads Safeguards research.
- **Mrinank Sharma** first-authored the Constitutional Classifiers paper — likely project lead for that workstream.

#### Anthropic teams the Captain's targets map to:

| Captain's target | Relevant Anthropic team | Key people identified |
|-----------------|------------------------|----------------------|
| Red Team Engineer, Safeguards | Safeguards Research Team / Frontier Red Team | Mrinank Sharma, Ethan Perez, Jan Leike, Meg Tong |
| AI Safety Fellow | Alignment Science | Evan Hubinger, Ryan Greenblatt, Buck Shlegeris |
| Research Product Manager, Model Behaviors | Likely cross-team (Alignment + Societal Impacts) | Amanda Askell (model character work) |

---

### Google DeepMind

#### Verified leadership (from deepmind.google/responsibility-and-safety/)

| Name | Title | Source | Verified |
|------|-------|--------|----------|
| Demis Hassabis | CEO | deepmind.google | YES |
| Shane Legg | Co-Founder, Chief AGI Scientist; leads AGI Safety Council | Responsibility & Safety page | YES |
| Lila Ibrahim | COO; co-chairs Responsibility and Safety Council (RSC) | Responsibility & Safety page | YES |
| Helen King | VP, Responsibility; co-chairs RSC | Responsibility & Safety page | YES |

#### What the responsibility page reveals:

The page describes the following teams/structures but **does NOT name individual leads**:
- **Responsibility and Safety Council (RSC)** — co-chaired by Lila Ibrahim and Helen King
- **AGI Safety Council** — led by Shane Legg
- "World class teams focusing on technical safety, ethics, governance, security, and public engagement"
- The **Frontier Safety Framework** is mentioned as their risk protocol

**Not found (confirmed absence):**
- ReDI (Responsible Development and Innovation) team lead — not named anywhere on public pages
- Ethics Foresight lead — not named
- "AI Psychology & Safety" team lead (relevant to target #1, the FTC role) — not named
- No individual researcher names are listed on the responsibility page

**Key finding for Captain:**
- Helen King (VP, Responsibility) is the most senior named person on the safety/ethics side. She is likely the hiring chain for the Psychologist/Sociologist FTC role.
- The DeepMind responsibility page is deliberately vague about team structure below VP level.
- For the FTC role, the Captain may want to search LinkedIn for "Helen King Google DeepMind" and explore her network.

---

### OpenAI

#### Verified from public sources

| Name | Title | Source | Verified |
|------|-------|--------|----------|
| Anna Makanju | VP, Global Affairs (previously listed as Public Policy) | openai.com | YES (from plank-3) |

#### Preparedness Framework v2 (April 2025)

The updated Preparedness Framework describes:
- **Safety Advisory Group (SAG)** — "a cross-functional team of internal safety leaders" — reviews safeguards and makes recommendations to Leadership
- **Tracked Categories**: Biological/Chemical, Cybersecurity, AI Self-improvement
- **Research Categories**: Long-range Autonomy, Sandbagging, Autonomous Replication, Undermining Safeguards, Nuclear/Radiological

**The SAG members are NOT named** in the published framework. The document says SAG "reviews both reports, assesses residual risk, and makes recommendations to OpenAI Leadership" — but no individual names.

**Not found (confirmed absence):**
- Preparedness team lead — not named in any public document
- SAG members — not named
- Red Teaming Network coordinator — not named
- Emerging Risks Analyst team lead — not named

**Key finding for Captain:**
- OpenAI is the most opaque of the target companies regarding safety team composition.
- Jan Leike was previously OpenAI's Alignment/Superalignment lead; he departed publicly in May 2024 and is now at Anthropic (confirmed via Constitutional Classifiers paper authorship).
- The Captain's best path to OpenAI safety contacts is through the community (Alignment Forum, METR connections) rather than through public pages.

---

### METR (Model Evaluation and Threat Research)

**METR's team page is now fully public** (metr.org/about#our-team). This resolves the plank-3 gap entirely.

#### Leadership

| Name | Title | LinkedIn | Twitter/X |
|------|-------|----------|-----------|
| **Beth Barnes** | Founder, CEO | linkedin.com/in/elizabethmbarnes/ | @BethMayBarnes |
| **Chris Painter** | Policy Director | linkedin.com/in/cpainter1 | @ChrisPainterYup |

#### Notable Technical Staff

| Name | Title | LinkedIn | Notes |
|------|-------|----------|-------|
| **Ajeya Cotra** | Technical Staff | linkedin.com/in/ajeya-cotra-90942b8b | Previously Open Philanthropy; influential AI timelines researcher |
| **Daniel Filan** | Technical Staff | — | @dfrsrchtwts; known in alignment community |
| **Hjalmar Wijk** | Technical Staff | linkedin.com/in/hjalmar-wijk | |
| **Lawrence Chan** | Technical Staff | — | @justanotherlaw |
| **Megan Kinniment** | Technical Staff | linkedin.com/in/megan-kinniment-513355177/ | |
| **David Rein** | Technical Staff | linkedin.com/in/idavidrein/ | |
| **Joel Becker** | Technical Staff | — | |
| **Nate Rush** | Technical Staff | linkedin.com/in/nate-rush-045357b8/ | |
| **Sydney Von Arx** | Technical Staff | linkedin.com/in/sydney-von-arx-679486166/ | |
| **Thomas Kwa** | Technical Staff | linkedin.com/in/tkwa/ | |

#### Policy Staff

| Name | Title | LinkedIn |
|------|-------|----------|
| **Charles Foster** | Policy Staff | linkedin.com/in/charles-foster-000/ |
| **Kit Harris** | Policy Staff | linkedin.com/in/kitharris/ |
| **Michael Chen** | Policy Staff | linkedin.com/in/miclchen/ |
| **Jasmine Dhaliwal** | Policy Staff | linkedin.com/in/jasmine-k-d1/ |

#### Advisors

| Name | Affiliation | Notes |
|------|-------------|-------|
| **Adam Gleave** | Advisor and Board Member | CEO of FAR AI |
| **Alec Radford** | Advisor | OpenAI researcher (GPT series) |
| **Yoshua Bengio** | Advisor | Turing Award laureate; also reviewed Anthropic's alignment faking paper |

**Key finding for Captain:**
- Beth Barnes is the founder and CEO — the primary contact for any METR engagement.
- Ajeya Cotra is a high-profile name; her AI timelines work is widely cited.
- METR has partnered with OpenAI, Anthropic, Amazon, and AISI.
- METR is funded by The Audacious Project (TED), Schmidt Sciences, and others — NOT by AI companies directly.
- Alec Radford (OpenAI, GPT co-creator) is a METR advisor — potential warm connection to OpenAI.

---

### Apollo Research

**Apollo's team page is now fully public** (apolloresearch.ai/team). This resolves the plank-3 gap.

#### Leadership

| Name | Title | LinkedIn |
|------|-------|----------|
| **Marius Hobbhahn** | CEO / Co-Founder | linkedin.com/in/marius-hobbhahn-128927175/ |
| **Chris Akin** | COO | linkedin.com/in/akinchristopher/ |
| **Dr. Charlotte Stix** | Head of AI Governance | charlottestix.com |
| **Tzach Horowitz** | CISO | — |

#### Technical Staff (relevant to Applied Researcher role)

| Name | Title | LinkedIn |
|------|-------|----------|
| **Alexander Meinke** | Member of Technical Staff | linkedin.com/in/alexmeinke/ |
| **Jérémy Scheurer** | Member of Technical Staff | linkedin.com/in/jérémy-scheurer-927563b0/ |
| **Rusheb Shah** | Member of Technical Staff | linkedin.com/in/rusheb/ |
| **Bronson Schoen** | Member of Technical Staff | linkedin.com/in/bronsonschoen |
| **Axel Højmark** | Member of Technical Staff | linkedin.com/in/axelhojmark |
| **Felix Hofstätter** | Member of Technical Staff | linkedin.com/in/felixhofstaetter |
| **Teun van der Weij** | Member of Technical Staff | linkedin.com/in/teun-van-der-weij |

#### Governance Staff

| Name | Title | LinkedIn |
|------|-------|----------|
| **Alejandro Ortega** | Policy Researcher | linkedin.com/in/alejandro-ortega-b91b9b16a/ |
| **Matteo Pistillo** | Senior AI Governance Researcher | linkedin.com/in/matteopistillo |
| **Annika Hallensleben** | AI Policy Researcher | linkedin.com/in/annika-hallensleben |

#### Advisors

| Name | Affiliation |
|------|-------------|
| **David Duvenaud** | Professor, University of Toronto (also co-author on alignment faking paper) |
| **Owain Evans** | Director, Truthful AI |
| **Daniel Kokotajlo** | Director, AI Futures Project (previously OpenAI) |

**Key finding for Captain:**
- Marius Hobbhahn is a MATS alumnus (confirmed in plank-3) and the primary contact.
- Charlotte Stix (Head of AI Governance) is relevant if the Captain's governance framework is a lead artifact.
- Daniel Kokotajlo (advisor) is a former OpenAI employee who departed publicly over safety disagreements — potential warm connection and signal of shared values.
- Apollo is a PBC (Public Benefit Corporation) registered in Delaware, with EU Transparency Register presence.
- Team is relatively small (~25 people) — the Captain's application will be read by decision-makers directly.

---

## Part B: Cross-Company Intelligence

### Notable Researchers Who Bridge Multiple Targets

| Name | Connection | Relevance |
|------|-----------|-----------|
| **Jan Leike** | Ex-OpenAI Alignment lead → Now Anthropic (Constitutional Classifiers paper) | Bridges OpenAI and Anthropic safety teams |
| **Buck Shlegeris** | CEO Redwood Research; co-author on Anthropic alignment faking paper | Bridges independent safety research and Anthropic |
| **Alec Radford** | OpenAI researcher; METR advisor | Bridges OpenAI and METR |
| **David Duvenaud** | U of T professor; co-author on Anthropic paper; Apollo advisor | Bridges academic AI safety, Anthropic, and Apollo |
| **Yoshua Bengio** | Turing Award; METR advisor; reviewed Anthropic's alignment faking paper | Bridges academic AI safety and METR |
| **Daniel Kokotajlo** | Ex-OpenAI; Apollo Research advisor | Bridges OpenAI and Apollo |
| **Samuel R. Bowman** | Co-author on both Anthropic papers; previously NYU | Bridges academic NLP and Anthropic safety |

### Recent Research Directly Relevant to Captain's Work

| Paper/Project | Company | Why it matters |
|--------------|---------|----------------|
| Constitutional Classifiers (Jan 2025) | Anthropic Safeguards | Adversarial jailbreak defense — Captain's fight card documents analogous adversarial dynamics |
| Alignment Faking (Dec 2024) | Anthropic Alignment Science + Redwood | Model deception under training pressure — Captain's slopodar documents related failure modes |
| Sabotage Evaluations (Oct 2024) | Anthropic Alignment Science | Four sabotage modalities tested — Captain's governance framework is a control protocol against these |
| Preparedness Framework v2 (Apr 2025) | OpenAI | Defines tracked/research risk categories — Captain's project implements their pipeline at small scale |
| Measuring AI Ability to Complete Long Tasks (Mar 2025) | METR | Agent task completion benchmarking — Captain's 200+ hour sustained agentic engagement is data for this |
| AI Developer Productivity Study (Jul 2025) | METR | RCT on AI coding productivity — Captain's build-reflect correlation is complementary data |

---

## Part C: What Remains Unknown

### Confirmed gaps (exhaustive search of public pages found nothing)

| Company | Gap | Why it matters | Recommended next step |
|---------|-----|----------------|----------------------|
| Anthropic | Frontier Red Team lead name | Direct hiring manager for Red Team Engineer role | Search LinkedIn for "Frontier Red Team Anthropic" |
| Anthropic | Safeguards team lead name | Ethan Perez and Jan Leike are senior but formal lead is unclear | Search LinkedIn for "Safeguards Anthropic" |
| Anthropic | Trust & Safety lead name | Distinct from research teams | Search LinkedIn for "Trust Safety Anthropic" |
| DeepMind | AI Psychology & Safety team lead | Direct hiring chain for FTC role #1 | Search LinkedIn for "AI Psychology DeepMind" or "AI Ethics Safety DeepMind" |
| DeepMind | ReDI team lead | Below Helen King in org chart | Search LinkedIn for "Responsible Development Innovation DeepMind" |
| OpenAI | Preparedness team lead (post-Leike departure) | Manages Emerging Risks Analyst hiring | Search LinkedIn for "Preparedness OpenAI" |
| OpenAI | SAG members | Review all safety decisions | Not publicly discoverable; only via warm introduction |
| OpenAI | Red Teaming Network coordinator | Manages external red teamers | Watch openai.com/safety for next round announcement |

### Information that requires human LinkedIn search

The Captain should search for:
1. `"Frontier Red Team" Anthropic` — LinkedIn
2. `"Safeguards" Anthropic` — LinkedIn
3. `Jan Leike` — LinkedIn (confirm current title at Anthropic)
4. `Ethan Perez Anthropic` — LinkedIn (confirm role)
5. `"AI Psychology" OR "AI Ethics" DeepMind` — LinkedIn
6. `Helen King DeepMind` — LinkedIn (explore her network for reports)
7. `"Preparedness" OpenAI` — LinkedIn
8. `Marius Hobbhahn Apollo Research` — LinkedIn (before applying)

---

## Part D: Warm Introduction Paths

Based on the community connections identified:

| Path | Via | To | Mechanism |
|------|-----|-----|-----------|
| METR → OpenAI | Alec Radford (METR advisor, OpenAI researcher) | OpenAI safety team | Community engagement at METR first |
| Apollo → OpenAI | Daniel Kokotajlo (Apollo advisor, ex-OpenAI) | OpenAI Preparedness context | Apollo engagement first |
| Alignment Forum → Anthropic | Evan Hubinger, Ryan Greenblatt are active posters | Anthropic Alignment Science | Post Captain's research on Alignment Forum |
| AISC → multiple | AISC alumni go to Anthropic, DeepMind, METR, Apollo | All targets | Apply to AISC12 or propose project |
| MATS → multiple | 446+ alumni across all target companies | All targets | Submit EOI (expression of interest) |
| Redwood Research → Anthropic | Buck Shlegeris collaborates with Anthropic | Anthropic Alignment Science | Community engagement |

---

## Part E: Summary Recommendations

1. **DeepMind FTC (deadline 10 March):** Helen King is the most senior named safety person. The Captain cannot identify the direct hiring manager from public sources. Apply now with the materials prepared. After applying, search LinkedIn for Helen King's network.

2. **Anthropic (all 3 roles):** Jan Leike, Ethan Perez, and Evan Hubinger are the most senior safety researchers identifiable from papers. The blog posts explicitly link to hiring pages for "Research Engineers / Scientists in Alignment Science" and "Safeguards." Apply and reference the fight card.

3. **OpenAI:** The most opaque company. The Preparedness Framework v2 is the key document to reference. The SAG is the decision-making body but members are unnamed. The Red Teaming Network is the lowest-friction entry point.

4. **METR:** Beth Barnes is the founder/CEO. Team is fully public. Small nonprofit with high credibility. The Captain's methodology and honest limitations assessment align with METR's values.

5. **Apollo Research:** Marius Hobbhahn (CEO), Charlotte Stix (Head of Governance). Small team, London-based. The Captain's fight card is directly relevant to their scheming-detection research.

---

*This document should be updated as the Captain conducts manual LinkedIn searches and community engagement. Mark each update with date and source.*
