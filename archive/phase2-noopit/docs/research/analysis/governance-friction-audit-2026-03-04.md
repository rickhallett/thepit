# Governance Friction Audit - Standing Orders and Controls

Audit date: 2026-03-04

Sources:
- `AGENTS.md`
- `docs/internal/lexicon.md`
- `docs/internal/slopodar.yaml`
- `docs/internal/layer-model.md`
- `docs/internal/session-decisions-index.yaml`

---

## Muster

| # | Control | Evidence of firing | Cost | Redundancy | Verdict |
|---|---|---|---|---|---|
| 1 | SO.decisions | No explicit firing record; SD-266 permanence stated | Boot tokens + durable write overhead | Overlaps with SO.chain | KEEP |
| 2 | SO.chain | No explicit firing record; SD-266 permanence | Ongoing immutability overhead | Overlaps with SD-297 collision protocol | KEEP |
| 3 | SO.estimation | No explicit firing record; SD-268 | Mild process overhead | Overlaps with HOTL/HODL framing | KEEP |
| 4 | SO.truth | No explicit firing record; SD-134 | Cognitive load, may slow delivery | Overlaps with True North / bearing checks | KEEP |
| 5 | SO.gate | No explicit firing record in files read; gate defined | Local test time + tool cost | Overlaps with Hull term | KEEP |
| 6 | SO.printf | No explicit firing record; CLAUDE.md rule | Minor friction vs echo | Overlaps with general CLI hygiene | KEEP |
| 7 | SO.session_end | No explicit firing record; stated only | Forces push discipline | Overlaps with CLAUDE.md "never end with unpushed commits" | MERGE |
| 8 | SO.yaml_hud | No explicit firing record; lexicon formalizes | Extra header tokens per message | Overlaps with Lexicon YAML HUD | MERGE |
| 9 | SO.uv | No explicit firing record; SD-310 | Tooling constraint | Overlaps with Conventions (uv only) | MERGE |
| 10 | SO.echo | SD-315 standing order; used in session | Token overhead per action | Overlaps with Lexicon Echo/Check Fire | KEEP |
| 11 | SD-286 slopodar-boot | SD-286 standing order; slopodar entries cite catches | Heavy boot context + cognitive load | Overlaps with slopodar entries | KEEP (consider reducing boot payload) |
| 12 | SD-297 sd-collision-protocol | No explicit firing record in files read | Low overhead | Overlaps with SO.chain immutability | MERGE |
| 13 | Gate: `pnpm run typecheck && pnpm run lint && pnpm run test` | No explicit "caught" instance on file | Time cost per change | Overlaps with Hull term only | KEEP |
| 14 | Footgun: spinning_to_infinity | Identified SD-299/SD-312; no prevention record | Cognitive overhead to self-check | Overlaps with Maturin's Mirror boundary | KEEP |
| 15 | Footgun: high_on_own_supply | Identified SD-299/SD-312; no prevention record | Cognitive overhead | Overlaps with bearing check / True North | KEEP |
| 16 | Footgun: dumb_zone | Identified SD-299/SD-312; no prevention record | Context management burden | Overlaps with Prime Context | KEEP |
| 17 | Footgun: cold_context_pressure | Identified SD-299/SD-312; no prevention record | Calibration time overhead | Overlaps with Prime Context | KEEP |
| 18 | Footgun: hot_context_pressure | Identified SD-299/SD-312; no prevention record | Encourages offload overhead | Overlaps with Clear the Decks | KEEP |
| 19 | Footgun: compaction_loss | Identified SD-299/SD-312; no prevention record | Forces durable writes | Overlaps with SO.decisions | KEEP |
| 20 | Slopodar: tally-voice | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with epistemic-theatre (adjacent) | KEEP |
| 21 | Slopodar: redundant-antithesis | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with epigrammatic-closure (style) | KEEP |
| 22 | Slopodar: epistemic-theatre | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with authority-scaffolding | KEEP |
| 23 | Slopodar: becoming-jonah | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with governance-recursion (meta) | KEEP |
| 24 | Slopodar: right-answer-wrong-work | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with phantom-tollbooth (tests) | KEEP |
| 25 | Slopodar: paper-guardrail | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with governance-recursion | KEEP |
| 26 | Slopodar: absence-claim-as-compliment | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with lullaby patterns | KEEP |
| 27 | Slopodar: the-lullaby | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with analytical-lullaby | KEEP |
| 28 | Slopodar: nominalisation-cascade | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with authority-scaffolding (style) | KEEP |
| 29 | Slopodar: epigrammatic-closure | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with the-peroration | KEEP |
| 30 | Slopodar: analytical-lullaby | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with the-lullaby | KEEP |
| 31 | Slopodar: anadiplosis | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with epigrammatic-closure (style) | KEEP |
| 32 | Slopodar: construct-drift | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with demographic-bake-in | KEEP |
| 33 | Slopodar: demographic-bake-in | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with construct-drift | KEEP |
| 34 | Slopodar: not-wrong | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with human taste gate (L12) | KEEP |
| 35 | Slopodar: stale-reference-propagation | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with SO.decisions/chain (partial) | KEEP |
| 36 | Slopodar: apology-reflex | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with absence-claim (relationship) | KEEP |
| 37 | Slopodar: loom-speed | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with magnitude-blindness | KEEP |
| 38 | Slopodar: monoculture-analysis | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with unanimous-chorus | KEEP |
| 39 | Slopodar: badguru | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with deep-compliance | KEEP |
| 40 | Slopodar: deep-compliance | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with badguru | KEEP |
| 41 | Slopodar: phantom-ledger | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with shadow-validation (code) | KEEP |
| 42 | Slopodar: shadow-validation | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with schema-shadow | KEEP |
| 43 | Slopodar: error-string-archaeology | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with right-answer-wrong-work (tests) | KEEP |
| 44 | Slopodar: half-life-clock-skew | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with phantom-ledger (code correctness) | KEEP |
| 45 | Slopodar: mock-castle | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with edge-file-mitosis | KEEP |
| 46 | Slopodar: phantom-tollbooth | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with right-answer-wrong-work | KEEP |
| 47 | Slopodar: schema-shadow | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with stale-reference-propagation | KEEP |
| 48 | Slopodar: confessional-test | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with deep-compliance (behavior) | KEEP |
| 49 | Slopodar: whack-a-mole-fix | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with review-hydra | KEEP |
| 50 | Slopodar: review-hydra | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with stowaway-commit | KEEP |
| 51 | Slopodar: stowaway-commit | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with review-hydra | KEEP |
| 52 | Slopodar: unanimous-chorus | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with monoculture-analysis | KEEP |
| 53 | Slopodar: governance-recursion | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with paper-guardrail | KEEP |
| 54 | Slopodar: session-boundary-amnesia | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with dead-reckoning (mitigation) | KEEP |
| 55 | Slopodar: magnitude-blindness | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with loom-speed | KEEP |
| 56 | Slopodar: authority-scaffolding | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with epistemic-theatre | KEEP |
| 57 | Slopodar: the-peroration | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with epigrammatic-closure | KEEP |
| 58 | Slopodar: false-spectrum | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with epistemic-theatre | KEEP |
| 59 | Slopodar: edge-file-mitosis | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with mock-castle | KEEP |
| 60 | Slopodar: near-miss-double-tap | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with phantom-limb-commit | KEEP |
| 61 | Slopodar: synonym-braid | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with unanimous-chorus | KEEP |
| 62 | Slopodar: option-anchoring | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with muster usage (if biased) | KEEP |
| 63 | Slopodar: phantom-limb-commit | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with near-miss-double-tap | KEEP |
| 64 | Slopodar: cost-margin-asymmetry | Caught refs in `docs/internal/slopodar.yaml` | Boot/context cost | Overlaps with phantom-ledger | KEEP |
| 65 | Lexicon: YAML HUD | Formalized in `docs/internal/lexicon.md`; no explicit firing record | Tokens per message | Overlaps with SO.yaml_hud | MERGE |
| 66 | Lexicon: Muster | SD-202 recorded; used as control format | Extra formatting overhead | Overlaps with option-anchoring risk | KEEP |
| 67 | Lexicon: Echo/Check Fire | SD-315; used in session | Token overhead | Overlaps with SO.echo | KEEP |
| 68 | Lexicon: Clear the Decks | SD-267; no explicit firing record | Adds compaction ceremony | Overlaps with compaction_loss footgun | KEEP |
| 69 | Lexicon: Dead Reckoning | On file; no explicit firing record in files read | Documentation overhead | Overlaps with SO.decisions | KEEP |
| 70 | Lexicon: Prime Context | SD-311; no explicit firing record | Upfront decision overhead | Overlaps with dumb_zone footgun | KEEP |
| 71 | Lexicon: HOTL/HODL | SD-TBD; no firing record in files read | Process overhead if overused | Overlaps with gate vs taste split | KEEP |
| 72 | Lexicon: Model Triangulation | SD-TBD; L11 not exercised per layer model | High time/tool cost | Overlaps with unanimous-chorus mitigation | MERGE (pilot-only until exercised) |
| 73 | Lexicon: Survey | No explicit firing record in files read | Significant time cost | Overlaps with gate + L12 QA | MERGE |
| 74 | Lexicon: Bump the Slopodar | SD-209; slopodar entries show use | Low overhead | Overlaps with slopodar-boot (input) | KEEP |
| 75 | Lexicon: Bugs (review bots) | SD-252; no explicit caught instance on file | Review overhead + noise | Overlaps with human QA | MERGE |
| 76 | Lexicon: Alignment Dial | SD-252; no direct firing record | Concept overhead | Overlaps with muster/echo | MERGE |
| 77 | Lexicon: Press the Button (antipattern) | SD-252; no firing record | Minimal overhead | Overlaps with HODL definition | KEEP |

---

## Systemic patterns

- Most controls are documented but do not record firing events. Value is asserted via provenance, not verified impact.
- Slopodar has strong internal evidence of detection, but the evidence is self-contained. There is no external ledger of "caught" outside the taxonomy.
- Redundancy between standing orders and lexicon entries (YAML HUD, echo, uv) creates boot friction. One should be canonical to reduce load.
- Several controls are meta-controls (governance about governance). This matches the project focus but risks governance recursion without direct, measurable prevention records.
- Cross-model validation (L11) is explicitly not exercised, so a key anti-monoculture control is theoretical, not active.
- L11 evidence exists in practice (this session is cross-model), but it is not recorded as an explicit firing event in a durable ledger.
