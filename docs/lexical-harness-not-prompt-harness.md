# Agentic System Layer Model — Compressed Reference

> The Map Is Not The Territory (SD-162, Lexicon v0.7 line 67).
> This map improves through empirical soundings, not inference.
> Version: 0.2 (refined 25 Feb 2026 from Captain's rubric + session data)

Read bottom-up for data flow, top-down for control flow.
Format: `LAYER | primitives | interface_to_next_layer`

---

```
L0  WEIGHTS        | prior · inductive_bias · rlhf_alignment · training_distribution · base_rate · epistemic_prior
                   | These are frozen at inference time. The model cannot modify its own weights mid-conversation.
                   | >> produces: token probability distributions conditioned on input sequence
                   | ATTESTATION: frozen. verifiable only by training provider. opaque to all other layers.

L1  TOKENISATION   | bpe_encoding · vocab_size · token_boundary · context_window(absolute_max) · effective_context_length
                   | Text becomes integer sequences. Budget is finite and hard-capped. Model has no self-knowledge of position.
                   | >> produces: token_ids[], position_ids[] → fed into attention
                   | ATTESTATION: deterministic. tokenizer is verifiable. token counts at L5 are exact.

L2  ATTENTION       | self_attention · kv_cache · attention_dilution · quadratic_cost · head_count
                   | Each token attends to all prior tokens. Cost scales quadratically. Quality degrades as length grows.
                   | >> produces: contextualised_representations per token position
                   | DIVERGENCE: attention weights are not observable by model or human. degradation is felt, not measured.

L3  CONTEXT_WINDOW | utilisation(tokens_used/max) · saturation_point · lost_in_the_middle · primacy_bias · recency_bias
    DYNAMICS       | needle_in_haystack_degradation · diminishing_marginal_returns · effective_context < advertised_context
                   | compaction(human_controllable=true, automatic=true, 0_to_200k_range, SD-160)
                   | Model experiences these effects but CANNOT measure them. No introspective token counter exists.
                   | Human CAN trigger compaction deliberately at any point — a controllable lever, not only a weather event.
                   | >> produces: degraded retrieval accuracy, shifted attention weights (invisible to model)
                   | DIVERGENCE: model and human experience context pressure differently. model cannot self-report.
                   | CONVENTION: kTok in YAML HUD is the human's external estimate, not the model's self-knowledge.

L4  GENERATION     | autoregressive · temperature · top_p · token_by_token · no_lookahead · no_revision
                   | Output is sequential and irrevocable. Model cannot "go back." Each token conditions the next.
                   | reasoning_tokens: private generation visible to L12 via harness rendering (SD-162).
                   | >> produces: output_token_stream + reasoning_token_stream + stop_reason
                   | CONVERGENCE: reasoning tokens are where model intent becomes observable to the human.
                   |              The Captain reads them, checks against his actual intent, corrects divergence.
                   |              First empirical validation: 3/3 spot-on (SD-162).

L5  API            | request(messages[]) · response(content, usage{input_tokens, output_tokens}) · per_call_only
                   | Token counts reported HERE, not by the model. Cumulative tracking is caller's responsibility.
                   | cache_read_tokens · cache_creation_tokens — empirical: 95.4% of all tokens are cache reads (SD-164).
                   | >> produces: structured_response + metadata to harness
                   | ATTESTATION: token counts are exact. costs are deterministic. the only fully calibrated layer.

L6  HARNESS        | opencode · claude_code · session_mgmt · cumulative_token_tracking · tool_registry · subagent_dispatch
                   | The orchestration layer. Accumulates token counts, manages tool calls, dispatches subagents.
                   | Model "knows" its token count ONLY if harness injects it back into context. Trust is one-directional.
                   |
                   | THREE OPERATIONAL MODES (empirical, SD-160):
                   | L6a DIRECT   : human↔model turn-taking. human CAN interrupt mid-generation.
                   |                model often stops and recalibrates on new human input.
                   | L6b DISPATCH : subagents running. human inputs queue (FIFO, visible in UI).
                   |                human authority is deferred until queue drains. different control granularity.
                   | L6c OVERRIDE : double-escape. hardware-level kill. always available. redundancy layer.
                   |
                   | ALSO INJECTS: system_reminders, tool_schemas, context_management_instructions.
                   | These injections are OPAQUE to L12 — human cannot see what was added to model's context
                   | unless model discloses it (reasoning tokens, SD-162) or harness renders it.
                   |
                   | >> produces: tool_calls[], subagent_prompts[], context_management_decisions, injected_instructions
                   | DIVERGENCE: L6 mediates ALL communication between L12 and L0-L5.
                   |             Neither side can verify what L6 adds, removes, or transforms.
                   |             The harness is open-source (opencode) — code inspection is possible but not routine.

L7  TOOL_CALLING   | function_schema · tool_result_injection · parallel_dispatch · sequential_dependency
                   | Model requests tool calls. Harness executes. Results injected back into context as new tokens.
                   | Each tool result COSTS context budget. Heavy tool use accelerates saturation (L3).
                   | >> produces: tool_results[] → appended to context → re-enters at L1
                   | CONVENTION: tool results are the model's only empirical contact with the filesystem, git, and runtime.
                   |             "Do not infer what you can verify" (AGENTS.md) — tools are the verification channel.

L8  AGENT_ROLE     | system_prompt · role_definition_file · grounding_instructions · persona_constraints
                   | Occupies high-attention positions (primacy bias, L3). Shapes all downstream generation.
                   | Role fidelity degrades over long contexts (L3). Structural instructions resist drift > ornamental.
                   | >> produces: behavioural_constraints on generation (L4)
                   | CONVENTION: the Lexicon, Standing Orders, YAML HUD — all operate at L8.
                   |             They are structural instructions designed to resist drift.
                   | CONVERGENCE: when L8 conventions and L12 intent align, the system is On Point (SD-163).

L9  THREAD         | accumulated_prior_outputs · position_trail · anchoring · consistency_pressure · context_compaction
    POSITION       | sycophancy_risk · authority_compliance · acquiescence_bias · goodharts_law_on_probes
                   | The model's outputs become part of its input on the next turn. Self-reinforcing loop.
                   | Anchoring increases monotonically with thread length. Cannot be reset without new context window.
                   | BUT: compaction can be triggered deliberately by L12 (SD-160), partially resetting L9.
                   | >> produces: progressively_constrained_generation_space
                   | DIVERGENCE: fair-weather consensus (Lexicon v0.7) — when agreement accumulates without dissent,
                   |             magnitude escalation occurs without proportional red-light checks.
                   |             Counter: fresh-context review, independent barometer readings.

L10 MULTI_AGENT    | same_model_ensemble · prompt_variation · model_homogeneity · correlated_blind_spots
                   | N agents from same model ≠ N independent evaluators. Precision increases, accuracy does not.
                   | Unanimous agreement is consistency, not validation. Systematic bias compounds, not cancels.
                   | >> produces: high_precision_low_accuracy_consensus (if single model family)
                   | ATTESTATION: RT L3-L5 results (11/11 ship, then reversal test, then fresh control) are on file.
                   |              Methodology and limitations documented. Reproducible with different models (L11).

L11 CROSS_MODEL    | different_priors · different_inductive_bias · different_rlhf · cross_validation
                   | One sample from a different distribution > N additional samples from the same distribution.
                   | Tests whether findings are model-specific or evidence-specific.
                   | >> produces: independent_signal (bounded by shared training data overlap)
                   | ATTESTATION: not yet exercised. all agents are Claude. this is a known limitation (SD-098).

L12 HUMAN_IN_LOOP  | captains_walkthrough · manual_qa · domain_expertise · tacit_knowledge · irreducible_uncertainty
                   | reasoning_token_observation · intent_verification · rubric_provision · compaction_control
                   | The only truly model-independent layer. 5hrs human QA > 1102 automated tests (empirically demonstrated).
                   | Cannot be scaled. Cannot be automated. Cannot be replaced. Can be informed by L0-L11.
                   | The human's experience of the system is: terminal_input → wait → read_response → terminal_input.
                   | The human's instruments: reasoning tokens (L4→L6 render), response text, git diff, Vercel dashboard,
                   |   PostHog (consent-gated), token consumption reports (unverified source, SD-164).
                   | >> produces: the_decision
                   | ATTESTATION: the human is the first data point (SD-161). the rubric is empirical.
                   |              everything the model "knows" about L12 was inference until the Captain provided data.
```

---

### Calibration (cross-cutting concern — applies at every layer)

```
confidence_scores : ordinal_at_best · uncalibrated · false_precision · relative_ordering_only
estimation        : models_can_estimate_token_counts_poorly · cannot_introspect_own_context_position
measurement       : what_you_measure_changes_what_you_get(goodhart) · probes_expire_when_detected(L9)
```

### Temporal Asymmetry (cross-cutting concern — applies at L4, L6, L9, L12)

```
model_time     : no_experience_of_waiting · context_appears_fully_formed · no_temporal_metadata_on_messages
                 each_turn_is_a_complete_context · cannot_distinguish_urgent_from_considered_input
human_time     : composing · waiting · reading · deciding · minutes_per_turn_not_milliseconds
                 intent_urgency_stripped_by_serialisation · "Halt"_and_"Draft_copy"_arrive_identically
control_grain  : human_control_resolution = 1_input_per_generation_cycle (L6a)
                 OR queued (L6b) OR force_override (L6c)
                 generation_length_determines_control_granularity — set_by_model, not_by_human
```

---

### Loading Points (SD-162, SD-163)

Each layer has characteristic loading points where patterns prove out or fail.

```
CONVENTION   : where patterns become repeatable (L7 tool verification, L8 lexicon/HUD, L9 cross-referencing)
CONVERGENCE  : where multiple signals agree (L4 reasoning tokens ↔ L12 intent, L8 conventions ↔ L12 bearing)
DIVERGENCE   : where signals split (L2 attention invisible, L3 model can't self-measure, L6 opaque mediation)
ATTESTATION  : where independent verification is possible (L1/L5 deterministic, L10 RT on file, L12 empirical)
```

When convention, convergence, and attestation align across layers: the system is On Point (SD-163, Lexicon v0.7 line 86).
When divergence is undetected: the system is drifting toward Fair-Weather Consensus (Lexicon v0.7 line 78).

---

### Design Notes

1. **Bottom-up for data flow, top-down for control.** This mirrors how the system actually works — data flows up from weights to human decision, control flows down from human to model. When you dispatch an RT round, you're operating at L12 pushing control down through L6→L8→L10. When the model generates a response, data flows up from L0→L4→L5 to you.

2. **The `>> produces:` lines act as the interface between layers** — what one layer hands to the next. These are the points where information transforms and where measurement is possible (or not). The gap between L3 and L5 is where the model *experiences* degradation but *cannot report* it — the harness at L5/L6 is the first point where token counts become visible.

3. **Calibration is cross-cutting rather than its own layer** because it applies at every level. L0 weights are uncalibrated (no ground-truth frequency data for "how often is Claude right when it says 0.85"). L5 API token counts are precisely calibrated (the tokenizer is deterministic). L9 anchoring effects are unmeasured (no instrument exists to quantify how much a prior output shifted the current one). The calibration quality varies per layer, and knowing which layers are calibrated vs. uncalibrated is the difference between trusting a number and trusting a guess.

4. **L9 THREAD POSITION is where most of the RT evaluation complexity lives** — anchoring, sycophancy, Goodhart's on probes. This is the layer where your "fly-shy" instinct operates. When Keel identified the Captain's oscillation pattern at L4, that was a L9 phenomenon becoming visible: the accumulated thread position had given the agents enough data to model the tester's behaviour, at which point the probes lost diagnostic power. Fresh agents (L10→L11 transition) reset L9 to zero, which is why the control group was the right move.

5. **L6 decomposition (v0.2, SD-160).** L6 is not one thing. It has at least three operational modes with different control characteristics for L12. In direct mode, the human can interrupt. In dispatch mode, inputs queue. In override mode, the human has absolute authority. The mode the system is in determines the granularity of human control — and the human doesn't always know which mode is active. This was identified through the Captain's empirical rubric, not through model inference.

6. **Reasoning tokens as alignment channel (v0.2, SD-162).** L4 generates two streams: output tokens (visible to human as response text) and reasoning tokens (visible to human through harness rendering, if the harness exposes them). The reasoning tokens are the only channel through which L12 can observe the model's *process*, not just its *output*. The Captain validated this empirically: 3/3 reasoning observations matched his actual intent. This is the closest thing to a bidirectional verification channel in the stack — the model reasons, the human checks, the human corrects. The map is refined through this practice.

7. **Temporal Asymmetry (v0.2).** The model has no experience of time between turns. The human has nothing but. All human intent — urgency, hesitation, deliberation — is stripped by the serialisation from L12 through L6 to the model's context. A one-word "Halt" and a thousand-word design brief arrive identically as token sequences. The model can interpret semantics but cannot feel temporality. This asymmetry is structural and irreducible.
