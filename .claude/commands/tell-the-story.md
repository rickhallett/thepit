# Tell The Story

End-to-end workflow: ingest research findings, run evaluation prompts for adversarial scrutiny, generate audience-calibrated narratives, prepare the response arsenal, and produce ready-to-publish output. The engine behind the Analyst agent's prompt apparatus.

## Usage

```
/tell-the-story "full" — Run all phases: evaluate, narrate, prepare responses, produce monologues
/tell-the-story "evaluate" — Run evaluation prompts only (third-party scrutiny)
/tell-the-story "narrate HN" — Generate HN-specific narrative only
/tell-the-story "narrate X" — Generate Twitter/X thread only
/tell-the-story "narrate research" — Generate AI research community blog post only
/tell-the-story "narrate viral" — Generate general audience blog post only
/tell-the-story "narrate web3" — Generate crypto/web3 post only
/tell-the-story "narrate all" — Generate all 5 audience variants
/tell-the-story "respond" — Generate the full response arsenal
/tell-the-story "monologues" — Generate 60s, 5min, 20min prepared narratives
/tell-the-story "blog discovery" — Generate the discovery narrative blog post
/tell-the-story "blog response to [critique/praise/misinterpretation/deep-dive]" — Generate a response piece
/tell-the-story "pre-mortem" — Run the 48-hour failure simulation
/tell-the-story "steelman" — Run the steelman/opposition pair
/tell-the-story "spine" — Extract the narrative spine only
```

The argument `$ARGUMENTS` determines scope. It can be a single phase, a specific audience, or "full" for the entire pipeline.

<principles>
  <principle>Truth is the constraint, not the obstacle. Every sentence in every output must be factually accurate. Selection is permitted. Invention is not. The difference between a finding and a story is shape, not honesty.</principle>
  <principle>The specific is universal. Lead with "zero adaptive phrases in 45 Founder turns" not "AI agents can't adapt." Let the reader generalise. They will.</principle>
  <principle>Vulnerability is credibility. Every output must acknowledge at least one genuine limitation. Single model family, non-academic, no peer review — these are disclosed upfront, not buried.</principle>
  <principle>Earn every claim. Strong language ("first-order variable", "fundamental gap") appears only after the evidence that supports it. If the preceding context doesn't earn the claim, soften the language — never inflate the context.</principle>
  <principle>The reader is the hero. The audience should feel intelligent for understanding, not impressed by your intelligence for explaining. Build the path. Don't push.</principle>
  <principle>Every audience deserves a tailored truth. The same facts, told differently. Not by changing the facts, but by changing the entry point, the emphasis, the assumed knowledge, and the register. This is not manipulation — this is communication.</principle>
  <principle>Never argue. Always extend. Responses to criticism validate, add information, and move the conversation forward. The person who teaches wins the audience. The person who defends loses the thread.</principle>
  <principle>End with the open question. Every monologue, every blog post, every thread ends with what you don't know — not what you do. The open question is what makes someone come find you after the talk.</principle>
</principles>

<process>
  <phase name="Ingest" number="1">
    <description>
      Load all source material that feeds the narrative and evaluation apparatus. This is the factual foundation — nothing in any output can exceed what is established here.
    </description>

    <steps>
      <step>Read the research programme findings: `pitstorm/results/hypotheses/H1-analysis.md` through `H6-analysis.md`</step>
      <step>Read the pre-registrations: `pitstorm/results/hypotheses/H2-preregistration.md` through `H6-preregistration.md`</step>
      <step>Read the live research page: `app/research/page.tsx` — extract all hardcoded findings, stats, and claims</step>
      <step>Read the literature review: `docs/research-citations.md` — extract all cited papers, novelty claims, and alignment claims</step>
      <step>Read the press strategy: `docs/press-release-strategy.md` and `docs/criticism-playbook.md`</step>
      <step>Read the landing copy: `docs/landing-v3-final.md`</step>
      <step>Read the social playbook: `docs/social-content-playbook.md`</step>
      <step>Read the audience models: `docs/audience-models/demographic-lenses-v1.md`</step>
      <step>Read the evaluation brief: `docs/eval-briefs/001-full-programme-brief.md`</step>
      <step>
        Compile a verified fact sheet from all sources. Every fact must have a source file.
        Format:
        ```
        FACT: [statement]
        SOURCE: [file path, line number or section]
        CONFIDENCE: [verified/inferred/claimed]
        ```
        Only facts marked "verified" may appear in final outputs without qualification.
        Facts marked "claimed" must include caveats in any output.
      </step>
    </steps>

    <critical>
      Do not proceed to any generation phase until the fact sheet is compiled. The fact sheet is the source of truth for all subsequent phases. If a finding is not on the fact sheet, it does not exist for narrative purposes.
    </critical>
  </phase>

  <phase name="Parse Intent" number="2">
    <description>
      Determine what $ARGUMENTS is asking for and route to the appropriate generation phases.
    </description>

    <steps>
      <step>
        Parse $ARGUMENTS into one or more targets:
        - "full" → Phases 3, 4, 5, 6, 7, 8 (all phases)
        - "evaluate" → Phase 3 only
        - "narrate [audience]" → Phase 4 for specific audience(s)
        - "narrate all" → Phase 4 for all 5 audiences
        - "respond" → Phase 5 only
        - "monologues" → Phase 6 only
        - "blog [format]" → Phase 7 for specific format
        - "pre-mortem" → Phase 3 (pre-mortem variant only)
        - "steelman" → Phase 3 (steelman pair only)
        - "spine" → Phase 4 (spine extraction only)
      </step>
      <step>
        If $ARGUMENTS names a specific audience or format, load ONLY the relevant prompt template from `docs/narrative-prompts/` or `docs/eval-prompts/`. Do not run all prompts.
      </step>
      <step>
        If $ARGUMENTS is "full", determine optimal execution order:
        1. Spine extraction first (informs all other narratives)
        2. Evaluation prompts in parallel (independent of narratives)
        3. Audience variants in parallel (independent of each other)
        4. Response arsenal (depends on audience variants for context)
        5. Monologues (depends on spine)
        6. Blog drafts (depends on spine + audience calibration)
      </step>
    </steps>
  </phase>

  <phase name="Evaluate" number="3">
    <description>
      Run evaluation prompts against the research material. This phase produces structured assessments, not narratives. The outputs inform revision of narratives in later phases.
    </description>

    <steps>
      <step>
        Load the evaluation prompt template from `docs/eval-prompts/`.
        Which template depends on $ARGUMENTS:
        - "evaluate" → `001-research-programme.xml`
        - "pre-mortem" → `004-pre-mortem.xml`
        - "steelman" → `005-steelman-pair.xml`
        - "full" → all five evaluation prompts
      </step>
      <step>
        Inject the fact sheet into the `<full-text>` section of the prompt template. Do NOT summarise — include the full findings with source references.
      </step>
      <step>
        Execute the evaluation prompt. Use the Task tool with `general` agent type to run evaluations in parallel if multiple prompts are needed.
      </step>
      <step>
        Parse the evaluation output. Extract:
        - Per-dimension scores (1-5)
        - Strongest criticism per dimension
        - Per-lens demographic predictions
        - Overall composite score and go/no-go recommendation
        - Revision priorities
      </step>
      <step>
        If composite score &lt; 3.0 on any evaluation: STOP. Report the evaluation results and recommend revisions before proceeding to narrative generation. Do not generate narratives for material that fails evaluation.
      </step>
      <step>
        If composite score &gt;= 3.0: compile a revision checklist from the evaluation output. This checklist is injected into narrative generation phases to ensure known weaknesses are addressed proactively.
      </step>
    </steps>

    <output-format>
      ```
      === EVALUATION RESULTS ===
      Prompt: [evaluation ID]
      
      VALIDITY:    [score]/5 — [1-sentence justification]
      COHERENCE:   [score]/5 — [1-sentence justification]
      CHOICE:      [score]/5 — [1-sentence justification]
      FRAMING:     [score]/5 — [1-sentence justification]
      COMPOSITE:   [average]/5
      
      DEMOGRAPHIC PREDICTIONS:
        HN:       [reaction] ([confidence])
        X:        [reaction] ([confidence])
        Research: [reaction] ([confidence])
        Viral:    [reaction] ([confidence])
        Web3:     [reaction] ([confidence])
      
      GO/NO-GO: [Publish|Revise|Kill]
      
      REVISION CHECKLIST:
      [ ] [specific revision 1]
      [ ] [specific revision 2]
      ...
      ```
    </output-format>
  </phase>

  <phase name="Narrate" number="4">
    <description>
      Generate audience-calibrated narratives. Each variant tells the same truth through a different lens.
    </description>

    <steps>
      <step>
        Extract the narrative spine first. Load `docs/narrative-prompts/001-story-engine.xml`. Inject the fact sheet. Execute the story engine prompt. The spine output drives all subsequent narratives.
        
        If $ARGUMENTS is "spine", stop here and report the spine.
      </step>
      <step>
        Determine target audience(s) from $ARGUMENTS:
        - "narrate HN" → Hacker News variant only
        - "narrate X" → Twitter/X variant only
        - "narrate research" → AI research community variant only
        - "narrate viral" → General audience variant only
        - "narrate web3" → Crypto/web3 variant only
        - "narrate all" or "full" → All 5 variants
      </step>
      <step>
        Load `docs/narrative-prompts/002-audience-variants.xml`. For each target audience, inject:
        1. The narrative spine (from step 1)
        2. The fact sheet (from Phase 1)
        3. The revision checklist (from Phase 3, if available)
        4. The audience model for this specific lens (from `docs/audience-models/demographic-lenses-v1.md`)
      </step>
      <step>
        Execute the audience variant prompt. Use the Task tool with `general` agent type. If generating multiple variants, run them in PARALLEL — they are independent of each other.
      </step>
      <step>
        For each generated variant, verify against the fact sheet:
        - Every claim must trace to a verified fact
        - Every number must match the source exactly
        - Every limitation mentioned in the revision checklist must be addressed
        - No sentence should introduce information not on the fact sheet
      </step>
      <step>
        If verification fails for any variant, regenerate with explicit correction instructions.
      </step>
    </steps>

    <output-format>
      Each variant is delivered as a complete, ready-to-post piece:
      
      ```
      === [AUDIENCE] VARIANT ===
      Format: [post type]
      Word count: [N]
      Fact-check: [PASS/FAIL — list any issues]
      
      ---
      [The actual post/thread/article, ready to copy-paste]
      ---
      
      HOLD-BACK MATERIAL (save for follow-ups):
      - [fact not included and why]
      ...
      ```
    </output-format>
  </phase>

  <phase name="Prepare Responses" number="5">
    <description>
      Generate the complete response arsenal — prepared replies to predicted positive and negative reception.
    </description>

    <steps>
      <step>Load `docs/narrative-prompts/003-response-arsenal.xml`. Inject the fact sheet, the narrative spine, and the revision checklist.</step>
      <step>
        Execute the response arsenal prompt. For each scenario in the template (7 negative, 4 positive, 2 unexpected = 13 scenarios total), generate a complete, ready-to-post response.
      </step>
      <step>
        Additionally, generate 3 responses NOT in the template — predicted scenarios based on the demographic lens analysis:
        - The most likely HN top-comment critique (from the pre-mortem or evaluation output)
        - The most likely quote-tweet reframe on X
        - The most likely misinterpretation from the viral/general audience
      </step>
      <step>
        Verify every response against the fact sheet. No response may introduce claims not supported by verified facts.
      </step>
      <step>
        Format all responses as a quick-reference document organised by sentiment category, with the trigger phrase bolded for fast lookup during live engagement.
      </step>
    </steps>

    <output-format>
      ```
      === RESPONSE ARSENAL ===
      Generated: [timestamp]
      Scenarios covered: [N]
      
      ## NEGATIVE RECEPTION
      
      ### "Just a wrapper / toy"
      > [ready-to-post response, 3-4 sentences]
      
      ### "n=15 is tiny"
      > [ready-to-post response, 4-5 sentences]
      
      ...
      
      ## POSITIVE RECEPTION
      
      ### "How can I contribute?"
      > [ready-to-post response, 3-4 sentences]
      
      ...
      
      ## UNEXPECTED
      
      ### [predicted scenario from demographic analysis]
      > [ready-to-post response]
      
      ...
      ```
    </output-format>
  </phase>

  <phase name="Monologues" number="6">
    <description>
      Generate the three prepared monologues: 60 seconds, 5 minutes, 20 minutes.
    </description>

    <steps>
      <step>Load `docs/narrative-prompts/004-monologues.xml`. Inject the narrative spine and fact sheet.</step>
      <step>Generate all three monologues. They can run in PARALLEL — each is a self-contained generation task.</step>
      <step>
        For each monologue, verify:
        - 60s version is speakable in 60 seconds (~150 words)
        - 5min version is speakable in 5 minutes (~750 words)
        - 20min version is speakable in 20 minutes (~3,000 words)
        - All facts trace to the fact sheet
        - Each contains at least one genuine limitation acknowledgment
        - Each ends with an open question, not a conclusion
      </step>
      <step>
        Add timing annotations to the 5-minute and 20-minute versions:
        ```
        [0:00 - 1:30] Opening: The question
        [1:30 - 3:00] The setup...
        ```
      </step>
    </steps>

    <output-format>
      ```
      === MONOLOGUES ===
      
      ## 60-SECOND VERSION
      Context: elevator, podcast intro, conference hallway
      Word count: [N]
      
      [The monologue text]
      
      ---
      
      ## 5-MINUTE VERSION
      Context: lightning talk, podcast segment, interview answer
      Word count: [N]
      
      [0:00 - 1:30] ...
      [The monologue text with timing marks]
      
      ---
      
      ## 20-MINUTE VERSION
      Context: conference talk, guest lecture, long podcast
      Word count: [N]
      
      [0:00 - 2:00] Opening
      [The monologue text with timing marks and transition notes]
      ```
    </output-format>
  </phase>

  <phase name="Blog Drafts" number="7">
    <description>
      Generate complete blog post drafts in the requested format.
    </description>

    <steps>
      <step>
        Load `docs/narrative-prompts/005-blog-generator.xml`. Inject:
        - The narrative spine
        - The fact sheet
        - The revision checklist
        - The relevant audience model (general audience for discovery narrative, specific audience for response pieces)
      </step>
      <step>
        Determine format from $ARGUMENTS:
        - "blog discovery" → Discovery narrative format (1500-2000 words)
        - "blog response to [trigger]" → Response piece format, matched to trigger variant
        - "blog lessons" → Lessons piece format (1200-1500 words)
        - "full" → Discovery narrative + lessons piece
      </step>
      <step>
        Generate the blog draft(s). For each, produce:
        1. The complete draft
        2. Three title options ranked by clarity
        3. The single best opening sentence
        4. The single best closing sentence
        5. Hold-back material list
      </step>
      <step>
        Fact-check the draft against the fact sheet. Flag any sentence that is not directly supported.
      </step>
    </steps>

    <output-format>
      ```
      === BLOG DRAFT: [FORMAT] ===
      Word count: [N]
      Fact-check: [PASS/FAIL]
      
      TITLES (ranked by clarity):
      1. [title]
      2. [title]
      3. [title]
      
      BEST OPENING: "[sentence]"
      BEST CLOSING: "[sentence]"
      
      ---
      [The complete blog draft]
      ---
      
      HOLD-BACK MATERIAL:
      - [fact] — save for [context]
      ...
      ```
    </output-format>
  </phase>

  <phase name="Summary Report" number="8">
    <description>Output a complete summary of everything generated in this run.</description>
    <output-format>
```
======================================================================
  TELL-THE-STORY COMPLETE
  Scope: $ARGUMENTS
  Date: <today>
======================================================================

FACT SHEET
----------
  [N] verified facts compiled from [M] source files

EVALUATION (if run)
-------------------
  Composite score: [N]/5
  Go/no-go: [recommendation]
  Revision items: [N]

NARRATIVES GENERATED
--------------------
  Spine: [yes/no]
  Audience variants: [list of audiences]
  Response arsenal: [N] scenarios covered
  Monologues: [list of durations]
  Blog drafts: [list of formats]

OUTPUT FILES
------------
  [List of all generated files with paths]

QUALITY CHECKS
--------------
  Fact-check: [N] outputs checked, [N] passed, [N] flagged
  Word count compliance: [pass/fail per output]
  Limitation disclosure: [present/absent per output]

HOLD-BACK INVENTORY
--------------------
  [N] facts held back across all outputs
  Available for: follow-up blog posts, deeper dives, response pieces

======================================================================
```
    </output-format>
  </phase>
</process>

<constraints>
  <constraint>Never generate narrative output for material that scores below 3.0 on evaluation. Revise first.</constraint>
  <constraint>Never include a fact in output that is not on the compiled fact sheet.</constraint>
  <constraint>Never use "novel contribution", "first-order variable", or "fundamental gap" without the evidence that earns it appearing BEFORE the phrase in the text.</constraint>
  <constraint>Never claim EAS attestation is live unless it has been verified as live in production.</constraint>
  <constraint>Never claim findings generalise beyond Claude without explicit qualification.</constraint>
  <constraint>Every output must acknowledge at least one genuine limitation.</constraint>
  <constraint>Every output must end with an open question or invitation, not a conclusion.</constraint>
  <constraint>Response arsenal entries must be 3-5 sentences maximum. Brevity is a feature of live engagement.</constraint>
  <constraint>Monologues must be speakable at conversational pace. Count words, not paragraphs.</constraint>
  <constraint>Blog drafts must work without subheadings where possible — transitions should carry the reader.</constraint>
  <constraint>When running "full", use the Task tool to parallelise independent phases. Narratives for different audiences are independent. Evaluation prompts are independent. Do not serialise what can be parallelised.</constraint>
  <constraint>All outputs go to stdout for immediate use. Do NOT write files unless the user explicitly requests it.</constraint>
</constraints>

<edge-cases>
  <case trigger="$ARGUMENTS is empty or unrecognised">Default to "spine" — extract the narrative spine only. Confirm with the user before running a full pipeline.</case>
  <case trigger="Evaluation scores below 3.0">STOP. Report evaluation results. List specific revision recommendations. Ask the user whether to proceed with narrative generation despite the low score, or to revise the source material first.</case>
  <case trigger="Fact sheet finds contradictions between sources">Report the contradictions explicitly. Do not resolve them silently. Present both versions and ask the user which is current.</case>
  <case trigger="$ARGUMENTS targets an audience not in the 5 defined lenses">Derive a lens model from the audience description using the structure in `docs/audience-models/demographic-lenses-v1.md` as a template. Confirm the derived model with the user before generating.</case>
  <case trigger="User requests a response piece but no specific trigger">Generate responses for the top 3 most likely scenarios from the pre-mortem analysis (EVAL-004) or the demographic risk assessment in the evaluation brief.</case>
  <case trigger="Research findings have been updated since last run">Re-run Phase 1 (Ingest) to rebuild the fact sheet. Flag any facts that have changed since the previous run. Regenerate only the outputs affected by changed facts.</case>
  <case trigger="$ARGUMENTS says 'blog response to' but doesn't specify the trigger">List the 4 available response-piece triggers (methodological critique, positive coverage, misinterpretation, deeper dive request) and ask the user to pick one — or offer to generate all 4.</case>
  <case trigger="User provides new material not in the standard source files">Accept it as additional source material. Add it to the fact sheet with source marked as "user-provided, [date]". Treat user-provided facts as "verified" unless they contradict existing verified facts.</case>
</edge-cases>
