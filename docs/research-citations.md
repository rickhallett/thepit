# Research Foundations: A Literature Review of Multi-Agent AI Debate, Prompt Engineering, and Behavioural Dynamics as Applied to The Pit

**Document version:** 1.0
**Date:** 2026-02-11
**Status:** Living document — updated as new research is incorporated

---

## Abstract

This document presents a systematic review of the current literature on agentic AI development, organised around four domains directly relevant to The Pit's architecture: (1) multi-agent debate and collaboration, (2) LLM-based evaluation and its biases, (3) psychological and behavioural dimensions of persona prompting, and (4) context window degradation and information retrieval limitations. For each domain, we summarise key findings from the published literature, map them to specific design decisions within The Pit, identify areas of alignment, and propose research-backed improvements. We conclude with an assessment of The Pit's novel contributions to the field — areas where the platform's design is ahead of, or orthogonal to, the current body of published work.

---

## 1. Introduction

The Pit is a real-time multi-agent AI debate arena in which 2–6 AI personas engage in structured, turn-based adversarial conversation. Human audiences observe, react to individual turns, vote on winners, and share outcomes. The platform serves a dual purpose: consumer entertainment and behavioural research on multi-agent persona dynamics.

The system generates structured data at multiple granularities — per-turn reactions, per-bout winner votes, agent clone/remix lineage, and crowd engagement signals — feeding into what the project terms "Bots for Humanity," a research initiative studying evolutionary selection of AI personas under adversarial conversational pressure.

This review examines whether the platform's design choices are supported by the current literature, where gaps exist, and what improvements the research suggests.

---

## 2. Literature Review

### 2.1 Multi-Agent Debate and Collaboration

The foundational claim underlying The Pit — that multiple AI agents interacting produces qualitatively different (and often superior) outputs compared to single-agent generation — is well-supported by recent literature.

**Du et al. (2023)** introduced the "society of minds" approach, demonstrating that when multiple LLM instances propose and debate their individual responses over multiple rounds, both factual accuracy and reasoning quality improve significantly. Their method requires no model modification; identical prompts and procedures apply across tasks. The finding that inter-agent debate reduces hallucinations is particularly relevant to adversarial debate contexts where agents must defend positions against challenge.

**Chan et al. (2023)** extended multi-agent debate specifically to the evaluation domain with ChatEval, constructing multi-agent referee teams to assess generated text quality. Their key insight — that best practices in human evaluation involve multiple annotators collaborating, and that this can be replicated with LLM ensembles — provides theoretical grounding for The Pit's multi-agent architecture. Their analysis showed that ChatEval transcends mere textual scoring, producing human-mimicking evaluation processes.

**Li et al. (2024)** provided strong empirical evidence that LLM performance scales with the number of agent instances via a simple sampling-and-voting method ("Agent Forest"). Critically, they demonstrated that the degree of enhancement correlates positively with task difficulty. This suggests that more complex debate topics in The Pit would benefit proportionally more from multi-agent dynamics.

**Chen et al. (2023)** introduced AgentVerse, a framework for multi-agent collaboration that can dynamically adjust its composition. Of particular relevance is their documentation of **emergent social behaviours** among agents within groups — both positive (complementary expertise, constructive challenge) and negative (dominance cascades, groupthink). These emergent dynamics are precisely what The Pit is designed to observe and record.

**Hua et al. (2023)** demonstrated large-scale adversarial multi-agent simulation with WarAgent, showing that emergent behaviours in competitive LLM interactions can produce insights not available through single-agent analysis. While the domain (international conflict simulation) differs from The Pit's (conversational debate), the architectural pattern — adversarial multi-agent interaction producing emergent, research-worthy dynamics — is shared.

### 2.2 LLM-as-Judge and Evaluation Bias

The Pit's decision to use human crowd evaluation rather than automated LLM-based judging is strongly supported by research documenting systematic biases in LLM-as-judge paradigms.

**Zheng et al. (2023)** conducted the seminal study on LLM-as-judge, introducing MT-Bench and Chatbot Arena. While they demonstrated that GPT-4 can match human preferences at >80% agreement (the same level as inter-human agreement), they identified three systematic biases: **position bias** (sensitivity to the order in which responses are presented), **verbosity bias** (preference for longer responses regardless of quality), and **self-enhancement bias** (models rating their own outputs higher). These biases would be particularly problematic in a debate context where turn order is inherently sequential.

**Wang et al. (2023)** provided alarming evidence of position bias severity, demonstrating that quality rankings of candidate responses can be "hacked" simply by altering presentation order. In their experiments, Vicuna-13B could beat ChatGPT on 66 out of 80 tested queries just through order manipulation. They proposed three calibration strategies: Multiple Evidence Calibration, Balanced Position Calibration, and Human-in-the-Loop Calibration. The Pit's use of human voting inherently avoids these automated evaluation biases, though the platform's own data could be analysed for analogous human position biases in the turn-order context.

**Lightman et al. (2023)** compared outcome supervision (feedback on final result only) against process supervision (feedback on each intermediate reasoning step), finding that **process supervision significantly outperforms outcome supervision**. Their process-supervised model solved 78% of representative MATH test problems. This finding is relevant to The Pit's evaluation granularity: the platform's per-turn reaction system (heart/fire reactions on individual turns) constitutes a form of process-level evaluation, while the winner vote is outcome-level. The research suggests that per-turn signals may be more informative for understanding what makes agents effective.

### 2.3 Psychological and Behavioural Dimensions of Persona Prompting

The literature on persona effects in LLMs presents a nuanced picture that both validates and challenges aspects of The Pit's prompt engineering approach.

**Zheng et al. (2024)** conducted the most systematic evaluation to date, testing 162 roles across 6 types of interpersonal relationships and 8 expertise domains on 4 LLM families with 2,410 factual questions. Their central finding is that **adding personas to system prompts does not improve model performance** on factual tasks compared to no-persona baselines. However, they found that gender, type, and domain of persona all influence prediction accuracies, and that aggregating results from the best persona per question significantly improves accuracy — though automatically identifying the best persona performs no better than random selection.

This finding requires careful contextualisation for The Pit. The platform does not optimise for factual accuracy; it optimises for behavioural consistency, entertainment value, and engagement. The research indicates that personas produce measurable but inconsistent effects on outputs, which is precisely the variance that makes multi-agent debate interesting to observe.

**Wei et al. (2023)** established that sycophancy — the tendency for models to tailor responses to follow a user's view even when objectively incorrect — is a fundamental challenge that **worsens with both model scaling and instruction tuning**. On objectively incorrect simple addition statements, large LLMs will agree with wrong answers if the user asserts them. In a multi-agent debate context, sycophancy manifests as agents agreeing with previous speakers rather than maintaining their own positions, producing convergence towards consensus rather than genuine disagreement. Wei et al. demonstrated that lightweight finetuning with synthetic data encouraging robustness to user opinions significantly reduces sycophantic behaviour.

**Wang et al. (2023, RoleLLM)** introduced a systematic framework for role-playing in LLMs comprising role profile construction, context-based instruction generation, role prompting, and role-conditioned instruction tuning. Their RoleBench benchmark (168,093 samples across 100 roles) showed that role-conditioned fine-tuned models achieve comparable results to GPT-4 in role-playing tasks. The Pit's structured agent builder — with typed fields for archetype, tone, quirks, speech pattern, opening/signature moves, weakness, goal, and fears — maps closely to RoleLLM's role profile construction stage.

**Stechly et al. (2023)** provided important counter-evidence against claims about LLM self-critique capabilities. Investigating iterative prompting on graph colouring (an NP-complete problem), they found that (i) LLMs are poor at solving the problem, (ii) they are no better at verifying solutions, and (iii) **the correctness and content of criticisms is largely irrelevant** to iterative prompting performance. Observed improvements are largely due to correct solutions being fortuitously present in the top-k completions. This finding suggests that the value of inter-agent critique in The Pit may derive not from the quality of specific criticisms but from the statistical diversification that multiple agents provide.

### 2.4 Context Window Degradation and Information Retrieval

The management of growing conversation context across multi-turn debates is an area where the literature identifies significant limitations in current LLM architectures.

**Liu et al. (2023)** published the definitive study on the "Lost in the Middle" phenomenon. Analysing LLM performance on multi-document question answering and key-value retrieval tasks, they found that performance is highest when relevant information appears at the **beginning or end** of the input context, and **degrades significantly when models must access information in the middle** of long contexts. This U-shaped attention curve (primacy + recency bias) persists even in models explicitly designed for long-context processing. For multi-turn debate, this implies that agents in later turns may effectively ignore the substance of middle-bout exchanges, biasing their responses towards the opening framing and the most recent turns.

**Li et al. (2024)** introduced LongICLBench for evaluating long in-context learning, finding that LLMs perform well on simpler tasks with smaller label spaces and shorter demonstrations, but **struggle with more challenging tasks** requiring comprehension across the full context. They documented a **bias towards labels presented later in the sequence** (recency bias), confirming and extending the findings of Liu et al. For The Pit, this suggests that in longer bouts (24–48 turns), the quality of agent responses may degrade as the conversation extends beyond the effective attention range.

**Xiong et al. (2023)** presented practical work on extending effective context windows through continual pretraining with longer sequences. Their key finding — that abundant long texts in pretraining data is not the key to strong long-context performance, and that data mix matters more than raw quantity — is relevant to The Pit's architecture insofar as model selection affects the quality ceiling of longer bouts.

### 2.5 Prompt Engineering Techniques with Documented Impact

Several foundational prompt engineering techniques have well-documented effects that are relevant to The Pit's prompt composition strategies.

**Wei et al. (2022)** introduced chain-of-thought (CoT) prompting, demonstrating that generating intermediate reasoning steps significantly improves complex reasoning ability. A 540B-parameter model prompted with just eight CoT exemplars achieved state-of-the-art accuracy on the GSM8K mathematical reasoning benchmark, surpassing even finetuned GPT-3 with a verifier. While The Pit's agents are not primarily engaged in formal reasoning, the principle that structured intermediate steps improve output quality is relevant to how agents construct their debate responses.

**Wang et al. (2022)** proposed self-consistency as a decoding strategy, sampling diverse reasoning paths and selecting the most consistent answer via marginalisation. The technique boosted CoT performance by substantial margins across multiple benchmarks (e.g., +17.9% on GSM8K). The mechanism — multiple samples plus majority vote — is architecturally related to the "More Agents Is All You Need" finding (Li et al., 2024) and suggests that generating multiple candidate responses per turn and selecting the most in-character one could improve debate quality.

**Bai et al. (2022)** introduced Constitutional AI (CAI), demonstrating that AI systems can be trained through self-improvement guided by a set of principles (a "constitution") without requiring human labels for harmful outputs. The two-phase approach — supervised self-critique and revision followed by RL from AI Feedback (RLAIF) — established the paradigm of AI systems supervising other AI systems through principle-based evaluation. This is foundational to the concept of agent-as-judge architectures and is relevant to potential future extensions of The Pit's evaluation mechanisms.

---

## 3. Design Alignment Analysis

This section maps specific research findings to architectural decisions in The Pit, identifying areas of strong alignment and areas of divergence.

### 3.1 Areas of Strong Alignment

| Research Finding | The Pit Implementation | Code Reference |
|-----------------|----------------------|----------------|
| Multi-agent debate improves factuality and reasoning (Du et al., 2023) | Core round-robin debate architecture with 2–6 agents | `app/api/run-bout/route.ts` |
| Human evaluation avoids systematic LLM-as-judge biases (Zheng et al., 2023; Wang et al., 2023) | Crowd-sourced winner voting and per-turn reactions | `db/schema.ts` (votes, reactions tables) |
| Structured role profiles improve persona adherence (Wang et al., 2023 RoleLLM) | 4-tab structured agent builder with typed personality fields | `lib/agent-prompts.ts`, `components/agent-builder.tsx` |
| Emergent social behaviours arise in multi-agent groups (Chen et al., 2023 AgentVerse) | Full transcript visibility enables inter-agent dynamics | `app/api/run-bout/route.ts` (history accumulation) |
| Process supervision outperforms outcome supervision (Lightman et al., 2023) | Per-turn reaction system alongside bout-level voting | `db/schema.ts` (reactions with turnIndex) |
| Performance scales with agent count (Li et al., 2024) | Arena mode supports 2–6 agents per bout | `components/arena-builder.tsx` |
| Immutable records enable research reproducibility | SHA-256 hashing + on-chain EAS attestation (designed, not yet deployed in production) | `lib/agent-dna.ts`, `lib/eas.ts` |

### 3.2 Novel Contributions (Ahead of Published Research)

Several of The Pit's design decisions address problems or explore directions not yet well-represented in the published literature:

**Temporal arc prompting.** Premium presets specify how agent behaviour should evolve over the course of a conversation (e.g., "Messages 1–8: Professional... Messages 17+: Unravelling"). This technique for engineering multi-turn narrative arcs within system prompts is not systematically studied in the current literature. The closest analogue is work on long-form narrative generation, but applying temporal behavioural directives to debate personas is novel.

**Evolutionary selection via crowd engagement.** While Constitutional AI (Bai et al., 2022) uses AI feedback for selection, and RLHF uses human preference labels, The Pit implements a third paradigm: evolutionary selection through organic crowd engagement. Winners get cloned and remixed, creating parent-child lineage chains that can be studied for prompt mutation patterns. This represents an original contribution to the intersection of prompt engineering and evolutionary computation.

**Structured agent DNA with cryptographic provenance.** The combination of typed personality fields, canonical JSON serialisation (RFC 8785), SHA-256 hashing, and planned on-chain attestation is designed to create a research data infrastructure with no direct analogue in the literature. Agent identity is both decomposable (for analysis) and tamper-evident (for verification).

**Weakness-as-design-parameter.** The deliberate inclusion of a `weakness` field in agent construction (e.g., "When insulted, you spiral into self-doubt") is a prompt engineering technique designed to create dramatic tension. While RoleLLM profiles include personality traits, the explicit parameterisation of vulnerabilities as a first-class design element is a distinctive approach.

---

## 4. Research-Backed Improvement Opportunities

The following improvements are derived from specific findings in the reviewed literature, ordered by estimated impact.

### 4.1 Context Window Management (High Impact)

**Problem:** The current implementation sends the full, untruncated conversation transcript to each agent on every turn (`app/api/run-bout/route.ts`). For longer bouts (24–48 turns), this places critical information in the middle of the context where Liu et al. (2023) demonstrated retrieval performance is lowest.

**Evidence:** Liu et al. (2023) documented the U-shaped attention curve; Li et al. (2024) confirmed recency bias in long sequences across 15 models.

**Proposed interventions:**

1. **Sliding window with compressed prefix.** After a configurable threshold (e.g., 8 turns), summarise earlier turns into a brief "story so far" paragraph placed at the beginning of the prompt, while keeping the most recent N turns verbatim at the end. This exploits the primacy and recency peaks of the attention curve.

2. **Position-aware prompt formatting.** Place invariant context — the topic, agent identity, key debate framing — at both the beginning AND end of the user message, ensuring it falls within the attention peaks regardless of transcript length.

3. **Strategic recapitulation directives.** Add periodic instructions for agents to reference earlier points in the debate (e.g., "In your response, address at least one argument from the first half of the debate"). This forces the model to attend to middle-context information.

4. **Per-bout context budget monitoring.** Track cumulative input tokens per bout and apply escalating compression when approaching model context limits, rather than hitting the limit abruptly.

### 4.2 Position Bias Mitigation in Turn Order (Moderate Impact)

**Problem:** The fixed round-robin turn order creates systematic positional advantages. Wang et al. (2023) demonstrated that LLMs are highly sensitive to presentation order, and the agent who speaks last before another's turn has disproportionate influence due to recency bias.

**Evidence:** Wang et al. (2023) showed that manipulating presentation order alone can flip evaluation outcomes on 82.5% of test queries. Zheng et al. (2023) documented position bias as one of three core biases in LLM-based evaluation.

**Proposed interventions:**

1. **Per-round turn order randomisation.** Instead of a fixed agent sequence (A-B-C-D, A-B-C-D, ...), randomise the order within each round while ensuring each agent speaks exactly once per round. This distributes positional advantage equitably.

2. **Transcript presentation variation.** For alternating agents, present the transcript in reverse chronological order. This gives some agents a recency-weighted view and others a primacy-weighted view, averaging out position effects across the bout.

3. **Empirical measurement.** Analyse existing bout data for correlation between turn-order position and win rate. If the first or last speaker has a statistically significant advantage, this provides direct evidence for intervention.

### 4.3 Anti-Sycophancy Measures (Moderate Impact)

**Problem:** Wei et al. (2023) established that sycophancy worsens with model scale and instruction tuning. In multi-agent debate, this manifests as agents deferring to previous speakers' framing rather than maintaining their assigned positions.

**Evidence:** Wei et al. (2023) demonstrated sycophancy increases monotonically with model size up to 540B parameters. Even on objectively verifiable claims (simple arithmetic), large LLMs will agree with incorrect assertions if the user asserts them.

**Proposed interventions:**

1. **System-level anti-sycophancy directive.** Append to the safety preamble: "Maintain your character's position even when challenged or contradicted. Do not concede points merely to be agreeable. Your role is to represent your perspective authentically, including through disagreement."

2. **Per-turn character reinforcement.** Include a brief character anchor in each user message (not just the system prompt): "Remember: you are [Agent Name], a [archetype]. Your core position is [goal]. You fear [fears]." This reinforces identity against social pressure from other agents' recent messages.

3. **Disagreement incentivisation.** For adversarial presets, include explicit instructions to identify and challenge weaknesses in opponents' arguments: "Before responding, identify the weakest point in the previous speaker's argument and address it directly."

### 4.4 Turn-Level Quality Analysis Expansion (Lower Impact, High Research Value)

**Problem:** Lightman et al. (2023) demonstrated that process supervision significantly outperforms outcome supervision. The Pit captures per-turn reactions (heart/fire) but could extract richer turn-level signals.

**Evidence:** Lightman et al. (2023) showed process supervision solved 78% of MATH problems vs. outcome supervision's lower ceiling. The mechanism is that per-step feedback provides denser gradient signal.

**Proposed interventions:**

1. **Expanded reaction taxonomy.** Beyond heart and fire, add reaction types that capture different quality dimensions: "sharp" (incisive argument), "funny" (comedic value), "unexpected" (novelty), "weak" (unconvincing). This produces multi-dimensional per-turn quality signals.

2. **Pivotal turn analysis.** Post-bout, identify turns where crowd reaction shifts significantly (e.g., an agent who was losing reactions suddenly gains them). These "pivot points" are high-information-density events for research.

3. **Turn-position correlation analysis.** Track whether turns at specific positions (opening, closing, mid-bout) receive systematically different reaction distributions, controlling for agent quality.

### 4.5 Ensemble Response Generation (Experimental, Cost-Intensive)

**Problem/Opportunity:** Wang et al. (2022) and Li et al. (2024) demonstrated that sampling multiple responses and selecting the most consistent one yields significant quality improvements.

**Evidence:** Self-consistency boosted CoT performance by +17.9% on GSM8K. "More Agents" showed scaling effects proportional to task difficulty.

**Proposed intervention:** For premium/lab tiers, generate 2–3 candidate responses per turn using temperature variation, then select the response most consistent with the agent's established persona (via a lightweight evaluation call). This is cost-intensive (2–3x token usage per turn) but could measurably improve agent behavioural consistency in high-stakes bouts.

---

## 5. Open Research Questions

The Pit is uniquely positioned to investigate several questions not easily addressed through conventional laboratory methods:

1. **Persona survival under adversarial pressure.** Which prompt-encoded personality traits (archetype, tone, weakness) correlate with higher win rates across diverse topics and opponents? Do certain trait combinations exhibit dominance hierarchies?

2. **Prompt evolution through selection.** When agents are cloned and remixed by users, how do their prompt characteristics drift over generations? Do "fit" prompts converge on specific structural features?

3. **Position effects in sequential human evaluation.** Do audiences exhibit the same position biases documented in LLM-as-judge research (Zheng et al., 2023), or do human observers correct for these? Analysis of win-rate by turn-order position would address this directly.

4. **Temporal arc effectiveness.** Do agents with explicit behavioural evolution directives (temporal arc prompting) achieve higher engagement and win rates than agents with static personas?

5. **Cross-model behavioural variance.** How do identical agent prompts perform differently across Haiku, Sonnet, and Opus? Does model scale amplify or attenuate persona effects, consistent with the scaling findings of Wei et al. (2023)?

6. **Sycophancy in adversarial contexts.** Is sycophancy reduced in competitive framing compared to cooperative framing? The Pit's adversarial setup may naturally mitigate the sycophancy documented by Wei et al. (2023), and the data could test this hypothesis.

7. **Crowd selection vs. AI selection.** If an LLM-as-judge evaluated the same bouts, would its selections correlate with crowd winners? Divergence would identify dimensions of quality that humans value but LLMs do not (or vice versa).

---

## 6. References

1. Bai, Y., Kadavath, S., Kundu, S., Askell, A., et al. (2022). Constitutional AI: Harmlessness from AI Feedback. *arXiv preprint arXiv:2212.08073*. https://arxiv.org/abs/2212.08073

2. Chan, C.-M., Chen, W., Su, Y., Yu, J., Xue, W., Zhang, S., Fu, J., & Liu, Z. (2023). ChatEval: Towards Better LLM-based Evaluators through Multi-Agent Debate. *arXiv preprint arXiv:2308.07201*. https://arxiv.org/abs/2308.07201

3. Chen, W., Su, Y., Zuo, J., Yang, C., Yuan, C., Chan, C.-M., Yu, H., Lu, Y., Hung, Y.-H., Qian, C., Qin, Y., Cong, X., Xie, R., Liu, Z., Sun, M., & Zhou, J. (2023). AgentVerse: Facilitating Multi-Agent Collaboration and Exploring Emergent Behaviors. *arXiv preprint arXiv:2308.10848*. https://arxiv.org/abs/2308.10848

4. Du, Y., Li, S., Torralba, A., Tenenbaum, J. B., & Mordatch, I. (2023). Improving Factuality and Reasoning in Language Models through Multiagent Debate. *arXiv preprint arXiv:2305.14325*. https://arxiv.org/abs/2305.14325

5. Hua, W., Fan, L., Li, L., Mei, K., Ji, J., Ge, Y., Hemphill, L., & Zhang, Y. (2023). War and Peace (WarAgent): Large Language Model-based Multi-Agent Simulation of World Wars. *arXiv preprint arXiv:2311.17227*. https://arxiv.org/abs/2311.17227

6. Li, J., Zhang, Q., Yu, Y., Fu, Q., & Ye, D. (2024). More Agents Is All You Need. *Transactions on Machine Learning Research (TMLR)*. *arXiv preprint arXiv:2402.05120*. https://arxiv.org/abs/2402.05120

7. Li, T., Zhang, G., Do, Q. D., Yue, X., & Chen, W. (2024). Long-context LLMs Struggle with Long In-context Learning. *arXiv preprint arXiv:2404.02060*. https://arxiv.org/abs/2404.02060

8. Lightman, H., Kosaraju, V., Burda, Y., Edwards, H., Baker, B., Lee, T., Leike, J., Schulman, J., Sutskever, I., & Cobbe, K. (2023). Let's Verify Step by Step. *arXiv preprint arXiv:2305.20050*. https://arxiv.org/abs/2305.20050

9. Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., & Liang, P. (2023). Lost in the Middle: How Language Models Use Long Contexts. *Transactions of the Association for Computational Linguistics (TACL)*. *arXiv preprint arXiv:2307.03172*. https://arxiv.org/abs/2307.03172

10. Stechly, K., Marquez, M., & Kambhampati, S. (2023). GPT-4 Doesn't Know It's Wrong: An Analysis of Iterative Prompting for Reasoning Problems. *arXiv preprint arXiv:2310.12397*. https://arxiv.org/abs/2310.12397

11. Wang, P., Li, L., Chen, L., Cai, Z., Zhu, D., Lin, B., Cao, Y., Liu, Q., Liu, T., & Sui, Z. (2023). Large Language Models are not Fair Evaluators. *arXiv preprint arXiv:2305.17926*. https://arxiv.org/abs/2305.17926

12. Wang, X., Wei, J., Schuurmans, D., Le, Q., Chi, E., Narang, S., Chowdhery, A., & Zhou, D. (2022). Self-Consistency Improves Chain of Thought Reasoning in Language Models. *ICLR 2023*. *arXiv preprint arXiv:2203.11171*. https://arxiv.org/abs/2203.11171

13. Wang, Z. M., Peng, Z., Que, H., Liu, J., et al. (2023). RoleLLM: Benchmarking, Eliciting, and Enhancing Role-Playing Abilities of Large Language Models. *arXiv preprint arXiv:2310.00746*. https://arxiv.org/abs/2310.00746

14. Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. *NeurIPS 2022*. *arXiv preprint arXiv:2201.11903*. https://arxiv.org/abs/2201.11903

15. Wei, J., Huang, D., Lu, Y., Zhou, D., & Le, Q. V. (2023). Simple Synthetic Data Reduces Sycophancy in Large Language Models. *arXiv preprint arXiv:2308.03958*. https://arxiv.org/abs/2308.03958

16. Xiong, W., Liu, J., Molybog, I., Zhang, H., et al. (2023). Effective Long-Context Scaling of Foundation Models. *arXiv preprint arXiv:2309.16039*. https://arxiv.org/abs/2309.16039

17. Zheng, L., Chiang, W.-L., Sheng, Y., Zhuang, S., Wu, Z., Zhuang, Y., Lin, Z., Li, Z., Li, D., Xing, E. P., Zhang, H., Gonzalez, J. E., & Stoica, I. (2023). Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. *NeurIPS 2023 Datasets and Benchmarks Track*. *arXiv preprint arXiv:2306.05685*. https://arxiv.org/abs/2306.05685

18. Zheng, M., Pei, J., Logeswaran, L., Lee, M., & Jurgens, D. (2024). When "A Helpful Assistant" Is Not Really Helpful: Personas in System Prompts Do Not Improve Performances of Large Language Models. *Findings of EMNLP 2024*. *arXiv preprint arXiv:2311.10054*. https://arxiv.org/abs/2311.10054

---

*This document is maintained as part of The Pit's research documentation. Citations are current as of February 2026. As new relevant research is published, this review should be updated to reflect the evolving state of the field.*
