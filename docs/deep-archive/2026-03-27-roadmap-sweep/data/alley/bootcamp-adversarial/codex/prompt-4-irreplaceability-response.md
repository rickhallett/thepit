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
session id: 019cd852-28aa-7f70-998a-d60391c0441b
--------
user
# Adversarial Review Dispatch
# Model: codex | Prompt: 4 | Name: irreplaceability
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

The Irreplaceability Challenge

The author's key differentiating claim is "irreplaceability" - the idea that certain knowledge cannot be delegated to an agent and must be held by the human operator. Read the blog post and at least 2 step files.

A sophisticated critic would argue: "The irreplaceability argument was valid in 2024 but is already obsolete. Modern agent frameworks (Claude Code, Cursor, Devin) can run strace, inspect /proc, debug their own shell scripts, and iterate on failures autonomously. The human doesn't need to understand fork/exec because the agent can diagnose its own fd leaks. The verification layer is moving into the agent itself. This curriculum trains humans to do what agents will do for themselves within 12 months."

**Your task:** Steelman this criticism as hard as you can. Then evaluate it honestly. Is the irreplaceability claim robust to improving agent capabilities? Where is it strongest? Where is it weakest? What is the strongest version of the counterargument the author could make?

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

### File: `sites/oceanheart/content/bootcamp/09-container-internals.md`

```
+++
title = "Container Internals - Namespaces, Cgroups, and OverlayFS"
date = "2026-03-10"
description = "A container is a process with three kernel restrictions. Namespaces restrict visibility, cgroups restrict resources, and OverlayFS controls the filesystem."
tags = ["containers", "docker", "namespaces", "cgroups", "overlayfs", "linux", "bootcamp"]
step = 9
tier = 1
estimate = "4 hours"
bootcamp = 1
+++

Step 9 of 12 in the Agentic Engineering Bootcamp.

---

**Prerequisites:** Step 1 (process model), Step 3 (filesystem as state, mount points), Step 8 (process observation)
**Leads to:** Step 10 (networking CLI), Step 11 (process supervision)

---

## Why This Step Exists

A container is not a virtual machine. A container is not a lightweight VM. A container is
not "like a VM but faster." These descriptions are not slightly wrong. They are structurally
wrong, and believing them leads to wrong conclusions about security, isolation, and failure
modes.

A container is a **process**. A regular Linux process, running on the same kernel as every
other process on the host, but with three restrictions applied by the kernel:

1. **Namespaces** restrict what the process can *see*
2. **Cgroups** restrict what the process can *use*
3. **Union filesystems** control what is *on disk*

That is the entire explanation. Everything Docker, Podman, containerd, or any other
container runtime does is orchestration of these three kernel features. When you run
`docker run`, the runtime creates namespaces, configures cgroups, mounts an overlayfs,
and then calls `exec` on your entrypoint. The rest is plumbing.

This step matters for the agentic model because the midget container IS the agent's
sandbox. The project's Dockerfile builds a container with Xvfb, fluxbox, xdotool, scrot,
and Python - a virtual display environment where the agent "sees" a screen and sends
input events. Every security guarantee and resource limit of that sandbox reduces to
the three kernel features covered here. When the container OOMs, when a file write
disappears, when the agent cannot reach a host service - understanding the primitives
lets you diagnose the cause instead of guessing.

> **AGENTIC GROUNDING:** When you `docker exec -it container bash`, you are not "logging
> into" anything. You are calling `nsenter` to join the container process's namespaces.
> You then see what it sees, constrained by the same namespace boundaries. Understanding
> this transforms container debugging from cargo-culting Docker commands to reasoning
> from first principles.

---

## Table of Contents

1. [A Container Is a Process](#1-a-container-is-a-process) (~20 min)
2. [Namespaces - Restricting Visibility](#2-namespaces---restricting-visibility) (~60 min)
3. [Cgroups - Restricting Resources](#3-cgroups---restricting-resources) (~45 min)
4. [Union Filesystems (OverlayFS)](#4-union-filesystems-overlayfs) (~40 min)
5. [How Docker Puts It Together](#5-how-docker-puts-it-together) (~30 min)
6. [Security Boundaries and Their Limits](#6-security-boundaries-and-their-limits) (~25 min)
7. [The Midget Container Specifically](#7-the-midget-container-specifically) (~20 min)
8. [Challenges](#challenges) (~60-90 min)
9. [What to Read Next](#what-to-read-next)

---

## 1. A Container Is a Process

*Estimated time: 20 minutes*

Start with a concrete experiment. Run a container and observe it from the host:

```bash
# Run a container that sleeps
docker run -d --name test-container ubuntu:24.04 sleep 3600

# From the HOST, find the container's process
ps aux | grep "sleep 3600"

# You will see something like:
# root  12345  0.0  0.0  2576  1024 ?  Ss  10:30  0:00  sleep 3600
```

That is not a VM. That is `sleep 3600` running as a process on your host. It has a PID
in the host's PID table. It consumes entries in the host's process scheduler. The kernel
manages it exactly like any other process.

Now look at it from inside:

```bash
# Enter the container
docker exec -it test-container bash

# What PID does the container think it has?
ps aux
# PID 1: sleep 3600
# The container sees ONLY its own processes. "sleep" is PID 1 inside.

exit
```

The same process is PID 12345 on the host and PID 1 inside the container. This is not
magic. It is a PID namespace - the kernel maintains two views of the same process tree.

### The anatomy of a running container

```
+------------------------------------------------------------------+
|  HOST KERNEL (shared - one kernel for everything)                |
|                                                                  |
|  Host processes: systemd(1), sshd, dockerd, ...                  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | CONTAINER PROCESS (just a process with restrictions)        |  |
|  |                                                             |  |
|  |  Three restrictions applied:                                |  |
|  |                                                             |  |
|  |  1. NAMESPACES (what it can see)                            |  |
|  |     - PID ns:    sees its own PID tree (PID 1 = itself)     |  |
|  |     - Mount ns:  sees its own filesystem tree               |  |
|  |     - Net ns:    sees its own network stack                 |  |
|  |     - UTS ns:    sees its own hostname                      |  |
|  |     - IPC ns:    sees its own shared memory/semaphores      |  |
|  |     - User ns:   UID 0 inside may be UID 1000 outside      |  |
|  |     - Cgroup ns: sees its own cgroup tree                   |  |
|  |                                                             |  |
|  |  2. CGROUPS (what it can use)                               |  |
|  |     - Memory:  max 512MB (OOM killed if exceeded)           |  |
|  |     - CPU:     1.5 cores max                                |  |
|  |     - PIDs:    max 100 processes                            |  |
|  |     - I/O:     bandwidth limits                             |  |
|  |                                                             |  |
|  |  3. OVERLAYFS (what is on disk)                             |  |
|  |     - Lower layers: read-only image layers                  |  |
|  |     - Upper layer:  writable, ephemeral                     |  |
|  |     - Merged view:  what the process sees as "/"            |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

Compare this to a virtual machine:

```
+------------------------------------------------------------------+
|  HOST KERNEL                                                     |
|                                                                  |
|  Hypervisor (KVM/QEMU/VMware)                                   |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | VIRTUAL MACHINE                                             |  |
|  |                                                             |  |
|  |  GUEST KERNEL (separate, complete kernel)                   |  |
|  |  Virtual CPU, virtual memory, virtual disk, virtual NIC     |  |
|  |  Full hardware abstraction                                  |  |
|  |  The guest OS does not know it is virtualized               |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

The structural difference: a VM has its own kernel. A container shares the host kernel.
This means:

- A container starts in milliseconds (no kernel boot). A VM takes seconds to minutes.
- A container uses the host's memory management (no double paging). A VM has its own page tables inside the guest, mapped through the hypervisor to real memory.
- A container's syscalls go directly to the host kernel. A VM's syscalls go to the guest kernel, which may trap to the hypervisor.
- A kernel exploit inside a container can compromise the host. A kernel exploit inside a VM compromises only the guest.

That last point is the critical security distinction. Namespaces restrict the process's
view. They do not create a security boundary at the hardware level. A kernel vulnerability
that allows privilege escalation will escape any namespace.

> **HISTORY:** The idea of isolating processes with restricted views of the system predates
> both containers and VMs. `chroot` (1979) - change root - was the first mechanism. It
> changes the apparent root directory for a process, so it cannot see files outside its new
> root. Bill Joy added it to BSD to provide isolated build environments. It was never
> designed as a security boundary, and it is trivially escapable (a process with root
> privileges can `chroot` again to break out). But the conceptual seed - "give a process a
> different view of the filesystem" - grew into mount namespaces two decades later.

```bash
# Clean up
docker rm -f test-container
```

---

## 2. Namespaces - Restricting Visibility

*Estimated time: 60 minutes*

A namespace wraps a global system resource in an abstraction that makes it appear to
processes within the namespace that they have their own isolated instance of that
resource. The key word is "appear." The resource is not duplicated. The kernel maintains
the real resource and provides filtered views.

Linux has seven types of namespaces:

| Namespace | Flag | Isolates | Kernel version |
|-----------|------|----------|----------------|
| Mount | `CLONE_NEWNS` | Mount points, filesystem tree | 2.4.19 (2002) |
| UTS | `CLONE_NEWUTS` | Hostname, domain name | 2.6.19 (2006) |
| IPC | `CLONE_NEWIPC` | Shared memory, semaphores, message queues | 2.6.19 (2006) |
| PID | `CLONE_NEWPID` | Process IDs | 2.6.24 (2008) |
| Network | `CLONE_NEWNET` | Network stack (interfaces, routes, iptables) | 2.6.29 (2009) |
| User | `CLONE_NEWUSER` | UIDs, GIDs, capabilities | 3.8 (2012) |
| Cgroup | `CLONE_NEWCGROUP` | Cgroup root directory | 4.6 (2016) |

> **HISTORY:** Linux namespaces were not designed as a unified "container" feature. They
> were added incrementally over a decade by different kernel developers solving different
> problems. Mount namespaces came first (2002) - Al Viro's work to allow per-process
> filesystem views. PID namespaces came six years later. User namespaces took until 2012.
> "Containers" emerged from composing features that were never designed to be composed.
> This is why the container security model has gaps - it was not engineered as a coherent
> security boundary. It was assembled from independent isolation primitives.

### PID Namespace

The most intuitive namespace. A process in a new PID namespace sees its own PID tree.
The first process in the namespace is PID 1 - the init process of that namespace.

```bash
# Create a new PID namespace with unshare
# --pid: new PID namespace
# --fork: fork before exec (required for PID namespaces)
# --mount-proc: mount a new /proc so ps works correctly
sudo unshare --pid --fork --mount-proc bash

# Inside the new namespace:
ps aux
# You see only processes in THIS namespace
# bash is PID 1

printf 'My PID: %s\n' "$$"
# Output: 1

# Exit back to host
exit
```

Why `--fork` is required: the `unshare` process itself was created in the parent PID
namespace. A PID namespace only applies to processes *created after* the namespace is
established. So `unshare` must fork, and the child (in the new namespace) becomes PID 1.
Without `--fork`, the namespace is created but the current process is not in it, and the
next exec fails because there is no PID 1 in the namespace.

Why `--mount-proc` is required: `ps` reads from `/proc`. If you do not mount a new
`/proc` inside the PID namespace, `ps` reads the host's `/proc` and shows the host's
processes. The PID namespace isolates the PID numbers, but `/proc` is a mount - it must
be remounted to reflect the new namespace.

From the host, you can still see the process:

```bash
# In terminal 1: create namespaced process
sudo unshare --pid --fork --mount-proc sleep 3600 &
UNSHARE_PID=$!

# In terminal 2: find it on the host
ps aux | grep "sleep 3600"
# The sleep process has a normal host PID (e.g., 54321)
# But inside its PID namespace, it is PID 1

# Check its PID namespace
ls -la /proc/$(pgrep -f "sleep 3600")/ns/pid
# Shows the namespace inode - different from the host's

# Compare with your shell's PID namespace
ls -la /proc/self/ns/pid
# Different inode = different namespace

# Clean up
kill $UNSHARE_PID
```

### Mount Namespace

Each process can have its own view of the filesystem's mount tree. Mounts made inside
a mount namespace are invisible outside it.

```bash
# Create a new mount namespace
sudo unshare --mount bash

# Inside: mount a tmpfs at /mnt
mount -t tmpfs none /mnt
printf 'secret data\n' > /mnt/secret.txt
cat /mnt/secret.txt
# Output: secret data

# In another terminal (host namespace): check /mnt
ls /mnt/
# Empty - the mount is invisible from the host

# Exit the namespace
exit
# The mount is gone. It existed only in the namespace.
```

This is how containers have their own `/` without affecting the host. The container
runtime creates a mount namespace and mounts the overlayfs as the container's root
filesystem. The host's root filesystem is untouched.

### Network Namespace

A process in a new network namespace has its own network stack: its own interfaces, its
own routing table, its own iptables rules. Initially, the namespace has only a loopback
interface (and it is down).

```bash
# Create a network namespace
sudo unshare --net bash

# Inside: what interfaces exist?
ip link
# Only lo (loopback), and it is DOWN

ip addr
# lo has no address

# Try to reach the internet
ping -c 1 8.8.8.8 2>&1
# Network is unreachable - there are no routes, no interfaces connected to the outside

exit
```

To connect a network namespace to the host, you create a **veth pair** - a virtual
ethernet cable with one end in each namespace. Docker does this automatically. Each
container gets one end of a veth pair, and the other end is attached to the `docker0`
bridge on the host.

```bash
# This is what Docker does under the hood:

# Create a network namespace (the "ip" tool can manage named namespaces)
sudo ip netns add testns

# Create a veth pair
sudo ip link add veth-host type veth peer name veth-container

# Move one end into the namespace
sudo ip link set veth-container netns testns

# Configure the host end
sudo ip addr add 10.0.0.1/24 dev veth-host
sudo ip link set veth-host up

# Configure the container end (inside the namespace)
sudo ip netns exec testns ip addr add 10.0.0.2/24 dev veth-container
sudo ip netns exec testns ip link set veth-container up
sudo ip netns exec testns ip link set lo up

# Test: ping from host to namespace
ping -c 1 10.0.0.2
# Success

# Test: ping from namespace to host
sudo ip netns exec testns ping -c 1 10.0.0.1
# Success

# Clean up
sudo ip netns delete testns
sudo ip link delete veth-host
```

> **AGENTIC GROUNDING:** Network namespace isolation is the primary mechanism preventing
> an agent container from reaching host services it should not access. If the agent
> container runs with `--network host`, ALL namespace isolation is bypassed - the container
> shares the host's network stack and can reach every service on localhost. This is a
> common misconfiguration. When reviewing Docker Compose files or `docker run` commands
> generated by agents, check the network mode.

### UTS Namespace

UTS (Unix Time-Sharing) namespace isolates the hostname and NIS domain name. Simple
but important - it lets each container have its own hostname.

```bash
# Create a new UTS namespace
sudo unshare --uts bash

# Change the hostname
hostname container-test
hostname
# Output: container-test

# In another terminal:
hostname
# Output: your-original-hostname (unaffected)

exit
```

### IPC Namespace

Isolates System V IPC objects (shared memory segments, semaphore sets, message queues)
and POSIX message queues. Processes in different IPC namespaces cannot see each other's
shared memory.

```bash
# List current IPC objects
ipcs

# Create new IPC namespace
sudo unshare --ipc bash

# Inside: create a shared memory segment
ipcmk -M 1024
# Created shared memory segment

ipcs -m
# Shows the segment

# In another terminal (host):
ipcs -m
# Does NOT show the segment

exit
```

### User Namespace

The most complex namespace. It maps UIDs and GIDs inside the namespace to different UIDs
and GIDs outside. The critical implication: a process can be UID 0 (root) inside the
namespace while being UID 1000 (unprivileged) outside.

```bash
# Create a user namespace (does not require root!)
unshare --user --map-root-user bash

# Inside: who am I?
id
# uid=0(root) gid=0(root)

# But from the host, this process runs as your regular user
# In another terminal:
ps -o pid,uid,user,comm -p $(pgrep -f "unshare.*user")
# Shows your regular UID

exit
```

User namespaces are what make rootless containers possible (Podman's default mode).
The container process runs as root inside (can install packages, bind to port 80) but
is an unprivileged user on the host. A breakout from the container lands you as an
unprivileged user, not root.

### Viewing Namespace Memberships

Every process's namespace memberships are visible in `/proc/PID/ns/`:

```bash
# List your shell's namespaces
ls -la /proc/self/ns/
# Each entry is a symlink to a namespace identified by type:[inode]
# e.g., pid:[4026531836]

# Two processes in the same namespace have the same inode number
# Two processes in different namespaces have different inode numbers

# Compare your shell with PID 1 (init/systemd):
ls -la /proc/1/ns/
ls -la /proc/self/ns/
# They should match (unless you are in a container yourself)
```

### nsenter - Entering Existing Namespaces

`nsenter` joins an existing process's namespaces. This is how `docker exec` works.

```bash
# Find a container's PID on the host
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' some-container)

# Enter its namespaces
sudo nsenter -t $CONTAINER_PID --pid --mount --net --uts --ipc bash
# You now see what the container sees
```

The `--target` (`-t`) flag specifies which process's namespaces to join. Each `--pid`,
`--mount`, etc. flag specifies which namespaces to enter. You can enter some namespaces
but not others - for example, enter the network namespace but keep the host's mount
namespace, which is useful for debugging.

> **HISTORY:** Plan 9 from Bell Labs (1992) - the research successor to Unix - had
> per-process namespaces as a first-class concept. Every process could have a completely
> different view of the filesystem namespace. You could mount a network connection as a
> file, mount a remote machine's files as a local directory, or give a process a
> completely custom `/dev`. Linux namespaces are a partial implementation of Plan 9's
> vision. Eric Van Riel, Al Viro, and others brought the idea back to Linux starting in
> 2002 with mount namespaces.

---

## 3. Cgroups - Restricting Resources

*Estimated time: 45 minutes*

Namespaces control what a process can see. Cgroups (control groups) control what a process
can use. Without cgroups, a container process could consume all the host's memory, all
the CPU, and spawn unlimited processes. Cgroups impose limits.

### Cgroups v2

Modern Linux uses cgroups v2 (unified hierarchy). The older cgroups v1 had separate
hierarchies per resource controller (one for memory, one for CPU, etc.). Cgroups v2
merges them into a single hierarchy mounted at `/sys/fs/cgroup/`.

Check which version your system uses:

```bash
# If this directory exists and contains controller files, you are on v2
ls /sys/fs/cgroup/cgroup.controllers
# Output: cpuset cpu io memory hugetlb pids rdma misc

# If you see /sys/fs/cgroup/memory/, /sys/fs/cgroup/cpu/, etc. as
# separate directories, you are on v1 (or hybrid mode)

# Check the mount
mount | grep cgroup
# On v2: cgroup2 on /sys/fs/cgroup type cgroup2 (...)
```

### The cgroup hierarchy

Cgroups form a tree. The root cgroup is `/sys/fs/cgroup/`. Child cgroups are
subdirectories. Every process belongs to exactly one cgroup. Limits on a parent cgroup
constrain all children.

```
/sys/fs/cgroup/                   (root cgroup)
  +-- system.slice/               (systemd services)
  |     +-- docker.service/       (dockerd itself)
  +-- user.slice/                 (user sessions)
  |     +-- user-1000.slice/      (your user)
  +-- docker/                     (container cgroups)
        +-- abc123.../            (container abc123's cgroup)
```

### Creating a cgroup manually

You do not need Docker to use cgroups. Create one with `mkdir`:

```bash
# Create a cgroup (requires root or delegation)
sudo mkdir /sys/fs/cgroup/bootcamp-test

# See what controllers are available
cat /sys/fs/cgroup/bootcamp-test/cgroup.controllers
# Output: cpuset cpu io memory hugetlb pids rdma misc

# Enable memory and pids controllers for children
printf '+memory +pids' | sudo tee /sys/fs/cgroup/bootcamp-test/cgroup.subtree_control
```

### Memory limits

```bash
# Set a memory limit of 50MB
printf '52428800' | sudo tee /sys/fs/cgroup/bootcamp-test/memory.max

# Check the limit
cat /sys/fs/cgroup/bootcamp-test/memory.max
# Output: 52428800

# See current memory usage
cat /sys/fs/cgroup/bootcamp-test/memory.current
# Output: 0 (nothing in this cgroup yet)

# Add the current shell to this cgroup
printf "$$" | sudo tee /sys/fs/cgroup/bootcamp-test/cgroup.procs

# Now any memory this shell (and its children) allocate counts against the 50MB limit
# Try to allocate more than 50MB:
python3 -c "x = bytearray(60 * 1024 * 1024)"
# OOM killed! The kernel's OOM killer terminates the process.
```

When the OOM killer fires inside a cgroup, `dmesg` on the host records it:

```bash
dmesg | tail -5
# Memory cgroup out of memory: Killed process 12345 (python3)
#   total-vm:65536kB, anon-rss:51200kB, file-rss:4096kB
```

> **AGENTIC GROUNDING:** When a container process is OOM killed, the process simply dies.
> There is no graceful "out of memory" exception the process can catch. From inside the
> container, the process is gone. From the host, `dmesg` shows the OOM killer log with the
> cgroup that triggered it. If an agent's container keeps dying mysteriously, check `dmesg`
> for OOM kills. The fix is either to increase the memory limit or to fix the memory leak.

### CPU limits

Cgroups offer two models for CPU limiting:

**CPU weight (shares)** - relative allocation. If cgroup A has weight 100 and cgroup B has
weight 200, B gets twice the CPU time when both are competing. If A is idle, B gets all
available CPU. Weights are only enforced under contention.

```bash
# Set CPU weight (1-10000, default 100)
printf '50' | sudo tee /sys/fs/cgroup/bootcamp-test/cpu.weight
# This cgroup gets half the default weight
```

**CPU max (quota/period)** - absolute allocation. "This cgroup can use X microseconds of
CPU time per Y microseconds." This is a hard cap regardless of whether other cgroups are
using their allocation.

```bash
# Allow 1.5 CPUs worth of time (150000 out of every 100000 microseconds)
printf '150000 100000' | sudo tee /sys/fs/cgroup/bootcamp-test/cpu.max

# Allow 0.5 CPUs (50000 out of every 100000 microseconds)
printf '50000 100000' | sudo tee /sys/fs/cgroup/bootcamp-test/cpu.max
```

This is what `docker run --cpus 1.5` translates to: `150000 100000` written to `cpu.max`.

### PID limits

```bash
# Limit to 20 processes maximum
printf '20' | sudo tee /sys/fs/cgroup/bootcamp-test/pids.max

# If a process in this cgroup tries to fork beyond 20 total, fork() returns EAGAIN
```

This is the defense against fork bombs inside containers. Without a PID limit, a
runaway process inside a container can exhaust the host's PID space.

### I/O limits

```bash
# Limit I/O bandwidth on a specific device (e.g., 8:0 = /dev/sda)
# Read: max 10MB/s, Write: max 5MB/s
printf '8:0 rbps=10485760 wbps=5242880' | \
  sudo tee /sys/fs/cgroup/bootcamp-test/io.max
```

### How Docker maps to cgroups

| Docker flag | Cgroup file | Meaning |
|-------------|-------------|---------|
| `--memory 512m` | `memory.max = 536870912` | Hard memory limit |
| `--memory-reservation 256m` | `memory.low = 268435456` | Soft limit (best effort) |
| `--cpus 1.5` | `cpu.max = 150000 100000` | CPU quota |
| `--cpu-shares 512` | `cpu.weight = ~50` | Relative CPU weight |
| `--pids-limit 100` | `pids.max = 100` | Max processes |

```bash
# Run a container with limits
docker run -d --name limited \
  --memory 512m \
  --cpus 1.5 \
  --pids-limit 100 \
  ubuntu:24.04 sleep 3600

# Find the container's cgroup on the host
CONTAINER_ID=$(docker inspect --format '{{.Id}}' limited)
CGROUP_PATH="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"
# (path varies by system - may be under /sys/fs/cgroup/docker/)

# Read the limits
cat "${CGROUP_PATH}/memory.max"
# 536870912 (512 * 1024 * 1024)

cat "${CGROUP_PATH}/cpu.max"
# 150000 100000

cat "${CGROUP_PATH}/pids.max"
# 100

# Read current usage
cat "${CGROUP_PATH}/memory.current"
cat "${CGROUP_PATH}/cpu.stat"
cat "${CGROUP_PATH}/pids.current"

docker rm -f limited
```

> **HISTORY:** Cgroups were contributed to the Linux kernel by Google engineers Paul Menage
> and Rohit Seth in 2008 (kernel 2.6.24). Google was running everything in containers
> internally - their cluster management system Borg (predecessor to Kubernetes) needed
> kernel support for resource isolation. The initial implementation (cgroups v1) had
> separate hierarchies per controller, which created complexity. Tejun Heo rewrote the
> system as cgroups v2 (unified hierarchy), merged in kernel 4.5 (2016). The migration
> from v1 to v2 took years; most distributions completed it around 2022-2023.

### Cleanup

```bash
# Remove the test cgroup (must be empty - no processes)
# First move your shell back to the root cgroup if you added it
printf "$$" | sudo tee /sys/fs/cgroup/cgroup.procs
sudo rmdir /sys/fs/cgroup/bootcamp-test
```

---

## 4. Union Filesystems (OverlayFS)

*Estimated time: 40 minutes*

### The problem

A Docker image is composed of layers. Each `RUN`, `COPY`, or `ADD` instruction in a
Dockerfile creates a new layer. A typical image has 5-20 layers. Each layer is a tarball
of filesystem changes (files added, modified, or deleted relative to the layer below).

When you run a container, the container needs:
1. Access to all the image layers (read-only - the image is shared by all containers using it)
2. A writable layer for the container's own file modifications
3. A merged view that looks like a normal filesystem

OverlayFS solves all three requirements.

### OverlayFS - the union mount

OverlayFS presents a unified view of two directory trees:

- **lowerdir**: read-only layers (one or more, colon-separated)
- **upperdir**: read-write layer where modifications are stored
- **workdir**: scratch space used by the kernel for atomic operations (must be on the same filesystem as upperdir)
- **merged**: the unified view that processes see

```
        Merged view (what the process sees as "/")
        +------------------------------------------+
        |  /bin/bash  /etc/passwd  /tmp/myfile.txt  |
        +------------------------------------------+
             |              |              |
        OverlayFS combines them:
             |              |              |
  +----------+----+  +-----+------+  +----+---------+
  | Lower layer   |  | Lower layer|  | Upper layer  |
  | (read-only)   |  | (read-only)|  | (read-write) |
  | /bin/bash      |  | /etc/passwd|  | /tmp/myfile  |
  +---------------+  +------------+  +--------------+
```

### Building it by hand

```bash
# Create the directory structure
mkdir -p /tmp/overlay-lab/{lower,upper,work,merged}

# Populate the lower layer (simulating an image layer)
printf 'original content\n' > /tmp/overlay-lab/lower/file1.txt
printf 'this will be deleted\n' > /tmp/overlay-lab/lower/file2.txt
mkdir -p /tmp/overlay-lab/lower/etc
printf 'lower-hostname\n' > /tmp/overlay-lab/lower/etc/hostname

# Mount the overlay
sudo mount -t overlay overlay \
  -o lowerdir=/tmp/overlay-lab/lower,upperdir=/tmp/overlay-lab/upper,workdir=/tmp/overlay-lab/work \
  /tmp/overlay-lab/merged

# Verify: the merged view shows the lower layer's files
ls /tmp/overlay-lab/merged/
# file1.txt  file2.txt  etc

cat /tmp/overlay-lab/merged/file1.txt
# original content
```

### Copy-on-write

Reading a file from the lower layer costs nothing extra - OverlayFS serves it directly
from the lower directory. But when you write to a file that exists in the lower layer,
OverlayFS copies it to the upper layer first, then modifies the copy. The lower layer
is never touched.

```bash
# Modify a file from the lower layer
printf 'modified content\n' > /tmp/overlay-lab/merged/file1.txt

# Check the lower layer - unchanged
cat /tmp/overlay-lab/lower/file1.txt
# original content

# Check the upper layer - the modified copy lives here
cat /tmp/overlay-lab/upper/file1.txt
# modified content

# The merged view shows the upper layer's version
cat /tmp/overlay-lab/merged/file1.txt
# modified content
```

The upper layer "wins." When a file exists in both lower and upper, the merged view
shows the upper layer's version.

### Creating new files

New files go directly into the upper layer:

```bash
# Create a new file in the merged view
printf 'new file\n' > /tmp/overlay-lab/merged/newfile.txt

# It exists only in the upper layer
ls /tmp/overlay-lab/upper/
# file1.txt  newfile.txt

ls /tmp/overlay-lab/lower/
# file1.txt  file2.txt  etc
# No newfile.txt
```

### Whiteout files - deletion in a union filesystem

How do you "delete" a file that exists in a read-only lower layer? You cannot remove it
from the lower directory. OverlayFS uses **whiteout files** - special character device
files (0,0) in the upper layer that tell the kernel "pretend this file does not exist in
the merged view."

```bash
# Delete file2.txt (which exists in the lower layer)
rm /tmp/overlay-lab/merged/file2.txt

# The merged view no longer shows it
ls /tmp/overlay-lab/merged/
# file1.txt  etc  newfile.txt
# file2.txt is gone

# But the lower layer is untouched
ls /tmp/overlay-lab/lower/
# file1.txt  file2.txt  etc
# file2.txt still exists

# The upper layer has a whiteout file
ls -la /tmp/overlay-lab/upper/
# You will see file2.txt as a character device (c 0,0)
# This is the whiteout marker
stat /tmp/overlay-lab/upper/file2.txt
# File type: character special file
# Device: 0,0
```

For directory deletion, OverlayFS uses an **opaque directory** - a directory in the upper
layer with a trusted xattr (`trusted.overlay.opaque=y`) that hides the entire lower
directory.

### How Docker uses OverlayFS

Each Docker image layer is a directory. When you run a container, Docker (or the storage
driver) mounts an overlay with:

- **lowerdir**: all image layers, from bottom to top, colon-separated
- **upperdir**: a new empty directory for this specific container
- **merged**: the container's root filesystem

```bash
# See Docker's overlay mounts
mount | grep overlay
# overlay on /var/lib/docker/overlay2/.../merged type overlay
#   (lowerdir=...:...:...,upperdir=...,workdir=...)

# The lowerdir contains multiple paths separated by colons
# Each path is one image layer
# The rightmost path is the bottom layer (FROM ubuntu:24.04 base)
# The leftmost path is the top layer (last Dockerfile instruction)
```

When the container is stopped and removed, Docker deletes the upper layer directory. All
writes the container made are gone. The image layers (lower) are untouched and shared by
every container running from that image.

> **AGENTIC GROUNDING:** This is why container writes are ephemeral. If an agent writes a
> file inside the container, it goes to the overlayfs upper layer. When the container is
> destroyed, that layer is deleted. If the agent must persist data - logs, output files,
> model weights - it must write to a Docker volume (a bind mount from the host) or a
> mounted external storage. Understanding overlayfs makes this not a Docker quirk to
> memorize but a direct consequence of how union filesystems work.

### Cleanup

```bash
sudo umount /tmp/overlay-lab/merged
rm -rf /tmp/overlay-lab
```

> **HISTORY:** OverlayFS was merged into the Linux kernel in version 3.18 (2014) by Miklos
> Szeredi. Before OverlayFS, Docker used AUFS (Another Union File System), which was never
> merged into mainline Linux and required patched kernels. The Debian and Ubuntu kernels
> included AUFS patches, which is partly why Docker was initially popular on Ubuntu. The
> move to OverlayFS (overlay2 storage driver) gave Docker a union filesystem that worked on
> any standard Linux kernel. Other union filesystem approaches include eCryptFS and
> UnionFS, but OverlayFS won the adoption race for containers.

---

## 5. How Docker Puts It Together

*Estimated time: 30 minutes*

`docker run` is syntactic sugar for a sequence of kernel operations. Understanding the
sequence makes every Docker behavior predictable.

### The sequence

```
docker run --memory 512m --cpus 1.5 -v /host/data:/data ubuntu:24.04 /bin/bash

1. Pull image layers (if not cached)
   - Download and unpack each layer to /var/lib/docker/overlay2/

2. Create namespaces
   - clone(CLONE_NEWPID | CLONE_NEWNS | CLONE_NEWNET | CLONE_NEWUTS | CLONE_NEWIPC)
   - The new process is in all seven namespaces

3. Set up cgroups
   - mkdir /sys/fs/cgroup/docker/<container-id>/
   - Write memory.max = 536870912
   - Write cpu.max = 150000 100000
   - Add the process to the cgroup

4. Mount overlayfs
   - mount -t overlay overlay \
       -o lowerdir=layer1:layer2:...,upperdir=<new>,workdir=<new> \
       <merged>

5. Mount volumes
   - mount --bind /host/data <merged>/data
   - This is a bind mount: the host directory appears inside the container

6. pivot_root
   - Change the container process's root filesystem to the merged overlayfs
   - The old root is unmounted (or moved)
   - The process now sees the overlayfs merged directory as "/"

7. exec the entrypoint
   - exec("/bin/bash")
   - This replaces the container runtime's process with the target process
   - It becomes PID 1 in the container's PID namespace
```

### The entrypoint.sh in this project

Look at the project's `entrypoint.sh`:

```bash
#!/bin/bash
# Midget entrypoint - starts virtual display + window manager
set -e

# Start Xvfb (virtual framebuffer)
Xvfb :99 -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} -ac &
XVFB_PID=$!
sleep 1

# Verify Xvfb is running
if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "FATAL: Xvfb failed to start" >&2
    exit 1
fi

# Start fluxbox (minimal window manager - needed for window focus/raise)
fluxbox -display :99 &
sleep 1

echo "Midget display ready - ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} on :99"

# If arguments provided, run them; otherwise interactive shell
if [ $# -gt 0 ]; then
    exec "$@"
else
    exec /bin/bash
fi
```

Several things are happening that connect to the container internals we have covered:

**PID 1 behavior:** The entrypoint script runs as PID 1 inside the container's PID
namespace. PID 1 has special behavior in Linux: the kernel does not deliver SIGTERM or
SIGINT to PID 1 unless the process has explicitly registered a signal handler. This means
if a dumb script is PID 1 and does not trap signals, `docker stop` (which sends SIGTERM)
will have no effect, and Docker will wait its timeout (10 seconds by default) and then
send SIGKILL.

The `exec "$@"` at the end replaces the shell with the target process. If the command is
`python3 steer.py`, then `python3` becomes PID 1. Python does register a SIGTERM handler
by default, so `docker stop` works correctly. Without `exec`, the shell would remain PID 1,
python3 would be PID 2, and SIGTERM from `docker stop` would go to the shell (PID 1),
not to python3.

**Background processes:** Xvfb and fluxbox are started as background processes (`&`). They
are children of the entrypoint shell. When `exec "$@"` replaces the shell with the target
process, Xvfb and fluxbox become orphans - their parent (the shell) is gone. The kernel
reparents orphans to PID 1 (the new process). So the target process becomes the reaper
for Xvfb and fluxbox.

**Environment variables:** `SCREEN_WIDTH`, `SCREEN_HEIGHT`, `SCREEN_DEPTH`, and `DISPLAY`
are set in the Dockerfile with `ENV`. They are inherited by every process in the
container because environment variables are per-process state (Step 1) and children inherit
them via `fork/exec`.

### docker exec = nsenter

When you run `docker exec -it container bash`, Docker:

1. Finds the container's PID on the host
2. Calls `nsenter` (or equivalent) to enter all of the container's namespaces
3. Execs `bash` inside those namespaces

The new bash process shares the container's PID namespace, mount namespace, network
namespace, etc. It sees what the container sees.

```bash
# These are equivalent:
docker exec -it my-container bash

# and (approximately):
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' my-container)
sudo nsenter -t $CONTAINER_PID --pid --mount --net --uts --ipc bash
```

### docker volume = bind mount

A Docker volume is a bind mount from the host filesystem into the container's mount
namespace. It bypasses overlayfs entirely.

```bash
docker run -v /host/path:/container/path ubuntu:24.04 bash
```

This creates a bind mount: `/container/path` inside the container points directly to
`/host/path` on the host. Writes here persist because they go to the host filesystem,
not to the overlayfs upper layer.

### docker network = veth pairs and bridges

When Docker creates a container with the default `bridge` network:

1. Creates a veth pair (virtual ethernet cable)
2. Attaches one end to the `docker0` bridge on the host
3. Moves the other end into the container's network namespace
4. Assigns an IP address from the bridge's subnet
5. Sets up NAT (iptables MASQUERADE) so the container can reach the internet through the host

```bash
# See the docker bridge
ip addr show docker0
# 172.17.0.1/16

# See veth pairs on the host (one per running container)
ip link | grep veth

# Inside a container:
ip addr
# eth0: 172.17.0.2/16 (this is the container's end of the veth pair)

ip route
# default via 172.17.0.1 dev eth0 (traffic goes through the bridge)
```

---

## 6. Security Boundaries and Their Limits

*Estimated time: 25 minutes*

Namespaces provide isolation, not security. This distinction is critical for the agent
sandboxing use case.

### The kernel attack surface

The container process makes syscalls directly to the host kernel. Every syscall is an
entry point. A vulnerability in the kernel's handling of any syscall can potentially allow
container escape. The attack surface is the entire kernel syscall interface.

Compare to a VM: the guest makes syscalls to the guest kernel. The host kernel's attack
surface from the VM is limited to the hypervisor interface (much smaller than the full
syscall table).

### Defense in depth

Docker applies multiple layers of restriction beyond namespaces:

**Linux capabilities:** Root's powers are divided into approximately 40 capabilities.
Docker drops most of them by default. A container process running as root inside has only
a subset of root's powers.

```bash
# See what capabilities a container gets by default
docker run --rm ubuntu:24.04 grep Cap /proc/self/status
# CapPrm/CapEff show the permitted/effective capability sets

# Decode the hex with capsh
docker run --rm ubuntu:24.04 bash -c \
  'apt-get update -qq && apt-get install -y -qq libcap2-bin > /dev/null 2>&1 && \
   capsh --decode=$(grep CapEff /proc/self/status | awk "{print \$2}")'
# Shows the list of capabilities the container has
```

Notable capabilities Docker drops by default:
- `CAP_SYS_ADMIN` - the "do anything" capability (mount filesystems, change namespaces, trace processes, etc.)
- `CAP_NET_RAW` - raw socket access (packet crafting, network sniffing)
- `CAP_SYS_PTRACE` - trace/debug other processes
- `CAP_SYS_MODULE` - load kernel modules

**seccomp profiles:** Docker applies a default seccomp (secure computing) profile that
blocks approximately 40 dangerous syscalls. The profile is a JSON whitelist/blacklist
of allowed syscalls.

```bash
# See if seccomp is active in a container
docker run --rm ubuntu:24.04 grep Seccomp /proc/self/status
# Seccomp: 2  (means seccomp filter is active)
# Seccomp_filters: 1

# Blocked syscalls include:
# - reboot (obvious)
# - mount (prevents mounting filesystems)
# - unshare (prevents creating new namespaces)
# - kexec_load (loading a new kernel)
# - bpf (eBPF programs - kernel extension)
```

**AppArmor / SELinux:** Mandatory access control profiles. Docker generates an AppArmor
profile for each container (on systems with AppArmor) that restricts filesystem access,
network operations, and capability use.

### The threat model for agent sandboxing

For the midget container, the threat model is:

1. **The agent process should not access the host filesystem.**
   - Control: mount namespace (container has its own root), no host volumes with sensitive data
   - Weakness: bind mounts (`-v`) expose host paths. If a volume is mounted, the agent can read/write it.

2. **The agent should not access host network services it should not reach.**
   - Control: network namespace (own network stack), Docker network isolation
   - Weakness: `--network host` bypasses all network isolation. Docker bridge NAT allows outbound connections by default.

3. **The agent should not consume all host resources.**
   - Control: cgroup memory limit, CPU limit, PID limit
   - Weakness: if limits are not set (no `--memory`, `--cpus` flags), the container can consume everything.

4. **The agent should not escalate to host root.**
   - Control: `USER agent` in Dockerfile (non-root inside), dropped capabilities, seccomp
   - Weakness: a kernel exploit could bypass all these controls because they all run on the same kernel.

```bash
# The project's Dockerfile uses USER agent:
# USER agent
# This means the container process runs as the "agent" user (UID 1000 typically)
# Even inside the container, it is not root
# It cannot install packages, bind to privileged ports, or modify system files
```

### What breaks the model

Things that weaken or break container isolation:

| Configuration | Effect |
|---------------|--------|
| `--privileged` | Disables ALL security: full capabilities, no seccomp, device access |
| `--network host` | Shares host network namespace - can reach any host service |
| `--pid host` | Shares host PID namespace - can see all processes |
| `-v /:/host` | Mounts entire host filesystem into container |
| `--cap-add SYS_ADMIN` | Allows mount, unshare, and many other dangerous operations |
| `--security-opt seccomp=unconfined` | Disables seccomp filtering |

> **AGENTIC GROUNDING:** When reviewing Docker configurations generated by agents, or
> when debugging why an agent container "needs" `--privileged`, check this list. Agents
> frequently request `--privileged` because it "fixes" permission errors. It does - by
> removing all security boundaries. The correct fix is almost always to grant the specific
> capability needed (`--cap-add`) or to fix the underlying permission issue.

---

## 7. The Midget Container Specifically

*Estimated time: 20 minutes*

Now connect everything to the project's actual container.

### The Dockerfile

```dockerfile
# Midget POC - minimal Linux agent sandbox
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV SCREEN_WIDTH=1280
ENV SCREEN_HEIGHT=720
ENV SCREEN_DEPTH=24

RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb fluxbox xdotool scrot xclip wmctrl x11-utils \
    xterm tmux python3 python3-pip python3-venv procps \
    && rm -rf /var/lib/apt/lists/*

COPY steer/ /opt/steer/
COPY entrypoint.sh /opt/entrypoint.sh
COPY test-poc.sh /opt/test-poc.sh
RUN chmod +x /opt/entrypoint.sh /opt/steer/steer /opt/test-poc.sh

RUN useradd -m -s /bin/bash agent
USER agent
WORKDIR /home/agent

ENTRYPOINT ["/opt/entrypoint.sh"]
```

### How each layer maps to the internals

**`FROM ubuntu:24.04`** - this is the bottom overlayfs layer. It contains the complete
Ubuntu 24.04 root filesystem: `/bin`, `/lib`, `/usr`, `/etc`, etc. When you pull this
image, Docker downloads its layers and stores them in `/var/lib/docker/overlay2/`.

**`RUN apt-get update && apt-get install ...`** - this creates a new overlayfs layer
containing all the files added by `apt-get install`. The `&& rm -rf /var/lib/apt/lists/*`
at the end removes the apt cache in the SAME layer, so the cache files do not consume
space. If `rm` were in a separate `RUN` instruction, it would create a new layer with
whiteout files, but the data would still exist in the previous layer (layers are immutable
once created). This is a common Dockerfile optimization.

**`COPY steer/ /opt/steer/`** - another layer, containing the steer wrapper scripts.

**`RUN chmod +x ...`** - another layer, containing the modified file metadata. Even though
only permissions changed, OverlayFS stores a full copy of each modified file in the new
layer (copy-on-write at the file level, not the byte level).

**`USER agent`** - this does not create a layer. It sets metadata in the image that tells
the runtime to run the container process as the `agent` user.

### The steer architecture

```
+----------------------------------------------------------------+
| Container (midget)                                              |
|                                                                 |
|  entrypoint.sh (PID 1 initially, then exec replaces it)        |
|    |                                                            |
|    +-- Xvfb :99 (virtual X11 display - framebuffer in memory)  |
|    |     Creates /tmp/.X11-unix/X99 (Unix domain socket)        |
|    |                                                            |
|    +-- fluxbox (window manager on :99)                          |
|    |     Manages window focus, raise, decorations               |
|    |                                                            |
|    +-- [target process] (PID 1 after exec "$@")                 |
|          |                                                      |
|          +-- xdotool: sends keyboard/mouse events to :99        |
|          +-- scrot: captures screenshots from :99               |
|          +-- xclip: clipboard operations                        |
|          +-- wmctrl: window manipulation                        |
|                                                                 |
|  All processes connect to DISPLAY=:99 via the Unix socket       |
|  The socket exists in the container's mount namespace            |
+----------------------------------------------------------------+
```

**Xvfb** (X Virtual Framebuffer) creates a virtual X11 display. It renders to a memory
buffer instead of a physical screen. X11 clients (like xterm, browsers, any GUI
application) connect to it via the Unix socket at `/tmp/.X11-unix/X99`. This socket
exists in the container's mount namespace - the host cannot see it (unless you explicitly
share the X11 socket).

**fluxbox** is a minimal window manager. Without a window manager, X11 windows cannot be
focused, raised, or positioned. The agent uses `xdotool` and `wmctrl` to interact with
windows, and these operations require a window manager to function.

**xdotool** sends synthetic keyboard and mouse events. `xdotool type "hello"` sends
keypress events for h-e-l-l-o to the focused window. `xdotool mousemove 100 200 click 1`
moves the mouse to (100,200) and clicks. This is how the agent "interacts" with GUI
applications.

**scrot** captures screenshots. `scrot /tmp/screenshot.png` renders the current state of
the virtual display to a PNG file. The agent takes screenshots to "see" what is on the
screen, processes them (OCR or vision model), and decides what to do next.

This is the "steer" architecture: see the screen (scrot) then send input (xdotool). The
agent controls GUI applications the same way a human does - by looking at pixels and
moving a mouse/keyboard. The container provides the sandboxed display environment where
this interaction happens.

### Observing the container from the host

```bash
# Build and run the midget container
docker build -t midget .
docker run -d --name midget-test midget sleep 3600

# Find the container's main process on the host
docker inspect --format '{{.State.Pid}}' midget-test
# e.g., 54321

# Examine its namespaces
ls -la /proc/54321/ns/
# Each namespace has a unique inode

# Check what cgroup it is in
cat /proc/54321/cgroup
# 0::/docker/<container-id>

# See its overlayfs mount from the host
docker inspect --format '{{.GraphDriver.Data.MergedDir}}' midget-test
# /var/lib/docker/overlay2/<hash>/merged

# List files in the container's root filesystem from the host
sudo ls /var/lib/docker/overlay2/<hash>/merged/
# bin  etc  home  lib  opt  proc  root  run  sbin  tmp  usr  var

# See the upper (writable) layer
docker inspect --format '{{.GraphDriver.Data.UpperDir}}' midget-test
# /var/lib/docker/overlay2/<hash>/diff
sudo ls /var/lib/docker/overlay2/<hash>/diff/
# Only files the container has written/modified since starting

# See the container's processes from the host
ps --forest -o pid,ppid,user,comm -g $(docker inspect --format '{{.State.Pid}}' midget-test)

# Clean up
docker rm -f midget-test
```

> **AGENTIC GROUNDING:** The Xvfb display (:99) exists in the container's mount namespace
> as a Unix socket at `/tmp/.X11-unix/X99`. If you need to observe what the agent "sees,"
> you can `docker exec` into the container and run `scrot /tmp/debug.png`, then
> `docker cp midget-test:/tmp/debug.png .` to copy it out. Alternatively, you can expose
> the display over VNC by adding a VNC server to the container. Either way, you are
> crossing namespace boundaries to observe agent behavior - understanding the namespaces
> tells you what is possible and what requires explicit configuration.

---

## Challenges

### Challenge: Build a Container from Scratch

*Estimated time: 30 minutes*

Using only `unshare`, `mount`, `chroot` (or `pivot_root`), and standard tools, create a
minimal "container" - a process with its own PID namespace, mount namespace, and UTS
namespace, running in a minimal root filesystem.

**Step 1: Get a minimal root filesystem**

```bash
# Option A: Debootstrap a minimal Debian root
sudo apt-get install -y debootstrap
sudo debootstrap --variant=minbase bookworm /tmp/mycontainer http://deb.debian.org/debian

# Option B: Download Alpine's minirootfs (smaller, faster)
mkdir -p /tmp/mycontainer
wget -O /tmp/alpine.tar.gz \
  https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-minirootfs-3.19.1-x86_64.tar.gz
sudo tar xzf /tmp/alpine.tar.gz -C /tmp/mycontainer
```

**Step 2: Create the namespaced process**

```bash
# Create new PID, mount, and UTS namespaces
sudo unshare --pid --mount --uts --fork bash

# Inside the new namespaces:

# Set a custom hostname
hostname my-container
hostname
# Output: my-container

# Mount proc for the new PID namespace
mount -t proc proc /tmp/mycontainer/proc

# Mount sysfs
mount -t sysfs sys /tmp/mycontainer/sys

# Mount a tmpfs for /tmp
mount -t tmpfs tmp /tmp/mycontainer/tmp

# Change root to the minimal filesystem
chroot /tmp/mycontainer /bin/sh

# You are now in your "container"
# Verify isolation:

# PID namespace: you are PID 1
ps aux
# Only shows processes in this namespace

# UTS namespace: custom hostname
hostname
# my-container

# Mount namespace: own mount tree
mount
# Shows the mounts you created, not the host's

# Filesystem: the minimal root
ls /
# bin  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var

# Exit
exit
```

**Verification criteria:**
- [ ] The process sees itself as PID 1
- [ ] The hostname is different from the host
- [ ] `ps` shows only processes in the namespace
- [ ] The filesystem root is the minimal rootfs, not the host's `/`
- [ ] From another terminal on the host, the process is visible with a normal host PID

**Stretch goal:** Replace `chroot` with `pivot_root` (the mechanism Docker actually uses).
`pivot_root` swaps the root filesystem and allows unmounting the old root entirely.
`chroot` merely changes the path resolution start point but the old root is still
accessible in the kernel's mount tree.

```bash
# Inside the unshare'd namespace, before chroot:
# pivot_root requires the new root to be a mount point
mount --bind /tmp/mycontainer /tmp/mycontainer
cd /tmp/mycontainer
mkdir -p oldroot
pivot_root . oldroot
# Now / is the new rootfs, /oldroot is the old host root

# Unmount the old root
umount -l /oldroot
rmdir /oldroot
# The old host root is completely inaccessible
```

---

### Challenge: Cgroup Resource Jail

*Estimated time: 15 minutes*

Create a cgroup that limits memory to 50MB and CPU to 50%, then test the enforcement.

```bash
# Create the cgroup
sudo mkdir /sys/fs/cgroup/jail-test

# Enable controllers
printf '+memory +cpu +pids' | sudo tee /sys/fs/cgroup/jail-test/cgroup.subtree_control

# Create a child cgroup (processes go in leaf cgroups in v2)
sudo mkdir /sys/fs/cgroup/jail-test/worker

# Set memory limit: 50MB
printf '52428800' | sudo tee /sys/fs/cgroup/jail-test/worker/memory.max

# Set CPU limit: 50% of one core
printf '50000 100000' | sudo tee /sys/fs/cgroup/jail-test/worker/cpu.max

# Set PID limit: 10 processes max
printf '10' | sudo tee /sys/fs/cgroup/jail-test/worker/pids.max

# Start a shell in the cgroup
sudo bash -c 'printf "$$" > /sys/fs/cgroup/jail-test/worker/cgroup.procs && exec bash'
```

Now test from inside the jailed shell:

```bash
# Test 1: Memory limit
# Try to allocate 60MB - should be OOM killed
python3 -c "x = bytearray(60 * 1024 * 1024); print('allocated')"
# Killed

# Check dmesg on the host (from another terminal):
dmesg | tail -5
# Should show OOM killer log

# Test 2: Allocate under the limit - should work
python3 -c "x = bytearray(40 * 1024 * 1024); print('allocated 40MB OK')"
# allocated 40MB OK

# Test 3: Monitor memory usage
cat /sys/fs/cgroup/jail-test/worker/memory.current
# Shows bytes currently used

# Test 4: PID limit (try a fork bomb)
# WARNING: This is safe because the cgroup limits it to 10 processes
:(){ :|:& };:
# bash: fork: retry: Resource temporarily unavailable
# The fork bomb is contained!

# Test 5: CPU stress
# Run a CPU-intensive task and observe it is throttled
python3 -c "
import time
start = time.time()
x = 0
while time.time() - start < 5:
    x += 1
print(f'iterations in 5 seconds: {x}')
"
# Compare the iteration count to running outside the cgroup
# It should be roughly half (50% CPU limit)
```

**Cleanup:**

```bash
# Exit the jailed shell
exit

# Remove the cgroup (must be empty)
sudo rmdir /sys/fs/cgroup/jail-test/worker
sudo rmdir /sys/fs/cgroup/jail-test
```

**Questions to answer:**
1. What happens if you set `memory.max` lower than the current `memory.current`?
2. What is the difference between `memory.max` and `memory.high`?
3. Why do you need a child cgroup (`worker`) rather than putting processes directly in `jail-test` when `subtree_control` is configured?

---

### Challenge: OverlayFS by Hand

*Estimated time: 15 minutes*

Create an overlay mount, perform operations, and observe the results in each layer.

```bash
# Setup
mkdir -p /tmp/ofs/{lower1,lower2,upper,work,merged}

# Create two lower layers (simulating Docker image layers)
# Lower1: base system files
printf 'base config\n' > /tmp/ofs/lower1/config.txt
printf 'base data\n' > /tmp/ofs/lower1/data.txt
mkdir -p /tmp/ofs/lower1/etc
printf 'base-host\n' > /tmp/ofs/lower1/etc/hostname

# Lower2: application layer (overrides some base files)
printf 'app config override\n' > /tmp/ofs/lower2/config.txt
printf 'app readme\n' > /tmp/ofs/lower2/README.md

# Mount with multiple lower layers (lower2 is on top of lower1)
sudo mount -t overlay overlay \
  -o lowerdir=/tmp/ofs/lower2:/tmp/ofs/lower1,upperdir=/tmp/ofs/upper,workdir=/tmp/ofs/work \
  /tmp/ofs/merged
```

**Tasks:**

1. List the merged view. Which version of `config.txt` do you see? Why?

```bash
cat /tmp/ofs/merged/config.txt
# Should show "app config override" - lower2 is on top of lower1
```

2. Verify that files from both layers are visible:

```bash
ls /tmp/ofs/merged/
# config.txt  data.txt  etc  README.md
# config.txt comes from lower2 (top), data.txt from lower1, README.md from lower2
```

3. Modify a file and find the copy-on-write:

```bash
printf 'modified by container\n' > /tmp/ofs/merged/data.txt

# Where is the modified version?
cat /tmp/ofs/upper/data.txt
# modified by container

# Is the original intact?
cat /tmp/ofs/lower1/data.txt
# base data
```

4. Create a new file and find it:

```bash
printf 'new file\n' > /tmp/ofs/merged/new.txt

ls /tmp/ofs/upper/
# data.txt  new.txt
```

5. Delete a lower-layer file and find the whiteout:

```bash
rm /tmp/ofs/merged/README.md

# Merged view - gone
ls /tmp/ofs/merged/
# config.txt  data.txt  etc  new.txt (no README.md)

# Lower layer - still there
ls /tmp/ofs/lower2/
# config.txt  README.md (untouched)

# Upper layer - whiteout file
sudo ls -la /tmp/ofs/upper/
# README.md should show as character device (0,0) - the whiteout marker
sudo stat /tmp/ofs/upper/README.md
```

6. Delete a directory from the lower layer and find the opaque marker:

```bash
rm -rf /tmp/ofs/merged/etc

# Check the upper layer
sudo ls -la /tmp/ofs/upper/
# etc should exist as an opaque directory

# Check for the opaque xattr
sudo getfattr -n trusted.overlay.opaque /tmp/ofs/upper/etc 2>/dev/null
# trusted.overlay.opaque="y"
```

**Cleanup:**

```bash
sudo umount /tmp/ofs/merged
rm -rf /tmp/ofs
```

---

### Challenge: Inspect the Midget Container

*Estimated time: 15 minutes*

Run the project's Docker container and examine it from both the host and inside perspectives.

```bash
# Build and run
docker build -t midget .
docker run -d --name midget-inspect --memory 512m --cpus 1.5 midget sleep 3600

# Get the container's host PID
HOST_PID=$(docker inspect --format '{{.State.Pid}}' midget-inspect)
printf 'Container main PID on host: %s\n' "$HOST_PID"
```

**From the host, examine:**

```bash
# 1. Namespaces
ls -la /proc/$HOST_PID/ns/
# Note the inode numbers

# Compare with your shell's namespaces
ls -la /proc/self/ns/
# Different inodes = different namespaces

# 2. Cgroup membership
cat /proc/$HOST_PID/cgroup
# Shows the cgroup path

# 3. Cgroup limits
# Find the cgroup path on disk
CGROUP=$(cat /proc/$HOST_PID/cgroup | cut -d: -f3)
# Read the limits
cat /sys/fs/cgroup${CGROUP}/memory.max
cat /sys/fs/cgroup${CGROUP}/cpu.max
cat /sys/fs/cgroup${CGROUP}/pids.current

# 4. OverlayFS mount
docker inspect --format '{{.GraphDriver.Data.MergedDir}}' midget-inspect
docker inspect --format '{{.GraphDriver.Data.UpperDir}}' midget-inspect
docker inspect --format '{{.GraphDriver.Data.LowerDir}}' midget-inspect

# 5. Count the image layers
docker inspect --format '{{.GraphDriver.Data.LowerDir}}' midget-inspect | tr ':' '\n' | wc -l

# 6. What user is the process running as?
ps -o pid,uid,user,comm -p $HOST_PID
# Should show the "agent" user (mapped to a UID on the host)
```

**From inside the container:**

```bash
docker exec -it midget-inspect bash

# 1. What PID do you see yourself as?
ps aux
# PID 1 should be sleep 3600 (or the entrypoint)

# 2. Can you see host processes?
ps aux | wc -l
# Should show only container processes, not hundreds of host processes

# 3. What is the hostname?
hostname
# The container ID (Docker default)

# 4. What network interfaces exist?
ip addr 2>/dev/null || cat /proc/net/dev
# eth0 and lo only

# 5. What is the root filesystem?
mount | grep overlay
# Shows the overlayfs mount

# 6. Can you see the host's /proc?
cat /proc/1/cmdline | tr '\0' ' '
# Shows the container's PID 1, not systemd

# 7. What user are you?
id
# uid=1000(agent) gid=1000(agent) - non-root

exit
```

**Cleanup:**

```bash
docker rm -f midget-inspect
```

---

### Challenge: Namespace Escape Scenarios

*Estimated time: 15 minutes*

These demonstrations show how misconfiguration weakens container isolation. Run in a
test environment only.

**Scenario 1: `--pid host` breaks PID isolation**

```bash
# Normal container - isolated PID namespace
docker run --rm ubuntu:24.04 ps aux | wc -l
# 2-3 lines (only container processes)

# With --pid host - shared PID namespace
docker run --rm --pid host ubuntu:24.04 ps aux | wc -l
# Hundreds of lines (all host processes visible)

# The container can see (and potentially signal) host processes
docker run --rm --pid host ubuntu:24.04 ps aux | grep dockerd
# Shows the Docker daemon - the container can see it
```

**Scenario 2: `--network host` breaks network isolation**

```bash
# Normal container - isolated network
docker run --rm ubuntu:24.04 ip addr
# Only eth0 (veth) and lo

# With --network host - shared network namespace
docker run --rm --network host ubuntu:24.04 ip addr
# All host network interfaces visible
# Container can bind to any host port
# Container can reach any service on localhost
```

**Scenario 3: Volume mount exposes host filesystem**

```bash
# Mount the host root into the container
docker run --rm -v /:/hostroot:ro ubuntu:24.04 ls /hostroot/etc/shadow
# The container can read the host's shadow file (password hashes)

# With read-write mount:
docker run --rm -v /:/hostroot ubuntu:24.04 touch /hostroot/tmp/container-was-here
ls -la /tmp/container-was-here
# The container wrote to the host filesystem
rm /tmp/container-was-here
```

**Questions to answer:**
1. If you must give a container access to host processes (e.g., for monitoring), what is
   the minimum exposure? (Hint: consider mounting specific `/proc` entries read-only
   instead of sharing the PID namespace.)
2. If a container needs to reach one specific host service, what is safer than
   `--network host`? (Hint: Docker networks and service discovery.)
3. Why is `-v /var/run/docker.sock:/var/run/docker.sock` particularly dangerous?
   (The container can control the Docker daemon - create new privileged containers, mount
   host filesystem, etc. This is effectively root on the host.)

---

### Challenge: Container Networking Deep Dive

*Estimated time: 20 minutes*

Trace a packet between two containers to understand how Docker networking uses network
namespaces and bridges.

```bash
# Create a custom network
docker network create testnet

# Run two containers on it
docker run -d --name box1 --network testnet ubuntu:24.04 sleep 3600
docker run -d --name box2 --network testnet ubuntu:24.04 sleep 3600

# Install networking tools in both
docker exec box1 apt-get update -qq
docker exec box1 apt-get install -y -qq iproute2 iputils-ping tcpdump > /dev/null 2>&1
docker exec box2 apt-get update -qq
docker exec box2 apt-get install -y -qq iproute2 iputils-ping tcpdump > /dev/null 2>&1
```

**Task 1: Examine network namespaces from inside**

```bash
# Box 1's network view
docker exec box1 ip addr
# eth0: 172.18.0.2/16 (or similar)

# Box 2's network view
docker exec box2 ip addr
# eth0: 172.18.0.3/16

# Both see their own isolated network stack
```

**Task 2: Examine from the host**

```bash
# Host sees the bridge and veth pairs
ip link | grep -A1 "br-"
# br-<hash>: the bridge for "testnet"

ip link | grep veth
# Two veth interfaces (one per container)

# Each veth is one end of a virtual cable
# The other end is eth0 inside the container
```

**Task 3: Ping between containers**

```bash
# Get box2's IP
BOX2_IP=$(docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' box2)

# Ping from box1 to box2
docker exec box1 ping -c 3 $BOX2_IP
```

**Task 4: Trace the packet path**

```bash
# In terminal 1: capture on the bridge (host)
BRIDGE=$(docker network inspect testnet --format '{{.Id}}' | cut -c1-12)
sudo tcpdump -i "br-${BRIDGE}" icmp -c 6 &

# In terminal 2: capture inside box2
docker exec box2 tcpdump -i eth0 icmp -c 3 &

# In terminal 3: send the ping
docker exec box1 ping -c 3 $BOX2_IP

# Observe: the packet appears on the bridge AND inside box2
# Path: box1 eth0 -> veth (host) -> bridge -> veth (host) -> box2 eth0
```

**Task 5: Enter a container's network namespace from the host**

```bash
# Get container PID
BOX1_PID=$(docker inspect --format '{{.State.Pid}}' box1)

# Enter only the network namespace (keep host mount namespace)
sudo nsenter -t $BOX1_PID --net ip addr
# Shows box1's network view, but you are still on the host filesystem

# This is useful for debugging: run host tools in the container's network context
sudo nsenter -t $BOX1_PID --net ss -tlnp
# Shows listening sockets in box1's network namespace
```

**Cleanup:**

```bash
docker rm -f box1 box2
docker network rm testnet
```

---

## Key Takeaways

Before moving on, verify you can answer these questions without looking anything up:

1. What is a container, structurally? (Not "like a lightweight VM" - what kernel features
   create it?)

2. How many kernel features does Docker compose to create a container? Name each one and
   what it controls.

3. If a process is PID 1 inside a container and PID 54321 on the host, what mechanism
   creates this dual view?

4. Why does `exec "$@"` in an entrypoint script matter for signal handling?

5. What is a whiteout file in OverlayFS? Why is it needed?

6. Where do writes inside a container go? Why do they disappear when the container is
   removed?

7. What is the difference between a Docker volume and a file written inside the
   container?

8. Why can a kernel exploit escape a container but not a VM?

9. What does `--privileged` actually do? Why should you never use it for agent containers?

10. How does `docker exec` work at the namespace level?

---

## Recommended Reading

- **Linux Kernel Documentation: namespaces** - `man 7 namespaces`, `man 7 cgroups`,
  `man 7 pid_namespaces`, `man 7 network_namespaces`, `man 7 user_namespaces`. The man
  pages are precise and authoritative.

- **"Containers from Scratch"** - Liz Rice's talk and blog series. Builds a container
  runtime in Go using raw syscalls. The best practical introduction to container internals.

- **cgroups v2 documentation** - `Documentation/admin-guide/cgroup-v2.rst` in the kernel
  source. Authoritative reference for cgroup controllers and their interfaces.

- **The OCI Runtime Specification** - defines the standard for container runtimes (what
  namespaces, cgroups, mounts, etc. must be configured). `runc` is the reference
  implementation.

- **"Understanding and Hardening Linux Containers"** - NCC Group whitepaper. Systematic
  analysis of container security boundaries, attack surfaces, and hardening measures. The
  best single reference for container security engineering.

- **Plan 9 from Bell Labs** - `man 2 rfork` and the Plan 9 papers. The conceptual origin
  of per-process namespaces.

---

## What to Read Next

**[Step 10: Networking from the CLI](/bootcamp/10-networking-cli/)** - You have seen how Docker uses network namespaces,
veth pairs, and bridges to connect containers. Step 10 goes deeper into the networking
stack itself: TCP/IP fundamentals, `curl` for HTTP operations, `dig`/`nslookup` for DNS,
`ss` and `netstat` for socket inspection, `tcpdump` and `wireshark` for packet analysis,
and `openssl` for TLS inspection. When an agent container cannot reach an external service,
or when connections are dropping, or when TLS handshakes fail - you need the networking
mental model to diagnose from the command line. The container networking you saw in this
step (bridges, veth pairs, NAT) composes with the general networking concepts in Step 10.

```


---

## Output Requirements

1. Write your narrative assessment (Section 1)
2. End with the structured YAML findings block (Section 2)
3. Use `prompt_id: 4` and `prompt_name: "irreplaceability"` in your YAML header
4. Use `model: "codex"` in your YAML header
5. Classify each finding with an attack vector from the taxonomy
6. Be honest. If the criticism does not hold up, say so.

mcp: posthog starting
mcp: linear-server starting
mcp: helicone starting
mcp: sentry starting
mcp: stripe starting
mcp: codex_apps starting
mcp: auggie starting
mcp: context7 starting
mcp: langsmith starting
2026-03-10T15:16:30.030097Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when Auth(TokenRefreshFailed("Server returned error response: invalid_grant: Invalid refresh token"))
mcp: stripe failed: MCP client for `stripe` failed to start: MCP startup failed: handshaking with MCP server failed: Send message error Transport [rmcp::transport::worker::WorkerTransport<rmcp::transport::streamable_http_client::StreamableHttpClientWorker<rmcp::transport::auth::AuthClient<reqwest::async_impl::client::Client>>>] error: Auth error: OAuth token refresh failed: Server returned error response: invalid_grant: Invalid refresh token, when send initialize request
mcp: linear-server ready
mcp: posthog ready
mcp: auggie ready
mcp: context7 ready
mcp: codex_apps ready
mcp: langsmith ready
mcp: sentry ready
mcp: helicone ready
mcp startup: ready: linear-server, posthog, auggie, context7, codex_apps, langsmith, sentry, helicone; failed: stripe
codex
watch_officer: codex
weave_mode: tight
register: quarterdeck
tempo: making-way
true_north: "hired = proof > claim"
bearing: adversarial review of irreplaceability claim in bootcamp material
last_known_position: source material loaded for blog post plus Step 1 and Step 9

Reading the proposition against the supplied post and two step files, then stress-testing where the human-verifier claim breaks under stronger agent autonomy and where it still holds.
codex
```yaml
watch_officer: codex
weave_mode: tight
register: quarterdeck
tempo: making-way
true_north: "hired = proof > claim"
bearing: adversarial review of irreplaceability proposition
last_known_position: reviewed the blog post plus Step 1 and Step 9
```

## Narrative

The steelman is strong, and the weak point is obvious: the post keeps cashing out "irreplaceability" with low-level Linux debugging examples that are already moving into agent territory. The cleanest attack line is in [01-process-model.md](/home/mrkai/code/midgets/sites/oceanheart/content/bootcamp/01-process-model.md): "An agent cannot run strace. You can." That is the kind of sentence HN commenters will seize on immediately, because modern coding agents can often run `strace`, inspect `/proc`, read `lsof`, diff cgroup files, and iterate on shell failures autonomously when the harness allows it. The same problem appears in [09-container-internals.md](/home/mrkai/code/midgets/sites/oceanheart/content/bootcamp/09-container-internals.md), where namespaces, cgroups, overlayfs, and `nsenter` are presented as first-principles diagnostics. Those are real skills, but they are also exactly the kind of deterministic inspection workflow that agents are best at absorbing.

So the strongest version of the criticism is not "this material is wrong." It is: the curriculum's flagship examples of human irreplaceability are concentrated in the part of the stack most likely to be automated away first. If the human moat is "I can inspect file descriptors and read kernel artifacts," that moat is shrinking fast. Better agents do not need a folk explanation of `fork/exec` to catch an fd leak. They can trace, inspect, patch, rerun, and compare outputs directly. In that sense, the bootcamp risks teaching humans to be slow copies of the tooling layer.

That criticism lands hardest against [2026-03-10-agentic-bootcamp.md](/home/mrkai/code/midgets/sites/oceanheart/content/blog/2026-03-10-agentic-bootcamp.md) where "irreplaceability" is used as a ranking criterion across the whole curriculum. The blog makes a strong universal claim: some knowledge "cannot be delegated to an agent and must be held by the human operator." The supplied step files do not fully support that universal form. What they show is that these concepts are useful for auditing agent output. That is weaker than non-delegable. The distinction matters. "Useful for spot-checking" is durable. "Must be held by the human" is much easier to falsify.

The pedagogy also undercuts the thesis a bit. The challenges in Step 1 and Step 9 mostly train procedural competence: build a pipe by hand, trap signals, inspect fds, create cgroups, mount overlayfs, inspect namespaces. That is good systems training, but it is not the same as training the non-delegable layer. If the unique human contribution is supposed to be oracle design, metric validity, threat-model judgment, or deciding whether an agent's stopping condition is legitimate, the exercises should force ambiguous judgment under uncertainty. The sampled steps mostly teach mechanics, which is precisely the layer an improving agent can internalize.

That said, the criticism breaks if it overreaches. The post is much stronger when it moves up a level from "run this diagnostic" to "decide what counts as evidence." In the blog, the robust part is the oracle problem around evaluation, retrieval relevance, calibration vs accuracy, and whether a measurement means what the operator thinks it means. An agent can run more checks on itself; that does not make those checks independent. Self-verification is still downstream of the same model prior, the same tool affordances, and the same objective framing. Better autonomy reduces manual debugging load. It does not eliminate the need for an external principal who can reject the agent's framing of success.

So the strongest counterargument the author could make is this: irreplaceability is not about manually typing `strace` or reading `/proc` by hand. It is about maintaining an independent world-model and an independent acceptance criterion. Agents can become excellent first-pass debuggers, but they do not become independent judges of whether the task, metric, threat model, or tradeoff was correctly specified. If the author reframed the claim that way, the curriculum would be more future-proof. As written, it is strongest in Bootcamp II and IV type material, and weakest in the Step 1 / Step 9 style substrate examples used to sell the thesis.

Bottom line: the irreplaceability claim is partially robust, not fully robust. It is weak when grounded in mechanistic Linux inspection, because that is already being automated. It is strong when grounded in oracle-setting, evaluation design, and responsibility for accepting or rejecting evidence. The Show HN risk is that the current writeup leans on the weak examples too heavily, making the whole proposition look more obsolete than it really is.

```yaml
review:
  model: "codex"
  date: "2026-03-10"
  prompt_id: 4
  prompt_name: "irreplaceability"

findings:
  - id: F-001
    attack_vector: "AV-OBSOLESCENCE"
    severity: critical
    claim_challenged: "If you don't understand the substrate, the agent can't help you verify its own output."
    evidence: "Step 1 explicitly says 'An agent cannot run strace. You can.' and presents /proc, lsof, and syscall tracing as uniquely human diagnostic advantages."
    survives_scrutiny: true
    description: >
      This is the easiest high-signal attack on the post. Modern coding agents can often
      run strace, inspect /proc, read fd tables, and iterate on shell failures
      autonomously when the harness permits it. That makes the post's most concrete
      irreplaceability example already look dated, and HN commenters will likely use it
      as proof that the core thesis is behind the tooling curve.

  - id: F-002
    attack_vector: "AV-OBSOLESCENCE"
    severity: high
    claim_challenged: "Bootcamp I is prerequisite for everything because humans must understand the OS substrate to debug agent output."
    evidence: "The sampled steps focus on deterministic kernel-facing workflows: fork/exec, redirections, pipes, namespaces, cgroups, overlayfs, nsenter, and direct inspection of process state."
    survives_scrutiny: true
    description: >
      The curriculum's deepest investment is in the domain most susceptible to rapid
      automation. Kernel artifacts are structured, inspectable, and testable, which makes
      them unusually amenable to agent loops. Even if substrate knowledge remains useful,
      claiming it as the core non-delegable moat is weak because it is exactly where agent
      autonomy is improving fastest.

  - id: F-003
    attack_vector: "AV-PEDAGOGY"
    severity: medium
    claim_challenged: "Irreplaceability is one of the three main ranking criteria for the curriculum."
    evidence: "Step 1 and Step 9 challenges mostly ask the learner to reproduce mechanisms: build pipes, trap signals, inspect fds, create cgroups, mount overlayfs, and inspect namespaces."
    survives_scrutiny: true
    description: >
      The exercises train procedural systems fluency, not the specific kind of judgment
      the post says is non-delegable. If the real human moat is oracle design, metric
      validity, threat modeling, and knowing when to distrust a clean-looking result, the
      pedagogy should force ambiguous judgment calls rather than mostly deterministic lab
      work.

  - id: F-004
    attack_vector: "AV-COMPLETENESS"
    severity: medium
    claim_challenged: "Irreplaceability is a durable ranking principle across the full stack from shell scripts to evaluation pipelines."
    evidence: "The blog extends the oracle argument upward to tokenization, retrieval, and evaluation methodology, but the supplied step files substantiate the Linux substrate side far more concretely than the higher-level evaluation side."
    survives_scrutiny: true
    description: >
      The broad cross-stack claim is asserted more strongly than it is evidenced in the
      sampled material. The reader is shown in detail why process and container internals
      matter, but not with equal concreteness why those same concepts remain
      non-delegable at the retrieval and evaluation layers. That asymmetry makes the
      universal form of the claim easier to attack.

  - id: F-005
    attack_vector: "AV-OBSOLESCENCE"
    severity: medium
    claim_challenged: "The human is the final verification layer."
    evidence: "The blog's oracle-problem framing explicitly extends beyond low-level debugging to metric validity, retrieval relevance, and whether an evaluation measures what the operator thinks it measures."
    survives_scrutiny: false
    description: >
      The strongest version of the obsolescence criticism goes too far if it claims the
      verification layer will move fully inside the agent. Better agents can self-check
      more of their own execution, but they do not become an independent oracle for goal
      choice, measurement validity, risk acceptance, or whether a clean metric is actually
      meaningful. This part of the bootcamp's claim remains robust, especially in the
      evaluation and governance material rather than the Linux-debugging examples.
```
tokens used
68,108
```yaml
watch_officer: codex
weave_mode: tight
register: quarterdeck
tempo: making-way
true_north: "hired = proof > claim"
bearing: adversarial review of irreplaceability proposition
last_known_position: reviewed the blog post plus Step 1 and Step 9
```

## Narrative

The steelman is strong, and the weak point is obvious: the post keeps cashing out "irreplaceability" with low-level Linux debugging examples that are already moving into agent territory. The cleanest attack line is in [01-process-model.md](/home/mrkai/code/midgets/sites/oceanheart/content/bootcamp/01-process-model.md): "An agent cannot run strace. You can." That is the kind of sentence HN commenters will seize on immediately, because modern coding agents can often run `strace`, inspect `/proc`, read `lsof`, diff cgroup files, and iterate on shell failures autonomously when the harness allows it. The same problem appears in [09-container-internals.md](/home/mrkai/code/midgets/sites/oceanheart/content/bootcamp/09-container-internals.md), where namespaces, cgroups, overlayfs, and `nsenter` are presented as first-principles diagnostics. Those are real skills, but they are also exactly the kind of deterministic inspection workflow that agents are best at absorbing.

So the strongest version of the criticism is not "this material is wrong." It is: the curriculum's flagship examples of human irreplaceability are concentrated in the part of the stack most likely to be automated away first. If the human moat is "I can inspect file descriptors and read kernel artifacts," that moat is shrinking fast. Better agents do not need a folk explanation of `fork/exec` to catch an fd leak. They can trace, inspect, patch, rerun, and compare outputs directly. In that sense, the bootcamp risks teaching humans to be slow copies of the tooling layer.

That criticism lands hardest against [2026-03-10-agentic-bootcamp.md](/home/mrkai/code/midgets/sites/oceanheart/content/blog/2026-03-10-agentic-bootcamp.md) where "irreplaceability" is used as a ranking criterion across the whole curriculum. The blog makes a strong universal claim: some knowledge "cannot be delegated to an agent and must be held by the human operator." The supplied step files do not fully support that universal form. What they show is that these concepts are useful for auditing agent output. That is weaker than non-delegable. The distinction matters. "Useful for spot-checking" is durable. "Must be held by the human" is much easier to falsify.

The pedagogy also undercuts the thesis a bit. The challenges in Step 1 and Step 9 mostly train procedural competence: build a pipe by hand, trap signals, inspect fds, create cgroups, mount overlayfs, inspect namespaces. That is good systems training, but it is not the same as training the non-delegable layer. If the unique human contribution is supposed to be oracle design, metric validity, threat-model judgment, or deciding whether an agent's stopping condition is legitimate, the exercises should force ambiguous judgment under uncertainty. The sampled steps mostly teach mechanics, which is precisely the layer an improving agent can internalize.

That said, the criticism breaks if it overreaches. The post is much stronger when it moves up a level from "run this diagnostic" to "decide what counts as evidence." In the blog, the robust part is the oracle problem around evaluation, retrieval relevance, calibration vs accuracy, and whether a measurement means what the operator thinks it means. An agent can run more checks on itself; that does not make those checks independent. Self-verification is still downstream of the same model prior, the same tool affordances, and the same objective framing. Better autonomy reduces manual debugging load. It does not eliminate the need for an external principal who can reject the agent's framing of success.

So the strongest counterargument the author could make is this: irreplaceability is not about manually typing `strace` or reading `/proc` by hand. It is about maintaining an independent world-model and an independent acceptance criterion. Agents can become excellent first-pass debuggers, but they do not become independent judges of whether the task, metric, threat model, or tradeoff was correctly specified. If the author reframed the claim that way, the curriculum would be more future-proof. As written, it is strongest in Bootcamp II and IV type material, and weakest in the Step 1 / Step 9 style substrate examples used to sell the thesis.

Bottom line: the irreplaceability claim is partially robust, not fully robust. It is weak when grounded in mechanistic Linux inspection, because that is already being automated. It is strong when grounded in oracle-setting, evaluation design, and responsibility for accepting or rejecting evidence. The Show HN risk is that the current writeup leans on the weak examples too heavily, making the whole proposition look more obsolete than it really is.

```yaml
review:
  model: "codex"
  date: "2026-03-10"
  prompt_id: 4
  prompt_name: "irreplaceability"

findings:
  - id: F-001
    attack_vector: "AV-OBSOLESCENCE"
    severity: critical
    claim_challenged: "If you don't understand the substrate, the agent can't help you verify its own output."
    evidence: "Step 1 explicitly says 'An agent cannot run strace. You can.' and presents /proc, lsof, and syscall tracing as uniquely human diagnostic advantages."
    survives_scrutiny: true
    description: >
      This is the easiest high-signal attack on the post. Modern coding agents can often
      run strace, inspect /proc, read fd tables, and iterate on shell failures
      autonomously when the harness permits it. That makes the post's most concrete
      irreplaceability example already look dated, and HN commenters will likely use it
      as proof that the core thesis is behind the tooling curve.

  - id: F-002
    attack_vector: "AV-OBSOLESCENCE"
    severity: high
    claim_challenged: "Bootcamp I is prerequisite for everything because humans must understand the OS substrate to debug agent output."
    evidence: "The sampled steps focus on deterministic kernel-facing workflows: fork/exec, redirections, pipes, namespaces, cgroups, overlayfs, nsenter, and direct inspection of process state."
    survives_scrutiny: true
    description: >
      The curriculum's deepest investment is in the domain most susceptible to rapid
      automation. Kernel artifacts are structured, inspectable, and testable, which makes
      them unusually amenable to agent loops. Even if substrate knowledge remains useful,
      claiming it as the core non-delegable moat is weak because it is exactly where agent
      autonomy is improving fastest.

  - id: F-003
    attack_vector: "AV-PEDAGOGY"
    severity: medium
    claim_challenged: "Irreplaceability is one of the three main ranking criteria for the curriculum."
    evidence: "Step 1 and Step 9 challenges mostly ask the learner to reproduce mechanisms: build pipes, trap signals, inspect fds, create cgroups, mount overlayfs, and inspect namespaces."
    survives_scrutiny: true
    description: >
      The exercises train procedural systems fluency, not the specific kind of judgment
      the post says is non-delegable. If the real human moat is oracle design, metric
      validity, threat modeling, and knowing when to distrust a clean-looking result, the
      pedagogy should force ambiguous judgment calls rather than mostly deterministic lab
      work.

  - id: F-004
    attack_vector: "AV-COMPLETENESS"
    severity: medium
    claim_challenged: "Irreplaceability is a durable ranking principle across the full stack from shell scripts to evaluation pipelines."
    evidence: "The blog extends the oracle argument upward to tokenization, retrieval, and evaluation methodology, but the supplied step files substantiate the Linux substrate side far more concretely than the higher-level evaluation side."
    survives_scrutiny: true
    description: >
      The broad cross-stack claim is asserted more strongly than it is evidenced in the
      sampled material. The reader is shown in detail why process and container internals
      matter, but not with equal concreteness why those same concepts remain
      non-delegable at the retrieval and evaluation layers. That asymmetry makes the
      universal form of the claim easier to attack.

  - id: F-005
    attack_vector: "AV-OBSOLESCENCE"
    severity: medium
    claim_challenged: "The human is the final verification layer."
    evidence: "The blog's oracle-problem framing explicitly extends beyond low-level debugging to metric validity, retrieval relevance, and whether an evaluation measures what the operator thinks it measures."
    survives_scrutiny: false
    description: >
      The strongest version of the obsolescence criticism goes too far if it claims the
      verification layer will move fully inside the agent. Better agents can self-check
      more of their own execution, but they do not become an independent oracle for goal
      choice, measurement validity, risk acceptance, or whether a clean metric is actually
      meaningful. This part of the bootcamp's claim remains robust, especially in the
      evaluation and governance material rather than the Linux-debugging examples.
```
