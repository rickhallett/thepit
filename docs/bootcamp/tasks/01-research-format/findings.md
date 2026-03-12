# Bootcamp I Format and Conventions - Research Findings

**Task:** 01-research-format
**Date:** 2026-03-10
**Input:** All 12 Bootcamp I steps (01-12), README.md, scriptease-config.md
**Purpose:** Prime context for write-task agents producing Bootcamp III steps.
A write-task agent loading this file should be able to produce structurally
consistent output without reading the original exemplars.

---

## 1. Document Structure Template

Every step follows a consistent skeleton. The exact heading names vary slightly, but the
ordering and hierarchy are stable across all 12 steps.

### 1.1 Header Block

The file opens with an H1 title, metadata lines, and a horizontal rule. Two patterns exist:

**Pattern A (step 01 only - legacy):**

```markdown
# Step 1: The Unix Process Model

**File Descriptors, Pipes, and Signals**

Step 1 of 12 in the Agent-Native Engineering Bootcamp.
Estimated total time: 4-6 hours.

---
```

**Pattern B (dominant - 11 of 12 steps):**

```markdown
# Step 7: Git Internals - Beyond Porcelain Commands

**Estimated time:** 4 hours
**Prerequisites:** Step 3 (filesystem as state) - you need the inode/directory/symlink model
**Leads to:** Step 8 (process observation)

---
```

Use Pattern B for all new steps. The metadata fields:

| Field | Required | Notes |
|-------|----------|-------|
| Estimated time | Yes | Single value ("4 hours") or range ("4-6 hours") |
| Prerequisites | Yes | Specific step numbers with parenthetical topic summaries |
| Leads to | Recommended | Present when the step has clear downstream dependencies |
| You will need | Optional | Tools/environment requirements when non-obvious |

### 1.2 Section Ordering

The canonical order, derived from comparison across all 12 steps:

```
1. # Step N: Title - Subtitle
2. (metadata block)
3. ---
4. ## Why This Step Exists                    [REQUIRED]
5. ---
6. ## Table of Contents                       [REQUIRED]
7. ---
8. ## 1. First Content Section (~time)        [REQUIRED, numbered]
9. ## 2. Second Content Section (~time)
10. ... (numbered content sections)
11. ## Challenge: Title (or grouped Challenges section)  [REQUIRED]
12. ## Key Takeaways / Summary                [RECOMMENDED]
13. ## Recommended Reading / References        [RECOMMENDED]
14. ## What to Read Next                       [RECOMMENDED]
```

**Closing section combinations observed:**

| Pattern | Steps |
|---------|-------|
| Key Takeaways + Recommended Reading + What to Read Next | 01, 09 |
| Key Takeaways + What to Read Next + References | 08 |
| Summary + What to Read Next + References | 07 |
| Summary + What to Read Next | 03, 06 |
| What to Read Next only | 02, 04, 05, 12 |
| Key Takeaways + Recommended Reading (no What to Read Next) | 10, 11 |

**Minimum required for new steps:** At least two of {Summary/Key Takeaways, Reading/References, What to Read Next}.

### 1.3 Horizontal Rule Placement

Horizontal rules (`---`) appear:
- After the header metadata block
- After the "Why" section
- After the Table of Contents
- Between each numbered content section
- Between each challenge section

They do NOT appear within a content section (between subsections).

---

## 2. Section Conventions

### 2.1 "Why This Step Exists" Section

Appears immediately after the header block, before the ToC. Motivational and
dependency-aware.

**Naming convention (varied):**

- `## Why This is Step N` - steps 01, 12 (uses the step number)
- `## Why This Step Exists` - steps 03, 04, 07, 08, 09, 11 (most common)
- `## Overview` - steps 05, 06, 10 (functionally equivalent)

Step 02 is an outlier: no Why section, goes directly to ToC.

**Use `## Why This Step Exists` for new steps** unless the step number itself carries
pedagogical meaning.

**Content pattern:**

1. Open with a strong declarative statement about relevance to agentic engineering
2. State concrete failure modes the learner will be equipped to diagnose
3. Reference specific project artifacts (Makefile lines, standing orders) where applicable
4. Connect to prerequisites and downstream dependencies
5. Close with a single-sentence goal statement

**Concrete example** (07-git-internals.md, lines 9-31):

```markdown
## Why This Step Exists

Git is the most important tool in the agentic engineering stack. Agents make git operations
hundreds of times per session: add, commit, push, branch, merge, diff. When those operations
produce unexpected results - a detached HEAD, a merge conflict, lost commits, a dirty index -
porcelain commands show you symptoms. Plumbing commands show you the actual object state.

This project uses git plumbing directly in production:

- The Makefile uses `git write-tree` to compute a tree hash as an identity for staged content
  (Makefile:38). This solves the "SHA paradox" - you cannot include your own commit SHA in
  your content because the SHA changes when content changes, but you CAN use the tree hash
  of staged content.
- The POLECAT wrapper uses `git rev-parse HEAD` and `git diff --stat` for delta detection
  (Makefile:53-71). Before and after a polecat runs, the wrapper compares HEAD, diff output,
  and untracked files. If nothing changed, the polecat produced no delta - a noop.

The goal: make git's object model transparent so that every agent git operation can be
verified at the object level, not just the porcelain level.
```

**Key traits:**
- Opens with a strong declarative statement, not throat-clearing
- References specific project artifacts with file:line references
- States concrete failure modes
- Ends with a single-sentence goal
- 3-5 paragraphs, 15-30 lines

### 2.2 Table of Contents

Numbered list with anchor links and time estimates in parentheses.

```markdown
## Table of Contents

1. [What is a Process](#1-what-is-a-process) (~30 min)
2. [fork/exec: The Two-Step Creation](#2-forkexec-the-two-step-creation) (~45 min)
3. [File Descriptors](#3-file-descriptors) (~45 min)
4. [Pipes](#4-pipes) (~45 min)
5. [Signals](#5-signals) (~30 min)
6. [Process Lifecycle and Exit Codes](#6-process-lifecycle-and-exit-codes) (~45 min)
7. [Challenges](#7-challenges) (~60-90 min)
8. [What to Read Next](#8-what-to-read-next)
```

Time estimates use `(~N min)` format. Challenges get a range `(~60-90 min)`. Non-timed
closing sections (What to Read Next, References) have no time estimate.

### 2.3 Content Sections

**Heading format:** `## N. Section Title` with time estimate on the next line:

```markdown
## 3. File Descriptors

*Estimated time: 45 minutes*
```

Time estimates use `*Estimated time: N minutes*` in italics. Some steps use bold instead.
Italics is more common. H3 subsections do NOT get time estimates.

**Internal structure - the canonical flow:**

1. Opening paragraph - what the concept IS, stated directly. Often corrects a
   common shallow understanding.
2. Mechanism - how it works at the kernel/system level. Data structures, syscalls,
   algorithms.
3. Subsections (### level) - break the concept into specific aspects.
4. Concrete examples - runnable code blocks demonstrating the mechanism.
5. Agentic grounding blockquote - how this connects to agent engineering.
6. Horizontal rule (`---`) separating from the next section.

**Example section opening** (01-process-model.md, lines 41-51):

```markdown
## 1. What is a Process

*Estimated time: 30 minutes*

Most people learn that a process is "a running program." This is like saying a car is
"a moving engine." It is not wrong, but it is too shallow to be useful.

A process is a **kernel data structure**. On Linux, this is `struct task_struct`, defined
in `include/linux/sched.h` in the kernel source. It is approximately 6-8 KB of bookkeeping
that the kernel maintains for every running, sleeping, stopped, or zombie task on the
system. It contains:
```

**Traits to replicate:**
- First paragraph often corrects a misconception ("Most people learn... This is too shallow")
- Immediately goes to the actual mechanism (kernel data structure, syscall, etc.)
- Bold for key terms on first introduction
- Lists for enumerating components of a data structure or concept
- Content sections are 80-150 lines including code blocks
- Subsections (### Title) are 20-60 lines

### 2.4 Agentic Grounding Blockquotes

Connect the preceding technical content to agentic engineering practice. Appear at the
end of a content section or substantial subsection.

**Format:**

```markdown
> **AGENTIC GROUNDING:** When an agent spawns a subprocess and you need to understand
> what it is doing, `/proc/$PID/` is your primary diagnostic tool. You can inspect its
> open file descriptors, its memory usage, its current working directory, its command
> line arguments, and its environment variables without attaching a debugger or modifying
> the process. Agents never check these. You should check them routinely.
```

**Rules:**
- Always a blockquote (`>` prefix)
- Opens with `> **AGENTIC GROUNDING:**` (bold label, colon, space)
- 2-5 sentences. Not longer.
- Always specific, never generic
- Focuses on one of:
  (a) what agents get wrong (specific failure mode)
  (b) what the Operator can do that agents cannot (diagnostic advantage)
  (c) how this connects to project-specific practices (Makefile, POLECAT, standing orders)

**Second example** (07-git-internals.md, lines 427-432):

```markdown
> **AGENTIC GROUNDING:** When you use `git cat-file -p HEAD`, you see exactly what tree
> the commit points to. You can then `git ls-tree` that tree to see every file,
> recursively. This is how you verify that an agent's commit contains exactly what it
> should. If an agent claims it only changed `lib/auth/login.ts` but the tree diff shows
> changes in `lib/bouts/scoring.ts`, you have a discrepancy. The plumbing commands give
> you the ground truth; the porcelain gives you the agent's narrative about that truth.
```

**Frequency across all 12 steps:**

| Step | Count |
|------|-------|
| 01, 03, 08, 12 | 9 each |
| 02, 07 | 8 each |
| 10 | 7 |
| 04, 09, 11 | 5-6 each |
| 05 | 5 |
| **Target** | **6-8** |

### 2.5 History Blockquotes

Short historical context that creates memory anchors. Not decoration - structurally
relevant stories about why something was designed a certain way.

**Format:**

```markdown
> **HISTORY:** Doug McIlroy had been thinking about connecting programs together since
> 1964, when he wrote a memo proposing that programs should be connected "like garden
> hoses - screw in another segment when it becomes necessary to massage data in another
> way." But pipes did not exist in Unix until 1973. Ken Thompson implemented them in a
> single night after McIlroy's persistent advocacy. The next morning, the entire Unix
> group at Bell Labs rewrote their programs to use pipes. The PDP-11's limited memory
> (typically 64-256 KB) made pipes practical rather than theoretical - you could not hold
> an entire file in memory, so streaming data between programs was not just elegant, it
> was necessary.
```

**Rules:**
- Always a blockquote (`>` prefix)
- Opens with `> **HISTORY:**` (bold label, colon, space)
- 2-8 sentences
- Names specific people, dates, and systems
- Connects the historical context to a design decision relevant to the section
- Never decorative trivia - always explains a "why"

**Frequency across all 12 steps:**

| Step | Count |
|------|-------|
| 02, 12 | 5-6 |
| 04, 09, 10, 11 | 4-5 |
| 01, 03, 05, 06, 07, 08 | 2-3 |
| **Target** | **2-4** |

### 2.6 Challenge Sections

Hands-on exercises that test specific concepts from the content sections. Appear after
all content sections.

**Two structural patterns observed:**

**Pattern A - Numbered subsections under a parent (steps 01, 08, 09, 10, 11):**

```markdown
## 7. Challenges

*Estimated time: 60-90 minutes total*

---

### Challenge 1: Explore /proc/self

*Estimated time: 10 minutes*

[Challenge content]

---

### Challenge 2: Build a Pipe by Hand

*Estimated time: 15 minutes*

[Challenge content]
```

**Pattern B - Individual H2 sections (steps 02, 03, 04, 05, 06, 07, 12):**

```markdown
## Challenge: Build a Commit by Hand

**Estimated time: 20 minutes**

**Goal:** Create a complete git commit using only plumbing commands.

[Challenge content]

---

## Challenge: Object Archaeology

**Estimated time: 15 minutes**

**Goal:** Trace through the object graph of a real commit.

[Challenge content]
```

Pattern B is more common (7 of 12 steps). Use Pattern B for new steps unless the
challenges form a single coherent sequence.

**Challenge internal structure:**

1. Title naming the activity (not "Exercise 1" but "Build a Pipe by Hand")
2. Time estimate (10-30 minutes each)
3. Goal statement (1-2 sentences, present in Pattern B with `**Goal:**`)
4. Setup commands (if needed)
5. Step-by-step instructions with code blocks
6. Verification criteria (`**Verification:**`, `**Expected output:**`, `**What you are learning:**`)
7. Optional: `<details><summary>Hints</summary>` collapsible blocks
8. Optional: Stretch goals (`**Stretch goal:**` or `**Extension:**`)
9. Optional: closing `> **AGENTIC GROUNDING:**` blockquote

**Challenge counts across all 12 steps:**

| Step | Challenges |
|------|-----------|
| 01, 02, 03, 05, 06, 07, 10, 11, 12 | 6 each |
| 09 | 6 |
| 04 | 7 (+ 1 notebook) |
| 08 | 4 |
| **Target** | **6** |

**Traits of good challenges:**
- Each exercises ONE specific concept, not a grab-bag
- Real system operations (build a pipe by hand, create a zombie, trace syscalls), not toy exercises
- Include enough code that the learner focuses on understanding, not typing
- Tell the learner what success looks like
- Time estimates: 10-30 minutes per challenge

### 2.7 "What to Read Next" Section

Bridges to the next step in the dependency graph. Names the next step, previews its
content, and explains the dependency connection.

```markdown
## What to Read Next

**Step 2: The Shell Language** - Bash is not a scripting language bolted onto a terminal.
It is a process launcher with a programming language bolted on. Step 2 covers: quoting
rules (why spaces in filenames break everything), variable expansion, command substitution
(`$(...)` forks a subshell), word splitting, globbing, and the difference between `[` and
`[[`. Every concept in Step 2 is built on the process model from Step 1. The shell's job
is to call fork(), exec(), pipe(), dup2(), and wait() - the "scripting" is the control
flow that decides which syscalls to make and in what order.
```

**Pattern:** Bold the next step name, give a one-sentence reframe, list key topics,
connect back to the current step's concepts. 5-15 lines.

### 2.8 Key Takeaways / Summary

Either a numbered list of self-test questions (step 01) or a summary table (step 07).

**Question list pattern:**

```markdown
## Key Takeaways

Before moving to Step 2, you should be able to answer these questions without
looking anything up:

1. What is a process, structurally? (Not "a running program" - what data does the kernel
   maintain?)
2. Why does Unix split process creation into fork() and exec()? ...
...
10. If `curl` fails in `curl url | jq '.field'`, what does `$?` report? Why?
```

**Table pattern:**

```markdown
## Summary

| Concept | What it is | Why it matters |
|---------|-----------|---------------|
| Content addressing | SHA-1 hash of content = object name | Deduplication, integrity, immutability |
| Blob | File content (no name, no permissions) | The atomic unit of storage |
...
```

Either works. Question list is more challenging for the reader. Table is more reference-oriented.

### 2.9 References / Recommended Reading

Books with specific editions and chapter numbers, man pages, and primary sources. Never
generic "check out these resources" lists.

```markdown
## Recommended Reading

- **The Design of the UNIX Operating System** - Maurice Bach (1986). Chapter 7 (Process
  Control) and Chapter 10 (The I/O Subsystem) cover everything in this step at the kernel
  implementation level.

- **Advanced Programming in the UNIX Environment** - W. Richard Stevens, Stephen Rago
  (3rd edition, 2013). Chapters 3 (File I/O), 8 (Process Control), and 10 (Signals).

- **`man 2 fork`**, **`man 2 exec`**, **`man 2 pipe`**, **`man 7 signal`** - the actual
  specifications. Read the man pages. They are precise.
```

---

## 3. Voice and Quality Bar

### 3.1 Prose Style

- **Direct.** No hedging, no "it should be noted that", no "let's explore."
- **Technical.** Uses kernel data structure names, syscall names, POSIX terms.
- **No filler.** Every sentence explains a mechanism, provides an example, or connects
  to the agentic context.
- **No sycophancy.** No "great question" or "you might be wondering."
- **Declarative, not instructional.** "A file descriptor is an integer" not "You should
  know that a file descriptor is an integer."
- **Corrective.** Opens sections by correcting shallow understanding: "Most people learn
  X. This is too shallow to be useful."
- **Opinionated where warranted.** "If an agent generates a script without this header,
  it is a defect."
- **Contractions allowed** but sparingly. "does not" is more common than "doesn't."
- **Imperative for exercises.** "Open a terminal and run:", "Write a Python script that:"
- **No em-dashes.** Uses " - " (space hyphen space) for parenthetical asides.
- **No emojis.** None, ever. Standing order SD-319, permanent.

### 3.2 Depth Level

Explanations go to the kernel/syscall level, not CLI usage level. The quality bar:

- **Wrong depth:** "Use `ls -la` to see file details."
- **Shallow:** "File descriptors are numbers that represent open files."
- **Correct depth:** "A file descriptor is an integer index into a per-process table
  maintained by the kernel. Each entry points to a kernel-internal 'file description'
  containing the current file offset, access mode, status flags, and a reference to the
  underlying kernel object."

The pattern: name the kernel data structure, explain what it contains, show how to
observe it (usually via `/proc` or a plumbing command), then connect to practical impact.

Additional calibration examples:

- A process is `struct task_struct`, not "a running program"
- A pipe is "a unidirectional byte stream with a kernel-managed buffer"
- A container is "a process with three restrictions applied by the kernel"
- Git is "a content-addressable filesystem" built from four object types

### 3.3 Historical Context Usage

Short, specific, structurally relevant. Never trivia.

- **Good:** "Ken Thompson implemented [pipes] in a single night... The PDP-11's limited
  memory (typically 64-256 KB) made pipes practical rather than theoretical."
  (Explains WHY the design exists)
- **Bad:** "Pipes were invented at Bell Labs in the 1970s."
  (Generic trivia, no structural insight)

Names people (Thompson, Ritchie, McIlroy, Torvalds), cites dates, connects to a
design decision the reader can reason about.

### 3.4 Code Examples

- All code is runnable on Linux (Arch, Debian, Ubuntu)
- `printf` is used instead of `echo` in all bash examples (per standing order)
- Comments in code are terse, explain "why" not "what"
- Python uses `#!/usr/bin/env python3` shebang
- Bash uses `#!/usr/bin/env bash`
- Code blocks include language tags: ` ```bash `, ` ```python `, ` ```makefile `
- Output shown as comments within or below code blocks
- 2 spaces indentation
- Multi-step demonstrations use numbered comments

---

## 4. Conventions List

### 4.1 Formatting

| Convention | Rule | Example |
|-----------|------|---------|
| Indentation | 2 spaces in code blocks | All code examples |
| H1 | Document title only, exactly one per file | `# Step 7: Git Internals` |
| H2 | Major sections: numbered for content, named for challenges and closing | `## 3. File Descriptors` |
| H3 | Subsections within H2 | `### The fd Table` |
| H4 | Rarely used, only within complex subsections | Avoid for new steps |
| Horizontal rules | Between header/Why, Why/ToC, ToC/first section, between all H2 sections | `---` on its own line |
| Bold | Key terms on first use, emphasis | `**kernel data structure**` |
| Italics | Time estimates, book titles | `*Estimated time: 30 minutes*` |
| Code inline | Commands, paths, syscalls, variables | `` `fork()` ``, `` `/proc/self/` `` |
| Code blocks | All examples, with language tag | ` ```bash ` |
| Tables | Structured comparisons (signals, file types, modes) | Always have headers |

### 4.2 Blockquote Types

| Type | Marker | Purpose | Frequency per step |
|------|--------|---------|-------------------|
| Agentic grounding | `> **AGENTIC GROUNDING:**` | Connect to agentic engineering practice | 6-8 |
| History | `> **HISTORY:**` | Historical context with structural insight | 2-4 |
| Field maturity | `> **FIELD MATURITY:**` | New for Bootcamp II/III - maturity assessment | Not in Bootcamp I |
| Slopodar | `> **SLOPODAR:**` | New for Bootcamp II/III - anti-pattern connection | Not in Bootcamp I |

All blockquote types use the same structural pattern: bold label, colon, 2-5 sentences
(HISTORY can go to 8), concrete and specific. Never generic.

### 4.3 Challenge Formatting

| Element | Convention |
|---------|-----------|
| Header | `## Challenge: Name` (H2) or `### Challenge N: Name` (H3 under parent) |
| Time | `**Estimated time: N minutes**` or `*Estimated time: N minutes*` |
| Goal | `**Goal:** One sentence.` (present in Pattern B challenges) |
| Setup | Code block with setup commands if needed |
| Steps | Numbered steps or sequential code blocks with explanations |
| Verification | Explicit criteria: `**Verification:**`, `**Expected output:**`, `**What you are learning:**` |
| Hints/Solutions | `<details><summary>Hints</summary>` or `<details><summary>Solution</summary>` |
| Stretch | `**Stretch goal:**` or `**Extension:**` for advanced follow-ups |
| Closing | Optional `> **AGENTIC GROUNDING:**` blockquote |

### 4.4 Absolute Rules

From README.md, AGENTS.md, and standing orders:

- No emojis (SD-319, permanent)
- No em-dashes (SD-319, permanent) - use " - " or restructure
- `printf` not `echo` in all bash code examples (CLAUDE.md standing order)
- 2 spaces indentation in code blocks (README.md)
- All code runnable on Arch/Debian/Ubuntu (README.md)
- Challenges marked with `## Challenge:` headers (README.md)
- Agentic context marked with `> **AGENTIC GROUNDING:**` blockquotes (README.md)
- Historical notes marked with `> **HISTORY:**` blockquotes (README.md)

---

## 5. Target Metrics

### 5.1 Lines Per Step

| Step | File | Lines |
|------|------|-------|
| 05 | 05-python-cli-tools.md | 1,240 |
| 08 | 08-process-observation.md | 1,318 |
| 06 | 06-make-just-orchestration.md | 1,343 |
| 07 | 07-git-internals.md | 1,379 |
| 01 | 01-process-model.md | 1,440 |
| 03 | 03-filesystem-as-state.md | 1,449 |
| 10 | 10-networking-cli.md | 1,503 |
| 04 | 04-text-pipeline.md | 1,744 |
| 09 | 09-container-internals.md | 1,947 |
| 02 | 02-shell-language.md | 1,964 |
| 11 | 11-process-supervision.md | 2,205 |
| 12 | 12-advanced-bash.md | 2,283 |

| Statistic | Value |
|-----------|-------|
| Minimum | 1,240 |
| Maximum | 2,283 |
| Median | 1,449 |
| Mean | 1,651 |
| **Target range** | **1,300-1,600 lines** |

Under 1,200 is likely too thin. Over 2,000 is acceptable only for complex topics.

### 5.2 Sections Per Step

| Component | Range | Median | Target |
|-----------|-------|--------|--------|
| Total ## headings | 12-24 | ~17 | 15-20 |
| Numbered content sections | 6-10 | ~8 | 7-9 |
| Challenge sections | 4-7 | 6 | 6 |
| Closing sections | 1-4 | 2-3 | 2-3 |

### 5.3 Code Blocks Per Step

Code blocks (opening/closing fence pairs counted, divided by 2):

| Step | Approx code blocks |
|------|-------------------|
| 01 | 39 |
| 03 | 41 |
| 05 | 41 |
| 08 | 43 |
| 10 | 52 |
| 06 | 53 |
| 07 | 61 |
| 09 | 72 |
| 04 | 79 |
| 02 | 84 |
| 11 | 84 |
| 12 | 91 |

| Statistic | Value |
|-----------|-------|
| Range | 39-91 |
| Median | ~57 |
| **Target** | **40-70** |

### 5.4 Blockquotes Per Step

| Type | Min | Max | Median | Target |
|------|-----|-----|--------|--------|
| AGENTIC GROUNDING | 5 | 9 | 7 | 6-8 |
| HISTORY | 2 | 6 | 3-4 | 2-4 |

---

## 6. Complete Step Template

Copy this skeleton for new steps. Fill in bracketed sections.

```markdown
# Step N: Title - Subtitle

**Estimated time:** Xh
**Prerequisites:** Step M (topic), Step K (topic)
**Leads to:** Step P (topic)

---

## Why This Step Exists

[3-5 paragraphs. Open with declarative relevance statement. Reference specific
agent failure modes. Connect to project practices where applicable. State the
goal in one sentence at the end.]

---

## Table of Contents

1. [First Topic](#1-first-topic) (~NN min)
2. [Second Topic](#2-second-topic) (~NN min)
...
N. [Challenges](#challenges) (~60-90 min)
N+1. [What to Read Next](#what-to-read-next)

---

## 1. First Topic

*Estimated time: NN minutes*

[Opening paragraph - what the concept IS. Correct shallow understanding if needed.
Go immediately to the kernel/protocol/structural level.]

### Subsection A

[Mechanism - how it works internally. Data structures, syscalls, algorithms.]

```bash
# Concrete, runnable example
command --with-flags
# Expected output shown as comments
```

[Explanation of what the code demonstrates.]

### Subsection B

[Deeper mechanism, edge cases, or common misconception.]

> **HISTORY:** [2-8 sentences. Names, dates, specific technical context. Memory
> anchor, not decoration. Explains WHY the design is the way it is.]

> **AGENTIC GROUNDING:** [2-5 sentences. Specific agent failure mode this equips
> the learner to diagnose. References tools, commands, file paths. Never generic.]

---

## 2. Second Topic

*Estimated time: NN minutes*

[Same pattern: concept -> mechanism -> example -> grounding]

---

[... more content sections, target 7-9 total ...]

---

## Challenge: Descriptive Name

**Estimated time: NN minutes**

**Goal:** [Single sentence stating what the reader will build or demonstrate.]

[Setup code block if needed]

[Step-by-step instructions with code blocks]

**Verification:** [How to confirm success]

<details>
<summary>Hints</summary>

[Optional hints or solution]

</details>

**Extension:** [Optional harder follow-up]

---

[... more challenges, target 6 total ...]

---

## Key Takeaways

Before moving on, verify you can answer these questions without looking anything up:

1. [Self-test question about core concept]
2. [Self-test question about mechanism]
...
8-10. [Self-test question connecting to agentic context]

---

## Recommended Reading

- **Book Title** - Author (year). Chapter N (topic). [Brief annotation of relevance.]
- **`man N command`** - [What it covers.]

---

## What to Read Next

**Step P: Title** - [One sentence reframe of what the next step IS. Topics it covers.
Connection back to concepts from this step that compose into the next.]
```

---

## 7. Anti-Patterns to Avoid

Quality bar failures identified by analyzing what the existing steps do NOT do:

1. **No "gentle introduction" padding.** Steps open with what the concept IS, not with
   throat-clearing about why concepts are important in general.

2. **No CLI-level-only explanation.** "Run `git add` to stage files" is not enough.
   Explain what `git add` does at the object level (creates a blob, updates the index entry).

3. **No toy examples.** Challenges use real system operations (build a pipe by hand,
   create a zombie, trace syscalls), not "print hello world."

4. **No abstract agentic grounding.** "This is important for agents" is not agentic
   grounding. Name the specific failure mode, the specific diagnostic tool, the specific
   thing the Operator checks.

5. **No decorative history.** "Unix was created at Bell Labs" adds nothing. "Thompson
   implemented pipes in a single night after McIlroy's advocacy, because PDP-11 memory
   constraints made streaming between programs necessary rather than theoretical" is a
   memory anchor.

6. **No missing Why section.** Step 02 is the outlier that lacks it. Every new step
   must have the Why section.

7. **No missing verification in challenges.** Every challenge tells the reader how
   to confirm success.

8. **No em-dashes, no emojis.** Standing order SD-319, permanent.

9. **No `echo` in code examples.** Use `printf`. Standing order from CLAUDE.md.

10. **No untagged code blocks.** Every fenced code block gets a language tag.
