# Plank 4 — Timeline (Signal)

> Rebased 3 March 2026.

```signal
-- CURRENT POSITION (3 March 2026)
position := {
  calibration_run.active | cross_model(gemini -> 5_misframings_caught),
  signal_protocol(4.5:1, 6/6_decode, model_portable),
  framing_corrections.committed(engineering !research, sycophantic_drift !hallucination, !prompt_engineering),
  strategy_docs.transplanted(tspit -> noopit) + updated(current_lens)
}

-- STRATEGY: THREE PHASES (sequenced, not parallel)
PHASE_A calibration    := 3-5_March | ~3_days
PHASE_B the_piece      := 6-7_March | ~2_days
PHASE_C applications   := 8_March+  | ongoing
RULE    := calibration BEFORE piece BEFORE applications
REASON  := applying_with(calibration_complete + piece_published) >> applying_without

-- PHASE A: CALIBRATION (3-5 March)

DAY_1(3_March, today) := {
  done := {
    [x] strategy_docs.transplanted,
    [x] plank_1.rewritten(current_framing),
    [x] plank_2_3.framing_corrected,
    [x] cross_model -> 5_corrective_insertions.committed
  },
  remaining := {
    [ ] calibration_work.continue,
    [ ] plank_1.review(your_voice) | cut(anything.performed)
  }
}

DAY_2(4_March) := {
  [ ] calibration_work.continue,
  [ ] document(new_observations) WHEN produced,
  [ ] piece_outline.begin(what_in, what_out, structure)
}

DAY_3(5_March) := {
  [ ] calibration.close | natural_stopping_point,
  [ ] piece_outline.finalise,
  [ ] accounts.setup(alignment_forum, lesswrong) WHEN !present
}

-- PHASE B: THE PIECE (6-7 March)

DAY_4(6_March) := {
  [ ] write(build_reflect_piece) | 800-1200_words | data_backed | honest | your_voice,
  content := {what_built, what_observed, calibration_tested, what_learned},
  RULE := engineering_observations !research_findings | hypothesis_stress_test !evidence | describe !sell,
  RULE := slopodar.self_check BEFORE publish
}

DAY_5(7_March) := {
  [ ] edit(piece) | cut(performed),
  [ ] publish(alignment_forum) + cross_post(lesswrong),
  [ ] share(twitter) | brief_context !thread
}

-- PHASE C: APPLICATIONS (8 March+)

DAY_6(8_March) := {
  TIME_CRITICAL := deepmind_ftc.deadline(10_March),
  [ ] apply(deepmind_ftc) | plank_1 + piece + CV,
  [ ] apply(anthropic: red_team_safeguards + safety_fellow) | plank_1 + both_repos
}

DAY_7(9_March) := {
  [ ] apply(apollo: applied_researcher) | London,
  [ ] apply(openai: emerging_risks_analyst) | ref(prep_framework_v2),
  [ ] respond(comments.build_reflect_piece)
}

DAY_8_10(10-12_March) := {
  [ ] apply(metr, vals_ai, patronus, redwood) | as_appropriate,
  [ ] direct_outreach(3-5_people, linkedin_research) | < 200_words | link(piece + repos),
  [ ] mats_eoi WHEN timing_works
}

WEEK_2(13-19_March) := {
  [ ] follow_up(silent_applications, 7_days_reasonable),
  [ ] community_engagement(2-3/day, 15_min),
  [ ] second_piece WHEN first.gained_traction | candidate := taxonomy_as_practical_tool,
  [ ] linkedin_outreach WHEN tier_1.no_response
}

WEEK_3_4(20_March-3_April) := {
  [ ] pipeline_management(advanced | cold | follow_up_once -> let_go),
  [ ] interview_prep WHEN happening := know(observations, governance_self_assessment).cold,
  [ ] evaluate(framing.landing?) WHEN !interviews | adjust(bridge !work)
}

-- TIME ALLOCATION

PHASE_A := 90%_calibration | 10%_strategy_review
PHASE_B := 100%_the_piece
PHASE_C := 60%_applications_outreach | 40%_ongoing_engineering
  INVERT WHEN active_conversations >= 3

-- SUCCESS METRICS

METRIC end(phase_a, 5_March)  := calibration.stopped | piece_outline.ready
METRIC end(phase_b, 7_March)  := piece.published | accounts.active
METRIC end(week_1_c, 12_March) := 5+_applications | deepmind_ftc.submitted
METRIC end(week_2, 19_March)  := 2+_responses | 1+_community_conversation
METRIC end(week_3, 26_March)  := 1+_interview_scheduled
METRIC end(week_4, 3_April)   := 2+_interviews(completed | in_pipeline)
FALLBACK week_3.miss := reassess_targeting | work.there | bridge.needs_adjustment
```
