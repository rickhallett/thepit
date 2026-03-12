# NotebookLM Advisory (Signal)

> Prepared 2 March 2026. Operator only.

```signal
-- WHAT NLM IS
DEF NLM := gemini_powered | ingests_your_docs | reasons_over_uploads | !web_crawl(unless_deep_research)
STRENGTH := grounded(your_sources) -> !hallucinate(project_data)

-- CAPABILITIES
chat          := grounded_QA + inline_citations | free(50/day) | plus(200/day)
audio_overview := AI_podcast(two_hosts | single_narrator) | free(3/day) | plus(6/day)
  formats     := {deep_dive(default, connections), brief(< 2min, takeaways),
                  critique(constructive_eval), debate(formal, counterarguments)}
  interactive := join_conversation.mid_podcast | ask_questions(your_voice) | powerful(walks)
video_overview := AI_narrated_slides | free(3/day) | plus(6/day) | study_material !external
infographic   := AI_generated_single_image | !analytically_rigorous | visual_summary
slide_deck    := AI_generated | PDF | PPTX | "first draft" !final
mind_map      := interactive_branching | unlimited | structural_verification
sources       := free(50/notebook) | plus(100) | max(500K_words | 200MB)
formats       := {PDF, MD, txt, docx, gdocs, gslides, gsheets, URLs, youtube(transcript), audio, images, paste}

-- CANNOT DO
!precise_dataviz | !editable_presentations | !parse_YAML_as_structured
!produced_video | !cross_notebook_memory | !catch_own_slop

-- PRIVACY
data := !used_for_training UNLESS feedback(thumbs) | DO_NOT_CLICK(thumbs) | private_workspace
copies := static | !track_changes | re_upload_on_update

-- NOTEBOOK ARCHITECTURE (cluster_by_theme, !one_notebook)

NB1 "The Story" := {
  purpose := internalise(one_page_story, narrative_arc) | "tell me about yourself"
  sources := {plank_1, narrative_shape, narrative_layer.yaml, operators_log(23_fair_winds)}
  queries := {"three most dramatic turning points?", "highest narrative density arcs?",
              "90 seconds to explain — what should I say?"}
}

NB2 "The Fight Card" := {
  purpose := internalise(18+_documented_instances) | portfolio_piece(anthropic, openai, apollo)
  sources := {fight_card(internal), fight_card(oceanheart), slopodar.yaml, slopodar_delta_report}
  queries := {"for each instance: failure mode + detection method?",
              "which slopodar patterns most frequent?",
              "how do you know when a system is drifting — what evidence?"}
}

NB3 "The Data" := {
  purpose := internalise(empirical_findings) | spearman | 17.8x | phase_analysis
  sources := {plank_1, correlation_notebooks, session_decisions(may_need_split)}
  queries := {"spearman correlation — plain language?", "what changed early vs late?",
              "skeptic says correlation != causation — response?"}
}

NB4 "The Governance" := {
  purpose := internalise(methodology) | agents + SDs + lexicon + SOs + YAML_HUD
  sources := {AGENTS.md, lexicon.md, 2-3_main_thread_exchanges, dead_reckoning}
  queries := {"how does framework handle context window death?",
              "standing orders — why each exists?",
              "evidence framework actually worked vs aspirational?"}
}

NB5 "The Targets" := {
  purpose := rehearse(company_specific_talking_points) | before_interviews
  sources := {plank_2, plank_3, plank_4, plank_5}
  queries := {"anthropic red team — three strongest talking points?",
              "mutual exchange: deepmind vs openai?",
              "apollo asks about scheming detection — what's relevant?"}
}

NB6 "The Mirror" := {
  purpose := prepare(hard_questions) | intellectual_honesty_under_pressure
  sources := {fight_card(self_catches), dismissed_exchange, mistake_SDs, confession_quotes}
  queries := {"where did governance framework fail?",
              "biggest limitations/weaknesses?",
              "skeptic: 'elaborate hobby project' — honest response?"}
}

-- AUDIO EPISODE PLAN (9 episodes, 3 days at free tier, 2 at plus)

EPISODES := {
  1: NB1.deep_dive("three-act structure: built, found, sought")                    | core,
  2: NB2.deep_dive("walk through each instance chronologically")                   | core,
  3: NB2.debate("genuine failure modes vs bugs in dramatic language")              | adversarial,
  4: NB3.deep_dive("spearman, 17.8x, what they mean, why they matter")            | core,
  5: NB4.deep_dive("teach someone to run multi-agent project")                     | core,
  6: NB4.critique("where strong, where overengineered, where breaks at scale")     | adversarial,
  7: NB5.brief("30-second pitch per top 7 role")                                   | tactical,
  8: NB6.deep_dive("350hrs solo between jobs — risks, questions, weaknesses")      | hardest,
  9: NB1.brief("90 seconds. what he did, found, wants. no hedging")                | elevator
}
ORDER := generate(1,2,5) FIRST(core) -> generate(3,6,8)(adversarial, after_absorption) 
       | 7(tactical, night_before) | 9(morning_of_interview)

-- INTEGRATION EXERCISES

EX1 "Elevator Pitch Gauntlet" := NB1 -> {
  nlm("30-second version") -> read -> rewrite(your_words) -> paste_as_note
  -> nlm("compare: what missed, what added unsupported?") -> iterate(tighter_than_NLM)
}

EX2 "Skeptic Interview" := NB6 -> {
  nlm("you are senior safety researcher — five hardest questions")
  -> answer(out_loud | as_note)
  -> nlm("where vague, where overclaiming, where underselling?")
}

EX3 "Company Drill" := NB5 -> per_shortlisted_role {
  nlm("three things I must communicate for [role]")
  -> nlm("mutual exchange — what I offer they can't get elsewhere")
  -> nlm("weakest point in candidacy for this specific role")
  -> audio.brief("prepare me for 30min interview: lead with, avoid, close")
}

EX4 "Fight Card Drill" := NB2 -> {
  nlm("random instance, describe situation, don't say which")
  -> identify(which_instance, failure_mode) | repeat(5x) | track_accuracy
  PASS := 14/18+ from_description_alone
}

EX5 "Quote Retrieval" := NB1 -> {
  nlm("most powerful operator quote per densest arc")
  -> place_in_context? | nlm("what was happening when this was said?") WHEN !recalled
}

-- HONEST ASSESSMENT

HELPS := {
  audio(passive_internalisation) := perspective_shift | hear_work.described_by_outside,
  interactive(active_recall) := rehearsal(walks) !replicable(paper),
  chat_citations(fact_check_self) := catch_overclaiming.before_interviewer,
  mind_maps(structural_verification) := reveal_gaps(your_mental_model)
}

!HELPS := {
  !better_storyteller := know_material !tell_with_conviction | close_laptop -> talk_to_human,
  !interview_ready_visuals := substantial_revision.required,
  !catch_own_slop := gemini = LLM | slopodar.applies | read_with_adversarial_eye,
  !replace(real_mock_interview) := 30min_human_grilling >> 30hrs_NLM
}

-- COST
free := £0 | 3_audio/day | 50_sources | 50_chats | enough(4-5_days)
plus := ~£20/mo | 6_audio | 100_sources | 200_chats | comfortable(intensive_week) | cancel_after
pro  := ~£50/mo | overkill

RECOMMEND := start(free) -> upgrade(plus) WHEN hit_chat_limit(likely_day_1) -> cancel(when_done)

-- FIRST ACTION
DO_NOW := upload(plank_1, narrative_shape) -> ask("what is this project about?")
  IF accurate -> proceed(full_architecture)
  IF !accurate -> add_note("solo agentic engineering project, two phases, Operator = human, governance framework, 315 SDs")
```
