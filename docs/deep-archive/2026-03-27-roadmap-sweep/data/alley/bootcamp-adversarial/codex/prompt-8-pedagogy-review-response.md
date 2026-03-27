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
session id: 019cd854-4fd8-79a1-b1c9-9135479894c9
--------
user
# Adversarial Review Dispatch
# Model: codex | Prompt: 8 | Name: pedagogy-review
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

The Pedagogy Review

Read `sites/oceanheart/content/bootcamp/01-process-model.md` and `sites/oceanheart/content/bootcamp/05-python-cli-tools.md` in full.

**Your task:** Evaluate the pedagogical design as if you were an experienced technical educator.

- Is the progression within each step well-ordered? Does each section build on the previous one?
- Are the challenges well-designed? Do they test understanding or just recall?
- Are the time estimates realistic for the target audience?
- Is the difficulty calibrated correctly? Where would a learner get stuck?
- Are there conceptual leaps that are too large - places where the author assumes knowledge that hasn't been covered yet?
- Compare the pedagogical approach to one well-regarded technical book (e.g., Stevens' APUE, Kerrisk's TLPI, Kernighan & Pike's Unix Programming Environment). Does this hold up?

Be honest about both strengths and weaknesses.

---

---

## Source Material

Read the following files carefully before responding. These are the complete contents.


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

### File: `sites/oceanheart/content/bootcamp/05-python-cli-tools.md`

```
+++
title = "Python as a CLI Tool - The Escape Hatch from Shell Complexity"
date = "2026-03-10"
description = "The escape hatch from shell complexity. stdin/stdout, exit codes, argparse, subprocess, uv."
tags = ["python", "cli", "subprocess", "uv", "argparse", "bootcamp"]
step = 5
tier = 1
estimate = "4 hours"
bootcamp = 1
+++

Step 5 of 12 in the Agentic Engineering Bootcamp.

---

**Prerequisites:** Steps 1-4 (process model, shell language, filesystem, text pipeline)
**Key dependency:** understanding that processes communicate via stdin/stdout/stderr and exit codes

---

## Overview

This is not "learn Python." You already know Python. This is "learn Python as a Unix
citizen" - a process that reads stdin, writes stdout, returns exit codes, and composes
with other processes in pipelines. The boundary between shell and Python is one of the
most important judgment calls in agentic engineering. Get it wrong in either direction
and you create maintenance problems: shell scripts that should be Python (brittle,
untestable, unreadable past 30 lines) or Python scripts that should be shell (over-
engineered, slow to write, poor composition).

This project enforces a standing order: **Python uses `uv` exclusively (SD-310, no
exceptions).** Every Python example in this step uses `uv run`.

---

## 1. The Shell-Python Boundary (~30 min)

The single most valuable concept in this step. Everything else is mechanics.

### When to Use Shell

- **Process composition** - wiring programs together with pipes
- **File manipulation** - mv, cp, mkdir, chmod, find + xargs
- **Simple text transforms** - grep, sed, awk, cut, sort, uniq (Step 4 tools)
- **Glue between programs** - "run A, check exit code, run B"
- **One-liners and short scripts** - under ~30 lines

Shell is at its best when the problem is: "take the output of this program and feed it
to that program." That is what shell was designed for. It is a process orchestration
language, not a general-purpose programming language.

### When to Use Python

- **Data structures beyond strings** - dicts, lists, nested objects, anything that is not
  a flat stream of lines
- **Complex error handling** - try/except, cleanup logic, transactional operations
- **JSON/YAML processing with logic** - not just extraction (jq does that), but
  transformation with conditionals, validation, cross-referencing
- **Anything over ~30 lines** - shell's readability degrades fast
- **Anything that needs tests** - testing shell is painful; testing Python is natural
- **Complex argument parsing** - subcommands, typed arguments, help generation

### The Litmus Test

> Can I express this as a pipeline of existing tools?

If yes, use shell. If no, use Python.

```bash
# YES - this is a pipeline of existing tools. Shell wins.
git log --format='%H %s' | grep 'fix:' | wc -l

# NO - this requires parsing YAML, matching findings across files,
# computing similarity scores. Python wins.
# (This is exactly what bin/triangulate does.)
```

### Anti-Patterns

**Python that shells out for things Python does natively:**

```python
# BAD - why are you shelling out to grep from Python?
import os
result = os.system("grep -r 'TODO' src/")

# GOOD - use Python's own capabilities
from pathlib import Path
for f in Path("src").rglob("*"):
  if f.is_file():
    for i, line in enumerate(f.read_text().splitlines(), 1):
      if "TODO" in line:
        print(f"{f}:{i}: {line.strip()}")

# ALSO GOOD - if you really want grep's behavior, use subprocess properly
import subprocess
result = subprocess.run(["grep", "-r", "TODO", "src/"], capture_output=True, text=True)
print(result.stdout)
```

**Shell that generates Python to eval:**

```bash
# BAD - fragile, undebuggable, injection risk
python3 -c "
import json
data = json.loads('$(cat data.json)')
print(data['key'])
"

# GOOD - write a proper script or pipe via stdin
cat data.json | python3 -c "import json, sys; print(json.loads(sys.stdin.read())['key'])"

# BEST - just use jq
jq '.key' data.json
```

> **AGENTIC GROUNDING:** Agents frequently generate scripts at the wrong level -
> Python scripts that call `os.system("ls")` or shell scripts with inline Python
> heredocs. Recognising the boundary lets you redirect an agent to the correct tool
> before it generates something fragile. The litmus test ("pipeline of existing
> tools?") is fast enough to apply in real-time during agent review.

---

## 2. Python as a Unix Process (~30 min)

Everything from Step 1 applies. A Python script is a process with file descriptors 0,
1, and 2. It receives signals. It returns an exit code. It can be on either end of a
pipe.

### Standard Streams

```python
import sys

# These ARE file descriptors 0, 1, 2 from Step 1
sys.stdin   # fd 0 - reads input
sys.stdout  # fd 1 - writes output (print() goes here)
sys.stderr  # fd 2 - writes errors/diagnostics

# Reading all of stdin at once
data = sys.stdin.read()

# Reading stdin line by line (memory-efficient for large inputs)
for line in sys.stdin:
  process(line.rstrip('\n'))

# Writing to stdout
print("result")                    # adds newline
sys.stdout.write("result\n")      # explicit newline

# Writing diagnostics to stderr (so they don't pollute stdout in a pipe)
print("warning: something odd", file=sys.stderr)
```

### Binary Mode

When processing binary data through pipes (images, compressed data, protocol buffers),
the text-mode wrappers will corrupt the data. Use the buffer attribute:

```python
import sys

# Read binary from stdin
raw = sys.stdin.buffer.read()

# Write binary to stdout
sys.stdout.buffer.write(raw)
```

### Exit Codes

From Step 1, you know exit codes. Python controls them with `sys.exit()`:

```python
import sys

sys.exit(0)   # success - same as the process ending normally
sys.exit(1)   # failure - general error
sys.exit(2)   # usage error - bad arguments (convention from BSD)

# Non-zero means failure. The calling shell checks with $?
# set -e in a shell script will abort on non-zero
# subprocess.run(check=True) will raise on non-zero
```

### Signal Handling

From Step 1, you know signals. Python can catch them:

```python
import signal
import sys

def handle_sigterm(signum, frame):
  """Clean shutdown - flush buffers, close files, exit cleanly."""
  sys.stderr.write("Received SIGTERM, shutting down\n")
  sys.exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)  # Ctrl+C
```

This matters for long-running CLI tools (daemons, watchers). For short scripts, the
default handler (terminate) is usually fine.

### Participating in Pipes

A well-behaved Python CLI tool composes with other tools exactly like grep or awk:

```bash
# Python script in the middle of a pipeline
curl -s https://api.example.com/data | python3 filter.py --status active | sort | head -20

# Python script at the start
python3 generate_report.py | grep 'CRITICAL' | mail -s 'Alert' admin@example.com

# Python script at the end
cat server.log | python3 parse_errors.py --format json > errors.json
```

> **AGENTIC GROUNDING:** When an agent generates a Python script, check: does it read
> from stdin when appropriate? Does it write to stdout? Does it use proper exit codes?
> A script that only reads from hardcoded file paths and prints "Done!" is not a Unix
> citizen - it cannot participate in pipelines. The composability of agent-generated
> tools directly determines whether they can be chained into larger workflows.

> **HISTORY:** Python's `sys.stdin`/`sys.stdout`/`sys.stderr` are thin wrappers around
> the C library's `stdin`/`stdout`/`stderr` file pointers, which are themselves wrappers
> around file descriptors 0, 1, 2 that you learned about in Step 1. The abstraction
> layers are: kernel fd -> C FILE* -> Python file object. Same bytes, different handles.

---

## 3. Argument Parsing (~45 min)

### argparse - The Standard Library Approach

`argparse` is verbose but complete. It handles positional arguments, optional flags,
types, choices, defaults, subcommands, and auto-generated help text. It is what this
project uses (see `scripts/backlog.py`).

```python
import argparse
import sys

def main():
  parser = argparse.ArgumentParser(
    prog="mytool",
    description="Process data files and output results",
  )

  # Positional argument
  parser.add_argument("input", help="Input file (use - for stdin)")

  # Optional arguments
  parser.add_argument("--format", "-f", choices=["json", "text", "csv"],
                      default="text", help="Output format (default: text)")
  parser.add_argument("--quiet", "-q", action="store_true",
                      help="Suppress non-essential output")
  parser.add_argument("--output", "-o", default="-",
                      help="Output file (default: stdout)")

  args = parser.parse_args()

  # Handle the Unix convention: - means stdin
  if args.input == "-":
    data = sys.stdin.read()
  else:
    from pathlib import Path
    data = Path(args.input).read_text()

  # Process...
  result = process(data, args.format)

  # Handle output
  if args.output == "-":
    sys.stdout.write(result)
  else:
    Path(args.output).write_text(result)

  if not args.quiet:
    print(f"Processed {len(data)} bytes", file=sys.stderr)

if __name__ == "__main__":
  main()
```

### Subcommands with argparse

The pattern used by `scripts/backlog.py` in this project. One tool, multiple operations:

```python
import argparse
import sys

def cmd_add(args):
  """Add a new item."""
  print(f"Added: {args.title} [priority={args.priority}]")

def cmd_list(args):
  """List items."""
  print("Listing items...")

def cmd_show(args):
  """Show a single item."""
  print(f"Showing: {args.id}")

def main():
  parser = argparse.ArgumentParser(prog="mytool")
  sub = parser.add_subparsers(dest="command")

  # mytool add "title" --priority high
  p_add = sub.add_parser("add", help="Add a new item")
  p_add.add_argument("title", help="Item title")
  p_add.add_argument("--priority", "-p", default="medium",
                      choices=["high", "medium", "low"])

  # mytool list --status open
  p_list = sub.add_parser("list", help="List items")
  p_list.add_argument("--status", "-s", default="open")

  # mytool show BL-001
  p_show = sub.add_parser("show", help="Show item details")
  p_show.add_argument("id", help="Item ID")

  args = parser.parse_args()

  if not args.command:
    parser.print_help()
    sys.exit(2)

  # Dispatch to the right handler
  {"add": cmd_add, "list": cmd_list, "show": cmd_show}[args.command](args)

if __name__ == "__main__":
  main()
```

### The `-` Convention for stdin

Unix tools universally accept `-` to mean "read from stdin instead of a file." Your
Python CLI tools should too:

```python
import sys
from pathlib import Path

def read_input(path_arg: str) -> str:
  """Read from a file path, or stdin if path is '-'."""
  if path_arg == "-":
    return sys.stdin.read()
  return Path(path_arg).read_text()
```

### Other Parsing Libraries (Mentioned, Not Deep-Dived)

- **click** - decorator-based. Cleaner for complex CLIs with many subcommands. Uses
  decorators instead of parser construction. `@click.command()`, `@click.option()`.
- **typer** - type-hint-based. Modern, uses click underneath. Function signatures
  become the CLI interface. `def main(name: str, count: int = 1):` becomes
  `--name` and `--count` flags automatically.

Both are good. This project uses `argparse` because it has zero external dependencies.

> **HISTORY:** Python's argparse descends from optparse, which descends from getopt,
> which descends from the C `getopt()` function standardized in POSIX. The convention
> of `-f` for short flags and `--file` for long flags comes from GNU `getopt_long()`
> (1990s). The `-` for stdin convention predates all of these - it comes from the
> original Unix utilities of the 1970s.

---

## 4. The `uv` Ecosystem (~45 min)

**Standing order SD-310: Python uses `uv` exclusively, no exceptions.**

`uv` is a Python package manager and project tool written in Rust. It replaces pip,
pipx, virtualenv, poetry, and pdm with a single tool that is 10-100x faster and
produces deterministic dependency resolution.

### Core Commands

```bash
# Run a Python script (creates/uses a virtual environment automatically)
uv run script.py

# Run a script with inline dependency metadata (PEP 723)
uv run --script script.py

# Install packages into the project's virtual environment
uv pip install pyyaml requests

# Create a virtual environment
uv venv

# Initialize a new Python project
uv init myproject

# Add a dependency to the project
uv add requests

# Sync dependencies (install what pyproject.toml declares)
uv sync
```

### PEP 723 - Inline Script Metadata

This is the mechanism that makes single-file Python scripts self-contained. The script
declares its own dependencies in a comment block:

```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6.0", "requests>=2.28"]
# ///
"""My script that needs PyYAML and requests."""

import yaml
import requests
# ... rest of the script
```

When you run `uv run --script this_file.py`, `uv` reads the metadata comment, installs
the declared dependencies into an isolated environment, and runs the script. No
requirements.txt. No pyproject.toml. No manual `pip install`. One file, everything
declared inline.

### The Shebang Pattern

Combine the PEP 723 metadata with a shebang line and the script becomes directly
executable:

```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6.0"]
# ///
```

Then:

```bash
chmod +x myscript.py
./myscript.py  # uv handles dependencies and execution
```

### Real Example: bin/triangulate

This project's `bin/triangulate` uses exactly this pattern. Examine its first 5 lines:

```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6.0"]
# ///
```

It is a 979-line Python CLI tool that parses structured YAML review files, computes
cross-model triangulation metrics, and outputs human-readable summaries or machine-
readable YAML. It is executable directly:

```bash
bin/triangulate summary review1.yaml review2.yaml review3.yaml
bin/triangulate metrics review1.yaml review2.yaml --match-threshold 0.7
```

The shebang makes `uv` handle everything. No activation of virtual environments. No
`python3 bin/triangulate`. Just `bin/triangulate`.

### Why uv Over pip/pipx/poetry/pdm

| Concern | uv | pip + venv | poetry | pdm |
|---------|----|-----------|--------|-----|
| Speed | 10-100x faster | baseline | ~1x | ~1x |
| Single tool | yes | no (pip + venv + pip-tools) | yes | yes |
| Lock file | yes | no (needs pip-tools) | yes | yes |
| Inline deps (PEP 723) | yes | no | no | no |
| Rust-based | yes | no | no | no |
| Drop-in pip compat | yes | n/a | no | partial |

The speed difference is not marginal. On a cold install of a project with 50
dependencies, pip takes 15-30 seconds. uv takes under 1 second. In an agentic
workflow where agents may spin up scripts frequently, this matters.

### uv Quick Reference

```bash
# Run scripts
uv run script.py                    # run with project deps
uv run --script script.py           # run with inline PEP 723 deps
uv run python -c "import sys; ..."  # run inline Python

# Package management
uv pip install <pkg>                # install into current venv
uv pip install -r requirements.txt  # install from requirements
uv add <pkg>                        # add to pyproject.toml + install
uv remove <pkg>                     # remove from pyproject.toml
uv sync                             # sync venv to pyproject.toml lockfile

# Environment management
uv venv                             # create .venv in current dir
uv venv --python 3.12               # specify Python version
uv python install 3.12              # install a Python version
uv python list                      # list available Pythons

# Project scaffolding
uv init myproject                   # new project with pyproject.toml
uv init --script myscript.py        # new script with PEP 723 metadata
```

> **AGENTIC GROUNDING:** When an agent needs to run a Python script with dependencies,
> the correct invocation is `uv run --script script.py` with inline PEP 723 metadata.
> If you see an agent writing `pip install` or creating requirements.txt for a one-off
> script, redirect it to the uv pattern. The project's standing order is unambiguous.

> **HISTORY:** PEP 723 (2024) is recent. Before it, single-file Python scripts with
> dependencies required either a companion requirements.txt, a pyproject.toml, or
> manual `pip install` by the user. PEP 723 solves the "I want to share one .py file
> that just works" problem. The `# /// script` marker is inspired by TOML-in-comments
> patterns from other ecosystems.

---

## 5. subprocess - Composing Processes from Python (~30 min)

When Python needs to invoke external programs, `subprocess` is the correct module.
Not `os.system()`. Not `os.popen()`. Not `commands.getoutput()`. Those are all
deprecated or dangerous. Use `subprocess.run()`.

### The One Function You Need

```python
import subprocess

# Basic: run a command, check for errors
result = subprocess.run(
  ["git", "log", "--oneline", "-5"],
  capture_output=True,  # capture stdout and stderr
  text=True,            # decode bytes to str
  check=True,           # raise CalledProcessError on non-zero exit
)
print(result.stdout)
```

### Why List Form, Not String Form

```python
# GOOD - list form. Each argument is a separate element.
# No shell injection possible. No quoting bugs.
subprocess.run(["grep", "-r", "TODO", "src/"])

# BAD - string form with shell=True. Shell interprets the string.
# Injection risk if any part comes from user input.
subprocess.run("grep -r TODO src/", shell=True)
```

The list form bypasses the shell entirely - the kernel's `execvp()` receives the
argument array directly. This is safer and more predictable. Only use `shell=True`
when you specifically need shell features (glob expansion, pipes, variable
substitution) and the input is fully trusted.

### Common Patterns

```python
import subprocess
import sys

# Check if a command succeeded (exit code only)
result = subprocess.run(["pnpm", "run", "typecheck"], capture_output=True, text=True)
if result.returncode != 0:
  print("Typecheck failed:", file=sys.stderr)
  print(result.stderr, file=sys.stderr)
  sys.exit(1)

# Get command output as a string
version = subprocess.run(
  ["git", "describe", "--tags", "--always"],
  capture_output=True, text=True, check=True,
).stdout.strip()

# Run with a timeout (seconds)
try:
  subprocess.run(["long-task"], timeout=30, check=True)
except subprocess.TimeoutExpired:
  print("Task timed out after 30s", file=sys.stderr)
  sys.exit(1)

# Pass stdin to a subprocess
result = subprocess.run(
  ["python3", "-c", "import sys; print(sys.stdin.read().upper())"],
  input="hello world",
  capture_output=True, text=True, check=True,
)
print(result.stdout)  # "HELLO WORLD\n"
```

### When to Use subprocess vs Doing It in Python

Use subprocess when:
- An external tool does the job better (git, curl, ffmpeg, jq)
- You need the exact behavior of a specific program
- You are wrapping a system tool with additional logic

Do it in Python when:
- Python's stdlib does it (file I/O, string processing, JSON, HTTP)
- You need the result as a Python data structure, not text
- The external tool would require parsing text output back into structured data

```python
# subprocess is correct here - git is the authority on git state
branch = subprocess.run(
  ["git", "rev-parse", "--abbrev-ref", "HEAD"],
  capture_output=True, text=True, check=True,
).stdout.strip()

# Python is correct here - no need to shell out for JSON
import json
data = json.loads(Path("config.json").read_text())
```

### Multi-Process Pipelines (Rare)

If you need to chain multiple processes with pipes from Python, you can use
`subprocess.Popen`. But this is rare - if the problem is "chain processes with
pipes," shell is usually the better tool:

```python
# This is possible but awkward in Python
from subprocess import Popen, PIPE

p1 = Popen(["cat", "data.txt"], stdout=PIPE)
p2 = Popen(["grep", "error"], stdin=p1.stdout, stdout=PIPE)
p1.stdout.close()  # allow p1 to receive SIGPIPE if p2 exits
output = p2.communicate()[0]

# Same thing in shell - cleaner
# cat data.txt | grep error
```

If you find yourself building complex Popen pipelines in Python, step back and ask
whether shell should be orchestrating the pipeline and Python should be one stage in it.

---

## 6. File and Path Handling (~30 min)

### pathlib.Path - The Modern Approach

`pathlib` (stdlib since Python 3.4) replaces `os.path` for almost everything. It is
object-oriented, composable, and reads naturally:

```python
from pathlib import Path

# Construction
p = Path("docs/internal/backlog.yaml")
p = Path.home() / ".config" / "myapp" / "settings.json"
p = Path(__file__).parent  # directory containing the current script

# Reading and writing
text = p.read_text(encoding="utf-8")
p.write_text("new content", encoding="utf-8")
raw = p.read_bytes()
p.write_bytes(b"\x00\x01\x02")

# Inspection
p.exists()
p.is_file()
p.is_dir()
p.name          # "backlog.yaml"
p.stem          # "backlog"
p.suffix        # ".yaml"
p.parent        # Path("docs/internal")

# Directory operations
p.mkdir(parents=True, exist_ok=True)  # like mkdir -p

# Globbing
for f in Path("lib").rglob("*.ts"):
  print(f)
```

### Atomic Writes

From Step 3, you learned that writes are not atomic - a crash mid-write corrupts
the file. The safe pattern: write to a temporary file, then rename (which is atomic
on the same filesystem):

```python
import os
import tempfile
from pathlib import Path

def atomic_write(path: Path, content: str) -> None:
  """Write content to a file atomically via temp + rename."""
  # Create temp file in the same directory (same filesystem = atomic rename)
  fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
  try:
    with os.fdopen(fd, "w") as f:
      f.write(content)
    os.rename(tmp_path, path)  # atomic on same filesystem
  except Exception:
    os.unlink(tmp_path)  # clean up on failure
    raise
```

### Structured Data Formats

```python
import json
from pathlib import Path

# JSON
data = json.loads(Path("config.json").read_text())
Path("output.json").write_text(json.dumps(data, indent=2) + "\n")

# YAML (requires pyyaml - declare in PEP 723 metadata)
import yaml
data = yaml.safe_load(Path("config.yaml").read_text())
yaml.dump(data, open("output.yaml", "w"), default_flow_style=False, sort_keys=False)

# TOML (stdlib in Python 3.11+)
import tomllib
with open("pyproject.toml", "rb") as f:
  data = tomllib.load(f)
```

Always use `yaml.safe_load()`, never `yaml.load()`. The latter can execute arbitrary
Python code embedded in the YAML. This is a real security vulnerability, not a
theoretical one.

---

## 7. Structured Output (~20 min)

A CLI tool needs to serve two audiences: humans reading terminal output and machines
parsing structured data.

### The Convention

- **Default:** human-readable text to stdout
- **`--json` flag:** machine-readable JSON to stdout
- **`--quiet` / `-q` flag:** suppress non-essential output (exit code is the signal)
- **Diagnostics:** always to stderr (never pollute the data stream)

```python
import json
import sys

def output_results(results: list[dict], fmt: str, quiet: bool) -> None:
  if quiet:
    return  # only exit code matters

  if fmt == "json":
    json.dump(results, sys.stdout, indent=2)
    sys.stdout.write("\n")
  else:
    for r in results:
      status = "PASS" if r["ok"] else "FAIL"
      print(f"  [{status}] {r['name']}")
```

### Colored Output

Color is for humans. Detect whether stdout is a terminal before emitting ANSI codes:

```python
import sys

def supports_color() -> bool:
  """Check if stdout is a terminal that supports color."""
  return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()

# Usage
if supports_color():
  RED = "\033[31m"
  GREEN = "\033[32m"
  RESET = "\033[0m"
else:
  RED = GREEN = RESET = ""

print(f"{RED}ERROR{RESET}: something failed")
```

When your output is piped to another program (`mytool | grep error`), `isatty()` returns
False and the ANSI codes are suppressed. This is the correct behavior - ANSI codes in
piped data break downstream processing.

The project's `pitkeel/pitkeel.py` uses this pattern with named ANSI constants:

```python
BOLD = "\033[1m"
DIM = "\033[2m"
YELLOW = "\033[33m"
RED = "\033[31m"
CYAN = "\033[36m"
RESET = "\033[0m"
```

> **AGENTIC GROUNDING:** When reviewing agent-generated CLI tools, check for the
> `--json` / `--quiet` pattern. An agent tool that only outputs human-readable text
> cannot be composed into automated pipelines. An agent tool that always outputs JSON
> is unpleasant for human debugging. The dual-mode pattern serves both consumers.

---

## 8. The `if __name__ == "__main__":` Idiom (~10 min)

You have seen this a thousand times. Here is what it actually means.

When Python runs a file directly (`python3 myscript.py`), it sets that module's
`__name__` variable to `"__main__"`. When the same file is imported by another module
(`import myscript`), `__name__` is set to `"myscript"`.

The idiom gates execution:

```python
def main():
  # CLI logic here
  pass

if __name__ == "__main__":
  main()
```

This means:
- `python3 myscript.py` - runs `main()`. The file is a CLI tool.
- `import myscript` - does not run `main()`. The file is a library.
- `myscript.some_function()` - callable from both contexts.

This is the bridge between "Python module" and "Python CLI tool." It allows the same
file to be both importable (for testing, for reuse) and executable (for CLI use).

Every Python CLI tool in this project uses it:
- `scripts/backlog.py:301` - `if __name__ == "__main__": main()`
- `pitkeel/pitkeel.py:607` - `if __name__ == "__main__": main()`
- `bin/triangulate:977` - `if __name__ == "__main__": main()`

---

## 9. Testing CLI Tools (~20 min)

A CLI tool is a function from `(args, stdin, env)` to `(stdout, stderr, exit_code)`.
Test it as such.

### Testing with subprocess

The most realistic test: invoke your tool as a separate process, exactly as a user
or pipeline would:

```python
import subprocess
import json

def test_mytool_json_output():
  """Tool produces valid JSON with --json flag."""
  result = subprocess.run(
    ["python3", "mytool.py", "input.txt", "--format", "json"],
    capture_output=True, text=True,
  )
  assert result.returncode == 0
  data = json.loads(result.stdout)
  assert "results" in data

def test_mytool_missing_file():
  """Tool exits 1 when input file does not exist."""
  result = subprocess.run(
    ["python3", "mytool.py", "nonexistent.txt"],
    capture_output=True, text=True,
  )
  assert result.returncode == 1
  assert "not found" in result.stderr.lower()

def test_mytool_stdin():
  """Tool reads from stdin when given -."""
  result = subprocess.run(
    ["python3", "mytool.py", "-"],
    input="test data\n",
    capture_output=True, text=True,
  )
  assert result.returncode == 0
  assert "test data" in result.stdout
```

### Testing with pytest (Captured Output)

For testing the internal functions without process overhead:

```python
import io
import sys
from mytool import process_data, main

def test_process_data():
  """Internal function produces correct results."""
  result = process_data("input", format="json")
  assert result["count"] == 5

def test_main_help(capsys):
  """--help prints usage and exits 2."""
  try:
    sys.argv = ["mytool", "--help"]
    main()
  except SystemExit as e:
    assert e.code == 0
  captured = capsys.readouterr()
  assert "usage:" in captured.out.lower()
```

The subprocess approach tests the tool as a black box. The pytest approach tests
internals. Both are valuable. The subprocess test catches integration issues (wrong
shebang, import errors, PATH problems). The pytest test is faster and more targeted.

---

## 10. Jupyter Notebooks as a Learning Tool (~15 min)

Notebooks are useful for exploration and learning. They are not for production code.

### Running Notebooks with uv

```bash
# Install and run Jupyter
uv run jupyter lab
uv run jupyter notebook

# Or add jupyter to a project
uv add --dev jupyter
uv run jupyter lab
```

### Shell Integration in Notebooks

Jupyter cells can execute shell commands:

```python
# Single shell command (prefix with !)
!ls -la /proc/self/fd

# Multi-line shell (cell magic)
%%bash
for f in *.py; do
  wc -l "$f"
done

# Capture shell output in a Python variable
files = !find . -name "*.py" -type f
print(f"Found {len(files)} Python files")
```

### When Notebooks Are Appropriate

- **Exploration** - trying out APIs, parsing logic, data transformations
- **Data analysis** - looking at metrics, visualizing trends
- **Learning** - working through these bootcamp exercises interactively
- **Documentation** - showing step-by-step processes with output

### When Notebooks Are NOT Appropriate

- **Production code** - cannot be imported, tested, or composed
- **CI pipelines** - require Jupyter runtime, non-trivial to execute headlessly
- **Version control** - `.ipynb` is JSON with embedded output blobs; diffs are noisy
  and merge conflicts are painful
- **CLI tools** - a notebook is not a Unix process; it does not participate in pipes

The `.ipynb` format is JSON - which means `jq` can process it, `git` can diff it
(poorly), and `nbstripout` can clean it for version control. If you version-control
notebooks, use `nbstripout` as a git filter to strip output before commit.

> **AGENTIC GROUNDING:** Agents occasionally suggest Jupyter notebooks for tasks that
> should be scripts. If the task involves automation, composition, or execution in a
> pipeline, redirect to a proper Python CLI tool. Notebooks are for the human to
> explore - not for the system to execute.

---

## Bringing It Together: Anatomy of a Real CLI Tool

Look at `scripts/backlog.py` in this project. It demonstrates every concept:

| Concept | Where in backlog.py |
|---------|---------------------|
| Shebang | `#!/usr/bin/env python3` (line 1) |
| Module docstring as help | Lines 2-35 |
| argparse with subcommands | Lines 240-298 |
| Reading/writing YAML | `_read_backlog()` / `_write_backlog()` (lines 72-87) |
| Exit codes | `sys.exit(1)` on not-found (lines 179, 195, 216) |
| stderr for errors | `file=sys.stderr` (lines 49, 178, 194, 215) |
| stdout for data | `yaml.dump(item, sys.stdout, ...)` (line 176) |
| `if __name__ == "__main__"` | Line 301 |
| Default command (no subcommand) | Lines 283-289 |

And `bin/triangulate` demonstrates the uv-specific patterns:

| Concept | Where in triangulate |
|---------|---------------------|
| uv shebang | `#!/usr/bin/env -S uv run --script` (line 1) |
| PEP 723 metadata | Lines 2-5 |
| Subcommand dispatch | Lines 960-974 |
| Human-readable output | `format_summary()` (lines 528-655) |
| Machine-readable output | `yaml.dump()` to stdout (line 911) |
| Error to stderr | `print(..., file=sys.stderr)` (lines 859, 873-879) |

---

## Challenge: Pipeline Citizen (stdin/stdout) (~30 min)

Write a Python script `filter_items.py` that:

1. Reads JSON from stdin (an array of objects)
2. Accepts a `--field` and `--value` argument
3. Filters the array to items where `field == value`
4. Writes the filtered array to stdout as JSON
5. Exits 0 on success, 1 on invalid JSON, 2 on bad arguments

Test it in a pipeline:

```bash
# Generate test data
printf '[{"name":"alice","role":"admin"},{"name":"bob","role":"user"},{"name":"carol","role":"admin"}]'

# Use it in a pipeline
printf '[{"name":"alice","role":"admin"},{"name":"bob","role":"user"},{"name":"carol","role":"admin"}]' \
  | python3 filter_items.py --field role --value admin \
  | python3 -m json.tool

# Chain with jq
printf '[{"name":"alice","role":"admin"},{"name":"bob","role":"user"}]' \
  | python3 filter_items.py --field role --value admin \
  | jq '.[].name'
```

**Verify:** Does your tool work with file redirection? `python3 filter_items.py --field role --value admin < data.json > result.json`

**Extend:** Add `--json` (pretty-print) and `--quiet` (no output, exit code only) flags.

---

## Challenge: Rewrite a Shell Script in Python (~40 min)

Take this shell pipeline that analyzes git commit patterns:

```bash
#!/bin/bash
# Count commits per author per day for the last 30 days
git log --since="30 days ago" --format='%ad %an' --date=short \
  | sort \
  | uniq -c \
  | sort -rn \
  | head -20 \
  | while read count date author; do
      printf "%-12s %-20s %d\n" "$date" "$author" "$count"
    done
```

Rewrite it as a Python CLI tool that:

1. Accepts `--days` (default 30) and `--limit` (default 20) arguments
2. Supports `--json` output mode
3. Uses subprocess to call git (git is the authority on git data)
4. Does the counting and sorting in Python (data structures beat text manipulation here)
5. Includes proper exit codes and error handling

Compare the two versions:
- Which is shorter?
- Which handles edge cases better (author names with spaces, empty repos)?
- Which is easier to test?
- When would you choose the shell version? When the Python version?

---

## Challenge: CLI Tool with Subcommands (~45 min)

Build a small CLI tool called `tagstore` with argparse that manages a JSON file
of tags:

```bash
tagstore add "deployment" --color blue
tagstore list
tagstore list --color blue
tagstore show "deployment"
tagstore remove "deployment"
tagstore export --format json     # JSON to stdout
tagstore export --format csv      # CSV to stdout
tagstore import -                 # JSON from stdin
```

Requirements:

1. Data stored in `~/.tagstore.json`
2. Three subcommands minimum: `add`, `list`, `show`
3. `--json` output mode on `list` and `show`
4. `--quiet` mode (exit code only)
5. Proper exit codes: 0 success, 1 error, 2 usage
6. Atomic writes (temp + rename)
7. `import -` reads from stdin (the Unix convention)

Write tests that invoke the tool via subprocess and verify outputs and exit codes.

---

## Challenge: uv Script with Inline Dependencies (~20 min)

Write a single-file Python script `fetch_status.py` that:

1. Uses PEP 723 metadata to declare dependencies on `requests` and `rich`
2. Has the `#!/usr/bin/env -S uv run --script` shebang
3. Takes a URL as a positional argument (or reads URLs from stdin, one per line)
4. Fetches each URL and prints status code + response time
5. Uses `rich` for colored terminal output (with `isatty()` detection)
6. Has a `--json` flag for machine-readable output

```bash
# Make it executable
chmod +x fetch_status.py

# Run directly (uv handles dependencies)
./fetch_status.py https://example.com https://httpbin.org/status/404

# Read URLs from a file
cat urls.txt | ./fetch_status.py -

# Machine-readable output
./fetch_status.py --json https://example.com | jq '.status'
```

Verify that `uv run --script fetch_status.py` works on a fresh machine with no
pre-installed packages.

---

## Challenge: Atomic YAML Editor (~45 min)

Write a Python CLI tool `yamlmod` that safely modifies YAML files:

```bash
# Set a value (dot-notation path)
yamlmod set config.yaml "server.port" 8080

# Get a value
yamlmod get config.yaml "server.port"

# Delete a key
yamlmod delete config.yaml "server.debug"

# List keys at a path
yamlmod keys config.yaml "server"
```

Requirements:

1. Atomic writes via temp + rename (from Step 3 and Section 6 above)
2. File locking with `fcntl.flock()` for concurrent access safety
3. Dot-notation path traversal for nested keys
4. Proper error messages when paths do not exist
5. `--json` output for `get` (outputs the value as JSON)
6. Reads from stdin if the file argument is `-`

Test it against the project's `docs/internal/backlog.yaml` - read a value, modify it,
verify the modification, then restore the original.

```python
import fcntl

def locked_read_modify_write(path, modifier_fn):
  """Read YAML, apply modifier, write atomically, with file locking."""
  with open(path, "r+") as f:
    fcntl.flock(f, fcntl.LOCK_EX)  # exclusive lock
    try:
      data = yaml.safe_load(f)
      modifier_fn(data)
      atomic_write(Path(path), yaml.dump(data, default_flow_style=False))
    finally:
      fcntl.flock(f, fcntl.LOCK_UN)
```

---

## Challenge: Notebook - Python Pipeline Explorer (~30 min)

Create a Jupyter notebook `docs/bootcamp/notebooks/pipeline-explorer.ipynb` that:

1. Demonstrates reading from stdin in Python with `%%bash` cells piping to Python cells
2. Shows side-by-side comparisons of shell pipelines vs Python equivalents
3. Processes the project's `docs/internal/backlog.yaml` with both YAML parsing and
   `grep` / `yq` approaches
4. Measures timing differences between shell and Python approaches for the same task
5. Includes a cell that invokes `bin/triangulate parse` via subprocess

Use this to explore when shell is faster to write, when Python is faster to write, and
when the answer depends on the complexity of the data.

---

## What to Read Next

[Step 6: Make/Just as Orchestrators](/bootcamp/06-make-just-orchestration/) - now that you
know how to write Python CLI tools and shell scripts, you need to know how to compose
them into repeatable build/test/deploy workflows. Make (and its modern successor Just)
solve the orchestration problem: declaring targets, dependencies between them, and
recipes that invoke your tools. The project's `Makefile` orchestrates everything -
gate checks, gauntlet runs, polecat dispatch - using exactly the tools from Steps 2-5.

The dependency chain: processes (Step 1) compose into shell (Step 2), which operates
on files (Step 3), which transforms text (Step 4), which sometimes needs Python
(Step 5). Step 6 is the layer that orchestrates all of these into a coherent build
system.

---

## Summary: The Decision Tree

```
Need to run a command and check if it worked?
  -> Shell

Need to pipe program A's output to program B?
  -> Shell

Need to transform text line by line with simple patterns?
  -> Shell (grep/sed/awk from Step 4)

Need to process structured data (JSON/YAML) with logic?
  -> Python

Need data structures beyond strings?
  -> Python

Over 30 lines and growing?
  -> Python

Need tests?
  -> Python

Need to call an external tool from Python?
  -> subprocess.run() with list-form args

Need inline dependencies with no project setup?
  -> PEP 723 + uv run --script

Need subcommands?
  -> argparse subparsers
```

The boundary is not about preference. It is about selecting the tool whose strengths
match the problem's requirements. Shell composes processes. Python composes data
structures. Know which problem you have.

```


---

## Output Requirements

1. Write your narrative assessment (Section 1)
2. End with the structured YAML findings block (Section 2)
3. Use `prompt_id: 8` and `prompt_name: "pedagogy-review"` in your YAML header
4. Use `model: "codex"` in your YAML header
5. Classify each finding with an attack vector from the taxonomy
6. Be honest. If the criticism does not hold up, say so.

mcp: langsmith starting
mcp: stripe starting
mcp: auggie starting
mcp: helicone starting
mcp: posthog starting
mcp: sentry starting
mcp: codex_apps starting
mcp: context7 starting
mcp: linear-server starting
mcp: auggie ready
mcp: codex_apps ready
2026-03-10T15:18:51.867778Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when Auth(TokenRefreshFailed("Server returned error response: invalid_grant: Invalid refresh token"))
mcp: stripe failed: MCP client for `stripe` failed to start: MCP startup failed: handshaking with MCP server failed: Send message error Transport [rmcp::transport::worker::WorkerTransport<rmcp::transport::streamable_http_client::StreamableHttpClientWorker<rmcp::transport::auth::AuthClient<reqwest::async_impl::client::Client>>>] error: Auth error: OAuth token refresh failed: Server returned error response: invalid_grant: Invalid refresh token, when send initialize request
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
bearing: pedagogical adversarial review of Steps 1 and 5
last_known_position: source material loaded

Readback: I’m evaluating the sequencing, challenge design, difficulty calibration, and estimate realism in [Step 1] and [Step 5], then I’ll close with structured YAML findings using the required taxonomy.
codex
## Section 1: Narrative

The broad sequencing critique does not hold equally across both chapters. Step 1 is mostly well ordered. Process -> `fork`/`exec` -> file descriptors -> pipes -> signals -> lifecycle is the right dependency chain, and it maps closely to how a classic Unix text would build the mental model. In some ways it is better motivated than APUE or TLPI for this audience, because it keeps tying concepts back to real diagnostic practice with `/proc`, `strace`, exit codes, and pipeline failure modes. If the goal is to make an engineer supervising agents care about kernel primitives, the chapter does that well.

The main pedagogical problem in Step 1 is not section order. It is the mismatch between the claimed progression and the exercises. Several challenges require shell authoring skill before the shell step exists: writing a bash script with `trap`, demonstrating `set -e` and `pipefail`, and especially writing a bash function `fd_report()`. That is a real curricular dependency bug. A learner who genuinely starts here can understand the prose and still get stuck because the exercise medium has advanced ahead of the curriculum.

The other weakness in Step 1 is desirable difficulty. Too many challenges are direct reenactments of what was just shown. The `/proc/self` challenge mirrors the earlier command sequence almost one for one. The pipe challenge includes a full solution. The signal challenge gives a template plus expected exit codes. The pipeline failure challenge gives the key demonstration outright. That makes the work good as a lab, but weaker as assessment. It checks whether the learner can reproduce a demonstrated pattern, not whether they can predict behavior in a novel case or debug a broken one. A better design would include prediction tasks, intentionally broken pipelines, or “what will happen and why?” questions before execution.

Step 1 also opens a bit too hard for a step-1 document. Starting with `struct task_struct`, kernel header paths, and low-level bookkeeping is accurate, but it front-loads detail before giving the learner a simpler operational handle. APUE and TLPI usually earn that level of detail after the user-space behavior is stable in the learner’s head. Here, the chapter recovers because the examples are concrete, but some readers will hit unnecessary cognitive load in the first section.

Step 5 is less solid pedagogically. The shell/Python boundary is the right anchor concept, and the opening section is the strongest part of the chapter. After that, though, the step sprawls: stdin/stdout, signals, `argparse`, subcommands, `uv`, PEP 723, `subprocess`, `pathlib`, atomic writes, YAML safety, structured output, testing, notebooks, and then several capstone challenges. That is not one lesson. It is a compressed survey of a small internal tooling curriculum. Compared to a strong technical book, this is where it falls short: the classic texts usually make one chapter do one main job. This chapter keeps adding adjacent concerns, so retention is likely to be patchier than the author thinks.

The time estimates are also not credible, especially in Step 5. Step 5 claims 4 hours, but the section times alone total about 4 hours 35 minutes before challenges. The challenges then add roughly another 3 hours 30 minutes. Even allowing for optional work, the stated estimate is setting the learner up to feel slow when the document itself is overscoped. Step 1 is closer to plausible, but only if the reader is already comfortable in the shell and treats some exercises as skim rather than full execution.

One other issue in Step 5 is the “litmus test” for shell versus Python. It is a useful heuristic, but it is taught too absolutely: “If yes, use shell. If no, use Python.” The chapter itself later introduces exceptions based on maintainability, testing, complexity, and data shape. So the rule is pedagogically catchy, but not stable enough to be presented as the single most valuable concept without stronger caveats. A learner following it literally will overuse shell.

Compared to APUE, TLPI, or Kernighan and Pike, this material is stronger on modern operational relevance and weaker on instructional discipline. It reads like a sharp internal bootcamp handout written by someone who knows the material and wants the learner to acquire practical judgment quickly. It does not yet read like a self-study curriculum that has been pressure-tested against where learners actually stall.

## Section 2: Structured Findings

```yaml
review:
  model: "codex"
  date: "2026-03-10"
  prompt_id: 8
  prompt_name: "pedagogy-review"

findings:
  - id: F-001
    attack_vector: "AV-PEDAGOGY"
    severity: high
    claim_challenged: "Every concept in Step 2 is built on the process model from Step 1."
    evidence: "Step 1 Challenge 3 asks for a bash script with trap, Challenge 4 asks for a script using set -e and pipefail, and Challenge 6 asks for a bash function fd_report(), all before Step 2 teaches shell language."
    survives_scrutiny: true
    description: >
      The curriculum claims a clean dependency chain where shell comes after the
      process model, but the exercises violate that ordering. A learner can follow
      the prose in Step 1 and still fail the challenges because the exercise medium
      requires shell fluency that has not yet been taught. This is a real progression
      flaw, not a minor inconvenience, because it turns prerequisite knowledge into
      hidden curriculum.

  - id: F-002
    attack_vector: "AV-PEDAGOGY"
    severity: high
    claim_challenged: "estimate = \"4 hours\""
    evidence: "In Step 5, the section timing labels sum to about 275 minutes before any challenge work. The six challenges add roughly another 210 minutes."
    survives_scrutiny: true
    description: >
      The Step 5 estimate is materially unrealistic for self-study. Even if some
      challenges are optional, the document never clearly distinguishes required
      versus extension work, so the learner receives a false pace signal. That is a
      pedagogical defect because learners use stated duration to calibrate effort and
      judge whether they are keeping up. Here the estimate understates the workload by
      too much to be dismissed as ordinary variance.

  - id: F-003
    attack_vector: "AV-PEDAGOGY"
    severity: high
    claim_challenged: "These challenges are designed to be run on a Linux system ... Each one exercises a specific concept from this step."
    evidence: "Challenge 1 largely restages the exact /proc commands already shown. Challenge 2 includes a full solution. Challenge 3 provides a script template and expected exit codes. Challenge 4 includes the key demonstration in the hint."
    survives_scrutiny: true
    description: >
      The exercises mostly assess reproduction of demonstrated procedures, not transfer
      of understanding. A learner can complete much of the work by pattern matching
      against nearby examples without forming a durable mental model. Stronger pedagogy
      would force prediction, diagnosis, or adaptation to a new case, especially for
      topics like redirection order, SIGPIPE, or zombie reaping.

  - id: F-004
    attack_vector: "AV-COMPLETENESS"
    severity: medium
    claim_challenged: "The single most valuable concept in this step. Everything else is mechanics."
    evidence: "After the shell/Python boundary section, Step 5 covers Unix streams, signal handling, argparse, subcommands, uv, PEP 723, subprocess, pathlib, atomic writes, structured output, testing, notebooks, and several capstone exercises."
    survives_scrutiny: true
    description: >
      Step 5 is overscoped relative to its stated teaching objective. The opening claim
      suggests one central judgment call plus supporting mechanics, but the chapter
      actually tries to deliver a broad tooling survey. The likely result is shallow
      retention across too many adjacent topics. This would work better split into a
      core CLI chapter and a separate tooling/distribution chapter.

  - id: F-005
    attack_vector: "AV-PEDAGOGY"
    severity: medium
    claim_challenged: "This is Step 1 of 12 in the Agentic Engineering Bootcamp."
    evidence: "The first section introduces struct task_struct, include/linux/sched.h, approximate kernel bookkeeping size, PID 0 as idle task, page tables, and other low-level details before the learner has a simpler operational model anchored."
    survives_scrutiny: true
    description: >
      The first chapter starts at a lower abstraction level than many learners need for
      initial traction. The content is accurate, but the opening cognitive load is high
      for a step-1 lesson. Classic texts usually establish observable process behavior
      first and then deepen toward implementation detail. This chapter does recover via
      concrete /proc examples, so the flaw is survivable, but it is still a rough
      onboarding slope.

  - id: F-006
    attack_vector: "AV-PEDAGOGY"
    severity: medium
    claim_challenged: "The Litmus Test: Can I express this as a pipeline of existing tools? If yes, use shell. If no, use Python."
    evidence: "The same chapter later adds other decision criteria: over ~30 lines, need tests, complex error handling, structured data transformations, and maintainability concerns."
    survives_scrutiny: true
    description: >
      The shell-versus-Python decision rule is taught too categorically. As written,
      it invites literal application, but the rest of the chapter immediately supplies
      exceptions that materially change the decision. That makes it a useful heuristic
      packaged as a near-rule. For novices, that is risky pedagogy because catchy
      simplifications are remembered longer than later caveats.
```
tokens used
58,683
## Section 1: Narrative

The broad sequencing critique does not hold equally across both chapters. Step 1 is mostly well ordered. Process -> `fork`/`exec` -> file descriptors -> pipes -> signals -> lifecycle is the right dependency chain, and it maps closely to how a classic Unix text would build the mental model. In some ways it is better motivated than APUE or TLPI for this audience, because it keeps tying concepts back to real diagnostic practice with `/proc`, `strace`, exit codes, and pipeline failure modes. If the goal is to make an engineer supervising agents care about kernel primitives, the chapter does that well.

The main pedagogical problem in Step 1 is not section order. It is the mismatch between the claimed progression and the exercises. Several challenges require shell authoring skill before the shell step exists: writing a bash script with `trap`, demonstrating `set -e` and `pipefail`, and especially writing a bash function `fd_report()`. That is a real curricular dependency bug. A learner who genuinely starts here can understand the prose and still get stuck because the exercise medium has advanced ahead of the curriculum.

The other weakness in Step 1 is desirable difficulty. Too many challenges are direct reenactments of what was just shown. The `/proc/self` challenge mirrors the earlier command sequence almost one for one. The pipe challenge includes a full solution. The signal challenge gives a template plus expected exit codes. The pipeline failure challenge gives the key demonstration outright. That makes the work good as a lab, but weaker as assessment. It checks whether the learner can reproduce a demonstrated pattern, not whether they can predict behavior in a novel case or debug a broken one. A better design would include prediction tasks, intentionally broken pipelines, or “what will happen and why?” questions before execution.

Step 1 also opens a bit too hard for a step-1 document. Starting with `struct task_struct`, kernel header paths, and low-level bookkeeping is accurate, but it front-loads detail before giving the learner a simpler operational handle. APUE and TLPI usually earn that level of detail after the user-space behavior is stable in the learner’s head. Here, the chapter recovers because the examples are concrete, but some readers will hit unnecessary cognitive load in the first section.

Step 5 is less solid pedagogically. The shell/Python boundary is the right anchor concept, and the opening section is the strongest part of the chapter. After that, though, the step sprawls: stdin/stdout, signals, `argparse`, subcommands, `uv`, PEP 723, `subprocess`, `pathlib`, atomic writes, YAML safety, structured output, testing, notebooks, and then several capstone challenges. That is not one lesson. It is a compressed survey of a small internal tooling curriculum. Compared to a strong technical book, this is where it falls short: the classic texts usually make one chapter do one main job. This chapter keeps adding adjacent concerns, so retention is likely to be patchier than the author thinks.

The time estimates are also not credible, especially in Step 5. Step 5 claims 4 hours, but the section times alone total about 4 hours 35 minutes before challenges. The challenges then add roughly another 3 hours 30 minutes. Even allowing for optional work, the stated estimate is setting the learner up to feel slow when the document itself is overscoped. Step 1 is closer to plausible, but only if the reader is already comfortable in the shell and treats some exercises as skim rather than full execution.

One other issue in Step 5 is the “litmus test” for shell versus Python. It is a useful heuristic, but it is taught too absolutely: “If yes, use shell. If no, use Python.” The chapter itself later introduces exceptions based on maintainability, testing, complexity, and data shape. So the rule is pedagogically catchy, but not stable enough to be presented as the single most valuable concept without stronger caveats. A learner following it literally will overuse shell.

Compared to APUE, TLPI, or Kernighan and Pike, this material is stronger on modern operational relevance and weaker on instructional discipline. It reads like a sharp internal bootcamp handout written by someone who knows the material and wants the learner to acquire practical judgment quickly. It does not yet read like a self-study curriculum that has been pressure-tested against where learners actually stall.

## Section 2: Structured Findings

```yaml
review:
  model: "codex"
  date: "2026-03-10"
  prompt_id: 8
  prompt_name: "pedagogy-review"

findings:
  - id: F-001
    attack_vector: "AV-PEDAGOGY"
    severity: high
    claim_challenged: "Every concept in Step 2 is built on the process model from Step 1."
    evidence: "Step 1 Challenge 3 asks for a bash script with trap, Challenge 4 asks for a script using set -e and pipefail, and Challenge 6 asks for a bash function fd_report(), all before Step 2 teaches shell language."
    survives_scrutiny: true
    description: >
      The curriculum claims a clean dependency chain where shell comes after the
      process model, but the exercises violate that ordering. A learner can follow
      the prose in Step 1 and still fail the challenges because the exercise medium
      requires shell fluency that has not yet been taught. This is a real progression
      flaw, not a minor inconvenience, because it turns prerequisite knowledge into
      hidden curriculum.

  - id: F-002
    attack_vector: "AV-PEDAGOGY"
    severity: high
    claim_challenged: "estimate = \"4 hours\""
    evidence: "In Step 5, the section timing labels sum to about 275 minutes before any challenge work. The six challenges add roughly another 210 minutes."
    survives_scrutiny: true
    description: >
      The Step 5 estimate is materially unrealistic for self-study. Even if some
      challenges are optional, the document never clearly distinguishes required
      versus extension work, so the learner receives a false pace signal. That is a
      pedagogical defect because learners use stated duration to calibrate effort and
      judge whether they are keeping up. Here the estimate understates the workload by
      too much to be dismissed as ordinary variance.

  - id: F-003
    attack_vector: "AV-PEDAGOGY"
    severity: high
    claim_challenged: "These challenges are designed to be run on a Linux system ... Each one exercises a specific concept from this step."
    evidence: "Challenge 1 largely restages the exact /proc commands already shown. Challenge 2 includes a full solution. Challenge 3 provides a script template and expected exit codes. Challenge 4 includes the key demonstration in the hint."
    survives_scrutiny: true
    description: >
      The exercises mostly assess reproduction of demonstrated procedures, not transfer
      of understanding. A learner can complete much of the work by pattern matching
      against nearby examples without forming a durable mental model. Stronger pedagogy
      would force prediction, diagnosis, or adaptation to a new case, especially for
      topics like redirection order, SIGPIPE, or zombie reaping.

  - id: F-004
    attack_vector: "AV-COMPLETENESS"
    severity: medium
    claim_challenged: "The single most valuable concept in this step. Everything else is mechanics."
    evidence: "After the shell/Python boundary section, Step 5 covers Unix streams, signal handling, argparse, subcommands, uv, PEP 723, subprocess, pathlib, atomic writes, structured output, testing, notebooks, and several capstone exercises."
    survives_scrutiny: true
    description: >
      Step 5 is overscoped relative to its stated teaching objective. The opening claim
      suggests one central judgment call plus supporting mechanics, but the chapter
      actually tries to deliver a broad tooling survey. The likely result is shallow
      retention across too many adjacent topics. This would work better split into a
      core CLI chapter and a separate tooling/distribution chapter.

  - id: F-005
    attack_vector: "AV-PEDAGOGY"
    severity: medium
    claim_challenged: "This is Step 1 of 12 in the Agentic Engineering Bootcamp."
    evidence: "The first section introduces struct task_struct, include/linux/sched.h, approximate kernel bookkeeping size, PID 0 as idle task, page tables, and other low-level details before the learner has a simpler operational model anchored."
    survives_scrutiny: true
    description: >
      The first chapter starts at a lower abstraction level than many learners need for
      initial traction. The content is accurate, but the opening cognitive load is high
      for a step-1 lesson. Classic texts usually establish observable process behavior
      first and then deepen toward implementation detail. This chapter does recover via
      concrete /proc examples, so the flaw is survivable, but it is still a rough
      onboarding slope.

  - id: F-006
    attack_vector: "AV-PEDAGOGY"
    severity: medium
    claim_challenged: "The Litmus Test: Can I express this as a pipeline of existing tools? If yes, use shell. If no, use Python."
    evidence: "The same chapter later adds other decision criteria: over ~30 lines, need tests, complex error handling, structured data transformations, and maintainability concerns."
    survives_scrutiny: true
    description: >
      The shell-versus-Python decision rule is taught too categorically. As written,
      it invites literal application, but the rest of the chapter immediately supplies
      exceptions that materially change the decision. That makes it a useful heuristic
      packaged as a near-rule. For novices, that is risky pedagogy because catchy
      simplifications are remembered longer than later caveats.
```
