# Plank 3 — People, Communities, Playbooks (Signal)

> Links verified 2 March 2026.

```signal
-- PART A: NAMED PEOPLE

VERIFIED := {
  anthropic  : {amodei_d(CEO), amodei_da(President), kaplan(CSO+RSO), mccandlish(CTO)},
  deepmind   : {king(VP_responsibility), ibrahim(COO), legg(chief_AGI_scientist), hassabis(CEO)},
  openai     : {makanju(public_policy)},
  apollo     : {hobbhahn(CEO, MATS_alumnus)}
}

NOT_PUBLIC(verified_absence) := {
  anthropic  : {trust_safety_lead, frontier_red_team_lead, alignment_lead},
  openai     : {preparedness_lead, SAG_members},
  deepmind   : {redi_lead, ethics_foresight_lead},
  metr       : {leadership},
  scale_ai   : {leadership}
}
ACTION := linkedin_search + warm_intros | absence := signal(operational_roles !public_facing)

-- PART B: COMMUNITIES

@AlignmentForum := alignmentforum.org
  what    := curated | active(Anthropic, MATS, Redwood, Apollo, METR)
  engage  := read -> post(build_reflect_piece, process_observations)
  play    := lurk(1_week, calibrate_tone) -> post | bar := genuine_contribution !credentials

@LessWrong := lesswrong.com
  what    := broader | MATS_alumni + AISC_reports
  engage  := cross_post(alignment_forum) | wider_funnel
  play    := simultaneous_post | tag("AI Safety", "Empirical Results") | reply.24h

@AISC := aisafety.camp
  what    := part_time(10_hrs/wk) | team_projects | edition_11 | 27_projects
  relevant := {#11(democratising_red_teaming), #15(rare_agent_behaviours), #22(novel_control_protocols)}
  engage  := AISC11.closed | sign_up(AISC12) | propose_project(your_data)

@MATS := matsprogram.org
  what    := 12wk_fellowship | 446+_alumni | 170+_pubs | $15K + $12K_compute | Berkeley + London
  alumni  := -> {Anthropic, DeepMind, OpenAI, METR, Apollo, Redwood}
  status  := summer_2026.closed | EOI.open
  also_hiring := {programme_systems_assoc, talent_mgr, research_mgr}

TWITTER := follow + engage_meaningfully := {
  @AnthropicAI, @PatronusAI, @ValsAI, @apolloaievals,
  @METR_Evals, @redwood_ai, @MATSprogram
}

-- PART C: PROGRAMMES & FELLOWSHIPS

PROGRAMMES := {
  anthropic_safety_fellow   : safety_research | London/Ontario/Remote/SF  [greenhouse/5023394008],
  anthropic_security_fellow : security | London/Ontario/Remote/SF         [greenhouse/5030244008],
  mats                      : 12wk | $15K+$12K | Berkeley/London          [matsprogram.org],
  aisc                      : part_time | volunteer | remote               [aisafety.camp],
  constellation_astra       : 3-6mo | fully_funded | various              [via redwood],
  openai_red_team_network   : per_project | compensated | remote           [openai.com/safety]
}

-- PART D: PER-TARGET PLAYBOOKS

PLAYBOOK @Anthropic := {
  culture := high_trust | low_ego | empirical_pragmatism | "simple thing that works"
            | safety := competitive_advantage !compliance
  lead    := 350+_hrs(their_model, governance_discipline) | 18+_instances(passed_checks & wrong)
            | !hallucination | sycophantic_drift + epistemic_theatre + context_degradation
            | calibration(compressed_governance, cross_model_validation)
            | engineering_process !prompt_engineering !research_study
  show    := taxonomy(practical_quality_tool) | governance + honest_self_assessment(SD-190, SD-194)
            | build_reflect_correlation | both_repos.public
  approach := apply(red_team_safeguards + safety_fellow) | link_repos | outreach < 200_words
  worry   := !ML_pubs | !PhD | non_traditional
  counter := their_own_words("half technical staff no prior ML", "what you can do !where you learned")
}

PLAYBOOK @DeepMind := {
  culture := academic_rigour + operational_scale | interdisciplinary | ReDI(policy + engineering)
            | PhD | "equivalent experience"
  lead    := build_reflect_correlation | quantified + methodology_explainable
            | governance := operational_artifact !policy_document
  show    := spearman_coefficients | phase_analysis(17.8x) | ballast_correction
  approach := apply(ethics_safety_policy + ftc)
  TIME_CRITICAL := ftc.deadline(10_March_2026)
}

PLAYBOOK @OpenAI := {
  culture := move_fast | ship_iteratively | safety_through_deployment | "feel the AGI"
  lead    := preparedness_framework_v2.alignment | project.implements(their_pipeline, small_scale)
  show    := documented_observations(capability_eval) | governance(safeguards_design)
            | correlation(measurement_methodology)
  approach := apply(ds_preparedness + emerging_risks) | register(red_team_network)
             | reference(prep_framework_v2, by_name)
}

PLAYBOOK @METR := {
  culture := research_nonprofit | gold_standard | small_team | high_bar | $250K-$450K
  lead    := methodology + honest_limitations | describe_plainly
  show    := ballast_correction | spearman | phase_analysis | honest_limitations(n=1, 25_arcs, borderline)
            | governance(practical_control_protocol, honestly_assessed)
            | SD-190("blowing smoke")
  approach := apply(research_eng_sci) | honest_self_assessment := differentiator
}

PLAYBOOK @Apollo := {
  culture := safety_PBC | scheming_research | all_major_lab_partners | MATS_alumnus_founder
  lead    := 18+_instances(appeared_correct & drifting) | learning_process(recognising_failure_modes)
            | scheming_detection := same_skill
  show    := observations(practical_experience) | governance_self_assessment(intellectual_honesty)
  approach := apply(rs_evaluations) | London := no_visa_barrier
}

PLAYBOOK @Tier2(ValsAI, PatronusAI, Redwood) := {
  culture := smaller_teams | less_process | direct_impact
  lead    := taxonomy(deliverable) | eval_companies.ship_this
  approach := apply(career_pages) | small_companies.read_every_application | one_page_story.sufficient
}
```
