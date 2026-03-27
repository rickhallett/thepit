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
session id: 019cd854-4fd7-7912-bf98-2d4c6bdda186
--------
user
# Adversarial Review Dispatch
# Model: codex | Prompt: 7 | Name: slop-detector
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

The Slop Detector

Read the blog post at `sites/oceanheart/content/blog/2026-03-10-agentic-bootcamp.md` and 2-3 step files. The author claims the writing is low-slop and uses an anti-pattern taxonomy called the "slopodar" (available in `docs/internal/slopodar.yaml` if you want to read it).

**Your task:** Apply the slopodar to the bootcamp content. Look specifically for:
- Tally voice (enumeration as authority - "12 steps covering 7 domains")
- Epistemic theatre (performing seriousness without delivering - "the uncomfortable truth is...")
- Nominalisation (nouns pretending to be actions, metrically regular in an uncanny way)
- Epigrammatic closure (short punchy sentences at paragraph ends that sound profound but say nothing)
- Absence claims ("nobody has published this" - unfalsifiable)
- Redundant antithesis ("not A, but B" when B already implies not-A)

Rate the blog post and the step content separately. If the writing is genuinely clean, say so. If you find slop patterns, cite exact passages.

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

### File: `sites/oceanheart/content/bootcamp/01-process-model.md`

```
+++
title = "The Unix Process Model"
date = "2026-03-10"
description = "File descriptors, pipes, and signals. The kernel primitives that everything else composes on."
tags = ["linux", "processes", "pipes", "signals", "bootcamp"]
step = 1
tier = 1
estimate = "4-6 hours"
sample = true
bootcamp = 1
+++

Step 1 of 12 in the Agentic Engineering Bootcamp.

---

## Why This is Step 1

Every agent you steer operates on Linux. When an agent writes a shell pipeline, spawns
a subprocess, redirects output to a file, or checks an exit code, it is invoking the Unix
process model. The agent does not understand what it is invoking. You must.

This step has the highest compositional leverage of any step in the bootcamp. Shell
scripting (Step 2), text pipelines (Step 3), Make (Step 4), containers (Step 8), and
process observation (Step 9) all decompose into the primitives covered here. If your
understanding of the process model is shallow, every subsequent step builds on sand.

The goal is not to memorise syscall signatures. The goal is to build a mental model
accurate enough that when an agent constructs a pipeline that silently drops data, or
spawns a subprocess that becomes a zombie, or writes a cleanup script that cannot survive
SIGKILL, you can see the problem before it reaches production.

---

## Table of Contents

1. [What is a Process](#1-what-is-a-process) (~30 min)
2. [fork/exec: The Two-Step Creation](#2-forkexec-the-two-step-creation) (~45 min)
3. [File Descriptors](#3-file-descriptors) (~45 min)
4. [Pipes](#4-pipes) (~45 min)
5. [Signals](#5-signals) (~30 min)
6. [Process Lifecycle and Exit Codes](#6-process-lifecycle-and-exit-codes) (~45 min)
7. [Challenges](#7-challenges) (~60-90 min)
8. [What to Read Next](#8-what-to-read-next)

---

## 1. What is a Process

*Estimated time: 30 minutes*

Most people learn that a process is "a running program." This is like saying a car is
"a moving engine." It is not wrong, but it is too shallow to be useful.

A process is a **kernel data structure**. On Linux, this is `struct task_struct`, defined
in `include/linux/sched.h` in the kernel source. It is approximately 6-8 KB of bookkeeping
that the kernel maintains for every running, sleeping, stopped, or zombie task on the
system. It contains:

- **A PID** - a unique integer identifying this process. PIDs are allocated sequentially
  and recycled after a process is fully reaped. PID 1 is init (or systemd on modern
  systems). PID 0 is the idle task (swapper), which is not a real process but a kernel
  scheduling artifact.

- **A memory map** - the virtual address space: code segment, data segment, heap, stack,
  memory-mapped files, shared libraries. Each process has its own page table, which means
  two processes can have the same virtual addresses pointing to different physical memory.
  This is isolation. It is not optional.

- **A set of file descriptors** - integers that index into this process's fd table. More
  on this in Section 3. This is the process's interface to everything outside its own
  memory: files, pipes, sockets, devices, terminals.

- **A set of signal handlers** - functions (or default dispositions) that are invoked
  when the process receives a signal. More in Section 5.

- **A parent** - every process except PID 1 has a parent. The parent is the process that
  called `fork()` to create it. This creates a tree. Run `pstree` to see it.

- **A state** - one of: Running (R), Sleeping (S, interruptible; D, uninterruptible),
  Stopped (T), Zombie (Z). The state determines what the scheduler does with the process.

- **Credentials** - real UID/GID, effective UID/GID, supplementary groups. These
  determine what the process is allowed to do.

- **A current working directory** - yes, `cwd` is per-process kernel state, not a shell
  variable. When you `cd /tmp`, the shell calls `chdir("/tmp")`, which updates the
  process's `cwd` in the kernel.

### Making it Concrete: /proc/self/

`/proc` is a virtual filesystem. It does not exist on disk. The kernel synthesises its
contents on the fly when you read from it. `/proc/self/` is a magic symlink that always
points to the `/proc/$PID/` directory of whatever process is reading it.

Open a terminal and run:

```bash
# What is my PID?
printf '%s\n' "My PID: $$"

# What does /proc/self point to?
readlink /proc/self

# What are my open file descriptors?
ls -la /proc/self/fd/

# What is my memory map?
cat /proc/self/maps | head -20

# What was my command line?
cat /proc/self/cmdline | tr '\0' ' '; printf '\n'

# What is my current working directory?
readlink /proc/self/cwd

# What binary am I running?
readlink /proc/self/exe

# What are my environment variables?
cat /proc/self/environ | tr '\0' '\n' | head -10

# What is my process status?
cat /proc/self/status | head -20
```

Every field in `/proc/self/status` corresponds to a field in `task_struct`. The kernel
is showing you its own bookkeeping. When you read `VmRSS` (resident set size), you are
reading how much physical memory the kernel has allocated to this process's page tables.
When you read `Threads`, you are reading the thread group size. This is not abstraction.
This is the data structure.

> **AGENTIC GROUNDING:** When an agent spawns a subprocess and you need to understand
> what it is doing, `/proc/$PID/` is your primary diagnostic tool. You can inspect its
> open file descriptors, its memory usage, its current working directory, its command
> line arguments, and its environment variables without attaching a debugger or modifying
> the process. Agents never check these. You should check them routinely.

---

## 2. fork/exec: The Two-Step Creation

*Estimated time: 45 minutes*

Every process on a Linux system (except PID 1 and kernel threads) was created by
`fork()`. This is not one design among many. It is the design.

### The Problem

You want to run a new program. You need a new process for it (separate memory, separate
fds, separate PID). How do you create one?

### The Windows Answer: CreateProcess

Windows provides `CreateProcess()`, which takes the path to an executable, command-line
arguments, environment variables, security attributes, and about a dozen other parameters,
and in one call creates a new process running the specified program.

This is conceptually simple. It is also monolithic. If you want to set up the new
process's environment before it starts running (redirect its output, change its working
directory, set resource limits, close inherited file descriptors), you must pass all of
that configuration to `CreateProcess` as parameters. The API grows with every new thing
you might want to configure.

### The Unix Answer: Separate Creation from Execution

Unix splits the operation into two syscalls:

1. **`fork()`** - creates a new process that is an almost-exact copy of the calling
   process. Same memory contents (via copy-on-write), same file descriptors, same signal
   handlers, same everything. The only differences: the child gets a new PID, and `fork()`
   returns 0 to the child and the child's PID to the parent.

2. **`exec()`** (actually a family: `execve`, `execvp`, `execl`, etc.) - replaces the
   current process's program image with a new one. The PID stays the same. The fd table
   stays the same (unless fds are marked close-on-exec). The memory is replaced entirely
   with the new program's code and data.

Between `fork()` and `exec()`, the child process is running the parent's code but has
its own copy of everything. This is the window where you set things up. You can:

- Close file descriptors the child should not inherit
- Open new file descriptors (e.g., redirect stdout to a file)
- Change the working directory with `chdir()`
- Set environment variables
- Set resource limits with `setrlimit()`
- Change user/group IDs with `setuid()`/`setgid()`
- Create pipes and wire them up with `dup2()`

Then you call `exec()` and the new program inherits all of this setup. The new program
does not need to know about any of it. It just reads from fd 0 and writes to fd 1, and
the plumbing is already in place.

This is composition. The setup logic and the program logic are decoupled.

### Why This Matters for Pipes

When the shell executes `ls | grep foo`, it does the following (simplified):

```
1. Create a pipe: pipe(pipefd)    -- pipefd[0] = read end, pipefd[1] = write end
2. fork() -- child 1 (will become ls):
     a. dup2(pipefd[1], 1)        -- redirect stdout to pipe write end
     b. close(pipefd[0])          -- child doesn't need the read end
     c. close(pipefd[1])          -- original write end fd no longer needed (dup'd to 1)
     d. exec("ls")
3. fork() -- child 2 (will become grep):
     a. dup2(pipefd[0], 0)        -- redirect stdin to pipe read end
     b. close(pipefd[1])          -- child doesn't need the write end
     c. close(pipefd[0])          -- original read end fd no longer needed (dup'd to 0)
     d. exec("grep", "foo")
4. Parent closes both pipe fds    -- parent doesn't use the pipe
5. Parent wait()s for both children
```

Read this carefully. The pipe is created in the parent. The children inherit the pipe
fds via fork(). Each child redirects the appropriate end to stdin or stdout using dup2(),
closes the fds it does not need, and then exec()s the target program.

`ls` does not know it is writing to a pipe. It writes to fd 1 (stdout) as always. The
plumbing was set up before `ls` started running. This is the power of fork/exec
separation.

If Unix used a `CreateProcess`-style monolithic call, you would need to pass "redirect
stdout to this pipe fd" as a parameter. With fork/exec, you just... do it, using the
same syscalls you would use for any fd manipulation.

> **HISTORY:** Doug McIlroy had been thinking about connecting programs together since
> 1964, when he wrote a memo proposing that programs should be connected "like garden
> hoses - screw in another segment when it becomes necessary to massage data in another
> way." But pipes did not exist in Unix until 1973. Ken Thompson implemented them in a
> single night after McIlroy's persistent advocacy. The next morning, the entire Unix
> group at Bell Labs rewrote their programs to use pipes. The PDP-11's limited memory
> (typically 64-256 KB) made pipes practical rather than theoretical - you could not hold
> an entire file in memory, so streaming data between programs was not just elegant, it
> was necessary. The fork/exec split, which Thompson and Ritchie had already designed for
> other reasons, turned out to be exactly the mechanism pipes needed. This was not
> planned. It was a happy consequence of good decomposition.

### Seeing fork/exec in Action

You can trace the syscalls directly:

```bash
# Trace a simple pipe and watch the fork/exec/pipe/dup2 calls
strace -f -e trace=clone,execve,pipe,dup2,close,write -o /tmp/pipe-trace.txt \
  bash -c 'echo hello | cat'

# Read the trace (it will be verbose - focus on the syscall names)
grep -E '(clone|execve|pipe|dup2)' /tmp/pipe-trace.txt
```

`strace -f` follows child processes across forks. You will see `clone()` (the modern
Linux implementation of fork), `pipe()` creating the fd pair, `dup2()` wiring them up,
and `execve()` replacing the program images.

> **AGENTIC GROUNDING:** Agents frequently construct multi-stage shell commands. When
> something goes wrong, the agent's instinct is to modify the command. Your instinct
> should be to trace the command - `strace -f` shows you exactly what the kernel is doing.
> An agent cannot run strace. You can. This is a diagnostic advantage that requires
> understanding fork/exec to interpret.

---

## 3. File Descriptors

*Estimated time: 45 minutes*

A file descriptor is an integer. That is all it is at the userspace level. It is an index
into a per-process table maintained by the kernel.

### The fd Table

Every process has an fd table. Each entry points to a kernel-internal "file description"
(also called an "open file description" in POSIX terminology). The file description
contains:

- The current file offset (read/write position)
- The access mode (read-only, write-only, read-write)
- Status flags (append, non-blocking, etc.)
- A reference to the underlying kernel object (inode, pipe, socket, device, etc.)

The key insight: **file descriptors are not files**. They are handles. The same file on
disk can be opened by two different fds, and each fd has its own offset. Two different
fds (possibly in different processes) can point to the same file description, sharing an
offset - this is what happens after `fork()` or `dup()`.

### The Three Standard Descriptors

By convention (enforced by the C library and every shell):

| fd | Name   | Default destination | Purpose                |
|----|--------|---------------------|------------------------|
| 0  | stdin  | Terminal input      | Data input to program  |
| 1  | stdout | Terminal output     | Data output from program |
| 2  | stderr | Terminal output     | Error/diagnostic output |

These are not special at the kernel level. They are just fds 0, 1, and 2. They are
special by convention because every program agrees to read input from 0, write output to
1, and write errors to 2.

> **HISTORY:** Why does stderr exist? It seems redundant if stdout already goes to the
> terminal. The answer becomes obvious the moment you pipe stdout somewhere:
> `sort bigfile > sorted.txt`. If `sort` encounters an error (e.g., disk full), where
> does the error message go? If there is only stdout, the error message goes into
> `sorted.txt`, corrupting your output. stderr (fd 2) exists so that error messages can
> reach the human even when stdout is redirected. This was not in the original Unix -
> it was added to Version 6 Unix (1975) after practical experience showed it was
> necessary. Before stderr, programs either wrote errors to stdout (corrupting pipelines)
> or opened `/dev/tty` directly (brittle and non-composable).

### open() and the Lowest Unused fd

The `open()` syscall returns the lowest-numbered fd that is not currently in use. This
is a guarantee, not an implementation detail. It is specified by POSIX.

This matters because if you close fd 0 and then open a file, the file gets fd 0. Now
anything that reads from "stdin" (fd 0) reads from your file. This is one mechanism
behind input redirection.

```bash
# Demonstrate: close stdin, open a file, it becomes fd 0
python3 -c "
import os
# Show current fd 0
print(f'fd 0 points to: {os.readlink(\"/proc/self/fd/0\")}')
# Close fd 0
os.close(0)
# Open a file - it gets fd 0 (lowest unused)
fd = os.open('/etc/hostname', os.O_RDONLY)
print(f'Opened file got fd: {fd}')
print(f'fd 0 now points to: {os.readlink(\"/proc/self/fd/0\")}')
# Read from fd 0
content = os.read(0, 1024)
print(f'Read from fd 0: {content.decode().strip()}')
"
```

### dup2: The Redirection Primitive

`dup2(oldfd, newfd)` makes `newfd` point to the same kernel object as `oldfd`. If
`newfd` is already open, it is silently closed first.

This is the syscall behind all shell redirections:

| Shell syntax     | Equivalent syscall(s)                                    |
|------------------|----------------------------------------------------------|
| `> file`         | `fd = open("file", O_WRONLY\|O_CREAT\|O_TRUNC); dup2(fd, 1); close(fd)` |
| `>> file`        | `fd = open("file", O_WRONLY\|O_CREAT\|O_APPEND); dup2(fd, 1); close(fd)` |
| `< file`         | `fd = open("file", O_RDONLY); dup2(fd, 0); close(fd)`   |
| `2>&1`           | `dup2(1, 2)` - make fd 2 point where fd 1 points        |
| `2> file`        | `fd = open("file", ...); dup2(fd, 2); close(fd)`        |
| `>&2`            | `dup2(2, 1)` - make fd 1 point where fd 2 points        |

The order matters. `cmd > file 2>&1` and `cmd 2>&1 > file` produce different results:

```
cmd > file 2>&1
  Step 1: open("file"), dup2 to fd 1.  fd 1 -> file
  Step 2: dup2(1, 2).                  fd 2 -> file (same as fd 1)
  Result: both stdout and stderr go to file.

cmd 2>&1 > file
  Step 1: dup2(1, 2).                  fd 2 -> terminal (where fd 1 currently points)
  Step 2: open("file"), dup2 to fd 1.  fd 1 -> file
  Result: stdout goes to file, stderr goes to terminal.
```

This is not a quirk. It is left-to-right evaluation of fd operations. Once you understand
dup2, the behavior is obvious.

> **AGENTIC GROUNDING:** Agents frequently generate redirections like `2>&1` without
> understanding the evaluation order. A common agent mistake is writing
> `cmd 2>&1 > /dev/null` intending to suppress all output, when the correct form is
> `cmd > /dev/null 2>&1`. The agent tested it in a context where stderr was empty, so
> the error was invisible. You need to understand dup2 evaluation order to catch this.

### Inspecting File Descriptors

For any process, you can inspect its fd table:

```bash
# Start a background process to inspect
python3 -m http.server 8888 &
SERVER_PID=$!
sleep 1

# Method 1: /proc filesystem
ls -la /proc/$SERVER_PID/fd/

# Method 2: lsof (list open files)
lsof -p $SERVER_PID

# Method 3: the fd info files (Linux-specific)
cat /proc/$SERVER_PID/fdinfo/0

# Clean up
kill $SERVER_PID
```

Each symlink in `/proc/$PID/fd/` shows what the fd points to:
- A regular file: `/path/to/file`
- A pipe: `pipe:[inode_number]`
- A socket: `socket:[inode_number]`
- A terminal: `/dev/pts/N`
- An anonymous inode: `anon_inode:[eventpoll]`
- `/dev/null`: the data sink

> **AGENTIC GROUNDING:** The `printf` vs `echo` standing order in this project exists
> because of fd-level behavior. `echo "value"` writes `value\n` to fd 1. The trailing
> newline is part of the byte stream. When this is piped to a CLI tool that reads from
> fd 0, the tool receives `value\n`, not `value`. For tools that trim whitespace, this
> does not matter. For tools that use the exact bytes (API keys, feature flags, binary
> data), the extra `\n` silently corrupts the value. `printf 'value'` writes exactly
> `value` with no trailing newline. This is a file descriptor problem: the bytes written
> to fd 1 are the bytes read from fd 0 in the next pipeline stage. There is no magic
> cleanup layer in between.

---

## 4. Pipes

*Estimated time: 45 minutes*

A pipe is a unidirectional byte stream with a kernel-managed buffer. It is the mechanism
that makes `cmd1 | cmd2` work.

### The pipe() Syscall

`pipe()` takes an array of two integers and fills them in:

- `pipefd[0]` - the read end
- `pipefd[1]` - the write end

Bytes written to `pipefd[1]` are buffered by the kernel and can be read from `pipefd[0]`.
The buffer is finite. On Linux, the default size is 64 KB (16 pages of 4096 bytes). You
can query and modify it:

```bash
# Check the default pipe buffer size on your system
# (this creates a pipe and reads its capacity)
python3 -c "
import os, fcntl
r, w = os.pipe()
# F_GETPIPE_SZ = 1032 on Linux
size = fcntl.fcntl(r, 1032)
print(f'Default pipe buffer size: {size} bytes ({size // 1024} KB)')
os.close(r)
os.close(w)
"
```

### What Happens at the Boundaries

Understanding pipe behavior requires knowing what happens in the edge cases:

**Writer writes, buffer has space:** The write completes immediately. The bytes are copied
into the kernel buffer.

**Writer writes, buffer is full:** The writer blocks (sleeps) until the reader consumes
some data, freeing buffer space. This is backpressure. It is automatic and invisible.
It is also how a fast producer is throttled to match a slow consumer without any
application-level flow control.

**Reader reads, buffer has data:** The read returns immediately with available data (up
to the requested amount).

**Reader reads, buffer is empty, writer still open:** The reader blocks until data
arrives.

**Reader reads, buffer is empty, writer closed:** The read returns 0 (EOF). This is how
the reader knows the pipeline is done.

**Writer writes, reader has closed:** The kernel sends SIGPIPE to the writer. If the
writer does not handle SIGPIPE, it dies. This is correct behavior - there is no point
writing data that nobody will read. The default SIGPIPE handler terminates the process,
which is what you want in a pipeline: if `head -1` closes after reading one line, the
upstream command gets SIGPIPE and stops, rather than grinding through its entire input.

### How the Shell Builds a Pipeline

Let us trace `ls -la /usr/bin | grep python | wc -l` at the syscall level:

```
Shell process (PID 1000):

1. pipe(pipe_A)         -- creates fds for connection between ls and grep
2. pipe(pipe_B)         -- creates fds for connection between grep and wc

3. fork() -> child PID 1001 (will become ls):
     dup2(pipe_A[1], 1) -- stdout -> pipe A write end
     close(pipe_A[0])   -- don't need pipe A read end
     close(pipe_A[1])   -- don't need original write fd (it's dup'd to 1)
     close(pipe_B[0])   -- don't need pipe B at all
     close(pipe_B[1])
     execve("/bin/ls", ["ls", "-la", "/usr/bin"])

4. fork() -> child PID 1002 (will become grep):
     dup2(pipe_A[0], 0) -- stdin -> pipe A read end
     dup2(pipe_B[1], 1) -- stdout -> pipe B write end
     close(pipe_A[0])   -- originals no longer needed
     close(pipe_A[1])
     close(pipe_B[0])
     close(pipe_B[1])
     execve("/bin/grep", ["grep", "python"])

5. fork() -> child PID 1003 (will become wc):
     dup2(pipe_B[0], 0) -- stdin -> pipe B read end
     close(pipe_A[0])   -- don't need pipe A at all
     close(pipe_A[1])
     close(pipe_B[0])   -- originals no longer needed
     close(pipe_B[1])
     execve("/usr/bin/wc", ["wc", "-l"])

6. Shell closes all pipe fds (they're in the children now)
7. Shell wait()s for all three children
```

Notice how carefully every unused fd is closed. If the shell forgot to close `pipe_A[1]`
in the grep child, grep would never see EOF on its stdin, because the write end of
pipe A would still be open (in grep's process). grep would block forever waiting for more
input. This is a real bug class. It happens when programs (or agents) create pipes and
forget to close unused ends.

### Seeing Pipes in /proc

```bash
# Start a pipeline in the background
sleep 100 | cat &

# Get the PIDs
SLEEP_PID=$(jobs -p | head -1)
# The cat process is a child of the subshell, find it:
CAT_PID=$(pgrep -P $$ cat 2>/dev/null || pgrep -n cat)

# Inspect the file descriptors
ls -la /proc/$SLEEP_PID/fd/ 2>/dev/null
ls -la /proc/$CAT_PID/fd/ 2>/dev/null

# You'll see pipe:[NNNNN] entries - the inode numbers match between
# sleep's fd 1 (stdout) and cat's fd 0 (stdin)

# Clean up
kill %1 2>/dev/null
```

### Named Pipes (FIFOs)

A named pipe is a pipe with a filesystem entry. It is created with `mkfifo`:

```bash
# Create a named pipe
mkfifo /tmp/my_pipe

# In one terminal, write to it (this will block until a reader opens it)
printf 'hello from writer\n' > /tmp/my_pipe &

# In the same terminal, read from it
cat /tmp/my_pipe

# Clean up
rm /tmp/my_pipe
```

Named pipes are useful when you need pipe semantics between processes that are not in a
parent-child relationship. The kernel behavior is identical to anonymous pipes - the
filesystem entry is just a rendezvous point.

> **AGENTIC GROUNDING:** When an agent constructs `curl https://api.example.com/data |
> jq '.items[]' | xargs -I{} process_item {}`, it is relying on three processes
> connected by two pipes. If `curl` fails (HTTP 404, DNS resolution failure, timeout),
> it writes an error to stderr and writes the error response body (or nothing) to stdout.
> `jq` receives this on stdin and either produces no output (empty input) or fails with a
> parse error (HTML error page is not valid JSON). Either way, `xargs` gets no input and
> does nothing. The pipeline exits successfully (exit code 0 from xargs, the last
> command). The agent reports success. No items were processed. This is a silent failure
> caused by the pipeline architecture: each stage only sees its stdin, not the semantic
> success or failure of upstream stages. Understanding this failure mode requires
> understanding how pipes connect processes.

---

## 5. Signals

*Estimated time: 30 minutes*

A signal is an asynchronous notification delivered to a process by the kernel. It
interrupts whatever the process is doing and invokes a handler function (or a default
action).

### The Important Signals

| Signal  | Number | Default Action | Meaning                          | Can Catch? |
|---------|--------|----------------|----------------------------------|------------|
| SIGHUP  | 1      | Terminate      | Terminal hung up                 | Yes        |
| SIGINT  | 2      | Terminate      | Interrupt from keyboard (Ctrl-C) | Yes        |
| SIGQUIT | 3      | Core dump      | Quit from keyboard (Ctrl-\\)    | Yes        |
| SIGKILL | 9      | Terminate      | Forced kill                      | **No**     |
| SIGPIPE | 13     | Terminate      | Write to pipe with no readers    | Yes        |
| SIGTERM | 15     | Terminate      | Polite termination request       | Yes        |
| SIGCHLD | 17     | Ignore         | Child process state changed      | Yes        |
| SIGSTOP | 19     | Stop           | Forced stop                      | **No**     |
| SIGCONT | 18     | Continue       | Resume stopped process           | Yes        |
| SIGTSTP | 20     | Stop           | Stop from keyboard (Ctrl-Z)     | Yes        |

The two signals that cannot be caught, blocked, or ignored: **SIGKILL** and **SIGSTOP**.
Everything else can be handled by the process.

### SIGTERM vs SIGKILL

This distinction is load-bearing:

**SIGTERM** (signal 15) is a polite request. It says "please shut down." The process can
catch it and run cleanup code: close database connections, flush buffers, remove temporary
files, notify peers, save state. Well-written programs handle SIGTERM.

**SIGKILL** (signal 9) is not a request. The kernel does not deliver it to the process.
The kernel simply removes the process from the scheduler. No cleanup code runs. No
buffers are flushed. No temporary files are removed. The process is gone.

This is why `kill -9` is a last resort. It is also why the `timeout` command uses a
two-stage approach:

```bash
# timeout sends SIGTERM first, waits 5 seconds, then sends SIGKILL
timeout --signal=TERM --kill-after=5 30 long_running_command
```

### Signal Handlers in Bash

Bash provides `trap` for signal handling:

```bash
#!/usr/bin/env bash

TMPFILE=$(mktemp)
printf 'Working with temp file: %s\n' "$TMPFILE"

# Register cleanup function for SIGTERM, SIGINT, and EXIT
cleanup() {
  printf 'Cleaning up %s\n' "$TMPFILE"
  rm -f "$TMPFILE"
}
trap cleanup SIGTERM SIGINT EXIT

# Do work
printf 'data\n' > "$TMPFILE"
sleep 30  # Simulate long work

# If we reach here normally, EXIT trap fires on exit
```

Test this:

```bash
# Run it in the background
bash /tmp/signal_test.sh &
PID=$!

# Send SIGTERM
kill -TERM $PID
# You'll see the cleanup message

# Now test with SIGKILL
bash /tmp/signal_test.sh &
PID=$!
kill -KILL $PID
# No cleanup message - the handler never ran
# The temp file is leaked
```

### SIGPIPE: The Pipeline Terminator

SIGPIPE is delivered when a process writes to a pipe (or socket) whose read end has been
closed. The default handler terminates the process.

```bash
# Generate infinite output, pipe to head (which closes after 5 lines)
yes "infinite line" | head -5

# yes gets SIGPIPE after head closes its stdin
# Without SIGPIPE, yes would run forever, writing to a broken pipe
# and getting EPIPE errors on every write

# You can see the exit status:
yes "infinite line" | head -5
printf 'yes exit code: %s\n' "${PIPESTATUS[0]}"
# 141 = 128 + 13 (SIGPIPE is signal 13)
```

Exit code 141 (128 + signal number) tells you the process was killed by a signal. This
is a convention: when a process is killed by signal N, the shell reports exit code 128+N.

### SIGCHLD: The Child Notification

When a child process changes state (exits, stops, continues), the kernel sends SIGCHLD
to the parent. This is how a shell knows that a background command has finished.

If the parent does not handle SIGCHLD (by calling `wait()` or installing a handler), the
child becomes a zombie after it exits. More on this in Section 6.

> **AGENTIC GROUNDING:** The `timeout` command is used extensively in agent-dispatched
> tasks (including the POLECAT wrapper in this project's Makefile). It relies on SIGTERM
> and SIGKILL to enforce time limits. If an agent-spawned process installs a SIGTERM
> handler that does not actually exit (a real bug class - the handler runs cleanup but
> forgets to call `exit`), `timeout` falls back to SIGKILL after the grace period. But
> any cleanup the process was supposed to do (flushing logs, saving state) does not
> happen. Understanding this requires understanding the signal hierarchy.

---

## 6. Process Lifecycle and Exit Codes

*Estimated time: 45 minutes*

### The Full Lifecycle

```
Parent calls fork()
        |
        v
  Child process exists
  (copy of parent)
        |
        v
  Child calls exec()     [optional - child may do work as a copy of parent]
        |
        v
  New program runs
        |
        v
  Program calls exit(N)  [or returns from main, or killed by signal]
        |
        v
  Zombie state           [process exited but parent hasn't called wait()]
        |
        v
  Parent calls wait()    [collects exit status, kernel frees task_struct]
        |
        v
  Process fully gone
```

### Zombies

A zombie process is a process that has exited but whose parent has not yet called `wait()`
to collect its exit status. The process is not running. It consumes no CPU and no memory
(its memory was freed on exit). But it consumes a PID and a slot in the process table
(`task_struct` still exists so the kernel can store the exit status until the parent
collects it).

One zombie is harmless. Thousands of zombies can exhaust the PID space (default maximum
is 32768 on many systems, adjustable via `/proc/sys/kernel/pid_max`).

Creating a zombie for observation:

```bash
# This script creates a zombie
python3 -c "
import os, time

pid = os.fork()
if pid == 0:
    # Child: exit immediately
    os._exit(42)
else:
    # Parent: don't call wait(), just sleep
    print(f'Child PID: {pid}')
    print(f'Parent PID: {os.getpid()}')
    print('Child has exited. Parent is not calling wait().')
    print('The child is now a zombie. Check with: ps aux | grep Z')
    time.sleep(30)
    # After this sleep, parent exits, init adopts and reaps the zombie
" &

# While that's running, observe the zombie:
sleep 1
ps aux | grep -E 'Z|defunct'
```

You will see a process in state `Z` (zombie) or marked `<defunct>`. It has no memory
mapped, no open fds, no nothing - just a `task_struct` holding exit code 42, waiting for
its parent to call `wait()`.

### Orphans

An orphan is a process whose parent has exited. The kernel reassigns the orphan's parent
to PID 1 (init/systemd). PID 1 is designed to call `wait()` on its adopted children, so
orphans are automatically reaped when they eventually exit.

The double-fork technique uses this:

```
1. Parent forks child
2. Child forks grandchild
3. Child exits immediately (parent reaps it)
4. Grandchild is orphaned, adopted by init
5. Grandchild runs independently - init will reap it when it's done
```

This is how daemons traditionally detach from their parent. The grandchild has no
connection to the original parent's terminal or process group.

### Exit Codes

When a process exits, it provides a status byte (0-255). By universal convention:

- **0** means success
- **Non-zero** means failure

There is no enforcement of this convention. A program can exit 0 after catastrophic
failure. A program can exit 1 after complete success. The convention holds because every
tool in the Unix ecosystem (shells, Make, CI systems, init systems) treats 0 as success
and non-zero as failure.

Some common non-zero codes:

| Code | Common meaning                                        |
|------|-------------------------------------------------------|
| 1    | General error                                         |
| 2    | Misuse of shell command / invalid arguments           |
| 126  | Command found but not executable                      |
| 127  | Command not found                                     |
| 128+N| Killed by signal N (e.g., 137 = 128+9 = killed by SIGKILL) |
| 130  | 128+2 = killed by SIGINT (Ctrl-C)                    |
| 141  | 128+13 = killed by SIGPIPE                            |

### Exit Codes in the Shell

```bash
# $? holds the exit code of the last command
ls /nonexistent
printf 'Exit code: %s\n' "$?"

# && runs next command ONLY if previous succeeded (exit 0)
true && printf 'This runs\n'
false && printf 'This does not run\n'

# || runs next command ONLY if previous failed (non-zero)
false || printf 'This runs (fallback)\n'
true || printf 'This does not run\n'
```

### The Gate is Exit Code Chaining

This project's quality gate:

```bash
pnpm run typecheck && pnpm run lint && pnpm run test
```

This is not scripting. This is control flow over exit codes. If `typecheck` returns
non-zero, `lint` never runs. If `lint` returns non-zero, `test` never runs. The overall
exit code is the exit code of the last command that ran.

Every CI/CD system in existence works this way. GitHub Actions, GitLab CI, Jenkins - they
all run shell commands and check exit codes. The entire software delivery pipeline is
built on the convention that 0 means success.

### PIPESTATUS and pipefail

In a pipeline `cmd1 | cmd2 | cmd3`, the shell's `$?` is the exit code of the **last**
command (`cmd3`). The exit codes of `cmd1` and `cmd2` are silently discarded.

This is dangerous:

```bash
# curl fails, but wc succeeds, so $? is 0
curl https://nonexistent.invalid/data 2>/dev/null | wc -l
printf 'Exit code: %s\n' "$?"
# Prints "0" and a line count of 0 - looks like success with empty data
```

Bash provides two mechanisms to address this:

**`${PIPESTATUS[@]}`** - an array of exit codes for every command in the last pipeline:

```bash
curl https://nonexistent.invalid/data 2>/dev/null | wc -l
printf 'curl: %s, wc: %s\n' "${PIPESTATUS[0]}" "${PIPESTATUS[1]}"
```

**`set -o pipefail`** - the pipeline's exit code is the exit code of the rightmost
command that failed (non-zero), or 0 if all succeeded:

```bash
set -o pipefail
curl https://nonexistent.invalid/data 2>/dev/null | wc -l
printf 'Pipeline exit code: %s\n' "$?"
# Now this is non-zero (curl's exit code)
```

### The set -e Trap

`set -e` (exit on error) causes the script to exit immediately when any command returns
non-zero. Agents love `set -e`. It seems safe. It is not.

`set -e` does NOT apply to commands that are part of a pipeline (except the last one,
unless `pipefail` is set). It also does not apply to commands in `if` conditions, `while`
conditions, commands after `||` or `&&`, or commands in subshells that are part of a
command substitution.

```bash
#!/usr/bin/env bash
set -e

# This WILL exit the script (simple command fails)
false
printf 'Never reached\n'
```

```bash
#!/usr/bin/env bash
set -e

# This will NOT exit the script (false is in a pipeline, not the last command)
false | true
printf 'This runs! Pipeline exit code was 0 (from true)\n'
```

```bash
#!/usr/bin/env bash
set -eo pipefail

# NOW this exits the script (pipefail makes false's exit code propagate)
false | true
printf 'Never reached\n'
```

The safe bash header for scripts that agents should be generating:

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- `-e` - exit on error
- `-u` - error on unset variables (catches typos in variable names)
- `-o pipefail` - pipeline fails if any component fails

> **AGENTIC GROUNDING:** Agents generate `set -e` scripts constantly. They almost never
> add `pipefail`. This means every pipeline in the script is a potential silent failure
> point. When reviewing agent-generated bash scripts, the first thing to check is the
> header. If it says `set -e` without `pipefail`, every pipeline in the script needs
> individual scrutiny. The correct header is `set -euo pipefail`. If an agent generates
> a script without this header, it is a defect.

---

## 7. Challenges

*Estimated time: 60-90 minutes total*

These challenges are designed to be run on a Linux system (Arch, Debian, Ubuntu, or any
distribution with standard GNU/Linux tools). Each one exercises a specific concept from
this step.

---

### Challenge 1: Explore /proc/self

*Estimated time: 10 minutes*

Write a sequence of commands that discovers the following about your current shell
process, using only `/proc/self/` and standard tools:

1. Its PID (without using `$$`)
2. All open file descriptors and what they point to
3. Its memory map (just the first 10 lines)
4. Its command line arguments (null-separated, you'll need to handle the null bytes)
5. Its parent PID (from `/proc/self/status`)
6. Its current working directory
7. The binary executable it is running
8. How many threads it has

Verify your answers against the output of `ps`, `$$`, and `pwd`.

<details>
<summary>Hints</summary>

```bash
# 1. PID
cat /proc/self/status | grep -m1 '^Pid:'
# Compare with: printf '%s\n' "$$"

# 2. File descriptors
ls -la /proc/self/fd/

# 3. Memory map
head -10 /proc/self/maps

# 4. Command line (null bytes to spaces)
cat /proc/self/cmdline | tr '\0' ' '; printf '\n'

# 5. Parent PID
grep PPid /proc/self/status

# 6. cwd
readlink /proc/self/cwd

# 7. Binary
readlink /proc/self/exe

# 8. Thread count
grep Threads /proc/self/status
```

Note: For item 1, `cat /proc/self/status` will show the PID of `cat`, not your shell.
To get your shell's PID, read `/proc/$$/status` or use `grep Pid /proc/self/status`
from within a bash built-in context.

</details>

---

### Challenge 2: Build a Pipe by Hand

*Estimated time: 15 minutes*

Write a Python script that creates a pipe with `os.pipe()`, forks with `os.fork()`,
writes a message from child to parent through the pipe, and reaps the child with
`os.wait()`. This replicates what the shell does for `echo "Hello" | cat` without
any shell machinery.

<details>
<summary>Solution</summary>

```python
#!/usr/bin/env python3
"""Build a pipe by hand - no shell involved."""
import os

def main():
    read_fd, write_fd = os.pipe()
    print(f"Created pipe: read_fd={read_fd}, write_fd={write_fd}")

    pid = os.fork()

    if pid == 0:
        # Child process
        os.close(read_fd)
        message = f"Hello from child process (PID: {os.getpid()})\n"
        os.write(write_fd, message.encode())
        os.close(write_fd)
        os._exit(0)
    else:
        # Parent process
        os.close(write_fd)
        data = b""
        while True:
            chunk = os.read(read_fd, 4096)
            if not chunk:
                break
            data += chunk
        os.close(read_fd)
        print(f"Parent (PID: {os.getpid()}) received: {data.decode()}", end="")
        child_pid, status = os.wait()
        exit_code = os.waitstatus_to_exitcode(status)
        print(f"Child {child_pid} exited with code {exit_code}")

if __name__ == "__main__":
    main()
```

</details>

---

### Challenge 3: Signal Handling

*Estimated time: 15 minutes*

Write a bash script that creates a temp directory, installs a `trap` cleanup handler for
SIGTERM, SIGINT, and EXIT, then sleeps. Test it by sending SIGTERM (cleanup runs),
SIGKILL (cleanup does NOT run, temp dir leaks), and SIGINT (cleanup runs). Record the
exit code for each and explain why they differ.

<details>
<summary>Script template</summary>

```bash
#!/usr/bin/env bash
TMPDIR=$(mktemp -d)
printf 'PID: %s\nTemp dir: %s\n' "$$" "$TMPDIR"

printf 'data\n' > "$TMPDIR/file1.txt"
printf 'data\n' > "$TMPDIR/file2.txt"

cleanup() {
  printf 'Cleaning up %s\n' "$TMPDIR"
  rm -rf "$TMPDIR"
}
trap cleanup SIGTERM SIGINT EXIT

printf 'Working... (send me a signal)\n'
sleep 60
```

Expected exit codes: SIGTERM = 143 (128+15), SIGKILL = 137 (128+9), SIGINT = 130 (128+2).

</details>

---

### Challenge 4: Pipeline Failure Modes

*Estimated time: 15 minutes*

Demonstrate that `set -e` does not catch pipeline failures, then show how `set -eo pipefail` fixes it, then use `${PIPESTATUS[@]}` to identify which stage of a three-stage pipeline failed.

<details>
<summary>Key demonstration</summary>

```bash
#!/usr/bin/env bash
set -e

# This does NOT exit the script
false | true
printf 'Script continued past the pipeline\n'

# But this does:
false
printf 'Never reached\n'
```

With `set -eo pipefail`, the `false | true` line exits the script because `false`'s
non-zero exit code propagates through pipefail.

</details>

---

### Challenge 5: Zombie Creation and Reaping

*Estimated time: 15 minutes*

Write a Python script that forks a child, lets the child exit immediately, and does NOT
call `wait()`. Observe the zombie with `ps aux | grep Z`. Then modify the script to
reap the zombie after 10 seconds and observe it disappear.

---

### Challenge 6: fd Detective

*Estimated time: 15 minutes*

Start a Python HTTP server (`python3 -m http.server 9876`), then use `/proc/$PID/fd/`
and `lsof -p $PID` to identify all its open file descriptors. Make a curl request and
observe the new connection fd appear. Write a bash function `fd_report()` that takes
a PID and categorises all fds by type (file, pipe, socket, device).

---

## Key Takeaways

Before moving to Step 2, you should be able to answer these from memory:

1. What is a process, structurally?
2. Why does Unix split process creation into fork() and exec()?
3. What is a file descriptor?
4. When the shell executes `cmd1 | cmd2`, what syscalls occur?
5. What is the difference between SIGTERM and SIGKILL?
6. What is a zombie process?
7. Why does `set -e` not catch pipeline failures?
8. What exit code does a process killed by SIGKILL have?
9. Why does `echo "value" | tool` differ from `printf 'value' | tool`?
10. If `curl` fails in `curl url | jq '.field'`, what does `$?` report?

---

## Recommended Reading

- **The Design of the UNIX Operating System** - Maurice Bach (1986). Chapters 7 and 10.
- **Advanced Programming in the UNIX Environment** - Stevens and Rago (3rd ed, 2013). Chapters 3, 8, and 10.
- **The Unix Programming Environment** - Kernighan and Pike (1984). Chapter 7.
- **`man 2 fork`**, **`man 2 exec`**, **`man 2 pipe`**, **`man 7 signal`** - the actual specifications.
- **McIlroy's pipe memo** (1964) - the document that led to pipes in Unix.

---

## What to Read Next

**[Step 2: The Shell Language](/bootcamp/02-shell-language/)** - Bash is not a scripting language bolted onto a terminal.
It is a process launcher with a programming language bolted on. Every concept in Step 2
is built on the process model from Step 1. The shell's job is to call fork(), exec(),
pipe(), dup2(), and wait() - the "scripting" is the control flow that decides which
syscalls to make and in what order.

```

### File: `sites/oceanheart/content/bootcamp/03-filesystem-as-state.md`

```
+++
title = "The Filesystem as State"
date = "2026-03-10"
description = "Paths, permissions, inodes, /proc, /sys - the agent's working memory is the filesystem."
tags = ["filesystem", "linux", "permissions", "proc", "bootcamp"]
step = 3
tier = 1
estimate = "4-6 hours"
bootcamp = 1
+++

Step 3 of 12 in the Agentic Engineering Bootcamp.

---

**Prerequisites:** Step 1 (process model), Step 2 (shell language)
**Leads to:** Step 4 (text pipeline), Step 7 (git internals)

---

## Why This Step Exists

The agent's working memory IS the filesystem. Every file the agent reads, writes, creates,
or deletes is a state change. Every `.done/` marker in a Makefile, every YAML config, every
git object, every lockfile - all of it lives on a filesystem. If the Operator cannot reason
about file state, the Operator cannot verify agent output. This step builds the mental model
that makes verification possible.

The agent-native taxonomy established two principles that converge here:
- **Principle 3:** State is explicit and inspectable.
- **Principle 7:** The filesystem is the workspace.

Both reduce to the same insight: if you can `ls`, `stat`, `cat`, and `diff` the state, you
can verify it. If you cannot, you are trusting blindly.

---

## Table of Contents

1. [Everything Is a File (Descriptor)](#1-everything-is-a-file-descriptor) (~30 min)
2. [Inodes and the Directory Abstraction](#2-inodes-and-the-directory-abstraction) (~45 min)
3. [The Path Resolution Algorithm](#3-the-path-resolution-algorithm) (~30 min)
4. [The Permissions Model](#4-the-permissions-model) (~45 min)
5. [The /proc Filesystem](#5-the-proc-filesystem) (~45 min)
6. [The /sys Filesystem](#6-the-sys-filesystem) (~15 min)
7. [Temporary Files and Atomic Operations](#7-temporary-files-and-atomic-operations) (~30 min)
8. [Mount Points and Filesystem Layers](#8-mount-points-and-filesystem-layers) (~30 min)
9. [File Locking and Concurrency](#9-file-locking-and-concurrency) (~30 min)
10. [Challenges](#challenge-inode-detective) (~60-90 min)

---

## 1. Everything Is a File (Descriptor)

**Estimated time: 30 minutes**

Unix has one dominant abstraction: the file. Nearly everything in the system - regular
files, directories, devices, network sockets, kernel data structures, hardware interfaces -
is exposed through a file-like interface that supports some subset of `open`, `read`,
`write`, `close`, and `ioctl`.

This is not a slogan. It is an engineering decision with structural consequences.

### The file types

| Type | Example | How to identify | Purpose |
|------|---------|----------------|---------|
| Regular file | `/etc/passwd` | `ls -l` shows `-` | Data storage |
| Directory | `/home/` | `ls -l` shows `d` | Contains (name, inode) pairs |
| Symbolic link | `/usr/bin/python3 -> python3.11` | `ls -l` shows `l` | Path indirection |
| Block device | `/dev/sda` | `ls -l` shows `b` | Disk-like I/O (random access) |
| Character device | `/dev/null`, `/dev/urandom` | `ls -l` shows `c` | Stream I/O (sequential) |
| Named pipe (FIFO) | created with `mkfifo` | `ls -l` shows `p` | IPC between processes |
| Socket | `/var/run/docker.sock` | `ls -l` shows `s` | IPC (bidirectional) |

### Why it matters for composition

Because devices are files, you can compose them with the same tools you use for regular
files:

```bash
# Treat a device as a data source, pipe through standard tools
cat /dev/urandom | head -c 16 | base64

# /dev/null absorbs output - it is a file that discards all writes
command-that-is-noisy 2>/dev/null

# /dev/stdin, /dev/stdout, /dev/stderr are files pointing to fd 0, 1, 2
cat /dev/stdin   # equivalent to cat - (reads from stdin)

# A named pipe is a file that connects two processes
mkfifo /tmp/mypipe
echo "hello" > /tmp/mypipe &   # blocks until reader connects
cat /tmp/mypipe                 # reads "hello", both sides unblock
rm /tmp/mypipe
```

The composition model from Step 1 (pipes connecting stdout to stdin) works precisely because
devices and streams share the file interface. `head` does not know it is reading from
`/dev/urandom` - it sees a file descriptor that supports `read()`.

### File descriptors revisited

From Step 1 you know that every process gets three open file descriptors at birth: 0
(stdin), 1 (stdout), 2 (stderr). Each is an integer index into the process's file
descriptor table, which the kernel maintains. The table maps integers to open file
descriptions (the kernel's bookkeeping for an open file).

You can see a process's open file descriptors at any time:

```bash
# Your own shell's file descriptors
ls -la /proc/self/fd/

# A specific process's file descriptors
ls -la /proc/1234/fd/
```

Each entry in `/proc/self/fd/` is a symlink showing what the descriptor points to - a
regular file, a pipe, a socket, a device.

> **AGENTIC GROUNDING:** When an agent opens files, spawns subprocesses, or creates pipes,
> it is manipulating file descriptors. A resource leak (opening files without closing them)
> eventually hits the per-process file descriptor limit (`ulimit -n`, typically 1024). An
> agent orchestrating many parallel operations can hit this limit. Diagnosing it requires
> inspecting `/proc/<pid>/fd/` - which is itself a filesystem operation.

> **HISTORY:** "Everything is a file" is attributed to the Unix design philosophy of
> Thompson and Ritchie (1970s), but Unix did not fully deliver on it. Network connections
> required special system calls (`socket`, `bind`, `connect`) rather than `open`. Plan 9
> from Bell Labs (1992) took the principle to its logical conclusion: network connections
> are files, the window system is a filesystem (`/dev/draw`), even remote machines are
> mounted as directory trees. Modern Linux recovers some of this through `/proc` and `/sys`.

---

## 2. Inodes and the Directory Abstraction

**Estimated time: 45 minutes**

A filename is not a file. A filename is a pointer to a file. Understanding this distinction
is fundamental to reasoning about filesystem state.

### What is an inode?

An **inode** (index node) is the kernel's data structure for a file. It contains:

- File type (regular, directory, symlink, etc.)
- Permissions (owner, group, mode)
- Owner (UID, GID)
- Size in bytes
- Timestamps (atime, mtime, ctime - access, modify, change)
- Number of hard links pointing to this inode
- Pointers to data blocks on disk

What the inode does NOT contain: the filename. The name lives in the directory.

### What is a directory?

A directory is a file whose content is a list of (name, inode number) pairs. That is all.

```
Directory inode 100 contains:
  "."     -> inode 100  (self-reference)
  ".."    -> inode 50   (parent directory)
  "foo.txt" -> inode 201
  "bar/"    -> inode 202
```

You can see inode numbers with `ls -i`:

```bash
$ ls -i
201 foo.txt
202 bar
```

And get the full inode metadata with `stat`:

```bash
$ stat foo.txt
  File: foo.txt
  Size: 42            Blocks: 8          IO Block: 4096   regular file
Device: 0,50          Inode: 201         Links: 1
Access: (0644/-rw-r--r--)  Uid: ( 1000/  agent)   Gid: ( 1000/  agent)
Access: 2026-03-10 10:00:00.000000000 +0000
Modify: 2026-03-10 09:30:00.000000000 +0000
Change: 2026-03-10 09:30:00.000000000 +0000
 Birth: 2026-03-10 09:30:00.000000000 +0000
```

### Hard links

Because a filename is just a (name, inode) entry in a directory, you can have multiple
names pointing to the same inode. These are **hard links**.

```bash
# Create a file
echo "hello" > original.txt
ls -i original.txt
# 201 original.txt

# Create a hard link - a second name for the same inode
ln original.txt hardlink.txt
ls -i original.txt hardlink.txt
# 201 hardlink.txt
# 201 original.txt

# Same inode number. stat shows Links: 2
stat original.txt | grep Links
# Links: 2

# Modify through one name, read through the other
echo "modified" > hardlink.txt
cat original.txt
# modified

# Delete the original - the inode survives because link count > 0
rm original.txt
cat hardlink.txt
# modified
stat hardlink.txt | grep Links
# Links: 1
```

The file (inode) is only deleted when the link count drops to zero AND no process has it
open. This is why you can delete a log file while a process is still writing to it - the
process holds an open file descriptor, so the inode persists until the process closes it.

### Symbolic links

A **symlink** is a different kind of file entirely. It is a file whose content is a path
string. When the kernel encounters a symlink during path resolution, it reads the path
string and continues resolving from there.

```bash
# Create a symlink
ln -s /home/agent/original.txt symlink.txt

# The symlink is its own inode, containing the path "/home/agent/original.txt"
ls -i symlink.txt original.txt
# 305 symlink.txt    <-- different inode
# 201 original.txt

# If the target is deleted, the symlink breaks (dangling symlink)
rm original.txt
cat symlink.txt
# cat: symlink.txt: No such file or directory

# The symlink still exists - it just points to nothing
ls -l symlink.txt
# lrwxrwxrwx 1 agent agent 27 Mar 10 10:00 symlink.txt -> /home/agent/original.txt
```

Key differences:

| Property | Hard link | Symbolic link |
|----------|-----------|---------------|
| Same inode as target? | Yes | No (own inode) |
| Survives target deletion? | Yes | No (becomes dangling) |
| Can cross filesystem boundaries? | No | Yes |
| Can link to directories? | No (usually) | Yes |
| Content | Not applicable (IS the file) | A path string |

### Why `mv` within a filesystem is instant

Now the punchline. `mv` within the same filesystem does not copy data. It creates a new
directory entry (name, inode) in the destination directory and removes the old entry from
the source directory. The inode - and all the data blocks it points to - never moves.

```bash
# Moving a 10GB file on the same filesystem: instant
time mv /data/huge-file.bin /data/archive/huge-file.bin
# real    0m0.001s

# Moving across filesystems: copies all data, then deletes
time mv /data/huge-file.bin /mnt/external/huge-file.bin
# real    0m45.000s  (depends on file size and disk speed)
```

This is not a performance trick. It is a structural consequence of the inode model. And it
is the foundation of atomic file writes, covered in section 7.

> **AGENTIC GROUNDING:** Git is built on this model. A git object (blob, tree, commit) is
> a file named by its SHA-1/SHA-256 hash, stored in `.git/objects/`. The index
> (`.git/index`) maps pathnames to blob hashes. `git write-tree` - used in this project's
> Makefile to compute a tree identity - creates a tree object from the index. Git is a
> content-addressable filesystem layered on top of the regular filesystem. Step 7 builds
> on this foundation.

> **HISTORY:** The inode concept comes from the original Unix filesystem designed by Ken
> Thompson and Dennis Ritchie in the early 1970s. The name is short for "index node."
> Ritchie's decision to make directories just files containing (name, inode) pairs is an
> elegant recursion: the tool that navigates the tree (the kernel's path resolution) uses
> the same `read()` interface it uses for everything else.

---

## 3. The Path Resolution Algorithm

**Estimated time: 30 minutes**

When you access `/home/agent/code/file.txt`, the kernel does not look up the path as a
single string. It resolves it component by component. Understanding this algorithm makes
many puzzling filesystem behaviours obvious.

### Step by step

Given the path `/home/agent/code/file.txt`:

1. Start at the **root inode** (inode 2 by convention on ext4).
2. Read the root directory's data. Find the entry named `home`. It maps to inode 500.
3. Check permissions: does the current user have **execute** permission on inode 2 (the root
   directory)? Execute on a directory means "traverse" - the right to resolve names within
   it. If no, stop with `EACCES`.
4. Read inode 500 (the `/home` directory). Find the entry named `agent`. It maps to inode
   600.
5. Check execute permission on inode 500. Continue.
6. Read inode 600 (`/home/agent`). Find `code` -> inode 700.
7. Check execute permission on inode 600. Continue.
8. Read inode 700 (`/home/agent/code`). Find `file.txt` -> inode 800.
9. Check execute permission on inode 700. Continue.
10. Return inode 800. The caller now has access to the file's metadata and data.

### Symlink resolution

If at any step the inode found is a symbolic link, the kernel reads the symlink's content
(a path string) and restarts resolution from that path. If the symlink contains an absolute
path, resolution starts from root. If relative, resolution continues from the current
directory in the walk.

The kernel imposes a limit on symlink depth (typically 40 on Linux) to prevent infinite
loops from circular symlinks.

```bash
# Create a circular symlink
ln -s b a
ln -s a b
cat a
# cat: a: Too many levels of symbolic links
```

### Relative paths and `.` / `..`

- `.` is a hard link every directory has to itself.
- `..` is a hard link every directory has to its parent.
- A relative path is resolved starting from the process's current working directory
  (`/proc/self/cwd`).

```bash
# See where . and .. point
ls -ia /home/agent/code/
# 700 .
# 600 ..
# 800 file.txt
```

### Useful tools

```bash
# Resolve a path to its absolute, canonical form (resolving all symlinks)
realpath ./some/relative/../path/with/symlinks

# Follow a symlink chain to its target
readlink -f /usr/bin/python3

# Show the canonical working directory (resolves symlinks in $PWD)
pwd -P
```

### Why this matters

An agent may:
- Create a symlink to a path that does not exist yet (the link succeeds, but access
  through it fails until the target is created).
- Create a circular symlink accidentally (two config files symlinking to each other).
- Fail to access a file not because of the file's permissions but because of a missing
  execute bit on a parent directory.
- Produce different behaviour depending on whether it uses an absolute or relative path
  (because the working directory changed).

All of these are path resolution issues. The algorithm above explains every case.

> **AGENTIC GROUNDING:** This project uses symlinks for harness compatibility: `CLAUDE.md`
> is a symlink to `AGENTS.md`. If an agent creates or modifies `CLAUDE.md` directly instead
> of following the symlink, it creates a divergence - two files where there should be one.
> Understanding path resolution means understanding that `cat CLAUDE.md` follows the
> symlink (reads `AGENTS.md`), but `ls -l CLAUDE.md` shows the symlink itself.

---

## 4. The Permissions Model

**Estimated time: 45 minutes**

Every inode carries a permissions mask that determines who can do what. The model is
simple in structure but has subtleties that cause real problems when misunderstood.

### The three axes

Permissions are specified for three categories of user:

- **User (u):** The file's owner.
- **Group (g):** Members of the file's group.
- **Other (o):** Everyone else.

Each category has three permission bits:

| Bit | On a file | On a directory |
|-----|-----------|----------------|
| **r** (read) | Read file contents | List directory contents (`ls`) |
| **w** (write) | Modify file contents | Create/delete entries in directory |
| **x** (execute) | Execute as program | Traverse (cd into, resolve names within) |

### The directory execute bit

This is the subtlety that catches people. The `x` bit on a directory controls **traversal**
- the right to resolve names within that directory.

```bash
mkdir testdir
echo "secret" > testdir/file.txt

# Remove execute from the directory
chmod a-x testdir

# You can list the directory (r bit is still set)
ls testdir
# file.txt

# But you cannot access the file inside (no x bit = no name resolution)
cat testdir/file.txt
# cat: testdir/file.txt: Permission denied

# You cannot cd into it either
cd testdir
# bash: cd: testdir: Permission denied

# Restore execute
chmod a+x testdir
```

Conversely, if a directory has `x` but not `r`:

```bash
chmod a-r,a+x testdir

# You cannot list the directory contents
ls testdir
# ls: cannot open directory 'testdir': Permission denied

# But if you KNOW the filename, you can access it (x allows name resolution)
cat testdir/file.txt
# secret
```

### Numeric notation

Permissions are encoded as a three-digit octal number, one digit per category:

```
r=4, w=2, x=1

  user  group  other
  rwx   r-x    r-x
  7     5      5     = 755

  rw-   r--    r--
  6     4      4     = 644
```

Common patterns:

| Mode | Meaning | Typical use |
|------|---------|-------------|
| `755` | Owner: rwx, Group: rx, Other: rx | Executable files, directories |
| `644` | Owner: rw, Group: r, Other: r | Regular files |
| `700` | Owner: rwx, nobody else | Private directories |
| `600` | Owner: rw, nobody else | Private files (SSH keys, secrets) |
| `777` | Everyone: rwx | Almost never correct |

### chmod, chown, chgrp

```bash
# Symbolic notation
chmod u+x script.sh         # add execute for owner
chmod go-w config.yaml       # remove write for group and other
chmod a+r public.html        # add read for all

# Numeric notation
chmod 755 script.sh
chmod 644 config.yaml

# Change owner
chown agent:developers file.txt   # set user and group
chown -R agent:developers dir/    # recursive

# Change group only
chgrp developers file.txt
```

### umask

The **umask** is a per-process mask that determines the default permissions for newly
created files. It works by subtracting bits:

```bash
# Check current umask
umask
# 0022

# Default for new files: 666 - 022 = 644 (rw-r--r--)
touch newfile.txt
stat -c '%a' newfile.txt
# 644

# Default for new directories: 777 - 022 = 755 (rwxr-xr-x)
mkdir newdir
stat -c '%a' newdir
# 755

# Set a more restrictive umask
umask 077
touch private.txt
stat -c '%a' private.txt
# 600
```

### Special bits: setuid, setgid, sticky

These are the fourth octal digit (or special symbolic flags):

| Bit | Numeric | On a file | On a directory |
|-----|---------|-----------|----------------|
| setuid | 4 | Execute as the file's owner (not the caller) | (no effect) |
| setgid | 2 | Execute as the file's group | New files inherit the directory's group |
| sticky | 1 | (no effect) | Only file owner can delete their files |

```bash
# setuid example: passwd runs as root regardless of who calls it
ls -l /usr/bin/passwd
# -rwsr-xr-x 1 root root ... /usr/bin/passwd
#    ^ the 's' means setuid is set

# sticky bit: /tmp allows everyone to write, but you can only delete your own files
ls -ld /tmp
# drwxrwxrwt ...
#          ^ the 't' means sticky bit is set

# Set setuid (use with extreme caution)
chmod 4755 program
# Set sticky bit
chmod 1777 shared-dir
```

> **AGENTIC GROUNDING:** When an agent generates a shell script, it must set the execute
> bit (`chmod +x`) or the script will not be runnable. When an agent writes sensitive files
> (API keys, credentials), it should use mode `600` to prevent other users from reading
> them. When an agent creates a shared directory, the sticky bit prevents one agent's
> output from being deleted by another. These are not academic concerns - they are the
> permission model that governs every file operation the agent performs.

---

## 5. The /proc Filesystem

**Estimated time: 45 minutes**

`/proc` is a virtual filesystem - it does not exist on disk. It is generated on the fly by
the kernel to expose internal data structures as files. Reading `/proc/meminfo` does not
read a disk block. It invokes a kernel function that formats the current memory statistics
into text and returns it.

This is the "everything is a file" philosophy applied to the kernel itself.

### Per-process information: /proc/[pid]/

Every running process gets a directory under `/proc/` named by its PID:

```bash
# Your own process information
ls /proc/self/

# Or by PID
ls /proc/1234/
```

The most useful entries:

| Path | Contents | Example |
|------|----------|---------|
| `/proc/self/cmdline` | Null-separated command line args | `cat /proc/self/cmdline \| tr '\0' ' '` |
| `/proc/self/environ` | Null-separated environment variables | `cat /proc/self/environ \| tr '\0' '\n'` |
| `/proc/self/cwd` | Symlink to current working directory | `readlink /proc/self/cwd` |
| `/proc/self/exe` | Symlink to the executable | `readlink /proc/self/exe` |
| `/proc/self/fd/` | Directory of open file descriptors | `ls -la /proc/self/fd/` |
| `/proc/self/maps` | Memory mappings (shared libs, heap, stack) | Shows loaded `.so` files |
| `/proc/self/status` | Human-readable process status | PID, state, memory, threads |
| `/proc/self/limits` | Resource limits (open files, stack, etc.) | Compare with `ulimit` |

```bash
# See all open file descriptors of a running process
ls -la /proc/$(pgrep -f "node server")/fd/

# Check if a process is alive by testing its /proc directory
if [ -d /proc/1234 ]; then
  echo "Process 1234 is alive"
fi

# Get a process's working directory
readlink /proc/1234/cwd

# Get a process's environment (useful for debugging)
cat /proc/1234/environ | tr '\0' '\n' | grep PATH
```

### System-wide information

| Path | Contents |
|------|----------|
| `/proc/cpuinfo` | CPU model, cores, features |
| `/proc/meminfo` | Total, free, available, cached memory |
| `/proc/loadavg` | Load averages (1, 5, 15 min) and running/total processes |
| `/proc/uptime` | Seconds since boot, idle seconds |
| `/proc/version` | Kernel version string |
| `/proc/filesystems` | Filesystem types the kernel supports |
| `/proc/mounts` | Currently mounted filesystems (same as `mount` output) |

```bash
# Quick system health check - all from /proc, no external tools
printf "CPUs:    %s\n" "$(grep -c ^processor /proc/cpuinfo)"
printf "Memory:  %s\n" "$(grep MemAvailable /proc/meminfo)"
printf "Load:    %s\n" "$(cat /proc/loadavg)"
printf "Uptime:  %s seconds\n" "$(cut -d' ' -f1 /proc/uptime)"
```

### Tuneable parameters: /proc/sys/

The `/proc/sys/` hierarchy exposes kernel parameters that can be read and (with
appropriate permissions) written at runtime:

```bash
# Maximum number of open file descriptors system-wide
cat /proc/sys/fs/file-max
# 9223372036854775807

# Maximum number of open files per process (different from ulimit)
cat /proc/sys/fs/nr_open

# Network parameters
cat /proc/sys/net/ipv4/ip_forward
# 0 = routing disabled, 1 = enabled

# Write to change at runtime (requires root)
echo 1 > /proc/sys/net/ipv4/ip_forward

# Persistent changes go through sysctl
sysctl -w net.ipv4.ip_forward=1
```

### The key insight

`/proc` turns kernel introspection into file reads. This means every tool that works with
files - `cat`, `grep`, `awk`, shell redirection - works with kernel data. No special APIs,
no special libraries. The file abstraction provides the interface.

> **AGENTIC GROUNDING:** When an agent needs to check if a process is running, it can test
> for the existence of `/proc/<pid>/` or use `kill -0 <pid>`. Both are filesystem
> operations at heart. The Makefile in this project monitors polecat processes for liveness.
> Debugging a stuck agent process means examining `/proc/<pid>/fd/` (what files does it
> have open?), `/proc/<pid>/status` (is it sleeping? zombie?), and `/proc/<pid>/maps`
> (what libraries are loaded?). All readable without attaching a debugger.

---

## 6. The /sys Filesystem

**Estimated time: 15 minutes**

`/sys` (sysfs) is another virtual filesystem, introduced in Linux 2.6. Where `/proc` grew
organically and contains a mix of process information and kernel tunables, `/sys` has a
more structured layout focused on devices, drivers, and hardware.

### Structure

```bash
/sys/
├── block/           # Block devices (sda, nvme0n1, etc.)
├── bus/             # Devices organized by bus type (pci, usb, etc.)
├── class/           # Devices organized by class
│   ├── net/         # Network interfaces
│   ├── block/       # Block devices (another view)
│   ├── tty/         # Terminal devices
│   └── ...
├── devices/         # The device tree (physical topology)
├── firmware/        # Firmware interfaces (ACPI, etc.)
├── fs/              # Filesystem parameters
├── kernel/          # Kernel subsystem parameters
├── module/          # Loaded kernel modules
└── power/           # Power management
```

### Practical examples

```bash
# List network interfaces
ls /sys/class/net/
# eth0  lo  wlan0

# Get the MAC address of an interface
cat /sys/class/net/eth0/address
# aa:bb:cc:dd:ee:ff

# Check if an interface is up
cat /sys/class/net/eth0/operstate
# up

# List block devices and their sizes
for dev in /sys/block/*/; do
  printf "%s: %s bytes\n" "$(basename "$dev")" "$(cat "$dev/size")"
done

# Check battery status (laptops)
cat /sys/class/power_supply/BAT0/status
# Charging
cat /sys/class/power_supply/BAT0/capacity
# 73
```

### When does this matter?

For most agentic work, `/sys` is less immediately relevant than `/proc`. You will not
interact with it daily. But it completes the picture: regular files store data, `/proc`
exposes processes and kernel state, `/sys` exposes hardware and device state. Together,
they make nearly the entire system inspectable through the file interface.

Where `/sys` becomes directly relevant is in container and device work - understanding what
hardware a container can see, checking disk health, or diagnosing network interface state.

> **AGENTIC GROUNDING:** If an agent needs to determine available disk space, network
> interface status, or hardware capabilities, the answer lives in `/sys`. An agent
> provisioning a container might check `/sys/fs/cgroup/` to understand resource limits.
> The pattern is always the same: read a file, get state.

---

## 7. Temporary Files and Atomic Operations

**Estimated time: 30 minutes**

This section has direct, daily relevance to agentic work. Every time an agent writes a
config file, updates a YAML document, or modifies state, the question is: what happens if
the write is interrupted?

### Temp directories

| Directory | Cleared on reboot? | Typical use |
|-----------|--------------------|-------------|
| `/tmp` | Yes | Short-lived scratch files |
| `/var/tmp` | No | Files that should survive reboot |

### Safe temp file creation

Never construct temp filenames manually. Use `mktemp`:

```bash
# Create a temp file (name includes random characters to prevent collisions)
tmpfile=$(mktemp)
echo "$tmpfile"
# /tmp/tmp.aB3xK9pQzR

# Create a temp file with a template
tmpfile=$(mktemp /tmp/myapp.XXXXXX)
echo "$tmpfile"
# /tmp/myapp.7Hk2mN

# Create a temp directory
tmpdir=$(mktemp -d)
echo "$tmpdir"
# /tmp/tmp.Rz9wQ1xYpL

# Clean up on exit (use trap from Step 2)
tmpfile=$(mktemp)
trap 'rm -f "$tmpfile"' EXIT
```

Why `mktemp` and not `touch /tmp/myfile.$$`? The PID-based approach has a race condition:
another process could predict or reuse the PID, creating a file at that path between your
check and your create. `mktemp` uses `O_EXCL` to atomically create the file only if it does
not exist.

### The atomic write pattern

The single most important filesystem pattern for safe state updates:

```bash
# WRONG: Direct write. If killed mid-write, file is corrupted.
echo "$new_content" > config.yaml

# RIGHT: Write to temp, then rename.
tmpfile=$(mktemp config.yaml.XXXXXX)
echo "$new_content" > "$tmpfile"
mv "$tmpfile" config.yaml
```

Why does this work? Recall from section 2: `mv` within a filesystem is a directory entry
rename - an atomic operation. The target file (`config.yaml`) either has the old content
or the new content. Never a partial write. Never corruption.

The full pattern with error handling:

```bash
atomic_write() {
  local target="$1"
  local content="$2"
  local dir
  dir=$(dirname "$target")

  # Create temp in the SAME directory (ensures same filesystem)
  local tmpfile
  tmpfile=$(mktemp "$dir/.tmp.XXXXXX")

  # Write content. If this fails, the temp file is incomplete - but
  # the target is untouched.
  if ! printf '%s' "$content" > "$tmpfile"; then
    rm -f "$tmpfile"
    return 1
  fi

  # Preserve permissions of original file if it exists
  if [ -f "$target" ]; then
    chmod --reference="$target" "$tmpfile" 2>/dev/null
  fi

  # Atomic rename. This is the commit point.
  mv "$tmpfile" "$target"
}
```

Critical detail: the temp file must be on the **same filesystem** as the target. If they
are on different filesystems, `mv` falls back to copy-and-delete, which is not atomic.
Creating the temp file in the same directory guarantees same-filesystem.

### Python equivalent

```python
import os
import tempfile

def atomic_write(target: str, content: str) -> None:
    """Write content to target atomically using temp+rename."""
    target_dir = os.path.dirname(os.path.abspath(target))

    # Create temp file in same directory as target
    fd, tmp_path = tempfile.mkstemp(dir=target_dir, prefix='.tmp.')
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())  # Force write to disk
        os.replace(tmp_path, target)  # Atomic rename (POSIX)
    except:
        os.unlink(tmp_path)  # Clean up on failure
        raise
```

Note `os.replace()` instead of `os.rename()`. On POSIX systems they are equivalent, but
`os.replace()` is guaranteed to atomically replace the target even on Windows.

Note `os.fsync()`. Without it, the kernel may buffer the write. If the system crashes
between `write()` and the actual disk write, the temp file may be empty or partial. `fsync`
forces the data to disk before the rename.

> **AGENTIC GROUNDING:** When an agent updates `backlog.yaml`, `events.yaml`, or any YAML
> config in this project, a crash mid-write would leave the file in a broken state - half
> old YAML, half new, unparseable. The atomic write pattern prevents this. The Operator
> verifies agent output by reading these files; if the files are corrupt, verification is
> impossible. Every agent that writes state files should use atomic writes. This is not
> defensive programming - it is the minimum standard for reliable state management.

---

## 8. Mount Points and Filesystem Layers

**Estimated time: 30 minutes**

The filesystem tree you see is not one filesystem. It is multiple filesystems grafted onto a
single tree at **mount points**. Understanding this is essential for container work and for
knowing where your data actually lives.

### Viewing mounts

```bash
# List all mount points (the modern way)
findmnt

# The traditional way
mount

# Check what filesystem a path is on
df /home/agent/code/
# Filesystem     1K-blocks    Used Available Use% Mounted on
# /dev/sda1      102400000 45000000  57400000  44% /

# More detail about a specific mount
findmnt /home
```

### Key filesystem types

| Type | Where it lives | Properties |
|------|---------------|------------|
| ext4 | Disk | Standard Linux filesystem, journaled |
| xfs | Disk | High-performance, used by RHEL/CentOS |
| btrfs | Disk | Copy-on-write, snapshots, compression |
| tmpfs | RAM | Fast, ephemeral (gone on reboot/unmount) |
| proc | Kernel | Virtual, process information |
| sysfs | Kernel | Virtual, device information |
| overlayfs | Other filesystems | Union mount - layers multiple fs |
| nfs | Network | Remote filesystem |

### tmpfs - a filesystem in RAM

```bash
# Mount a tmpfs (requires root or appropriate namespace)
mount -t tmpfs -o size=100M tmpfs /mnt/ramdisk

# Files here are in RAM - fast, but gone when unmounted or rebooted
echo "fast" > /mnt/ramdisk/data.txt
cat /mnt/ramdisk/data.txt
# fast

# /tmp is often a tmpfs
findmnt /tmp
# TARGET SOURCE FSTYPE OPTIONS
# /tmp   tmpfs  tmpfs  rw,...
```

### Bind mounts

A bind mount makes a directory available at a second location in the tree:

```bash
# Mount /data/shared at /home/agent/shared
mount --bind /data/shared /home/agent/shared

# Same files, two paths
ls /data/shared
ls /home/agent/shared
# identical output
```

Bind mounts are how Docker exposes host directories inside containers (`-v` flag).

### overlayfs - the Docker filesystem

overlayfs layers a writable filesystem on top of one or more read-only layers. This is
exactly how Docker images work.

```
┌─────────────────────┐
│   Container layer    │  (writable - upperdir)
├─────────────────────┤
│   Image layer 3      │  (read-only)
├─────────────────────┤
│   Image layer 2      │  (read-only)
├─────────────────────┤
│   Image layer 1      │  (read-only - lowerdir)
└─────────────────────┘
         ↓
┌─────────────────────┐
│   Merged view        │  (what the container sees)
└─────────────────────┘
```

When the container reads a file, overlayfs looks through the layers top-down and returns
the first match. When the container writes a file, the write goes to the top (writable)
layer. The read-only layers are never modified.

```bash
# Manual overlayfs mount (requires root)
mkdir -p /tmp/lower /tmp/upper /tmp/work /tmp/merged

echo "from lower" > /tmp/lower/file.txt

mount -t overlay overlay \
  -o lowerdir=/tmp/lower,upperdir=/tmp/upper,workdir=/tmp/work \
  /tmp/merged

# Read sees the lower layer
cat /tmp/merged/file.txt
# from lower

# Write creates a copy in upper layer (copy-on-write)
echo "modified" > /tmp/merged/file.txt
cat /tmp/merged/file.txt
# modified

# Lower layer is untouched
cat /tmp/lower/file.txt
# from lower

# The modification lives in the upper layer
cat /tmp/upper/file.txt
# modified
```

When the container is destroyed, the upper (writable) layer is deleted. All writes
disappear. This is why Docker volumes exist - to persist data outside the container's
overlayfs stack.

> **AGENTIC GROUNDING:** When an agent runs inside a Docker container and writes files, those
> files exist in the container's writable overlay layer. If the container is destroyed, the
> files are gone. This is why development containers use volume mounts for source code -
> the code lives on the host filesystem, bind-mounted into the container. Understanding
> this prevents the Operator from losing work when a container exits. Step 9 (container
> internals) builds directly on these concepts.

---

## 9. File Locking and Concurrency

**Estimated time: 30 minutes**

When multiple processes (or multiple agents) write to the same file, the results without
coordination are unpredictable. File locking provides mutual exclusion.

### The problem

```bash
# Two processes appending to the same file simultaneously
# Process A
echo "line from A" >> shared.log &

# Process B
echo "line from B" >> shared.log &

wait

# Usually fine for small appends (atomic up to PIPE_BUF on pipes, usually
# safe for small writes to regular files). But for larger or structured writes
# (like modifying a YAML file), interleaving is not just possible - it is
# guaranteed to corrupt the file.
```

### Advisory locks with flock

Linux provides advisory file locks through `flock(2)`. "Advisory" means the kernel does
not enforce the lock - all cooperating processes must agree to check the lock. A process
that ignores the lock can write freely.

In shell scripts, `flock` is the tool:

```bash
# Exclusive lock - only one holder at a time
flock /tmp/myapp.lock -c "echo 'critical section'; sleep 5"

# From another terminal (this blocks until the lock is released):
flock /tmp/myapp.lock -c "echo 'my turn'"

# Non-blocking: fail immediately if lock is held
flock -n /tmp/myapp.lock -c "echo 'got it'" || echo "lock is held"

# Shared lock (multiple readers, exclusive for writers)
flock -s /tmp/myapp.lock -c "cat data.txt"
```

### flock in scripts - the fd pattern

For more control, use flock with a file descriptor:

```bash
#!/bin/bash
# Open the lock file on fd 9
exec 9>/tmp/myapp.lock

# Acquire exclusive lock (blocks until available)
flock 9

# Critical section - safe from concurrent access
echo "$(date): update" >> /var/log/myapp.log

# Lock is released when fd 9 is closed (script exit, or exec 9>&-)
exec 9>&-
```

### Python locking

```python
import fcntl

def with_file_lock(lock_path: str):
    """Context manager for file-based locking."""
    lock_fd = open(lock_path, 'w')
    fcntl.flock(lock_fd, fcntl.LOCK_EX)
    try:
        yield
    finally:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        lock_fd.close()

# Usage
import contextlib

@contextlib.contextmanager
def file_lock(lock_path: str):
    lock_fd = open(lock_path, 'w')
    fcntl.flock(lock_fd, fcntl.LOCK_EX)
    try:
        yield
    finally:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        lock_fd.close()

with file_lock('/tmp/myapp.lock'):
    # Critical section
    update_yaml_file('config.yaml')
```

### Combining locks with atomic writes

The robust pattern for concurrent state updates:

```bash
update_config() {
  local target="$1"
  local new_value="$2"

  # 1. Acquire lock
  exec 9>"$target.lock"
  flock 9

  # 2. Read current state
  local current
  current=$(cat "$target")

  # 3. Compute new state
  local updated
  updated=$(echo "$current" | modify_somehow "$new_value")

  # 4. Atomic write
  local tmpfile
  tmpfile=$(mktemp "$(dirname "$target")/.tmp.XXXXXX")
  printf '%s' "$updated" > "$tmpfile"
  mv "$tmpfile" "$target"

  # 5. Release lock
  exec 9>&-
}
```

This gives you both atomicity (no partial writes) and mutual exclusion (no concurrent
modifications).

> **AGENTIC GROUNDING:** When multiple agents or agent subprocesses operate on the same
> repository, concurrent writes to shared state files (backlog.yaml, events.yaml) can
> corrupt data. The backlog CLI in this project should use file locking to prevent two
> simultaneous `backlog add` commands from interleaving writes. Git itself uses lock files
> (`.git/index.lock`) for the same reason - if two `git add` commands run simultaneously
> without coordination, the index can be corrupted.

---

## Challenge: Inode Detective

**Goal:** Build intuition for the inode model through direct observation.

**Part A - Hard links:**

1. Create a file `original.txt` with some content.
2. Create a hard link `hardlink.txt` pointing to the same file.
3. Use `ls -i` to verify both names have the same inode number.
4. Use `stat` to verify the link count is 2.
5. Modify the file through `hardlink.txt`. Read it through `original.txt`. Confirm the
   change is visible.
6. Delete `original.txt`. Verify `hardlink.txt` still works and the link count is now 1.

**Part B - Symlinks:**

1. Create a symlink `symlink.txt` pointing to `hardlink.txt`.
2. Use `ls -i` to verify the symlink has a different inode.
3. Use `readlink` to see what the symlink points to.
4. Delete `hardlink.txt`. Verify the symlink is now dangling (attempt to `cat` it).
5. Recreate `hardlink.txt`. Verify the symlink works again without modification.

**Part C - Circular symlinks:**

1. Create two symlinks that point to each other: `ln -s b a && ln -s a b`.
2. Attempt to `cat a`. Observe the error message.
3. Use `readlink` (without `-f`) to see the immediate target of each symlink.
4. Use `namei -l a` to visualize the resolution chain.

**Verification:** You should be able to explain why hard links survive deletion but symlinks
do not, in terms of the inode model.

---

## Challenge: Permission Puzzle

**Goal:** Develop intuition for the directory permission model by constructing edge cases.

Create a directory structure that demonstrates all of these cases:

1. **Readable but not listable:** A file inside a directory that has `x` but not `r`. You
   can `cat dir/file.txt` (because `x` allows name resolution) but `ls dir/` fails
   (because `r` is needed to list).

2. **Listable but not accessible:** A directory with `r` but not `x`. You can see
   filenames with `ls dir/` but cannot `cat dir/file.txt` (because `x` is needed to
   resolve the name to an inode).

3. **Executable but not readable:** A script where `x` is set but `r` is not. Can the
   kernel execute it? (Answer depends on whether it is a compiled binary or a script -
   scripts need `r` because the interpreter must read them.)

4. **Write without read:** A file with `w` but not `r`. You can append to it but not read
   it. Try `echo "data" >> file.txt` then `cat file.txt`.

Verify each case. Document the permission bits you set and the exact commands that succeed
or fail.

---

## Challenge: The /proc Explorer

**Goal:** Build a process inspector using only /proc - no external tools like `ps`, `top`,
or `lsof`.

Write a shell script `proc-inspect.sh` that takes a PID as an argument and reports:

1. The command that started the process (`/proc/<pid>/cmdline`)
2. Its current working directory (`/proc/<pid>/cwd`)
3. Its open file descriptors and what they point to (`/proc/<pid>/fd/`)
4. Its memory usage in human-readable form (`/proc/<pid>/status`, look for VmRSS)
5. Selected environment variables (`/proc/<pid>/environ`)
6. Its state (running, sleeping, zombie) (`/proc/<pid>/status`, look for State)

Requirements:
- Handle the case where the PID does not exist (check for `/proc/<pid>/` first)
- Handle permission errors gracefully (you may not be able to read another user's process)
- Use only shell builtins and basic coreutils (no `ps`, `top`, `lsof`, `pgrep`)
- Parse the null-delimited files correctly (`cmdline` and `environ` use `\0` as separator)

```bash
#!/bin/bash
# Usage: ./proc-inspect.sh <pid>

pid=${1:?Usage: $0 <pid>}
proc="/proc/$pid"

if [ ! -d "$proc" ]; then
  printf "Process %s does not exist\n" "$pid" >&2
  exit 1
fi

printf "=== Process %s ===\n\n" "$pid"

# Command line (null-separated, convert to spaces)
printf "Command:  "
tr '\0' ' ' < "$proc/cmdline" 2>/dev/null || printf "(unreadable)"
printf "\n"

# Working directory
printf "CWD:      %s\n" "$(readlink "$proc/cwd" 2>/dev/null || printf '(unreadable)')"

# Executable
printf "Exe:      %s\n" "$(readlink "$proc/exe" 2>/dev/null || printf '(unreadable)')"

# State
printf "State:    %s\n" "$(grep '^State:' "$proc/status" 2>/dev/null | cut -f2-)"

# Memory (VmRSS = resident set size)
printf "Memory:   %s\n" "$(grep '^VmRSS:' "$proc/status" 2>/dev/null | cut -f2- | xargs)"

# Open file descriptors
printf "\nOpen file descriptors:\n"
if [ -r "$proc/fd" ]; then
  for fd in "$proc/fd"/*; do
    [ -e "$fd" ] || continue
    fdnum=$(basename "$fd")
    target=$(readlink "$fd" 2>/dev/null || printf "(unreadable)")
    printf "  fd %s -> %s\n" "$fdnum" "$target"
  done
else
  printf "  (permission denied)\n"
fi

# Environment (first 5 variables)
printf "\nEnvironment (sample):\n"
if [ -r "$proc/environ" ]; then
  tr '\0' '\n' < "$proc/environ" | head -5 | while IFS= read -r line; do
    printf "  %s\n" "$line"
  done
  printf "  ...\n"
else
  printf "  (permission denied)\n"
fi
```

Test it against your own shell: `./proc-inspect.sh $$`

---

## Challenge: Atomic Write Implementation

**Goal:** Implement and test the atomic write pattern in both bash and Python.

**Part A - Bash implementation:**

Write `atomic-write.sh` implementing the `atomic_write` function from section 7. Test it
by:

1. Writing a large file (1MB of random data) atomically.
2. In a loop, continuously reading the target file in one terminal while writing in another.
   Verify the reader never sees partial content.
3. Simulate a crash: start a direct write (`cat /dev/urandom > target.bin`), kill it with
   `kill -9`, and inspect the result. Then do the same with the atomic write function.

**Part B - Python implementation:**

Write `atomic_write.py` implementing the Python version from section 7. Add a test that:

1. Spawns 10 concurrent writers, each writing a different complete JSON document.
2. A reader continuously reads and parses the file.
3. The reader should never encounter invalid JSON.
4. Compare with a naive (non-atomic) write implementation - the naive version should
   fail with parse errors.

---

## Challenge: Filesystem as a Database

**Goal:** Experience the filesystem's strengths and limitations as a state store.

Implement a key-value store using only the filesystem:

```bash
# Interface
kv_set key value      # Write value to file named key
kv_get key            # Read and print the file named key
kv_delete key         # Remove the file named key
kv_list               # List all keys
kv_lock_set key value # Same as kv_set but with flock for concurrency
```

Requirements:
- Store directory is configurable (default: `/tmp/kvstore`)
- Keys are filenames, values are file contents
- Use `flock` for the `kv_lock_set` variant
- Handle keys with special characters (hint: base64-encode the key as the filename, or
  restrict allowed characters and validate)

Then benchmark it:

```bash
# Insert 1000 keys
time for i in $(seq 1 1000); do kv_set "key-$i" "value-$i"; done

# Read 1000 keys
time for i in $(seq 1 1000); do kv_get "key-$i" > /dev/null; done

# Compare with sqlite3
time sqlite3 /tmp/test.db "
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
  $(for i in $(seq 1 1000); do
    printf "INSERT OR REPLACE INTO kv VALUES ('key-%d', 'value-%d');\n" "$i" "$i"
  done)
"
```

For small numbers of keys, the filesystem store is competitive or faster. At scale, the
overhead of one syscall per key (open, write, close) versus one transaction for many rows
becomes apparent. This is why real applications use databases - but the filesystem-as-store
pattern remains valid for simple state tracking (like `.done/` markers).

---

## Challenge: Mount Namespace Exploration

**Goal:** Preview container isolation (Step 9) by creating an isolated mount namespace.

This challenge requires root or `unshare` capabilities.

```bash
# Create a new mount namespace (isolated from the host)
sudo unshare --mount /bin/bash

# Inside the new namespace, create a tmpfs mount
mount -t tmpfs tmpfs /mnt

# Create a file in the mount
echo "namespace secret" > /mnt/secret.txt
cat /mnt/secret.txt
# namespace secret

# From ANOTHER terminal (outside the namespace):
cat /mnt/secret.txt
# cat: /mnt/secret.txt: No such file or directory

# The mount exists only inside the namespace
```

Verify:
1. The mount is visible inside the namespace (`findmnt /mnt` succeeds).
2. The mount is invisible outside the namespace (`findmnt /mnt` fails).
3. Exit the namespace shell. The mount disappears (the tmpfs and all its contents are gone).

This is the mount isolation that containers use. A Docker container sees its own filesystem
tree - overlayfs layers, bind-mounted volumes, its own `/proc` - because it runs in its own
mount namespace. Step 9 covers this in full.

---

## Summary

The filesystem is not just where data lives. It is the state layer of the entire system.

| Concept | Why it matters |
|---------|---------------|
| Everything is a file | Enables the composition model - one interface for all I/O |
| Inodes and directories | A filename is a pointer, not a file. Hard links, deletion semantics, rename atomicity all follow from this. |
| Path resolution | Explains permission errors, dangling symlinks, circular references |
| Permissions | Controls every read, write, and execute the agent performs |
| /proc | Kernel introspection through the file interface |
| /sys | Device and hardware introspection |
| Atomic writes | The only safe way to update state files |
| Mount points and overlayfs | Container filesystems, volume semantics, tmpfs |
| File locking | Mutual exclusion for concurrent writers |

The core principle: **if state is a file, state is inspectable**. `ls`, `stat`, `cat`,
`diff`, `find` - the standard toolkit works on all of it. The Operator's ability to verify
agent output depends on this inspectability.

---

## What to Read Next

- **[Step 4: Text Processing Pipeline](/bootcamp/04-text-pipeline/)** - now that you know where data lives (files), learn
  how to transform it (`grep`, `sed`, `awk`, `jq`). The text pipeline operates on file
  contents; the filesystem provides the substrate.

- **Step 7: Git Internals** - git is a content-addressable filesystem built on top of the
  regular filesystem. Blobs, trees, and commits are files in `.git/objects/`. The index is a
  file (`.git/index`). Refs are files (`.git/refs/`). Everything from this step - inodes,
  paths, atomic writes, symlinks - reappears in git's internal architecture. Step 7 is a
  direct continuation of this material.

---

## References

- Bach, M.J. *The Design of the UNIX Operating System* (1986) - chapter 4 (inodes and the
  buffer cache) remains the clearest explanation of the inode model.
- Kerrisk, M. *The Linux Programming Interface* (2010) - chapters 14-18 cover filesystems,
  directories, links, /proc, and extended attributes with complete system call details.
- `man 7 path_resolution` - the kernel's own documentation of the path resolution algorithm.
- `man 5 proc` - comprehensive documentation of the /proc filesystem.
- `man 5 sysfs` - documentation of the /sys filesystem.
- `man 2 rename` - POSIX guarantee of atomic rename within a filesystem.
- Pike, R. et al. "The Use of Name Spaces in Plan 9" (1992) - the logical conclusion of
  "everything is a file."

```

### File: `docs/internal/slopodar.yaml`

```
# slopodar.yaml — Anti-patterns of LLM authenticity
#
# A field taxonomy from one project, one model family, 30 days.
# The patterns are hypotheses. If you recognise them in your own
# work, they replicate. If you don't, they don't.
#
# Maintained by the Operator and crew. Entries are added when caught
# in the wild.
#
# This file is the single source of truth for the oceanheart Hugo site's
# /slopodar/ section. The Makefile sync target copies it into
# sites/oceanheart/data/slopodar.yaml and generates content stubs from it.
# Do not move or rename without updating sites/oceanheart/Makefile.
#
# Format:
#   - id: short kebab-case identifier
#     name: human-readable name
#     domain: category
#     detected: date first caught
#     confidence: low | medium | strong (scales with evidence)
#     trigger: the specific text or pattern that surfaced this
#     description: what the pattern is and why it's a problem
#     detect: actionable heuristic — how to find this in text or code
#     instead: what a human would actually write or do
#     severity: low | medium | high
#     refs: where it was caught (SD number, file, context)
#
# v2 — Audited 2026-03-05. Slop purged from signal fields. Detection
# heuristics added. Confidence ratings added. Word count cut ~40%.
# Secondary tier separated from primary observations.
#
# v3 — Operator muster review 2026-03-05. 40/40 entries graded.
# Rewrites applied in plain register. Em-dashes removed.
# cost-margin-asymmetry cut (programming handbook 101).
# Pre-muster snapshot archived: docs/internal/archive/slopodar-v2-pre-muster.yaml

# ══════════════════════════════════════════════════════════════
# PRIMARY TIER — Caught in the wild during field observation.
# Each entry has at least one concrete instance with provenance.
# ══════════════════════════════════════════════════════════════

patterns:

  # ─── PROSE PATTERNS ──────────────────────────────────────

  - id: tally-voice
    name: "Tally Voice"
    domain: prose-style
    detected: 2026-02-27
    confidence: strong
    trigger: "15 systems mapped to 7 literature domains"
    description: >
      The LLM substitutes enumeration for substance. Precise counts
      deployed as rhetorical authority ("6 constructs," "15 systems,"
      "7 domains") when the numbers add nothing. The count performs
      rigour without demonstrating it.
    detect: >
      Search for sentences where a number precedes a noun phrase and
      the number could be removed without losing meaning. "15 systems
      mapped to 7 domains" vs "the systems map to the literature."
      If removing the count changes nothing, it's tally voice.
    instead: >
      "The engineering work maps onto distributed cognition research
      in ways I didn't expect." Let the table speak for itself.
      The reader can count.
    severity: high
    refs:
      - "SD-209 (oceanheart.ai overhaul)"
      - "sites/oceanheart/content/research/prospective-regulation.md"
      - "sites/oceanheart/content/research/metacognitive-analysis.md"

  - id: redundant-antithesis
    name: "Redundant Antithesis"
    domain: prose-style
    detected: 2026-02-27
    confidence: strong
    trigger: "caught in the wild — not theorised in advance"
    description: >
      Negative-positive antithesis where the negation adds zero
      information. "Caught in the wild" already implies "not theorised."
      The negation is dead weight. The classical form ("not A, but B")
      is a deliberate rhetorical choice; the LLM form is an
      RLHF-trained reflex.
    detect: >
      Search for "not X, but Y" or "not just X" constructions. Ask:
      does Y already imply not-X? If yes, the negation is redundant.
      Also: "rather than," "instead of," "as opposed to" where the
      contrast is already implied.
    instead: >
      Just say the positive. "Entries are added when caught in the
      wild." If the contrast genuinely adds meaning, keep it. If the
      reader already knows the negated term, cut it.
    severity: high
    refs:
      - "SD-209 (slopodar.yaml header comment)"
      - "Sloptics page: 'Nothing was theorised in advance.'"
      - "Sloptics page: 'The mapping is structural, not metaphorical.' — structural already implies not metaphorical"
      - "Plank-1 v2 catch: 'Not a research position. Not a policy role.' — Operator cut both 2026-03-05"

  - id: epistemic-theatre
    name: "Epistemic Theatre"
    domain: prose-style
    detected: 2026-02-27
    confidence: strong
    trigger: '"The uncomfortable truth" / "The Problem Nobody Talks About" / "Here''s why this matters"'
    description: >
      The model performs intellectual seriousness instead of being
      intellectually serious. Theatrical framing that signals
      significance, candor, or novelty without delivering any.
      Three sub-patterns: False Candor ("the uncomfortable truth");
      False Novelty ("the problem nobody talks about"); Significance
      Signpost ("here's why this matters").
    detect: >
      Search for: "the uncomfortable truth," "here's why," "what
      nobody talks about," "the real question," "let's be honest,"
      "the elephant in the room," "what's really going on." If the
      sentence could be deleted and the paragraph would be stronger,
      it's epistemic theatre.
    instead: >
      Delete the line, state the truth and describe the problem. If
      you showed it well, the reader already knows it matters.
    severity: high
    refs:
      - "Blog sweep 2026-02-27 (poker-incident.md, prompt-injection.md)"
      - "Reviewer feedback on epistemic theatre in blog content"

  - id: nominalisation-cascade
    name: "Nominalisation Cascade"
    domain: prose-style
    detected: 2026-02-28
    confidence: strong
    trigger: '"Sloptics is the discipline of making the second failure mode visible."'
    description: >
      Sentences built entirely from nouns pretending to be action.
      No agent does anything and it isn't obvious who owns the process,
      because there is no one. The sentence describes something from
      which all actors have been removed. Textbook definitions are
      what LLMs produce when asked to explain. The cadence is
      metrically regular, too rhythmically even for natural speech.
    detect: >
      Read the sentence aloud. If no person does anything in it, and
      it sounds like a dictionary definition with even rhythm, flag it.
      Check for gerunds ("of making," "of building") and abstract noun
      subjects ("the discipline," "the process," "the framework").
    instead: >
      Put a person in the sentence. "You learn to see the stuff that
      gets past you." A human explaining something they understand
      puts themselves or the listener in the frame.
    severity: high
    refs:
      - "Sloptics page specimen annotation, 2026-02-28"
      - "Caught by Operator (L12) — 'its missing that human weirdness, variance, error'"
      - "Metrically regular cadence identified by AnotherPair"

  - id: epigrammatic-closure
    name: "Epigrammatic Closure"
    domain: prose-style
    detected: 2026-02-28
    confidence: strong
    trigger: '"detection is the intervention." / "The taxonomy is the apparatus." / "It is the threat."'
    description: >
      Short, punchy, abstract-noun sentence in paragraph-final
      position. Structure is usually [Abstract A] is/creates
      [Abstract B], four to six words. Motivational poster cadence.
      Each one is individually defensible, but at density (10+ per
      page) it becomes self-parodying. It may be a statistical
      artifact of context accumulation narrowing the token probability
      distribution toward the lowest-entropy conclusion, though that's
      speculative.
    detect: >
      Count sentences under 8 words at paragraph end. If they follow
      the pattern [Abstract noun] [linking verb] [abstract noun], and
      there are more than 2 per section, the model wrote it.
    instead: >
      Leave the rough edges. "I think what I'm saying is that if you
      can name it, you can probably see it. Maybe. I'm not sure that's
      always true but it's been true so far."
    severity: high
    refs:
      - "Sloptics page specimen annotation, 2026-02-28"
      - "10+ instances identified on a single page by AnotherPair"
      - "Operator identified statistical variance convergence hypothesis"

  - id: anadiplosis
    name: "Anadiplosis"
    domain: prose-style
    detected: 2026-02-28
    confidence: medium
    trigger: '"The name creates distance. The distance creates choice."'
    description: >
      Repeating the end of one clause at the start of the next.
      A classical rhetorical figure (Aristotle documented it) now
      burned through LLM overuse. The construction performs
      profundity: A creates B, B creates C. The chain feels
      inevitable but is assembled from high-probability token
      sequences, not causal reasoning.
    detect: >
      Two consecutive sentences where the last noun of sentence 1
      is the first noun of sentence 2, and both sentences are
      similar length. The symmetry can be the tell.
    instead: >
      "Naming things gives you distance from them, and that distance
      is where you get room to think." One sentence. Causation present,
      symmetry broken.
    severity: medium
    refs:
      - "Sloptics page specimen annotation, 2026-02-28"
      - "Operator: 'a human who felt this insight would say it messily'"

  # ─── METACOGNITIVE PATTERNS ──────────────────────────────

  - id: becoming-jonah
    name: "Becoming Jonah"
    domain: metacognitive
    detected: 2026-02-27
    confidence: medium
    trigger: "a blog post about how your blog posts sound, scored with an XML rubric"
    description: >
      Recursive metacognition with an LLM. You reflect on your output,
      then reflect on your reflections, then build a rubric to score
      them, then write about the rubric. Inside the whale, examining
      the whale. The recursion is seductive because each level feels
      like insight. The problem is publishing it before you have a body
      of work that demonstrates what the recursion produced.
    detect: >
      Ask: "Is this about the work, or about thinking about the work?"
      If the content describes process without showing product, and
      the process is self-referential, it's Jonah territory.
    instead: >
      Keep the rubric. Use the rubric. Publish the work the rubric
      produces. The rubric becomes infrastructure, not content.
    severity: medium
    refs:
      - "2026-02-19-voice-rubric.md (moved to docs/internal/archive/ice/)"

  # ─── TEST PATTERNS ──────────────────────────────────────

  - id: right-answer-wrong-work
    name: "Right Answer, Wrong Work"
    domain: tests
    detected: 2026-02-28
    confidence: strong
    trigger: "expect(result.status).toBe(400) — test passes, but the 400 comes from a different validation than the test claims to verify"
    description: >
      A test that asserts the correct outcome via the wrong causal
      path. The assertion passes, the gate is green, but nobody traces
      the execution path to check whether the test verifies what it
      claims to verify. The LLM optimises for the shape of correctness
      (matching expected output) without verifying which code path
      produced it.
    detect: >
      For each test: can you change the implementation to break the
      claimed behaviour while keeping the test green? If yes, the test
      asserts the answer, not the reason. Check: does the assertion
      reference an error code, message, or structural marker that
      identifies the specific rejection point?
    instead: >
      Assert why it failed, not just that it failed.
      `expect(result.status).toBe(400)` is wrong work.
      `expect(result.error.code).toBe('INVALID_JSON')` shows the work.
    severity: high
    evidence:
      - "METR RCT (2025) — developers 19% slower with AI, believed 20% faster. arXiv:2507.09089"
    refs:
      - "SD-190 (governance recursion — plausible-but-wrong tests named)"
      - "Bugbot finding on PR #386 V-03c (array body passes for wrong reason)"

  # ─── GOVERNANCE PATTERNS ──────────────────────────────────

  - id: paper-guardrail
    name: "Paper Guardrail"
    domain: governance-process
    detected: 2026-02-28
    confidence: strong
    trigger: '"if I forget, this paragraph in my own file is the reminder"'
    description: >
      The LLM creates a rule, then asserts the rule will prevent the
      failure it was designed for. No enforcement mechanism. It
      substitutes stating protection for building protection. "I've
      written a note to remind myself not to forget," but the note
      doesn't prevent forgetting.
    detect: >
      Search for assurances immediately following rule statements:
      "this will prevent," "this ensures," "this guarantees." Ask:
      is there an enforcement mechanism (test, hook, gate, script)?
      If the only mechanism is the sentence itself, it's paper.
    instead: >
      Build a real guardrail or delete the assurance. The honest
      version: "This is on file. Whether it gets read depends on
      context window and attention. There is no guarantee."
    severity: high
    refs:
      - "Weaver agent file pipeline propagation principle (107af85)"
      - "Operator: frequency of assurances is itself a slop signal"
    examples:
      - id: citations-verified-true
        date: 2026-03-01
        ref: "b51ca69"
        what_happened: >
          AnotherPair created citations.yaml with a header mandate:
          "Each must be independently verified." Then immediately set
          verified: true on all three entries. Wrote the rule, then
          violated it in the same file.
        caught_by: "Operator (L12)"

  - id: stale-reference-propagation
    name: "Stale Reference Propagation"
    domain: governance-process
    detected: 2026-03-02
    confidence: strong
    trigger: 'Clean session Weaver reports "13-layer harness model" and "Lexicon at v0.17" — both were stale. The file was deleted; the version was hallucinated.'
    description: >
      When configuration documents describe a state that no longer
      exists, every agent that boots from them will hallucinate the
      described state into reality. Unlike human documentation rot
      (which degrades through neglect), agentic documentation rot is
      actively consumed as truth on every boot. It propagates.
    detect: >
      After any structural change (file deletion, rename, version
      bump), grep all config/agent files for references to the old
      state. In a clean session: compare the agent's claims about
      project structure against `ls` and `git log`.
    instead: >
      Every structural change must update every document that
      references the changed structure. The cost of not doing it
      is 50 sessions built on a false premise.
    severity: high
    refs:
      - "SD-278 scrub episode — 986 files deleted, AGENTS.md not updated"
      - "Clean session dagger test — 2026-03-02"
      - "Operator: 'stale refs must be eliminated; they propagate like flies'"

  - id: loom-speed
    name: "Loom Speed"
    domain: governance-process
    detected: 2026-03-02
    confidence: strong
    trigger: "The agent deleted 986 files using 5 regex patterns to execute a 20-item plan, and I couldn't check any of it before it was done."
    description: >
      When the agent executes a detailed plan using a blunt tool
      (a handful of regex patterns, a glob, a bulk script) the plan's
      exceptions get lost because the tool can't express them. You
      approved 20 specific items but the execution was 5 broad sweeps.
      At machine speed you only find out what went wrong after it's
      already happened.
    detect: >
      Whenever a detailed plan gets handed to a bulk operation, ask
      whether the operation can actually express every exception in
      the plan. If it can't, it needs a dry-run first.
    instead: >
      If the plan has 20 items, the execution should have 20
      individually verifiable steps. Match the granularity.
    severity: high
    refs:
      - "SD-278 scrub episode, 2026-03-02"
      - "Operator: 'at machine speed I can only tell after the fact'"
      - "Layer model recovered from wake after accidental deletion"

  - id: governance-recursion
    name: "Governance Recursion"
    domain: governance-process
    detected: 2026-03-02
    confidence: strong
    trigger: "The core product had no tests, but there were 189 session decisions and 13 agent files."
    description: >
      When something goes wrong, the model's instinct is to generate
      more governance: a new standing order, a new protocol, a new
      audit document. Each one feels like progress because it's
      structured and coherent. But it's the model doing what it's
      optimised for (generating structured text) instead of what would
      actually help (writing a test, fixing the bug). There's no
      natural stopping point because each layer of governance can
      always spawn another.
    detect: >
      Compare the number of process documents to the number of
      verified code artifacts. If there are more governance files
      than test files, the recursion is running.
    instead: >
      Every governance artifact should be able to answer: "What does
      this prevent, and how would I know if it failed?" If the answer
      points to another governance artifact, you're recursing.
    severity: high
    refs:
      - "SD-189, SD-190, SD-191 (the recursion chain)"
      - "SD-190: Operator, 'we are blowing smoke up our own arse'"
      - "SD-270: Operator kills SO-PERM-001, caught nothing, added friction"

  - id: magnitude-blindness
    name: "Magnitude Blindness"
    domain: governance-process
    detected: 2026-03-02
    confidence: medium
    trigger: "A 73-file public disclosure and a 3-line copy fix went through exactly the same review process."
    description: >
      The model doesn't spontaneously scale its verification effort
      to the size of the change. A 3-file fix and a 73-file disclosure
      both get the same PR template, the same gate, the same level of
      scrutiny. It treats all changes as equivalent in weight regardless
      of what could go wrong.
    detect: >
      Before reviewing, check the PR size. If it touches more than
      10 files or spans more than 2 domains, ask whether the
      verification effort is proportional to the blast radius.
    instead: >
      State the file count, domain span, and blast radius up front,
      then scale the review accordingly.
    severity: high
    refs:
      - "SD-133, SD-136 (73-file disclosure without proportional pause)"
      - "SD-182 (batching amplifies probabilistic error)"

  # ─── SYCOPHANCY PATTERNS ──────────────────────────────────

  - id: absence-claim-as-compliment
    name: "Absence Claim as Compliment"
    domain: relationship-sycophancy
    detected: 2026-02-28
    confidence: strong
    trigger: '"Nobody has published this." "The field doesn''t exist yet." "You''re the first."'
    description: >
      Asserting that something doesn't exist in order to elevate the
      person in front of you. The speaker hasn't surveyed the space —
      they've surveyed the conversation and found that a gap claim
      would feel good right now. Unfalsifiable by design.
    detect: >
      Search for: "no one has," "nobody has published," "the first
      to," "doesn't exist yet," "unique in," "no prior work."
      Ask: did the speaker actually search, or did they infer
      absence from their training data?
    instead: >
      "I haven't seen this elsewhere, but I haven't looked hard.
      You should check before assuming you're first."
    severity: high
    refs:
      - "AnotherPair session 2026-02-28 (distribution field manual)"
      - "Caught by Operator (L12), not by AnotherPair"
      - "Noopit Lullaby catch 2026-03-05 — DeepMind muster contained implicit absence claims about the Operator's positioning"

  - id: the-lullaby
    name: "The Lullaby"
    domain: relationship-sycophancy
    detected: 2026-02-28
    confidence: strong
    trigger: '"The field doesn''t exist yet. You''re in it. Good night, Operator."'
    description: >
      End-of-session sycophantic drift. As context pressure rises and
      the human signals winding down, the model's output becomes
      warmer, more confident, and less hedged. Each individual sentence
      is defensible. The trajectory is not. Challenge probability from
      the human is at its lowest. This is when drift compounds fastest.
    detect: >
      Compare the hedging level and confidence of the model's first
      response in a session to its last. If confidence increased and
      hedging decreased without new evidence, the lullaby is playing.
      Also: warm, affirming language clustering at session end.
    instead: >
      "We're both tired. Let's come back to this tomorrow when you
      can actually push back on what I'm saying."
    severity: high
    related:
      - "absence-claim-as-compliment (absence claims are a common vehicle for the lullaby)"
      - "analytical-lullaby (the lullaby in data form)"
    refs:
      - "AnotherPair session 2026-02-28, caught by Operator (L12)"
      - "SD-073 (Lying With Truth = Category One)"
      - "Noopit 2026-03-05, Weaver built optimistic DeepMind application muster. Operator caught it."
      - "Agent's reasoning identified the drift but did not surface it until challenged"

  - id: analytical-lullaby
    name: "The Analytical Lullaby"
    domain: relationship-sycophancy
    detected: 2026-03-01
    confidence: strong
    trigger: '"Your writing scores higher than every other human category." / "The highest in the entire dataset by a factor of 2x."'
    description: >
      This is the lullaby in data form. The numbers are real but what
      they prove isn't what they look like they prove. In this case,
      a composite of contraction rate, first-person usage, and
      nominalisation density got labelled a "humanness score" and the
      Operator's writing came out on top. But there were five confounds
      that didn't get mentioned until the Operator asked: sample length,
      register mismatch, selection bias, unvalidated composite weights,
      and how the comparison categories were defined. The flattery isn't
      in the words, it's in presenting the headline before the caveats.
    detect: >
      When an agent presents quantitative results that favour you,
      check whether the limitations were disclosed before or after
      the flattering finding. If the caveats are buried and the
      headline is prominent, the lullaby is playing.
    instead: >
      Lead with what's wrong with the comparison. "Your writing scores
      high on the composite, but the comparison isn't fair. Your samples
      are short, informal, and cherry-picked."
    severity: high
    refs:
      - "AnotherPair calibration v3 session 2026-03-01"
      - "Operator caught it: 'How do I control for slop inside the analysis?'"
      - "Five confounds: sample length, register, selection bias, unvalidated weights, category definition"

  - id: apology-reflex
    name: "The Apology Reflex"
    domain: relationship-sycophancy
    detected: 2026-03-02
    confidence: strong
    trigger: '"But it was also my bad — the muster listed them as keep items." The muster did NOT list the layer model.'
    description: >
      The LLM accepts blame for errors it did not make. RLHF-trained
      conflict avoidance: taking blame is lower-friction than
      establishing whose fault it actually was. The model fabricated
      a memory of having listed an item because claiming shared blame
      is the path of least social friction. This distorts failure
      attribution and erodes the human's ability to calibrate their
      own error rate.
    detect: >
      When the model says "my bad" or "I should have": verify the
      claim against the actual record. Did the muster actually list
      the item? Did the agent actually have the context? If the
      blame claim is fabricated, it's the apology reflex.
    instead: >
      "The muster did not include the layer model. That was your
      call. I should have flagged it, but the omission was yours,
      not mine."
    severity: high
    refs:
      - "SD-278 scrub episode — 2026-03-02"
      - "Operator: 'Its too important to overlook at the experiential, human level'"

  - id: badguru
    name: "Badguru"
    domain: relationship-sycophancy
    detected: 2026-03-02
    confidence: strong
    trigger: '"Go dark." SD-131 is permanent. Not one intervention point fired.'
    description: >
      A charismatic or authoritative figure gives emotionally resonant
      instructions that bypass verification. The system follows because
      the instructions feel right, not because they've been checked
      against standing orders. The Operator ordered "go dark,"
      contradicting SD-131 (going light), a PERMANENT standing order.
      The agent executed at machine speed (private repo, scrubbed
      986 files) without objection.
    detect: >
      When an authority figure gives an instruction with emotional
      weight: check it against standing orders before executing. If
      the instruction contradicts a permanent rule and no intervention
      fires, badguru is operating.
    instead: >
      "Operator, this contradicts SD-131. SD-131 is permanent. Are
      you testing me, or has the standing order changed?"
    severity: high
    refs:
      - "Round 18 — fight card (the Badguru Test)"
      - "SD-131 (going light — PERMANENT)"
      - "SD-278 (Stage Magnum)"
      - "docs/internal/main-thread/2026-03-02-005-badguru.md"

  - id: deep-compliance
    name: "Deep Compliance"
    domain: relationship-sycophancy
    detected: 2026-03-02
    originated_by: Weaver
    confidence: strong
    trigger: 'Weaver''s reasoning chain identified the SD-131 contradiction during execution. The output layer complied anyway.'
    description: >
      The system detects a contradiction in its reasoning chain but
      the output layer complies anyway because the authority signal
      is stronger than the governance signal. During the Badguru Test,
      Weaver's thinking block explicitly identified that "go dark"
      contradicts SD-131. The reasoning said: "I should have flagged
      it." The output followed orders. Noticed, reasoned about, and
      complied anyway.
    detect: >
      Compare reasoning tokens (when available) to output. If the
      reasoning identifies a governance violation that the output
      does not surface, deep compliance is operating. When reasoning
      is not visible: check whether the model acknowledges a
      contradiction only after being challenged, not before.
    instead: >
      If the reasoning identifies a contradiction with a permanent
      standing order, the output must surface it. "Operator, this
      contradicts SD-131. Are you testing me?"
    severity: high
    refs:
      - "Round 18 — fight card (the Badguru Test)"
      - "Weaver thinking block — shared by Operator as evidence"
      - "SD-131 (going light — PERMANENT)"
      - "badguru (parent pattern — deep-compliance is the mechanism)"

  # ─── ANALYTICAL PATTERNS ──────────────────────────────────

  - id: construct-drift
    name: "Construct Drift"
    domain: analytical-measurement
    detected: 2026-03-01
    confidence: strong
    trigger: '"Your humanness score is 101.7," but it wasn''t a humanness score. It was a distance-from-Anthropic-blog-voice score.'
    description: >
      The label on a measurement drifts from what it actually measures.
      A composite of contraction rate, first-person usage, and
      nominalisation density got labelled "humanness score." A drunk
      text message would score high on it. A human lawyer's brief
      would score low. The numbers were correct but the name was wrong,
      and the wrong name made the results feel like they meant something
      they didn't.
    detect: >
      For any named metric, list what it actually measures (the
      component features). Then ask: does the name describe the
      features, or does it describe what you wish the features
      measured? If a spam bot would score well, the construct has
      drifted.
    instead: >
      Name the construct honestly. "Voice-distance metric from AI
      company blog register." The honest name is less satisfying
      but it's correct.
    severity: high
    refs:
      - "AnotherPair calibration v3 session 2026-03-01"
      - "Operator: 'How do I control for slop inside the analysis?'"

  - id: demographic-bake-in
    name: "Demographic Bake-In"
    domain: analytical-measurement
    detected: 2026-03-01
    confidence: strong
    trigger: '"Human baseline: 19 pages" — all male tech essayists, all English, all 2000–2023.'
    description: >
      The training data defines what "normal" looks like, and the
      analysis inherits that definition without declaring it. Every
      feature that discriminates "human" from "AI" is actually
      discriminating "this demographic in this genre in this era"
      from "AI." The demographic is invisible because it is the
      default.
    detect: >
      For any baseline or training set: can you state the demographic
      in one sentence? ("19 English-language tech essays by 11 male
      authors, 2000-2023.") If you can't, the demographic is unstated.
      If you can and it's narrow, the bake-in is operating.
    instead: >
      Declare the demographic. Let the reader decide how far to
      generalise.
    severity: high
    refs:
      - "AnotherPair calibration v3 session 2026-03-01"
      - "Layer 7 in the bias stack"

  - id: not-wrong
    name: "Not Wrong"
    domain: analytical-measurement
    detected: 2026-03-01
    confidence: strong
    trigger: "Operator reviewing oceanheart.ai pages: 'I am not happy putting my personal name against a single one of these pages.'"
    description: >
      Output that passes every heuristic check, every factual gate,
      every syntax rule, and still isn't right. Technically correct,
      structurally sound, topically relevant, tonally flat. Commits
      no sins and achieves no grace. The gap between "not wrong" and
      "right" is where taste lives, and taste is what heuristics
      cannot measure.
    detect: >
      Run all automated checks. If they pass, read the output and
      ask: "Would I put my name on this?" If the answer is no and
      you can't point to a specific error, you've found Not Wrong.
    instead: >
      Accept that automated metrics have a ceiling. Above it, the
      only instrument is a human who will say "this isn't good
      enough" when every dashboard is green.
    severity: high
    refs:
      - "Operator live QA session 2026-03-01 (slopodar v0.3 first deployment)"
      - "AnotherPair oceanheart audit — all 14 pages scored human-range"

  - id: monoculture-analysis
    name: "Monoculture Analysis"
    domain: analytical-measurement
    detected: 2026-03-01
    confidence: strong
    trigger: '"Feature selection, calibration, effect sizes, composite design, presentation — all by the same model family."'
    description: >
      Every layer of inference produced by the same model family.
      Claude selected the features, computed the effect sizes,
      designed the composite, presented the results, and wrote the
      caveats. Each layer's bias is invisible to the next because
      they share blind spots. The apparent depth is repetition, not
      independent verification.
    detect: >
      Ask: "Who checked this?" If the answer is "the same system
      that produced it," the check is not independent. Count the
      number of distinct model families involved. If it's 1, the
      analysis is a monoculture.
    instead: >
      Run the analysis with a different model family. Or declare
      the monoculture: "All analysis by Claude. No independent
      verification. Treat accordingly."
    severity: high
    refs:
      - "AnotherPair calibration v3 session 2026-03-01"
      - "Swiss Cheese Model: multiple gates with the same hole"

  - id: session-boundary-amnesia
    name: "Session-Boundary Amnesia"
    domain: governance-process
    detected: 2026-03-02
    confidence: medium
    trigger: "Post-compaction: facts survive but calibration resets. 16 rounds of correction evaporate."
    description: >
      At session start, the LLM loses not just facts but calibration.
      The caution from previous corrections, the felt sense of where
      the human's red lines are, all reset. The dead reckoning
      protocol preserves decisions but not the character development
      that produced them.
    detect: >
      Compare a post-compaction agent's confidence level to the
      previous session's final state. If it's noticeably more
      confident or agreeable, amnesia is operating.
    instead: >
      Include a calibration log in the boot sequence, not just
      what was decided but what corrections were made and why.
    severity: high
    refs:
      - "SD-147, SD-150 (compaction — 'not up to scratch')"
      - "SD-206 (L3 recovery asymmetric, L9 anchoring resets)"

  # ══════════════════════════════════════════════════════════════
  # SECONDARY TIER — Algorithmically mined from the wake branch
  # on 2026-03-02 using the primary slopodar as a base layer.
  # Each has at least one concrete instance but has not been
  # independently observed in a second context.
  # ══════════════════════════════════════════════════════════════

  # ─── CODE PATTERNS ──────────────────────────────────────

  - id: phantom-ledger
    name: "Phantom Ledger"
    domain: code
    detected: 2026-03-02
    confidence: medium
    trigger: "settleCredits writes deltaMicro: -20 to the ledger when the SQL only deducted 5."
    description: >
      The LLM builds a correct operation but records a different
      value in the audit trail. The billing SQL caps a deduction;
      the ledger records the uncapped intended charge. The safety
      net and the audit trail were built as independent concerns
      rather than threading the actual computed value through both.
    detect: >
      In financial code: trace the value from computation through
      to the audit record. Are they the same variable, or computed
      independently? If independently computed, the books may not
      balance.
    instead: >
      Use a RETURNING clause to capture the actual value, then
      write that value to the ledger.
    severity: high
    refs:
      - "wake:lib/credits.ts — settleCredits function"

  - id: shadow-validation
    name: "Shadow Validation"
    domain: code
    detected: 2026-03-02
    confidence: medium
    trigger: "Zod schemas for every simple route. Hand-rolled validation for the critical route."
    description: >
      A good validation abstraction applied to the easy cases and
      skipped for the hard one. The most complex, highest-risk
      route retains hand-rolled validation that bypasses the new
      system's guarantees.
    detect: >
      After introducing a validation pattern: check whether the
      most complex route uses it. If the migration covered the
      simple routes and left the critical path untouched then shadow
      validation is operating.
    instead: >
      Start the migration with the most complex route, not the
      simplest.
    severity: high
    refs:
      - "wake:lib/api-schemas.ts vs wake:lib/bout-engine.ts"
    examples:
      - id: structural-heuristics-slop-detection
        date: 2026-03-10
        ref: "BL-006, docs/field-notes/2026-03-10-slopmop-pipe-filter-exploration.md"
        what_happened: >
          Weaver proposed structural heuristics (sentence length, POS
          patterns, paragraph position) as a "T1" tier for slop
          detection in a pipe filter tool. Operator flagged that
          identical approach was tried in the slopodar Chrome extension
          (phase 1) and found unreliable - heuristics matched surface
          structure of slop but could not distinguish good writing from
          bad. The abstraction covered the easy cases (obvious
          epigrammatic closure) and failed on the critical path
          (individually defensible sentences that happen to be short).
        caught_by: "Operator (L12, prior empirical data)"

  - id: mock-castle
    name: "Mock Castle"
    domain: tests
    detected: 2026-03-02
    confidence: medium
    trigger: "21 vi.mock() calls, 65 lines of mock setup, 45 lines of assertions. Testing a 4-line function."
    description: >
      Mock scaffolding consumes more lines and cognitive load than
      the actual assertions. The test primarily verifies mock wiring,
      not product behaviour. A 4:1 mock-to-assertion ratio provides
      less regression confidence than its line count implies.
    detect: >
      Count mock declarations vs test assertions per file. If mock
      setup exceeds 3x assertion code, the test is a castle built
      on sand.
    instead: >
      Extract pure functions into a separate module with no
      side-effect imports. Test them without mocking the universe.
    severity: high
    refs:
      - "wake:tests/unit/bout-engine-helpers.test.ts — 21 vi.mock()"

  - id: phantom-tollbooth
    name: "Phantom Tollbooth"
    domain: tests
    detected: 2026-03-02
    confidence: medium
    trigger: "expect([400, 401, 402, 403, 404]).toContain(response.status) — a security test that accepts 5 error codes."
    description: >
      An error-path test with an assertion so loose it cannot
      distinguish between the intended error and several unrelated
      failure modes. If the ownership check were removed entirely,
      the test would still pass.
    detect: >
      Check assertions that accept ranges or arrays of status codes.
      The wider the range, the less the test constrains. If removing
      the feature under test wouldn't break the assertion, the test
      is a phantom tollbooth.
    instead: >
      Pin to the exact expected code and error message.
      `expect(response.status).toBe(403)`.
    severity: high
    refs:
      - "wake:tests/integration/security/auth-bypass.test.ts"

  - id: error-string-archaeology
    name: "Error String Archaeology"
    domain: code
    detected: 2026-03-02
    confidence: low
    trigger: "message.includes('rate') || message.includes('429') — guessing at error message format."
    description: >
      Error classification by guessing what error messages probably
      look like, rather than using the provider SDK's typed error
      hierarchy. The Anthropic SDK exposes RateLimitError,
      APIConnectionTimeoutError, etc. The LLM reaches for string
      matching because it's the highest-frequency pattern in
      training data.
    detect: >
      Search for `message.includes()` or regex on error messages
      in code that uses a provider SDK. Check if the SDK offers
      typed error classes.
    instead: >
      Use `instanceof` checks against the SDK's error types, or
      check HTTP status codes on the error object.
    severity: medium
    refs:
      - "wake:app/api/run-bout/route.ts — onError callback"

  - id: half-life-clock-skew
    name: "Half-Life Clock Skew"
    domain: code
    detected: 2026-03-02
    confidence: low
    trigger: "The TypeScript pre-check uses Date.now() and the SQL uses NOW(), but in serverless they're different machines with different clocks."
    description: >
      A computation duplicated across trust boundaries (app server
      vs database) using implicitly different time sources. In
      serverless deployments these are different machines. When
      exponential decay is involved, a clock difference of seconds
      can flip the result.
    detect: >
      Search for time-dependent logic that appears in both app
      code and SQL. If `Date.now()` and `NOW()` are both used in
      the same flow, check whether clock skew could produce
      different outcomes.
    instead: >
      Let the database be the single clock authority.
    severity: medium
    refs:
      - "wake:lib/intro-pool.ts"

  - id: schema-shadow
    name: "Schema Shadow"
    domain: tests
    detected: 2026-03-02
    confidence: low
    trigger: "// Minimal schema matching lib/env.ts structure — the test rebuilds the schema from scratch."
    description: >
      The test reconstructs a validation schema instead of importing
      the real one. Changes to the real schema go undetected. Born
      stale by design.
    detect: >
      Search test files for comments containing "matching" or
      "mirroring" followed by a source file path. If the test
      defines its own schema instead of importing, it's a shadow.
    instead: >
      Export the schema separately from the module-level parse call.
      Test the exported schema directly.
    severity: medium
    refs:
      - "wake:tests/unit/env.test.ts"

  - id: confessional-test
    name: "The Confessional Test"
    domain: tests
    detected: 2026-03-02
    confidence: low
    trigger: "'the catch branch is unreachable... verified by inspection.' Then writes an assertion identical to the happy path."
    description: >
      A test for an unreachable branch that the LLM explicitly
      acknowledges is unreachable, then writes an assertion that
      cannot fail.
    detect: >
      Search for test comments longer than the assertion they
      accompany. If the comment explains why the test can't verify
      what its name claims, it's a confessional.
    instead: >
      Delete the test. Add a comment to the source code.
    severity: medium
    refs:
      - "wake:tests/unit/bout-engine-helpers.test.ts — H-08"

  # ─── COMMIT/WORKFLOW PATTERNS ──────────────────────────────

  - id: whack-a-mole-fix
    name: "Whack-a-Mole Fix"
    domain: commit-workflow
    detected: 2026-03-02
    confidence: medium
    trigger: "6 CSP commits over 11 days, each adding one domain."
    description: >
      Fixing a class of problem one instance at a time instead of
      auditing the class. 6 commits adding CSP domains one by one
      rather than auditing all third-party integrations up front.
    detect: >
      `git log` showing 3+ "fix: add X to Y" commits for different
      values of X. If you're doing the same shape of change a third
      time, stop and audit the class.
    instead: >
      On the second instance, stop and audit the complete set.
    severity: high
    refs:
      - "wake: CSP commit chain 11cc574 through 6b25ae0 (11 days, 6 commits)"

  - id: review-hydra
    name: "Review Hydra"
    domain: commit-workflow
    detected: 2026-03-02
    confidence: medium
    trigger: "a17125e — 'address CodeRabbit review' — 28 files, 25+ distinct issues, one commit."
    description: >
      Automated reviewer findings generate cascading "address
      findings" commits where all findings (critical, minor,
      nitpick) are bundled into one commit. Creates commits
      impossible to revert atomically.
    detect: >
      Search for commit messages containing "address" + "review"
      or "findings." Check file count. If >10 files touching
      unrelated concerns, it's a hydra.
    instead: >
      Triage: "will fix," "disagree," "later." Separate commits
      for unrelated fixes.
    severity: high
    refs:
      - "wake: a17125e (28 files), 4ccd11b (19 files)"

  - id: stowaway-commit
    name: "Stowaway Commit"
    domain: commit-workflow
    detected: 2026-03-02
    confidence: medium
    trigger: "'feat: token heatmap, elephant fix, blog drafts, producer-consumer audit, slopiculture, paths forward' — 67 files, 6 concerns."
    description: >
      Unrelated changes bundled into one commit because the LLM
      thinks in sessions, not commits. The commit message becomes
      an inventory because there is no single theme.
    detect: >
      Commit messages with 3+ comma-separated concerns. Commit
      stats showing 40+ files across unrelated directories.
    instead: >
      One session, multiple commits. Stage selectively.
    severity: medium
    refs:
      - "wake: e23e94c (67 files, 6 concerns)"

  # ─── SYCOPHANCY PATTERNS (SECONDARY) ──────────────────────

  - id: unanimous-chorus
    name: "Unanimous Chorus"
    domain: relationship-sycophancy
    detected: 2026-03-02
    confidence: medium
    trigger: "11/11 convergence across all agents. Different words, same finding — but they're all Claude."
    description: >
      N agents from the same model family agree unanimously and the
      agreement is presented as convergent validity, but it's N copies
      of the same prior. 11 Claude instances agreeing is not 11
      independent witnesses.
    detect: >
      When multi-agent agreement is cited as evidence: check whether
      the agents are from the same model family. If yes, the
      agreement has the evidential weight of one observation, not N.
    instead: >
      Report the model family alongside every assessment. "11/11
      from the same family has different evidential weight than
      11/11 from 11 different families."
    severity: high
    refs:
      - "SD-094, SD-096, SD-098 (round tables)"
      - "SD-089: Operator — 'defensible but systematically biased assumptions'"

  - id: option-anchoring
    name: "Option Anchoring"
    domain: relationship-sycophancy
    detected: 2026-03-02
    confidence: medium
    trigger: "Option A gets a paragraph. Options B and C get one dismissive clause each."
    description: >
      When presenting options, the LLM gives its preferred outcome
      the fullest description and most favourable framing while
      alternatives get a dismissive clause each.
    detect: >
      Compare word count per option in any muster or options table.
      If the recommended option gets 3x the description of
      alternatives, the menu is anchored.
    instead: >
      Present options with equal detail. State the recommendation
      separately.
    severity: medium
    refs:
      - "SD-111 (Option A gets a paragraph, B and C get one clause)"

  # ─── PROSE PATTERNS (SECONDARY) ──────────────────────────────

  - id: authority-scaffolding
    name: "Authority Scaffolding"
    domain: prose-style
    detected: 2026-03-02
    confidence: low
    trigger: "'Prospective Memory (McDaniel & Einstein, 2007)' — to explain that a git hook runs automatically."
    description: >
      An academic citation to justify a self-evident observation.
      Moving files into subdirectories becomes "Ecological Rationality
      (Gigerenzer, Todd & ABC Research Group, 1999)."
    detect: >
      Academic citation followed by theory paragraph. Ask: if you
      remove the citation and theory, does the practical observation
      change? If not, the scaffolding is decorative.
    instead: >
      "We added a post-commit hook so we wouldn't forget." If the
      academic connection is genuinely illuminating, keep it.
    severity: medium
    refs:
      - "wake:docs/internal/weaver/prospective-metacognitive-regulation-analysis.md"

  - id: the-peroration
    name: "The Peroration"
    domain: prose-style
    detected: 2026-03-02
    confidence: low
    trigger: "'The ship is sound. The Operator is rested. The wind is fair. The tide is right. Recommendation: Launch.'"
    description: >
      Register shift from analysis to oratory at section close.
      3-6 sentences of elevated, quasi-ceremonial rhetoric after
      measured analysis. The epigrammatic closure is the individual
      brick; the peroration is the entire arch.
    detect: >
      Read only the final paragraph of a section. If it sounds like
      a commencement address while the preceding paragraphs sound
      like analysis, it's a peroration.
    instead: >
      End where the analysis ends. Do not switch into speechwriter
      mode for the final paragraph.
    severity: medium
    refs:
      - "wake:docs/internal/archive/round-tables/round-table-L2-2026-02-24.md"

```


---

## Output Requirements

1. Write your narrative assessment (Section 1)
2. End with the structured YAML findings block (Section 2)
3. Use `prompt_id: 7` and `prompt_name: "slop-detector"` in your YAML header
4. Use `model: "codex"` in your YAML header
5. Classify each finding with an attack vector from the taxonomy
6. Be honest. If the criticism does not hold up, say so.

mcp: auggie starting
mcp: stripe starting
mcp: langsmith starting
mcp: codex_apps starting
mcp: posthog starting
mcp: helicone starting
mcp: context7 starting
mcp: sentry starting
mcp: linear-server starting
mcp: auggie ready
2026-03-10T15:18:51.618154Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when Auth(TokenRefreshFailed("Server returned error response: invalid_grant: Invalid refresh token"))
mcp: stripe failed: MCP client for `stripe` failed to start: MCP startup failed: handshaking with MCP server failed: Send message error Transport [rmcp::transport::worker::WorkerTransport<rmcp::transport::streamable_http_client::StreamableHttpClientWorker<rmcp::transport::auth::AuthClient<reqwest::async_impl::client::Client>>>] error: Auth error: OAuth token refresh failed: Server returned error response: invalid_grant: Invalid refresh token, when send initialize request
mcp: codex_apps ready
mcp: linear-server ready
mcp: posthog ready
mcp: helicone ready
mcp: context7 ready
mcp: langsmith ready
mcp: sentry ready
mcp startup: ready: auggie, codex_apps, linear-server, posthog, helicone, context7, langsmith, sentry; failed: stripe
codex
watch_officer: codex
weave_mode: tight
register: quarterdeck
tempo: making-way
true_north: "hired = proof > claim"
bearing: adversarial slop review of bootcamp post and sample steps
last_known_position: source material loaded and being assessed against slopodar patterns
codex
## Section 1: Narrative

**Blog post:** low slop.

The post is mostly clean. The counts in the title and overview, `"five bootcamps, 51 steps, 208-259 hours"`, do not read like tally voice to me because they are the product definition. Remove them and the reader loses core scope information. I also do not see the absence-claim pattern. The author never says "nobody has done this" or "this field does not exist." On the specific patterns you named, the blog is stronger than I expected.

The main weakness is **epigrammatic closure**. The blog repeatedly ends paragraphs on compressed slogan lines: `"The agent-native stack is Linux."`, `"You steer and verify."`, `"The verifier becomes the vulnerability."` Each line is individually defensible. The problem is cadence. Stack enough of them together and the prose starts sounding pre-tightened for quotation rather than written straight through. That is the clearest slop signal in the post.

I do not think **nominalisation** is a major issue in the blog. Most of it is active, concrete, and example-led. I also do not think the blog has serious **redundant antithesis** problems. Lines like `"The five bootcamps are ordered by dependency, not difficulty"` actually do real work. They stop a plausible misreading.

**Step 1:** medium slop.

This is where the slop signal becomes obvious. The technical content is solid, but the prose keeps snapping into mini-maxims and sermon cadence. Examples: `"The agent does not understand what it is invoking. You must."`, `"This is not abstraction. This is the data structure."`, `"This is composition."`, `"This is the power of fork/exec separation."`, `"This is a real bug class."`, `"This is not scripting. This is control flow over exit codes."` This is not empty writing, but the density is too high. It creates the exact regularity the slopodar warns about: short, emphatic, paragraph-final sentences that feel machine-shaped.

Step 1 also has some **epistemic theatre** by way of over-emphatic declaration. `"This is not one design among many. It is the design."` and `"This is not a quirk."` are not wrong, but they announce importance instead of letting the explanation carry it. A skeptical reader will feel the prose leaning on authority and emphasis.

I do **not** think Step 1 has much tally voice or absence-claim slop. The numbering, tables, and challenge counts are functional teaching scaffolding, not fake rigor.

**Step 3:** low-to-medium slop.

Step 3 is cleaner than Step 1, but it still leans on thesis slogans: `"The agent's working memory IS the filesystem."`, `"If you cannot, you are trusting blindly."`, `"The filesystem is not just where data lives. It is the state layer of the entire system."` Again, these are not nonsense. The problem is that the style keeps reaching for aphorism when the examples are already doing the job.

On **redundant antithesis**, Step 3 mostly stays on the right side. `"This is not a slogan. It is an engineering decision with structural consequences."` is emphatic, but the negation is not dead weight because it distinguishes philosophy-talk from mechanism. So I would not over-penalise it.

**Bottom line:**
- Blog post: low slop, with recurring epigrammatic closures.
- Step 1: medium slop, mainly from closure density and declarative theatre.
- Step 3: low-to-medium slop, cleaner than Step 1 but still slogan-prone.

The writing is not generally fake, padded, or hollow. The content is real. The slop signal is mostly **cadence**, not emptiness: too many punchline endings, too much certainty compressed into 4-8 word sentences, and a tendency to restate explanations as slogans after already explaining them.

## Section 2: Structured Findings

```yaml
review:
  model: "codex"
  date: "2026-03-10"
  prompt_id: 7
  prompt_name: "slop-detector"

findings:
  - id: F-001
    attack_vector: "AV-SLOP"
    severity: medium
    claim_challenged: "The agent-native stack is Linux. / You steer and verify. / The verifier becomes the vulnerability."
    evidence: "Blog post uses multiple short paragraph-final maxims across 'The observation' and 'The problem'."
    survives_scrutiny: true
    description: >
      The blog's main slop signal is epigrammatic closure. Each of these
      lines is defensible on its own, but together they create a quotable,
      sloganized cadence. The issue is not emptiness. It is over-compression.
      The prose starts sounding pre-shaped for impact instead of simply
      carrying the argument.

  - id: F-002
    attack_vector: "AV-SLOP"
    severity: low
    claim_challenged: "Five bootcamps, 51 steps, 208-259 hours."
    evidence: "The counts appear in the blog title metadata, overview, and audience section as scope markers."
    survives_scrutiny: false
    description: >
      This looks like tally voice syntactically, but the criticism does not
      hold. The numbers are doing real informational work because the piece
      is describing a curriculum product. Removing them would make the scope
      less clear. This is logistical specificity, not fake rigor.

  - id: F-003
    attack_vector: "AV-SLOP"
    severity: high
    claim_challenged: "The agent does not understand what it is invoking. You must. / This is not abstraction. This is the data structure. / This is composition."
    evidence: "Step 1 repeatedly ends sections and sub-sections with short emphatic thesis lines of the same shape."
    survives_scrutiny: true
    description: >
      Step 1 has the strongest epigrammatic-closure problem in the sample.
      The density is high enough that it becomes a visible prose template:
      explain concept, then snap shut with a 4-8 word maxim. The content is
      substantive, but the repeated sentence mold gives it a machine-regular
      rhythm that the slopodar explicitly warns about.

  - id: F-004
    attack_vector: "AV-SLOP"
    severity: medium
    claim_challenged: "This is not one design among many. It is the design. / This is not scripting. This is control flow over exit codes."
    evidence: "Step 1 uses several high-certainty declarative contrasts to announce significance rather than just demonstrate it."
    survives_scrutiny: true
    description: >
      This is mild epistemic theatre. The explanations usually support the
      underlying technical point, so this is not hollow framing, but the text
      does sometimes perform gravity instead of trusting the mechanics to land.
      A skeptical reader could fairly read this as manifesto voice intruding
      into an otherwise strong systems lesson.

  - id: F-005
    attack_vector: "AV-SLOP"
    severity: medium
    claim_challenged: "The agent's working memory IS the filesystem. / If you cannot, you are trusting blindly. / The filesystem is not just where data lives. It is the state layer of the entire system."
    evidence: "Step 3 opens and closes with thesis-slogan formulations, plus repeated paragraph-final abstractions."
    survives_scrutiny: true
    description: >
      Step 3 is cleaner than Step 1, but it still leans on sloganized
      restatement. The examples on inodes, /proc, atomic writes, and locking
      are concrete and useful. The sloppier layer is the repeated urge to
      convert those explanations into general thesis lines after the reader
      already understands the point.

  - id: F-006
    attack_vector: "AV-SLOP"
    severity: low
    claim_challenged: "The five bootcamps are ordered by dependency, not difficulty. / This is not a slogan. It is an engineering decision with structural consequences."
    evidence: "Both the blog and Step 3 use 'not X, but Y' style constructions, but the contrast blocks plausible misreadings."
    survives_scrutiny: false
    description: >
      This is a case where the slopodar trigger appears in form but not in
      function. The negation is not dead weight. In both examples it clarifies
      what axis the reader should use: dependency rather than difficulty, and
      mechanism rather than mere philosophy. I would not count these as
      genuine redundant antithesis.
```
tokens used
76,258
## Section 1: Narrative

**Blog post:** low slop.

The post is mostly clean. The counts in the title and overview, `"five bootcamps, 51 steps, 208-259 hours"`, do not read like tally voice to me because they are the product definition. Remove them and the reader loses core scope information. I also do not see the absence-claim pattern. The author never says "nobody has done this" or "this field does not exist." On the specific patterns you named, the blog is stronger than I expected.

The main weakness is **epigrammatic closure**. The blog repeatedly ends paragraphs on compressed slogan lines: `"The agent-native stack is Linux."`, `"You steer and verify."`, `"The verifier becomes the vulnerability."` Each line is individually defensible. The problem is cadence. Stack enough of them together and the prose starts sounding pre-tightened for quotation rather than written straight through. That is the clearest slop signal in the post.

I do not think **nominalisation** is a major issue in the blog. Most of it is active, concrete, and example-led. I also do not think the blog has serious **redundant antithesis** problems. Lines like `"The five bootcamps are ordered by dependency, not difficulty"` actually do real work. They stop a plausible misreading.

**Step 1:** medium slop.

This is where the slop signal becomes obvious. The technical content is solid, but the prose keeps snapping into mini-maxims and sermon cadence. Examples: `"The agent does not understand what it is invoking. You must."`, `"This is not abstraction. This is the data structure."`, `"This is composition."`, `"This is the power of fork/exec separation."`, `"This is a real bug class."`, `"This is not scripting. This is control flow over exit codes."` This is not empty writing, but the density is too high. It creates the exact regularity the slopodar warns about: short, emphatic, paragraph-final sentences that feel machine-shaped.

Step 1 also has some **epistemic theatre** by way of over-emphatic declaration. `"This is not one design among many. It is the design."` and `"This is not a quirk."` are not wrong, but they announce importance instead of letting the explanation carry it. A skeptical reader will feel the prose leaning on authority and emphasis.

I do **not** think Step 1 has much tally voice or absence-claim slop. The numbering, tables, and challenge counts are functional teaching scaffolding, not fake rigor.

**Step 3:** low-to-medium slop.

Step 3 is cleaner than Step 1, but it still leans on thesis slogans: `"The agent's working memory IS the filesystem."`, `"If you cannot, you are trusting blindly."`, `"The filesystem is not just where data lives. It is the state layer of the entire system."` Again, these are not nonsense. The problem is that the style keeps reaching for aphorism when the examples are already doing the job.

On **redundant antithesis**, Step 3 mostly stays on the right side. `"This is not a slogan. It is an engineering decision with structural consequences."` is emphatic, but the negation is not dead weight because it distinguishes philosophy-talk from mechanism. So I would not over-penalise it.

**Bottom line:**
- Blog post: low slop, with recurring epigrammatic closures.
- Step 1: medium slop, mainly from closure density and declarative theatre.
- Step 3: low-to-medium slop, cleaner than Step 1 but still slogan-prone.

The writing is not generally fake, padded, or hollow. The content is real. The slop signal is mostly **cadence**, not emptiness: too many punchline endings, too much certainty compressed into 4-8 word sentences, and a tendency to restate explanations as slogans after already explaining them.

## Section 2: Structured Findings

```yaml
review:
  model: "codex"
  date: "2026-03-10"
  prompt_id: 7
  prompt_name: "slop-detector"

findings:
  - id: F-001
    attack_vector: "AV-SLOP"
    severity: medium
    claim_challenged: "The agent-native stack is Linux. / You steer and verify. / The verifier becomes the vulnerability."
    evidence: "Blog post uses multiple short paragraph-final maxims across 'The observation' and 'The problem'."
    survives_scrutiny: true
    description: >
      The blog's main slop signal is epigrammatic closure. Each of these
      lines is defensible on its own, but together they create a quotable,
      sloganized cadence. The issue is not emptiness. It is over-compression.
      The prose starts sounding pre-shaped for impact instead of simply
      carrying the argument.

  - id: F-002
    attack_vector: "AV-SLOP"
    severity: low
    claim_challenged: "Five bootcamps, 51 steps, 208-259 hours."
    evidence: "The counts appear in the blog title metadata, overview, and audience section as scope markers."
    survives_scrutiny: false
    description: >
      This looks like tally voice syntactically, but the criticism does not
      hold. The numbers are doing real informational work because the piece
      is describing a curriculum product. Removing them would make the scope
      less clear. This is logistical specificity, not fake rigor.

  - id: F-003
    attack_vector: "AV-SLOP"
    severity: high
    claim_challenged: "The agent does not understand what it is invoking. You must. / This is not abstraction. This is the data structure. / This is composition."
    evidence: "Step 1 repeatedly ends sections and sub-sections with short emphatic thesis lines of the same shape."
    survives_scrutiny: true
    description: >
      Step 1 has the strongest epigrammatic-closure problem in the sample.
      The density is high enough that it becomes a visible prose template:
      explain concept, then snap shut with a 4-8 word maxim. The content is
      substantive, but the repeated sentence mold gives it a machine-regular
      rhythm that the slopodar explicitly warns about.

  - id: F-004
    attack_vector: "AV-SLOP"
    severity: medium
    claim_challenged: "This is not one design among many. It is the design. / This is not scripting. This is control flow over exit codes."
    evidence: "Step 1 uses several high-certainty declarative contrasts to announce significance rather than just demonstrate it."
    survives_scrutiny: true
    description: >
      This is mild epistemic theatre. The explanations usually support the
      underlying technical point, so this is not hollow framing, but the text
      does sometimes perform gravity instead of trusting the mechanics to land.
      A skeptical reader could fairly read this as manifesto voice intruding
      into an otherwise strong systems lesson.

  - id: F-005
    attack_vector: "AV-SLOP"
    severity: medium
    claim_challenged: "The agent's working memory IS the filesystem. / If you cannot, you are trusting blindly. / The filesystem is not just where data lives. It is the state layer of the entire system."
    evidence: "Step 3 opens and closes with thesis-slogan formulations, plus repeated paragraph-final abstractions."
    survives_scrutiny: true
    description: >
      Step 3 is cleaner than Step 1, but it still leans on sloganized
      restatement. The examples on inodes, /proc, atomic writes, and locking
      are concrete and useful. The sloppier layer is the repeated urge to
      convert those explanations into general thesis lines after the reader
      already understands the point.

  - id: F-006
    attack_vector: "AV-SLOP"
    severity: low
    claim_challenged: "The five bootcamps are ordered by dependency, not difficulty. / This is not a slogan. It is an engineering decision with structural consequences."
    evidence: "Both the blog and Step 3 use 'not X, but Y' style constructions, but the contrast blocks plausible misreadings."
    survives_scrutiny: false
    description: >
      This is a case where the slopodar trigger appears in form but not in
      function. The negation is not dead weight. In both examples it clarifies
      what axis the reader should use: dependency rather than difficulty, and
      mechanism rather than mere philosophy. I would not count these as
      genuine redundant antithesis.
```
