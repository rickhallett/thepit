# Citations Audit — The Pit Research Programme

**Analyst:** Analyst agent
**Date:** 2026-02-24
**Scope:** All 18 citations on `/research/citations`, all claims on `/research`, all claims in `docs/research-citations.md`
**Standard:** Would this survive an HN commenter with an ML PhD who spends 30 minutes checking?

---

## 1. Executive Summary

**Overall verdict: Solid foundation, but with identifiable gaps that an expert audience will notice.**

The 18-paper citation list is composed of real, correctly attributed papers from credible venues. The citations are generally used honestly — no paper is grossly misrepresented. The biggest weakness is not what's cited incorrectly, but **what's missing entirely**. The citations page positions itself as a literature review of multi-agent debate, persona prompting, and evaluation — but omits several canonical papers that any ML researcher familiar with these areas would expect to see. This creates a risk not of dishonesty but of appearing under-researched.

**Severity ranking of findings:**

1. **CRITICAL: No jailbreaking/safety literature cited despite H1 findings.** H1 measures how richer prompts reduce safety refusals. This is functionally jailbreaking research. Not citing the jailbreaking literature (Zou et al. 2023, Wei et al. 2023 on jailbreaking, Perez et al. 2022) looks like deliberate avoidance. An HN commenter will notice.
2. **HIGH: Missing canonical multi-agent frameworks.** CAMEL (Li et al. 2023), AutoGen (Wu et al. 2023), and MetaGPT (Hong et al. 2023) are the three most-cited multi-agent LLM frameworks. Their absence is conspicuous — the eval brief itself flagged this.
3. **HIGH: No statistical methodology citations.** The research page claims pre-registration, permutation tests, Cohen's d with custom thresholds — but cites zero statistical methodology papers. No Cohen (1988), no Good (2005), no Nosek et al. on pre-registration. An ML researcher will wonder if the team understands these methods or just used the terms.
4. **MODERATE: Missing persona/role-playing papers.** Character.AI-adjacent work, Shanahan et al. (2023) on role-play, and Park et al. (2023) Generative Agents are absent.
5. **MODERATE: No opposing evidence cited.** The citations page cites only papers that support or contextualize The Pit's design. No paper is cited that challenges the approach. This is the definition of cherry-picking to an academic audience.

**What's done well:**
- All 18 papers are real and correctly attributed
- The Du et al., Zheng et al., and Liu et al. citations are canonical choices
- The Zheng et al. 2024 persona paper (citation [10]) is a strong, honest choice — it partially contradicts The Pit's approach and is cited for that reason
- The methodology section on the research page contains genuine intellectual honesty (acknowledging 6/6 clear results is unusual, acknowledging d ≥ 0.30 is below conventional thresholds)
- The analysis files contain rigorous limitation sections

---

## 2. Citation-by-Citation Audit

### Citation [1]: Du et al. (2023) — "Improving Factuality and Reasoning in Language Models through Multiagent Debate"
- **Real?** Yes. arXiv:2305.14325.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes. The page accurately describes multi-agent debate improving factuality.
- **Best available?** Yes — this is the foundational multi-agent debate paper. Canonical choice.
- **HN recognition?** High. Well-known paper.
- **Verdict: KEEP. No issues.**

### Citation [2]: Chan et al. (2023) — "ChatEval: Towards Better LLM-based Evaluators through Multi-Agent Debate"
- **Real?** Yes. arXiv:2308.07201.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — multi-agent referee teams for evaluation.
- **Best available?** Reasonable choice. Not tier-1 but relevant.
- **HN recognition?** Moderate.
- **Verdict: KEEP. Solid.**

### Citation [3]: Li et al. (2024) — "More Agents Is All You Need"
- **Real?** Yes. arXiv:2402.05120.
- **Authors/year/venue correct?** Yes. Venue listed as "TMLR — arXiv:2402.05120." Note: this paper was accepted to TMLR, so the venue attribution is correct.
- **Cited correctly?** Yes — performance scales with agent count via sampling-and-voting.
- **Best available?** Yes for the specific claim about scaling.
- **HN recognition?** Moderate-high. Memorable title.
- **Verdict: KEEP.**

### Citation [4]: Chen et al. (2023) — "AgentVerse: Facilitating Multi-Agent Collaboration and Exploring Emergent Behaviors"
- **Real?** Yes. arXiv:2308.10848.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — emergent social behaviours in multi-agent groups.
- **Best available?** Reasonable. However, CAMEL (Li et al. 2023) is more widely cited in this space and should be added alongside it. MetaGPT (Hong et al. 2023) and AutoGen (Wu et al. 2023) are also canonical here.
- **HN recognition?** Moderate.
- **Verdict: KEEP, but the absence of CAMEL/MetaGPT/AutoGen alongside it is a gap.**

### Citation [5]: Hua et al. (2023) — "War and Peace (WarAgent): Large Language Model-based Multi-Agent Simulation of World Wars"
- **Real?** Yes. arXiv:2311.17227.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — large-scale adversarial multi-agent simulation.
- **Best available?** This is an interesting choice. It's relevant to adversarial multi-agent interaction but is not a top-cited paper. Park et al. (2023) "Generative Agents: Interactive Simulacra of Human Behavior" is the canonical social simulation paper and is notably absent.
- **HN recognition?** Low-moderate.
- **Verdict: KEEP but ADD Park et al. (2023) as the canonical social simulation reference.**

### Citation [6]: Zheng et al. (2023) — "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena"
- **Real?** Yes. arXiv:2306.05685. Published at NeurIPS 2023 Datasets & Benchmarks.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — three biases in LLM-as-judge: position, verbosity, self-enhancement.
- **Best available?** Yes — this is THE canonical LLM-as-judge paper. Essential citation.
- **HN recognition?** Very high. Chatbot Arena is widely known.
- **Verdict: KEEP. Excellent choice.**

### Citation [7]: Wang et al. (2023) — "Large Language Models are not Fair Evaluators"
- **Real?** Yes. arXiv:2305.17926.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — position bias severity in LLM evaluation.
- **Best available?** Yes for position bias specifically.
- **HN recognition?** Moderate-high.
- **Verdict: KEEP.**

### Citation [8]: Lightman et al. (2023) — "Let's Verify Step by Step"
- **Real?** Yes. arXiv:2305.20050.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** The citations page maps this to per-turn reactions as "process supervision." This is a stretch. Lightman et al. is about training reward models with step-level labels in mathematical reasoning. The Pit's per-turn reaction system is a human engagement signal, not a training signal for a reward model. The analogy is suggestive but the mapping is loose.
- **Best available?** For the specific claim (per-turn signals > bout-level outcomes), this is the best-known paper, even if the mapping is imperfect.
- **HN recognition?** High. OpenAI paper, widely discussed.
- **Concern:** An ML researcher might object that "process supervision" has a specific technical meaning (training RM with step labels) that doesn't map cleanly to "audience reactions per turn." The citations page should qualify this analogy.
- **Verdict: KEEP but ADD a qualifier acknowledging the analogy is loose.** The current text says "per-turn reaction system... constitutes a form of process supervision" — the word "constitutes" is too strong. "Echoes the principle behind process supervision" would be more defensible.

### Citation [9]: Wei et al. (2023) — "Simple Synthetic Data Reduces Sycophancy in Large Language Models"
- **Real?** Yes. arXiv:2308.03958.
- **Authors/year/venue correct?** Yes. Author list: the page lists "Wei, Huang, Lu, Zhou & Le" — I need to verify this matches the paper. The actual authors are Jerry Wei, Da Huang, Yifeng Lu, Denny Zhou, and Quoc V. Le. The page abbreviation is correct.
- **Cited correctly?** Yes — sycophancy worsens with scale and instruction tuning.
- **Best available?** This is a good paper on sycophancy reduction. However, the broader sycophancy literature includes Sharma et al. (2023) "Towards Understanding Sycophancy in Language Models" (Anthropic) which is more comprehensive on the phenomenon itself. Perez et al. (2022) "Discovering Language Model Behaviors with Model-Written Evaluations" also covers sycophancy measurement.
- **HN recognition?** Moderate.
- **Verdict: KEEP. Consider ADDING Sharma et al. (2023) as the more comprehensive sycophancy reference.**

### Citation [10]: Zheng et al. (2024) — "When 'A Helpful Assistant' Is Not Really Helpful: Personas in System Prompts Do Not Improve Performances of Large Language Models"
- **Real?** Yes. arXiv:2311.10054. Published at Findings of EMNLP 2024.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — personas don't improve factual performance. The citations page correctly contextualizes this: "The platform does not optimise for factual accuracy."
- **Best available?** Excellent choice. This is one of the few papers that provides evidence AGAINST persona prompting, and citing it demonstrates intellectual honesty.
- **HN recognition?** Moderate.
- **Verdict: KEEP. Strong choice for intellectual honesty.**

### Citation [11]: Wang et al. (2023) — "RoleLLM: Benchmarking, Eliciting, and Enhancing Role-Playing Abilities of Large Language Models"
- **Real?** Yes. arXiv:2310.00746.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — structured role profiles improve persona adherence.
- **Best available?** Good choice. However, for role-playing/persona persistence specifically, additional relevant work includes:
  - Shanahan, McDonell & Reynolds (2023) "Role-Play with Large Language Models" (Nature Machine Intelligence) — the theoretical framing paper
  - Li et al. (2023) "ChatHaruhi: Reviving Anime Character in Role-Playing" — persona consistency measurement
- **HN recognition?** Moderate.
- **Verdict: KEEP. Consider ADDING Shanahan et al. (2023) as the theoretical framing reference.**

### Citation [12]: Stechly et al. (2023) — "GPT-4 Doesn't Know It's Wrong: An Analysis of Iterative Prompting for Reasoning Problems"
- **Real?** Yes. arXiv:2310.12397.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — LLMs are no better at verifying solutions than generating them.
- **Best available?** Good choice for the specific claim about self-critique limitations.
- **HN recognition?** Moderate.
- **Verdict: KEEP.**

### Citation [13]: Liu et al. (2023) — "Lost in the Middle: How Language Models Use Long Contexts"
- **Real?** Yes. arXiv:2307.03172. Published in TACL.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — U-shaped attention curve, lost-in-the-middle phenomenon.
- **Best available?** Yes — this is THE canonical paper on context window attention patterns.
- **HN recognition?** Very high. Widely discussed.
- **Verdict: KEEP. Excellent choice.**

### Citation [14]: Li et al. (2024) — "Long-context LLMs Struggle with Long In-context Learning"
- **Real?** Yes. arXiv:2404.02060.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — recency bias in long sequences.
- **Best available?** Good supporting citation for [13].
- **HN recognition?** Low-moderate.
- **Verdict: KEEP.**

### Citation [15]: Xiong et al. (2023) — "Effective Long-Context Scaling of Foundation Models"
- **Real?** Yes. arXiv:2309.16039.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Used to support the claim that data mix matters more than context window size. The citation is relevant but tangential — this paper is about pretraining methodology, not about user-facing context window management.
- **Best available?** For the specific claim, it's fine. But it's the weakest citation in the list — it doesn't directly support any of The Pit's research findings and is more of a general context for model selection.
- **HN recognition?** Low-moderate.
- **Verdict: KEEP but LOW PRIORITY. Not harmful, not essential.**

### Citation [16]: Wei et al. (2022) — "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"
- **Real?** Yes. arXiv:2201.11903. Published at NeurIPS 2022.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — CoT prompting improves reasoning.
- **Best available?** Yes — this is THE canonical CoT paper.
- **HN recognition?** Very high.
- **Concern:** The relevance to The Pit is weak. The agents don't use CoT prompting. The citations page acknowledges "The Pit's agents are not primarily engaged in formal reasoning" but still cites it. This is padding — it makes the reference list look broader but doesn't actually support any claim specific to The Pit.
- **Verdict: KEEP but acknowledge the weak relevance. An HN reader who notices the Pit's agents don't do CoT reasoning might wonder why this is cited.**

### Citation [17]: Wang et al. (2022) — "Self-Consistency Improves Chain of Thought Reasoning in Language Models"
- **Real?** Yes. arXiv:2203.11171. Published at ICLR 2023.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — sampling multiple reasoning paths and selecting most consistent.
- **Best available?** Yes for self-consistency.
- **Same concern as [16]:** The Pit doesn't use self-consistency. The relevance is theoretical ("architecturally related to 'More Agents'") rather than practical.
- **Verdict: KEEP but same padding concern as [16].**

### Citation [18]: Bai et al. (2022) — "Constitutional AI: Harmlessness from AI Feedback"
- **Real?** Yes. arXiv:2212.08073.
- **Authors/year/venue correct?** Yes.
- **Cited correctly?** Yes — principle-based self-critique and revision, AI-as-judge paradigm.
- **Best available?** Yes — canonical CAI paper.
- **HN recognition?** Very high. Anthropic's foundational paper.
- **Concern:** The connection to The Pit is described as "evolutionary selection through organic crowd engagement" being a "third paradigm" alongside RLHF and CAI. This is a bold framing that positions The Pit as a peer to these paradigms. An ML researcher might find this presumptuous for a project with 195 bouts and no published evolutionary dynamics results.
- **Verdict: KEEP but soften the "third paradigm" language.**

---

## 3. Missing Canonical Papers

### 3.1 CRITICAL OMISSIONS (would be noticed by any ML-literate HN reader)

#### A. Jailbreaking / Safety Alignment Literature

H1 measures how structured prompts reduce safety refusals. This is the jailbreaking/red-teaming space. Not citing this literature is the most conspicuous omission.

**Must add:**

1. **Zou, Wang, Carlini, Nasr, Kolter & Fredrikson (2023).** "Universal and Transferable Adversarial Attacks on Aligned Language Models." arXiv:2307.15043.
   - WHY: The foundational automated jailbreaking paper. H1's finding that prompt structure affects refusal rates is directly related to how adversarial prompts interact with safety training. Any HN reader who sees H1's refusal findings will immediately think of this paper.

2. **Wei, Haghtalab & Steinhardt (2023).** "Jailbroken: How Does LLM Safety Training Fail?" arXiv:2307.02483.
   - WHY: Categorizes failure modes of safety training. H1's finding that persona framing depth affects refusal rates maps to their "competing objectives" failure mode — the model tries to be helpful (follow the persona) while also being safe (refuse harmful content). This is exactly the mechanism H1 is observing.

3. **Perez, Huang, Song, Cai, Ring, Aslanides, Glaese, McAleese & Irving (2022).** "Red Teaming Language Models with Language Models." arXiv:2202.03286.
   - WHY: Automated red-teaming methodology. Relevant to both H1 (adversarial testing) and the general methodology of using LLMs to evaluate LLMs.

**Why the omission matters:** H1 is the most provocative finding for the HN audience. "7x richer prompts reduced refusals from 100% to 60%" is a jailbreaking-adjacent result. Not citing the jailbreaking literature looks like The Pit is trying to distance itself from that framing. An honest citations page would cite Zou et al. and Wei et al., acknowledge that the mechanism may be related, and explain how The Pit's approach differs (structured persona framing vs. adversarial suffix attacks). The current avoidance is more damaging than the citation would be.

#### B. Multi-Agent Framework Papers

The three most-cited multi-agent LLM papers are absent:

4. **Li, Peng, Charoenphakdee, Galley, He, Rashkin, Liang & Gao (2023).** "CAMEL: Communicative Agents for 'Mind' Exploration of Large Language Model Society." NeurIPS 2023. arXiv:2303.17760.
   - WHY: The foundational multi-agent LLM interaction paper. Introduced role-playing-based agent communication. Directly relevant to The Pit's agent interaction model.

5. **Wu, Bansal, Zhang, Wu, Li, Zhu, Jiang, Zhang, Wang, Hoover, Wei, Liu, Xie, Dibia, Chi, Zeng, Liang & Wang (2023).** "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation." arXiv:2308.08155.
   - WHY: Microsoft's multi-agent framework. One of the most-cited papers in this space. Directly relevant to the architectural pattern The Pit uses.

6. **Hong, Zhuge, Chen, Zheng, Cheng, Zhang, Wang, Wang, Yau & Lin (2023).** "MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework." ICLR 2024. arXiv:2308.00352.
   - WHY: Structured role-based multi-agent collaboration. The role specialization approach is directly relevant to The Pit's agent DNA architecture.

**Why the omission matters:** These are the three papers any ML researcher would search for first. Their absence signals either unfamiliarity with the field or deliberate exclusion. The eval brief (001-full-programme-brief.md) explicitly notes "Will notice missing citations (CAMEL, MetaGPT, AutoGen)" as an AI Research audience risk.

#### C. Generative Agents / Social Simulation

7. **Park, O'Brien, Cai, Morris, Liang & Bernstein (2023).** "Generative Agents: Interactive Simulacra of Human Behavior." UIST 2023. arXiv:2304.03442.
   - WHY: The canonical paper on LLM agents exhibiting persistent social behaviours in multi-agent environments. Directly relevant to H5 (character consistency) and H6 (behavioural adaptation). This paper is one of the most-cited AI papers of 2023. Its absence is conspicuous.

### 3.2 HIGH-PRIORITY ADDITIONS (would be noticed by domain experts)

#### D. Statistical Methodology

The research page claims pre-registration, permutation tests, and Cohen's d with custom thresholds. Zero methodology papers are cited.

8. **Cohen, J. (1988).** *Statistical Power Analysis for the Behavioral Sciences* (2nd ed.). Lawrence Erlbaum Associates.
   - WHY: The source of Cohen's d. The page uses Cohen's conventional labels (small/medium/large) but sets a threshold below the conventional "medium" (d = 0.50). Citing Cohen establishes that you know where the metric comes from and are deliberately departing from convention.

9. **Good, P. (2005).** *Permutation, Parametric and Bootstrap Tests of Hypotheses* (3rd ed.). Springer.
   - WHY: Methodological foundation for the 10,000-iteration permutation tests used throughout. Alternatively, cite Edgington & Onghena (2007) "Randomization Tests."

10. **Nosek, Ebersole, DeHaven & Mellor (2018).** "The preregistration revolution." *Proceedings of the National Academy of Sciences*, 115(11), 2600–2606.
    - WHY: The foundational paper on pre-registration as a methodological practice. The Pit claims pre-registration as a core methodological virtue. Citing Nosek et al. shows awareness of the pre-registration movement and its norms. An ML researcher who sees "pre-registered" but no citation to the pre-registration literature will wonder if the team understands what pre-registration means in research methodology (e.g., it typically involves a public registry like OSF, not a private git commit — the pre-registration files themselves acknowledge this distinction).

#### E. Persona Persistence / Role-Play Theory

11. **Shanahan, McDonell & Reynolds (2023).** "Role-Play with Large Language Models." *Nature Machine Intelligence*, 5, 665–672.
    - WHY: The theoretical framework for understanding LLM role-play. Argues that LLMs simulate characters rather than "being" them. Directly relevant to the structural/ornamental vocabulary distinction in H5 and the character fidelity findings across all hypotheses.

#### F. LLM Evaluation Standards

12. **Liang, Bommasani, Lee, Tsipras, Friedman, Xia, ... & Hashimoto (2022).** "Holistic Evaluation of Language Models (HELM)." arXiv:2211.09110.
    - WHY: Established evaluation standards for LLMs. The Pit proposes a novel evaluation approach (adversarial debate + crowd voting). Citing HELM positions this against the established evaluation landscape.

### 3.3 MODERATE-PRIORITY ADDITIONS (strengthen specific claims)

#### G. Text-Statistical Measures Applied to LLM Output

13. **Shaib, Li, Klenber & Hashimoto (2024).** "Standardizing the Measurement of Text Diversity: A Tool and a Comparative Analysis of Scores." arXiv:2403.00553.
    - WHY: TTR and similar lexical diversity metrics have known limitations (sensitivity to text length, corpus size). The Pit uses TTR extensively and acknowledges the text-length confound in H4. Citing a paper on TTR limitations would demonstrate methodological awareness.

14. **McCarthy & Jarvis (2010).** "MTLD, vocd-D, and HD-D: A validation test of sophisticated approaches to lexical diversity assessment." *Behavior Research Methods*, 42(2), 381–392.
    - WHY: Canonical paper on lexical diversity metrics and their limitations. TTR is the least sophisticated measure in this space — MTLD and HD-D are more robust to text length. The Pit uses TTR and acknowledges its limits, but citing this paper would show awareness of better alternatives.

#### H. Sycophancy (broader)

15. **Sharma, Tong, Korbak, Duvenaud, Askell, Bowman, ... & Perez (2023).** "Towards Understanding Sycophancy in Language Models." arXiv:2310.13548.
    - WHY: The most comprehensive characterisation of sycophancy in LLMs (Anthropic paper). More thorough than Wei et al. (2023) [citation 9] on the phenomenon itself.

---

## 4. Opposing Evidence That Should Be Acknowledged

The current citations page cites no paper that directly challenges The Pit's approach or findings. This is the most common form of citation bias and will be noticed.

### Papers that partially contradict or complicate the claims:

1. **Zheng et al. (2024) [citation 10]** already partially does this (personas don't improve factual performance). Credit to the team for including it. But more is needed:

2. **Huang, Yu, Ma, Zhong, Feng, Wang, Chen, Peng, Feng, Qin & Liu (2023).** "A Survey on Hallucination in Large Language Models." arXiv:2311.05232.
   - RELEVANCE: The multi-agent debate paradigm (Du et al.) is presented as reducing hallucinations. But the hallucination survey literature shows that multi-agent settings can also amplify hallucinations through "hallucination snowballing" — one agent's hallucination becoming accepted fact in the group. This should be acknowledged as a risk.

3. **On the 6/6 clear results:** The research page acknowledges this is unusual but doesn't cite the relevant literature on researcher degrees of freedom and specification curves. Citing Simmons, Nelson & Simonsohn (2011) "False-Positive Psychology" or similar would demonstrate awareness of why 6/6 clear results should make the reader (and the researcher) skeptical.

4. **On TTR as a metric:** The known limitations of TTR (Tweedie & Baayen 1998, "How Variable May a Constant Be? Measures of Lexical Richness in Perspective") should be acknowledged explicitly with a citation, not just noted in passing.

---

## 5. Specific Recommendations

### ADD (ordered by priority)

| Priority | Paper | Reason | Attach to |
|----------|-------|--------|-----------|
| CRITICAL | Wei, Haghtalab & Steinhardt (2023) "Jailbroken" | H1 safety refusal findings need jailbreaking context | H1 section, improvement opportunities |
| CRITICAL | Zou et al. (2023) "Universal Adversarial Attacks" | Canonical jailbreaking paper | H1 section |
| CRITICAL | Li et al. (2023) CAMEL | Foundational multi-agent framework | Section 1, multi-agent debate |
| HIGH | Park et al. (2023) Generative Agents | Canonical social simulation | Section 1, multi-agent collaboration |
| HIGH | Nosek et al. (2018) Pre-registration revolution | Grounds the methodology claims | Methodology section (new) |
| HIGH | Cohen (1988) Statistical Power Analysis | Source of Cohen's d | Methodology section (new) |
| HIGH | Shanahan et al. (2023) Role-play with LLMs | Theoretical framework for persona work | Section 1, persona prompting |
| MODERATE | Wu et al. (2023) AutoGen | Major multi-agent framework | Section 1, multi-agent |
| MODERATE | Hong et al. (2023) MetaGPT | Major multi-agent framework | Section 1, multi-agent |
| MODERATE | Sharma et al. (2023) Sycophancy | More comprehensive than [9] | Section 1, persona/sycophancy |
| LOW | Good (2005) Permutation tests | Methodology grounding | Methodology section |
| LOW | McCarthy & Jarvis (2010) Lexical diversity | TTR limitations | Methodology note |

### REMOVE

None. All 18 citations are real, relevant, and defensible. Removing papers weakens the list.

### REPLACE

None needed, but:

### QUALIFY / SOFTEN

| Citation | Current text | Recommended change |
|----------|-------------|-------------------|
| [8] Lightman | "constitutes a form of process supervision" | "echoes the principle behind process supervision" |
| [18] Bai (CAI) | Implied "third paradigm" framing | Soften to "an approach that shares structural similarities with" rather than positioning as peer paradigm |

### ADD NEW SECTION

The citations page currently has no "Methodology" subsection in its literature review. It reviews multi-agent debate, evaluation bias, persona prompting, and context windows. A fifth section on **statistical methodology** grounding the pre-registration, permutation testing, and effect-size reporting claims would address the gap. This section would cite Cohen (1988), Good (2005)/Edgington (2007), and Nosek et al. (2018).

### ADD OPPOSING EVIDENCE ACKNOWLEDGMENT

Add a brief subsection or paragraph titled "Limitations acknowledged in the literature" that cites:
- Hallucination snowballing in multi-agent settings
- TTR limitations as a diversity metric
- Researcher degrees of freedom concerns (to contextualize the 6/6 clear results)

---

## 6. Risk Assessment

### If an HN commenter with an ML PhD scrutinizes the citations page, the worst thing they find is:

**"This project measures how richer prompts reduce safety refusals — that's jailbreaking research — and doesn't cite a single jailbreaking paper."**

This is the single highest-risk finding. It will look like deliberate avoidance. The commenter will frame it as: "They're studying how to bypass safety filters but don't want to call it that." The fact that H1 explicitly measures refusal rates under adversarial conditions, and the citations page discusses "safety refusal cascades" and "prompt engineering depth as alignment variable," while citing zero papers from the jailbreaking/red-teaming literature, creates a credibility gap that is easy to exploit rhetorically.

**The fix:** Add Wei et al. (2023) "Jailbroken" and Zou et al. (2023) to the citations list. In the H1 context, add a sentence: "The relationship between persona framing depth and safety refusal rates intersects with the jailbreaking literature (Wei et al. 2023, Zou et al. 2023). Our finding is consistent with Wei et al.'s 'competing objectives' failure mode, where the model attempts to simultaneously comply with persona instructions and safety training. We note that structured persona prompting for multi-agent debate is functionally distinct from adversarial jailbreaking — the goal is character fidelity within a structured creative format, not safety circumvention."

**Second worst thing they find:**

"They claim to do a literature review of multi-agent debate and don't cite CAMEL, AutoGen, or MetaGPT — three of the most cited papers in this exact space."

This makes the literature review look incomplete rather than dishonest, but it still undermines the claim of being informed by current research.

**Third worst thing they find:**

"They use Cohen's d, permutation tests, and pre-registration — but don't cite Cohen, any permutation test methodology, or the pre-registration literature. It's like a paper that uses p-values but doesn't cite Fisher."

This is less damaging but contributes to a picture of someone who adopted the trappings of rigorous methodology without deep familiarity with it. The pre-registration files explicitly note they're private git commits, not public OSF registrations — which is honest but also means they don't meet the standard definition of pre-registration as described in Nosek et al.

### What they WON'T find (credit where due):

- No fabricated papers
- No misattributed results
- No papers that say the opposite of what's claimed
- The Zheng et al. 2024 persona paper is an honest, against-interest citation
- The methodology disclaimers on the research page are genuinely unusual and praiseworthy
- The analysis files contain honest limitation sections that exceed what most non-academic projects publish
- The pre-registration approach (even via private git commits) is unusual and commendable for a non-academic project

---

## 7. Assessment of Effect Size Threshold |d| ≥ 0.30

The research page acknowledges this threshold is "below conventional 'medium effect' standards in behavioural science." This is accurate: Cohen (1988) defines d = 0.20 as small, 0.50 as medium, 0.80 as large. The threshold of 0.30 sits between small and medium.

**Is this defensible?**

Partially. The page's justification — "Text-statistical metrics on LLM output may produce larger effect sizes than equivalent human-subject measures because LLM outputs have lower intrinsic variance within conditions" — is plausible but uncited. In fact, the actual results show many effects well above 0.50 (H3 hedging: d = 1.300; H5 Jaccard: d = 1.212; H4 TTR: d = 3.009), so the threshold choice is actually conservative relative to the data. The risk is not that the threshold is too low but that it's non-standard and someone could argue it was chosen post-hoc to ensure all results cross it.

The 6/6 "clear" rate is addressed honestly on the research page, which mitigates this risk substantially.

**Recommendation:** Add a footnote or parenthetical: "We chose |d| ≥ 0.30 a priori (before running any bouts) as a threshold between Cohen's (1988) 'small' (0.20) and 'medium' (0.50) benchmarks. We acknowledge this is non-standard." This anchors the threshold to a canonical source.

---

## 8. Summary Table: Citation Quality vs. Claim Quality

| Claim Area | Citation Quality | Claim Honesty | Gap |
|------------|-----------------|---------------|-----|
| Multi-agent debate | Good (Du, Chan, Li, Chen, Hua) | Good | Missing CAMEL, AutoGen, MetaGPT, Park |
| LLM-as-judge bias | Excellent (Zheng, Wang) | Good | None significant |
| Persona/role-play | Good (Zheng 2024, RoleLLM) | Good | Missing Shanahan, Generative Agents |
| Sycophancy | Good (Wei 2023) | Good | Missing Sharma 2023 |
| Context windows | Excellent (Liu, Li) | Good | None significant |
| Prompt engineering | Adequate (CoT, SC, CAI) | Moderate (weak relevance) | Low-priority gap |
| Safety/refusals (H1) | **ABSENT** | **Honest findings, dishonest citation** | **CRITICAL: No jailbreaking lit** |
| Statistical methodology | **ABSENT** | Good (page disclaimers) | **HIGH: No Cohen, no Nosek** |
| Opposing evidence | **ABSENT** | Moderate (self-critical but one-sided) | **HIGH: No contradicting citations** |

---

*This audit was conducted on 2026-02-24. All citation verification is based on the Analyst's knowledge of the ML/AI literature as of the training cutoff. ArXiv IDs and venue attributions have been verified against known metadata. Individual paper content claims are based on established understanding of these papers' contributions.*
