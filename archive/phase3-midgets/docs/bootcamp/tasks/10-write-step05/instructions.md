# Task 10: Write - Step 5: Tool Design and Agent-Computer Interfaces

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 04 (external refs for Step 5), Task 07 (Step 2), Task 08 (Step 3)
**Parallelizable with:** Task 09 (Step 4) - different dependency chains
**Output:** `docs/bootcamp/step05-tool-design.md`

---

## Objective

Write the full Step 5 content: "Tool Design and Agent-Computer Interfaces." EMERGING
maturity - Anthropic's ACI concept is published but tool design discipline is still
forming. Novel contribution: L7 as empirical contact with reality, gate-as-a-tool,
context cost of tool results.

Estimated target: 35-45k characters (~1000-1300 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - L7 layer, gate concept
3. `docs/bootcamp/tasks/04-research-tier2-external/findings.md` - ACI, MCP, function calling
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 398-460 - the Step 5 outline
5. `docs/bootcamp/step02-agent-architecture.md` - agent patterns (tool use in context)
6. `docs/bootcamp/step03-prompt-engineering.md` - ACI intro from prompt perspective

## Content Structure

### Mandatory Sections

1. **Why This is Step 5** - Tools are the agent's interface to reality. Poor tool
   design is the most common source of agent failure in production (per Anthropic).
   Enterprise systems have existing APIs, databases, CI/CD - tools must integrate
   without creating attack surfaces.

2. **Tool design as engineering** - ACI deserves the same attention as HCI.
   Anthropic's SWE-bench finding: more time optimising tools than the overall prompt.
   The tool schema is a contract between the model and the system.

3. **The tool schema** - Function signatures as contracts:
   - Parameter naming (descriptive, unambiguous, consistent)
   - Type annotations (explicit, validated at boundary)
   - Documentation quality (description, examples, edge cases)
   - Default values and required vs optional

4. **Poka-yoke for tools** - Make mistakes hard:
   - Absolute paths instead of relative
   - Explicit parameter types instead of string-for-everything
   - Validation at the boundary, not in the handler
   - Constrained enums instead of free-form strings
   - Example from Anthropic: file editing tool with line-level precision

5. **Read-only vs write tools** - Principle of least privilege:
   - Separate read tools (safe, idempotent) from write tools (destructive, non-idempotent)
   - Multi-step authorisation for destructive operations
   - The "do not infer what you can verify" principle = prefer read tools

6. **Tool result injection** - Every tool result costs context budget:
   - Heavy tool use accelerates L3 saturation
   - Design tool outputs to be concise and information-dense
   - Truncation strategies for large results
   - The format problem: full file vs diff vs summary

7. **MCP (Model Context Protocol)** - What it standardises:
   - Protocol for tool integration across providers
   - Server/client architecture
   - What it solves (interoperability) and what it doesn't (tool quality)
   - Current adoption state

8. **Verification tools** - The gate as a tool:
   - Linters, type checkers, test runners, build systems as agent tools
   - The quality gate is not separate from the agent workflow
   - The agent that runs its own tests has a verification channel
   - "Do not infer what you can verify" operationalised through tools

9. **Git as audit channel** - Not only a write tool. Git log, git diff, git blame
   as read-only verification and provenance tools. The commit as an audit record.

### Layer Model Integration

- L7 tools: model requests execution, harness executes, result appends to context
- L7 is the model's only empirical contact with reality
- Tool results flow through L3 (context) - every result costs budget
- Connection to L6 (harness orchestrates tool access)

### Challenges

Design 4-6 challenges:
- Tool schema design (easy - design a schema for a file search tool)
- Poka-yoke audit (medium - review an existing tool schema, identify error-prone params)
- Context cost measurement (medium - measure context consumption of tool-heavy workflow)
- MCP server implementation (hard - build a simple MCP server for a specific use case)
- Gate integration (hard - build a workflow where the agent runs and interprets its own tests)

### Field Maturity

`> FIELD MATURITY: EMERGING` - ACI concept published (Anthropic), MCP standardised, but
tool design discipline still forming. Novel: L7 as empirical contact, gate-as-tool,
context cost awareness.

## Quality Constraints

- No emojis, no em-dashes
- Code examples should show real tool schemas (JSON function definitions)
- MCP examples should use current spec version
- Poka-yoke examples should be concrete and convincing, not abstract
- Reference Bootcamp I Steps 2-3 (shell, filesystem) as the substrate tools work on
