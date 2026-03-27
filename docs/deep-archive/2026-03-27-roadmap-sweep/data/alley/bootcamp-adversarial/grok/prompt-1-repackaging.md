# Adversarial Review Dispatch
# Model: grok | Prompt: 1 | Name: repackaging
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

The Repackaging Challenge

You have access to a self-study curriculum called "The Agentic Engineering Bootcamp." Read the blog post at `sites/oceanheart/content/blog/2026-03-10-agentic-bootcamp.md` and then read at least 3 full step files from `sites/oceanheart/content/bootcamp/` (pick 01, one from the middle, and 12).

The author claims this is specifically for engineers who steer AI agents. A skeptical HN commenter would say: "This is just a Linux systems programming tutorial with 'agentic grounding' callout boxes stapled on. Remove the blockquotes that say AGENTIC GROUNDING and you have LPIC-1 study material. The AI framing is marketing."

**Your task:** Evaluate this criticism honestly. Is the agentic framing load-bearing or decorative? Could you remove every agentic reference and still have substantially the same curriculum? Does the ordering, selection, or depth of topics actually change because of the agentic framing, or would a generic "Linux for SWEs" course cover the same ground in the same order? Provide specific evidence from the content.

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

### File: `sites/oceanheart/content/bootcamp/07-git-internals.md`

```
+++
title = "Git Internals - Beyond Porcelain Commands"
date = "2026-03-10"
description = "Git's object model made transparent so every agent git operation can be verified at the object level, not just the porcelain level."
tags = ["git", "internals", "version-control", "plumbing", "bootcamp"]
step = 7
tier = 1
estimate = "4 hours"
bootcamp = 1
+++

Step 7 of 12 in the Agentic Engineering Bootcamp.

---

**Prerequisites:** Step 3 (filesystem as state) - you need the inode/directory/symlink model
**Leads to:** Step 8 (process observation)

---

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
- Commit message conventions (`[H:steer]`, `[H:correct]`) are part of the commit object,
  which changes the SHA. Understanding commit objects means understanding that the message
  is data, not decoration.

The goal: make git's object model transparent so that every agent git operation can be
verified at the object level, not just the porcelain level.

---

## Table of Contents

1. [Git Is a Content-Addressable Filesystem](#1-git-is-a-content-addressable-filesystem) (~30 min)
2. [Blobs](#2-blobs) (~20 min)
3. [Trees](#3-trees) (~30 min)
4. [Commits](#4-commits) (~30 min)
5. [The DAG (Directed Acyclic Graph)](#5-the-dag-directed-acyclic-graph) (~20 min)
6. [Refs and HEAD](#6-refs-and-head) (~30 min)
7. [The Index (Staging Area)](#7-the-index-staging-area) (~30 min)
8. [The Reflog](#8-the-reflog) (~20 min)
9. [Plumbing vs Porcelain](#9-plumbing-vs-porcelain) (~10 min)
10. [Challenges](#challenge-build-a-commit-by-hand) (~60 min)

---

## The Object Model - Overview

Before diving into details, here is the complete picture. Git has four object types
and a few pointer mechanisms. Everything else is built from these primitives.

```
                        ┌──────────────────┐
                        │       ref        │
                        │  (branch/tag)    │
                        │  just a file     │
                        │  containing a    │
                        │  SHA             │
                        └────────┬─────────┘
                                 │ points to
                                 v
                        ┌──────────────────┐
                        │     commit       │     ┌──────────────────┐
                        │                  │────>│  parent commit   │──> ...
                        │  tree: <sha>     │     └──────────────────┘
                        │  parent: <sha>   │
                        │  author: ...     │
                        │  message: ...    │
                        └────────┬─────────┘
                                 │ points to
                                 v
                        ┌──────────────────┐
                        │      tree        │
                        │  (directory)     │
                        │                  │
                        │  100644 blob <sha> file.txt
                        │  040000 tree <sha> lib/
                        │  100755 blob <sha> run.sh
                        └───┬──────────┬───┘
                            │          │
                   points to│          │points to
                            v          v
                  ┌────────────┐  ┌────────────┐
                  │    blob    │  │    tree     │
                  │  (file     │  │  (subdir)   │
                  │  content)  │  │             │
                  │            │  │  100644 blob <sha> mod.ts
                  │  "hello\n" │  │  ...        │
                  └────────────┘  └─────────────┘
```

Every object is identified by the SHA-1 hash of its content. Objects are immutable.
Once created, a SHA identifies that exact content forever. The entire version history
is a graph of these immutable objects connected by SHA references.

---

## 1. Git Is a Content-Addressable Filesystem

**Estimated time: 30 minutes**

A regular filesystem maps names to content: the path `/home/agent/file.txt` locates
a block of data. Git's object store maps content to names: the SHA-1 hash of the
content IS the name.

### The object store

All git objects live in `.git/objects/`. The first 2 characters of the SHA become a
directory name, the remaining 38 become the filename:

```bash
# An object with SHA e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 is stored at:
.git/objects/e6/9de29bb2d1d6434b8b29ae775ad8c2e48c5391
```

Objects are compressed with zlib. You never read them directly - you use plumbing
commands.

### Four object types

| Type | Purpose | Contains |
|------|---------|----------|
| **blob** | File content | Raw bytes (no filename, no permissions) |
| **tree** | Directory listing | Entries of (mode, type, sha, name) |
| **commit** | Snapshot + metadata | Tree SHA, parent SHA(s), author, committer, message |
| **tag** | Named pointer | Object SHA, tag name, tagger, message (annotated tags only) |

### Inspecting objects

Two plumbing commands do most of the work:

```bash
# What type is this object?
git cat-file -t HEAD
# commit

# Pretty-print this object's content
git cat-file -p HEAD
# tree 4b825dc642cb6eb9a060e54bf899d15f5a4f0f0e
# parent a1b2c3d4e5f6...
# author Richard Hallett <...> 1710000000 +0000
# committer Richard Hallett <...> 1710000000 +0000
#
# fix: resolve type error in auth module

# What size is this object (in bytes)?
git cat-file -s HEAD
# 274
```

### The content-addressable property

The SHA is computed from the content. Identical content always produces the same SHA.
Different content always produces a different SHA (within the collision resistance of
SHA-1, which is astronomically unlikely for non-adversarial use).

```bash
# Two files with the same content produce the same blob hash
echo "hello" > file1.txt
echo "hello" > file2.txt
git hash-object file1.txt
# ce013625030ba8dba906f756967f9e9ca394464a
git hash-object file2.txt
# ce013625030ba8dba906f756967f9e9ca394464a

# Same hash. Same blob. Git stores it once.
```

This is the same principle as inode deduplication from Step 3, but at the content level
rather than the filesystem level. Where two hard links share an inode, two identical
files in git share a blob object.

> **HISTORY:** Linus Torvalds wrote git in April 2005 in about two weeks, after the
> Linux kernel's previous VCS (BitKeeper) revoked its free license. The design goals
> were speed, data integrity, and support for distributed workflows. The content-
> addressable store was inspired by Monotone VCS. Torvalds said: "I'm an egotistical
> bastard, and I name all my projects after myself. First Linux, now git." (In British
> English, "git" is slang for a foolish person.)

---

## 2. Blobs

**Estimated time: 20 minutes**

A blob is the simplest object type. It stores a file's content - just the content. No
filename, no permissions, no timestamps. Those belong to the tree object that references
the blob.

### Creating and inspecting blobs

```bash
# Compute the hash of a file's content (without storing it)
echo "hello world" | git hash-object --stdin
# 95d09f2b10159347eece71399a7e2e907ea3df4f

# Compute AND store the blob in the object database
echo "hello world" | git hash-object -w --stdin
# 95d09f2b10159347eece71399a7e2e907ea3df4f

# Verify it is stored
git cat-file -t 95d09f2b
# blob

# Read its content back
git cat-file -p 95d09f2b
# hello world
```

### The hash computation

Git computes the SHA-1 of a header prepended to the content. The header is:
`blob <size>\0` where `<size>` is the content length in bytes and `\0` is a null byte.

```bash
# Manual computation (for understanding, not for use)
printf 'blob 12\0hello world\n' | sha1sum
# 95d09f2b10159347eece71399a7e2e907ea3df4f

# This is exactly what git hash-object computes
echo "hello world" | git hash-object --stdin
# 95d09f2b10159347eece71399a7e2e907ea3df4f
```

### Content deduplication

Because blobs are content-addressed, identical files across the entire repository
history share one blob. If `lib/auth/config.ts` and `lib/bouts/config.ts` have identical
content, git stores one blob. If you commit a file, delete it, and recreate it with the
same content ten commits later, it points to the same blob.

This is not an optimization. It is a structural consequence of content addressing.

> **AGENTIC GROUNDING:** When you review an agent's commit with `git show`, the diff
> shows added and removed lines. But the underlying reality is different: git stored
> new blob objects for every file that changed. Unchanged files still point to the same
> blobs. Understanding this means understanding that `git show` computes the diff on the
> fly by comparing the trees of the commit and its parent. The diff is not stored - it
> is derived.

---

## 3. Trees

**Estimated time: 30 minutes**

A tree object represents a directory. It contains a list of entries, each mapping a name
to a blob (file) or another tree (subdirectory), along with a file mode.

### Inspecting a tree

```bash
# Get the tree SHA from a commit
git cat-file -p HEAD
# tree 8f9234abcdef...

# Inspect the tree
git ls-tree 8f9234ab
# 100644 blob a1b2c3d4... AGENTS.md
# 100644 blob e5f6a7b8... Makefile
# 040000 tree c9d0e1f2... lib
# 040000 tree 3a4b5c6d... docs
# 120000 blob f7e8d9c0... CLAUDE.md

# Recursive listing (all files in all subdirectories)
git ls-tree -r HEAD
```

### File modes

| Mode | Meaning |
|------|---------|
| `100644` | Regular file (not executable) |
| `100755` | Executable file |
| `040000` | Subdirectory (tree object) |
| `120000` | Symbolic link |
| `160000` | Gitlink (submodule) |

These are the only modes git tracks. Git does not store full Unix permissions - it
only distinguishes executable from non-executable for regular files. The rest of the
permission bits come from the filesystem at checkout time, filtered through `core.fileMode`
and the system's umask (recall umask from Step 3).

### Building a tree from the index

The `git write-tree` command creates a tree object from the current index (staging area).
This is the command the project's Makefile uses:

```bash
# Stage some files
git add AGENTS.md Makefile lib/

# Create a tree object from the staged content
git write-tree
# 8f9234abcdef...
```

The tree object captures the exact state of the index at that moment. If you stage
different content and run `git write-tree` again, you get a different SHA.

This is what line 38 of the Makefile does:

```makefile
TREE := $(shell git write-tree 2>/dev/null | cut -c1-8)
```

It creates a tree object from whatever is currently staged, takes the first 8 characters
of the SHA, and uses it as an identity hash. This identity changes whenever the staged
content changes - and it does NOT change when the commit message changes (because the
tree represents content, not metadata).

> **AGENTIC GROUNDING:** `git write-tree` is how the project identifies builds. The tree
> hash represents "what files look like right now" without the commit metadata (message,
> author, timestamp). This solves the SHA paradox: if you tried to use the commit hash as
> an identity and embedded it in a file, the file's content would change, which would
> change the blob hash, which would change the tree hash, which would change the commit
> hash - an infinite loop. The tree hash of staged content breaks this cycle because it
> exists before the commit is created.

> **HISTORY:** The index was originally called the "cache" in early git documentation.
> You will still see references to "cached" in some commands: `git diff --cached` is
> the same as `git diff --staged`. The terminology shifted, but the old names persist
> in the plumbing layer.

---

## 4. Commits

**Estimated time: 30 minutes**

A commit object is the snapshot that ties everything together. It points to a tree (the
project state at that moment), one or more parent commits (the history), and carries
metadata (author, committer, message).

### Anatomy of a commit

```bash
git cat-file -p HEAD
```

Output:

```
tree 8f9234abcdef0123456789abcdef0123456789ab
parent a1b2c3d4e5f60123456789abcdef0123456789ab
author Richard Hallett <richard@oceanheart.ai> 1710000000 +0000
committer Richard Hallett <richard@oceanheart.ai> 1710000500 +0000

fix: resolve type error in auth module [H:correct]
```

The fields:

| Field | Purpose |
|-------|---------|
| `tree` | SHA of the tree object (the complete project snapshot) |
| `parent` | SHA of the parent commit(s). First commit has none. Merge commits have 2+. |
| `author` | Who wrote the change, with timestamp |
| `committer` | Who created the commit object, with timestamp. Usually same as author. |
| (blank line) | Separator between headers and message |
| message | The commit message. Everything after the blank line. |

### The commit is NOT the diff

This is the most important mental model correction for people who think of commits as
"changes." A commit is a complete snapshot - the tree SHA points to a tree that contains
every file in the project at that moment. The diff you see in `git show` or `git log -p`
is computed on the fly by comparing the commit's tree with its parent's tree.

```bash
# This shows the tree (snapshot), not the diff
git cat-file -p HEAD | head -1
# tree 8f9234abcdef...

# The tree contains EVERY file, not just changed ones
git ls-tree -r HEAD | wc -l
# 347  (every file in the project)

# The diff is computed by comparing two trees
git diff HEAD~1 HEAD
# Shows what changed between the two snapshots
```

This distinction matters when you need to verify an agent's commit. `git show` shows
the diff, which is useful for review. But `git ls-tree -r HEAD` shows the complete state,
which is useful for verification. Did the agent's commit result in a valid project state?
The tree answers that question; the diff does not.

### Creating commits with plumbing

```bash
# Porcelain: git commit -m "message"
# Plumbing equivalent:
tree_sha=$(git write-tree)
parent_sha=$(git rev-parse HEAD)
commit_sha=$(echo "fix: something" | git commit-tree "$tree_sha" -p "$parent_sha")
git update-ref refs/heads/main "$commit_sha"
```

This sequence is exactly what `git commit` does internally:
1. Create a tree from the index (`git write-tree`)
2. Get the current HEAD as the parent (`git rev-parse HEAD`)
3. Create a commit object pointing to the tree and parent (`git commit-tree`)
4. Update the current branch ref to point to the new commit (`git update-ref`)

### How commit tags affect the SHA

The project uses commit tags like `[H:steer]` and `[H:correct]` in commit messages.
Because the message is part of the commit object and the SHA is a hash of the entire
object, changing a single character in the message produces a completely different SHA.

```bash
# These two commits would have different SHAs even if they point to
# the same tree and parent:
echo "fix: auth bug" | git commit-tree "$tree" -p "$parent"
# a1b2c3d4...
echo "fix: auth bug [H:correct]" | git commit-tree "$tree" -p "$parent"
# e5f6a7b8...
```

The tree is the same. The parent is the same. Only the message differs. But the commit
SHA is completely different. This is why `git write-tree` is used for identity instead of
the commit SHA - the tree hash is independent of metadata.

> **AGENTIC GROUNDING:** When you use `git cat-file -p HEAD`, you see exactly what tree
> the commit points to. You can then `git ls-tree` that tree to see every file,
> recursively. This is how you verify that an agent's commit contains exactly what it
> should. If an agent claims it only changed `lib/auth/login.ts` but the tree diff shows
> changes in `lib/bouts/scoring.ts`, you have a discrepancy. The plumbing commands give
> you the ground truth; the porcelain gives you the agent's narrative about that truth.

---

## 5. The DAG (Directed Acyclic Graph)

**Estimated time: 20 minutes**

Commits form a graph through their parent pointers. Each commit points backward to its
parent(s). This graph is:

- **Directed** - edges point from child to parent (backward in time)
- **Acyclic** - no commit can be its own ancestor (SHA of content prevents cycles)

### Visualizing the DAG

```bash
# ASCII graph of the commit history
git log --graph --oneline --all --decorate

# Example output:
# * e5f6a7b (HEAD -> main) fix: auth module
# *   c3d4e5f Merge branch 'feature/scoring'
# |\
# | * a1b2c3d feat: add scoring engine
# | * 9f8e7d6 feat: scoring types
# |/
# * 7a6b5c4 chore: update deps
```

### Parent relationships

```
Regular commit (1 parent):

  A <── B <── C
                  (C's parent is B, B's parent is A)

Merge commit (2 parents):

  A <── B <── D (merge)
              ^
  A <── C ────┘
                  (D has two parents: B and C)

Initial commit (0 parents):

  A             (no parent pointer)
```

### Finding common ancestors

```bash
# Find the most recent common ancestor of two branches
git merge-base main feature/scoring
# 7a6b5c4...

# This is the point where the branches diverged
# It determines what a merge or rebase will do
```

### Merge vs rebase at the structural level

**Merge** creates a new commit with two parents:

```
Before:
  main:    A -- B -- C
  feature:      \-- D -- E

After merge:
  main:    A -- B -- C -- F (merge commit)
  feature:      \-- D -- E --/

F has two parents: C and E
```

**Rebase** creates new commits with new SHAs (because their parents changed):

```
Before:
  main:    A -- B -- C
  feature:      \-- D -- E

After rebase:
  main:    A -- B -- C
  feature:              \-- D' -- E'

D' and E' are NEW commits. Same diffs as D and E, but different SHAs
because their parent pointers changed. D' points to C (not B).
The original D and E become unreachable (but survive in the reflog).
```

This is why rebase rewrites history and merge preserves it. The distinction is structural,
not cosmetic.

> **AGENTIC GROUNDING:** When an agent rebases a branch and force-pushes, it creates
> new commit objects and discards old ones. If another agent or process had a reference to
> the old SHAs, those references are now broken. Understanding the DAG means understanding
> why force-pushing is destructive and why the project's standing orders prohibit it on
> main/master without explicit Operator approval.

---

## 6. Refs and HEAD

**Estimated time: 30 minutes**

A ref is simply a file containing a SHA. Branches, tags, and remote tracking branches
are all refs. They are the human-readable names layered on top of the SHA-based object
model.

### Branch refs

```bash
# A branch is a file containing a commit SHA
cat .git/refs/heads/main
# e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4

# This is what git rev-parse does
git rev-parse main
# e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4

# List all refs
git show-ref
```

When you make a new commit on a branch, git updates the ref file to contain the new
commit's SHA. That is all `git commit` does to the branch - it writes a new SHA to a file.

### HEAD

HEAD is how git knows "where you are." It is stored in `.git/HEAD`:

```bash
# Normal state: HEAD is a symbolic ref pointing to a branch
cat .git/HEAD
# ref: refs/heads/main

# This means "I am on the main branch"

# Detached HEAD state: HEAD points directly to a commit SHA
cat .git/HEAD
# e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4

# This means "I am at this specific commit, not on any branch"
```

Detached HEAD is not an error state. It is a specific state that means "the next commit
will not update any branch." It happens when you `git checkout <sha>` or `git checkout
<tag>`. It is how `git bisect` works.

### Tag refs

```bash
# Lightweight tag: just a ref file pointing to a commit
git tag v1.0
cat .git/refs/tags/v1.0
# e5f6a7b8...

# Annotated tag: a ref pointing to a tag OBJECT, which points to a commit
git tag -a v2.0 -m "Release 2.0"
git cat-file -t v2.0
# tag
git cat-file -p v2.0
# object e5f6a7b8...
# type commit
# tag v2.0
# tagger Richard Hallett <...> 1710000000 +0000
#
# Release 2.0
```

### Remote tracking refs

```bash
# Remote branches are refs too
cat .git/refs/remotes/origin/main
# e5f6a7b8...

# They are updated by git fetch, never by local commits
git fetch origin
# Updates .git/refs/remotes/origin/* to match the remote
```

### Moving refs with plumbing

```bash
# Move a branch to point to a different commit
git update-ref refs/heads/main a1b2c3d4

# Delete a ref
git update-ref -d refs/heads/old-branch

# Create a new branch pointing to a specific commit
git update-ref refs/heads/new-branch a1b2c3d4
```

### The key insight

All porcelain commands - `commit`, `merge`, `rebase`, `checkout`, `branch`, `reset` -
just manipulate refs and create objects. There is no magic. `git commit` creates a tree
from the index, creates a commit pointing to that tree, and updates the current branch
ref. `git branch feature` creates a new ref file. `git checkout main` updates HEAD to
point to `refs/heads/main` and updates the working tree.

The Makefile's `git rev-parse HEAD` (line 53) reads the SHA that HEAD currently points
to. It resolves the symbolic ref chain: HEAD -> refs/heads/main -> SHA. The returned
SHA is the commit, not the branch name. This is deterministic and machine-parseable,
which is why plumbing is used instead of porcelain.

> **AGENTIC GROUNDING:** `git rev-parse` is the universal "resolve this name to a SHA"
> command. The POLECAT wrapper uses `PRE_HEAD=$(git rev-parse HEAD)` before execution
> and `POST_HEAD=$(git rev-parse HEAD)` after, then compares. If the SHAs are equal,
> HEAD did not move - no new commit was made. This is delta detection at the ref level.
> Understanding refs means understanding that this comparison is checking whether the
> branch pointer file was updated, not whether any code changed (that is what
> `git diff --stat` checks separately).

---

## 7. The Index (Staging Area)

**Estimated time: 30 minutes**

The index is the most misunderstood part of git. It is a binary file at `.git/index`
that represents the next commit's tree. When you run `git add`, you are updating the
index. When you run `git commit`, git creates a tree from the index.

### Three states of a file

Git tracks three versions of every file:

```
HEAD (last commit)  <-->  Index (staging area)  <-->  Working tree (disk)
```

```bash
# Compare working tree to index
git diff
# Shows unstaged changes (what would NOT be in the next commit)

# Compare index to HEAD
git diff --cached    # or: git diff --staged
# Shows staged changes (what WOULD be in the next commit)

# Compare working tree to HEAD
git diff HEAD
# Shows all changes (staged + unstaged)
```

This three-way model is why `git add` exists as a separate step from `git commit`. The
index lets you selectively stage changes - commit some modifications while keeping others
as work in progress.

### Inspecting the index

```bash
# Show what is in the index
git ls-files --stage
# 100644 a1b2c3d4e5f6... 0    AGENTS.md
# 100644 e7f8a9b0c1d2... 0    Makefile
# 100644 3a4b5c6d7e8f... 0    lib/auth/login.ts
# ...

# The columns are: mode, blob SHA, stage number, path
# Stage 0 = normal. Stages 1-3 appear during merge conflicts.
```

### What `git add` actually does

When you run `git add file.txt`, git:

1. Computes the SHA of the file's content
2. Creates a blob object in `.git/objects/` containing that content
3. Updates the index entry for `file.txt` to point to the new blob SHA

```bash
# Before git add: the file is modified but the index still has the old blob
echo "new content" > file.txt
git diff             # shows the change (working tree vs index)
git diff --cached    # shows nothing (index vs HEAD is unchanged)

# After git add: the index is updated with the new blob
git add file.txt
git diff             # shows nothing (working tree matches index)
git diff --cached    # shows the change (index vs HEAD)
```

### What `git commit` actually does

When you run `git commit -m "message"`, git:

1. Creates a tree object from the index (`git write-tree`)
2. Gets the current HEAD commit SHA (`git rev-parse HEAD`)
3. Creates a commit object pointing to the tree, with HEAD as parent
4. Updates the current branch ref to point to the new commit
5. Clears the index's "dirty" state (index now matches HEAD)

No file copying happens. No diffs are stored. Git creates immutable objects and moves
a pointer.

### The index during merge conflicts

During a merge conflict, the index contains multiple stages for conflicted files:

```bash
# Stage 0: resolved (normal)
# Stage 1: common ancestor
# Stage 2: "ours" (current branch)
# Stage 3: "theirs" (branch being merged)

# During a conflict:
git ls-files --stage
# 100644 aaa... 1    lib/auth/login.ts   (ancestor)
# 100644 bbb... 2    lib/auth/login.ts   (ours)
# 100644 ccc... 3    lib/auth/login.ts   (theirs)

# After resolving and git add:
git ls-files --stage
# 100644 ddd... 0    lib/auth/login.ts   (resolved)
```

Understanding stages explains why `git add` marks a conflict as resolved - it replaces
the three conflict entries (stages 1, 2, 3) with a single resolved entry (stage 0).

> **AGENTIC GROUNDING:** The index is "the next commit you are building." When an agent
> runs `git add .` followed by `git commit`, it is staging ALL changes into the index
> and then creating a commit from that index. If the agent should only commit some files,
> it needs selective `git add`. When reviewing agent commits, `git ls-files --stage` on
> the index shows exactly what the agent staged. This is more precise than `git status`,
> which is a porcelain interpretation of the index state.

---

## 8. The Reflog

**Estimated time: 20 minutes**

The reflog is git's safety net. Every time a ref changes - commit, reset, checkout,
merge, rebase - git records the old and new SHA in a log file.

### Viewing the reflog

```bash
git reflog
# e5f6a7b HEAD@{0}: commit: fix: auth module
# c3d4e5f HEAD@{1}: merge feature/scoring: Merge
# 7a6b5c4 HEAD@{2}: checkout: moving from feature to main
# a1b2c3d HEAD@{3}: commit: feat: scoring engine
# ...

# Reflog for a specific branch
git reflog main
```

### Where reflog data lives

```bash
# HEAD's reflog
cat .git/logs/HEAD

# Branch reflogs
cat .git/logs/refs/heads/main
```

Each line records: old SHA, new SHA, who, when, and what operation.

### Recovery with the reflog

The reflog is the recovery tool for accidental resets, deleted branches, and botched
rebases:

```bash
# Scenario: you accidentally ran git reset --hard HEAD~3
# Three commits are now unreachable from any branch

# The reflog still has them
git reflog
# <sha> HEAD@{0}: reset: moving to HEAD~3
# <sha> HEAD@{1}: commit: the commit you want back
# <sha> HEAD@{2}: commit: another lost commit
# ...

# Recover by creating a branch at the old position
git branch recovery e5f6a7b

# Or reset back to where you were
git reset --hard e5f6a7b
```

### Reflog expiration

Reflog entries are not permanent:

- Reachable entries (pointed to by some branch): expire after 90 days
- Unreachable entries (orphaned by reset/rebase): expire after 30 days

After expiration, `git gc` can collect the unreachable objects. Until then, they survive
in the object store even if no branch points to them.

```bash
# Force immediate reflog expiration (dangerous - removes safety net)
git reflog expire --expire=now --all
git gc --prune=now
# Now orphaned objects are truly gone
```

> **AGENTIC GROUNDING:** When an agent's git operation produces unexpected results -
> a lost commit, a detached HEAD, a botched rebase - the reflog is the diagnostic tool.
> `git reflog` shows exactly what happened, in order, with timestamps. Before resorting
> to destructive recovery, always check the reflog. The 30/90-day expiration window
> means you have time.

---

## 9. Plumbing vs Porcelain

**Estimated time: 10 minutes**

Git's commands are divided into two categories by design:

**Porcelain** - user-facing commands with human-friendly output:

```bash
git status       # formatted status with colors and hints
git log          # formatted history
git add          # stage files
git commit       # create a commit
git push         # upload to remote
git merge        # merge branches
git checkout     # switch branches or restore files
```

**Plumbing** - machine-parseable commands for programmatic use:

```bash
git hash-object  # compute SHA and optionally store
git cat-file     # inspect object type, content, or size
git ls-tree      # list tree contents
git write-tree   # create tree from index
git commit-tree  # create commit from tree
git update-ref   # update a ref
git rev-parse    # resolve names to SHAs
git ls-files     # show index contents
git diff-tree    # compare two trees
git for-each-ref # iterate over refs
```

### Why the project uses plumbing

The Makefile uses plumbing commands because it needs:

1. **Deterministic output** - `git write-tree` always outputs exactly one SHA. `git
   status` outputs variable-length human text.
2. **Machine parseability** - `git rev-parse HEAD` outputs a SHA that can be stored in
   a variable. `git log` outputs formatted text that must be parsed.
3. **Precise semantics** - `git write-tree` creates a tree from the index. There is no
   porcelain command that does exactly this without also creating a commit.

```makefile
# Plumbing in the Makefile:
TREE := $(shell git write-tree 2>/dev/null | cut -c1-8)
SHA := $(shell git rev-parse --short HEAD)

# Delta detection in the POLECAT wrapper:
PRE_HEAD=$$(git rev-parse HEAD)
PRE_DIFF=$$(git diff --stat)
# ... run polecat ...
POST_HEAD=$$(git rev-parse HEAD)
POST_DIFF=$$(git diff --stat)
```

Porcelain is for humans at the terminal. Plumbing is for scripts, Makefiles, and agents
that need to operate on git state programmatically.

> **AGENTIC GROUNDING:** Agents typically use porcelain commands because those are what
> appears in tutorials and documentation. But when an agent's porcelain operation fails
> or produces unexpected results, plumbing commands are the diagnostic layer. `git status`
> says "nothing to commit" but something feels wrong? `git ls-files --stage` shows exactly
> what is in the index. `git cat-file -p HEAD` shows exactly what tree the last commit
> points to. Plumbing does not interpret - it reports.

---

## Challenge: Build a Commit by Hand

**Estimated time: 20 minutes**

**Goal:** Create a complete git commit using only plumbing commands. No `git add`, no
`git commit`.

Set up a scratch repository:

```bash
mkdir /tmp/git-plumbing-lab && cd /tmp/git-plumbing-lab
git init
```

Steps:

1. Create a blob from a string:

```bash
blob_sha=$(echo "hello from plumbing" | git hash-object -w --stdin)
printf "blob SHA: %s\n" "$blob_sha"
git cat-file -t "$blob_sha"
# blob
git cat-file -p "$blob_sha"
# hello from plumbing
```

2. Create a tree containing that blob:

```bash
# mktree reads entries from stdin in ls-tree format
tree_sha=$(printf "100644 blob %s\tgreeting.txt\n" "$blob_sha" | git mktree)
printf "tree SHA: %s\n" "$tree_sha"
git ls-tree "$tree_sha"
# 100644 blob <sha>    greeting.txt
```

3. Create a commit pointing to that tree:

```bash
commit_sha=$(echo "feat: first commit via plumbing" | git commit-tree "$tree_sha")
printf "commit SHA: %s\n" "$commit_sha"
git cat-file -p "$commit_sha"
# tree <sha>
# author ...
#
# feat: first commit via plumbing
```

4. Point a branch at the commit:

```bash
git update-ref refs/heads/main "$commit_sha"
# If HEAD is symbolic ref to main, it now resolves to this commit
```

5. Verify with porcelain:

```bash
git log --oneline
# <sha> feat: first commit via plumbing
git show
# Shows the commit with the greeting.txt file
```

**Verification:** You should see a valid commit with a single file `greeting.txt`
containing "hello from plumbing". You created this without ever touching `git add` or
`git commit`.

**Extension:** Add a second file to the tree. Create a second commit with the first as
its parent (`git commit-tree "$tree2" -p "$commit_sha"`). Verify the log shows two
commits.

---

## Challenge: Object Archaeology

**Estimated time: 15 minutes**

**Goal:** Trace through the object graph of a real commit in this repository.

1. Pick a commit from the project's history:

```bash
# Get a commit SHA from the log
commit=$(git log --oneline -10 | tail -1 | cut -d' ' -f1)
printf "Starting from commit: %s\n" "$commit"
```

2. Inspect the commit object:

```bash
git cat-file -p "$commit"
# Note the tree SHA
```

3. Inspect the tree:

```bash
tree=$(git cat-file -p "$commit" | head -1 | cut -d' ' -f2)
git ls-tree "$tree"
# Note a subdirectory (type tree) and a regular file (type blob)
```

4. Follow a subtree:

```bash
# Pick a tree entry (e.g., lib/)
subtree=$(git ls-tree "$tree" | grep "^040000" | head -1 | awk '{print $3}')
git ls-tree "$subtree"
```

5. Read a blob:

```bash
# Pick a blob entry from the subtree
blob=$(git ls-tree "$subtree" | grep "^100644" | head -1 | awk '{print $3}')
git cat-file -p "$blob" | head -20
```

**Draw the object graph on paper:** commit -> tree -> subtree -> blob. At each level,
note the SHA and what the object contains. This is the physical structure beneath every
`git log` and `git show` you have ever run.

---

## Challenge: The Index Dissected

**Estimated time: 15 minutes**

**Goal:** Observe the index at each stage of a multi-file staging operation.

Set up:

```bash
mkdir /tmp/index-lab && cd /tmp/index-lab
git init
```

1. Create three files:

```bash
echo "alpha content" > alpha.txt
echo "beta content" > beta.txt
echo "gamma content" > gamma.txt
```

2. Stage them one at a time and observe:

```bash
# Nothing staged yet
git ls-files --stage
# (empty)

git add alpha.txt
git ls-files --stage
# 100644 <sha1> 0    alpha.txt

git add gamma.txt
git ls-files --stage
# 100644 <sha1> 0    alpha.txt
# 100644 <sha3> 0    gamma.txt

git add beta.txt
git ls-files --stage
# 100644 <sha1> 0    alpha.txt
# 100644 <sha2> 0    beta.txt
# 100644 <sha3> 0    gamma.txt
```

Note: the index is always sorted alphabetically, regardless of staging order.

3. Modify a file without staging and show the three-way state:

```bash
echo "modified alpha" > alpha.txt

git diff               # working tree vs index (shows alpha change)
git diff --cached      # index vs HEAD (shows all three files as new)
git diff HEAD          # working tree vs HEAD (shows all three, alpha with new content)
```

4. Stage the modification:

```bash
git add alpha.txt
git ls-files --stage
# 100644 <sha-new> 0    alpha.txt    <- SHA changed!
# 100644 <sha2>    0    beta.txt
# 100644 <sha3>    0    gamma.txt
```

**Verification:** The blob SHA for alpha.txt changed when you staged the new content. The
blob SHAs for beta.txt and gamma.txt did not. This is content addressing in action.

---

## Challenge: Reflog Rescue

**Estimated time: 15 minutes**

**Goal:** Lose commits deliberately, then recover them using the reflog.

Set up:

```bash
mkdir /tmp/reflog-lab && cd /tmp/reflog-lab
git init
echo "base" > file.txt && git add . && git commit -m "initial"
```

1. Create three commits:

```bash
echo "commit 1" >> file.txt && git add . && git commit -m "first"
echo "commit 2" >> file.txt && git add . && git commit -m "second"
echo "commit 3" >> file.txt && git add . && git commit -m "third"
git log --oneline
# Shows 4 commits
```

2. Lose the commits:

```bash
git reset --hard HEAD~3
git log --oneline
# Shows only "initial"
cat file.txt
# base
```

The three commits are gone from the branch. But they still exist as objects.

3. Find them in the reflog:

```bash
git reflog
# <sha> HEAD@{0}: reset: moving to HEAD~3
# <sha> HEAD@{1}: commit: third
# <sha> HEAD@{2}: commit: second
# <sha> HEAD@{3}: commit: first
# <sha> HEAD@{4}: commit (initial): initial
```

4. Recover:

```bash
# Option A: create a branch at the lost commit
git branch recovered HEAD@{1}
git log --oneline recovered
# Shows all 4 commits

# Option B: reset back to where you were
git reset --hard HEAD@{1}
git log --oneline
# Shows all 4 commits
```

5. Observe orphan behavior:

```bash
# Create an orphan branch (no parent, fresh history)
git checkout --orphan clean-slate
git rm -rf .
echo "fresh start" > file.txt && git add . && git commit -m "orphan start"
git log --oneline --all
# Shows commits on both branches - the DAG has two disconnected components
```

**Verification:** The reflog recorded every ref change. The "lost" commits survived in
the object store because reflog entries kept them reachable. Without the reflog, `git gc`
would eventually collect them.

---

## Challenge: Reproduce the Makefile Identity

**Estimated time: 10 minutes**

**Goal:** Manually compute what the Makefile's `TREE` and `SHA` variables produce.

In the project repository:

```bash
# What the Makefile computes:
# TREE := $(shell git write-tree 2>/dev/null | cut -c1-8)
# SHA := $(shell git rev-parse --short HEAD)

# Step 1: Reproduce TREE
tree_full=$(git write-tree 2>/dev/null)
tree_short=$(printf "%.8s" "$tree_full")
printf "TREE_FULL: %s\n" "$tree_full"
printf "TREE (first 8): %s\n" "$tree_short"

# Step 2: Reproduce SHA
sha=$(git rev-parse --short HEAD)
printf "SHA: %s\n" "$sha"

# Step 3: Understand the difference
# Modify a file and stage it
echo "# test" >> AGENTS.md
git add AGENTS.md

# TREE changes (staged content changed)
tree_after=$(git write-tree 2>/dev/null | cut -c1-8)
printf "TREE after staging: %s\n" "$tree_after"

# SHA does NOT change (no new commit yet)
sha_after=$(git rev-parse --short HEAD)
printf "SHA after staging: %s\n" "$sha_after"

# Clean up
git checkout -- AGENTS.md
```

**Key insight:** The tree hash changes with staged content (before commit). The commit
SHA only changes after a commit is created. The Makefile uses the tree hash because it
represents "what is about to be committed" - the current build identity.

---

## Challenge: Write a git-verify Script

**Estimated time: 20 minutes**

**Goal:** Build a verification tool that audits the difference between two commits using
only plumbing commands.

```bash
#!/bin/bash
# git-verify: compare two commits at the object level
# Usage: ./git-verify.sh <old-commit> <new-commit>

old="${1:?Usage: $0 <old-commit> <new-commit>}"
new="${2:?Usage: $0 <old-commit> <new-commit>}"

# Resolve to full SHAs
old_sha=$(git rev-parse --verify "$old" 2>/dev/null) || {
  printf "Error: '%s' is not a valid commit\n" "$old" >&2; exit 1
}
new_sha=$(git rev-parse --verify "$new" 2>/dev/null) || {
  printf "Error: '%s' is not a valid commit\n" "$new" >&2; exit 1
}

# Get tree SHAs
old_tree=$(git cat-file -p "$old_sha" | sed -n 's/^tree //p')
new_tree=$(git cat-file -p "$new_sha" | sed -n 's/^tree //p')

printf "=== Commit Comparison ===\n\n"
printf "Old: %s\n" "$old_sha"
printf "New: %s\n" "$new_sha"
printf "Old tree: %s\n" "$old_tree"
printf "New tree: %s\n" "$new_tree"
printf "\n"

# Files changed (using diff-tree, a plumbing command)
printf "=== Changed Files ===\n"
git diff-tree -r --no-commit-id --name-status "$old_sha" "$new_sha"
printf "\n"

# Blob-level changes (what actually changed in the object store)
printf "=== Blob Changes ===\n"
git diff-tree -r --no-commit-id "$old_sha" "$new_sha" | while read old_mode new_mode old_blob new_blob status path; do
  printf "%s %s\n" "$status" "$path"
  printf "  old blob: %s  new blob: %s\n" "$old_blob" "$new_blob"
  if [ "$status" = "M" ]; then
    # Show size change
    old_size=$(git cat-file -s "$old_blob" 2>/dev/null || printf "0")
    new_size=$(git cat-file -s "$new_blob" 2>/dev/null || printf "0")
    printf "  size: %s -> %s bytes\n" "$old_size" "$new_size"
  fi
done
printf "\n"

# Commit metadata
printf "=== Commit Metadata ===\n"
printf "Author: %s\n" "$(git cat-file -p "$new_sha" | sed -n 's/^author //p')"
printf "Message: %s\n" "$(git cat-file -p "$new_sha" | sed -n '/^$/,$ p' | tail -n +2)"
```

Make it executable and test it:

```bash
chmod +x git-verify.sh

# Compare the two most recent commits
./git-verify.sh HEAD~1 HEAD

# Compare across a range
./git-verify.sh HEAD~5 HEAD
```

**Extension ideas:**

- Add a `--tree-only` flag that shows the full recursive tree diff
- Add detection of unexpected file changes (files outside an expected directory)
- Add blob content comparison for specific files (useful for verifying agent changes to
  config files)
- Output YAML for machine consumption

This is the kind of verification tool that sits between the Operator and agent commits.
Instead of trusting `git show` (porcelain that summarizes), you verify at the object level
(plumbing that reports).

---

## Summary

| Concept | What it is | Why it matters |
|---------|-----------|---------------|
| Content addressing | SHA-1 hash of content = object name | Deduplication, integrity, immutability |
| Blob | File content (no name, no permissions) | The atomic unit of storage |
| Tree | Directory listing of (mode, type, sha, name) | Captures project structure |
| Commit | Tree + parent(s) + metadata + message | The snapshot, not the diff |
| DAG | Directed acyclic graph of commits | Structure beneath merge, rebase, cherry-pick |
| Refs | Files containing SHAs | Human names for machine addresses |
| HEAD | Symbolic ref to current branch | "Where am I?" |
| Index | Binary file = the next commit's tree | The staging area between working tree and commit |
| Reflog | Log of every ref change | Safety net for recovery |
| Plumbing | Machine-parseable commands | Diagnostic and programmatic access |
| Porcelain | Human-friendly commands | Daily use, not verification |

The core principle: **git is a content-addressable filesystem with a version history.**
Everything else - branches, merges, rebases, remotes - is a layer of convenience on top
of four object types and a handful of pointer files. When the convenience layer produces
confusing results, drop to the object level.

> **HISTORY:** SHA-1 was chosen for content addressing, not cryptographic security. When
> SHA-1 collision attacks became practical in 2017 (Google's SHAttered project produced
> two different PDFs with the same SHA-1), git added hardened SHA-1 detection and began
> transitioning to SHA-256. The transition is ongoing - git can now operate in SHA-256
> mode (`git init --object-format=sha256`), but interoperability with SHA-1 repositories
> remains the default.

---

## What to Read Next

**[Step 8: Process Observation](/bootcamp/08-process-observation/)** - now that you can verify
git state at the object level, learn how to observe processes at the system call level.
`strace` shows you every system call a process makes - every `open()`, `read()`,
`write()`, `stat()`. When `git commit` behaves unexpectedly, you can `strace git commit`
to see exactly what files it opens, what it writes to `.git/objects/`, and what refs it
updates. Process observation is the next verification layer down from object inspection.

The dependency chain: the filesystem (Step 3) stores git objects. Git's object model
(this step) organizes those objects into a version history. Process observation (Step 8)
lets you watch the system calls that create and manipulate those objects in real time.

---

## References

- Chacon, S. & Straub, B. *Pro Git* (2nd ed., 2014) - Chapter 10 (Git Internals) covers
  the object model, packfiles, and transfer protocols. Free at https://git-scm.com/book
- Torvalds, L. "Git - A Stupid Content Tracker" - the original README from April 2005.
  Still available in git's own git repository.
- `man gitrepository-layout` - documents the `.git/` directory structure.
- `man git-cat-file`, `man git-ls-tree`, `man git-write-tree`, `man git-commit-tree`,
  `man git-update-ref`, `man git-rev-parse` - individual plumbing command references.
- `man gitglossary` - definitions of git terminology (blob, tree, commit, ref, index, DAG).
- The SHAttered attack: https://shattered.io - why git is transitioning from SHA-1 to
  SHA-256.

```

### File: `sites/oceanheart/content/bootcamp/12-advanced-bash.md`

```
+++
title = "Advanced Bash - trap, coprocesses, associative arrays, BASH_REMATCH, and production patterns"
date = "2026-03-10"
description = "Signal traps, indexed and associative arrays, regex matching, coprocesses, process substitution, production-grade shell scripting patterns, and shellcheck."
tags = ["bash", "advanced", "shellcheck", "patterns", "bootcamp"]
step = 12
tier = 1
estimate = "3 hours"
bootcamp = 1
+++

Step 12 of 12 in the Agentic Engineering Bootcamp.

---

**Prerequisites:** Step 2 (shell language - word splitting, quoting, functions, error handling), Step 1 (process model, signals, file descriptors)
**You will need:** A Linux terminal (Arch, Debian, or Ubuntu), bash 5.x, shellcheck installed (`pacman -S shellcheck` / `apt install shellcheck`)

---

## Why This is Step 12

You have the full stack. Process model, shell language, filesystem, text pipelines, Python
CLI tools, Make, git internals, process observation, containers, networking, process
supervision. You can read, compose, and verify agent output across every layer of the
Linux execution environment.

This final step fills in the gaps. Bash has features beyond POSIX sh that Step 2
introduced but did not exhaust: signal traps, indexed and associative arrays, regex
matching, coprocesses, process substitution patterns, select menus, printf formatting,
and the collection of shopts and settings that constitute production-grade shell scripting.
These are the features that separate a script that works from a script that works reliably
- that handles signals, cleans up after itself, parses structured data without spawning
subprocesses, and fails loudly when something goes wrong.

None of this is portable to dash, ash, or POSIX sh. Every feature in this step requires
`#!/usr/bin/env bash` in the shebang line. Step 2 drew the line between POSIX and bash.
This step lives entirely on the bash side.

The capstone exercise - reviewing agent-generated scripts - ties together everything from
all twelve steps. By the end, you should be able to read any agent-generated shell script
and identify every class of bug: quoting errors (Step 2), pipeline subshell traps (Step 2),
missing cleanup traps (this step), unsafe glob handling (this step), missing error
handling (Step 2 + this step), process lifecycle issues (Step 1), filesystem assumptions
(Step 3), and incorrect text processing (Step 4).

---

## Table of Contents

1. [trap - Signal and Event Handling](#1-trap---signal-and-event-handling) (~25 min)
2. [Arrays (Indexed)](#2-arrays-indexed) (~20 min)
3. [Associative Arrays](#3-associative-arrays-bash-4) (~15 min)
4. [BASH_REMATCH and Regex Matching](#4-bash_rematch-and-regex-matching) (~15 min)
5. [Process Substitution and Named Pipes](#5-process-substitution-and-named-pipes) (~15 min)
6. [Coprocesses](#6-coprocesses-bash-4) (~10 min)
7. [select for Menus](#7-select-for-menus) (~5 min)
8. [printf Mastery](#8-printf-mastery) (~15 min)
9. [Bash Strict Mode and Production Patterns](#9-bash-strict-mode-and-production-patterns) (~20 min)
10. [Debugging Techniques](#10-debugging-techniques) (~15 min)
11. [The Complete Production Template](#11-the-complete-production-template) (~10 min)
12. [Challenges](#12-challenges) (~60-75 min)
13. [Bootcamp Complete](#bootcamp-complete)

---

## 1. trap - Signal and Event Handling

*Estimated time: 25 minutes*

Step 2 introduced `trap` as the shell's cleanup mechanism. This section goes deeper:
the full signal model, trap interactions with subshells and pipelines, execution order,
and the patterns that make production scripts resilient.

### The EXIT Trap - The Single Most Important Trap

```bash
cleanup() {
  rm -f "$tmpfile"
  kill "$bg_pid" 2>/dev/null
  wait "$bg_pid" 2>/dev/null
}
trap cleanup EXIT
```

`trap ... EXIT` runs the specified command on ANY exit from the shell: normal exit, `exit N`
called explicitly, `set -e` triggered exit, SIGINT (Ctrl-C), SIGTERM (kill). It is the
shell equivalent of a `finally` block in Python, a `defer` in Go, or a destructor in C++.

This is the trap you will use 95% of the time. If your script creates temporary files,
starts background processes, acquires locks, or modifies shared state, the EXIT trap is
how you guarantee cleanup. Without it, a script killed by a signal leaves garbage behind.

```bash
#!/usr/bin/env bash
set -euo pipefail

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

# Work freely in $tmpdir
# No matter how the script exits, the directory is removed
cp important_data.txt "$tmpdir/"
process_stuff "$tmpdir/"
# If process_stuff fails (set -e triggers), cleanup still runs
```

### Signal-Specific Traps

```bash
# Run cleanup on specific signals
trap 'cleanup_function' SIGTERM SIGINT

# Ignore SIGINT (Ctrl-C) - the script cannot be interrupted
trap '' SIGINT

# Reset a signal handler to default behaviour
trap - SIGTERM
```

Ignoring signals is occasionally useful - for example, in a critical section where
partial execution would leave corrupted state. But ignoring SIGINT in a long-running
script is hostile to the user. Use it sparingly and always restore the default handler
when the critical section ends.

```bash
# Critical section pattern
trap '' SIGINT SIGTERM   # ignore signals during critical write
write_atomic_file "$output"
trap - SIGINT SIGTERM    # restore defaults
```

### The ERR Trap (Bash Extension)

```bash
trap 'printf "Error on line %d\n" "$LINENO" >&2; exit 1' ERR
```

The ERR trap fires when a command returns a non-zero exit code, subject to the same
exemptions as `set -e`: it does NOT fire in conditionals, after `&&` or `||`, or in
subshells (unless `errtrace` is set). It is useful for debugging but unreliable as a
sole error-handling mechanism.

Key distinction: put your cleanup logic in the EXIT trap, not the ERR trap. ERR fires
on errors. EXIT fires on everything, including errors. If you put cleanup in ERR, normal
exits skip cleanup. If you put cleanup in EXIT, all exits trigger cleanup.

### Trap Execution Order

When a command fails and both ERR and EXIT traps are set:

1. The ERR trap fires first
2. If the ERR trap calls `exit`, the EXIT trap fires next
3. If the ERR trap does not call `exit` and `set -e` is active, the shell exits and the EXIT trap fires

```bash
#!/usr/bin/env bash
set -euo pipefail

trap 'printf "ERR trap fired on line %d\n" "$LINENO" >&2' ERR
trap 'printf "EXIT trap fired with code %d\n" "$?" >&2' EXIT

false  # triggers ERR, then EXIT
```

Output:
```
ERR trap fired on line 6
EXIT trap fired with code 1
```

Design principle: ERR for diagnostics, EXIT for cleanup.

### Traps in Subshells

Traps are reset in subshells. This catches people.

```bash
#!/usr/bin/env bash
trap 'printf "EXIT from parent\n"' EXIT

# Subshell - trap is NOT inherited
(
  printf "In subshell\n"
  # The EXIT trap from the parent is not active here
  exit 1
)

printf "Parent continues\n"
```

Output:
```
In subshell
Parent continues
EXIT from parent
```

The subshell exits without running the parent's EXIT trap. If the subshell needs cleanup,
it must set its own trap.

This behaviour is by design: subshells are independent processes (or behave as if they
are). Their signal handlers are their own. This matches the process model from Step 1 -
`fork()` creates an independent process, and signal handlers in the child are reset.

### Traps and Pipelines

A command in a pipeline that receives SIGPIPE may not trigger the ERR trap. This is a
subtlety that matters when combining `set -o pipefail` with traps:

```bash
#!/usr/bin/env bash
set -euo pipefail
trap 'printf "ERR\n" >&2' ERR

# head closes its stdin after reading 1 line.
# The generating command receives SIGPIPE and dies.
# Whether ERR fires depends on which command's failure pipefail reports.
seq 1 1000000 | head -1
```

The practical advice: do not rely on ERR traps in pipeline contexts. Use EXIT for
cleanup, and check `${PIPESTATUS[@]}` explicitly if you need per-command exit codes
from a pipeline.

### The DEBUG Trap

```bash
# Fires before every simple command
trap 'printf "+ %s:%d: " "${BASH_SOURCE[0]}" "$LINENO"' DEBUG
```

This is for debugging, not production. Combined with `read`, it can step through a script
interactively:

```bash
trap 'read -p "[$LINENO] Press enter..."' DEBUG
```

> **AGENTIC GROUNDING:** The trap EXIT pattern is how production scripts clean up temp
> files, kill background processes, and restore state. Every agent-generated bash script
> that creates temp files should have this. When reviewing agent scripts, check for
> cleanup traps. The most common failure: an agent creates a temp file with `mktemp`
> but never cleans it up. Over time, `/tmp` fills with orphaned agent artifacts. The
> EXIT trap is the fix.

> **HISTORY:** `trap` comes from the Bourne shell (1979). The concept of handling signals
> in a shell language was novel - most languages at the time handled signals in C with
> `signal()` or `sigaction()`. The ERR and DEBUG traps are bash extensions with no POSIX
> equivalent. The EXIT trap (originally `trap ... 0` in Bourne shell, where 0 meant
> "on exit") is POSIX, making it the one trap pattern you can use everywhere.

---

## 2. Arrays (Indexed)

*Estimated time: 20 minutes*

Step 2 touched arrays briefly. This section covers them completely. Arrays are a bash
extension - POSIX sh has no arrays. The closest POSIX equivalent is the positional
parameter list (`$@`), which is a single array that you manipulate with `set --`.

### Declaration and Access

```bash
# Declare with parentheses
arr=(one two three)

# Access by index (0-based)
printf '%s\n' "${arr[0]}"    # one
printf '%s\n' "${arr[1]}"    # two

# All elements as separate words (ALWAYS quote this)
printf '%s\n' "${arr[@]}"
# one
# two
# three

# Length
printf '%d\n' "${#arr[@]}"   # 3

# Append
arr+=(four)
printf '%d\n' "${#arr[@]}"   # 4

# Assign to specific index (sparse arrays are allowed)
arr[10]=eleven
printf '%d\n' "${#arr[@]}"   # 5 (not 11 - bash arrays are sparse)
```

### Iteration

```bash
# The correct way - always quote "${arr[@]}"
for item in "${arr[@]}"; do
  printf 'Item: %s\n' "$item"
done

# With index
for i in "${!arr[@]}"; do
  printf '[%d] = %s\n' "$i" "${arr[$i]}"
done
```

### Array Slicing

```bash
arr=(a b c d e f)

# Elements 1 through 2 (offset:length)
printf '%s\n' "${arr[@]:1:2}"
# b
# c

# From element 3 to end
printf '%s\n' "${arr[@]:3}"
# d
# e
# f
```

### Why Arrays Matter: Filename Safety

The critical use case for arrays is safely handling lists of filenames, including those
with spaces, quotes, glob characters, and other adversarial content.

```bash
# WRONG - breaks on filenames with spaces
files=$(ls *.txt)
for f in $files; do
  printf '%s\n' "$f"
done

# CORRECT - glob expansion produces correctly delimited entries
files=(*.txt)
for f in "${files[@]}"; do
  printf '%s\n' "$f"
done
```

This connects directly to the quoting gauntlet from Step 2. The glob `*.txt` produces
an array where each element is a correctly delimited filename, regardless of what
characters the filename contains. Command substitution `$(ls *.txt)` produces a string
that is then word-split, breaking filenames with spaces.

### The Critical Difference: `"${arr[@]}"` vs `"${arr[*]}"`

This parallels `"$@"` vs `"$*"` in functions (Step 2):

```bash
arr=("first item" "second item" "third item")

# "${arr[@]}" - each element is a separate word
printf '[%s]\n' "${arr[@]}"
# [first item]
# [second item]
# [third item]

# "${arr[*]}" - all elements joined by first char of IFS into one word
printf '[%s]\n' "${arr[*]}"
# [first item second item third item]

# With custom IFS
IFS=,
printf '[%s]\n' "${arr[*]}"
# [first item,second item,third item]
```

Rule: `"${arr[@]}"` is almost always what you want. `"${arr[*]}"` is for joining
elements into a single string.

### Passing Arrays to External Commands

```bash
# Using printf + xargs for null-delimited safety
files=("file with spaces.txt" "another file.txt" "normal.txt")
printf '%s\0' "${files[@]}" | xargs -0 ls -la

# Passing as arguments (works if the array is not too large)
cp "${files[@]}" /backup/
```

> **AGENTIC GROUNDING:** Agents rarely use bash arrays. They default to space-separated
> strings and `for f in $(command)` patterns that break on adversarial filenames. When
> reviewing agent-generated scripts that process file lists, check: is the list stored in
> an array? Are array expansions quoted? Is `"${arr[@]}"` used instead of `${arr[@]}`
> (unquoted)? If the agent uses `$(ls ...)` or `$(find ...)` to build a file list, it
> is almost certainly broken for filenames with spaces.

> **HISTORY:** Bash arrays were added in bash 2.0 (1996), inspired by ksh (Korn shell)
> which had arrays earlier. The syntax differs: ksh uses `set -A arr val1 val2`, bash
> uses `arr=(val1 val2)`. The bash syntax won out in mindshare. POSIX never standardised
> arrays because the committee could not agree on syntax, so arrays remain a non-portable
> bash feature to this day.

---

## 3. Associative Arrays (Bash 4+)

*Estimated time: 15 minutes*

Associative arrays (hash maps, dictionaries) were added in bash 4.0 (2009). They map
string keys to string values. Unlike indexed arrays, they must be declared with
`declare -A`.

### Declaration and Access

```bash
# Must declare with -A
declare -A config

# Assign values
config[host]="localhost"
config[port]="5432"
config[database]="myapp"

# Access
printf '%s\n' "${config[host]}"    # localhost
printf '%s\n' "${config[port]}"    # 5432

# All keys
printf '%s\n' "${!config[@]}"
# host
# port
# database
# (order is NOT guaranteed)

# All values
printf '%s\n' "${config[@]}"

# Length (number of keys)
printf '%d\n' "${#config[@]}"    # 3

# Check if key exists
if [[ -v config[host] ]]; then
  printf 'host is set\n'
fi

# Delete a key
unset 'config[port]'
```

### Declare and Populate in One Step

```bash
declare -A colors=(
  [red]="#ff0000"
  [green]="#00ff00"
  [blue]="#0000ff"
)
```

### Iteration

```bash
declare -A status=(
  [web]="running"
  [db]="stopped"
  [cache]="running"
)

for key in "${!status[@]}"; do
  printf '%-10s %s\n' "$key" "${status[$key]}"
done
```

### Use Cases

**Counting occurrences:**

```bash
declare -A word_count

while IFS= read -r line; do
  for word in $line; do    # deliberate word splitting here
    (( word_count[$word]++ )) || true
  done
done < input.txt

for word in "${!word_count[@]}"; do
  printf '%4d %s\n' "${word_count[$word]}" "$word"
done | sort -rn
```

**Lookup tables:**

```bash
declare -A exit_codes=(
  [0]="success"
  [1]="general error"
  [2]="misuse of shell builtin"
  [126]="command not executable"
  [127]="command not found"
  [128]="invalid exit argument"
  [130]="terminated by Ctrl-C"
  [137]="killed by SIGKILL"
  [143]="terminated by SIGTERM"
)

code=$?
printf 'Exit %d: %s\n' "$code" "${exit_codes[$code]:-unknown}"
```

**Configuration maps:**

```bash
declare -A env_config

# Load from a simple key=value file
while IFS='=' read -r key value; do
  [[ "$key" =~ ^[[:space:]]*# ]] && continue   # skip comments
  [[ -z "$key" ]] && continue                    # skip empty lines
  env_config["$key"]="$value"
done < config.env
```

### Limitations

Bash associative arrays are flat. No nested structures. No arrays-of-arrays. No
maps-of-maps. Values are always strings. If your data structure needs nesting, you have
hit the bash ceiling - use Python (Step 5) or jq (Step 4) instead.

This is not a limitation to fight. It is a signal to switch tools. Bash excels at
orchestrating processes and handling text. It is not a general-purpose data structure
language.

> **AGENTIC GROUNDING:** Associative arrays in bash are how the POLECAT wrapper could
> track per-task state without external files. Currently it uses filesystem state
> (`.done/` files); associative arrays are the in-memory equivalent. When reviewing
> agent scripts that build lookup tables or count occurrences, check: did the agent
> declare the array with `declare -A`? Without it, bash treats the variable as an
> indexed array and the keys are silently converted to integer 0 - every assignment
> overwrites the same slot.

> **HISTORY:** Associative arrays appeared in bash 4.0 (2009). AWK had associative
> arrays from the beginning (1977), and Perl made them central to the language (1987).
> Bash was late to the party. The delay partly explains why so many shell scripts use
> temp files for lookup tables - the feature simply was not available when the patterns
> were established.

---

## 4. BASH_REMATCH and Regex Matching

*Estimated time: 15 minutes*

Step 2 introduced `[[ string =~ regex ]]` for regex matching in conditionals. This
section covers `BASH_REMATCH` - the array that holds capture groups after a successful
match.

### The Basics

```bash
version="12.4.7"

if [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  printf 'Full match: %s\n' "${BASH_REMATCH[0]}"   # 12.4.7
  printf 'Major: %s\n' "${BASH_REMATCH[1]}"         # 12
  printf 'Minor: %s\n' "${BASH_REMATCH[2]}"         # 4
  printf 'Patch: %s\n' "${BASH_REMATCH[3]}"         # 7
else
  printf 'Not a valid version string\n' >&2
fi
```

`BASH_REMATCH[0]` is the entire match. `BASH_REMATCH[1]` through `BASH_REMATCH[N]` are
the capture groups in order.

### Important: Regex Quoting

The regex must NOT be quoted on the right side of `=~`. If you quote it, bash treats it
as a literal string match, not a regex:

```bash
# CORRECT - regex matching
[[ "hello123" =~ [0-9]+ ]]

# WRONG - literal string match (looks for the literal text "[0-9]+")
[[ "hello123" =~ "[0-9]+" ]]
```

If your regex contains spaces or special characters, assign it to a variable first:

```bash
pattern='^([a-z]+)[[:space:]]+([0-9]+)$'
if [[ "$line" =~ $pattern ]]; then
  printf 'Word: %s, Number: %s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
fi
```

### Practical Examples

**Parsing git log output:**

```bash
# Custom git log format: hash|author|date|message
log_line="a1b2c3d|Alice|2026-03-10|Fix the widget parser"
pattern='^([a-f0-9]+)\|([^|]+)\|([0-9-]+)\|(.+)$'

if [[ "$log_line" =~ $pattern ]]; then
  hash="${BASH_REMATCH[1]}"
  author="${BASH_REMATCH[2]}"
  date="${BASH_REMATCH[3]}"
  message="${BASH_REMATCH[4]}"
  printf 'Commit %s by %s on %s: %s\n' "$hash" "$author" "$date" "$message"
fi
```

**Extracting fields from structured output:**

```bash
# Parse "key: value" lines
line="Content-Type: application/json; charset=utf-8"
if [[ "$line" =~ ^([^:]+):[[:space:]]*(.+)$ ]]; then
  header="${BASH_REMATCH[1]}"
  value="${BASH_REMATCH[2]}"
  printf 'Header: [%s] Value: [%s]\n' "$header" "$value"
fi
```

**Validating input:**

```bash
validate_email() {
  local email="$1"
  # Simplified - real email validation is more complex
  if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    return 0
  fi
  return 1
}

if validate_email "user@example.com"; then
  printf 'Valid\n'
fi
```

### When to Use BASH_REMATCH vs grep/sed/awk

- **BASH_REMATCH** - parsing one string in a conditional. No subprocess spawned. Fast in
  tight loops. Best for: validation, field extraction from a single line, conditional
  branching based on string structure.

- **grep** - filtering multiple lines. Spawns a subprocess. Best for: searching files,
  filtering streams, counting matches across many lines.

- **sed/awk** - transforming text. Spawns a subprocess. Best for: replacing patterns
  across files, columnar data processing, multi-line transformations.

The performance difference matters in loops. Each `grep` or `sed` call in a loop forks a
process. BASH_REMATCH operates in the current shell with no fork.

```bash
# Slow - forks grep 1000 times
for line in "${lines[@]}"; do
  if printf '%s' "$line" | grep -qE '^[0-9]+$'; then
    # ...
  fi
done

# Fast - no forks
for line in "${lines[@]}"; do
  if [[ "$line" =~ ^[0-9]+$ ]]; then
    # ...
  fi
done
```

> **AGENTIC GROUNDING:** BASH_REMATCH is how you parse structured output from agent
> processes without spawning grep/sed subprocesses. In tight loops where subprocess
> overhead matters - processing thousands of log lines, parsing build output, validating
> configuration values - BASH_REMATCH is the right tool. Agents tend to reach for
> grep/sed for everything because those tools dominate their training data. When reviewing
> agent scripts with loops that grep single strings, BASH_REMATCH is often the better
> choice.

---

## 5. Process Substitution and Named Pipes

*Estimated time: 15 minutes*

Step 2 introduced process substitution. This section covers the full picture: both
directions of process substitution, named pipes (FIFOs), and the relationship between
them.

### Process Substitution: `<()` and `>()`

`<(command)` produces a filename (like `/dev/fd/63`) that, when read, provides the
stdout of `command`. The command runs as a background process, and the kernel wires
its stdout to a pipe behind the file descriptor.

```bash
# Compare two sorted streams without temp files
diff <(sort file1.txt) <(sort file2.txt)

# See what the filename looks like
printf '%s\n' <(echo hello)
# /dev/fd/63  (or similar)

# Join two sorted files (join requires sorted input on specific fields)
join <(sort -k1,1 users.csv) <(sort -k1,1 orders.csv)
```

`>(command)` goes the other direction: it produces a filename that, when written to,
feeds the input to `command`:

```bash
# Write to compressed and plain simultaneously
tee >(gzip > archive.gz) > plain.txt < input.txt

# Send output to two different processing pipelines
some_command | tee >(grep ERROR > errors.log) >(grep WARN > warnings.log) > /dev/null

# Write to a file and compute a checksum simultaneously
tee >(sha256sum > checksum.txt) < bigfile.dat > /dev/null
```

### Practical Patterns

**Compare command outputs:**

```bash
# What changed in the package list after an install?
diff <(apt list --installed 2>/dev/null) <(apt list --installed 2>/dev/null)
# (More practically, save the first list to a file before the install)

# Compare environment before and after sourcing a script
diff <(env | sort) <(source setup.sh; env | sort)
```

**Merge sorted streams:**

```bash
# Merge three sorted log files by timestamp
sort -m <(sort log1.txt) <(sort log2.txt) <(sort log3.txt)
```

**Feed multiple inputs to a command:**

```bash
# paste combines files column-by-column
paste <(cut -d: -f1 /etc/passwd) <(cut -d: -f3 /etc/passwd)
```

### Named Pipes (FIFOs)

A named pipe is a process substitution that you manage manually. It appears as a file
in the filesystem but behaves like a pipe: a writer blocks until a reader opens the
other end, and vice versa.

```bash
# Create a named pipe
mkfifo /tmp/mypipe

# In terminal 1 (blocks until a reader connects):
printf 'Hello from writer\n' > /tmp/mypipe

# In terminal 2 (reads the data):
cat < /tmp/mypipe
# Hello from writer

# Clean up
rm /tmp/mypipe
```

Named pipes are useful when:
- Two processes need to communicate but neither can be started with process substitution
  (e.g., they are started by different scripts or at different times)
- You need a persistent communication channel between long-running processes
- The producing and consuming processes are managed independently

### Process Substitution vs Named Pipes

Process substitution is automatic - bash creates the pipe, manages the file descriptors,
and cleans up. Named pipes are explicit - you create, manage, and remove them. Process
substitution is scoped to the command; named pipes persist until you delete them.

Choose process substitution for one-shot patterns in a single command line. Choose named
pipes for inter-process communication across separate commands or scripts. In practice,
you will use process substitution far more often.

> **AGENTIC GROUNDING:** Process substitution enables powerful one-liners that avoid temp
> files. Agents can generate these, but you need to understand them to verify correctness.
> The common failure: an agent writes `diff $(sort file1) $(sort file2)` - command
> substitution, not process substitution. This captures the sorted output as strings,
> not filenames, and diff receives two strings as arguments instead of two file paths.
> The correct form is `diff <(sort file1) <(sort file2)`.

> **HISTORY:** Process substitution was invented by the Korn shell (ksh88) in 1988 and
> adopted by bash. It relies on the `/dev/fd/` filesystem, which originated in the 8th
> Edition of Research Unix (1985) at Bell Labs. Named pipes (FIFOs) are older - they
> were added to Unix in System III (1981). The two features together eliminated an entire
> class of temp-file bugs and made possible the "no intermediate files" pipeline style
> that is idiomatic in modern shell scripting.

---

## 6. Coprocesses (Bash 4+)

*Estimated time: 10 minutes*

A coprocess is a background process with bidirectional pipes. You can write to its
stdin and read from its stdout, all from the parent shell. This is bash's built-in
mechanism for interactive process communication.

### Syntax

```bash
# Named coprocess (bash 4.0+)
coproc MYPROC { bc -l; }

# Write to the coprocess
printf '22 / 7\n' >&"${MYPROC[1]}"

# Read from the coprocess
read -r result <&"${MYPROC[0]}"
printf 'Result: %s\n' "$result"
# Result: 3.14285714285714285714

# Send more
printf 'sqrt(2)\n' >&"${MYPROC[1]}"
read -r result <&"${MYPROC[0]}"
printf 'sqrt(2) = %s\n' "$result"

# Close the write end (signals EOF to the coprocess)
exec {MYPROC[1]}>&-

# Wait for it to finish
wait "$MYPROC_PID"
```

`${MYPROC[0]}` is the file descriptor for reading from the coprocess (its stdout).
`${MYPROC[1]}` is the file descriptor for writing to the coprocess (its stdin).
`$MYPROC_PID` is the PID of the coprocess.

### The Unnamed Coprocess

```bash
# Without a name (limited: only one unnamed coprocess at a time)
coproc { while IFS= read -r line; do printf 'ECHO: %s\n' "$line"; done; }

printf 'hello\n' >&"${COPROC[1]}"
read -r reply <&"${COPROC[0]}"
printf '%s\n' "$reply"
# ECHO: hello
```

### Why Coprocesses Are Fragile

In practice, coprocesses have several sharp edges:

1. **Buffering** - If the coprocess's output is fully buffered (which it often is when
   stdout is a pipe rather than a terminal), reads will block until the buffer fills or
   the process flushes. This is the same buffering issue from Step 1/Step 8 (stdbuf).

2. **Deadlocks** - Writing too much to the coprocess without reading can fill the pipe
   buffer (64KB on Linux), blocking the writer. If the writer is also the reader, deadlock.

3. **EOF handling** - You must close the write descriptor to signal EOF to the coprocess.
   Forgetting this leaves the coprocess hanging.

4. **Only one unnamed coprocess** - Starting a second unnamed coprocess kills the first.

### When to Use Coprocesses (Almost Never)

For interactive communication with long-running processes, `expect` (Tcl-based) or
Python's `pexpect` library handle the buffering and timing complexities far better.
Coprocesses are the "bash can technically do this" feature. Understanding them completes
the fd/pipe mental model from Step 1, but reaching for them in production is usually the
wrong call.

The valid use case: simple request-response protocols with line-buffered processes (like
`bc` or a custom line-oriented server). For anything more complex, use Python.

> **AGENTIC GROUNDING:** You are unlikely to see coprocesses in agent-generated scripts.
> But understanding the mechanism - bidirectional pipes wired to file descriptors -
> completes the mental model. When you see an agent trying to solve a bidirectional
> communication problem with temp files or polling, the underlying need is what
> coprocesses address. The right answer is usually to suggest Python, not bash coprocesses.

---

## 7. select for Menus

*Estimated time: 5 minutes*

`select` generates a numbered menu from a word list. It is the simplest interactive
input mechanism in bash.

```bash
PS3="Choose a color: "   # The prompt
select color in red green blue quit; do
  case "$color" in
    red|green|blue)
      printf 'You chose %s\n' "$color"
      ;;
    quit)
      break
      ;;
    *)
      printf 'Invalid choice\n' >&2
      ;;
  esac
done
```

Output:
```
1) red
2) green
3) blue
4) quit
Choose a color:
```

The user enters a number. `$REPLY` holds the raw input (the number). `$color` holds the
corresponding word. An invalid number sets `$color` to empty.

### Why This Section Is Short

In agent-native work, interactive menus are almost never the right interface. Agents
do not use menus. Scripts called by agents should accept arguments or read configuration
files, not prompt for input. `select` exists in bash, and you may encounter it in
legacy scripts, but you will not write it in new code.

Understanding it matters for one reason: when an agent encounters a script that blocks
on `select` input, you need to recognise what is happening and why the agent is stuck.

---

## 8. printf Mastery

*Estimated time: 15 minutes*

The standing order (from AGENTS.md and CLAUDE.md): never use `echo` to pipe values. Use
`printf`. This section explains why, and covers `printf` capabilities beyond basic
string output.

### Why printf Over echo

`echo` has two problems:

1. **Trailing newline** - `echo "value"` outputs `value\n`. When piped to another
   command, the newline is part of the data. This silently corrupts values in pipelines.

2. **Inconsistent behaviour** - `echo -n` suppresses the newline on GNU systems but
   prints literal `-n` on some BSD systems. `echo -e` enables escape sequences on some
   systems and prints literal `-e` on others. There is no portable `echo`.

`printf` has neither problem:

```bash
# Exactly "value" with no trailing newline
printf '%s' "value"

# "value" with an explicit newline
printf '%s\n' "value"

# The behaviour is identical across all POSIX systems
```

### Format Specifiers

```bash
# String
printf '%s\n' "$name"

# Integer
printf '%d\n' "$count"

# Zero-padded integer (useful for filenames that sort correctly)
printf '%05d\n' 42         # 00042

# Left-aligned string in a 20-character field
printf '%-20s %s\n' "$key" "$value"

# Right-aligned integer in a 10-character field
printf '%10d\n' "$number"

# Hexadecimal
printf '%x\n' 255          # ff
printf '%X\n' 255          # FF
printf '0x%08x\n' 255      # 0x000000ff

# Octal
printf '%o\n' 255           # 377

# Floating point (note: bash has no native floats, but printf can format them)
printf '%.2f\n' 3.14159    # 3.14
```

### Aligned Columns

```bash
# Report with aligned columns
printf '%-15s %8s %8s\n' "Service" "Status" "PID"
printf '%-15s %8s %8d\n' "nginx" "running" 1234
printf '%-15s %8s %8s\n' "postgres" "stopped" "-"
printf '%-15s %8s %8d\n' "redis" "running" 5678
```

Output:
```
Service            Status      PID
nginx             running     1234
postgres          stopped        -
redis             running     5678
```

### Date Formatting (Bash 4.2+)

```bash
# Current date/time using strftime format
printf '%(%Y-%m-%d %H:%M:%S)T\n' -1
# 2026-03-10 14:30:00

# Epoch time
printf '%(%s)T\n' -1
# 1773350000 (approximate)

# -1 means "now", -2 means "shell startup time"
printf 'Shell started: %(%Y-%m-%d %H:%M:%S)T\n' -2
```

This avoids spawning a `date` subprocess. In a loop that logs timestamps, this is
significantly faster.

### printf -v: Format Into a Variable

```bash
# Instead of: var=$(printf '%05d' "$n")  # spawns a subshell
# Use:
printf -v var '%05d' "$n"                 # no subshell

# Build a formatted string without a subprocess
printf -v timestamp '%(%Y%m%d_%H%M%S)T' -1
printf -v logfile '/var/log/app_%s.log' "$timestamp"
```

`printf -v` is a bash extension. It formats the output directly into the named variable
without forking a subshell. In tight loops, this matters.

### ANSI Colors

```bash
# Red text
printf '\x1b[31m%s\x1b[0m\n' "ERROR: something failed"

# Green text
printf '\x1b[32m%s\x1b[0m\n' "OK: tests passed"

# Bold yellow
printf '\x1b[1;33m%s\x1b[0m\n' "WARNING: check this"

# Define reusable color codes
RED='\x1b[31m'
GREEN='\x1b[32m'
YELLOW='\x1b[33m'
RESET='\x1b[0m'

printf "${RED}%s${RESET}\n" "This is red"
```

The `\x1b[` prefix is the ANSI escape sequence introducer. `31` is red, `32` is green,
`33` is yellow, `0` resets all attributes. These work in any terminal emulator.

> **AGENTIC GROUNDING:** `printf -v` and `printf '%()T'` are the two bash features that
> eliminate unnecessary subshells in performance-sensitive scripts. Agents default to
> `$(date +%Y%m%d)` and `var=$(printf ...)` because those patterns are more common in
> training data. When reviewing agent scripts that run in tight loops, replacing these
> with `printf -v` and `printf '%()T' -1` can be a significant performance improvement.

---

## 9. Bash Strict Mode and Production Patterns

*Estimated time: 20 minutes*

Step 2 covered `set -euo pipefail`. This section covers the additional shopts and
patterns that complete the production-grade bash setup.

### The Defensive Triple (Review)

```bash
set -euo pipefail
```

- `set -e` - exit on error (with exemptions for conditionals, `&&`, `||`)
- `set -u` - error on unset variables
- `set -o pipefail` - pipeline fails if any command fails

### IFS Hardening

```bash
IFS=$'\n\t'
```

The default IFS (Internal Field Separator) is space, tab, and newline. This means word
splitting occurs on all three. Setting IFS to only newline and tab means spaces no
longer cause word splitting:

```bash
# Default IFS - spaces cause splitting
IFS=$' \t\n'
for word in $(printf 'hello world\nfoo bar\n'); do
  printf '[%s]\n' "$word"
done
# [hello]
# [world]
# [foo]
# [bar]

# Hardened IFS - only newlines and tabs split
IFS=$'\n\t'
for word in $(printf 'hello world\nfoo bar\n'); do
  printf '[%s]\n' "$word"
done
# [hello world]
# [foo bar]
```

This is a safety net, not a substitute for proper quoting. But when combined with proper
quoting, it catches the cases you miss.

### shopt Settings for Production

```bash
# Error on unmatched globs (instead of passing the literal pattern)
shopt -s failglob

# Without failglob:
ls *.xyz     # if no .xyz files exist, ls receives literal "*.xyz" as argument
# With failglob:
ls *.xyz     # bash: no match: *.xyz (error, script exits with set -e)
```

```bash
# Unmatched globs expand to nothing (instead of the literal pattern)
shopt -s nullglob

# Without nullglob:
for f in *.xyz; do echo "$f"; done
# *.xyz  (iterates once with the literal pattern string)

# With nullglob:
for f in *.xyz; do echo "$f"; done
# (no output - loop body never executes)
```

`failglob` and `nullglob` are mutually exclusive in practice. `failglob` treats
unmatched globs as errors - good for scripts that expect files to exist. `nullglob`
treats them as empty - good for scripts that handle the empty case in the loop body.
Choose one based on your script's needs.

```bash
# Enable ** recursive glob
shopt -s globstar

# Without globstar:
ls **/*.txt    # ** is not special, matches nothing useful

# With globstar:
ls **/*.txt    # matches *.txt in all subdirectories recursively
```

```bash
# Run last pipeline command in current shell (bash 4.2+)
shopt -s lastpipe

# The variable-in-while-loop problem from Step 2:
count=0
printf 'a\nb\nc\n' | while IFS= read -r line; do
  (( count++ ))
done
printf '%d\n' "$count"
# Without lastpipe: 0 (while loop ran in subshell)
# With lastpipe: 3 (while loop ran in current shell)
```

`lastpipe` only works when job control is disabled (non-interactive scripts, or after
`set +m`). In interactive bash, job control is on by default, so `lastpipe` has no
effect. This makes it safe for scripts but not for interactive use.

### The set -e Debates

The bash community has long argued about whether `set -e` is helpful or harmful. The
pragmatic consensus:

**Arguments for `set -e`:**
- Catches gross errors (missing files, failed commands) that would otherwise cascade
- Forces the script author to handle expected failures explicitly (with `|| true` or
  conditionals)
- Better than no error handling at all

**Arguments against `set -e`:**
- The exemption rules are complex (conditionals, `&&`, `||`, subshells, command
  substitution) and create false confidence
- A script that "passes" under `set -e` may still have unhandled error cases
- It can mask the real error when a cleanup command in a trap also fails

**The practical position:** use `set -euo pipefail` as a safety net. Do not rely on it
as your sole error handling strategy. Write explicit error handling for commands that
may fail in expected ways:

```bash
set -euo pipefail

# Explicit handling for expected failure
if ! result=$(curl -sf "$url"); then
  printf 'Failed to fetch %s\n' "$url" >&2
  exit 1
fi

# || true for commands where failure is acceptable
grep -q "pattern" file.txt || true
```

### BASH_SOURCE and SCRIPT_DIR

```bash
# The directory containing the currently executing script
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The name of the script
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
```

`${BASH_SOURCE[0]}` is the path to the current script as it was invoked. Unlike `$0`,
it works correctly even when the script is `source`d from another script. `SCRIPT_DIR`
gives you the absolute path to the script's directory, which is essential for scripts
that need to reference files relative to their own location.

```bash
# Load a config file relative to the script
source "${SCRIPT_DIR}/config.sh"

# Reference a data file relative to the script
data_file="${SCRIPT_DIR}/../data/input.csv"
```

> **AGENTIC GROUNDING:** The production template (set -euo pipefail + trap + main) is
> what well-written agent scripts look like. When an agent generates a shell script
> without these, it is missing the safety net. The checklist: does the script have
> `set -euo pipefail`? Does it have a cleanup trap? Does it use `BASH_SOURCE` instead
> of `$0` for self-referencing paths? Does it wrap logic in a `main` function?
> Missing any of these is a code smell.

---

## 10. Debugging Techniques

*Estimated time: 15 minutes*

### Execution Tracing with set -x

```bash
# Enable trace - shows each command before execution
set -x
name="world"
printf 'Hello, %s\n' "$name"
set +x    # disable trace
```

Output:
```
+ name=world
+ printf 'Hello, %s\n' world
Hello, world
+ set +x
```

Each traced line is prefixed with `+` (the default value of `PS4`).

### Improved Trace Prefix

The default `+ ` prefix tells you nothing about where the command is. Set `PS4` to
include the source file and line number:

```bash
export PS4='+ ${BASH_SOURCE[0]##*/}:${LINENO}: '
set -x
```

Now traces show:
```
+ myscript.sh:12: name=world
+ myscript.sh:13: printf 'Hello, %s\n' world
```

For deeper call stacks, include the function name:

```bash
export PS4='+ ${BASH_SOURCE[0]##*/}:${LINENO} (${FUNCNAME[0]:-main}): '
```

### Tracing from the Command Line

```bash
# Trace the entire script from the start
bash -x script.sh

# Trace with custom PS4
PS4='+ ${BASH_SOURCE}:${LINENO}: ' bash -x script.sh
```

### Selective Tracing

```bash
# Only trace the problematic section
set -x
problematic_function "$arg1" "$arg2"
set +x
```

Or use a wrapper:

```bash
debug() {
  set -x
  "$@"
  { set +x; } 2>/dev/null    # suppress the "set +x" trace line
}

debug problematic_function "$arg1" "$arg2"
```

### Step-Through Debugging

```bash
# Pause before every command
trap 'read -p "[$LINENO] $BASH_COMMAND - Press enter..."' DEBUG
```

This uses the DEBUG trap (Section 1) to pause before each command, showing the line
number and the command about to execute. Press Enter to continue. This is the bash
equivalent of a breakpoint debugger.

### shellcheck - Static Analysis

`shellcheck` is the linter for shell scripts. It catches over 200 categories of bugs:

```bash
# Install
# Arch: pacman -S shellcheck
# Debian/Ubuntu: apt install shellcheck

# Run on a script
shellcheck myscript.sh

# Run with specific severity
shellcheck -S warning myscript.sh

# Output as JSON (for programmatic processing)
shellcheck -f json myscript.sh

# Check specific shell dialect
shellcheck -s bash myscript.sh
shellcheck -s sh myscript.sh    # POSIX mode
```

What shellcheck catches:

```bash
# SC2086: Double quote to prevent globbing and word splitting
echo $unquoted_var
#      ^-- shellcheck warns here

# SC2046: Quote this to prevent word splitting
files=$(find . -name "*.txt")
#       ^-- shellcheck warns here

# SC2002: Useless use of cat
cat file | grep pattern
# ^-- shellcheck warns: use grep pattern file instead

# SC2034: Variable appears unused
unused_var="hello"
# ^-- shellcheck warns

# SC2164: Use cd ... || exit in case cd fails
cd /some/dir
# ^-- shellcheck warns
```

shellcheck catches the exact class of bugs that agents introduce: unquoted variables,
useless cat, unreachable code, incorrect test operators, POSIX/bash confusion. Running
shellcheck on agent-generated scripts is a verification step equivalent to running a
type checker on TypeScript code.

### bashdb

`bashdb` is a source-level debugger for bash scripts, similar to gdb for C. It supports
breakpoints, step/next/continue, variable inspection, and stack traces. It is rarely
used in practice because `set -x` and `shellcheck` catch most issues, but it exists for
complex debugging scenarios:

```bash
# Install: pacman -S bashdb / apt install bashdb
# Run:
bashdb myscript.sh
# (bashdb) break 15       # breakpoint at line 15
# (bashdb) run             # start execution
# (bashdb) print $var      # inspect variable
# (bashdb) next            # step over
# (bashdb) step            # step into
# (bashdb) continue        # resume
```

> **AGENTIC GROUNDING:** `shellcheck` is the single most effective verification tool for
> agent-generated shell scripts. It catches bugs that visual review misses - unquoted
> variables in contexts where they appear safe but are not, command substitutions that
> should be quoted, POSIX violations in sh scripts. Adding `shellcheck script.sh` to
> your verification workflow catches a category of bugs before they reach execution.
> Agents should run shellcheck on their own generated scripts.

> **HISTORY:** shellcheck was created by Vidar Holen in 2012. It is written in Haskell
> and uses a custom shell parser (not bash's own parser) to analyse scripts statically.
> It has become the de facto standard for shell script quality, with integrations in
> every major editor and CI system. The project catches over 200 categories of shell
> bugs, each documented with explanations and examples at shellcheck.net. The existence
> of 200+ bug categories for a "simple" language like shell is itself a data point about
> shell's hidden complexity.

---

## 11. The Complete Production Template

*Estimated time: 10 minutes*

This is the reference template for production bash scripts. Every agent-generated script
that does real work should look like this. Keep this template and use it as a starting
point.

```bash
#!/usr/bin/env bash
#
# script-name.sh - One-line description of what this script does.
#
# Usage: script-name.sh [OPTIONS] <required-arg>
#

set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

TMPDIR_CREATED=""

cleanup() {
  local exit_code=$?

  # Remove temp directory if we created one
  if [[ -n "${TMPDIR_CREATED:-}" ]]; then
    rm -rf "$TMPDIR_CREATED"
  fi

  # Kill background processes if any
  # kill "$bg_pid" 2>/dev/null || true
  # wait "$bg_pid" 2>/dev/null || true

  exit "$exit_code"
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

VERBOSE=false

log() {
  if [[ "$VERBOSE" == true ]]; then
    printf '[%(%Y-%m-%d %H:%M:%S)T] %s\n' -1 "$*" >&2
  fi
}

die() {
  local code="${1:-1}"
  shift
  printf '%s: error: %s\n' "$SCRIPT_NAME" "$*" >&2
  exit "$code"
}

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------

usage() {
  cat >&2 <<EOF
Usage: $SCRIPT_NAME [OPTIONS] <input-file>

Process <input-file> and write results to stdout (or -o file).

Options:
  -o FILE   Write output to FILE (default: stdout)
  -v        Verbose logging to stderr
  -h        Show this help message

Examples:
  $SCRIPT_NAME data.txt
  $SCRIPT_NAME -v -o result.txt data.txt
EOF
}

# ---------------------------------------------------------------------------
# Argument Parsing
# ---------------------------------------------------------------------------

parse_args() {
  local output_file=""

  while getopts ":o:vh" opt; do
    case "$opt" in
      o) output_file="$OPTARG" ;;
      v) VERBOSE=true ;;
      h) usage; exit 0 ;;
      :) die 1 "Option -$OPTARG requires an argument" ;;
      *) die 1 "Unknown option: -$OPTARG. Use -h for help." ;;
    esac
  done
  shift $((OPTIND - 1))

  # Require positional argument
  if [[ $# -lt 1 ]]; then
    die 1 "Missing required argument: <input-file>. Use -h for help."
  fi

  INPUT_FILE="$1"
  OUTPUT_FILE="${output_file:-/dev/stdout}"
}

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

validate() {
  if [[ ! -f "$INPUT_FILE" ]]; then
    die 2 "Input file not found: $INPUT_FILE"
  fi

  if [[ ! -r "$INPUT_FILE" ]]; then
    die 2 "Input file not readable: $INPUT_FILE"
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  parse_args "$@"
  validate

  log "Processing $INPUT_FILE"

  # Create temp directory for intermediate work
  TMPDIR_CREATED="$(mktemp -d)"
  log "Working directory: $TMPDIR_CREATED"

  # -----------------------------------------------------------------------
  # Your actual logic here
  # -----------------------------------------------------------------------

  # Example: process the input file
  local line_count
  line_count=$(wc -l < "$INPUT_FILE")
  log "Input has $line_count lines"

  # Write output
  printf 'Processed %d lines from %s\n' "$line_count" "$INPUT_FILE" > "$OUTPUT_FILE"

  log "Done"
}

main "$@"
```

### Why Each Part Matters

| Component | Purpose |
|-----------|---------|
| `set -euo pipefail` | Safety net for unhandled errors |
| `readonly SCRIPT_DIR` | Reliable self-referencing paths |
| `cleanup` + `trap EXIT` | Guaranteed resource cleanup |
| `log` function | Verbose output to stderr (does not contaminate stdout) |
| `die` function | Consistent error reporting with exit codes |
| `usage` function | Self-documenting, prints to stderr |
| `parse_args` with `getopts` | Standard argument handling |
| `validate` function | Fail fast on bad input |
| `main` function | All logic in main, called with `"$@"` |

The `main "$@"` pattern at the end ensures that the entire script is parsed before
any execution begins. Without it, a syntax error partway through the file could cause
partial execution of the top of the script. With `main "$@"`, bash parses the complete
file first, defines all functions, then calls `main`.

### Exit Code Conventions

```
0  - Success
1  - User error (bad arguments, missing input)
2  - System error (file not found, permission denied, command failed)
```

This matches the convention used by many Unix utilities. Scripts called by other scripts
or by agents should follow this convention so the caller can distinguish between "you
used it wrong" and "something broke."

---

## 12. Challenges

The challenges below are the capstone of the bootcamp. They build on everything from
Steps 1 through 12.

---

## Challenge: Trap Cleanup Laboratory

**Estimated time: 15 minutes**

Write a script called `trap-lab.sh` that:

1. Creates a temp directory with `mktemp -d`
2. Starts a background `sleep 300` process (simulating a long-running child)
3. Creates a lockfile at `/tmp/trap-lab.lock`
4. Does some "work" (sleep for a few seconds)
5. Has a cleanup function registered with `trap ... EXIT` that:
   - Removes the temp directory
   - Kills the background process
   - Removes the lockfile
   - Prints what it cleaned up to stderr

### Test Scenarios

Run the script under each of these conditions and verify cleanup runs in all cases:

```bash
# 1. Normal exit
bash trap-lab.sh

# 2. Ctrl-C (SIGINT) - press Ctrl-C during the sleep
bash trap-lab.sh

# 3. SIGTERM from another terminal
bash trap-lab.sh &
kill $!

# 4. set -e triggered error (add a failing command before the sleep)
# Modify the script to include: false
# between the setup and the sleep

# 5. Verify cleanup ran
ls /tmp/trap-lab.lock 2>/dev/null && printf 'FAIL: lockfile still exists\n' || printf 'OK: lockfile cleaned\n'
```

### Questions

- Does the cleanup function run in all four cases?
- What happens if you send SIGKILL (`kill -9`) instead of SIGTERM? Why?
- What happens if the cleanup function itself fails (e.g., the lockfile was already removed)?
  How do you make cleanup robust against partial state?

---

## Challenge: Array Safety Drill

**Estimated time: 10 minutes**

Create an array of adversarial filenames:

```bash
files=(
  "normal.txt"
  "has spaces.txt"
  "has  double  spaces.txt"
  'has "quotes".txt'
  "has 'single quotes'.txt"
  $'has\nnewline.txt'
  "has * glob.txt"
  ""                        # empty string
)
```

### Tasks

1. Write a loop that prints each filename on its own line, correctly handling all cases
   (including the empty string and the newline in a filename). Use `printf '%s\n'`, not
   `echo`.

2. Demonstrate the difference between `"${files[@]}"` and `${files[@]}` (unquoted) by
   printing the number of words each produces:

   ```bash
   # Quoted
   set -- "${files[@]}"
   printf 'Quoted: %d items\n' "$#"

   # Unquoted
   set -- ${files[@]}
   printf 'Unquoted: %d items\n' "$#"
   ```

   Explain why the numbers differ.

3. Show how to safely pass the array to `xargs`:

   ```bash
   printf '%s\0' "${files[@]}" | xargs -0 -I{} printf 'File: [%s]\n' "{}"
   ```

4. Create actual files with these names in a temp directory and process them with
   `find -print0 | xargs -0`. Compare the safety of this approach to `for f in $(ls)`.

---

## Challenge: BASH_REMATCH Parser

**Estimated time: 15 minutes**

Write a function `parse_git_log` that parses git log output using BASH_REMATCH.

### Setup

Generate test data:

```bash
git log --format='%h|%an|%ad|%s' --date=short -20 > /tmp/git-log-test.txt
```

If you are not in a git repo, create sample data:

```bash
cat > /tmp/git-log-test.txt <<'EOF'
a1b2c3d|Alice Smith|2026-03-10|Fix widget parser edge case
b2c3d4e|Bob Jones|2026-03-09|Add retry logic to API client
c3d4e5f|Alice Smith|2026-03-09|Refactor database connection pool
d4e5f6a|Charlie Lee|2026-03-08|Update dependencies to latest
e5f6a7b|Alice Smith|2026-03-08|Initial commit of auth module
f6a7b8c|Bob Jones|2026-03-07|Fix off-by-one in pagination
a7b8c9d|Charlie Lee|2026-03-07|Add health check endpoint
b8c9d0e|Alice Smith|2026-03-06|Remove deprecated API routes
c9d0e1f|Bob Jones|2026-03-06|Fix race condition in cache
d0e1f2a|Charlie Lee|2026-03-05|Add rate limiting middleware
EOF
```

### Tasks

1. Write a `parse_line` function that uses BASH_REMATCH to extract hash, author, date,
   and message from each line. Print them in a formatted table.

2. Write a `count_by_author` function that uses an associative array to count commits
   per author. Print the results sorted by count.

3. **Performance comparison:** Write a second version that uses `cut` (or `awk`) to
   extract the fields instead of BASH_REMATCH. Time both versions processing 1000 lines
   (replicate the test data):

   ```bash
   # Generate 1000 lines
   for i in $(seq 1 100); do cat /tmp/git-log-test.txt; done > /tmp/git-log-1000.txt

   time bash_rematch_version /tmp/git-log-1000.txt
   time cut_version /tmp/git-log-1000.txt
   ```

   Which is faster? Why? (Hint: BASH_REMATCH has no subprocess overhead per line, but
   bash loops are themselves slow. A single `awk` invocation processes all 1000 lines
   in one process.)

---

## Challenge: The Production Script

**Estimated time: 15 minutes**

Write a complete production-grade bash script called `linecount.sh` that:

1. Accepts `-v` (verbose), `-o <file>` (output), and `-h` (help) flags
2. Takes one or more input files as positional arguments
3. Validates that all input files exist and are readable
4. Creates a temp directory for intermediate work
5. Counts the lines in each input file
6. Outputs a summary table (filename, line count, percentage of total)
7. Has proper cleanup, error handling, and exit codes

### Requirements

- Use the production template from Section 11 as a starting point
- All logging to stderr, all output to stdout (or -o file)
- Handle filenames with spaces correctly
- Use arrays to store the file list
- Use an associative array to store per-file counts
- Use `printf` for all output (never echo)

### Verification

```bash
# Syntax check
bash -n linecount.sh

# shellcheck
shellcheck linecount.sh

# Normal operation
bash linecount.sh file1.txt file2.txt

# Verbose
bash linecount.sh -v file1.txt file2.txt

# Output to file
bash linecount.sh -o report.txt file1.txt file2.txt

# Missing file
bash linecount.sh nonexistent.txt
# Should exit 2 with clear error

# No arguments
bash linecount.sh
# Should exit 1 with usage

# Help
bash linecount.sh -h
# Should exit 0 with usage
```

---

## Challenge: Process Substitution Pipeline

**Estimated time: 10 minutes**

Solve each of the following problems using process substitution. No temp files allowed.

1. **Compare two command outputs:**
   Show the differences between the installed packages on this system and a reference
   list. (Simulate with two different sort orders of the same data.)

   ```bash
   # Compare sorted vs reverse-sorted
   diff <(sort /etc/passwd) <(sort -r /etc/passwd)
   ```

2. **Merge sorted streams:**
   Given three log files with timestamped lines, produce a single sorted output:

   ```bash
   sort -m <(sort log1.txt) <(sort log2.txt) <(sort log3.txt)
   ```

3. **Simultaneously compress and hash:**
   Write a file's contents to a gzip archive AND compute its sha256sum without reading
   the file twice:

   ```bash
   tee >(gzip > archive.gz) < input.txt | sha256sum
   ```

4. **Feed multiple inputs to paste:**
   Extract the first and third columns from `/etc/passwd` using process substitution
   and `paste`:

   ```bash
   paste <(cut -d: -f1 /etc/passwd) <(cut -d: -f3 /etc/passwd)
   ```

5. **Redirect to multiple destinations:**
   Run a command and send its stdout to both a file and a processing pipeline:

   ```bash
   ls -la /etc | tee >(wc -l > count.txt) >(grep "\.conf$" > configs.txt) > full-listing.txt
   ```

For each solution, explain what would be required if process substitution were not
available (typically: temp files, mkfifo, or restructuring the pipeline).

---

## Challenge: Shell Script Review Exercise

**Estimated time: 20 minutes**

This is the capstone exercise. It directly simulates the Operator's verification role:
reviewing agent-generated shell scripts for correctness, safety, and production quality.

Each script below was "generated by an agent." Each contains multiple bugs spanning
the topics from Steps 1 through 12. For each script:

1. Read the script and identify every bug you can find
2. Classify each bug by topic (quoting, error handling, cleanup, portability, process
   model, etc.)
3. Run shellcheck on the script and compare its findings with yours
4. Fix all bugs and verify the fixed version passes shellcheck

### Script 1: Backup Script

```bash
#!/bin/sh
# Agent-generated backup script

BACKUP_DIR=/backups/$(date +%Y%m%d)
SOURCE_DIR=$1

mkdir -p $BACKUP_DIR

for file in $(find $SOURCE_DIR -type f -name "*.log"); do
  cp $file $BACKUP_DIR/
  echo "Backed up: $file"
done

echo "Backup complete. $(ls $BACKUP_DIR | wc -l) files backed up."
```

**Bugs to find:** (try before reading)

<details>
<summary>Bug list</summary>

1. **Shebang says `#!/bin/sh` but no portability issues here - however the script lacks
   error handling.** Missing `set -e` or equivalent. If `mkdir -p` fails, the script
   continues copying to a nonexistent directory.
2. **Unquoted `$BACKUP_DIR`** in `mkdir -p` - breaks if date somehow produces spaces
   (unlikely here, but unquoted variables are a habit bug).
3. **Unquoted `$SOURCE_DIR` and `$file`** everywhere - breaks on paths with spaces.
4. **`$(find ... -name "*.log")` in a for loop** - word splitting breaks on filenames
   with spaces. Should use `find -exec` or `find -print0 | while`.
5. **No validation of `$1`** - if called with no arguments, `$SOURCE_DIR` is empty and
   `find` searches from the current directory.
6. **No cleanup trap** - if interrupted, partial backups remain without indication.
7. **`echo` instead of `printf`** - minor, but the standing order says `printf`.
8. **`ls $BACKUP_DIR | wc -l`** - unquoted, and `ls | wc -l` breaks on filenames with
   newlines.
9. **No exit code handling** - script always exits 0 even if cp fails.

</details>

### Script 2: Process Monitor

```bash
#!/usr/bin/env bash
# Agent-generated process monitor

PROCESS_NAME=$1
LOG_FILE=/var/log/monitor_$PROCESS_NAME.log
CHECK_INTERVAL=5

while true; do
  if ! pgrep -x $PROCESS_NAME > /dev/null 2>&1; then
    echo "[$(date)] $PROCESS_NAME is DOWN - restarting" >> $LOG_FILE
    systemctl restart $PROCESS_NAME
    sleep 10
  fi
  sleep $CHECK_INTERVAL
done
```

**Bugs to find:**

<details>
<summary>Bug list</summary>

1. **Missing `set -euo pipefail`** - no error handling.
2. **Unquoted `$PROCESS_NAME`** in pgrep, echo, systemctl, and log file path - if the
   process name contains spaces or special characters, multiple bugs fire.
3. **No validation of `$1`** - if empty, pgrep and systemctl receive empty arguments.
   `pgrep -x ""` matches nothing, so the script restarts "nothing" in a loop.
4. **No trap for cleanup** - if the monitor is killed, no indication in the log.
5. **Log file path contains unquoted variable** - `$LOG_FILE` constructed from unquoted
   input.
6. **`echo` instead of `printf`** for log entries.
7. **No log rotation or size limit** - the log grows forever.
8. **Running as an infinite loop without process supervision** - if this script dies,
   nothing restarts it. Should be a systemd service (Step 11).
9. **`systemctl restart` may require root** - no privilege check.
10. **Race condition** - between the pgrep check and the restart, the process may have
    already restarted on its own.

</details>

### Script 3: Deployment Script

```bash
#!/bin/bash
# Agent-generated deployment script

APP_DIR=/opt/myapp
REPO_URL=https://github.com/org/repo.git
BRANCH=main

cd $APP_DIR
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

npm install
npm run build

if [ $? -eq 0 ]; then
  systemctl restart myapp
  echo "Deployment successful"
else
  echo "Build failed!"
fi
```

**Bugs to find:**

<details>
<summary>Bug list</summary>

1. **Missing `set -euo pipefail`** - if `cd` fails, the script runs git commands in the
   wrong directory. If `git fetch` fails, it continues. Cascading failures.
2. **`cd $APP_DIR` unquoted and unchecked** - the most dangerous line. If `$APP_DIR` is
   wrong or the directory does not exist, subsequent commands run in the current directory.
   Could `git pull` in the wrong repo or `rm -rf` the wrong path.
3. **No rollback mechanism** - if the build fails after git pull, the code is in a
   broken state. No way to recover to the previous version.
4. **`$?` after `npm run build` is fragile** - if any command is inserted between
   `npm run build` and the `if [ $? ... ]` check, `$?` reflects the wrong command.
   Use `if npm run build; then ...` directly.
5. **Unquoted `$BRANCH`** everywhere.
6. **No cleanup trap** - if interrupted mid-deployment, the application may be in an
   inconsistent state.
7. **No lock mechanism** - two simultaneous deployments would corrupt the application.
8. **`echo` instead of `printf`**.
9. **No logging** - deployment events should be recorded.
10. **No health check after restart** - the script reports success without verifying the
    application actually started.

</details>

### Script 4: Log Analyzer

```bash
#!/bin/bash
set -e

LOGFILE=$1
PATTERN=${2:-ERROR}

total=0
cat $LOGFILE | while read line; do
  if echo "$line" | grep -q "$PATTERN"; then
    total=$((total + 1))
    echo "Found: $line"
  fi
done

echo "Total matches: $total"
```

**Bugs to find:**

<details>
<summary>Bug list</summary>

1. **Pipeline subshell bug** (Step 2) - `cat $LOGFILE | while ...` runs the while loop
   in a subshell. `$total` is always 0 in the parent. This is the classic bug from
   Step 2's Pipeline Pitfalls challenge.
2. **Missing `-u` and `-o pipefail`** from the set flags.
3. **Unquoted `$LOGFILE`** in cat - breaks on paths with spaces.
4. **`cat $LOGFILE |`** is useless use of cat - use `while ... done < "$LOGFILE"`.
5. **`while read line`** missing `IFS=` and `-r` - leading/trailing whitespace is
   stripped and backslashes are interpreted. Should be `while IFS= read -r line`.
6. **`echo "$line" | grep -q`** forks grep for every line - extremely slow. Should use
   `[[ "$line" =~ $PATTERN ]]` (BASH_REMATCH, Section 4) or restructure to use a single
   grep invocation.
7. **No validation of `$1`** - if missing, `cat` reads from stdin (blocking forever).
8. **`echo` instead of `printf`**.
9. **Entire script could be replaced by `grep -c "$PATTERN" "$LOGFILE"`** - the agent
   has rebuilt grep badly.

</details>

### Script 5: File Processor

```bash
#!/usr/bin/env bash
set -euo pipefail

tmpfile=$(mktemp)
output=""

process_file() {
  local file=$1
  local count=$(wc -l < $file)
  output="$output$file: $count lines\n"
  cp $file $tmpfile
  # do some processing on tmpfile
  sed -i 's/foo/bar/g' $tmpfile
  cat $tmpfile >> /tmp/processed_output.txt
}

for f in $@; do
  process_file $f
done

echo -e "$output"
rm $tmpfile
```

**Bugs to find:**

<details>
<summary>Bug list</summary>

1. **No cleanup trap** - if the script fails, `$tmpfile` is never removed. The explicit
   `rm $tmpfile` at the end only runs on successful completion.
2. **`$@` unquoted in the for loop** - breaks on filenames with spaces. Must be
   `"$@"`.
3. **`$file` and `$tmpfile` unquoted** in `wc`, `cp`, `sed`, and `cat` - breaks on
   paths with spaces.
4. **`output` is a global variable modified in a function** - not declared local,
   which works here but is poor practice.
5. **`echo -e "$output"`** - non-portable, uses echo with flags (standing order
   violation). `\n` in the string is interpreted by `-e`. Should use `printf '%b' "$output"`
   or better yet, print each line individually.
6. **Single tmpfile reused across all files** - if `process_file` is called for multiple
   files, each call overwrites the tmpfile. The "processing" from the previous file is
   lost.
7. **`/tmp/processed_output.txt` is hardcoded** - no way to specify output location, and
   if the file already exists, results are appended to stale data.
8. **`$1` unquoted in `local file=$1`** - should be `local file="$1"`.
9. **`$(wc -l < $file)` - `$file` unquoted** inside the command substitution.
10. **No validation** - missing files, no arguments, permissions not checked.

</details>

### Scoring Yourself

For each script, count the bugs you found before reading the answers:

- **8+ per script** - you have internalized the patterns. You can review agent-generated
  scripts effectively.
- **5-7 per script** - good foundation, but some categories are not yet automatic.
  Review the topics you missed.
- **Under 5 per script** - go back to the relevant steps and re-read the sections on
  quoting (Step 2), error handling (Step 2), and cleanup (this step).

shellcheck will catch many of these bugs automatically. The skill you are building is
catching the bugs shellcheck cannot: architectural issues (no rollback, no health check),
process model bugs (pipeline subshell), and design problems (rebuilding grep badly).

---

## Bootcamp Complete

You have completed all twelve steps.

### The Journey

| Step | Topic | What You Gained |
|------|-------|-----------------|
| 1 | Process model | fork/exec, file descriptors, pipes, signals - the substrate everything runs on |
| 2 | Shell language | POSIX sh and bash - the language of process composition |
| 3 | Filesystem as state | Paths, permissions, /proc, /sys - the stateful namespace |
| 4 | Text pipeline | grep, sed, awk, jq - the data transformation layer |
| 5 | Python CLI tools | When shell hits its ceiling - structured data, complex logic, libraries |
| 6 | Make/Just | Orchestration of shell recipes - dependency graphs and build systems |
| 7 | Git internals | Beyond porcelain - objects, refs, the DAG that tracks all state |
| 8 | Process observation | strace, lsof, ss - seeing what processes actually do |
| 9 | Container internals | Namespaces, cgroups, overlay filesystems - processes in boxes |
| 10 | Networking CLI | curl, openssl, dig, tcpdump - diagnosing every network layer |
| 11 | Process supervision | systemd, cron - keeping processes alive and scheduled |
| 12 | Advanced bash | trap, arrays, BASH_REMATCH, production patterns - reliability |

### What You Can Do Now

You can read any agent-generated shell script, pipeline, Makefile, Dockerfile, systemd
unit, or Python CLI tool and identify what it does, what it gets wrong, and why. Not
because you memorised a list of gotchas, but because you understand the substrate.

When an agent constructs a pipeline that silently drops data, you see the subshell
boundary. When it writes a cleanup script that cannot survive SIGKILL, you know why -
SIGKILL is untrappable (Step 1). When it generates a Dockerfile with bash syntax in a
`/bin/sh` context, you see the POSIX violation (Step 2). When it produces a systemd unit
that does not handle reloads, you recognise the missing signal handler (Step 11). When it
writes a script without `set -euo pipefail` and a cleanup trap, you know the failure modes
it has left open (Steps 2, 12).

This is the Operator's verification capacity. It does not replace the agent's ability to
generate code. It provides the independent judgment that keeps the agent's output honest.
The agent generates fluently. You verify accurately. That combination is the agentic
engineering model.

### What This Does Not Cover

This bootcamp is the substrate layer - Linux, shell, processes, filesystems, networking.
It does not cover:

- Application-layer frameworks (React, Django, Rails)
- Cloud provider APIs (AWS, GCP, Azure)
- Database internals (query planners, index structures, replication)
- Machine learning infrastructure (training, inference, deployment)
- Security beyond basic permissions and TLS

These are the layers above the substrate. They change faster, depend on the substrate,
and are better documented. With the substrate understood, learning any of them is a
matter of reading documentation - not a matter of building missing mental models.

### The Standing Principle

Do not infer what you can verify. If an agent's output looks right, verify it. If a
pipeline's behaviour is unclear, trace it. If a script's cleanup logic seems complete,
test it with SIGTERM. The tools from these twelve steps make verification fast and
definitive. Use them.

---

## Quick Reference: Production Script Checklist

When reviewing any agent-generated bash script, check:

```
[ ] Shebang: #!/usr/bin/env bash (not #!/bin/sh unless POSIX-only)
[ ] set -euo pipefail
[ ] trap cleanup EXIT (if script creates temp files or background processes)
[ ] All variables quoted ("$var", "${arr[@]}")
[ ] Input validation (arguments checked before use)
[ ] printf instead of echo (the standing order)
[ ] BASH_SOURCE for self-referencing paths (not $0)
[ ] main "$@" pattern (parse before execute)
[ ] shellcheck passes with no warnings
[ ] Cleanup function handles partial state (uses ${var:-} for possibly unset vars)
[ ] Exit codes: 0 success, 1 user error, 2 system error
[ ] Logging to stderr, output to stdout
[ ] No useless use of cat
[ ] find with -exec or -print0 (not $(find ...) in a for loop)
[ ] Arrays for file lists (not space-separated strings)
```

---

## Quick Reference: Bash Features Not In POSIX sh

Keep this table when deciding whether a feature is safe in a `#!/bin/sh` script.

| Feature | POSIX sh | Bash | Used in this step |
|---------|----------|------|-------------------|
| `[[ ]]` | No | Yes | Sections 4, 9 |
| Indexed arrays | No | Yes | Section 2 |
| Associative arrays | No | 4.0+ | Section 3 |
| `BASH_REMATCH` | No | Yes | Section 4 |
| Process substitution `<()` | No | Yes | Section 5 |
| Coprocesses | No | 4.0+ | Section 6 |
| `select` | No | Yes | Section 7 |
| `printf -v` | No | Yes | Section 8 |
| `printf '%()T'` | No | 4.2+ | Section 8 |
| `set -o pipefail` | No | Yes | Section 9 |
| `shopt` | No | Yes | Section 9 |
| `BASH_SOURCE` | No | Yes | Section 9 |
| `trap ... ERR` | No | Yes | Section 1 |
| `trap ... DEBUG` | No | Yes | Section 1, 10 |

---

## What to Read Next

This is the final step in Bootcamp I. The twelve-step substrate layer is complete.

If you are ready to continue, [Bootcamp II: How LLMs Work](/bootcamp/ii-01-how-llms-work/) picks up where this leaves off - moving from the execution substrate to the model layer.

If you completed the bootcamp linearly, go back to the steps you rushed through. The
material rewards re-reading with deeper understanding. Step 1 (process model) and Step 2
(shell language) in particular - they are the foundation, and everything you learned in
Steps 3 through 12 adds context that makes them richer on a second pass.

If you want to go deeper on specific topics:

- **Advanced shell:** "The Bash Reference Manual" (GNU) is the authoritative source.
  Read it section by section - it is not a tutorial, it is a specification.
- **Shell portability:** "The POSIX Shell and Utilities" specification (IEEE 1003.1).
  Dry but definitive.
- **shellcheck wiki:** Each diagnostic code (SC1000-SC2999) has a detailed explanation
  with examples at https://www.shellcheck.net/wiki/
- **Process model:** "Advanced Programming in the UNIX Environment" (Stevens, Rago). The
  book that defines the territory.
- **Linux internals:** "The Linux Programming Interface" (Kerrisk). The modern reference
  for everything in Steps 1, 3, 8, and 9.

> **HISTORY:** The Bourne shell was written by Stephen Bourne at Bell Labs and released
> in Version 7 Unix (1979). Bash was written by Brian Fox for the GNU Project in 1989.
> The POSIX shell standard was published in 1992. Bash 4.0 (with associative arrays and
> coprocesses) was released in 2009. Bash 5.0 was released in 2019. The shell has been
> evolving for over 45 years, and it remains the primary interface between humans and Unix
> systems, and between agents and Unix systems. Understanding it is not optional.

```


---

## Output Requirements

1. Write your narrative assessment (Section 1)
2. End with the structured YAML findings block (Section 2)
3. Use `prompt_id: 1` and `prompt_name: "repackaging"` in your YAML header
4. Use `model: "grok"` in your YAML header
5. Classify each finding with an attack vector from the taxonomy
6. Be honest. If the criticism does not hold up, say so.
