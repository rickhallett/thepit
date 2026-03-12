# Task 06: Write - Step 1: How LLMs Actually Work

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 03 (external refs for Step 1)
**Parallelizable with:** None (first write task, but Steps 2 and 3 can follow independently)
**Output:** `docs/bootcamp/step01-llm-mechanics.md`

---

## Objective

Write the full Step 1 content: "How LLMs Actually Work (For Engineers, Not Researchers)."
This is a Tier 1 (ESTABLISHED) step - the field covers this well. The novel contribution
is the layer model framing (L0-L5) and the operational consequences framing.

Estimated target: 40-55k characters (~1200-1500 lines), matching Bootcamp I step lengths.

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks/03-research-tier1-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 117-178 - the Step 1 outline

## Content Structure

Follow the format template from Task 01 findings. The outline specifies these topics:

### Mandatory Sections

1. **Why This is Step 1** - Frame: you cannot verify what you do not understand. Root
   cause analysis requires understanding the generation pipeline. Link to dependency
   graph (everything builds on this).

2. **Transformer architecture for engineers** - Attention mechanism at operational level.
   Not the math - the consequences. "Each token attends to all prior tokens" means
   attention cost is O(n^2), which means context window is a finite resource with
   economic and performance implications.

3. **Tokenisation** - What tokens are, why boundaries matter for code generation,
   the "one word is not one token" insight. Interactive exercise with tokenizer
   playground. Show code tokenisation surprises.

4. **The context window** - Finite resource with hard cap. Advertised length vs
   effective length. Primacy bias, recency bias, lost-in-the-middle effect.
   Connect to L3 in the layer model.

5. **Autoregressive generation** - Each token conditions the next. No lookahead,
   no revision. Why this matters for code quality (the model cannot go back and
   fix a design decision made 500 tokens ago). Connect to L4.

6. **Reasoning tokens vs output tokens** - What is observable at inference time.
   Extended thinking. The difference between tokens you pay for and tokens you see.

7. **RLHF and its consequences** - Where sycophancy comes from. Why models are
   helpful to a fault. The alignment tax on honesty. Frame as engineering
   constraint, not moral judgment.

8. **API mechanics** - Request/response, token counting, caching, streaming. The
   only fully calibrated layer (L5). Frame: this is your one reliable instrument.

9. **Model families** - Practical differences. When selection matters (adversarial
   review = use different families). When it doesn't (routine classification).

### Layer Model Integration

Explicitly map content to L0-L5:
- L0 WEIGHTS: frozen priors, RLHF, bias producing P(token|context)
- L1 TOKENISE: text to token IDs; budget is finite with hard cap
- L2 ATTENTION: each token attends to all prior; cost O(n^2); not observable
- L3 CONTEXT: utilisation, primacy/recency, lost-middle effects
- L4 GENERATION: autoregressive; no lookahead; no revision
- L5 API: the only calibrated layer (token counts are exact)

### Challenges

Design 4-6 challenges of increasing difficulty:
- Tokenisation exploration (easy - use tokenizer to see code tokenisation)
- Context window experiment (medium - demonstrate lost-in-the-middle)
- Token budget calculation (medium - estimate costs for a real workflow)
- Model comparison (hard - same prompt, multiple models, compare outputs structurally)
- Generation limitation exposure (hard - design a task that exposes autoregressive limits)

### Agentic Grounding

Use `> AGENTIC GROUNDING:` blockquotes after each major section. Connect to:
- Why understanding tokenisation helps diagnose code generation bugs
- Why context window mechanics matter for agent system design
- Why RLHF consequences matter for verification (sycophancy is an engineering constraint)
- Why the API layer is the only reliable instrument

### Field Maturity

Use `> FIELD MATURITY: ESTABLISHED` blockquote early. Most of this content is well-covered
by existing resources. The novel contribution is the operational framing and layer model
integration.

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Prose style matches Bootcamp I: direct, technical, no filler
- Historical context where relevant (Vaswani 2017, Karpathy) but not decorative
- Every section answers "why does this matter when agents write code?"
- Code examples runnable with standard LLM API access
