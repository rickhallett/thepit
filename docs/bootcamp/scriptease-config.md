# ScriptEase Bootcamp Integration

**Date:** 2026-03-10
**Purpose:** Configure [scriptease](https://github.com/rickhallett/scriptease) to reinforce the Agentic Engineering Bootcamp curriculum.
**Companion script:** `bin/bootcamp-quiz`

---

## A. Category-to-Step Mapping

Each scriptease category mapped to the bootcamp step(s) it reinforces, with the specific tip IDs most relevant to that step's learning objectives.

### Step 1: Process Model (fork/exec/fd/pipe/signal)

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| process-management | 301, 302, 303, 304, 305, 306, 307, 308, 309, 317, 318 | Job control, signals, process discovery - the core process model |
| pipes-redirection | 501, 503, 504, 505, 506, 508, 515, 519 | File descriptors, pipes, redirection - fd/pipe mechanics |

**Key tips for Step 1:**
- 303 (kill and Signals) - signal delivery, SIGTERM vs SIGKILL
- 505 (File Descriptors) - fd mechanics, the substrate of all I/O
- 504 (Named Pipes / FIFOs) - pipe as kernel object
- 309 (pstree Process Tree) - visualising fork relationships
- 301 (Job Control) - fg/bg, the shell's process management layer

### Step 2: Shell Language (POSIX/bash)

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| bash-basics | 101-119 (all) | This IS the shell language step |

**Key tips for Step 2:**
- 109 (Quoting Rules) - the #1 source of shell bugs
- 112 (Shell Options) - set -euo pipefail and shopt
- 106 (Conditional Expressions) - [[ ]] vs ( )
- 113 (Exit Codes) - $? and conditional execution
- 104 (Parameter Expansion) - string manipulation without external tools
- 114 (Traps and Signals) - trap EXIT/INT/ERR

### Step 3: Filesystem as State

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| file-operations | 401-424 (all) | File operations ARE filesystem state |

**Key tips for Step 3:**
- 402 (Links Hard and Soft) - inodes, the filesystem's object model
- 403 (chmod Permissions) - permission bits as state
- 405 (stat File Info) - reading filesystem metadata directly
- 401 (find Command Power) - querying filesystem state
- 418 (mktemp) - secure temp file creation
- 419 (inotifywait) - watching filesystem state changes

### Step 4: Text Pipeline (grep/sed/awk/jq)

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| text-processing | 201-229 (all) | Direct coverage of the text pipeline toolkit |

**Key tips for Step 4:**
- 202 (awk Field Processing) - columnar data extraction
- 203 (sed Stream Editing) - in-stream text transformation
- 209 (grep Regular Expressions) - pattern matching fundamentals
- 210 (awk Programming) - awk as a language (BEGIN/END blocks)
- 215 (xargs Argument Building) - pipeline composition
- 219 (jq JSON Processing) - structured data pipeline
- 211 (sed Advanced Patterns) - address ranges, back-references

### Step 5: Python CLI Tools

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| python-oneliners | 701-719 (all) | Python as CLI tool is the exact topic |

**Key tips for Step 5:**
- 701 (Python CLI Tricks) - python3 -c and -m patterns
- 710 (Stdin Line Processing) - Python in a pipeline
- 708 (CSV Processing) - structured data from CLI
- 713 (File Path Operations) - pathlib from command line
- 715 (Environment Variables) - os.environ access

### Step 6: Make/Just Orchestration

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| bash-basics | 108, 112, 113, 115 | Recipes are shell; heredocs, options, exit codes, functions |

**Key tips for Step 6:**
- 108 (Here Documents) - Makefile recipes use shell; heredoc patterns matter
- 113 (Exit Codes) - make aborts on non-zero exit
- 112 (Shell Options) - .SHELLFLAGS and set -e behaviour in recipes

**Coverage gap:** No Make/Just category exists in scriptease. See Section D.

### Step 7: Git Internals

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| git-fu | 901-924 (all) | Direct coverage of git |

**Key tips for Step 7:**
- 912 (Git Reflog Recovery) - understanding the object store
- 909 (Git Bisect Debugging) - binary search through history
- 904 (Git Reset Modes) - soft/mixed/hard and the three trees
- 906 (Git Interactive Rebase) - history rewriting
- 914 (Git Hooks) - automation at commit boundaries
- 911 (Git Worktrees) - multiple working trees from one repo

### Step 8: Process Observation (strace/lsof/ss)

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| process-management | 310, 311, 312, 313, 314, 316, 319 | Observation and profiling tools |
| networking | 602 | ss is a networking observation tool |

**Key tips for Step 8:**
- 310 (strace System Calls) - the primary observation tool
- 311 (lsof Open Files) - what a process has open
- 602 (ss Socket Statistics) - socket-level observation
- 312 (fuser File Users) - who holds a file/socket
- 319 (perf Profiling) - performance observation

### Step 9: Container Internals

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| process-management | 314, 315 | cgroups and namespaces are the kernel primitives |
| system-admin | 811 | mount/overlay concepts |

**Key tips for Step 9:**
- 315 (namespaces) - process isolation primitive
- 314 (cgroups Basics) - resource limiting primitive
- 811 (Filesystem Mount) - overlayfs is a mount

**Coverage gap:** No container category exists. See Section D.

### Step 10: Networking CLI

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| networking | 601-624 (all) | Direct coverage |

**Key tips for Step 10:**
- 601 (curl Essentials) - HTTP from CLI
- 607 (host and dig DNS) - DNS resolution
- 614 (tcpdump Packet Capture) - packet-level observation
- 608/609/610 (ssh suite) - remote access and tunnelling
- 605 (netcat) - raw TCP/UDP
- 615 (iptables) - firewall rules

### Step 11: Process Supervision

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| system-admin | 801, 802, 803, 804, 805, 824, 827 | systemd, cron, service management |

**Key tips for Step 11:**
- 801 (systemctl Essentials) - service lifecycle
- 803 (Creating systemd Units) - writing unit files
- 805 (systemd Timers) - cron replacement
- 804 (cron Scheduling) - traditional scheduling
- 802 (journalctl Logs) - service log observation

### Step 12: Advanced Bash

| Category | Relevant Tip IDs | Why |
|----------|-------------------|-----|
| bash-basics | 114, 116, 118, 119 | Advanced bash features |
| pipes-redirection | 502, 508, 509, 510, 513, 516, 517, 519 | Advanced I/O patterns |

**Key tips for Step 12:**
- 114 (Traps and Signals) - trap, cleanup, ERR handling
- 119 (Coprocesses) - bidirectional process communication
- 516 (Coproc Communication) - coproc fd mechanics
- 502 (Process Substitution) - <() and >()
- 509 (Subshells) - scope and isolation
- 517 (Pipeline Exit Status) - PIPESTATUS array

---

## B. Priority Ordering

### Tier Assignment

Categories ranked by bootcamp learning order. Tier 1 categories should be weighted highest in quiz selection; Tier 4 lowest.

| Tier | Bootcamp Steps | ScriptEase Categories | Weight |
|------|----------------|-----------------------|--------|
| **Tier 1** | 1, 2, 3 | bash-basics, process-management, pipes-redirection, file-operations | 4x |
| **Tier 2** | 4, 5, 6 | text-processing, python-oneliners | 3x |
| **Tier 3** | 7, 8, 9 | git-fu, system-admin (subset) | 2x |
| **Tier 4** | 10, 11, 12 | networking, system-admin (subset) | 1x |

### Recommended Weighting Strategy

ScriptEase selects tips randomly. To weight toward the current learning tier, the `bootcamp-quiz` script (see Section C) filters by the categories relevant to the current step, rather than modifying the database.

For shell-startup integration, use progressive category weighting:

```bash
# In .bashrc - adapt BOOTCAMP_STEP as you progress
export BOOTCAMP_STEP=1

# This runs the bootcamp-quiz wrapper which filters appropriately
/path/to/midgets/bin/bootcamp-quiz "$BOOTCAMP_STEP"
```

The wrapper script handles category selection based on the step number. As the learner advances, they change BOOTCAMP_STEP and the tip/quiz pool shifts with them.

### Category Exclusions

**arch-specific** (1001-1019) is excluded from bootcamp weighting entirely. It is useful for Arch Linux users but does not map to any bootcamp learning objective. It remains available via direct `scriptease -c arch-specific` access.

---

## C. Bootcamp Mode Script

See `bin/bootcamp-quiz`. Usage:

```bash
# Show tip/quiz for current bootcamp step
bootcamp-quiz 2

# Force quiz mode
bootcamp-quiz 4 --quiz

# Force tip mode
bootcamp-quiz 7 --tip

# Show which categories map to a step
bootcamp-quiz 1 --info
```

---

## D. Missing Coverage Analysis

### Topics the bootcamp covers that scriptease does NOT

| Bootcamp Topic | Step | Gap Description | Suggested Category |
|----------------|------|-----------------|--------------------|
| **Make/Just** | 6 | No tips on Makefile syntax, targets, prerequisites, phony targets, Just recipes | New: `build-orchestration` or extend `bash-basics` |
| **jq in depth** | 4 | Only 1 tip (219) on jq. Bootcamp covers jq paths, filters, map/select, conditionals, reduce | Extend `text-processing` (220-229 range has room) |
| **Container runtime** | 9 | namespaces/cgroups exist (314, 315) but no tips on: docker/podman CLI, Dockerfile, overlayfs, container networking, nsenter | New: `containers` |
| **yq YAML processing** | 4 | Bootcamp lists yq alongside jq. No yq tips exist | Extend `text-processing` |
| **Process substitution depth** | 1, 12 | Only 1 tip (502). fork/exec model, /proc/PID/fd, fd inheritance not covered | Extend `pipes-redirection` or `process-management` |
| **/proc and /sys** | 3 | Filesystem-as-state depends heavily on /proc, /sys pseudo-filesystems. No tips cover reading /proc/PID/*, /sys/class/*, etc. | Extend `file-operations` or `system-admin` |
| **strace patterns** | 8 | Only 1 tip (310) on strace. Bootcamp covers strace -e trace=, -p PID, -f (follow forks), interpreting output | Extend `process-management` |
| **supervisord** | 11 | systemd is covered but supervisord (common in containers) is not | Extend `system-admin` |

### Suggested New Tips

Below are specific tip proposals to fill the highest-priority gaps. IDs follow the existing numbering convention.

#### Make/Just (extend bash-basics or new category)

```
ID: 120 | bash-basics | 3 | "Makefile Basics" | make,targets,recipes
  - Targets, prerequisites, recipes, tabs vs spaces, .PHONY

ID: 121 | bash-basics | 3 | "Make Variables and Functions" | make,variables,functions
  - $(VAR), ?=, :=, $(shell ...), $(wildcard ...), $(patsubst ...)

ID: 122 | bash-basics | 4 | "Just Task Runner" | just,tasks,runner
  - Justfile syntax, recipes, arguments, choose, set shell
```

#### jq in depth (extend text-processing)

```
ID: 230 | text-processing | 3 | "jq Filters and Pipes" | jq,filter,pipe
  - .field, .[], .field[], select(), map(), pipe within jq

ID: 231 | text-processing | 4 | "jq Conditionals and Reduce" | jq,conditional,reduce
  - if-then-else, try-catch, reduce, @base64, @csv, @tsv

ID: 232 | text-processing | 3 | "yq YAML Processing" | yq,yaml,parse
  - yq eval, yq -i, merge, select, env variable substitution
```

#### /proc and /sys filesystem

```
ID: 425 | file-operations | 3 | "/proc Process Filesystem" | proc,process,kernel
  - /proc/PID/fd, /proc/PID/maps, /proc/PID/status, /proc/cpuinfo

ID: 426 | file-operations | 3 | "/sys Device Filesystem" | sys,device,kernel
  - /sys/class/, /sys/block/, sysfs as kernel state interface
```

#### Container CLI

```
ID: 320 | process-management | 3 | "Docker/Podman CLI" | docker,podman,container
  - run, exec, logs, inspect, ps, volume, network

ID: 321 | process-management | 4 | "nsenter and unshare" | nsenter,unshare,namespace
  - Enter container namespaces, create isolated environments
```

#### strace patterns

```
ID: 322 | process-management | 4 | "strace Filtering Patterns" | strace,trace,filter
  - -e trace=open,read,write, -e trace=network, -p PID, -f, -t, -c (summary)
```

---

## E. Integration Instructions

### 1. Install scriptease

```bash
# Clone the repository
git clone https://github.com/rickhallett/scriptease.git ~/code/scriptease

# Install dependencies
# Arch Linux:
sudo pacman -S sqlite bat python

# Ubuntu/Debian:
sudo apt install sqlite3 bat python3

# Initialize database and load curriculum
cd ~/code/scriptease
bin/scriptease-manage init
cd lib && python3 load_curriculum.py && cd ..

# Verify it works
bin/scriptease --tip
bin/scriptease -l
```

### 2. Install bootcamp-quiz

```bash
# Ensure the bootcamp-quiz script is executable
chmod +x /path/to/midgets/bin/bootcamp-quiz

# Symlink into PATH (optional)
ln -s /path/to/midgets/bin/bootcamp-quiz ~/.local/bin/bootcamp-quiz

# Test it
bootcamp-quiz 1 --info
bootcamp-quiz 1 --tip
```

### 3. Configure for bootcamp mode (shell initialization)

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# --- ScriptEase Bootcamp Integration ---
# Change BOOTCAMP_STEP as you progress through the curriculum (1-12)
export BOOTCAMP_STEP=1

# Path to scriptease (adjust to your installation)
export SCRIPTEASE_HOME="$HOME/code/scriptease"

# Show a bootcamp-focused tip/quiz on every new terminal
# 25% chance of quiz, 75% chance of tip (scriptease default behaviour)
if command -v bootcamp-quiz &>/dev/null; then
  bootcamp-quiz "$BOOTCAMP_STEP"
fi
# --- End ScriptEase Bootcamp ---
```

When you complete a bootcamp step, increment `BOOTCAMP_STEP`:

```bash
# Edit your shell rc file
# Change: export BOOTCAMP_STEP=1
# To:     export BOOTCAMP_STEP=2
```

### 4. Track progress

**Quiz mastery tracking** is built into scriptease. Quizzes archive after 3 correct answers. Check your progress:

```bash
# Overall stats
$SCRIPTEASE_HOME/bin/scriptease-manage stats

# See quiz progress directly
sqlite3 $SCRIPTEASE_HOME/db/tips.db \
  "SELECT c.name, COUNT(*) as total, SUM(q.archived) as mastered
   FROM quizzes q
   JOIN tips t ON q.tip_id = t.id
   JOIN categories c ON t.category_id = c.id
   GROUP BY c.name
   ORDER BY c.name;"

# See which quizzes are still active for your current step's categories
sqlite3 $SCRIPTEASE_HOME/db/tips.db \
  "SELECT q.question, q.times_correct, c.name
   FROM quizzes q
   JOIN tips t ON q.tip_id = t.id
   JOIN categories c ON t.category_id = c.id
   WHERE q.archived = 0
   AND c.name IN ('process-management', 'pipes-redirection')
   ORDER BY q.times_correct DESC;"
```

**Tip exposure tracking** - scriptease tracks `times_shown` per tip:

```bash
# Tips you've seen least in current step's categories
sqlite3 $SCRIPTEASE_HOME/db/tips.db \
  "SELECT t.id, t.title, t.times_shown, c.name
   FROM tips t
   JOIN categories c ON t.category_id = c.id
   WHERE c.name IN ('bash-basics')
   ORDER BY t.times_shown ASC
   LIMIT 10;"
```

### 5. Temporarily disable tips

When you need a clean terminal (focused work, demos):

```bash
# Disable for 15 minutes (auto-reverts)
$SCRIPTEASE_HOME/bin/nostp

# Force disable until manually re-enabled
$SCRIPTEASE_HOME/bin/nostp -f

# Check status
$SCRIPTEASE_HOME/bin/nostp -s
```
