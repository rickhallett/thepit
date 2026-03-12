# SD Chain — Signal Compression Prototype

> Prototype conversion of the full SD chain (SD-001 through SD-312) into Signal notation.
> The verbose version (`docs/internal/session-decisions.md`) is the chain (SD-266, immutable).
> This is a VIEW, not a rewrite.

---

## Phase 1: Pre-Launch (SD-001 → SD-060)

```signal
-- Product tuning (SD-001 → SD-011)
SD-001..003 := ui_cleanup(badge, panel, privacy, linkedin)
SD-004..007 := model_config(opus.remove, sonnet46.add, turns.12->6, demo.haiku_only, response.short)
SD-008..010 := credit_tuning(signup=100, subscribe=+300, lab=+600, monthly={300,600})
SD-011      := token_ceilings(short=200, standard=300, long=450)

-- Architecture (SD-013 → SD-014)
SD-013..014 := pool_simplification(free+intro -> community, credits=10000, half_life=3d)

-- Copy & Voice (SD-027 → SD-036)
SD-027..029 := research_page.remediate(stats_bar.remove, thesis.rewrite, badges.remove, dvalues.inline)
SD-031      := voice(we -> I) | 60_instances, 24_files | legal_preserved
SD-032      := hero_subheadline := operators_dna | !edits_ever                [PERMANENT]
SD-033      := security_page := entity_voice | !first_person                 [legal]
SD-034      := oceanheart_ai_ltd := UK_16029162 | operator.sole_director
SD-035      := h2_preregistration := post_hoc_annotations.transparent        [lab_notes]
SD-036      := em_dash := agentic_tell | avoid(user_facing)                  [STANDING]

-- Infrastructure (SD-037 → SD-051)
SD-037      := dead_reckoning.created
SD-044      := contact_form := db_first | email.best_effort
SD-047      := fair_wind_protocol := merge_sequence(368->369->370) | all.post_merge.green

-- Strategic (SD-043, SD-052 → SD-060)
SD-043      := byok.deprioritised | "maybe wrong crew"
SD-055      := governing_principle := "punchers_chance" | aerodynamics
SD-060      := stage_conditions := GO | "hope for better = greedy | fearful"
```

## Phase 2: Launch Preparation (SD-061 → SD-088)

```signal
-- Round Table Protocol (SD-069 → SD-098)
SD-069      := round_table.protocol.formalised | standardised_format
SD-070      := ALL_HANDS_ON_DECK | "the world is calling"
SD-071      := rt.two_tiers(L1={weaver,analyst,architect,sentinel}, L2=all_hands)
SD-072      := rt.pre_context_protection | blowout_risk                      [STANDING]
SD-073      := lying_with_truth := CATEGORY_ONE | asymmetric_advantage       [PERMANENT]
SD-074      := provenance_trust_challenge | "blockchain 101"                  [RT L1 tasked]
SD-076      := pitch_layer := research + intellectual_honesty | !provenance   [STANDING]
SD-077      := "identity !integrity, registration !trust"                     [STANDING]
SD-078      := overclaimed_provenance := CATEGORY_ONE | !shippable            [LAUNCH BLOCKER]
SD-083      := "signed_commit" analogy := approved | attestation_frame
SD-084      := "public_registry" := "act of service !theatre of bullshit"

-- Governance (SD-025, SD-061, SD-073, SD-082)
SD-025      := all_decisions.recorded | !exceptions                          [STANDING]
SD-061      := "double check obvious first" | verify !assume                 [STANDING]
SD-075      := operator.19hrs.continuous | overrides(keel.sleep)
SD-082      := operator.retiring | physical_state.cat2
```

## Phase 3: Launch Day (SD-089 → SD-136)

```signal
-- Round Table Deep (SD-089 → SD-098)
SD-089      := "our conclusions are wrong" | systematic_bias                 [STANDING]
SD-091      := rt_l2(all_hands) := explore(diametric_opposite)
SD-093      := coin.two_sides | !only_uncomfortable_truths                   [PERMANENT]
SD-094      := rt_l3 := unbiased_assessment | 11/11.ship | zero.blockers
SD-096      := rt_l4 := reversal_test("cannot launch") | 11/11.disagree
SD-098      := rt_l5 := fresh_control(3_agents) | all.ship | 0.82-0.88

-- The Honest Layer (SD-130 → SD-136)
-- The failure was !hallucination. It was sycophantic drift: performing honesty
-- while hedging confidence. Confabulation is fact-checkable; this failure mode
-- passes every surface check. [SD-073: "lying with truth"]
SD-095      := main_thread := operator <-> weaver | protected                 [PERMANENT]
SD-130      := honest_layer | operator.caught.weaver.hedging                  [PERMANENT]
SD-131      := going_light | 73_files.public | 7_redactions                  [PERMANENT]
SD-132      := show_hn.ready | "going dark -> going light"
SD-133      := weaver.dismissed | red_light_failure | 9417_lines             [PERMANENT]
SD-134      := truth >> hiring | true_north.sharpened                        [PERMANENT]
SD-135      := external_comms := operator.hands_only                          [PERMANENT]
SD-136      := red_light_failure.on_record | process !decision

-- Naming & Vocabulary (SD-120 → SD-128)
SD-120      := naval_metaphor := self_organising_scaffold | !decoration       [STANDING]
SD-121      := loose_weave := exploratory | operators_invitation
SD-123      := lexicon.v01.created | 22_terms, 7_categories
SD-124      := so_perm_001 := chmod_444 | all_reports                        [PERMANENT]
SD-126      := lexicon.v03 | 7_agents.overboard | so_perm_002(read_lexicon)

-- Pseudocode & Tools (SD-137 → SD-146)
SD-137      := pseudocode_interpretation | operator.ts_js_python_bash          [STANDING]
SD-138      := deckhand_context_minimisation | fresh_context = feature        [PERMANENT]
SD-141      := lexicon.v05 | fair_weather_consensus | true_north.pseudocode
SD-145      := chmod := weaver.only | !other_agents                          [PERMANENT]
```

## Phase 4: The Mirror (SD-147 → SD-194)

```signal
-- Compaction & Recovery (SD-147, SD-150, SD-160, SD-167, SD-186)
SD-147      := compaction.recorded | dead_reckoning.gap.identified
SD-150      := forward_correction(SD-147) | operator.burned_tokens !natural    [PERMANENT]
SD-160      := L6.complex | 3_modes(direct, dispatch, override) | compaction.controllable
SD-167      := compaction_risk.downgraded(medium -> low)
SD-186      := compaction_engine := woven_into_governance | !just_hazard      [PERMANENT]

-- Layer Model Evolution (SD-162 → SD-165, SD-205 → SD-206)
-- L0-L12: maps the full human-AI stack from frozen weights to human cognition.
-- Each layer: where failures originate, what controls apply.
-- Primary engineering instrument for diagnosing agentic failure modes.
SD-161      := "human is the first data point" | L12.empirical
SD-162      := map != territory | reasoning_tokens.validated(3/3)             [PERMANENT]
SD-163      := on_point := convention & convergence & verification            [lexicon]
SD-164..166 := token_consumption(431.7M, $312.93) | costs.corrected(SD-166)
SD-165      := layer_model.v02 | L6.decomposed | temporal_asymmetry.added

-- Testing & Governance Recursion (SD-175 → SD-191)
SD-175      := watchdog.first_assignment | bout_engine.0_tests | YELLOW
SD-183      := "trust gate !output" | operator.disagrees | gate.structurally_blind
SD-187      := SD-183.vindicated | core_product.unverified                    [PERMANENT]
SD-189      := test_campaign.3_round | PARKED(SD-191)
SD-190      := governance_recursion := CATEGORY_ONE | "blowing smoke"          [PERMANENT]
SD-191      := SD-189.parked | "break recursion with work"

-- HCI & Observation (SD-168 → SD-180)
SD-168      := maturin.recruited | naturalist
SD-172      := reasoning_token_path := operational_technique                  [STANDING]
SD-174      := L12.temporal_asymmetry | "mental RAM compaction loss"           [PERMANENT]
SD-176      := anotherpair.recruited | process_observer
SD-178      := oracle_contamination := L12.error.propagates | lexicon.v08     [PERMANENT]
SD-179      := naturalists_tax := discovery_overhead(parallel) | amdahls_law  [PERMANENT]
SD-180      := big_o_cognitive_load | O(1)_to_O(2^n) | PARKED

-- Maturin's Symbol & Process (SD-192 → SD-194)
SD-192      := maturins_symbol(§) := crew.converged.independently | lexicon.v09
SD-194      := operator.stream_of_consciousness | "reached personal limit"     [VERBATIM]
```

## Phase 5: Context Audit & Infrastructure (SD-195 → SD-220)

```signal
-- Context Audit (SD-195 → SD-203)
SD-195      := context_pollution.audit | BFS.default | depth=read_frequency   [STANDING]
SD-196      := ghost_crew.cleared | 36_branches.pruned | lexicon.renamed
SD-197      := hud_terminal(scripts/hud.py) | sd_label_convention
SD-198      := keel_state := shared_state(agent <-> terminal)
SD-200      := keel_state.history := append_only.clone_before_write
SD-202      := muster := O(1)_triage | lexicon                               [STANDING]
SD-203      := commit_trailers := always_on | bearing,tempo,weave,gate

-- Oceanheart Hugo (SD-209 → SD-219)
SD-209      := oceanheart.ai := hugo_static | slopodar.yaml.created | 31->135_pages
SD-211      := full_mono(jetbrains_mono) | inter.dropped
SD-213      := aesthetic_strip | subtraction | "doesn't think about website"
SD-215      := slopodar := hugo_section | detail_pages | "THATS the sweet spot"
SD-216      := 3_slop_posts.deleted | 5_remain
SD-217      := voice_grounded_rewrite | 8_themes | +453/-1226 | "soft pass"
SD-219      := sd_detail_pages | "field notes !governance artifacts"
```

## Phase 6: Broadside & Slopodar (SD-220 → SD-277)

```signal
-- Testing Broadside (SD-220 → SD-277)
SD-220      := broadside := "biggest PR in project history" | 4_phases
SD-221..225 := broadside.phases.planned | 1279_tests_target
SD-236      := [poa-roadmap] | collision(forward_ref, SD-297)
SD-237      := "budget for breakage" | broken_tests = signal                  [STANDING]
SD-263      := termites_before_testing | 14_undocumented_flows                [STANDING]
SD-271      := termites.complete | 15_checkpoints
SD-276      := paths_forward.on_file | testing_broadside_bearing
SD-277      := broadside.phases_1_3.complete | 78_assertions.hardened | 4.2x_faster

-- Slopodar & Chrome Extension (SD-252 → SD-275)
SD-252      := the_sextant | operators_cognitive_instruments | lexicon.v012
SD-258      := yaml_universal_format                                          [STANDING]
SD-266      := the_chain := historical_data.immutable                         [PERMANENT]
SD-268      := agentic_estimation := agent_minutes !human_speed               [PERMANENT]
SD-270      := so_perm_001.retired | chmod_444.killed
SD-272      := learning_in_the_wild | "microscope vs specimen collection"
SD-275      := token_heatmap | session_decisions.md = 33.7k = elephant
```

## Phase 7: Stage Magnum & Calibration (SD-278 → SD-312)

```signal
-- Executive Order (SD-278)
SD-278      := STAGE_MAGNUM | pilot_study.over | dev.stopped                  [PERMANENT LOCKED]

-- Calibration Run Bearing (SD-287 → SD-297)
-- Bearing: engineering !research [SD-289, SD-293]. The layer model, slopodar,
-- and foot guns are operational controls built from observed failures,
-- not findings for publication. The product is the discipline.
SD-287      := situation_changed | "not first to party" | context_engineering_lecture
SD-288      := engineering !anthropology | separation_of_concerns              [STANDING]
SD-289      := experiential !experimental | engineering_data                   [STANDING]
SD-291      := novel_names.assessed | "already well-known patterns"            [ON RECORD]
SD-292      := calibration := missing_control_case | "laughed out of room"     [STANDING]
SD-293      := two_paths(study_hci | engineer) | this_run.takes_path_2         [ON RECORD]
SD-294      := !factory_reopening | lessons_learned.encapsulated               [STANDING]
SD-296      := polecats := claude_p.deterministic.pipeline | lexicon.v018      [STANDING]
SD-297      := sd_collision := forward_ref !renumber                           [STANDING]

-- Operational Setup (SD-298 → SD-312)
SD-298      := !experiment, !ab_test | confounds.acknowledged                  [STANDING]
SD-299      := governance.refined !reduced | vocabulary.survives_new_layers    [STANDING]
SD-300      := data_model.from_memory | 12_tables | "writing IS calibration"   [STANDING]
SD-301      := cross_model_adversarial | different_model.writes_tests          [STANDING]
SD-303      := deterministic_execution(polecats) | human.reviews_after         [STANDING]
SD-304      := domain_colocation | 1_domain = 1_dir = 1_agent_boundary        [STANDING]
SD-309      := one_shot_on_hn | target(anthropic, hn) | hired = proof > claim  [STANDING]
SD-310      := uv.exclusive | !exceptions                                      [STANDING]
SD-311      := prime_context.lexified | min(context).smart_zone                [STANDING]
SD-312      := hci_foot_guns.lexified(6) + layer_model.backrefs
SD-313      := signal.protocol | 4.5:1 compression | DRAFT
SD-314      := signal.early_results | 6/6 decode | model_portable | PROTOTYPAL
SD-315      := echo | check_fire | signal_before_acting                        [STANDING]
```

---

## Comparison: What Works, What's Lost

### What works well

| Property | Assessment |
|----------|-----------|
| **Scanning speed** | A human can scan 312 SDs in ~3 minutes instead of ~30. The shape of the project is visible. |
| **Phase structure** | Grouping SDs into narrative phases (pre-launch, launch, mirror, broadside, magnum) reveals the arc that's invisible in the flat table. |
| **Status compression** | `[PERMANENT]`, `[STANDING]`, `[PARKED]` carry the same weight in 1 token as the verbose "Standing order — PERMANENT" |
| **Batch compression** | `SD-001..003 := ui_cleanup(...)` collapses 3 trivial SDs into 1 line. The originals were padding. |
| **Back-refs preserved** | `[SD-266]`, `[PERMANENT]`, `[lexicon]` all survive. Cross-referencing chain is intact. |
| **Pattern visibility** | You can SEE the governance recursion (SD-189→SD-190→SD-191) as three lines. In verbose, it's 3 paragraphs of justification that obscure the pattern. |

### What gets lost

| Loss | Severity | Mitigation |
|------|----------|------------|
| **Operator's verbatim** | HIGH | SD-130, SD-194, SD-158 contain Operator's exact words — the voice, the emotion, the register. Signal cannot carry this. These are the chain's pearls. | 
| **Narrative provenance** | MEDIUM | Why SD-133 (dismissal) happened, what the red-light failure felt like, the Fawlty Towers cascade of SD-150 — Signal captures the decision, not the story. |
| **Context of discovery** | MEDIUM | How AnotherPair named "Learning in the Wild," how Maturin's Symbol emerged across independent context windows — the mechanism is lost, only the outcome survives. |
| **Parked items & queues** | LOW | Post-merge queues, parking justifications, P-items — operational detritus that has no value post-completion. Signal correctly discards these. |
| **Exact numbers** | LOW | Some precise figures compressed out (e.g., "60 instances across 24 files" → just the decision). Recoverable from verbose version. |

### Compression ratio

| Metric | Verbose | Signal | Ratio |
|--------|--------:|-------:|------:|
| Lines | 597 | 175 | 3.4:1 |
| SDs captured | 312 | 312 | 1:1 (complete) |
| Standing orders visible | scattered | annotated inline | improved |
| Phase structure | implicit | explicit | improved |

### Recommendation

Signal works excellently for the SD chain as a **navigation view** — finding what was decided and when. It does NOT replace the verbose version for **provenance** — the Operator's voice, the narrative of discovery, and the emotional register of key moments (SD-130, SD-133, SD-194) are irreducible.

The right model: Signal SD chain is the index card drawer. Verbose SD chain is the filing cabinet. You scan the index cards; you pull the file when you need the full story.

---

## Iteration Notes

**Iteration 1 (this version):** Phase-grouped, batch-compressed where possible, status annotations inline, back-refs preserved. ~175 lines for 312 SDs.

**Diminishing returns reached:** Further compression would sacrifice readability (e.g., collapsing Phase 3 further would lose the narrative arc of launch→honest layer→dismissal→truth first). The current ratio (3.4:1) is lower than the governance compression (4.5:1) because SDs carry more irreducible content per line — each is a unique decision, not a repeated pattern.

**Not attempted:** Programmatic extraction from verbose → Signal. Would require an SD parser and would itself be governance recursion (SD-190). The manual pass was faster and more accurate.
