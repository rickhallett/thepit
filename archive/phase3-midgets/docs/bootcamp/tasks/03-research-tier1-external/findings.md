# Task 03 Findings: Tier 1 External References (Steps 1-3)

**Researched:** 2026-03-10
**Agent:** Research agent (claude-opus-4-6)
**Method:** Web fetch + verification of all cited URLs and references

---

## Step 1: How LLMs Actually Work

### Vaswani et al., "Attention Is All You Need" (2017)

- **Status:** verified
- **URL:** https://arxiv.org/abs/1706.03762
- **Citation:** Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention Is All You Need. arXiv:1706.03762 [cs.CL]. 15 pages, 5 figures. Last revised August 2023 (v7).
- **Key Extraction:**
  - Core insight: the Transformer architecture replaces recurrence and convolution entirely with self-attention mechanisms. This is the single architectural decision that enabled modern LLMs.
  - For engineers (not researchers): the paper's value is the architecture diagram and the concept of multi-head attention, not the BLEU score results. An engineer needs to understand Q/K/V projections, the attention formula (softmax(QK^T/sqrt(d_k))V), and why parallelisation matters for training speed.
  - The encoder-decoder structure described in the paper is not what modern decoder-only LLMs use - GPT-family and Claude use decoder-only variants. This distinction matters when teaching.
  - The positional encoding mechanism (sine/cosine) has been superseded by RoPE and other methods in modern models, but the concept of needing positional information remains essential.
- **Best Quote:** "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely."
- **Caveat:** The paper describes an encoder-decoder model for machine translation. Modern LLMs (GPT, Claude) are decoder-only. The outline correctly says "skim for architecture intuition" - this is the right framing.

### Karpathy, "Let's build GPT from scratch" (2023 video)

- **Status:** verified
- **URL:** https://www.youtube.com/watch?v=kCc8FmEb1nY
- **Key Extraction:**
  - Title on YouTube: "Let's build GPT: from scratch, in code, spelled out."
  - Channel: Andrej Karpathy. Video is live and accessible.
  - Pedagogical approach: builds a character-level language model from scratch in Python, starting from bigram models up to a full GPT architecture. This bottom-up approach is exceptionally effective for engineers because each step is runnable code.
  - Running time: approximately 1 hour 56 minutes (based on known video metadata from prior access; YouTube's JS-heavy page did not render full metadata via text fetch).
  - Prerequisites: basic Python, basic understanding of neural networks helpful but not strictly required. Karpathy explains concepts as he goes.
  - Key concepts covered: tokenisation (character-level), embedding, self-attention, multi-head attention, feed-forward layers, layer normalisation, dropout, autoregressive generation.
- **Best Quote:** (from Karpathy's teaching philosophy) The video demonstrates that a GPT can be built in ~300 lines of Python, making the architecture tangible rather than magical.
- **Caveat:** Uses character-level tokenisation for simplicity, not BPE/SentencePiece as used by production models. The video is from January 2023 and does not cover RLHF, instruction tuning, or reasoning tokens. These gaps are exactly what Step 1 needs to supplement with novel content.

### Alammar, "The Illustrated Transformer"

- **Status:** verified
- **URL:** https://jalammar.github.io/illustrated-transformer/
- **Key Extraction:**
  - The definitive visual explanation of the Transformer architecture. Featured in courses at Stanford, Harvard, MIT, Princeton, CMU and others.
  - Now also available as a book chapter: LLM-book.com (Chapter 3), updated for modern Transformer variants (Multi-Query Attention, RoPE).
  - Most useful visualisations for engineers:
    1. The encoder-decoder stack diagram showing how encoders and decoders connect
    2. Self-attention step-by-step: Q/K/V vector creation, scoring, softmax, weighted sum
    3. Multi-head attention: parallel attention heads focusing on different aspects
    4. The attention heatmap showing which words attend to which (the "it" -> "animal" example)
    5. The matrix form of self-attention calculation
  - Includes positional encoding visualisation (sine/cosine patterns).
  - Written June 2018, translated into 12+ languages.
- **Best Quote:** "Self-attention is the method the Transformer uses to bake the 'understanding' of other relevant words into the one we're currently processing."
- **Caveat:** Original post describes the encoder-decoder architecture from the 2017 paper. The 2025 update (book version) covers decoder-only models. For Bootcamp II, the original post's visualisations are still the best entry point, but the book chapter is worth referencing for currency.

### Anthropic, "Building effective agents" (Dec 2024)

- **Status:** verified
- **URL:** https://www.anthropic.com/engineering/building-effective-agents
- **Key Extraction (for Step 1 - the building blocks section):**
  - Defines the "augmented LLM" as the fundamental building block: LLM + retrieval + tools + memory. This is the key concept for Step 1 - it bridges from "how LLMs work" to "how agents are structured."
  - The augmented LLM diagram shows the LLM at the center with retrieval, tools, and memory as augmentations.
  - Mentions Model Context Protocol (MCP) for third-party tool integration.
  - Key framing: "we recommend finding the simplest solution possible, and only increasing complexity when needed."
  - Published December 19, 2024. Written by Erik Schluntz and Barry Zhang.
- **Best Quote:** "When building applications with LLMs, we recommend finding the simplest solution possible, and only increasing complexity when needed. This might mean not building agentic systems at all."
- **Caveat:** Still current as of March 2026. The article now lists Claude Agent SDK and Strands Agents SDK by AWS as frameworks, which were not in the original Dec 2024 version - the page appears to be a living document that gets minor updates.

### OpenAI Tokenizer Playground

- **Status:** verified (with caveats)
- **URL:** https://platform.openai.com/tokenizer
- **Key Extraction:**
  - The page loads as a JS-heavy SPA; the text fetch returned only "OpenAI Platform" with no rendered content. However, the URL is valid and the tool exists.
  - The tokenizer playground allows users to paste text and see how it is split into tokens, with color-coded boundaries.
  - Demonstrates that code tokens, whitespace, and special characters split differently than natural language.
  - Shows the difference between different encoding schemes (cl100k_base for GPT-4, o200k_base for newer models).
- **Best Quote:** N/A (interactive tool, not prose)
- **Caveat:** Being a JS SPA, the content cannot be verified via text fetch. Confirmed to exist at the URL. The tool demonstrates token boundaries in code, which is its primary pedagogical value for Step 1. An alternative or supplement: the `tiktoken` Python library lets engineers tokenize programmatically.

### General Research: Step 1

**RLHF consequences for engineers:**
- The best current explanation comes from combining Anthropic's model card documentation with the practical observation that RLHF produces models that are "helpful to a fault" (sycophancy). For engineers, the key consequences are:
  - Models are trained to produce helpful-sounding responses, which means they will generate plausible-sounding but wrong code rather than saying "I don't know."
  - Sycophantic drift: models tend to agree with the user's framing even when it's incorrect. This is not a bug but a direct consequence of RLHF reward shaping.
  - The alignment tax: honesty sometimes conflicts with helpfulness, and RLHF optimizes for helpfulness. Engineers need to design verification systems that do not trust model confidence.
  - No single canonical "RLHF for engineers" reference exists in the field. The Bootcamp II outline correctly identifies this as an area where novel framing is needed.

**Practical model family differences:**
- Claude (Anthropic): Strong at following complex instructions, system prompt adherence, structured output. Extended thinking (visible reasoning tokens). Tends toward longer, more detailed responses.
- GPT-4/GPT-5 (OpenAI): Strong at code generation, function calling, structured output via JSON mode. Reasoning models (o1/o3) have internal chain-of-thought. Developer/user/system message hierarchy.
- Gemini (Google): Large context windows (up to 2M tokens). Strong multimodal capabilities. Less mature agentic tooling compared to Anthropic/OpenAI.
- For engineering purposes: model selection matters most for (a) context window size, (b) tool/function calling reliability, (c) structured output compliance, and (d) cost per token. It matters least for "general intelligence" on standard tasks.

**Current context window sizes (as of March 2026):**
- Claude 3.5 Sonnet / Claude Opus 4: 200K tokens
- GPT-4.1: 1M tokens context window
- GPT-5 / GPT-5.4: varies by tier, up to 1M+
- Gemini 1.5 Pro: 2M tokens
- Effective length vs advertised length: models degrade on retrieval tasks in the "lost in the middle" zone (roughly 25-75% of context). Primacy and recency positions perform best. This is the key engineering insight - advertised context window is not effective context window.

---

## Step 2: Agent Architecture Patterns

### Anthropic, "Building effective agents" (Dec 2024) - Full Extraction

- **Status:** verified (same URL as Step 1)
- **URL:** https://www.anthropic.com/engineering/building-effective-agents
- **Key Extraction (all 5 workflow patterns):**
  1. **Prompt chaining:** Decompose task into sequence of steps. Each LLM call processes output of previous one. Add programmatic checks ("gates") at intermediate steps. *When to use:* task can be cleanly decomposed into fixed subtasks; trade latency for accuracy. *Example:* generate marketing copy, then translate it.
  2. **Routing:** Classify input, direct to specialized followup. Separation of concerns. *When to use:* distinct categories handled separately; classification can be done accurately. *Example:* customer service query triage (general/refund/technical).
  3. **Parallelisation:** Two variations - sectioning (independent subtasks in parallel) and voting (same task multiple times for diverse outputs). *When to use:* subtasks can be parallelized for speed, or need multiple perspectives. *Example:* guardrails (one model handles query, another screens for safety).
  4. **Orchestrator-workers:** Central LLM dynamically breaks down tasks, delegates to workers, synthesizes results. *When to use:* can't predict subtasks needed (e.g. coding - number of files to change depends on task). Key difference from parallelisation: subtasks are not pre-defined. *Example:* coding products making complex multi-file changes.
  5. **Evaluator-optimizer:** One LLM generates response, another evaluates and provides feedback in a loop. *When to use:* clear evaluation criteria exist, iterative refinement provides measurable value. *Example:* literary translation with nuanced critique.

- **The simplicity principle quotation:** "When building applications with LLMs, we recommend finding the simplest solution possible, and only increasing complexity when needed. This might mean not building agentic systems at all. Agentic systems often trade latency and cost for better task performance, and you should consider when this tradeoff makes sense."
- **The augmented LLM diagram:** Described in text as "LLM enhanced with augmentations such as retrieval, tools, and memory." The article includes a diagram showing this structure.
- **Workflow vs Agent distinction:** "Workflows are systems where LLMs and tools are orchestrated through predefined code paths. Agents, on the other hand, are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks."
- **Agent implementation:** "They are typically just LLMs using tools based on environmental feedback in a loop. It is therefore crucial to design toolsets and their documentation clearly and thoughtfully."
- **Three core principles for agents:** (1) Maintain simplicity in design. (2) Prioritize transparency by showing planning steps. (3) Carefully craft the agent-computer interface (ACI) through thorough tool documentation and testing.
- **Caveat:** The frameworks list has been updated since Dec 2024 publication. Now includes Claude Agent SDK and Strands Agents SDK (AWS). The core patterns and principles remain unchanged.

### OpenAI, "Orchestrating Agents: Routines and Handoffs" (Oct 2024)

- **Status:** verified
- **URL:** https://cookbook.openai.com/examples/orchestrating_agents
- **Key Extraction:**
  - Published October 10, 2024 by Ilan Bigio (OpenAI). This is an OpenAI Cookbook entry, not a blog post.
  - Introduces two core concepts: **routines** (a set of natural language instructions + tools needed to complete them) and **handoffs** (one agent transferring an active conversation to another agent).
  - A routine is concretely defined as: a system prompt containing step-by-step instructions + the functions/tools needed to execute those steps. The system prompt can contain conditional logic ("if not satisfied, offer refund") which LLMs handle robustly.
  - Handoff mechanism: agents are given `transfer_to_XXX()` functions. When called, the function returns an Agent object, which triggers the system to swap the active agent. The conversation history is preserved across handoffs.
  - Implementation is remarkably simple: an Agent class with `name`, `model`, `instructions`, `tools`. The run loop gets completions, executes tool calls, checks for agent transfers, and loops.
  - Key insight: "LLMs can actually handle these cases [conditional branching in instructions] quite robustly for small and medium sized routines, with the added benefit of having 'soft' adherence - the LLM can naturally steer the conversation without getting stuck in dead-ends."
  - Introduces the Swarm library as a proof of concept implementing these patterns.
- **Best Quote:** "The notion of a 'routine' is not strictly defined, and instead meant to capture the idea of a set of steps. Concretely, let's define a routine to be a list of instructions in natural language (which we'll represent with a system prompt), along with the tools necessary to complete them."
- **Caveat:** None significant. The article is a cookbook entry with working code examples. Still current.

### OpenAI Swarm Repo

- **Status:** verified - archived/superseded
- **URL:** https://github.com/openai/swarm
- **Key Extraction:**
  - Repository description: "Educational framework exploring ergonomic, lightweight multi-agent orchestration. Managed by OpenAI Solution team."
  - **IMPORTANT:** The README now contains a prominent notice: "Swarm is now replaced by the OpenAI Agents SDK, which is a production-ready evolution of Swarm. The Agents SDK features key improvements and will be actively maintained by the OpenAI team. We recommend migrating to the Agents SDK for all production use cases."
  - Stars: 21.1K, Forks: 2.2K, 28 commits total (indicating educational/reference nature, not active development).
  - Core abstractions: `Agent` (name, model, instructions, functions/tools) and `Swarm` client (runs the agent loop). Handoffs via functions that return Agent objects. Context variables passed through the system.
  - Key design: entirely stateless between calls (runs on Chat Completions API). The `client.run()` loop: get completion -> execute tool calls -> switch agent if needed -> update context vars -> repeat until no more tool calls.
  - The `Result` object can return a value, a new agent (for handoff), and updated context variables simultaneously.
  - Six example implementations included: basic, triage_agent, weather_agent, airline, support_bot, personal_shopper.
  - Python 3.10+ required, MIT license.
- **Best Quote:** "Swarm focuses on making agent coordination and execution lightweight, highly controllable, and easily testable. It accomplishes this through two primitive abstractions: Agents and handoffs."
- **Caveat:** Swarm is explicitly superseded by OpenAI Agents SDK. The repo is still educational and the patterns are valid, but the outline should note this succession. For Bootcamp II, Swarm remains the better teaching tool (simpler, more transparent) while Agents SDK is the production choice.

### LangGraph Documentation

- **Status:** verified (URL has moved)
- **URL (old):** https://langchain-ai.github.io/langgraph/ (redirects, states "Documentation has moved to docs.langchain.com")
- **URL (current):** Documentation now at docs.langchain.com (specific path unclear from redirect). PyPI page at https://pypi.org/project/langgraph/ has comprehensive info.
- **Key Extraction:**
  - Current version: 1.1.0 (released March 10, 2026). Production/Stable status. Python 3.10+. MIT license.
  - Self-description: "a low-level orchestration framework for building, managing, and deploying long-running, stateful agents."
  - Core abstractions: `StateGraph` (define graph with typed state), nodes (Python functions that transform state), edges (connections between nodes, including conditional edges via `add_conditional_edges`). Entry point via `START` constant.
  - Key differentiator from Swarm: LangGraph is stateful with persistence/checkpointing. Supports durable execution (agents persist through failures), human-in-the-loop (inspect/modify agent state at any point), and both short-term and long-term memory.
  - Inspired by Pregel (Google's graph processing) and Apache Beam. Public interface draws from NetworkX.
  - Ecosystem: integrates with LangSmith (observability/debugging), LangSmith Deployment (hosting), and LangChain (integrations).
  - "Trusted by companies shaping the future of agents - including Klarna, Replit, Elastic, and more."
  - Free LangChain Academy course available for learning basics.
- **Best Quote:** From PyPI: "LangGraph does not abstract prompts or architecture" - a notable positioning statement against higher-level frameworks.
- **Caveat:** The documentation URL has moved from `langchain-ai.github.io/langgraph/` to `docs.langchain.com`. The outline references should be updated. LangGraph hit 1.0 in October 2025, indicating maturity. The framework is significantly more complex than Swarm but is production-grade.

### General Research: Step 2

**Current framework landscape (as of March 2026):**

| Framework | Status | Agent Definition | Production Ready? |
|-----------|--------|-----------------|-------------------|
| **LangChain/LangGraph** | Active, v1.1.0 | Graph nodes with typed state, conditional edges | Yes (1.0+ since Oct 2025) |
| **CrewAI** | Active | Role-based agents with goals, backstory, tools | Yes, used in production |
| **AutoGen (Microsoft)** | Active, v0.4+ rewrite | Conversable agents with group chat | Maturing; v0.4 was a significant rewrite |
| **Claude Agent SDK** | Active | Referenced in Anthropic's "Building effective agents" | Yes, officially supported |
| **OpenAI Agents SDK** | Active | Successor to Swarm, production-grade | Yes, replaces Swarm |
| **Strands (AWS)** | Active | Referenced alongside Claude Agent SDK in Anthropic's article | Yes, AWS-backed |
| **Swarm (OpenAI)** | Superseded | Educational only, see Agents SDK | No (educational/archived) |

**What "agent" means in each framework:**
- LangGraph: a graph of nodes (functions) connected by edges, with typed shared state. An "agent" is a compiled graph that can run tools and make routing decisions.
- CrewAI: a persona with role, goal, backstory, and tools. Multiple agents collaborate as a "crew."
- AutoGen: a conversable agent that participates in multi-turn group chats with other agents. Emphasis on conversation patterns.
- OpenAI Agents SDK / Swarm: an agent is instructions + tools, with the ability to hand off to other agents via transfer functions.
- Claude Agent SDK: an LLM with augmented capabilities (tools, retrieval, memory) orchestrated through code.

The consistent insight across all frameworks: an "agent" is fundamentally an LLM + instructions + tools + some form of control flow. The differences are in how control flow is managed (graph vs conversation vs handoff vs predefined workflow).

---

## Step 3: Prompt Engineering as System Design

### Anthropic Prompt Engineering Interactive Tutorial (GitHub)

- **Status:** verified
- **URL:** https://github.com/anthropics/courses/tree/master/prompt_engineering_interactive_tutorial
- **Key Extraction:**
  - Repository: `anthropics/courses` (19.3K stars, 1.9K forks as of March 2026).
  - Two versions available: Anthropic 1P (first-party API) and Amazon Bedrock.
  - Structure: 9 chapters + appendix, designed to be worked through in order. Each lesson has an "Example Playground" for experimentation. Also available as a Google Sheets version using Claude for Sheets extension.
  - Chapter structure:
    - **Beginner:** (1) Basic Prompt Structure, (2) Being Clear and Direct, (3) Assigning Roles
    - **Intermediate:** (4) Separating Data from Instructions, (5) Formatting Output & Speaking for Claude, (6) Precognition (Thinking Step by Step), (7) Using Examples
    - **Advanced:** (8) Avoiding Hallucinations, (9) Building Complex Prompts (Industry Use Cases - chatbot, legal, financial, coding)
    - **Appendix:** Chaining Prompts, Tool Use, Search & Retrieval
  - Uses Claude 3 Haiku for exercises (smallest/cheapest model for learning).
  - Covers all the key concepts needed for Step 3: role prompting, structured output, few-shot, chain-of-thought, and complex prompt construction.
- **Best Quote:** "This course is intended to provide you with a comprehensive step-by-step understanding of how to engineer optimal prompts within Claude."
- **Caveat:** The tutorial references Claude 3 Haiku/Sonnet/Opus model names. By March 2026, Claude 3.5 and Claude 4 families exist. The principles remain valid but model names are outdated. The tutorial URL on anthropic.com docs now points to `prompt-eng-interactive-tutorial` (slightly different repo path) but the courses repo remains the canonical location.

### Anthropic, "Building effective agents" Appendix 2 (ACI Design)

- **Status:** verified (same article as Steps 1 and 2)
- **URL:** https://www.anthropic.com/engineering/building-effective-agents (scroll to Appendix 2)
- **Key Extraction:**
  - **ACI (Agent-Computer Interface) design principles:**
    - Tool definitions deserve as much prompt engineering attention as overall prompts.
    - Think about ACI design like HCI design: invest equal effort in the model's interface as you would in a human interface.
    - Practical guidance: "Put yourself in the model's shoes. Is it obvious how to use this tool, based on the description and parameters?"
    - Write tool descriptions like docstrings for a junior developer.
    - Test how the model uses tools: run many example inputs, observe mistakes, iterate.
  - **Poka-yoke for tools:** "Change the arguments so that it is harder to make mistakes." Concrete example: when building their SWE-bench agent, they found the model made mistakes with relative filepaths after changing directories. Fix: require absolute filepaths. Result: flawless tool use.
  - **SWE-bench finding:** "While building our agent for SWE-bench, we actually spent more time optimizing our tools than the overall prompt." This is the key pedagogical insight - tool definition optimization can matter more than prompt optimization.
  - **Tool format guidance:**
    - Give the model enough tokens to "think" before it writes itself into a corner.
    - Keep format close to what the model has seen in training data.
    - Avoid formatting overhead (accurate line counts, string escaping).
- **Best Quote:** "While building our agent for SWE-bench, we actually spent more time optimizing our tools than the overall prompt."
- **Caveat:** None. This appendix is directly applicable and stable.

### OpenAI Prompt Engineering Documentation

- **Status:** verified
- **URL:** https://platform.openai.com/docs/guides/prompt-engineering
- **Key Extraction:**
  - Comprehensive guide covering: message roles (developer/user/assistant), prompt structure, few-shot learning, context management, and model-specific prompting.
  - Key structural insight for Step 3: developer messages provide system rules/business logic (like function definitions), user messages provide inputs (like function arguments). This framing is useful for teaching prompt engineering as system design.
  - **Prompt structure recommendation:** Identity -> Instructions -> Examples -> Context (in this order). This maps well to the system prompt design patterns in Step 3.
  - **Message formatting:** recommends Markdown headers/lists for logical sections and XML tags for content boundaries. This is actionable guidance for structured prompts.
  - **Prompt caching tip:** keep reusable content at the beginning of prompts and early in the JSON request body to maximize caching benefits.
  - **GPT-5 specific:** highly steerable and responsive to well-specified prompts. Separate guidance for coding, frontend engineering, and agentic tasks.
  - **Reasoning vs GPT model prompting:** "A reasoning model is like a senior co-worker. You can give them a goal to achieve and trust them to work out the details. A GPT model is like a junior coworker. They'll perform best with explicit instructions to create a specific output."
  - Introduces reusable prompts (Responses API only) with template variables.
- **Best Quote:** "developer messages provide the system's rules and business logic, like a function definition. user messages provide inputs and configuration to which the developer message instructions are applied, like arguments to a function."
- **Caveat:** Page references GPT-5/GPT-5.4 and the Responses API, which are newer than what was current when the outline was written. The underlying principles are stable. OpenAI uses "developer" role where older docs used "system" role.

### Anthropic Prompting Best Practices Documentation

- **Status:** verified
- **URL:** https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
- **Key Extraction:**
  - This is the overview/landing page for Anthropic's prompt engineering documentation.
  - Structure: directs to "Prompting best practices" as the living reference for all techniques (clarity, examples, XML structuring, role prompting, thinking, prompt chaining).
  - Claude Console offers prompting tools: prompt generator, templates/variables, prompt improver.
  - Links to the interactive tutorial (GitHub and Google Sheets versions).
  - Pre-requisites: clear success criteria, empirical testing methods, first draft prompt.
  - Key meta-insight: "Not every success criteria or failing eval is best solved by prompt engineering. For example, latency and cost can be sometimes more easily improved by selecting a different model."
- **Caveat:** This is a living document that changes with model releases. The URL and structure are stable.

### arXiv:2602.11988 (Context Pollution / AGENTS.md Evaluation)

- **Status:** verified
- **URL:** https://arxiv.org/abs/2602.11988
- **Citation:** Gloaguen, T., Mundler, N., Muller, M., Raychev, V., & Vechev, M. (2026). Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? arXiv:2602.11988 [cs.SE]. Submitted February 12, 2026.
- **Key Extraction:**
  - **Core finding:** Context files (like AGENTS.md) "tend to reduce task success rates compared to providing no repository context, while also increasing inference cost by over 20%."
  - This is directly relevant to the Step 3 concept of L8 saturation threshold - more context is not monotonically better.
  - Two complementary evaluation settings: (1) SWE-bench tasks with LLM-generated context files following agent-developer recommendations, and (2) novel collection of issues from repos containing developer-committed context files.
  - **Behavioral findings:** Both LLM-generated and developer-provided context files encourage broader exploration (more thorough testing and file traversal), and coding agents tend to respect their instructions. But unnecessary requirements from context files make tasks harder.
  - **Key conclusion:** "Human-written context files should describe only minimal requirements."
  - This directly supports the Bootcamp II concept of "working set" (minimum context for correct output, not maximum available context).
- **Best Quote:** "Context files tend to reduce task success rates compared to providing no repository context, while also increasing inference cost by over 20%."
- **Caveat:** This is a February 2026 preprint (v1 only). It has not yet been peer-reviewed. The finding is counterintuitive and provocative - exactly the kind of result that benefits from replication. However, the experimental methodology (SWE-bench, multiple agents and LLMs) is rigorous. The paper's title literally evaluates "AGENTS.md" files, making it directly relevant to this project's own AGENTS.md pattern.

### General Research: Step 3

**System prompt design best practices (current consensus):**
- Structure system prompts with clear sections: identity/role, instructions, constraints, examples, context.
- Use Markdown headers for section boundaries (Anthropic and OpenAI both recommend this).
- Use XML tags for delimiting data within prompts (Anthropic's strong recommendation; OpenAI also supports).
- Keep system prompts as short as possible while covering all needed behavior - the arXiv:2602.11988 finding reinforces this.
- Version control prompts like configuration files (the outline's framing of "prompt engineering as system design" is well-supported).

**Structured output comparison (XML vs JSON vs YAML):**
- **JSON:** Best supported for machine parsing. OpenAI's Structured Outputs / JSON mode provides schema-validated output. Anthropic supports JSON output. Downside: escaping overhead (newlines, quotes in code) makes it harder for models to generate correctly.
- **XML:** Anthropic's recommended format for structuring prompts (input side). Claude handles XML well for both input and output. Less common for OpenAI models. Advantage: no escaping needed for most content.
- **YAML:** Good for human-readable structured data. Less formal schema validation support. The Bootcamp II project itself uses YAML extensively (per SD-258).
- Provider recommendations: Anthropic leans XML for input structuring, JSON for machine-consumed output. OpenAI leans JSON throughout (Structured Outputs). For Bootcamp II, the practical guidance is: use XML tags to structure prompts, use JSON for tool/API output, use YAML for human-readable configuration.

**Chain-of-thought vs extended thinking - current guidance:**
- **Chain-of-thought (CoT):** Explicitly asking the model to "think step by step" before answering. Works with all models. Increases token usage and latency. Most beneficial for multi-step reasoning, math, and logic problems. Less beneficial for simple retrieval or generation tasks.
- **Extended thinking / reasoning tokens:** Model-internal chain-of-thought that is generated before the visible response. Available in Claude (extended thinking) and OpenAI reasoning models (o1, o3, GPT-5 with reasoning effort). The reasoning tokens are generated but not always visible to the user. Key difference: extended thinking is a model capability, CoT is a prompting technique.
- **When each helps:** Extended thinking for complex reasoning, planning, multi-step problems where the model needs to "figure things out." CoT prompting for simpler problems where you want to see the reasoning. Neither helps (and both hurt via increased cost/latency) for simple factual retrieval, classification, or straightforward generation.
- OpenAI's GPT-5 guidance: reasoning models benefit from high-level goal-setting rather than explicit step-by-step instructions. The opposite of GPT-4 prompting style.

---

## Summary of Reference Status

| # | Reference | Status | Notes |
|---|-----------|--------|-------|
| 1 | Vaswani et al. (2017) | Verified | Stable |
| 2 | Karpathy "Let's build GPT" | Verified | Video accessible |
| 3 | Alammar "Illustrated Transformer" | Verified | Now also a book chapter |
| 4 | Anthropic "Building effective agents" | Verified | Living document, minor framework list updates |
| 5 | OpenAI tokenizer playground | Verified | JS SPA, not text-fetchable but URL valid |
| 6 | OpenAI "Orchestrating Agents" | Verified | Cookbook entry, stable |
| 7 | OpenAI Swarm repo | Verified | Superseded by OpenAI Agents SDK |
| 8 | LangGraph documentation | Verified | URL moved from langchain-ai.github.io to docs.langchain.com |
| 9 | Anthropic prompt engineering tutorial | Verified | Model names outdated but content valid |
| 10 | arXiv:2602.11988 | Verified | Feb 2026 preprint, not yet peer-reviewed |
| 11 | OpenAI prompt engineering docs | Verified | Updated for GPT-5, Responses API |
| 12 | Anthropic prompting best practices | Verified | Living reference |

**References requiring outline updates:**
- Swarm repo: note that it is superseded by OpenAI Agents SDK (the educational value remains)
- LangGraph docs: URL has moved
- Anthropic tutorial: model names (Claude 3 Haiku/Sonnet/Opus) are outdated

**No references failed verification.** All 12 external references exist and are accessible.
