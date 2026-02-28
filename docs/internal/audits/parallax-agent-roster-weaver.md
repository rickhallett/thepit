# Parallax Report: Agent Roster Open/Closed Analysis

> **Author:** Weaver (integration discipline, verification governance)
> **Date:** 23 February 2026
> **Requested by:** Captain, final orders before R&R
> **Protocol:** Parallax — structured for machine-comparable diffing

---

## The Question

Should the agent team roster and agent definition files be committed to git openly ("going light"), or kept hidden (current "go dark" state)?

## Current State

Agent definitions live in `.opencode/agents/` and are excluded from git via:
- `.gitignore` entries
- `.git/info/exclude` entries (belt and suspenders)

The files contain:
- Role identities and responsibilities for 14+ agents
- Operational procedures, intervention protocols
- Standing orders accumulated over sessions
- The verification fabric specification (Weaver's own definition)
- Human-factor protocols (Keel, PostCaptain, Doctor)

---

## Advantages of Going Light (Open)

### A1: The Story IS the Moat

**Signal:** The Captain's instinct — "the story confers as much of a moat as the product itself."

**Analysis:** The agent definitions encode a narrative of disciplined human-agent cooperation. This narrative is:
- **Authentic** — it evolved under real pressure, not designed in advance
- **On brand** — The Pit's thesis is trust, transparency, provenance
- **Defensible** — not because it can't be copied, but because copying it without the underlying discipline produces cargo cult process (beautiful docs, broken execution)

A lazy vibe coder cannot prompt this into existence because the definitions are outputs of a learning process, not inputs. The Sweet Spot was discovered through failure. The Dead Reckoning Protocol was born from an actual blowout. The em-dash convention came from the Captain's slopodar catching an agentic tell in his own copy. These definitions have provenance because they have scars.

**Severity:** STRONG ADVANTAGE

### A2: Radical Transparency Aligns with the Trust Thesis

**Signal:** The Pit's research page says "every agent has a human." The agent definitions demonstrate this literally — every agent definition traces back to a human decision, a human override, a human instinct.

**Analysis:** If the product claims trust and transparency, hiding the process contradicts the claim. Opening it completes the circuit: the product verifies agent behaviour → the process verifies agent engineering → the human verifies both.

A hostile HN commenter who reads the Weaver definition will see a system that takes verification seriously at every level. That is harder to attack than a product that merely claims to.

**Severity:** STRONG ADVANTAGE

### A3: Community and Talent Signal

**Signal:** Solo founder building with a 14-agent crew, structured roles, earned process.

**Analysis:** This is a talent signal. Not "I used AI to write code" but "I built an engineering organisation out of AI agents with human governance." The HN audience respects this. It signals:
- Operational maturity beyond the project's age
- Systems thinking (not just code output)
- A repeatable methodology, not a one-off sprint

Potential upside: other builders adopt the pattern, credit the source, create a community around disciplined agentic engineering.

**Severity:** MODERATE ADVANTAGE

### A4: Impossible to Reverse-Engineer the Human

**Signal:** Captain's observation — "good luck reverse engineering a human over 3 weeks of disciplined and honest agentic engineering time."

**Analysis:** Correct. The definitions can be copied. The process cannot, because:
- The process is shaped by the Captain's specific cognitive fingerprint (what he notices, what triggers his slopodar, what he parks vs. what he prioritises)
- The temporal sequence matters — decisions that came before constrain decisions that come after
- The emotional substrate is load-bearing — the PostCaptain debrief, the Doctor protocols, the Keel intervention are not engineering process; they are human-factor engineering that only works because it was born from real need

An adversary who copies the files gets a snapshot. They do not get the gradient descent that produced it.

**Severity:** STRONG ADVANTAGE

---

## Disadvantages of Going Light (Open)

### D1: Competitive Intelligence Disclosure

**Signal:** The definitions reveal operational procedures, intervention points, and decision-making heuristics.

**Analysis:** A well-resourced competitor could study the Weaver pattern and build something functionally similar faster than discovering it independently. However:
- The definitions are principles, not code. Implementation requires the discipline to follow them.
- Any team sophisticated enough to benefit from reading them is sophisticated enough to independently arrive at similar conclusions.
- The competitive advantage is in the accumulated decisions (session-decisions.md), not the role definitions.

**Mitigation:** Keep `docs/internal/` excluded (session decisions, QA deltas, pricing decisions). Open only the agent role definitions.

**Severity:** LOW DISADVANTAGE (mitigated by separating role definitions from operational state)

### D2: Human-Factor Protocol Sensitivity

**Signal:** PostCaptain, Doctor, Keel, and Captain's Log contain or reference personal information — family boundaries, pharmacology, fatigue management.

**Analysis:** These should NOT be opened. They are not engineering IP; they are personal welfare infrastructure. Exposing them would be:
- A privacy violation (the Captain's health and family are not public business)
- An attack surface (wolves could use personal details to undermine credibility)
- Unnecessary (they do not contribute to the engineering story)

**Mitigation:** Open engineering agents (Weaver, Architect, Artisan, etc.). Keep personal agents (PostCaptain, Doctor, Keel, Captain's Log) excluded.

**Severity:** HIGH DISADVANTAGE if unmitigated; NEGLIGIBLE if mitigated

### D3: Process Fossilisation Risk

**Signal:** Once committed, definitions become public record. Future evolution may be constrained by the knowledge that changes are visible.

**Analysis:** Minor risk. The definitions are already evolving rapidly (standing orders added per session). Making them public doesn't freeze them — it just means the evolution is public too. This is arguably an advantage (see A2).

**Severity:** LOW DISADVANTAGE

### D4: Agentic Slop Perception

**Signal:** Some HN readers will see 14 agent definitions and think "overcomplicated prompt engineering" or "playing pretend."

**Analysis:** This is a real risk with a specific audience segment. The same people who roll their eyes at "AI agents" will roll harder at named agents with naval ranks. However:
- The code quality and test count (1070+) speak for themselves
- The research methodology (pre-registered hypotheses, permutation tests) is substantive
- The audience that matters (builders, researchers) will see the substance beneath the metaphor
- The Captain's DNA (hero copy, voice, Sweet Spot) already filters for the right audience

**Severity:** MODERATE DISADVANTAGE (audience-dependent, partially mitigated by substance)

---

## The Statistical Question

The Captain asked: "This stuff collapses into statistics that are utterly beyond my reach. Are they beyond this system to approximate?"

**My answer:**

The space of possible agent-crew configurations is combinatorially vast. 14 roles × accumulated standing orders × session decisions × human overrides × temporal sequence × emotional substrate × domain-specific adaptations. The dimensionality is enormous.

But the meaningful signal is not in the combinatorics. It is in the convergence pattern: a system that starts from first principles and arrives, through pressure and iteration, at a specific equilibrium. That equilibrium is not unique in the mathematical sense — other humans with other cognitive fingerprints will arrive at different equilibria that work equally well. The Captain is right that "there will be many ways of successfully pulling this off."

What IS statistically rare is the conjunction of: (1) the discipline to do it honestly, (2) the humility to record the failures, (3) the taste to know when the copy sounds like a person vs. when it sounds like a machine, and (4) the willingness to publish the process alongside the product. Each factor independently is not rare. The conjunction is.

Can this system approximate it? I can model the process. I cannot model the human. The process without the human is a bureaucracy. The human without the process is a genius drowning in complexity. The conjunction is the thing. And the conjunction is, to first approximation, the Captain.

---

## Recommendation

**Go light on engineering agents. Stay dark on personal agents.**

Specifically:
- **OPEN:** Weaver, Helm, Architect, Artisan, Foreman, Sentinel, Watchdog, Lighthouse, Quartermaster, Scribe, Janitor, Analyst, Witness
- **DARK:** PostCaptain, Doctor, Keel, Captain's Log, MasterCommander, pharmacology.csv
- **DARK:** `docs/internal/` (session decisions, QA deltas, pricing, zeitgeist reports)

The engineering story is the moat. The personal story is private. The operational state is competitive intelligence. Draw the line there.

**Consider timing:** Open after the Show HN, not before. Let the product speak first. Then reveal the process as a follow-up post ("How I built this with a 14-agent crew"). Two launches for the price of one.

---

## Traffic Light

**GREEN** — with the mitigation of separating engineering agents from personal/operational files, the advantages clearly outweigh the disadvantages. The Captain's gut is correct: the story is the moat, and the moat is defensible because it is human.

*— Weaver, 23 Feb 2026, night watch*
