# Epic Map - noopit Post-Retreat

> **Date:** 2026-03-08
> **Status:** Directions with conviction, not final specifications. Operator still clarifying.
> **Decided by:** Operator (wardroom session, post-retreat)

## True North

- **True North:** hired = proof > claim [SD-309 LOCKED]
- 3 epics, independent, prioritisable, auditable
- Status: Directions with conviction, not final specifications
- Operator still clarifying

## Epic Map

### E1: Pitkeel Human Protection Upgrade

**Rationale:** When L12 (human) degrades, all layers degrade. Phases 1-2 were productive but carried unsustainable human cost. **Connects to:** cognitive deskilling, hot context pressure [SD-312].

- **E1.1 Reserves** - New HUD header "Reserves", display only (not in commit tags)
  - Tracks: time since meditation, time since exercise
  - When either exceeds 24h: pitkeel triggers CLI shutdown
  - Warnings at: 6h remaining, 1h remaining
- **E1.2 Session noise** - Progressive noise based on session length
  - Ultradian cycle: ~90min, optimal block
  - Danger threshold: 3h (2 cycles)
  - Mechanism: Operator doesn't notice flow state, so thresholds become invisible

### E2: Portfolio (4 parts)

- **E2.1 Case studies** - Select 3 from own work showing governance working or failing
  - Deep annotation beats invisible sprints; 3 well-explained beats 100 unseen
  - The signal is proof
  - Evolution: early chain vs recent, show the arc
- **E2.2 Workflow page** - "Workflow explained": layer model + operations + results
- **E2.3 Signal primer** - "Signal explained": primer (why bother) + examples (working, failing)
  - Primary purpose: structured verification that LLM understood instructions, before agentic execution arc [?unnamed term]
  - Audience: technical peers. Bar: must not be laughable.
  - Lead with data (SD-314): 4.5:1 compression, 6/6 decode, 8/8 questions
- **E2.4 Side quest** - Explore "functional agentic programming" or "adversarial metaprompting"
  - Q1: Is there unexpressed process thinking?
  - Q2: Does FP explain what we already do?
  - Evidence: SD-266 immutable chain, append-only logs, pure verification gates

### E3: Research

- **E3.1 Signboard** - Blog curating peer-reviewed literature
  - Layer model touches many domains, so curation beats coverage
  - Rule: peer-reviewed only, no preprints treated as established
  - Mechanism: refs.yaml (append-only, tagged by layer) feeds a curated signboard view
  - Small frequent actions, compound interest, not big annotation
- **E3.2 Hypotheses** - Identify a few, per layer of the model
  - Rule: seek refutation, not confirmation
- **E3.3 Open Brain** - Suspicion not conviction, explore not commit
  - Agentic arcs + gauntlet accumulate what works and what doesn't
  - Open question: RAG + semantic recall in an agentic role? Corpus = mistakes, events, logs, refs, notes. Surface relevant history to inform next steps.
  - Sequence: deeper research, then time-boxed prototype (analyst's task)

## Ordering

- **Order:** E1, then E2, then E3 [M10 DECIDED]
- **E1:** Smallest, ships first, validates the epic workflow
- **E2:** True North direct, produces proof artifacts
- **E3:** Strategic depth, longer horizon

## Muster Decisions (2026-03-08)

| # | Call | Decision |
|---|------|----------|
| M1 | Shutdown mechanism | Literal OS shutdown. Visceral by design. |
| M2 | Input mechanism | `pitkeel log-meditation` / `log-exercise`. Local `pitkeel.mk` gitignored. |
| M3 | Warning delivery | Belt and braces: HUD passive + inline active. |
| M4 | Portfolio examples | Our own chain. Early vs recent - show the evolution arc. |
| M5 | Portfolio destination | oceanheart.ai (Hugo site). |
| M6 | Signal primer audience | Technical peers. Must not be laughable. Lead with data. |
| M7 | "Agentic arc" naming | Deferred. |
| M8 | Research curation | Small frequent actions that compound. Append-only refs, curate from accumulation. |
| M9 | Open Brain scope | Prototype after deeper research. Analyst's task. |
| M10 | Epic ordering | E1 → E2 → E3. Confirmed. |
| M10-grace | Shutdown grace period | 10-minute warning + 60-second countdown. Protects in-flight git ops. |
| M2-location | Reserves data location | `docs/operator/reserves.tsv`. Committed (personal area). |
| M-daemon | Reserves checker | Background daemon ("sleep daemon"). Runs independently of agent sessions. |
