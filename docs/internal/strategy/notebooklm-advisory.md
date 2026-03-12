# NotebookLM Advisory — Magnum Integration Strategy

> Prepared: 2 March 2026
> Purpose: How to use Google NotebookLM to digest, internalise, and present the magnum materials
> Audience: Operator only

---

## 1. What NotebookLM Actually Is (and Isn't)

NotebookLM is a Gemini-powered research tool that ingests your documents and lets you interact with them. It does not crawl the web on its own (unless you use its "Fast Research" or "Deep Research" source discovery features). It reasons over what you upload. This is its strength for your use case: it will not hallucinate information about your project because it is grounded in your sources.

### Current capabilities (verified March 2026)

| Feature | What it does | Limits (free tier) | Limits (Plus) |
|---------|-------------|-------------------|---------------|
| **Chat** | Ask questions grounded in your sources, with inline citations | 50/day | 200/day |
| **Audio Overview** | AI-generated podcast (two hosts or single narrator) discussing your sources | 3/day | 6/day |
| **Video Overview** | AI-narrated slides with images, diagrams, quotes pulled from your docs | 3/day | 6/day |
| **Infographic** | Single-image visual summary of your sources (PNG download) | Limited | More |
| **Slide Deck** | AI-generated presentation, downloadable as PDF or PPTX | Limited | More |
| **Mind Map** | Interactive branching diagram of concepts and relationships | Unlimited | Unlimited |
| **Sources per notebook** | Max documents you can upload | 50 | 100 |
| **Source size** | Per document | 500,000 words or 200MB | Same |
| **Notebooks** | Total notebooks per account | 100 | 200 |

### Supported source formats

- PDF, Markdown, plain text, Microsoft Word
- Google Docs, Google Slides, Google Sheets
- Web URLs (text only — no images/embeds scraped)
- YouTube URLs (transcript only)
- Audio files (MP3, WAV, etc. — transcribed on import)
- Images (JPEG, PNG, etc.)
- Copy-pasted text

### What it cannot do

- **It cannot create polished data visualisations.** Infographics are AI-generated images — think illustrated summary posters, not D3 charts or precise Matplotlib plots. They are visually engaging but not analytically rigorous.
- **It cannot produce editable presentations.** Slide Decks download as PDF or PPTX but the content is AI-generated and may need significant revision. Think "first draft" not "final deck."
- **It cannot process YAML natively as structured data.** It will read YAML as text and extract meaning, but it will not parse fields programmatically. For the slopodar and fight card, this is fine — NLM will understand the content. But it won't build a sortable table from YAML fields.
- **Video Overviews are narrated slide shows, not produced videos.** They pull quotes, numbers, and diagrams from your sources into slides with AI voiceover. Useful for study, not for external presentation.
- **It does not remember across notebooks.** Each notebook is an isolated knowledge space. This is why notebook architecture matters (see Section 3).

### Audio Overview formats

This is the most valuable feature for your "meditation/walks" use case. Four formats available:

| Format | Description | Best for |
|--------|-------------|----------|
| **Deep Dive** (default) | Two hosts unpack and connect topics in lively conversation | Understanding relationships between ideas |
| **The Brief** | Single speaker, key takeaways, under 2 minutes | Quick review before an interview |
| **The Critique** | Two hosts give constructive evaluation of the material | Stress-testing your story before telling it |
| **The Debate** | Two hosts formally debate the topic | Understanding counterarguments to your claims |

You can also set length (Shorter / Default / Longer) and provide a steering prompt to focus on specific topics.

**Interactive Mode:** You can join the conversation mid-podcast and ask the hosts questions with your voice. They respond based on your sources and then resume. This is powerful for active recall during walks.

---

## 2. Data Privacy

Your data is not used to train NLM models unless you explicitly provide feedback (thumbs up/down). If you do provide feedback, Google may review the full interaction context. For the magnum materials — which contain personal strategy, named contacts, and job targets — the practical advice is: **do not click thumbs up or thumbs down on any response.** Use NLM for your own consumption and treat it as a private workspace.

NLM makes a static copy of uploaded documents. It does not track changes to your originals. If you update a source, you must re-upload.

---

## 3. Notebook Architecture — How to Organise the Magnum Materials

Do not put everything in one notebook. NLM's reasoning quality degrades when it has to search across too many unrelated sources. Cluster by theme. Each notebook should answer one question the Operator might face in an interview or community interaction.

### Notebook 1: "The Story" — What I Built and Why It Matters

**Purpose:** Internalise the one-page story and the narrative arc. This is the "tell me about yourself" notebook.

**Sources to upload:**
1. `plank-1-the-one-page-story.md`
2. `narrative-shape.md`
3. `narrative-layer.yaml` (NLM will read the YAML as text — the quotes, speakers, and arc structure will come through)
4. The Operator's log entry: `docs/internal/operator/operatorslog/2026/02/23-fair-winds.md`

**Why this grouping:** These four documents together tell the full story from compressed pitch (plank 1) through narrative density by arc (narrative shape) to the raw material (narrative layer). The Operator's log provides the emotional anchor.

**Suggested NLM interactions:**
- Chat: "What are the three most dramatic turning points in this project?"
- Chat: "Which arcs have the highest narrative density and what happened in them?"
- Chat: "If I had 90 seconds to explain this project to someone, what should I say?"

---

### Notebook 2: "The Fight Card" — Human vs. LLM, Round by Round

**Purpose:** Internalise the 16 documented instances of catching LLM failure modes. This is the portfolio piece for Anthropic, OpenAI, and Apollo roles.

**Sources to upload:**
1. `docs/internal/weaver/fight-card-human-vs-sycophantic-drift.md`
2. `sites/oceanheart/content/research/fight-card.md` (the public-facing version for comparison)
3. `slopodar.yaml` (the taxonomy these catches fed into)
4. `docs/internal/anotherpair/slopodar-delta-report.md`

**Why this grouping:** The fight card is your sharpest artifact. Pairing it with the slopodar shows that individual catches became a systematic taxonomy. The delta report shows the taxonomy was refined over time — not a one-shot classification.

**Suggested NLM interactions:**
- Chat: "For each round in the fight card, what was the LLM failure mode and how did the human detect it?"
- Chat: "Which slopodar patterns appear most frequently across the fight card rounds?"
- Chat: "If someone asked 'how do you know when an AI system is drifting,' what evidence from these documents would I cite?"

---

### Notebook 3: "The Data" — Build-Reflect Correlation and Quantitative Findings

**Purpose:** Internalise the empirical findings — Spearman's rho, the 17.8x narrative ratio, the phase analysis.

**Sources to upload:**
1. `plank-1-the-one-page-story.md` (for the quantitative claims)
2. Any correlation analysis files (check `notebooks/` for Jupyter notebooks with the analysis)
3. `docs/internal/session-decisions.md` (the 277+ decisions that constitute the dataset)

**Note:** The session decisions file is large. NLM can handle up to 500,000 words per source. If it exceeds that, split it by date range. The first 100 SDs alone demonstrate the pattern — engineering decisions in the early phase, reflective/governance decisions in the late phase.

**Why this grouping:** Separating the quantitative evidence from the narrative lets you rehearse the data-backed claims independently. When someone asks "what's your evidence," you reach for this notebook's material, not the story.

**Suggested NLM interactions:**
- Chat: "What is the Spearman correlation between engineering velocity and narrative density, and what does it mean in plain language?"
- Chat: "What changed between the early and late phases of this project?"
- Chat: "If a skeptic said 'correlation isn't causation,' what would I say about these findings?"

---

### Notebook 4: "The Governance Framework" — How the Ship Was Run

**Purpose:** Internalise the governance methodology — 13 agents, session decisions, the lexicon, standing orders, YAML HUD.

**Sources to upload:**
1. `AGENTS.md` (the full ship's orders)
2. `docs/internal/lexicon.md`
3. 2-3 selected main-thread exchanges (e.g., `2026-02-25-005-compaction-event.md`, `2026-02-26-001-maturins-symbol.md`, `2026-03-02-001-generalisability-and-warning.md`)
4. `docs/internal/dead-reckoning.md` (if it exists — the recovery protocol)

**Why this grouping:** The governance framework is what separates this from "I used ChatGPT a lot." The AGENTS.md is the constitution. The lexicon is the shared language. The main-thread exchanges are evidence the framework was used under pressure, not just designed.

**Suggested NLM interactions:**
- Chat: "How does the governance framework handle context window death?"
- Chat: "What are the standing orders that apply to all agents, and why do they exist?"
- Chat: "What evidence is there that this governance framework actually worked versus being aspirational?"

---

### Notebook 5: "The Targets" — Company Research and Application Strategy

**Purpose:** Rehearse company-specific talking points before interviews or outreach.

**Sources to upload:**
1. `plank-2-target-companies.md`
2. `plank-3-people-communities-playbooks.md`
3. `plank-4-timeline.md`
4. `plank-5-shortlist.md`

**Why this grouping:** These are the strategic planning documents. Keeping them in their own notebook means you can ask NLM role-specific questions without it being confused by technical project details.

**Suggested NLM interactions:**
- Chat: "For the Anthropic Red Team Engineer role, what are my three strongest talking points?"
- Chat: "What is the mutual exchange I offer DeepMind versus what I offer OpenAI?"
- Chat: "If Apollo Research asks why I'm interested in scheming detection, what from my project is relevant?"
- Chat: "Rank my top 7 roles by how strong the fit is between what they need and what I have."

---

### Notebook 6 (Optional): "The Mirror" — Honest Self-Assessment

**Purpose:** Prepare for the hard questions. Every interviewer will probe for self-awareness.

**Sources to upload:**
1. Fight card rounds where you caught yourself (not just the system)
2. Main-thread exchange: `2026-02-25-003-dismissed.md`
3. Any entries from the session decisions where you made mistakes or reversed course
4. The Operator's confession quotes from arc-17 (extract from narrative-layer.yaml or narrative-shape.md)

**Why this grouping:** This notebook is for practising intellectual honesty under pressure. "What went wrong? What would you do differently? Where did the framework fail?"

**Suggested NLM interactions:**
- Chat: "Where did the governance framework fail, based on these documents?"
- Chat: "What are the biggest limitations or weaknesses of this project?"
- Chat: "If an interviewer said 'this sounds like an elaborate hobby project,' how would I respond honestly?"

---

## 4. Audio Overview Plan — "Podcast Episodes" for Walks

This is where NLM earns its keep. Generate these episodes across your notebooks. Download each as MP3. Load onto your phone. Listen during meditation, walks, commutes.

### Episode Plan

| # | Notebook | Format | Steering Prompt | Purpose |
|---|----------|--------|-----------------|---------|
| 1 | The Story | Deep Dive | "Focus on the three-act structure: what was built, what was found, what is sought. Emphasise the transition from engineering to reflection." | Internalise the narrative arc |
| 2 | The Fight Card | Deep Dive | "Walk through each round of the fight card chronologically. For each round, explain what the LLM did wrong and how the human caught it. This is a story about adversarial evaluation in practice." | Memorise the 16 rounds |
| 3 | The Fight Card | The Debate | "One host argues these are genuine LLM failure modes that matter for AI safety. The other argues these are normal software bugs dressed up in dramatic language. Debate honestly." | Prepare for skeptics |
| 4 | The Data | Deep Dive | "Focus on the Spearman correlation findings and the 17.8x narrative ratio. Explain what these numbers mean, why they matter, and what they imply about the role of humans in agentic engineering." | Rehearse the quantitative story |
| 5 | The Governance | Deep Dive | "Explain the governance framework as if teaching someone how to run a multi-agent engineering project. What are the key principles, what are the standing orders, and why does each one exist?" | Internalise the framework |
| 6 | The Governance | The Critique | "Evaluate this governance framework honestly. Where is it strong? Where does it overengineer? Where would it break at scale? Be constructive but do not be kind." | Prepare for technical scrutiny |
| 7 | The Targets | The Brief | "For each of the top 7 target roles, give a 30-second pitch for why this candidate is a strong fit. Be specific about what artifacts map to what requirements." | Pre-interview quick review |
| 8 | The Mirror | Deep Dive | "This person spent 350 hours on a solo project between jobs. Explore honestly: what are the risks of this narrative? What questions will a hiring manager ask? What are the genuine weaknesses?" | Hardest episode. Most valuable. |
| 9 | The Story | The Brief | "90-second version. What did he do, what did he find, what does he want. No hedging." | Elevator pitch rehearsal |

**Production notes:**
- Generate episodes 1, 2, and 5 first. These are the core internalisation episodes.
- Episodes 3, 6, and 8 are adversarial. Generate these after you have absorbed the core material. They will be uncomfortable. That is the point.
- Episode 7 is tactical. Generate it the night before each interview or outreach session.
- Episode 9 is for the morning of an interview. 90 seconds, on your phone, in the car.

**Daily limit management:** Free tier = 3 Audio Overviews per day. You have 9 planned episodes. That is 3 days of generation. If you upgrade to Plus ($20/month), you get 6/day — done in 2 days. Given the stakes, the upgrade is worth it for the generation period alone.

---

## 5. Visual Outputs — What NLM Can and Cannot Do

### What NLM can do

**Mind Maps:** Generate a branching diagram of concepts from your sources. Interactive — you can expand/collapse branches and click nodes to ask follow-up questions. Downloadable as an image. These are useful for seeing how NLM understands the relationships between concepts in your documents. Generate one per notebook to verify NLM has correctly understood the structure.

**Infographics:** AI-generated single-image visual summaries. You can choose orientation (square, portrait, landscape), level of detail (concise, standard, detailed), and visual style (classic, whiteboard, watercolor, retro print, heritage, paper-craft, kawaii, anime, or custom). You can also provide a steering prompt.

Infographic options worth trying:
- Notebook 2 (Fight Card): "Create an infographic showing the 16 rounds of human-vs-LLM adversarial evaluation. Use a fight card / boxing match visual metaphor. Style: classic."
- Notebook 3 (Data): "Visualise the inverse correlation between engineering velocity and narrative density. Show the early phase versus late phase contrast."
- Notebook 4 (Governance): "Map the 13 agent roles and their relationships. Show the governance hierarchy with Weaver at the top."

**Caveat:** These are AI-generated images. They will look like illustrations, not like precise charts. They may contain visual errors (wrong numbers, misspelled labels, garbled text in images). Review every infographic carefully. They are useful as conversation starters and visual aids in informal settings, not as rigorous data presentations.

**Slide Decks:** AI-generated presentations. Two formats:
- **Detailed Deck:** Full text, self-contained, good for emailing
- **Presenter Slides:** Clean visuals with talking points, good for presenting live

Downloadable as PDF or PPTX. You can revise individual slides after generation (change text, layout, visuals — but not add/remove slides). Worth generating from Notebook 1 (The Story) as a starting point for any presentation you might need to give.

**Video Overviews:** AI-narrated slide shows. Multiple visual styles available (classic, whiteboard, watercolor, etc.). Two formats: Explainer (comprehensive) and Brief (core ideas). Worth generating from Notebook 1 and Notebook 2 as personal study material. Not suitable for external sharing without significant quality review.

### What NLM cannot do (and what to use instead)

| Need | NLM capability | Gap | Complementary tool |
|------|---------------|-----|-------------------|
| Precise statistical charts (Spearman scatter, PR/narrative timeline) | Infographic (approximate) | Not analytically precise | **Matplotlib/Seaborn** in Jupyter, or **Observable** for interactive |
| Editable, branded slide deck | Slide Deck (AI draft) | Not brand-controlled | **Google Slides / Keynote** — use NLM deck as content draft, rebuild in your tool |
| Professional video with your face and voice | Video Overview (AI narrated) | No human presenter | **Loom** for screen+face recording, **CapCut/DaVinci Resolve** for edited video |
| Relationship graph with precise node/edge data | Mind Map (approximate) | Not data-driven | **Obsidian** graph view (if you use it), or **Graphviz/Mermaid** for precise graphs |
| Formatted PDF report | Chat + Notes | No export as formatted report | **Typst** or **LaTeX** for formatted output, using NLM chat responses as content input |
| Portfolio website | Nothing | Out of scope | You already have **oceanheart.ai** on Hugo |

---

## 6. Integration Exercises — Pegging the Weights That Matter

These are specific exercises to run in NLM that go beyond passive listening. The goal is active recall and stress-testing.

### Exercise 1: The Elevator Pitch Gauntlet

In Notebook 1 (The Story), run this sequence:
1. Chat: "Give me a 30-second version of what this project is."
2. Read it. Rewrite it in your own words. Paste your version back as a Note.
3. Chat: "Compare my version with the sources. What did I miss? What did I add that isn't supported?"
4. Iterate until your version is tighter than NLM's.

### Exercise 2: The Skeptic Interview

In Notebook 6 (The Mirror), run this sequence:
1. Chat: "You are a senior AI safety researcher interviewing this candidate. Ask your five hardest questions."
2. Answer each question out loud (or in writing as a Note).
3. Chat: "Here are my answers. Based on the sources, where am I being vague, where am I overclaiming, and where am I underselling?"

### Exercise 3: The Company-Specific Drill

In Notebook 5 (The Targets), for each shortlisted role:
1. Chat: "I have an interview at [Company] for [Role]. Based on these documents, what are the three things I must communicate?"
2. Chat: "What is the mutual exchange — what do I offer them that they cannot get elsewhere?"
3. Chat: "What is the weakest point in my candidacy for this specific role?"
4. Generate a Brief Audio Overview with: "Prepare me for a 30-minute interview at [Company] for [Role]. Focus on what to lead with, what to avoid, and how to close."

### Exercise 4: The Fight Card Drill

In Notebook 2 (The Fight Card):
1. Chat: "Pick a random round from the fight card. Describe the situation but don't tell me the round number. I will try to identify which round it is and what the failure mode was."
2. Repeat 5 times. Track your accuracy.
3. If you can identify 12/16 rounds from description alone, you have internalised the fight card.

### Exercise 5: Quote Retrieval

In Notebook 1 (The Story):
1. Chat: "Find the most powerful quote from the Operator in each of the five densest arcs."
2. Read them. Can you place each quote in context? Do you remember what was happening when you said it?
3. For any quote you cannot place: Chat "What was happening in the project when this was said?"

---

## 7. Practical Setup — Step by Step

### Before you start

1. **Create a Google account** (or use your existing one) at notebooklm.google.com
2. **Consider upgrading to Plus** ($20/month via Google AI Plus). The free tier's 3 Audio Overviews/day and 50 sources/notebook will work, but Plus gives you 6 audio/day, 100 sources/notebook, and 200 chats/day. You will hit the free chat limit quickly when doing integration exercises.
3. **Prepare your files.** NLM accepts Markdown and YAML as text files. No conversion needed. Upload them directly.

### File preparation checklist

| File | Format | Size concern? | Prep needed |
|------|--------|---------------|-------------|
| plank-1 through plank-5 | Markdown | No | Upload as-is |
| narrative-layer.yaml | YAML | ~303 quotes, likely fine under 500K words | Upload as-is |
| narrative-shape.md | Markdown | No | Upload as-is |
| fight-card (internal version) | Markdown | No | Upload as-is |
| fight-card (oceanheart version) | Markdown | No | Upload as-is |
| slopodar.yaml | YAML | No | Upload as-is |
| slopodar-delta-report.md | Markdown | No | Upload as-is |
| session-decisions.md | Markdown | May be large (277+ entries) | Check word count. If over 400K words, split by date. |
| AGENTS.md | Markdown | No | Upload as-is |
| lexicon.md | Markdown | No | Upload as-is |
| Main thread exchanges | Markdown | No | Upload selected files, not all |
| Operator's log (23-fair-winds) | Markdown | No | Upload as-is |

### Setup sequence

1. Go to notebooklm.google.com
2. Create Notebook 1: "Magnum — The Story"
3. Upload the 4 sources listed in Section 3 for Notebook 1
4. Wait for NLM to process (usually seconds for Markdown)
5. Generate a Mind Map first — this is your sanity check. Does NLM understand the structure?
6. If the Mind Map looks reasonable, proceed to chat interactions and then Audio Overview generation
7. Repeat for Notebooks 2-6

### Daily workflow (suggested)

| Day | Action | Time |
|-----|--------|------|
| Day 1 | Set up Notebooks 1-3. Generate Mind Maps for each. Generate Audio Episodes 1, 2, 5. | 1 hour setup, then background generation |
| Day 2 | Set up Notebooks 4-6. Generate Audio Episodes 3, 6, 8. Run Exercise 1. | 1 hour setup |
| Day 3 | Generate Audio Episodes 4, 7, 9. Run Exercise 2. Start listening to episodes on walks. | 30 min setup |
| Day 4+ | Run Exercise 3 before each application. Run Exercise 4 until you hit 12/16. Run Exercise 5 for narrative depth. | 30 min per exercise |

---

## 8. Honest Assessment — Where This Helps and Where It Doesn't

### Where NLM is genuinely valuable

- **Audio Overviews for passive internalisation.** Listening to two AI hosts discuss your own project forces a perspective shift. You hear your work described by someone who is neither you nor your agents. This is the closest thing to a dry run of how others will perceive the story.
- **Interactive mode for active recall.** Joining the podcast and asking questions while walking is a form of rehearsal that paper review cannot replicate.
- **Chat with citations for fact-checking yourself.** When you make a claim about the project, you can verify it against your own sources. This catches overclaiming before an interviewer does.
- **Mind Maps for structural verification.** Seeing how an outside system organises your concepts reveals gaps in your own mental model.

### Where NLM will not help

- **It will not make you a better storyteller.** It will help you know the material. Telling the story with conviction comes from sitting with the material, not from generating more AI-mediated content about it. At some point, close the laptop and talk to a human.
- **It will not produce interview-ready visuals.** Any infographic or slide deck from NLM will need substantial human revision before showing to anyone.
- **It will not catch its own slop.** NLM is Gemini. Gemini is an LLM. The slopodar applies to NLM's output as much as to Claude's. When NLM summarises your fight card, it will produce the same confident-coherent-plausible prose you spent 16 rounds catching. Read its output with the same adversarial eye.
- **It cannot replace a real human mock interview.** If you can get a friend, former colleague, or mentor to spend 30 minutes grilling you, that is worth more than 30 hours of NLM interaction.

---

## 9. Cost-Benefit Summary

| Option | Cost | What you get |
|--------|------|-------------|
| Free tier | £0 | 3 audio/day, 50 sources/notebook, 50 chats/day. Enough for basic setup over 4-5 days. |
| Google AI Plus | ~£20/month | 6 audio/day, 100 sources/notebook, 200 chats/day. Comfortable for intensive integration week. Cancel after one month. |
| Google AI Pro | ~£50/month | 20 audio/day, 300 sources/notebook, 500 chats/day. Overkill unless you are generating many variants. |

**Recommendation:** Start with free tier. If you hit the chat limit on day 1 (you likely will during exercises), upgrade to Plus for one month. Cancel when integration phase is complete.

---

## 10. What To Do First

1. Upload plank-1 and narrative-shape.md to a test notebook right now.
2. Ask it: "What is this project about?"
3. Read the response. Is it accurate? Does it capture what matters?
4. If yes: proceed with the full notebook architecture in Section 3.
5. If no: the source material may need a brief contextual preamble. Add a Note (NLM's scratchpad feature) at the top of the notebook explaining: "This is documentation from a solo agentic engineering pilot study. The Operator is the human engineer. Weaver is the lead AI agent. The project ran for 24 days, 847 commits, 13 AI agents under a governance framework."

That preamble gives NLM the framing it needs to interpret the nautical metaphors and project-specific terminology correctly.

---

*End of advisory. The tools are ready. The material exists. The work now is absorption, not production.*
