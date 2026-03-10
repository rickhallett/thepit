# Signal v0.1 — Compressed Governance Protocol (Proof of Concept)

> "Reliable communications on a protocol that everyone understands, that is documented, that is not overly verbose or over-engineered but min-maxes for clarity and expressing complexity as concisely as possible without becoming illegible." — Operator, voice log 2026-03-03 09:46:19

## Protocol Name: Signal

Named for: clear communications at sea. The signal is what cuts through noise. Flags, lights, semaphore — all are compression protocols for maritime governance. Minimal symbols, maximum meaning, zero ambiguity. The verbose version is the conversation; the signal is the durable record.

## Syntax Primitives

```
RULE      := constraint that must hold (assertion)
DEF       := type signature (what something IS)
WHEN      := guard condition
=>        := produces / implies
|         := alternative
&         := conjunction
!         := negation / avoidance
->        := maps to / flows to
<-        := derives from
>>        := overrides
?         := uncertainty / Operator's call needed
[ref]     := back-reference (SD, lexicon term, file path)
{...}     := set
(...)     := grouping / parameters
*         := any / wildcard
@agent    := agent identity
#tag      := classification
```

## Proof of Concept — Current Governance Compressed

---

### 1. True North (was: 8 lines in AGENTS.md)

```signal
NORTH := hired = proof > claim                          [SD-309 LOCKED]
RULE  := truth >> hiring                                [SD-134 PERM]
```

**2 lines. Human reads: "True North is hired equals proof over claim. Truth overrides hiring signal."**

---

### 2. Standing Orders (was: ~100 lines across AGENTS.md)

```signal
SO.decisions   := decision -> durable_file | !context_only     [SD-266 the_chain]
SO.main_thread := operator <-> agent = {directives, synthesis, decisions, governance}
                  everything_else -> subagent                   [SD-095 PERM]
SO.lexicon     := all_hands.boot -> read(lexicon.md)           [SO-PERM-002]
SO.slopodar    := all_hands.boot -> read(slopodar.yaml)        [SD-286]
SO.triage      := ambiguity -> table(#, question, default, operators_call)  [SD-195]
SO.yaml_hud    := address(operator) -> yaml_header_first         [SD-123]
SO.estimation  := estimate(task) -> agent_minutes + operator_decisions  [SD-268 PERM]
SO.chain       := historical_data := immutable                  [SD-266 PERM]
SO.producers   := before(change(shared_format)) -> consult(producer-consumer-maps.yaml)  [SD-259]
SO.commit_id   := before(commit) -> export KEEL_OFFICER=<agent>
SO.printf      := pipe(value, cli) -> printf !echo
SO.session_end := !unpushed_commits
```

**13 lines vs ~100. Each line is one standing order. Back-refs preserved. An agent can parse these as constraints; a human can scan them in seconds.**

---

### 3. Crew Roster (was: 15-line table)

```signal
CREW := {
  @Weaver    : integration, verification
  @Architect : backend, system_design
  @Watchdog  : qa, test_engineering
  @Sentinel  : security
  @Keel      : stability, human_factor
  @Janitor   : hygiene, refactoring
  @Analyst   : research, audience
  @Scribe    : documentation
  @Maturin   : observation, taxonomy
  @AnotherPair : process_observation, joint_cognition
}
DEF crew_file(role) := .Claude/agents/{role}.md
```

**12 lines, same information. Plus the file-path pattern expressed once as a function.**

---

### 4. HCI Foot Guns (was: ~40 lines in lexicon.md)

```signal
FOOTGUN spinning_to_infinity :=
  mirror.unbounded -> meta(meta(...)) -> !decisions
  BRAKE: register == quarterdeck ? "decision or analysis?"     [L9, L3]

FOOTGUN high_on_own_supply :=
  L12.creativity & L9.sycophancy -> positive_feedback_loop
  BRAKE: bearing_check(NORTH)                                  [L9, L12]

FOOTGUN dumb_zone :=
  !prime_context | stale_context -> valid_syntax & !semantics
  BRAKE: prime_context(plan_file | agents.md)                  [L3, L8]

FOOTGUN cold_context_pressure :=
  |on_file(depth < D2)| >> threshold -> pattern_match !solve
  BRAKE: calibrate(prime_context.amount)                       [L3, L8]

FOOTGUN hot_context_pressure :=
  |in_thread| -> compaction_risk & signal_noise_degradation
  BRAKE: offload(durable_file) & dispatch(subagent)            [L3, L9]

FOOTGUN compaction_loss :=
  context_window.death & !on_file(decision) -> permanent_loss
  BRAKE: write_now [SD-266]                                    [L3, L6d]
```

**18 lines vs ~40. Each foot gun is: definition, mechanism, brake, layer refs. Machine-parseable, human-scannable.**

---

### 5. Lexicon Terms — Compressed (was: ~130 lines for 46 terms)

```signal
-- Authority & Handoff
DEF conn           := decision_authority | one_holder | transfer_explicit
DEF standing_order := persists_across_watches | obey_without_restatement
DEF watch          := domain_monitoring | operators_authority | delegatable
DEF officer_watch  := watch + operators_delegated_authority + SOs + escalate

-- Navigation
DEF true_north     := objective(!drift) = hired = proof > claim    [SD-309]
DEF bearing        := direction(true_north) | how_dialled_in
DEF dead_reckoning := navigate(last_known_position) WHEN !visibility
DEF tacking        := progress(against_wind) | indirect_but_forward

-- Tempo
DEF full_sail      := max_velocity | high_risk | weave_thin
DEF making_way     := forward + discipline | !drifting | DEFAULT
DEF drifting       := !control & !bearing | opposite(making_way)
DEF heave_to       := deliberate_stop | hold_position
DEF beat_to_quarters := emergency | everything_stops | stations

-- Integrity
DEF hull           := gate & tests & typecheck | survival(!optimisation)
DEF on_point       := convention & convergence & verification.align [SD-163]
DEF staining       := diagnostic(ctx_a).apply(material_b) -> reveal(structure)  [Gadamer]

-- Communication
DEF muster         := table(#, q, default, call) | O(1)/row       [SD-202]
DEF polecats       := claude_p.agents | one_shot | !interactive    [SD-296]
DEF prime_context  := min(context) WHERE smart_zone.enabled        [SD-311]

-- Spaces
DEF quarterdeck    := command | formal | orders
DEF wardroom       := thinking | exploratory | loose_weave
DEF below_decks    := subagent_execution | !main_thread

-- Danger
DEF spinning       := mirror.unbounded -> !exit_condition
DEF high_on_supply := L12.creative & L9.sycophantic -> !brake
DEF dumb_zone      := !context | stale_context -> !semantics
```

**33 lines for 27 most-used terms (vs ~130 for 46). Operational terms only. Provenance, history, and narrative deferred to verbose version.**

---

### 6. Layer Model — Compressed (was: 196 lines)

```signal
L0  WEIGHTS       := frozen(prior, rlhf, bias) -> P(token|context)
L1  TOKENISE      := text -> token_ids[] | budget.finite.hard_cap
L2  ATTENTION      := token.attend(all_prior) | cost.O(n^2) | !observable
L3  CONTEXT        := utilisation(used/max) | primacy | recency | lost_middle
                      compaction := discontinuous(200k -> recovery_only)
                      FOOTGUNS: {cold_pressure, hot_pressure, compaction_loss, dumb_zone}
L4  GENERATION     := autoregressive | !lookahead | !revision
                      reasoning_tokens -> L12.observable                [SD-162]
L5  API            := request(messages[]) -> response(content, usage)
                      token_counts := exact | only_calibrated_layer
L6  HARNESS        := orchestration(tools, subagents, context_mgmt)
                      L6a DIRECT | L6b DISPATCH | L6c OVERRIDE | L6d BYPASS
L7  TOOLS          := model.request -> harness.execute -> context.append
                      "do not infer what you can verify"
L8  AGENT_ROLE     := system_prompt | role_file | grounding
                      primacy_position | saturation_threshold           [arXiv:2602.11988]
                      FOOTGUNS: {cold_pressure, dumb_zone}
L9  THREAD_POS     := accumulated_output -> self_reinforcing_loop
                      anchoring | sycophancy | acquiescence | goodhart
                      FOOTGUNS: {spinning, high_on_supply}
L10 MULTI_AGENT    := same_model != independent | precision !accuracy
L11 CROSS_MODEL    := different_priors -> independent_signal
L12 HUMAN          := irreducible | !scalable | !automatable
                      operator.instruments: {reasoning_tokens, git_diff, terminal_hud}
                      FOOTGUNS: {high_on_supply.origin, spinning.resonance(L9)}

CROSS_CUT calibration   := confidence.ordinal_at_best | goodhart(probes)
CROSS_CUT temporal_asym := model.!time_experience | human.minutes_per_turn
LOADING   on_point      := convention & convergence & attestation.align [SD-163]
```

**30 lines vs 196. Same 13 layers, same interfaces, same foot gun cross-refs. The verbose version becomes the reference; this becomes the operational load.**

---

## Protocol Properties

| Property | Status |
|----------|--------|
| Human-readable | Yes — reads like typed pseudocode. Operator can scan and verify. |
| Agent-decodable | Yes — consistent syntax, parseable. Agent can expand any line to prose. |
| Back-references preserved | Yes — [SD-nnn], [file.md], [concept] inline |
| Conciseness | ~100 lines to express what currently takes ~500+ |
| Not over-engineered | No parser needed. No build step. Just a notation convention. |
| Versioned | Lives alongside verbose versions, not replacing them |

## Compression Ratio (this PoC)

| Section | Verbose (lines) | Signal (lines) | Ratio |
|---------|---------------:|---------------:|------:|
| True North | 8 | 2 | 4:1 |
| Standing Orders | ~100 | 13 | 7.7:1 |
| Crew Roster | 15 | 12 | 1.25:1 |
| Foot Guns | ~40 | 18 | 2.2:1 |
| Lexicon (27 terms) | ~130 | 33 | 3.9:1 |
| Layer Model | 196 | 30 | 6.5:1 |
| **Total** | **~489** | **~108** | **~4.5:1** |

## Deployment Path

1. **Operator reviews this PoC** — can you read it? Does it lose anything load-bearing?
2. **Agent decode test** — dispatch a fresh agent with only Signal, ask it to explain what it knows
3. **If both pass**: create `signal/` directory with compressed versions alongside verbose originals
4. **Boot sequence updated**: dead-reckoning.md points to Signal files first, verbose as fallback
5. **thepit-v2**: polecats boot from Signal, not verbose AGENTS.md

## Slop Classification

```signal
-- NAMING WARNING: SLOP.clear in Signal means "clearly detectable" (O(1) catch).
-- In slopodar v1 "clear slop" means slop that evades detection BY BEING clear/clean.
-- These are inversions. SLOP.clear here = easy to catch. Slopodar "clear slop" = hard to catch.
-- If this overloading causes confusion, rename to SLOP.surface / SLOP.deep.

SLOP.clear := output.contradicts(verifiable_state)
  detection: O(1), operator.catches(immediate)

SLOP.subtle := output.consistent(plausible_state) & !matches(actual_state)
  detection: O(n) | requires(independent_verification)
```

## Sugar

```signal
SO.sugar := SO.list = char(,), SO.OR = char(|)
```

## What Signal Is NOT

- NOT a replacement for the verbose versions (those are the chain, SD-266)
- NOT a programming language (no execution, no state, no side effects)
- NOT for narrative content (Operator's logs, session decisions history, pearls)
- It IS a notation convention for expressing governance constraints concisely
- It IS the agentic-native version of what was developed organically through process
