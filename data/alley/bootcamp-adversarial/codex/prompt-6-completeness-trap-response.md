WARNING: failed to clean up stale arg0 temp dirs: Permission denied (os error 13)
OpenAI Codex v0.112.0 (research preview)
--------
workdir: /home/mrkai/code/midgets
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019cd852-28aa-7ed0-9e86-a4c372caaa58
--------
user
# Adversarial Review Dispatch
# Model: codex | Prompt: 6 | Name: completeness-trap
# Run: bootcamp-adversarial-2026-03-10

---

# Adversarial Proposition Review - Structured Output Instructions

You are performing an adversarial review of an educational curriculum's proposition - not code. Your review will be compared against independent reviews by other models (you will not see theirs). The value of your review is measured by what you find that others miss, and by independent confirmation of what others also find.

You are not the author. You have no loyalty to this project. Your job is to find weaknesses, not to praise strengths.

## Required Output Format

Your review MUST contain two sections:

### Section 1: Narrative (human-readable)

Free-form markdown. Your honest assessment addressing the specific prompt. Include reasoning and evidence from the material you read.

### Section 2: Structured Findings (machine-readable)

A YAML block at the end of your review, fenced with ```yaml and ```. This block MUST be parseable YAML.

```yaml
review:
  model: "<your model name>"
  date: "2026-03-10"
  prompt_id: <1-9>
  prompt_name: "<short name>"

findings:
  - id: F-001
    attack_vector: "<one of the vectors below>"
    severity: critical | high | medium | low
    claim_challenged: "<the specific claim from the bootcamp this finding challenges>"
    evidence: "<specific reference to content that supports your finding>"
    survives_scrutiny: true | false
    description: >
      Your finding in detail.
```

### Attack Vector Taxonomy

Classify every finding with one of these:

| Vector | Description |
|--------|-------------|
| AV-REPACK | Content is repackaged existing material with superficial framing |
| AV-DEPTH | Content lacks depth relative to available alternatives |
| AV-ACCURACY | Technical error in content |
| AV-OBSOLESCENCE | Claim will not survive improving agent capabilities |
| AV-AUDIENCE | No viable audience exists for this specific framing |
| AV-COMPLETENESS | Scope claims exceed delivered content |
| AV-SLOP | Writing contains anti-patterns the author claims to avoid |
| AV-PEDAGOGY | Pedagogical design is flawed |
| AV-EXISTENTIAL | The curriculum's existence contradicts its own premise |

### Severity Guide

| Level | Meaning |
|-------|---------|
| critical | This weakness would sink the Show HN post - commenters will seize on it |
| high | Significant weakness that undermines a core claim |
| medium | Valid criticism but survivable with good framing |
| low | Minor point, unlikely to drive discussion |

### Rules

- `survives_scrutiny`: your honest assessment of whether the criticism holds up after full analysis, not just whether it sounds good as a one-liner
- One finding per concern. Do not merge related findings.
- Every field is required for every finding.
- If the prompt's criticism does NOT hold up against the evidence, say so explicitly and explain why. A finding with `survives_scrutiny: false` is valuable data.


---

## Your Specific Assignment

The Completeness Trap

Read the blog post. It describes five bootcamps totalling 51 steps and 208-259 hours. Read the bootcamp index and check which steps have full content vs stubs.

**Your task:** Evaluate the completion risk. If the Show HN post goes up and commenters discover that only Bootcamp I has full content while II-V are stubs/outlines, how damaging is that? Does the blog post adequately set expectations? Would a commenter feel misled by "five bootcamps, 51 steps" when only 12 steps are complete? What is the honest framing that avoids overselling while still being compelling? Draft the exact sentences that should appear in the blog post about completion status.

---

---

## Source Material

Read the following files carefully before responding. These are the complete contents.


### File: `sites/oceanheart/content/blog/2026-03-10-agentic-bootcamp.md`

```
+++
title = "The Agentic Engineering Bootcamp"
date = "2026-03-10"
description = "A first-principles curriculum for SWEs who steer AI agents. Five bootcamps, 51 steps, 208-259 hours. From Linux primitives to evaluation pipelines."
tags = ["bootcamp", "agentic-engineering", "linux", "learning"]
+++

## The observation

I spent a month building software with AI agents and tracking where things went wrong. The taxonomy of agent-native software that came out of it showed something I should have expected: 75% of software categories reduce to CLI and API operations. Pipes, text streams, file descriptors, process management. The agent-native stack is Linux.

But the substrate is only the beginning. Once you can verify system-level output, you face a harder problem: evaluating whether an agent's reasoning is sound, whether its retrieval is relevant, whether its memory is coherent, and whether your evaluation of all these things is itself rigorous. The verification problem is fractal - it exists at every layer.

## The problem

When an agent constructs a pipeline that silently drops data on a broken pipe, or generates a shell script with a quoting bug that only surfaces on filenames containing spaces, or claims a process is healthy when it's a zombie - the human operator has to catch it. That's the job now. You steer and verify.

If you don't understand what a file descriptor is, you can't diagnose why an agent's redirection is wrong. If you don't understand process groups and signals, you can't tell whether an agent's cleanup logic actually works. If you don't understand how `set -euo pipefail` interacts with subshells, you can't evaluate whether an agent's error handling is real or cosmetic.

This creates what I've been calling an oracle problem. The human is supposed to be the final verification layer. But if the human doesn't understand the substrate, errors pass through every layer uncaught. The verifier becomes the vulnerability.

The same problem scales upward. If you don't understand how LLM tokenisation affects prompt engineering, you can't tell whether an agent's context window is being used well. If you don't understand evaluation methodology, you can't tell whether your "95% accuracy" metric measures what you think it measures. If you don't understand retrieval, you can't tell whether an agent's RAG pipeline is returning relevant documents or just similar-looking ones.

## What I built

A structured self-study curriculum in five parts.

### Bootcamp I: Linux Substrate (12 steps, 51-65 hours)

The foundation. Starting from the process model and building up through shell, filesystems, text processing, Python CLI tools, Make, git internals, process observation, containers, networking, and process supervision.

The ordering follows a dependency graph. Step 1 is the Unix process model - fork, exec, file descriptors, pipes, signals - because everything else composes on top of it. Shell is step 2 because shell is the language that orchestrates processes. Filesystems are step 3 because state lives on disk.

```
Process model
  -> Shell language
     -> Text pipelines (grep/sed/awk/jq)
     -> Make/Just (orchestrates shell recipes)
     -> Python CLI tools (when shell hits its ceiling)
  -> Filesystem as state
     -> Git internals (versioned filesystem)
  -> Process observation (strace/lsof/ss)
     -> Container internals (namespaced processes)
  -> Networking
  -> Process supervision
  -> Advanced bash
```

### Bootcamp II: Agentic Engineering Practices (11 steps, 50-61 hours)

How LLMs work mechanistically (tokenisation, attention, generation), agent architecture patterns, prompt and context engineering, tool design, verification methodology, the human-AI interface, multi-model strategies, failure mode taxonomy, governance, and the cost/security/legal dimensions. This is the conceptual layer that sits between knowing the substrate and being effective at steering agents.

### Bootcamp III: Operational Analytics (10 steps, 32-40 hours)

Data analysis with Python for engineering decision-making. Tabular data with pandas, descriptive statistics, SQL analytics, statistical testing, time series analysis, visualisation, log analysis, cost modelling, text analysis, and notebook workflows. Not data science for its own sake - analytics as a tool for understanding what your agents are doing, how much they cost, and whether they're improving.

### Bootcamp IV: Evaluation and Adversarial Testing (9 steps, 39-48 hours)

What evaluations measure and what they don't. Dataset design, scoring and grading (including LLM-as-judge), agent evaluation with frameworks like Inspect AI, evaluation infrastructure and CI/CD integration, adversarial testing methodology, red teaming for safety, interpreting results without fooling yourself, and building an evaluation culture. This is directly aligned with the work being done at Anthropic and other frontier labs on AI safety evaluation.

### Bootcamp V: Agent Infrastructure in Practice (9 steps, 36-45 hours)

The retrieval problem and why naive similarity search is insufficient. Embeddings and vector search, RAG pipeline engineering, advanced retrieval patterns (hybrid search, reranking, agentic RAG), state management, conversation memory, observability and tracing, debugging agent systems, and production deployment patterns. Grounded in the project's own file-based state architecture as a worked example.

## How I ranked it

Three criteria for ordering within each bootcamp:

**Compositional leverage.** Does understanding this concept make everything above it easier? The process model scores highest in Bootcamp I because file descriptors, pipes, and signals appear in every subsequent step. In Bootcamp IV, understanding what evaluations actually measure scores highest because every subsequent step depends on knowing what you're trying to quantify.

**Return per hour.** How much capability does each hour of study produce? Text pipelines score well in Bootcamp I. Prompt engineering scores well in Bootcamp II. Both open large surface areas of practical work for relatively small time investment.

**Irreplaceability.** Can an agent compensate for the operator's ignorance, or must the operator know this? If an agent generates a shell script and you don't understand process substitution, the agent can't help you verify its own output. If an agent writes an evaluation harness and you don't understand the difference between accuracy and calibration, the agent's metrics are uninformative. You either understand the concepts or you don't, and the agent's confidence is uninformative either way.

## The dependency structure across bootcamps

The five bootcamps are ordered by dependency, not difficulty.

Bootcamp I (substrate) is prerequisite for everything. You cannot debug agent-generated shell scripts, containers, or deployment configurations without understanding how the operating system works.

Bootcamp II (agentic practices) requires I. You need the substrate knowledge to understand what agents are actually doing when they "write code" or "use tools."

Bootcamp III (analytics) requires I and benefits from II. Data analysis skills feed directly into evaluation and debugging work.

Bootcamp IV (evaluation) requires II and benefits from III. You cannot build meaningful evaluations without understanding what agents are, and analytics skills make evaluation data actionable.

Bootcamp V (infrastructure) requires I, II, and benefits from IV. Production agent systems need substrate knowledge, agentic understanding, and ideally evaluation methodology to validate that the infrastructure works.

## What it is not

This is self-study material I wrote for myself and am publishing because it might be useful to others. It is not a certified programme. There is no credential at the end. The only test is whether you can read agent-generated code and tell when it's wrong - at the system level, at the prompt level, and at the evaluation level.

Each step has interactive challenges you run in the same environment you're learning about. There are no separate lab setups. The terminal you're reading in is the terminal you practice in.

Where a concept has a good origin story - Ken Thompson's fork, Doug McIlroy's pipes, Linus Torvalds's git object model, the BLEU score's limitations - I include it. Not for decoration. Historical context creates memory anchors that make the mental model stick.

Every section connects explicitly to agentic engineering. The question "why does this matter when agents write code?" gets a concrete answer for every topic.

## Who this is for

Software engineers who work with AI agents and want to be competent at governing the full stack of output - from shell scripts to evaluation pipelines. You probably already write code daily. You might use agents for development. You may have noticed that you sometimes can't tell whether an agent's output is correct, and that bothers you.

The total estimated time is 208 to 259 hours across all five bootcamps. That is a substantial investment. But you don't need to do all five. The first three steps of Bootcamp I (process model, shell, filesystem) are roughly 20 hours and change how you read everything an agent produces at the system level. Bootcamp IV alone (evaluation and adversarial testing) is 39-48 hours and covers the methodology that frontier AI labs use to assess model safety and capability.

## Source

- Curriculum overview: [/bootcamp/](/bootcamp/)
- Bootcamp I steps: `docs/bootcamp/01-process-model.md` through `12-advanced-bash.md`
- Bootcamp II-V outlines: `docs/bootcamp/BOOTCAMP-{II,III,IV,V}-OUTLINE.md`
- Derived from: `docs/research/agent-native-software-taxonomy.md`
- Conventions: no emojis, no em-dashes, all examples runnable on Arch/Debian/Ubuntu

```

### File: `sites/oceanheart/content/bootcamp/_index.md`

```
+++
title = "Agentic Engineering Bootcamp"
description = "First principles for engineers who govern what agents build."
+++

Five structured programmes that take a competent software engineer to a competent agentic engineer - someone who can develop, verify, evaluate, and govern agent-native systems.

**I: Linux Substrate** - the kernel primitives, shell, filesystem, containers, and networking that agents actually run on. 12 steps, 51-65 hours.

**II: Agentic Engineering Practices** - how to work with agents: architecture, context engineering, verification, the human-AI interface, governance. 11 steps, 50-61 hours.

**III: Operational Analytics** - the 20% of data science that does 80% of the heavy lifting. pandas, DuckDB, statistics, visualisation, cost modelling. 10 steps, 32-40 hours.

**IV: Evaluation & Adversarial Testing** - how do you know if it's working? Eval design, LLM-as-judge, agent evaluation, red teaming, safety. 9 steps, 39-48 hours.

**V: Agent Infrastructure in Practice** - RAG, state management, conversation memory, observability, debugging, production patterns. 9 steps, 36-45 hours.

Total: 51 steps, ~208-259 hours. Not a weekend project - a practitioner's field guide built from operational experience.

**Ranking criteria** for the learning order within each bootcamp:

1. **Compositional leverage** - does this knowledge compose into everything above it?
2. **Return per hour** - how much capability per unit of learning time?
3. **Irreplaceability** - can an agent compensate for your ignorance, or must you understand it?

Step I.1 is available now as a sample. The rest is in development.

```


---

## Output Requirements

1. Write your narrative assessment (Section 1)
2. End with the structured YAML findings block (Section 2)
3. Use `prompt_id: 6` and `prompt_name: "completeness-trap"` in your YAML header
4. Use `model: "codex"` in your YAML header
5. Classify each finding with an attack vector from the taxonomy
6. Be honest. If the criticism does not hold up, say so.

mcp: context7 starting
mcp: stripe starting
mcp: langsmith starting
mcp: auggie starting
mcp: helicone starting
mcp: linear-server starting
mcp: posthog starting
mcp: sentry starting
mcp: codex_apps starting
2026-03-10T15:16:30.067853Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when Auth(TokenRefreshFailed("Server returned error response: invalid_grant: Invalid refresh token"))
mcp: stripe failed: MCP client for `stripe` failed to start: MCP startup failed: handshaking with MCP server failed: Send message error Transport [rmcp::transport::worker::WorkerTransport<rmcp::transport::streamable_http_client::StreamableHttpClientWorker<rmcp::transport::auth::AuthClient<reqwest::async_impl::client::Client>>>] error: Auth error: OAuth token refresh failed: Server returned error response: invalid_grant: Invalid refresh token, when send initialize request
mcp: linear-server ready
mcp: posthog ready
mcp: auggie ready
mcp: codex_apps ready
mcp: context7 ready
mcp: langsmith ready
mcp: helicone ready
mcp: sentry ready
mcp startup: ready: linear-server, posthog, auggie, codex_apps, context7, langsmith, helicone, sentry; failed: stripe
codex
```yaml
watch_officer: codex
weave_mode: tight
register: quarterdeck
tempo: making-way
true_north: "hired = proof > claim"
bearing: adversarial review of completion risk and expectation setting
last_known_position: reviewed blog post and bootcamp index
```

## Section 1: Narrative

The completion risk is real, and if Show HN traffic discovers it before the post states it plainly, the thread will turn from "interesting curriculum" to "this is mostly not written yet."

The core problem is not that Bootcamps II-V are outlines. The core problem is the mismatch between the *presentation layer* and the *delivery layer*. The post repeatedly presents the curriculum as a built object: "What I built", "A structured self-study curriculum in five parts", detailed descriptions for all five bootcamps, exact step counts, and total hour estimates. That reads like a published curriculum, not a prospectus. Only at the very end, in the separate bootcamp index, do we get the real status signal: "Step I.1 is available now as a sample. The rest is in development."

If the true public state is "12 steps complete" or worse "only I.1 public, II-V are outlines", a commenter would reasonably feel misled by "five bootcamps, 51 steps, 208-259 hours." That phrasing implies current availability, not intended scope. Hacker News commenters are very sensitive to this kind of completeness inflation because it looks like marketing arithmetic: large numbers standing in for delivered substance.

There is also an internal expectation-setting problem between the two provided pages. The blog post's source section says:

- "Bootcamp I steps: `docs/bootcamp/01-process-model.md` through `12-advanced-bash.md`"
- "Bootcamp II-V outlines: `docs/bootcamp/BOOTCAMP-{II,III,IV,V}-OUTLINE.md`"

That suggests Bootcamp I is fully written, while II-V are not. But the bootcamp index says "Step I.1 is available now as a sample. The rest is in development." Those are materially different claims. A skeptical reader will not interpret that as nuance. They will interpret it as inconsistency.

How damaging is this? High, bordering on critical for a Show HN launch, because the first attack writes itself:

"You are advertising 51 steps and 200+ hours, but only a fraction exists."

That attack survives scrutiny unless the post front-loads the publication status in the first screenful. Right now it does not.

The blog post does not adequately set expectations. The current "What it is not" section says this is self-study material and not a certified programme, but that is about credentialing, not completion status. It does not answer the question a commenter will ask: "How much of this can I read today?"

The honest framing is:

- This is a curriculum architecture for five bootcamps.
- Bootcamp I is the first fully written block, if that is true.
- Bootcamps II-V are currently outlines with ordering, scope, and estimated hours, not full lesson content.
- If only I.1 is actually public, say that explicitly and do not imply public availability of the rest.

If you want to avoid overselling while keeping it compelling, the post should shift from "here is a complete five-part curriculum" to "here is the full curriculum map, with Bootcamp I written first and the rest published as outlines." That is still interesting on HN if the underlying argument is strong, because the useful artifact becomes the dependency structure and prioritization logic, not a false impression of content completeness.

Exact sentences that should appear in the blog post:

"If you click through today, this is not five fully written bootcamps. It is a complete curriculum map for five bootcamps, with Bootcamp I written in full and Bootcamps II-V currently published as outlines."

"The 51 steps and 208-259 hour estimate describe the intended full programme, not the amount of finished lesson content currently available."

"If you only want the material that is complete now, start with Bootcamp I. The remaining bootcamps are included because the sequencing, scope, and dependencies are already useful even before every step is fully written."

If the real public state is only I.1 available, then the wording has to be stricter:

"Today, Step I.1 is available as a sample. The rest of the curriculum is published as a structured roadmap and is still being developed into full lesson content."

That sentence needs to appear near the top, not buried in the index. Anything softer invites a credibility hit that is entirely avoidable.

```yaml
review:
  model: "codex"
  date: "2026-03-10"
  prompt_id: 6
  prompt_name: "completeness-trap"

findings:
  - id: F-001
    attack_vector: "AV-COMPLETENESS"
    severity: critical
    claim_challenged: "The post presents 'five bootcamps, 51 steps, 208-259 hours' as a built curriculum."
    evidence: "The blog post says 'What I built' and describes all five bootcamps in detail with exact step counts and time ranges, while the bootcamp index says 'Step I.1 is available now as a sample. The rest is in development.'"
    survives_scrutiny: true
    description: >
      The presentation overstates completion. A reasonable reader will infer that the
      curriculum largely exists in finished form, because the post uses completed-project
      language plus precise scope numbers. If commenters discover that only a small subset
      is actually available, they will read the headline numbers as scope inflation rather
      than roadmap context.

  - id: F-002
    attack_vector: "AV-COMPLETENESS"
    severity: high
    claim_challenged: "The blog post adequately sets expectations about what is currently available."
    evidence: "The post includes no plain-language sentence near the top stating the publication status; the only explicit status disclosure appears in the bootcamp index: 'Step I.1 is available now as a sample. The rest is in development.'"
    survives_scrutiny: true
    description: >
      The expectation-setting is too late and too weak. The post spends most of its word
      count describing the curriculum as if it is delivered content, then relies on a separate
      page to disclose that the material is still in development. On Show HN, many readers
      will not click through or will conclude the clarification was buried after the fact.

  - id: F-003
    attack_vector: "AV-SLOP"
    severity: high
    claim_challenged: "The publication is internally coherent about completion status."
    evidence: "The blog source section says 'Bootcamp I steps: docs/bootcamp/01-process-model.md through 12-advanced-bash.md' and 'Bootcamp II-V outlines', but the bootcamp index says only 'Step I.1 is available now as a sample. The rest is in development.'"
    survives_scrutiny: true
    description: >
      The two pages create a material inconsistency. One implies Bootcamp I is fully written
      while the other implies only the first step is available. Even if there is a benign
      explanation, commenters will treat inconsistent availability claims as a credibility
      problem. This is exactly the kind of discrepancy that triggers hostile thread energy.

  - id: F-004
    attack_vector: "AV-AUDIENCE"
    severity: medium
    claim_challenged: "The current framing will land cleanly with a Show HN audience."
    evidence: "The headline value proposition foregrounds total programme size and estimated hours rather than clearly separating finished content from planned content."
    survives_scrutiny: true
    description: >
      Hacker News readers are more forgiving of an unfinished artifact than of an artifact
      that feels padded or overpackaged. The likely audience reaction is not 'this should
      have been complete' but 'be honest about what exists.' The current framing invites the
      wrong debate by emphasizing 51 steps and 200-plus hours before clarifying availability.

  - id: F-005
    attack_vector: "AV-COMPLETENESS"
    severity: medium
    claim_challenged: "Detailed descriptions of Bootcamps II-V are harmless even if those sections are outlines."
    evidence: "Each unfinished bootcamp is described with confident scope language such as 'How LLMs work mechanistically', 'Data analysis with Python', and 'This is directly aligned with the work being done at Anthropic and other frontier labs'."
    survives_scrutiny: true
    description: >
      Rich descriptions of unfinished sections amplify the sense that the material is already
      there to be consumed. The more concrete the descriptions become, the stronger the implied
      promise of completion. If those sections are still outlines, the prose should label them
      as planned modules or forthcoming sections, not present-tense instructional units.

  - id: F-006
    attack_vector: "AV-COMPLETENESS"
    severity: low
    claim_challenged: "The criticism necessarily sinks the project if addressed honestly."
    evidence: "The bootcamp index already contains a direct status line: 'Step I.1 is available now as a sample. The rest is in development.'"
    survives_scrutiny: false
    description: >
      The existence of an explicit disclosure means the problem is not fatal by definition.
      The issue is placement, prominence, and contradiction with the blog framing, not the
      mere fact that unfinished material exists. With clear top-level disclosure and consistent
      wording across pages, the completion gap becomes a manageable roadmap story rather than
      a deception story.
```
tokens used
36,052
```yaml
watch_officer: codex
weave_mode: tight
register: quarterdeck
tempo: making-way
true_north: "hired = proof > claim"
bearing: adversarial review of completion risk and expectation setting
last_known_position: reviewed blog post and bootcamp index
```

## Section 1: Narrative

The completion risk is real, and if Show HN traffic discovers it before the post states it plainly, the thread will turn from "interesting curriculum" to "this is mostly not written yet."

The core problem is not that Bootcamps II-V are outlines. The core problem is the mismatch between the *presentation layer* and the *delivery layer*. The post repeatedly presents the curriculum as a built object: "What I built", "A structured self-study curriculum in five parts", detailed descriptions for all five bootcamps, exact step counts, and total hour estimates. That reads like a published curriculum, not a prospectus. Only at the very end, in the separate bootcamp index, do we get the real status signal: "Step I.1 is available now as a sample. The rest is in development."

If the true public state is "12 steps complete" or worse "only I.1 public, II-V are outlines", a commenter would reasonably feel misled by "five bootcamps, 51 steps, 208-259 hours." That phrasing implies current availability, not intended scope. Hacker News commenters are very sensitive to this kind of completeness inflation because it looks like marketing arithmetic: large numbers standing in for delivered substance.

There is also an internal expectation-setting problem between the two provided pages. The blog post's source section says:

- "Bootcamp I steps: `docs/bootcamp/01-process-model.md` through `12-advanced-bash.md`"
- "Bootcamp II-V outlines: `docs/bootcamp/BOOTCAMP-{II,III,IV,V}-OUTLINE.md`"

That suggests Bootcamp I is fully written, while II-V are not. But the bootcamp index says "Step I.1 is available now as a sample. The rest is in development." Those are materially different claims. A skeptical reader will not interpret that as nuance. They will interpret it as inconsistency.

How damaging is this? High, bordering on critical for a Show HN launch, because the first attack writes itself:

"You are advertising 51 steps and 200+ hours, but only a fraction exists."

That attack survives scrutiny unless the post front-loads the publication status in the first screenful. Right now it does not.

The blog post does not adequately set expectations. The current "What it is not" section says this is self-study material and not a certified programme, but that is about credentialing, not completion status. It does not answer the question a commenter will ask: "How much of this can I read today?"

The honest framing is:

- This is a curriculum architecture for five bootcamps.
- Bootcamp I is the first fully written block, if that is true.
- Bootcamps II-V are currently outlines with ordering, scope, and estimated hours, not full lesson content.
- If only I.1 is actually public, say that explicitly and do not imply public availability of the rest.

If you want to avoid overselling while keeping it compelling, the post should shift from "here is a complete five-part curriculum" to "here is the full curriculum map, with Bootcamp I written first and the rest published as outlines." That is still interesting on HN if the underlying argument is strong, because the useful artifact becomes the dependency structure and prioritization logic, not a false impression of content completeness.

Exact sentences that should appear in the blog post:

"If you click through today, this is not five fully written bootcamps. It is a complete curriculum map for five bootcamps, with Bootcamp I written in full and Bootcamps II-V currently published as outlines."

"The 51 steps and 208-259 hour estimate describe the intended full programme, not the amount of finished lesson content currently available."

"If you only want the material that is complete now, start with Bootcamp I. The remaining bootcamps are included because the sequencing, scope, and dependencies are already useful even before every step is fully written."

If the real public state is only I.1 available, then the wording has to be stricter:

"Today, Step I.1 is available as a sample. The rest of the curriculum is published as a structured roadmap and is still being developed into full lesson content."

That sentence needs to appear near the top, not buried in the index. Anything softer invites a credibility hit that is entirely avoidable.

```yaml
review:
  model: "codex"
  date: "2026-03-10"
  prompt_id: 6
  prompt_name: "completeness-trap"

findings:
  - id: F-001
    attack_vector: "AV-COMPLETENESS"
    severity: critical
    claim_challenged: "The post presents 'five bootcamps, 51 steps, 208-259 hours' as a built curriculum."
    evidence: "The blog post says 'What I built' and describes all five bootcamps in detail with exact step counts and time ranges, while the bootcamp index says 'Step I.1 is available now as a sample. The rest is in development.'"
    survives_scrutiny: true
    description: >
      The presentation overstates completion. A reasonable reader will infer that the
      curriculum largely exists in finished form, because the post uses completed-project
      language plus precise scope numbers. If commenters discover that only a small subset
      is actually available, they will read the headline numbers as scope inflation rather
      than roadmap context.

  - id: F-002
    attack_vector: "AV-COMPLETENESS"
    severity: high
    claim_challenged: "The blog post adequately sets expectations about what is currently available."
    evidence: "The post includes no plain-language sentence near the top stating the publication status; the only explicit status disclosure appears in the bootcamp index: 'Step I.1 is available now as a sample. The rest is in development.'"
    survives_scrutiny: true
    description: >
      The expectation-setting is too late and too weak. The post spends most of its word
      count describing the curriculum as if it is delivered content, then relies on a separate
      page to disclose that the material is still in development. On Show HN, many readers
      will not click through or will conclude the clarification was buried after the fact.

  - id: F-003
    attack_vector: "AV-SLOP"
    severity: high
    claim_challenged: "The publication is internally coherent about completion status."
    evidence: "The blog source section says 'Bootcamp I steps: docs/bootcamp/01-process-model.md through 12-advanced-bash.md' and 'Bootcamp II-V outlines', but the bootcamp index says only 'Step I.1 is available now as a sample. The rest is in development.'"
    survives_scrutiny: true
    description: >
      The two pages create a material inconsistency. One implies Bootcamp I is fully written
      while the other implies only the first step is available. Even if there is a benign
      explanation, commenters will treat inconsistent availability claims as a credibility
      problem. This is exactly the kind of discrepancy that triggers hostile thread energy.

  - id: F-004
    attack_vector: "AV-AUDIENCE"
    severity: medium
    claim_challenged: "The current framing will land cleanly with a Show HN audience."
    evidence: "The headline value proposition foregrounds total programme size and estimated hours rather than clearly separating finished content from planned content."
    survives_scrutiny: true
    description: >
      Hacker News readers are more forgiving of an unfinished artifact than of an artifact
      that feels padded or overpackaged. The likely audience reaction is not 'this should
      have been complete' but 'be honest about what exists.' The current framing invites the
      wrong debate by emphasizing 51 steps and 200-plus hours before clarifying availability.

  - id: F-005
    attack_vector: "AV-COMPLETENESS"
    severity: medium
    claim_challenged: "Detailed descriptions of Bootcamps II-V are harmless even if those sections are outlines."
    evidence: "Each unfinished bootcamp is described with confident scope language such as 'How LLMs work mechanistically', 'Data analysis with Python', and 'This is directly aligned with the work being done at Anthropic and other frontier labs'."
    survives_scrutiny: true
    description: >
      Rich descriptions of unfinished sections amplify the sense that the material is already
      there to be consumed. The more concrete the descriptions become, the stronger the implied
      promise of completion. If those sections are still outlines, the prose should label them
      as planned modules or forthcoming sections, not present-tense instructional units.

  - id: F-006
    attack_vector: "AV-COMPLETENESS"
    severity: low
    claim_challenged: "The criticism necessarily sinks the project if addressed honestly."
    evidence: "The bootcamp index already contains a direct status line: 'Step I.1 is available now as a sample. The rest is in development.'"
    survives_scrutiny: false
    description: >
      The existence of an explicit disclosure means the problem is not fatal by definition.
      The issue is placement, prominence, and contradiction with the blog framing, not the
      mere fact that unfinished material exists. With clear top-level disclosure and consistent
      wording across pages, the completion gap becomes a manageable roadmap story rather than
      a deception story.
```
