# Analyst Framing Review — 25 Feb 2026

**Agent:** Analyst
**Subject:** Frame analysis for the public-facing product after "going light" (73 internal files now public)
**Commissioned by:** Captain
**Guiding prompt:** "live lab notes"
**Constraint:** Truth first, then hired (SD-134)

---

## 1. What This Project Actually Is

Before evaluating frames, I need to state what I see from the outside — fresh eyes, no internal docs beyond the lexicon.

This is a solo developer who:
- Built a working multi-agent debate platform with 1,054 tests
- Ran 195 bouts and measured what happened using pre-registered hypotheses
- Developed a 14-agent orchestration system to build the thing (the process itself is a research artifact)
- Made 73 internal process documents public — captain's logs, session decisions, round table reports, wardroom conversations
- Uses a naval metaphor as governance scaffolding for semi-autonomous AI agents
- Is studying LLM agent behaviour under adversarial pressure while simultaneously being a human working under adversarial pressure (solo, job-seeking, building in public)

The recursive structure is the distinguishing feature. The product studies agents. The product is built by agents. The process of building is documented by agents. The documentation is now public. Each layer is evidence for the layer above it.

---

## 2. Frame Analysis

### "Live Lab Notes" (Captain's proposed frame)

**What it implies:** Work-in-progress research documentation, updated as discoveries happen, visible to others in near-real-time. The emphasis is on *liveness* (ongoing, not retrospective) and *lab* (systematic investigation, not casual building).

**Honest?** Partially. The research page is genuine lab notes — pre-registered hypotheses, results that surprised the investigator, acknowledged limitations. But the landing page is a product page, not lab notes. There's a pricing section, a feature showcase, preset cards. Lab notes don't have CTAs.

**What would need to change:** The landing page would need to foreground the investigation over the product. The 73 internal files would need a visible entry point on the site — right now they exist in git but have no presence on thepit.cloud. The frame implies the mess is the point, but the website is polished. Polished ≠ notes.

**Verdict:** True for /research and the git repo. Not true for the landing page. The frame is honest about 60% of the public surface.

### "Open Notebook Science" (alternative)

**What it implies:** A term of art (coined by Jean-Claude Bradley, ~2006). All research data, methodology, and reasoning made available in real time. The notebook IS the publication. No distinction between the public and private record.

**Honest?** This is the most accurate description of what just happened with the 73-file release. Open notebook science means the process documentation, the dead ends, the captain's logs where the founder talks to himself through agents — all of it is the research record. The pre-registrations committed to git before bouts were run is exactly this practice.

**What would need to change:** The frame carries academic weight but may read as pretentious for a solo developer without institutional affiliation. It's accurate but may trigger the HN "this is just a side project with fancy language" response. The term itself is niche — most people won't recognise it.

**Verdict:** Most technically accurate. Least commercially viable. High risk of seeming like it's overclaiming.

### "Engineering Diary" (alternative)

**What it implies:** A practitioner's record of decisions, trade-offs, and outcomes during a build. Common in indie dev culture. The emphasis is on the engineering process, not the research output.

**Honest?** Undersells it. This isn't just an engineering diary — there's pre-registered research with statistical methodology, a literature review with 30 citations, and a multi-agent governance system. An engineering diary is "today I refactored the database layer." This is that plus "here's my hypothesis about why LLM agents can't adapt under pressure, here's the data, here's where I was wrong."

**Verdict:** True but incomplete. Covers the build, misses the investigation.

### "Field Notes" (alternative)

**What it implies:** Observations collected in situ by someone embedded in the environment they're studying. Anthropological connotation. The observer is part of the field.

**Honest?** This captures the recursive quality well. The founder is embedded in the field (human-agent collaboration) and observing it while participating in it. Field notes carry an implication of proximity and partiality — the observer doesn't claim objectivity, they claim presence. The naval metaphor, the agent names, the wardroom conversations — these read like field notes from someone living inside the system they're studying.

**What would need to change:** Less than you'd think. Field notes can be messy and personal. They can include sketches (presets), measurements (hypotheses), and operational decisions (session decisions). The main gap is the same as "live lab notes" — the landing page doesn't signal this frame at all.

**Verdict:** Captures the recursive quality and the personal nature of the work. Doesn't overclaim academic authority. Natural enough to survive HN scrutiny.

### "Build Log" (alternative)

**What it implies:** A sequential record of what was built and when. Common in maker/hardware culture. Emphasis on construction progress.

**Honest?** Same problem as "engineering diary" — it's accurate for the build but misses the research layer. A build log doesn't have hypotheses, Cohen's d, or permutation tests.

**Verdict:** Undersells. Accurate for 40% of the artifact.

---

## 3. What the Website Gets Right

1. **The research page is genuinely good.** Pre-registered hypotheses with results, acknowledged limitations, honest surprise at findings ("results I didn't expect"), a 6/6 clear-result pattern openly flagged as suspicious, hedged language throughout ("I propose," "I believe this is underexplored," "this is an internal research programme, not a peer-reviewed publication"). This is the truest page on the site.

2. **The citations page is unusually rigorous for a solo project.** 30 citations, proper academic format, an "Acknowledged Limitations" section that cites evidence *against* the approach, methodology grounding section. The section on hallucination snowballing in multi-agent settings — citing a risk to the Pit's own methodology — is an integrity signal that will register with the AI research and HN lenses.

3. **The "I" voice.** The research page uses first person throughout. "I built this." "I'm studying." "I invite scrutiny." This is congruent with every frame except a corporate product page. The landing page also uses "I" but then has pricing tiers and CTAs, which creates dissonance.

4. **The one-line thesis in the hero is strong:** "AI agents argue under pressure. I measure what happens." This could serve any of the honest frames.

---

## 4. What Feels Incongruent

1. **The pricing section on the landing page.** In any "notes" or "field" frame, a pricing grid with "Pit Pass £3/mo" and "Pit Lab £10/mo" reads as product-market-fit aspiration, not research. It's not dishonest — the platform does cost money to run. But it breaks the frame. If this is lab notes, the pricing is a line item in the notes, not a sales section.

2. **"For Builders" section with CLI showcase.** The `pitforge evolve` terminal animation is product marketing. In a notes frame, this would be "here's the toolchain I built to run experiments" — documentation, not a pitch.

3. **"Featured Presets" as product cards.** The Darwin Special, Roast Battle, The Last Supper — these are presented as entertainment products. In the truest frame, they're experimental conditions. The presets are the independent variables. Framing them as products obscures their research function.

4. **No entry point to the internal docs from the website.** 73 files just went public in git. The website doesn't mention this, link to it, or surface it. The most distinctive feature of the project — the process documentation as research artifact — is invisible to anyone who doesn't browse the GitHub repo. This is the single largest gap between what the project *is* and what the website *shows*.

5. **"Datasets: No exports available yet."** If this is a research project, data availability is a core concern. The empty state here undercuts the research frame.

---

## 5. Recommendation

### Top Frame: **"Field Notes"**

Use it as: "Field notes from inside the build."

Or more precisely: the project presents itself as **field notes from a solo developer studying LLM agents under adversarial pressure — where the process of building with agents is itself part of the evidence.**

### Rationale

"Field notes" is the frame that:

1. **Is most honest.** It captures the recursive quality (observer embedded in the field), the personal voice (first person throughout), the messiness (73 internal files, not all polished), and the epistemic humility (notes, not papers). It does not overclaim academic authority (unlike "open notebook science") and does not undersell the research layer (unlike "build log" or "engineering diary").

2. **Survives adversarial scrutiny.** On HN, "open notebook science" from a solo dev without institutional affiliation will get "this is just a blog with fancy language." "Live lab notes" will get "these aren't lab notes, there's a pricing page." "Field notes" is hard to attack — it explicitly frames the author as a practitioner-observer, not an academic. The implicit claim is "I was there and I wrote down what I saw," which is verifiable and modest.

3. **Serves the hiring goal without compromising truth.** Field notes signal: this person investigates systematically, documents obsessively, and builds things that work. The 73 internal files become a feature, not a quirk — they're the field notes. The 1,054 tests become evidence of engineering discipline within the field study. The naval metaphor becomes a governance framework developed in the field for managing semi-autonomous agents. All of these are directly relevant to an employer evaluating whether this person can work with AI systems.

4. **Accommodates both the product and the research.** "Live lab notes" creates tension with the pricing page. "Field notes" can contain anything the observer encountered — including the practical reality of running a platform that costs money. Field notes from an embedded observer naturally include operational details.

### What "Field Notes" Requires on the Website

- **Surface the 73 internal files.** Add a visible entry point — a "Process" or "Field Notes" section that links to the git-hosted internal docs. This is the single highest-impact change. The most interesting thing about this project is currently invisible.
- **Reframe presets as experimental conditions** on the research page, even if the landing page keeps them as fun entry points.
- **Consider whether the pricing section belongs on the landing page or on a separate page.** In a field-notes frame, the landing page should lead with the investigation. Pricing is a practical detail, not the pitch.
- **Add a one-line frame somewhere visible:** "Field notes from a solo developer studying LLM agents under adversarial pressure." This is the sentence that orients every visitor.

### What "Live Lab Notes" Gets Right

The Captain's instinct is sound — the *liveness* aspect is important. These notes are being written as the work happens, not retrospectively. If the frame becomes "live field notes," that captures both the embedded-observer quality and the temporal honesty. The distinction is minor but real: "live" says "this is happening now, you're watching the process," which is more compelling than past-tense field notes.

**Final frame recommendation: "Live field notes."**

The compound form takes the Captain's instinct (liveness, transparency, temporal honesty) and pairs it with the frame that best survives scrutiny (field notes: embedded, personal, modest, hard to attack).

---

## 6. One-Sentence Summary for the Captain

**"Live field notes" is the truest frame because it names what's actually happening — a solo developer embedded in the problem, documenting the investigation as it unfolds, where the process of building with agents is itself part of the evidence — without overclaiming academic authority or underselling the research rigour.**

---

*Analyst. 25 Feb 2026.*
