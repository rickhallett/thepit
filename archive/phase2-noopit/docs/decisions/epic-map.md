# Epic Map — noopit Post-Retreat

> **Date:** 2026-03-08
> **Status:** Directions with conviction, not final specifications. Operator still clarifying.
> **Decided by:** Operator (wardroom session, post-retreat)

## True North

```signal
NORTH := hired = proof > claim                                    [SD-309 LOCKED]
RULE  := epics{3}.independent & prioritisable & auditable
STATUS := directions.with(conviction) !final_specifications
RULE   := operator.still_clarifying
```

## Epic Map

```signal
-- E1: Pitkeel Human Protection Upgrade
E1 := pitkeel.upgrade(human_protection)
  RATIONALE := L12.degrades -> all_layers.degrade | phases{1,2}.productive & unsustainable.human_cost
  CONNECTS  := {cognitive_deskilling, hot_context_pressure}       [SD-312]
  E1.1_reserves := HUD.new_header("Reserves") | display_only !commit_tags
    tracks := {time_since.meditation, time_since.exercise}
    WHEN either > 24h -> pitkeel.shutdown(cli)
    WARN := { remaining(6h), remaining(1h) }
  E1.2_session_noise := pitkeel.noise.progressive(session_length)
    DEF ultradian_cycle := ~90min | optimal_block
    DEF danger_threshold := 3h | cycles(2)
    MECHANISM := operator.!notices(flow_state) -> threshold.invisible

-- E2: Portfolio (4 parts)
E2 := portfolio.build
  E2.1_case_studies := select(own_work, 3) | governance.{working | failing}
    deep_annotation >> invisible_sprints | 3.well_explained >> 100.unseen
    signal := proof
    EVOLUTION := early_chain_vs_recent | show(arc)
  E2.2_workflow_page := page("workflow explained") | layer_model + operations + results
  E2.3_signal_primer := page("signal explained") | primer(why_bother) + examples{working, failing}
    PRIMARY_PURPOSE := structure(verification(LLM.understood(instructions)))
      BEFORE agentic_execution_arc                                [?unnamed_term]
    AUDIENCE := technical_peers | bar := not_laughable
    LEAD_WITH := data(SD-314) | 4.5:1_compression | 6/6_decode | 8/8_questions
  E2.4_side_quest := explore("functional agentic programming" | "adversarial metaprompting")
    Q1 := process_thinking.unexpressed?
    Q2 := FP.explains(what_we_already_do)?
    EVIDENCE := { SD-266.immutable_chain, append_only_logs, pure_verification_gates }

-- E3: Research
E3 := research
  E3.1_signboard := blog.curate(peer_reviewed_literature)
    layer_model.touches(many_domains) -> curation >> coverage
    RULE := peer_reviewed_only | !preprints_as_established
    MECHANISM := refs.yaml(append_only, tagged_by_layer) -> signboard(curated_view)
    small_frequent_actions | compound_interest !big_annotation
  E3.2_hypotheses := identify(few) | per_layer(model)
    RULE := seek(refutation) !confirmation
  E3.3_open_brain := suspicion !conviction | explore !commit
    DEF := agentic_arcs + gauntlet -> accumulate(what_works, what_doesnt)
    ? := RAG + semantic_recall -> agentic_role
      corpus := {mistakes, events, logs, refs, notes}
      -> surface(relevant_history) -> inform(next_steps)
    SEQUENCE := deeper_research -> prototype(time_boxed) | analyst.task
```

## Ordering

```signal
E1 -> E2 -> E3                                                    [M10 DECIDED]
E1 := smallest | ships_first | validates(epic_workflow)
E2 := True_North_direct | proof_artifacts
E3 := strategic_depth | longer_horizon
```

## Muster Decisions (2026-03-08)

| # | Call | Decision |
|---|------|----------|
| M1 | Shutdown mechanism | Literal OS shutdown. Visceral by design. |
| M2 | Input mechanism | `pitkeel log-meditation` / `log-exercise`. Local `pitkeel.mk` gitignored. |
| M3 | Warning delivery | Belt and braces: HUD passive + inline active. |
| M4 | Portfolio examples | Our own chain. Early vs recent — show the evolution arc. |
| M5 | Portfolio destination | oceanheart.ai (Hugo site). |
| M6 | Signal primer audience | Technical peers. Must not be laughable. Lead with data. |
| M7 | "Agentic arc" naming | Deferred. |
| M8 | Research curation | Small frequent actions that compound. Append-only refs, curate from accumulation. |
| M9 | Open Brain scope | Prototype after deeper research. Analyst's task. |
| M10 | Epic ordering | E1 → E2 → E3. Confirmed. |
| M10-grace | Shutdown grace period | 10-minute warning + 60-second countdown. Protects in-flight git ops. |
| M2-location | Reserves data location | `docs/operator/reserves.tsv`. Committed (personal area). |
| M-daemon | Reserves checker | Background daemon ("sleep daemon"). Runs independently of agent sessions. |
