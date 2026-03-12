# Task 08: Write - Step 3: Prompt Engineering as System Design

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 03 (external refs for Step 3), Task 06 (Step 1)
**Parallelizable with:** Task 07 (Step 2) - both depend only on Step 1
**Output:** `docs/bootcamp/step03-prompt-engineering.md`

---

## Objective

Write the full Step 3 content: "Prompt Engineering as System Design." Field maturity
is ESTABLISHED for core practices, EMERGING for advanced patterns. Novel contribution:
AGENTS.md as canonical grounding document, L8 saturation threshold, working set concept.

Estimated target: 40-50k characters (~1200-1400 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - L8 layer, working set, AGENTS.md pattern
3. `docs/bootcamp/tasks/03-research-tier1-external/findings.md` - Anthropic tutorial, ACI design, arXiv:2602.11988
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 247-314 - the Step 3 outline
5. `docs/bootcamp/step01-llm-mechanics.md` - Step 1 (context window concepts to reference)

## Content Structure

### Mandatory Sections

1. **Why This is Step 3** - Prompts are versioned artifacts in enterprise contexts, not
   ad-hoc strings. Same rigor as configuration files. Link to Step 1 (understanding
   what the prompt becomes - tokens in a context window).

2. **System prompts as specifications** - Not conversation starters. Role definitions
   and behavioural constraints. Primacy position in context window (from Step 1) and
   why it matters (first tokens get strongest attention).

3. **Structured output** - XML, JSON, YAML as output formats. When each is appropriate:
   - XML: natural for LLMs (trained on web), good for nested structure, no escaping issues
   - JSON: good for programmatic consumption, escaping overhead, strict syntax
   - YAML: human-readable, good for configuration-style output, indentation sensitivity
   - Markdown: natural default, good for prose-heavy output

4. **Few-shot patterns** - When to use examples, how many, how to select. The
   diminishing returns curve. Over-fitting to examples vs learning the pattern.

5. **Role prompting** - Functional constraint vs decoration. "You are a helpful
   assistant" (decoration) vs "You are a code reviewer who reports findings in YAML
   format, one finding per entry, severity rated 1-5" (functional constraint).

6. **Agent-Computer Interface (ACI) design** - Anthropic's insight: tool definitions
   deserve as much engineering as prompts. Parameter naming. Documentation quality.
   Poka-yoke: make it hard to make mistakes. The SWE-bench finding.

7. **Chain-of-thought and extended thinking** - When to request reasoning. When it
   helps (complex logic, multi-step problems). When it hurts (simple tasks, increased
   cost, slower response). Extended thinking as a toggle.

8. **The AGENTS.md pattern** - How to structure grounding documents that persist
   across sessions. What belongs where:
   - System prompt: identity, role constraints, communication protocol
   - Conversation: task-specific instructions, current context
   - Disk (AGENTS.md): standing policy, vocabulary, conventions, architectural boundaries
   - The AGENTS.md file itself as a worked example (this project's is ~800 lines)

9. **Anti-pattern: prompt engineering as substitute for system design** - When the
   fix is architectural (use a different pattern from Step 2) not linguistic (reword
   the prompt). Prompt engineering is necessary but not sufficient.

### Layer Model Integration

- L8 agent role: system prompt + role file + grounding documents
- Primacy position: first tokens in context get strongest attention weight
- Saturation threshold: more role content is not monotonically better
  (arXiv:2602.11988 - unnecessary context files reduce task success, increase cost 20%)
- Working set: minimum context for correct output, not maximum available context

### Challenges

Design 4-6 challenges:
- System prompt comparison (easy - write two versions of same role, compare output)
- Structured output exercise (medium - get an LLM to output valid YAML for a schema)
- ACI design exercise (medium - design a tool schema with good parameter names/docs)
- AGENTS.md creation (hard - write a grounding document for a specific project)
- Saturation experiment (hard - progressively add context, measure output quality)

### Field Maturity

`> FIELD MATURITY: ESTABLISHED` for core practices (structured output, few-shot, role prompting).
`> FIELD MATURITY: EMERGING` for ACI design, AGENTS.md pattern, saturation threshold.

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Distinguish clearly between what Anthropic/OpenAI teach and what this project adds
- AGENTS.md references should point to the actual file, which students can read as a worked example
- Challenges should use real API calls where possible
