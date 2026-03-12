# Task 15: Write - Step 10: Governance, Process, and Enterprise Integration

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 05 (external refs for Step 10), Tasks 07, 10, 11, 12 (Steps 2, 5, 6, 7)
**Parallelizable with:** Task 16 (Step 11) - different topics, similar dependency depth
**Output:** `docs/bootcamp/step10-governance-process.md`

---

## Objective

Write the full Step 10 content: "Governance, Process, and Enterprise Integration."
EMERGING maturity - most components are established (CI/CD, git, Lean) but their
application to agentic engineering is emerging. Novel: bearing check, HOTL/HODL
spectrum as explicit dial, stowaway commit, review hydra, muster format.

Estimated target: 40-50k characters (~1200-1400 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - engineering loop, bearing check, macro workflow, HOTL/HODL
3. `docs/bootcamp/tasks/05-research-tier3-external/findings.md` - Helmreich, Womack & Jones, Nygard ADRs
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 772-851 - the Step 10 outline
5. `docs/bootcamp/step02-agent-architecture.md` - architecture patterns (governance context)
6. `docs/bootcamp/step05-tool-design.md` - CI/CD tools, gate integration
7. `docs/bootcamp/step06-verification-quality.md` - gate, verification pipeline, HOTL/HODL
8. `docs/bootcamp/step07-human-ai-interface.md` - human factor, CRM

## Content Structure

### Mandatory Sections

1. **Why This is Step 10** - Enterprise engineering has existing workflows, review
   cultures, compliance requirements. Agentic engineering must integrate with these,
   not replace them. This step is the bridge between "we have agents" and "we ship
   with agents in a way that satisfies auditors, security teams, and engineering culture."

2. **The engineering loop** - Read -> Verify -> Write -> Execute -> Confirm:
   - Do not infer what you can verify
   - Commits are atomic with conventional messages
   - Gate must be green before done
   - This loop applies equally to humans and agents

3. **Atomic changes** - One PR = one concern:
   - Agent-generated commits must be individually revertible
   - The stowaway commit anti-pattern: 67 files, 6 concerns, one commit
   - Why atomic matters more for agents: agents don't self-limit scope the way
     experienced humans do (without explicit constraint)
   - Decomposition as a skill: how to break agent tasks into atomic units

4. **Review protocols** - Reviewer != author:
   - Applies with additional force to agent-generated code
   - The review hydra: 28 files, 25 issues, one "address review" commit
   - Review checklist: does what it says? does anything it doesn't say?
     edge cases? follows patterns? error handling? architecture and intent?
   - Findings resolved BEFORE merge, not in follow-up PRs

5. **The HOTL/HODL spectrum:**
   - HOTL: human out the loop, machine speed, plan -> execute -> review
   - HODL: human grips the wheel, every step reviewed
   - The dial: HOTL when the gate can verify, HODL when it requires taste
   - This is the primary governance decision for each task type
   - Sliding the dial requires explicit decision, not drift

6. **Integration with existing CI/CD:**
   - Agents as participants in existing workflows, not replacements
   - Pull request as the integration boundary
   - Gate as the trust boundary
   - How agent-generated PRs interact with existing review processes

7. **Team adoption patterns** - Incremental trust building:
   - Level 1: code completion (autocomplete)
   - Level 2: single-file agents (write a function to spec)
   - Level 3: multi-file orchestration (implement a feature)
   - Level 4: autonomous pipeline tasks (CI/CD agents)
   - Each level proves capability before expanding scope

8. **Change management** - Readback and decision tables:
   - Readback (CRM, Helmreich 1999): instruction -> readback -> verify -> act
   - 40+ years of empirical validation in aviation
   - Applied to human-agent communication: tell agent, agent echoes understanding,
     verify understanding, then execute
   - Muster format: decision table with number, question, default, Operator's call
   - O(1) binary decisions per row

9. **Bearing checks** - Repeatable governance units:
   - Spec drift: search spec against implementation
   - Eval validity: criteria still reachable?
   - Plan accuracy: completed table current? dependencies valid?
   - Gate health: all tests pass? no regressions?
   - Backlog sync: items relevant? priorities correct?
   - Cost: ~15 agent-minutes. Drift cost is always higher.

10. **Pull-based review** - Kanban pull for human-AI communication:
    - Human controls when agent output is reviewed
    - Agents do not interrupt
    - Review batching: process accumulated output at human-chosen intervals

### Challenges

Design 5-6 challenges:
- Atomic decomposition (easy - given a feature, decompose into atomic PRs)
- Review protocol exercise (medium - review an agent-generated PR using the checklist)
- HOTL/HODL assessment (medium - given 10 tasks, classify each as HOTL or HODL)
- Bearing check execution (medium - run a bearing check on an existing project)
- Readback protocol implementation (hard - implement readback in an agent workflow)
- Adoption roadmap (hard - design a team adoption plan from Level 1 to Level 4)

### Field Maturity

`> FIELD MATURITY: EMERGING` - Components are established (CI/CD, git, Lean, CRM).
Application to agentic engineering is emerging. Novel: bearing check, HOTL/HODL as
explicit dial, stowaway commit/review hydra as named anti-patterns, muster format.

## Quality Constraints

- No emojis, no em-dashes
- CRM readback must be presented with its empirical validation (40+ years aviation)
- The HOTL/HODL spectrum must be practical, not theoretical
- Bearing check should be presented as a runnable procedure, not an abstract concept
- Team adoption patterns should be realistic about resistance and risk
