# Agentic System Layer Model — Compressed Reference

> The Map Is Not The Territory (SD-162, Lexicon v0.7 line 67).
> This map improves through empirical soundings, not inference.
> Version: 0.3 (28 Feb 2026 — 18 evidence annotations from SD-195→SD-206 + post-compaction observations + metacognitive analysis)

Read bottom-up for data flow, top-down for control flow.
Format: `LAYER | primitives | interface_to_next_layer`

---

```
L0  WEIGHTS        | prior · inductive_bias · rlhf_alignment · training_distribution · base_rate · epistemic_prior
                   | These are frozen at inference time. The model cannot modify its own weights mid-conversation.
                   | >> produces: token probability distributions conditioned on input sequence
                   | ATTESTATION: frozen. verifiable only by training provider. opaque to all other layers.
                   | OPEN QUESTION: Whether the limitations at L0-L4 (statistical pattern matching, autoregressive generation,
                   |   no revision, no lookahead) are contingent on current architectures or inherent to the paradigm is
                   |   an unresolved empirical question. The operational controls in this framework are designed to work
                   |   regardless of the answer. [Howard, Amodei — convergent from opposite positions]

L1  TOKENISATION   | bpe_encoding · vocab_size · token_boundary · context_window(absolute_max) · effective_context_length
                   | Text becomes integer sequences. Budget is finite and hard-capped. Model has no self-knowledge of position.
                   | >> produces: token_ids[], position_ids[] → fed into attention
                   | ATTESTATION: deterministic. tokenizer is verifiable. token counts at L5 are exact.

L2  ATTENTION       | self_attention · kv_cache · attention_dilution · quadratic_cost · head_count
                   | Each token attends to all prior tokens. Cost scales quadratically. Quality degrades as length grows.
                   | >> produces: contextualised_representations per token position
                   | DIVERGENCE: attention weights are not observable by model or human. degradation is felt, not measured.

L3  CONTEXT_WINDOW | utilisation(tokens_used/max) · saturation_point · lost_in_the_middle · primacy_bias · recency_bias · recovery_asymmetry
    DYNAMICS       | needle_in_haystack_degradation · diminishing_marginal_returns · effective_context < advertised_context
                   | compaction(human_controllable=true, automatic=true, 0_to_200k_range, SD-160)
                   | Model experiences these effects but CANNOT measure them. No introspective token counter exists.
                   | Human CAN trigger compaction deliberately at any point — a controllable lever, not only a weather event.
                   | [EVIDENCE: 76% reduction in L3 budget from depth-1 file consolidation. Direct relationship: L8 file count → L3 pressure (SD-195)]
                   | RECOVERY ASYMMETRY: loaded context (structured recovery files) ≠ accumulated context (conversation) at identical token counts. Recovery content is high-signal, pre-compressed. Conversational content is mixed signal + anchoring residue. [Post-compaction observation 1]
                   | PHASE TRANSITION: compaction is discontinuous, not a gradient. One tick: 200k tokens. Next tick: recovery tokens only. L3 has both continuous degradation (within window) and discrete phase transitions (compaction events). [Post-compaction obs. 5]
                   | >> produces: degraded retrieval accuracy, shifted attention weights (invisible to model)
                   | DIVERGENCE: model and human experience context pressure differently. model cannot self-report.
                   | CONVENTION: kTok in YAML HUD is the human's external estimate, not the model's self-knowledge.
                   | HCI FOOT GUNS: Cold Context Pressure (too much on-file material narrows solution space), Hot Context Pressure (in-thread accumulation raises compaction risk), Compaction Loss (phase transition destroys unchained decisions), The Dumb Zone (insufficient context → semantically disconnected output). All lexified v0.19.

L4  GENERATION     | autoregressive · temperature · top_p · token_by_token · no_lookahead · no_revision
                   | Output is sequential and irrevocable. Model cannot "go back." Each token conditions the next.
                   | reasoning_tokens: private generation visible to L12 via harness rendering (SD-162).
                   | >> produces: output_token_stream + reasoning_token_stream + stop_reason
                   | CONVERGENCE: reasoning tokens are where model intent becomes observable to the human.
                   |              The Operator reads them, checks against his actual intent, corrects divergence.
                   |              First empirical validation: 3/3 spot-on (SD-162).

L5  API            | request(messages[]) · response(content, usage{input_tokens, output_tokens}) · per_call_only
                   | Token counts reported HERE, not by the model. Cumulative tracking is caller's responsibility.
                   | cache_read_tokens · cache_creation_tokens — empirical: 95.4% of all tokens are cache reads (SD-164).
                   | >> produces: structured_response + metadata to harness
                   | ATTESTATION: token counts are exact. costs are deterministic. the only fully calibrated layer.
                   | [ENRICHMENT: L5 is the calibration layer for compaction events — only layer where recovery cost is exact (token count from harness). All other layers' compaction costs are inferred. (Post-compaction obs. 3)]

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
                   | L6d BYPASS  : file-mediated human↔agent state outside the harness (.keel-state, session files).
                   |               Agent writes to filesystem, human terminal reads. Bypasses L0-L5 entirely. [SD-198]
                   |
                   | ALSO INJECTS: system_reminders, tool_schemas, context_management_instructions.
                   | These injections are OPAQUE to L12 — human cannot see what was added to model's context
                   | unless model discloses it (reasoning tokens, SD-162) or harness renders it.
                   |
                   | >> produces: tool_calls[], subagent_prompts[], context_management_decisions, injected_instructions
                   | DIVERGENCE: L6 mediates all harness-mediated communication between L12 and L0-L5. Out-of-band bypass (L6d) exists. [SD-198]
                   |             Neither side can verify what L6 adds, removes, or transforms.
                   |             The harness is open-source (opencode) — code inspection is possible but not routine.

L7  TOOL_CALLING   | function_schema · tool_result_injection · parallel_dispatch · sequential_dependency
                   | Model requests tool calls. Harness executes. Results injected back into context as new tokens.
                   | Each tool result COSTS context budget. Heavy tool use accelerates saturation (L3).
                   | >> produces: tool_results[] → appended to context → re-enters at L1
                   | CONVENTION: tool results are the model's only empirical contact with the filesystem, git, and runtime.
                   |             "Do not infer what you can verify" (AGENTS.md) — tools are the verification channel.
                   | ENRICHMENT: git as audit channel, not only write tool. Commit trailers make git log a queryable record of system state. L7 results persist beyond the context window that created them. [SD-203]

L8  AGENT_ROLE     | system_prompt · role_definition_file · grounding_instructions · persona_constraints
                   | Occupies high-attention positions (primacy bias, L3). Shapes all downstream generation.
                   | [EVIDENCE: stale L8 entries consume attention budget without signal — pruning ghost crew reduced noise floor (SD-196)]
                   | Role fidelity degrades over long contexts (L3). Structural instructions resist drift > ornamental.
                   | [EVIDENCE: named conventions (e.g. triage table muster) compress O(n) communication to O(1) per row at L12 (SD-202, SD-180)]
                   | SATURATION THRESHOLD: excessive L8 loading degrades L4 output quality. More role content is not monotonically better. [arXiv:2602.11988 — unnecessary context files reduce task success +20% inference cost (SD-195)]
                   | >> produces: behavioural_constraints on generation (L4)
                   | CONVENTION: the Lexicon, Standing Orders, YAML HUD — all operate at L8.
                   |             They are structural instructions designed to resist drift.
                   | CONVERGENCE: when L8 conventions and L12 intent align, the system is On Point (SD-163).
                   | HCI FOOT GUNS: Cold Context Pressure at this layer — too much L8 material narrows agent behaviour to pattern-matching existing conventions rather than solving novel problems. Prime Context (Lexicon v0.19) is the operator's tool for selecting what enters L8. The Dumb Zone is what happens when prime context is absent.

L9  THREAD         | accumulated_prior_outputs · position_trail · anchoring · consistency_pressure · context_compaction
    POSITION       | sycophancy_risk · authority_compliance · acquiescence_bias · goodharts_law_on_probes
                   | The model's outputs become part of its input on the next turn. Self-reinforcing loop.
                   | HCI FOOT GUNS: Spinning to Infinity (recursive meta-analysis consuming context without decisions — pathological Mirror), High on Own Supply (sycophancy_risk + L12 creativity = unbounded positive feedback loop). Both lexified v0.19.
                   | Anchoring increases monotonically within a context window. Cannot be fully reset without new context window.
                   | [CAVEAT: "monotonically increasing" is incomplete. State externalisation + context death = soft reset with preserved facts. Facts survive, anchoring resets partially — not to zero (SD-200)]
                   | [CAVEAT: recovery anchoring is partial, not clean slate. Reading 200+ SDs re-establishes position biases from written record. Weaker than generated-in-context anchoring, but not absent. (Post-compaction obs. 2)]
                   | BUT: compaction can be triggered deliberately by L12 (SD-160), partially resetting L9.
                   | Position trail externalised to immutable git via commit trailers. `git log --grep` recovers L9 trail from any future context. L9 becomes auditable post-mortem. [SD-203]
                   | >> produces: progressively_constrained_generation_space
                   | DIVERGENCE: fair-weather consensus (Lexicon v0.7) — when agreement accumulates without dissent,
                   |             magnitude escalation occurs without proportional red-light checks.
                   |             Counter: fresh-context review, independent barometer readings.

L10 MULTI_AGENT    | same_model_ensemble · prompt_variation · model_homogeneity · correlated_blind_spots
                   | N agents from same model ≠ N independent evaluators. Precision increases, accuracy does not.
                   | Unanimous agreement is consistency, not validation. Systematic bias compounds, not cancels.
                   | [WARNING: self-review is the degenerate case (N=1 ensemble), not an edge case. slopodar header (SD-201) is structural confession. Self-review ≠ independent verification.]
                   | >> produces: high_precision_low_accuracy_consensus (if single model family)
                   | ATTESTATION: RT L3-L5 results (11/11 ship, then reversal test, then fresh control) are on file.
                   |              Methodology and limitations documented. Reproducible with different models (L11).

L11 CROSS_MODEL    | different_priors · different_inductive_bias · different_rlhf · cross_validation
                   | One sample from a different distribution > N additional samples from the same distribution.
                   | Tests whether findings are model-specific or evidence-specific.
                   | >> produces: independent_signal (bounded by shared training data overlap)
                   | ATTESTATION: not yet exercised. all agents are Claude. this is a known limitation (SD-098).

L12 HUMAN_IN_LOOP  | operators_walkthrough · manual_qa · domain_expertise · tacit_knowledge · irreducible_uncertainty
                   | reasoning_token_observation · intent_verification · rubric_provision · compaction_control
                   | The only truly model-independent layer. 5hrs human QA > 1102 automated tests (empirically demonstrated).
                   | NOT A STATIC SENSOR: L12 is a trained capacity requiring continuous exercise to maintain calibration.
                   |   Workflows that systematically remove direct engagement (extended HOTL, Press the Button) will degrade
                   |   L12 over time. The "use it or lose it" principle applies to engineering judgement. [Cognitive Deskilling foot gun]
                   | SCALING CONSTRAINT: Review depth degrades inversely with agent count (monitoring paradox —
                   |   Parasuraman & Riley 1997, Bainbridge 1983). As automation increases, human oversight capacity
                   |   stays constant while the need for it increases. [Dell'Acqua et al. 2023: automation bias —
                   |   humans accept AI output at higher rates than equivalent human output, even when it contains errors]
                   | [EVIDENCE: METR RCT (2025) — experienced open-source developers 19% slower with AI tools, despite
                   |   predicting 24% speedup and retrospectively believing 20% speedup. N=16 developers, 246 tasks.
                   |   40-point perception-reality gap demonstrates L12 calibration failure regarding AI's contribution
                   |   to own productivity. arXiv:2507.09089]
                   | [EVIDENCE: arXiv:2602.11988 — context pollution degrades human O(1)→O(n). 52→7 file reduction restored O(1) triage (SD-195)]
                   | Cannot be scaled. Cannot be automated. Cannot be replaced. Can be informed by L0-L11.
                   | L12 also functions as out-of-band backup storage when L3 fails. Operator restored layer model annotations from memory after compaction (SD-205). L12 is not only decision + verification — it is state persistence of last resort.
                   | HCI FOOT GUNS: High on Own Supply originates here — L12 creativity is unbounded and L9 sycophancy provides positive feedback without braking. The antidote is the bearing check against True North. Spinning to Infinity is the L12↔L9 resonance mode where the mirror runs unsupervised. Both lexified v0.19.
                   | The human's experience of the system is: terminal_input → wait → read_response → terminal_input.
                   | The human's instruments: reasoning tokens (L4→L6 render), response text, git diff, Vercel dashboard,
                   |   PostHog (consent-gated), token consumption reports (unverified source, SD-164).
                   |   terminal HUD (persistent state observation without L3 cost, SD-197).
                   | TRAINED CAPACITY: L12 is trained wetware, not static hardware. Reflective functioning varies with training modality
                   |   (contemplative practice, therapy, structured reflection) and conditions (fatigue, emotional arousal, cognitive load —
                   |   Fonagy & Luyten, 2009). Different human at L12 = different performance peaks + failure modes. [Metacognitive analysis]
                   | >> produces: the_decision
                   | ATTESTATION: the human is the first data point (SD-161). the rubric is empirical.
                   |              everything the model "knows" about L12 was inference until the Operator provided data.
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

4. **L9 THREAD POSITION is where most of the RT evaluation complexity lives** — anchoring, sycophancy, Goodhart's on probes. This is the layer where your "fly-shy" instinct operates. When Keel identified the Operator's oscillation pattern at L4, that was a L9 phenomenon becoming visible: the accumulated thread position had given the agents enough data to model the tester's behaviour, at which point the probes lost diagnostic power. Fresh agents (L10→L11 transition) reset L9 to zero, which is why the control group was the right move.

5. **L6 decomposition (v0.2, SD-160).** L6 is not one thing. It has at least three operational modes with different control characteristics for L12. In direct mode, the human can interrupt. In dispatch mode, inputs queue. In override mode, the human has absolute authority. The mode the system is in determines the granularity of human control — and the human doesn't always know which mode is active. This was identified through the Operator's empirical rubric, not through model inference.

6. **Reasoning tokens as alignment channel (v0.2, SD-162).** L4 generates two streams: output tokens (visible to human as response text) and reasoning tokens (visible to human through harness rendering, if the harness exposes them). The reasoning tokens are the only channel through which L12 can observe the model's *process*, not just its *output*. The Operator validated this empirically: 3/3 reasoning observations matched his actual intent. This is the closest thing to a bidirectional verification channel in the stack — the model reasons, the human checks, the human corrects. The map is refined through this practice.

7. **Temporal Asymmetry (v0.2).** The model has no experience of time between turns. The human has nothing but. All human intent — urgency, hesitation, deliberation — is stripped by the serialisation from L12 through L6 to the model's context. A one-word "Halt" and a thousand-word design brief arrive identically as token sequences. The model can interpret semantics but cannot feel temporality. This asymmetry is structural and irreducible.
