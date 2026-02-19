# Mine Research

End-to-end workflow: find a source, extract findings, generate ranked hypotheses, design agentic replication experiments, and append results to the internal research doc. Accepts a natural-language description of the source material or research direction.

## Usage

```
/mine-research "Project Sid — AI agents in Minecraft emergent civilization"
/mine-research "Replication Experiment A from docs/research-seed-hypotheses.md"
/mine-research "https://arxiv.org/abs/2411.00114 — focus on cultural transmission"
/mine-research "Dunbar's number — does it apply to LLM agent social graphs?"
/mine-research "RE-B: tribal mechanism (friendship changes minds)"
```

The argument `$ARGUMENTS` is the research target. It drives every phase. It can be:
- A paper title, URL, or arXiv ID
- A research question or phenomenon to investigate
- A replication experiment ID (RE-A through RE-E) referencing `docs/research-seed-hypotheses.md`
- A concept to mine for hypotheses

<principles>
  <principle>Interesting is as important as valid. Hypotheses are ranked by (viral potential x depth), not just academic rigor. A fascinating question that's methodologically rough beats a boring question with perfect controls.</principle>
  <principle>Never lead the hypothesis. When designing agentic replication experiments, the target behavior must emerge from architecture and social dynamics — never from prompts that describe the expected outcome. Agents must not know they are being studied.</principle>
  <principle>The divergence IS the finding. We are not trying to prove human cognitive biases transfer to LLM agents. We are trying to discover WHERE they transfer and where they don't. Both outcomes are publishable. Both are interesting.</principle>
  <principle>Extract from evidence, not from vibes. Every hypothesis must trace to a specific finding with a specific experimental setup. No armchair theorizing without grounding.</principle>
  <principle>Append, don't overwrite. The research doc is cumulative. New hypotheses and experiments are added to the existing doc, never replacing prior work. Use sequential numbering that continues from the highest existing ID.</principle>
  <principle>Cite everything. Every hypothesis links to its source. Every source includes: authors, year, title, URL/DOI, and the specific section where the finding lives.</principle>
  <principle>Guardrails against leading are non-negotiable. Every replication experiment must include: (1) beliefs embedded as incidental traits, (2) evidence from environment not instruction, (3) no mention of "belief change" or "persuasion" in agent prompts, (4) behavioral + conversational measures, (5) matched controls.</principle>
</principles>

<process>
  <phase name="Parse Intent" number="1">
    <description>
      Determine what $ARGUMENTS is asking for:
      - MODE A: "Source Mining" — a paper/article/concept to extract hypotheses from
      - MODE B: "Replication Design" — a replication experiment to spec out (RE-A through RE-E or new)
      - MODE C: "Both" — mine a source AND design replication experiments from findings

      Also determine the current state of the research doc.
    </description>

    <steps>
      <step>Read `docs/research-seed-hypotheses.md` to understand existing hypotheses, their IDs, and the current state of the research dataset.</step>
      <step>Parse $ARGUMENTS to determine mode (A, B, C) and the specific target.</step>
      <step>If $ARGUMENTS references an RE-ID (e.g., "RE-A"), locate the corresponding experiment spec in the research doc.</step>
      <step>If $ARGUMENTS is a URL, fetch it. If it's a paper title, search for it. If it's a concept, find the best primary sources.</step>
      <step>Identify the highest existing hypothesis ID (H-number) and experiment ID (RE-letter) so new entries continue the sequence.</step>
    </steps>
  </phase>

  <phase name="Source Acquisition" number="2">
    <description>
      Acquire and deeply read the source material. This phase is skipped if MODE is B (pure replication design) and the source is already in the research doc.
    </description>

    <steps>
      <step>For URLs: fetch the full content. For arXiv papers: fetch the HTML version (arxiv.org/html/XXXX.XXXXXvN) for full text.</step>
      <step>For concepts without a specific source: search for the 2-3 most relevant primary sources (prefer peer-reviewed papers, then books, then high-quality synthesis articles like New Yorker longform or gwern.net).</step>
      <step>Read the FULL source. Do not skim. Use the Task tool with explore agent for long documents. Extract every specific finding, every experimental setup, every quantitative result, every surprising observation.</step>
      <step>Pay special attention to:
        - Emergent behaviors nobody expected
        - Quantitative thresholds and tipping points
        - Control experiments and ablation studies
        - Limitations the authors acknowledge
        - Methodological gaps that could be exploited
      </step>
    </steps>

    <critical>
      Do not summarize the source. Extract raw findings. The synthesis comes later. At this stage you are a miner, not an editor.
    </critical>
  </phase>

  <phase name="Hypothesis Generation" number="3">
    <description>
      Generate ranked hypotheses from the extracted findings. Each hypothesis follows the established format from the research doc.
    </description>

    <steps>
      <step>For each notable finding, generate a hypothesis in this format:
        ```
        #### H[N]. [Catchy Title]
        
        **Finding:** [specific observed behavior with experimental context]
        
        **Hypothesis:** [the testable claim]
        
        **Research question:** [the question this puts into the dataset]
        
        **Why it's viral:** [1-2 sentences on why this is interesting/shareable]
        ```
      </step>
      <step>Tier the hypotheses:
        - Tier 1: Maximum viral potential (counterintuitive, maps to real-world anxiety, immediately quotable)
        - Tier 2: High signal for research community (novel, connects disparate fields, generates follow-up questions)
        - Tier 3: Methodological / meta questions (interesting for AI researchers, may not have mass appeal)
      </step>
      <step>For each Tier 1 hypothesis, also generate a "one-liner" — the tweet-length version that would make someone click through.</step>
      <step>Cross-reference against existing hypotheses in the research doc. Do not duplicate. If a new finding strengthens or contradicts an existing hypothesis, note the connection.</step>
    </steps>

    <quality-bar>
      Ask for each hypothesis: "Would I stop scrolling if I saw this as a headline?" If no, demote to Tier 2 or cut.
    </quality-bar>
  </phase>

  <phase name="Replication Experiment Design" number="4">
    <description>
      Design agentic replication experiments that test the hypotheses WITHOUT leading agents into the expected behavior. This is the hardest and most important phase.
    </description>

    <steps>
      <step>For each hypothesis (or the specific RE referenced in $ARGUMENTS), design an experiment with:
        ```
        #### Experiment RE-[X]: [Title]
        
        **Tests:** H[N] — [hypothesis title]
        
        **Setup:**
        - Agent count and environment
        - How beliefs/traits are embedded (incidental, never focal)
        - What intervention is introduced and how
        - Timeline and phases
        
        **Measures:**
        - Behavioral (actions taken, items crafted, locations visited)
        - Conversational (stated beliefs, keyword frequency, sentiment)
        - Social graph (who talks to whom, bond strength, influence topology)
        
        **Controls:**
        - [matched control description]
        
        **Anti-leading guardrails:**
        - [specific measures to prevent prompting the expected outcome]
        
        **What "success" looks like:**
        - [what result confirms the hypothesis]
        - [what result refutes it]
        - [what result would be the most interesting surprise]
        ```
      </step>
      <step>For each experiment, explicitly state what the OPPOSITE result would mean and why that would also be interesting/publishable.</step>
      <step>Identify confounds: what else could explain the result besides the hypothesis? Design controls for each confound.</step>
      <step>If the experiment requires infrastructure that doesn't exist (e.g., a Minecraft server with 500 agents), note this as a dependency and propose a minimal viable version that could run with existing tools.</step>
    </steps>

    <anti-leading-checklist>
      Before finalizing any experiment, verify ALL of the following:
      [ ] No agent prompt mentions "belief change," "persuasion," "influence," or "opinion"
      [ ] Target beliefs are embedded as personality traits, not as the focus of the simulation
      [ ] Contradictory evidence comes from the environment, not from instructions
      [ ] No agent is told it is being studied or observed
      [ ] The simulation has a plausible cover story (survival, building, exploration) that is the stated purpose
      [ ] Behavioral measures exist alongside conversational measures
      [ ] A matched control exists where the intervention is absent
      [ ] The hypothesis is pre-registered (written down before the experiment runs)
    </anti-leading-checklist>
  </phase>

  <phase name="Research Question Ranking" number="5">
    <description>
      Rank all new research questions for inclusion in the dataset.
    </description>

    <steps>
      <step>Add all new questions to the ranked table in Part 4 of the research doc.</step>
      <step>Score each on three axes (1-5 each):
        - **Interesting:** Would a non-researcher share this? Does it provoke dinner-table conversation?
        - **Valid:** Is this testable? Could it survive peer review? Does the methodology hold up?
        - **Viral:** Does this map to existing cultural anxiety, curiosity, or wonder? Is the one-liner compelling?
      </step>
      <step>Composite score = Interesting x Valid x Viral (max 125). Rank by composite.</step>
      <step>For the top 5 new questions, write the "tweet version" — the formulation that maximizes shareability.</step>
    </steps>
  </phase>

  <phase name="Append to Research Doc" number="6">
    <description>
      Append all new hypotheses, experiments, and ranked questions to `docs/research-seed-hypotheses.md`. Never overwrite existing content.
    </description>

    <steps>
      <step>Read the current state of `docs/research-seed-hypotheses.md`.</step>
      <step>Determine where new content should be inserted:
        - New hypotheses: after the last hypothesis in the appropriate tier, or in a new section if the source is different
        - New experiments: after the last experiment in Part 3
        - New ranked questions: appended to the table in Part 4
        - New citations: appended to the Appendix
      </step>
      <step>Insert content with clear section headers indicating the source and date:
        ```
        ---
        
        ## Part [N]: [Source Title] — [Date Added]
        
        **Source:** [full citation]
        **Mined by:** /mine-research "$ARGUMENTS"
        ```
      </step>
      <step>Verify the doc is still gitignored: `git check-ignore docs/research-seed-hypotheses.md`</step>
    </steps>
  </phase>

  <phase name="Summary Report" number="7">
    <description>Output a summary of what was mined and what was added.</description>
    <output-format>
```
======================================================================
  MINE-RESEARCH COMPLETE
  Target: $ARGUMENTS
  Mode: [A: Source Mining | B: Replication Design | C: Both]
  Date: <today>
======================================================================

SOURCE
------
  [title, authors, year, URL]

NEW HYPOTHESES
--------------
  [H-ID] [Title] — Tier [N]  [one-liner]
  ...

NEW EXPERIMENTS
---------------
  [RE-ID] [Title] — Tests [H-IDs]
  ...

NEW RESEARCH QUESTIONS (ranked)
-------------------------------
  # | Question | Score (IxVxV) | Tweet Version
  ...

CONNECTIONS TO EXISTING WORK
-----------------------------
  [which existing hypotheses were strengthened, contradicted, or extended]

DEPENDENCIES / NEXT STEPS
--------------------------
  [what infrastructure or follow-up is needed to run the experiments]

APPENDED TO
------------
  docs/research-seed-hypotheses.md — [N new sections, M new hypotheses, K new experiments]

======================================================================
```
    </output-format>
  </phase>
</process>

<constraints>
  <constraint>Never overwrite existing content in the research doc — always append</constraint>
  <constraint>Never lead agent experiments — the anti-leading checklist must pass for every experiment</constraint>
  <constraint>Never fabricate findings — every hypothesis must trace to a specific cited source</constraint>
  <constraint>Never publish the research doc — it must remain gitignored at all times</constraint>
  <constraint>Never duplicate hypotheses — cross-reference existing H-IDs before adding new ones</constraint>
  <constraint>Hypothesis IDs are globally sequential (H1, H2, ...) and never reused</constraint>
  <constraint>Experiment IDs follow the RE-[letter] convention and never reuse letters</constraint>
  <constraint>Every source gets a full citation in the Appendix</constraint>
  <constraint>Tier 1 hypotheses must have a one-liner that passes the "would I stop scrolling?" test</constraint>
  <constraint>Interesting is as important as valid — do not filter for academic conservatism</constraint>
</constraints>

<edge-cases>
  <case trigger="Source is paywalled">Try the arXiv preprint, Sci-Hub URL, or author's personal site. If unavailable, mine from the abstract + any available reviews, commentary, or blog posts that cite specific findings. Note the partial-access limitation.</case>
  <case trigger="$ARGUMENTS is a concept, not a specific source">Search for the 2-3 most cited/relevant primary sources. Mine all of them. Cross-reference findings across sources for stronger hypotheses.</case>
  <case trigger="Source has already been mined">Check if the research doc already has a section for this source. If yes, look for findings that were missed in the first pass. If nothing new, report that and suggest adjacent sources.</case>
  <case trigger="Replication experiment requires infrastructure we don't have">Design the experiment anyway. Note dependencies. Propose a minimal viable version (fewer agents, simpler environment, text-only instead of Minecraft) that could test the core hypothesis with existing tools.</case>
  <case trigger="New finding contradicts an existing hypothesis">This is good. Note the contradiction explicitly. Do not delete the old hypothesis — annotate it with the conflicting evidence and let the tension generate new questions.</case>
  <case trigger="$ARGUMENTS references an RE-ID that doesn't exist">Treat this as a request to design a new experiment. Ask the user what hypothesis it should test, or infer from context.</case>
  <case trigger="The research doc doesn't exist yet">Create it with the standard header and Part structure. Ensure it's gitignored.</case>
</edge-cases>
