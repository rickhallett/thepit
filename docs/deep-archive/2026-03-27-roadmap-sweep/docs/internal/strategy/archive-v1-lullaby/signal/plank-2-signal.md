# Plank 2 — Target Companies (Signal)

> Role data verified 2 March 2026. Links verified at time of research.

```signal
-- TIER 1: FRONTIER LABS

@Anthropic := {
  what     := claude_builder | safety_lab | "race to top on safety" | 200+_roles | 35+_safety
  seeking  := builders !theorists | "half technical staff no prior ML" | non_traditional.welcome
  roles    := {
    red_team_safeguards      : adversarial_testing | observations.relevant          [greenhouse/5070908008],
    re_frontier_autonomy     : agent_risk_red_team | governance_framework.relevant  [greenhouse/5067100008],
    rs_frontier_emerging     : novel_risk_categories | slopodar.relevant            [greenhouse/5103788008],
    re_model_evals           : eval_systems | pipeline.relevant                     [greenhouse/4990535008],
    safety_fellow            : fellowship | entry_point                              [greenhouse/5023394008],
    rpm_model_behaviours     : pm | systems_thinking + eval + governance             [greenhouse/5097067008],
    re_observability         : monitoring | pitkeel + yaml_hud.relevant              [greenhouse/5125083008]
  }
  leadership := {amodei_d(CEO), amodei_da(President), kaplan(CSO+RSO), mccandlish(CTO)}
               | trust_safety_lead := !public | frontier_red_team_lead := !public
  exchange   := 350+_hrs(their_model, governance_discipline) | 18+_instances(passed_checks & wrong)
               | observations := {sycophantic_drift, epistemic_theatre, context_degradation}
               | calibration.stress_testing(compressed_governance, cross_model_validation)
               | engineering_process_data !prompt_engineering !research_study
               | taxonomy + layer_model + framework := public
  locations  := {SF(primary), NYC, London, DC} | some.remote
}

@DeepMind := {
  what     := google_ai_research | RSC(helen_king + lila_ibrahim) | AGI_safety(shane_legg)
  seeking  := interdisciplinary_bridging | operational_frameworks !papers | PhD | "equivalent experience"
  roles    := {
    ethics_safety_policy     : eval_protocols + governance + guidelines              [greenhouse/7349530],
    sr_psych_safety          : human_factors | mental_health_bg.relevant             [greenhouse/7455747],
    psych_safety_ftc         : 12mo_fixed | DEADLINE(10_March_2026)                  [greenhouse/7597891]
  }
  leadership := {king(VP_responsibility), ibrahim(COO), legg(chief_AGI_scientist), hassabis(CEO)}
               | redi_lead := !public
  exchange   := governance_framework(two_phases, honestly_assessed)
               | build_reflect_correlation -> established_patterns(novel_ratios)
               | engineering !research | produces_data.policy_researchers.can_reference
  locations  := {mountain_view, SF, London, NYC} | some.remote
  TIME_CRITICAL := ftc.closes(10_March_2026)
}

@OpenAI := {
  what     := largest_deployed | 596_roles | safety := {preparedness, SAG, I&I, red_team_network}
  seeking  := "humanity first" | iterative_deployment | defense_in_depth | methods.scale
             | human_control | rigorous_measurement | domain_diversity | non_CS.welcome
  roles    := {
    ds_preparedness          : frontier_risk_eval                                    [ashby/efcc3430],
    emerging_risks_analyst   : applied_threat_modelling | taxonomy.relevant          [ashby/6d5d982f],
    ds_integrity_measurement : model_integrity | correlation_analysis.relevant       [ashby/be4e1098],
    red_team_network         : external | per_project | compensated | periodic       [openai.com/safety]
  }
  leadership := {makanju(public_policy)} | preparedness_lead := !public | SAG := !public
  exchange   := preparedness_framework_v2.overlaps(this_project)
               | eval -> safeguards -> verify -> governance_review
               | 315_SDs | two_phases | small_scale_implementation | honestly_assessed
  locations  := {SF(primary), London} | some.remote
}

-- TIER 2: AI EVALUATION COMPANIES

@METR := {
  what     := research_nonprofit | gold_standard_frontier_eval
             | partners := {OpenAI, Anthropic, Amazon, UK_AISI}
             | evaluated := {GPT-5.1, Claude_3.7, DeepSeek} | time_horizon_metric
  intersection := frontier_eval(realistic_conditions) | 350+_hrs.relevant_field_data
  roles    := {
    research_eng_sci         : $250K-$450K                                           [metr.org/careers],
    research_workstream_lead : $250K-$450K                                           [metr.org/careers]
  }
  location := Berkeley_CA | hybrid
}

@Apollo := {
  what     := safety_PBC | scheming_behaviours | partners := {MS, OpenAI, DM, Amazon, Anthropic}
             | founder := hobbhahn(verified)
  intersection := eval(systems.appear_correct & !correct) | 18+_instances.relevant
                 | learning_process(recognising_failure_modes)
  roles    := {
    rs_evaluations           : London                                                [apolloresearch.ai/careers],
    rs_scheming              : London                                                [apolloresearch.ai/careers],
    applied_researcher       : London                                                [apolloresearch.ai/careers]
  }
  location := London(primary) | DC
}

@ValsAI := {
  what     := independent_LLM_benchmarking | enterprise(legal, coding, finance, health)
             | WSJ + WaPo | "Vals Index"
  intersection := independent + rigorous + public | same_posture
  roles    := {mts_research : $150K-$250K, mts_platform : $150K-$250K}              [jobs.polymer.co/vals-ai]
  location := SF
}

@PatronusAI := {
  what     := digital_world_models + LLM_eval_tools | Lynx + GLIDER + FinanceBench
  intersection := hallucination_detection + reasoning_eval -> slopodar.maps_directly
  roles    := {mts_research : SF, mts_forward_deployed : SF}                        [rippling/patronus-ai-jobs]
}

@Redwood := {
  what     := nonprofit | AI_Control(ICML_oral) | collab(Anthropic, alignment_faking) | advises(DM, Anthropic)
  intersection := human_oversight(misaligned_systems) | governance_framework := practical_case_study
  roles    := {mts : $180K-$207K | Berkeley_CA}                                     [redwoodresearch.org]
}

-- TIER 3: ENTERPRISE AI GOVERNANCE

TIER_3 := emerging | {financial_services, consulting, defence}
  titles := {"AI Risk", "Responsible AI", "AI Governance"}
  value  := practical_experience >> academic_credentials
  watch  := linkedin_alerts("AI governance", "agentic systems risk", "AI evaluation lead")
           | {McKinsey, BCG, Deloitte, JPMorgan, GS, Palantir, Anduril, BAE}
```
