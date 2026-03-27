# LinkedIn Research (Signal)

> Compiled 2 March 2026. Public sources only. LinkedIn requires manual search.

```signal
-- METHODOLOGY
sources.searched := {company_websites, arXiv_papers, anthropic_blog, metr_team_page, apollo_team_page,
                     openai_safety_page, prep_framework_v2, deepmind_responsibility_page}
sources.NOT      := {linkedin(blocked), twitter(auth), google_scholar}
HONEST           := cannot_access(linkedin, twitter, conference_dbs) | operator.manual_search.required

-- ANTHROPIC: VERIFIED PEOPLE

leadership := {amodei_d(CEO), amodei_da(President), kaplan(CSO+RSO), mccandlish(CTO)}

teams(from_research_page) := {alignment, interpretability, societal_impacts, frontier_red_team}
teams(from_papers_only)   := {safeguards_research, alignment_science}
  NOTE := neither_on_public_research_page | internal_designations(paper_attributions_only)

FROM alignment_faking(arXiv:2412.14093, Dec_2024) := anthropic_alignment_science + redwood
  hubinger(likely_lead)    := submitting_author | last_position | ex_MIRI
  greenblatt               := first_author | also_redwood
  denison, perez, bowman(ex_NYU), shlegeris(CEO_redwood), petrini, roger, marks

FROM constitutional_classifiers(arXiv:2501.18837, Jan_2025) := anthropic_safeguards
  sharma(likely_project_lead) := submitting_author | first_author
  tong                        := second_author
  leike(senior)               := near_last | EX_OPENAI_ALIGNMENT_LEAD | joined_anthropic(mid_2024)
  kaplan(CSO)                 := last_author | confirms_executive_oversight
  perez(senior)               := near_last | APPEARS_ON_BOTH_PAPERS
  askell                      := model_character_work
  olsson                      := ex_google_brain | known_safety
  anil, mu, wei

KEY := {
  leike    : ex_openai_alignment -> anthropic(senior_safety) | high_profile_hire,
  hubinger : most_visible(anthropic_alignment_research),
  perez    : both_major_papers(senior_positions) | likely_leads_safeguards,
  sharma   : first_author(constitutional_classifiers) | likely_project_lead
}

target_mapping := {
  red_team_safeguards      -> {sharma, perez, leike, tong},
  safety_fellow            -> {hubinger, greenblatt, shlegeris},
  rpm_model_behaviours     -> askell(model_character)
}

-- DEEPMIND: VERIFIED PEOPLE

leadership := {hassabis(CEO), legg(co_founder, chief_AGI_scientist, AGI_safety_council),
               ibrahim(COO, co_chairs_RSC), king(VP_responsibility, co_chairs_RSC)}

teams(from_responsibility_page) := {RSC, AGI_safety_council, technical_safety, ethics, governance, security}
  NOTE := !individual_leads_named | deliberately_vague(below_VP)

KEY := king(VP_responsibility) := most_senior_named(safety_ethics_side) | likely_hiring_chain(ftc)
ACTION := linkedin("Helen King Google DeepMind") -> explore_network

NOT_FOUND(confirmed) := {redi_lead, ethics_foresight_lead, "AI Psychology & Safety" lead}

-- OPENAI: VERIFIED PEOPLE

leadership := {makanju(VP_global_affairs)}

prep_framework_v2(April_2025) := {
  SAG := "cross-functional internal safety leaders" | reviews_safeguards | recommends_to_leadership,
  tracked := {bio_chem, cyber, AI_self_improvement},
  research := {long_range_autonomy, sandbagging, autonomous_replication, undermining_safeguards, nuclear}
}
SAG_MEMBERS := !named | SAG := decision_body
KEY := most_opaque(target_companies) | jan_leike.departed(May_2024) -> anthropic(confirmed)
ACTION := community_path(alignment_forum, METR_connections) >> public_pages

NOT_FOUND(confirmed) := {preparedness_lead(post_leike), SAG_members, red_team_network_coordinator}

-- METR: FULLY PUBLIC (metr.org/about#our-team)

leadership := {barnes(founder_CEO, @BethMayBarnes), painter(policy_director)}

technical := {
  cotra(ex_open_philanthropy, AI_timelines), filan(@dfrsrchtwts), wijk, chan(@justanotherlaw),
  kinniment, rein, becker, rush, von_arx, kwa
}
policy := {foster, harris, chen, dhaliwal}
advisors := {gleave(CEO_FAR_AI), radford(openai_GPT_series), bengio(turing_award)}

KEY := {
  barnes   := primary_contact,
  cotra    := high_profile(AI_timelines_widely_cited),
  radford  := openai_advisor -> potential_warm_connection,
  partners := {OpenAI, Anthropic, Amazon, AISI},
  funding  := audacious_project(TED) + schmidt_sciences | !AI_companies_directly
}

-- APOLLO: FULLY PUBLIC (apolloresearch.ai/team)

leadership := {hobbhahn(CEO, MATS_alumnus), akin(COO), stix(head_AI_governance, charlottestix.com), horowitz(CISO)}

technical := {meinke, scheurer, shah, schoen, hojmark, hofstaetter, van_der_weij}
governance := {ortega, pistillo, hallensleben}
advisors := {duvenaud(U_of_T, alignment_faking_co_author), evans(truthful_AI), kokotajlo(ex_openai, AI_futures_project)}

KEY := {
  hobbhahn      := primary_contact | MATS_alumnus,
  stix           := relevant(governance_framework_as_lead_artifact),
  kokotajlo      := ex_openai(safety_disagreements) | shared_values_signal,
  team_size      := ~25 | application.read_by_decision_makers
}

-- CROSS-COMPANY BRIDGES

BRIDGES := {
  leike           : openai_alignment -> anthropic_safety,
  shlegeris       : redwood_CEO + anthropic_co_author,
  radford         : openai + metr_advisor,
  duvenaud        : U_of_T + anthropic_co_author + apollo_advisor,
  bengio          : turing_award + metr_advisor + anthropic_reviewer,
  kokotajlo       : ex_openai + apollo_advisor,
  bowman          : NYU + anthropic_both_papers
}

-- RELEVANT RECENT RESEARCH

PAPERS := {
  constitutional_classifiers(Jan_2025, anthropic_safeguards)  : jailbreak_defense,
  alignment_faking(Dec_2024, anthropic_alignment + redwood)   : deception_under_training,
  sabotage_evaluations(Oct_2024, anthropic_alignment)         : four_sabotage_modalities,
  prep_framework_v2(Apr_2025, openai)                         : risk_categories + pipeline,
  long_tasks(Mar_2025, metr)                                  : agent_task_completion,
  developer_productivity(Jul_2025, metr)                      : RCT_AI_coding
}

-- GAPS & MANUAL SEARCH REQUIRED

LINKEDIN_SEARCHES := {
  1: "Frontier Red Team Anthropic",
  2: "Safeguards Anthropic",
  3: "Jan Leike" (confirm_current_title),
  4: "Ethan Perez Anthropic" (confirm_role),
  5: "AI Psychology OR AI Ethics DeepMind",
  6: "Helen King DeepMind" (explore_network),
  7: "Preparedness OpenAI",
  8: "Marius Hobbhahn Apollo Research" (before_applying)
}

-- WARM INTRODUCTION PATHS

PATHS := {
  metr -> openai        : via radford(metr_advisor, openai_researcher),
  apollo -> openai      : via kokotajlo(apollo_advisor, ex_openai),
  AF -> anthropic       : via hubinger + greenblatt(active_posters) -> alignment_science,
  AISC -> multiple      : alumni_across_all_targets,
  MATS -> multiple      : 446+_alumni_across_all_targets,
  redwood -> anthropic  : via shlegeris(collaborates)
}
```
