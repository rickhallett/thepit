# Plank 5 — Shortlist (Signal)

> Selected 2 March 2026. Operator said wait on re-evaluation — compressed as-is.

```signal
SHORTLIST := {
  1: deepmind.ftc(psych_safety)      | NOW | deadline(10_March) | 12mo | mh_bg + eval  [greenhouse/7597891],
  2: anthropic.red_team(safeguards)   | HIGH | observations.relevant                    [greenhouse/5070908008],
  3: anthropic.safety_fellow          | HIGH | entry_point !academic_gate               [greenhouse/5023394008],
  4: anthropic.rpm(model_behaviours)  | HIGH | systems_thinking + governance + eval     [greenhouse/5097067008],
  5: openai.emerging_risks_analyst    | MED  | taxonomy + observations                  [ashby/6d5d982f],
  6: openai.red_team_network          | MED  | external | per_project | periodic        [openai.com/safety],
  7: apollo.applied_researcher        | MED  | London | no_visa | scheming_research     [apolloresearch.ai/careers]
}

LEAD_ARTIFACTS := {
  deepmind      : lead(build_reflect_correlation, spearman, phase_analysis) | support(governance, observations),
  anthropic(*3) : lead(18+_documented_observations) | support(taxonomy, governance_self_assessment),
  openai        : lead(prep_framework_v2.alignment) | support(observations, correlation),
  apollo        : lead(observations := failure_mode_recognition) | support(governance_self_assessment)
}
```
