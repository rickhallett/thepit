# Adversarial Review Dispatch
# Model: gemini | Prompt: 3 | Name: accuracy-audit
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

The Accuracy Audit

Read `sites/oceanheart/content/bootcamp/02-shell-language.md` and `sites/oceanheart/content/bootcamp/04-text-pipeline.md` in full. You are a senior systems engineer reviewing these for technical accuracy.

**Your task:** Find errors. Look for:
- Commands that would not work as written on a standard Linux distribution (Arch, Debian, Ubuntu)
- Incorrect explanations of how shell features work
- Examples that demonstrate the wrong concept or demonstrate the right concept incorrectly
- Claims about behavior that are stated as universal but are actually bash-specific, distribution-specific, or version-specific
- Subtle errors in the explanation of quoting, expansion, word splitting, or globbing
- sed/awk/grep examples with incorrect regex or wrong flags

Report every finding with the exact line or section, what is wrong, and what the correct statement should be. If you find nothing wrong, say so explicitly and explain what you checked.

---

---

## Source Material

Read the following files carefully before responding. These are the complete contents.


### File: `sites/oceanheart/content/bootcamp/02-shell-language.md`

```
+++
title = "The Shell Language"
date = "2026-03-10"
description = "POSIX sh then bash. Quoting, expansion, control flow, error handling. The glue that composes processes."
tags = ["shell", "bash", "posix", "scripting", "bootcamp"]
step = 2
tier = 1
estimate = "8-12 hours"
bootcamp = 1
+++

Step 2 of 12 in the Agentic Engineering Bootcamp.

---

**Prerequisites:** Step 1 (process model, file descriptors, pipes, signals)
**You will need:** A Linux terminal (Arch, Debian, or Ubuntu), bash 5.x

## Table of Contents

1. [The Shell is a Process Launcher](#1-the-shell-is-a-process-launcher) (30 min)
2. [Word Splitting and Quoting](#2-word-splitting-and-quoting) (90 min)
3. [Variables and Parameter Expansion](#3-variables-and-parameter-expansion) (60 min)
4. [Command Substitution and Subshells](#4-command-substitution-and-subshells) (60 min)
5. [Control Flow](#5-control-flow) (60 min)
6. [Functions](#6-functions) (45 min)
7. [Error Handling](#7-error-handling) (60 min)
8. [POSIX sh vs Bash](#8-posix-sh-vs-bash) (45 min)
9. [Here Documents and Here Strings](#9-here-documents-and-here-strings) (30 min)
10. [Challenges](#challenges) (3-4 hours)

---

## 1. The Shell is a Process Launcher

**Estimated time: 30 minutes**

The shell is a process launcher, not a programming language.

Then contradict this.

At its core, here is what the shell does on every line of input:

1. Read a line
2. Split it into words
3. Find a command (built-in, function, or external binary in `$PATH`)
4. `fork()` a child process
5. `exec()` the command in the child
6. `wait()` for it to finish
7. Check the exit code
8. Repeat

That is it. Everything else - variables, control flow, functions, redirection, quoting
rules, expansion, globbing - was bolted on top of this loop over decades. The Bourne
shell (1979) added programming constructs. Bash (1989) added more. POSIX standardised
a subset. But the core loop never changed.

This explains every quirk you will encounter:

- **Why `if` takes a command, not a boolean expression.** The shell runs the command and
  checks its exit code. `if grep -q pattern file; then ...` works because `grep` returns
  0 (success) or 1 (failure). There is no true/false type - there are only exit codes.

- **Why `[ ]` has spaces.** `[` is a command (`/usr/bin/[` on disk). `[ -f foo ]` is
  the command `[` with arguments `-f`, `foo`, and `]`. The spaces are argument delimiters,
  not style.

- **Why variable assignment has no spaces.** `var=value` is an assignment. `var = value`
  runs the command `var` with arguments `=` and `value`. The parser distinguishes these
  by looking for the `=` with no surrounding whitespace.

- **Why quoting matters.** The shell performs word splitting between step 2 and step 5.
  If a variable contains spaces, the shell splits it into multiple words, and each word
  becomes a separate argument to the command. This is not a bug - it is the design.

Now the contradiction: the shell IS a programming language. It has variables, conditionals,
loops, functions, arrays (in bash), associative arrays (in bash 4+), arithmetic, string
manipulation, and signal handling. It is Turing-complete. But it is a programming language
built on top of a process launcher, and the process launcher semantics leak through
everywhere. Every line of shell is simultaneously a program statement AND a process
invocation specification. Forgetting either aspect produces bugs.

> **AGENTIC GROUNDING:** Agents generate shell fluently because their training data is
> full of shell scripts. But they generate it as a programming language - they think in
> variables, loops, and conditionals. They do not think about the process launcher
> underneath. This is why agent-generated shell often looks correct, passes a syntax
> check, and breaks at runtime on edge cases. The most common failures: unquoted
> variables (word splitting), relying on echo behaviour that varies across platforms,
> and not understanding that piped commands run in subshells.

> **HISTORY:** The Thompson shell (1971) was the first Unix shell. It was literally just
> a command interpreter - no variables, no control flow, no scripting. Ken Thompson wrote
> it as a way to launch programs. Pipes were not even in the first version; Doug McIlroy
> pushed for them and they were added in 1973. The Bourne shell (1979) by Steve Bourne at
> Bell Labs added programming constructs. Bourne's previous project was an ALGOL 68
> compiler, which is why shell has `if/then/fi`, `case/esac`, and `do/done` - the
> reversed-keyword block delimiters are ALGOL's influence. This lineage matters: the
> programming features were designed by a compiler writer who was building ON TOP of a
> process launcher, not replacing it.

### Verify it yourself

```bash
# Prove that [ is a command
which [
# /usr/bin/[

ls -la /usr/bin/[
# -rwxr-xr-x 1 root root ... /usr/bin/[

# Prove that assignment vs command depends on whitespace
foo=hello    # assignment: no output, $? is 0
foo = hello  # command: "foo: command not found", $? is 127
```

---

## 2. Word Splitting and Quoting

**Estimated time: 90 minutes**

This is the single most important section in this entire bootcamp step. Word splitting
and quoting are where the majority of shell bugs live, and they are the class of bug
that agents produce most reliably.

### The Shell's Evaluation Order

When the shell processes a line, it applies transformations in this exact order:

1. **Brace expansion** - `{a,b,c}` becomes three words: `a b c`
2. **Tilde expansion** - `~` becomes `$HOME`
3. **Parameter/variable expansion** - `$var` and `${var}` become the variable's value
4. **Command substitution** - `$(command)` becomes the command's stdout
5. **Arithmetic expansion** - `$((1 + 2))` becomes `3`
6. **Word splitting** - the result is split on characters in `$IFS` (default: space, tab, newline)
7. **Pathname expansion (globbing)** - `*`, `?`, `[...]` are expanded to matching filenames
8. **Quote removal** - quotes that survived all the above are stripped

This order is not arbitrary. Each step's output feeds the next. The critical insight:
**steps 6 and 7 happen AFTER variable expansion (step 3)**. This means the VALUE of a
variable is subject to word splitting and globbing unless you prevent it with quotes.

### The Three Quoting Modes

**No quotes - everything happens:**

```bash
file="my document.txt"
rm $file
# Shell expands $file to: my document.txt
# Word splitting splits on space: "my" "document.txt"
# rm receives TWO arguments: "my" and "document.txt"
# Result: tries to delete two files, neither of which exists
```

**Double quotes - expansion happens, word splitting does not:**

```bash
file="my document.txt"
rm "$file"
# Shell expands $file to: my document.txt
# Double quotes SUPPRESS word splitting
# rm receives ONE argument: "my document.txt"
# Result: deletes the correct file
```

**Single quotes - nothing happens:**

```bash
file="my document.txt"
echo '$file'
# Output: $file
# Single quotes suppress ALL expansion
# The literal string $file is passed to echo
```

### The Rule

**Always double-quote variable expansions unless you specifically want word splitting.**

This is not a style preference. It is a correctness requirement. Unquoted `$var` is
correct only when you intentionally want the value split into multiple words. In
practice, this is rare.

```bash
# WRONG - word splitting and globbing
for f in $(find . -name "*.log"); do rm $f; done

# What happens with a file named "access log.txt":
# find outputs: ./access log.txt
# $(...) captures it
# Unquoted, word splitting produces: "./access" "log.txt"
# rm tries to delete two nonexistent files
# The actual file is untouched

# WRONG EVEN IF QUOTED PARTIALLY
for f in "$(find . -name "*.log")"; do rm "$f"; done
# Now the ENTIRE find output is one string (all filenames concatenated)

# CORRECT - use find -exec
find . -name "*.log" -exec rm {} \;

# CORRECT - use null-delimited read
while IFS= read -r -d '' f; do
  rm "$f"
done < <(find . -name "*.log" -print0)
```

### Globbing After Expansion

Word splitting is not the only danger. Pathname expansion (globbing) also happens
after variable expansion:

```bash
msg="File not found: *"
echo $msg
# Unquoted: * is expanded to all files in current directory
# Output: File not found: Makefile README.md src tests ...

echo "$msg"
# Quoted: no globbing
# Output: File not found: *
```

### IFS - The Internal Field Separator

Word splitting splits on characters in `$IFS`. The default is space, tab, newline.
You can change it:

```bash
# Parse a colon-delimited string (like $PATH)
IFS=: read -ra parts <<< "$PATH"
for p in "${parts[@]}"; do
  echo "$p"
done

# Read a CSV line
IFS=, read -r name age city <<< "Alice,30,London"
echo "$name is $age years old, lives in $city"
```

Setting `IFS=` (empty) disables word splitting entirely. This is useful in `while read`
loops where you want to preserve leading/trailing whitespace:

```bash
# Without IFS= : leading/trailing whitespace stripped
echo "  hello  " | while read line; do echo "[$line]"; done
# Output: [hello]

# With IFS= : whitespace preserved
echo "  hello  " | while IFS= read -r line; do echo "[$line]"; done
# Output: [  hello  ]
```

The `-r` flag on `read` prevents backslash interpretation. Always use `read -r` unless
you specifically want backslash escapes processed.

### printf vs echo - The Standing Order

From AGENTS.md and CLAUDE.md:

> NEVER use `echo` to pipe values to CLI tools. `echo` appends a trailing newline that
> silently corrupts values. ALWAYS use `printf` instead.

Here is why, grounded in the shell evaluation model:

```bash
# echo adds a trailing newline
echo "true" | xxd | head -1
# 00000000: 7472 7565 0a         true.

# printf does not (unless you ask for one)
printf 'true' | xxd | head -1
# 00000000: 7472 7565           true

# When piping to a CLI tool that reads exact bytes:
echo "true" | vercel env add MY_FLAG production
# The value stored is "true\n" - five bytes, not four

printf 'true' | vercel env add MY_FLAG production
# The value stored is "true" - four bytes, correct
```

But there is more. `echo` behaviour varies between implementations:

```bash
# bash built-in echo: -e enables escape sequences
echo -e "hello\tworld"    # Output: hello	world

# /bin/echo on some systems: -e is printed literally
/bin/echo -e "hello\tworld"   # Output: -e hello\tworld  (on some systems)

# POSIX says echo behaviour with -e, -n, or backslashes is UNDEFINED
# This means the same script produces different output on different systems

# printf is consistent everywhere:
printf 'hello\tworld\n'   # Output: hello	world  (always)
```

The rule: use `printf` when the exact bytes matter (piping to tools, writing to files,
constructing data). Use `echo` only for casual human-readable messages to the terminal
where a trailing newline is wanted and escapes are irrelevant.

> **AGENTIC GROUNDING:** Agents default to `echo` in almost all generated shell. When
> reviewing agent-generated scripts, every `echo "$value" | some_command` is a potential
> bug. The Operator must verify whether the trailing newline matters. In CI pipelines,
> secret injection, and environment variable setting, it almost always matters.

---

## 3. Variables and Parameter Expansion

**Estimated time: 60 minutes**

Shell variables are untyped strings. There are no integers, no booleans, no arrays in
POSIX sh (bash adds arrays). Everything is a string, and operations on variables are
string operations.

### Basic Assignment and Expansion

```bash
name="world"
echo "Hello, $name"         # Hello, world
echo "Hello, ${name}"       # Hello, world (braces for clarity/disambiguation)
echo "Hello, ${name}ling"   # Hello, worldling (braces required here)
echo "Hello, $nameling"     # Hello,  (variable $nameling is unset)
```

No spaces around `=`. This is not style - it is syntax. `name = "world"` runs the
command `name` with arguments `=` and `world`.

### Parameter Expansion Operators

These are not curiosities. They are how you avoid spawning subprocesses for simple
string operations. Every `$(echo "$var" | sed 's/...')` could be a parameter expansion
that runs in the shell process itself, with zero fork/exec overhead.

**Default values:**

```bash
# ${var:-default} - use default if var is unset or empty
echo "${EDITOR:-vi}"           # prints vi if $EDITOR is not set

# ${var:=default} - assign default if var is unset or empty
echo "${cache_dir:=/tmp/cache}"  # assigns AND uses the default

# ${var:?error} - exit with error if var is unset or empty
: "${DATABASE_URL:?DATABASE_URL must be set}"
# If DATABASE_URL is unset, prints error message and exits with code 1
# The : command is a no-op (true) - it exists solely to trigger the expansion

# ${var:+alternate} - use alternate if var IS set
echo "${DEBUG:+--verbose}"     # prints --verbose only if DEBUG is set
```

**String stripping (prefix and suffix removal):**

```bash
filepath="/home/user/documents/report.tar.gz"

# ${var#pattern}  - strip shortest prefix match
echo "${filepath#*/}"          # home/user/documents/report.tar.gz

# ${var##pattern} - strip longest prefix match
echo "${filepath##*/}"         # report.tar.gz  (basename equivalent!)

# ${var%pattern}  - strip shortest suffix match
echo "${filepath%.*}"          # /home/user/documents/report.tar

# ${var%%pattern} - strip longest suffix match
echo "${filepath%%.*}"         # /home/user/documents/report

# Mnemonic: # is on the left side of $ on a US keyboard (prefix)
#            % is on the right side of $ on a US keyboard (suffix)
```

**Practical applications - no external commands needed:**

```bash
# Extract directory (like dirname)
path="/home/user/file.txt"
dir="${path%/*}"               # /home/user

# Extract filename (like basename)
file="${path##*/}"             # file.txt

# Extract extension
ext="${file##*.}"              # txt

# Extract name without extension
name="${file%.*}"              # file

# Change extension
newpath="${path%.*}.md"        # /home/user/file.md
```

**Substitution (bash extension - also POSIX in some forms):**

```bash
# ${var/pattern/replacement} - replace first match
msg="hello world"
echo "${msg/world/shell}"      # hello shell

# ${var//pattern/replacement} - replace ALL matches
path="a/b/c/d"
echo "${path////-}"            # a-b-c-d

# ${var/#pattern/replacement} - replace if at start
echo "${msg/#hello/goodbye}"   # goodbye world

# ${var/%pattern/replacement} - replace if at end
echo "${msg/%world/bash}"      # hello bash
```

**Length:**

```bash
str="hello"
echo "${#str}"                 # 5
```

**Substring (bash extension):**

```bash
str="hello world"
echo "${str:6}"                # world  (from position 6 to end)
echo "${str:0:5}"              # hello  (from position 0, length 5)
```

### Indirect Expansion

```bash
var_name="PATH"
echo "${!var_name}"            # prints the value of $PATH
# ${!prefix*} lists all variables starting with prefix
echo "${!BASH*}"               # BASH BASHOPTS BASHPID BASH_VERSION ...
```

### Why This Matters for Performance

Every `$(...)` command substitution forks a child process. Every pipe creates a
subshell. In a loop processing thousands of items, the difference between parameter
expansion (runs in the current shell) and external commands (fork/exec per iteration)
can be seconds vs minutes:

```bash
# SLOW - forks sed 1000 times
for f in *.tar.gz; do
  base=$(echo "$f" | sed 's/\.tar\.gz$//')
  echo "$base"
done

# FAST - pure parameter expansion, zero forks
for f in *.tar.gz; do
  echo "${f%.tar.gz}"
done
```

> **AGENTIC GROUNDING:** Agents tend to reach for `sed`, `awk`, and `cut` for string
> operations that parameter expansion handles natively. When reviewing agent-generated
> shell, look for unnecessary subprocess spawning inside loops. The parameter expansion
> forms are not obscure tricks - they are the correct tool for in-process string
> manipulation.

---

## 4. Command Substitution and Subshells

**Estimated time: 60 minutes**

### Command Substitution

Command substitution captures the stdout of a command and inserts it as a string.

```bash
# Modern form (nestable, unambiguous)
today=$(date +%Y-%m-%d)

# Legacy form (backticks - do not use)
today=`date +%Y-%m-%d`
```

Never use backticks. The reason is nesting:

```bash
# This works:
result=$(echo "count: $(wc -l < file.txt)")

# This is a nightmare to read and easy to get wrong:
result=`echo "count: \`wc -l < file.txt\`"`
# You must backslash-escape the inner backticks
```

Command substitution captures stdout only. Stderr goes to the terminal unless you
redirect it:

```bash
# Capture stdout, stderr goes to terminal
output=$(some_command)

# Capture stdout, discard stderr
output=$(some_command 2>/dev/null)

# Capture both stdout and stderr
output=$(some_command 2>&1)

# Capture stdout, capture stderr separately
output=$(some_command 2>error.log)
```

**Trailing newlines are stripped.** This is a feature, not a bug - it makes command
substitution compose cleanly. But it can surprise you:

```bash
# printf outputs exactly "hello\n\n" (with two trailing newlines)
result=$(printf 'hello\n\n')
echo "[$result]"
# Output: [hello]
# Both trailing newlines were stripped

# If you need to preserve trailing newlines, add a sentinel character:
result=$(printf 'hello\n\n'; echo x)
result="${result%x}"
```

### Subshells

A subshell is a child process running a copy of the current shell. Created by:

- Parentheses: `(commands)`
- Pipes: `cmd1 | cmd2` (cmd2 runs in a subshell in most shells)
- Command substitution: `$(commands)`
- Background: `command &`

The critical property: **variable changes in a subshell do not propagate back to the parent.**

```bash
x=before
(x=inside; echo "in subshell: $x")
echo "in parent: $x"
# Output:
# in subshell: inside
# in parent: before
```

This is fork() semantics from Step 1. The subshell is a copy-on-write fork of the parent
process. Changes to variables in the child do not affect the parent's memory.

### The Pipeline Subshell Trap

This is the single most common shell bug related to subshells:

```bash
count=0
cat file.txt | while read -r line; do
  count=$((count + 1))
done
echo "Lines: $count"
# Output: Lines: 0
# WHY?
```

The `while` loop runs in a subshell because it is on the right side of a pipe. The
`count` variable is incremented in the subshell, but those changes are lost when the
subshell exits. The parent's `count` is still 0.

**Fix 1: Redirect from a file instead of piping (POSIX):**

```bash
count=0
while read -r line; do
  count=$((count + 1))
done < file.txt
echo "Lines: $count"
# Output: Lines: <correct count>
# No pipe, no subshell - while loop runs in the current shell
```

**Fix 2: Process substitution (bash):**

```bash
count=0
while read -r line; do
  count=$((count + 1))
done < <(some_command)
echo "Lines: $count"
# <(some_command) creates a named pipe (fd) that the while loop reads from
# The while loop runs in the current shell, not a subshell
```

**Fix 3: lastpipe (bash 4.2+):**

```bash
shopt -s lastpipe
count=0
some_command | while read -r line; do
  count=$((count + 1))
done
echo "Lines: $count"
# With lastpipe, the LAST command in a pipeline runs in the current shell
# Only works when job control is disabled (scripts, not interactive)
```

### Process Substitution

Process substitution is a bash extension that creates a temporary named pipe (a file
descriptor) for a command's output:

```bash
# diff two sorted streams without temp files
diff <(sort file1.txt) <(sort file2.txt)

# <(command) becomes a path like /dev/fd/63
echo <(echo hello)
# Output: /dev/fd/63  (or similar)

# This is a real file descriptor - you can read from it like a file
cat <(echo "I'm a virtual file")

# You can also write to a process substitution:
tee >(gzip > compressed.gz) >(wc -l > linecount.txt) < input.txt
# This sends input.txt to stdout, a gzip process, AND a wc process simultaneously
```

Process substitution connects to Step 1 directly: it uses the `pipe()` system call
to create an anonymous pipe and `dup2()` to wire it to a file descriptor. The `/dev/fd/N`
path makes the pipe look like a file, so commands that expect filename arguments work.

> **AGENTIC GROUNDING:** The pipeline subshell trap is a frequent source of bugs in
> agent-generated shell. Agents write `cat file | while read line; do total=...` and
> then reference `$total` after the loop, not realising it is always zero. When reviewing
> agent-generated loops that read from pipes and accumulate state, check whether the
> state variable is used after the pipeline. If it is, the code is broken.

> **HISTORY:** Process substitution was invented by the Korn shell (ksh88) in 1988 and
> adopted by bash. It is not in POSIX. The `/dev/fd/` filesystem originated in the 8th
> Edition of Research Unix (1985) at Bell Labs. These two features together eliminated
> an entire class of temp-file bugs.

---

## 5. Control Flow

**Estimated time: 60 minutes**

### Conditionals - Commands, Not Expressions

The `if` statement runs a command and checks its exit code:

```bash
if grep -q "error" logfile.txt; then
  echo "Errors found"
fi
```

There is no boolean type. Exit code 0 means success (true). Any non-zero exit code
means failure (false). This is backwards from most languages where 0 is false.

```bash
# These are equivalent:
if true; then echo "yes"; fi
if /bin/true; then echo "yes"; fi
# 'true' is a command that exits with 0

if false; then echo "yes"; else echo "no"; fi
# 'false' is a command that exits with 1
```

### test / [ ] - The POSIX Way

`[` is a command. `test` is the same command with a different name. They check conditions
and set the exit code:

```bash
# These are the same:
test -f /etc/passwd
[ -f /etc/passwd ]

# File tests
[ -f file ]    # file exists and is a regular file
[ -d dir ]     # directory exists
[ -e path ]    # path exists (any type)
[ -r file ]    # file is readable
[ -w file ]    # file is writable
[ -x file ]    # file is executable
[ -s file ]    # file exists and is non-empty
[ -L file ]    # file is a symlink

# String tests
[ -z "$str" ]  # string is empty (zero length)
[ -n "$str" ]  # string is non-empty
[ "$a" = "$b" ]   # strings are equal (single = in POSIX)
[ "$a" != "$b" ]  # strings are not equal

# Numeric comparison (strings that happen to be numbers)
[ "$a" -eq "$b" ]   # equal
[ "$a" -ne "$b" ]   # not equal
[ "$a" -lt "$b" ]   # less than
[ "$a" -gt "$b" ]   # greater than
[ "$a" -le "$b" ]   # less or equal
[ "$a" -ge "$b" ]   # greater or equal

# Boolean operators
[ condition1 ] && [ condition2 ]   # AND (preferred)
[ condition1 ] || [ condition2 ]   # OR (preferred)
[ ! condition ]                     # NOT
```

**Critical: always quote variables inside `[ ]`.**

```bash
name=""
# WRONG - expands to: [ = "hello" ] which is a syntax error
[ $name = "hello" ]
# bash: [: =: unary operator expected

# CORRECT - expands to: [ "" = "hello" ]
[ "$name" = "hello" ]
```

### [[ ]] - The Bash Way

`[[ ]]` is a bash keyword (not a command). It is parsed by the shell itself, which
gives it several advantages:

```bash
# No word splitting inside [[ ]] - quoting is optional (but still good practice)
name=""
[[ $name = "hello" ]]   # works fine - no word splitting

# Pattern matching with =
[[ "$file" = *.txt ]]   # true if file ends with .txt (glob pattern, not regex)

# Regex matching with =~
[[ "$date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]
echo ${BASH_REMATCH[0]}   # the full match

# Logical operators inside the brackets
[[ -f file && -r file ]]   # AND (cannot do this with [ ])
[[ -f file || -d file ]]   # OR

# Safe with unquoted variables (but quote anyway for clarity)
unset var
[[ $var = "test" ]]   # no error
```

When to use which:

- `[ ]` for POSIX-portable scripts (Dockerfiles, `/bin/sh` scripts)
- `[[ ]]` for bash scripts where you control the runtime (project scripts, CI)

### Arithmetic

```bash
# (( )) for arithmetic evaluation (bash) - sets exit code
if (( count > 10 )); then
  echo "count is greater than 10"
fi

# $(( )) for arithmetic expansion - produces a value
result=$(( 3 + 4 * 2 ))    # 11 (standard precedence)
echo "Result: $result"

# Increment/decrement
(( count++ ))
(( count-- ))
(( count += 5 ))

# Integer division and modulo
echo $(( 17 / 5 ))   # 3
echo $(( 17 % 5 ))   # 2

# No floating point! For float math, use bc or awk:
echo "scale=2; 17 / 5" | bc    # 3.40
```

### case - Pattern Matching

More readable than chained `if/elif` for string matching:

```bash
case "$1" in
  start)
    start_service
    ;;
  stop)
    stop_service
    ;;
  restart)
    stop_service
    start_service
    ;;
  status|health)            # multiple patterns with |
    check_status
    ;;
  -h|--help)
    show_usage
    exit 0
    ;;
  *)                        # default case
    echo "Unknown command: $1" >&2
    show_usage
    exit 1
    ;;
esac
```

`case` uses glob patterns, not regex. Each pattern ends with `)`. Each block ends
with `;;` (or `;&` to fall through in bash 4+).

> **HISTORY:** `case/esac` is `case` spelled backwards - the ALGOL 68 block-delimiter
> convention from Steve Bourne's previous project. Same with `if/fi` and `do/done`
> (though `done` is not `do` backwards, it was chosen for readability over purity).

### Loops

**for-in loop (iterate over words):**

```bash
# Iterate over explicit values
for color in red green blue; do
  echo "$color"
done

# Iterate over glob results (safely - no need for ls)
for f in *.txt; do
  [ -f "$f" ] || continue   # guard against no matches
  echo "Processing $f"
done

# Iterate over command output (careful with quoting)
for user in $(getent passwd | cut -d: -f1); do
  echo "$user"
done
```

**C-style for loop (bash):**

```bash
for (( i = 0; i < 10; i++ )); do
  echo "Iteration $i"
done
```

**while loop:**

```bash
# Count up
i=0
while [ "$i" -lt 10 ]; do
  echo "$i"
  i=$((i + 1))
done

# Read lines from a file (POSIX, correct)
while IFS= read -r line; do
  echo "Line: $line"
done < file.txt

# Read lines from a command (bash, using process substitution)
while IFS= read -r line; do
  echo "Line: $line"
done < <(some_command)

# Infinite loop
while true; do
  check_something || break
  sleep 5
done
```

**until loop (loop while condition is false):**

```bash
# Wait for a file to appear
until [ -f /tmp/ready.flag ]; do
  sleep 1
done
echo "Ready"
```

**Loop control:**

```bash
# break - exit the loop
# continue - skip to next iteration
# break N - exit N levels of nested loops

for i in 1 2 3; do
  for j in a b c; do
    [ "$j" = "b" ] && continue  # skip b
    [ "$i" = "2" ] && break 2   # exit both loops
    echo "$i$j"
  done
done
```

### Short-circuit Evaluation

```bash
# && executes the right side only if the left succeeds
mkdir -p "$dir" && cp file "$dir/"

# || executes the right side only if the left fails
cd "$dir" || { echo "Failed to cd to $dir" >&2; exit 1; }

# Common pattern: command || die
command_that_might_fail || {
  echo "FATAL: command failed" >&2
  exit 1
}

# WARNING: do not chain && and ||  as if/else
# This is NOT the same as if/then/else:
test -f file && echo "exists" || echo "missing"
# If echo "exists" FAILS (unlikely but possible), "missing" also prints
```

---

## 6. Functions

**Estimated time: 45 minutes**

Functions in shell are commands. They participate in pipes, their exit code matters,
and they are found by name just like external commands.

### Definition

```bash
# POSIX form (portable)
my_func() {
  echo "Hello from my_func"
}

# Bash form (function keyword)
function my_func {
  echo "Hello from my_func"
}

# Both forms work in bash. Use the POSIX form for portability.
```

### Arguments

Functions do not declare parameters. Arguments are accessed positionally:

```bash
greet() {
  local name="$1"          # first argument
  local greeting="${2:-Hello}"  # second argument, default "Hello"
  echo "$greeting, $name"
}

greet "World"              # Hello, World
greet "World" "Goodbye"    # Goodbye, World
```

**Special variables inside functions (and scripts):**

```bash
show_args() {
  echo "Number of args: $#"
  echo "All args (separate words): $@"
  echo "All args (single word): $*"
  echo "First: $1, Second: $2"
  echo "Function name: ${FUNCNAME[0]}"
}

show_args one "two three" four
# Number of args: 3
# All args: one two three four
# First: one, Second: two three
```

**Critical distinction: `$@` vs `$*`:**

```bash
# "$@" preserves argument boundaries (what you almost always want)
wrapper() {
  other_command "$@"
}
wrapper "arg with spaces" "another arg"
# other_command receives TWO arguments: "arg with spaces" and "another arg"

# "$*" joins all arguments with the first character of IFS
wrapper_wrong() {
  other_command "$*"
}
wrapper_wrong "arg with spaces" "another arg"
# other_command receives ONE argument: "arg with spaces another arg"
```

### Return Values

Functions have two channels for returning data:

1. **Exit code** via `return` (0-255, 0 = success)
2. **Output** via stdout (capture with `$()`)

```bash
# Return success/failure via exit code
is_even() {
  (( $1 % 2 == 0 ))   # arithmetic evaluation sets exit code
}

if is_even 4; then
  echo "4 is even"
fi

# Return data via stdout
get_extension() {
  local file="$1"
  echo "${file##*.}"
}

ext=$(get_extension "report.tar.gz")
echo "Extension: $ext"    # Extension: gz
```

**Do not mix the two channels by accident.** If a function prints to stdout AND you
capture its output, all those prints become the "return value":

```bash
# BUG: debug output contaminates the return value
process_file() {
  echo "Processing $1..."    # This goes to stdout!
  echo "${1%.txt}.csv"       # This is the "return value"
}

result=$(process_file "data.txt")
# result is: "Processing data.txt...\ndata.csv"
# Not what you wanted

# FIX: send debug output to stderr
process_file() {
  echo "Processing $1..." >&2   # stderr - not captured by $()
  echo "${1%.txt}.csv"           # stdout - captured by $()
}
```

### Local Variables

```bash
# Without local: variables are global (they leak out of functions)
leaky() {
  x=42
}
leaky
echo "$x"   # 42 - leaked from the function

# With local: variables are scoped to the function
contained() {
  local x=42
}
contained
echo "$x"   # empty - x was local to the function
```

`local` is a bash extension (but supported by dash and most sh implementations in
practice). In strict POSIX, there is no local scoping - all variables are global.

### Functions as Commands

Functions are commands. Everything that works with commands works with functions:

```bash
# Pipe to/from functions
upper() {
  tr '[:lower:]' '[:upper:]'
}
echo "hello" | upper    # HELLO

# Use in conditionals
has_root() {
  [ "$(id -u)" -eq 0 ]
}
if has_root; then echo "Running as root"; fi

# Override commands (use with caution)
cd() {
  builtin cd "$@" && echo "Now in: $PWD"
}
```

> **AGENTIC GROUNDING:** Agents generate functions with global variables, missing
> `local` declarations, debug output on stdout (contaminating captured return values),
> and inconsistent use of `"$@"` vs `$@`. When reviewing agent-generated shell functions,
> check: are variables declared local? Is debug output on stderr? Are arguments quoted?
> Is `"$@"` used to pass arguments through?

---

## 7. Error Handling

**Estimated time: 60 minutes**

Shell scripts are silent about errors by default. A command fails, the script continues
to the next line. This is the source of cascading failures in CI pipelines, deployment
scripts, and agent-generated automation.

### The Defensive Header

```bash
#!/bin/bash
set -euo pipefail
```

This is three separate settings. Know what each does - and what it does NOT do.

### set -e (Exit on Error)

When `-e` is set, the script exits immediately when a command returns a non-zero exit
code.

```bash
set -e
mkdir /nonexistent/path    # fails, script exits here
echo "This never runs"
```

**What `-e` does NOT catch:**

```bash
set -e

# Commands in conditionals are exempt
if bad_command; then     # bad_command fails, but -e doesn't trigger
  echo "this runs if bad_command succeeds"
fi

# Commands before && or || are exempt
bad_command && echo "ok"   # bad_command fails, script continues
bad_command || echo "failed"  # bad_command fails, script continues

# Commands in the test position of while/until are exempt
while bad_command; do    # bad_command fails, loop exits normally
  break
done

# Negated commands are exempt
! bad_command   # exit code is inverted, -e sees 0

# Commands in command substitution may or may not trigger -e
# This depends on the shell version and is unreliable
result=$(bad_command)   # behaviour varies!
```

**The compound command trap:**

```bash
set -e

# This exits on failure (single command)
false

# This does NOT exit on failure (false is part of a compound command)
false; true    # false fails, but true succeeds, so the compound succeeds

# This exits (both fail)
false; false
```

The rule: `set -e` is a safety net, not a guarantee. It catches gross errors. It does
not catch errors in conditionals, short-circuit expressions, or pipelines (without
`pipefail`).

### set -u (Error on Unset Variables)

```bash
set -u
echo "$undefined_variable"
# bash: undefined_variable: unbound variable

# Use ${var:-default} to safely handle potentially unset variables:
echo "${undefined_variable:-default value}"    # no error
```

This catches typos in variable names. Without `-u`, `$UNDEFNIED_VAR` silently expands
to an empty string.

### set -o pipefail

By default, a pipeline's exit code is the exit code of the LAST command:

```bash
false | true
echo $?    # 0 - pipeline "succeeded" even though false failed

set -o pipefail
false | true
echo $?    # 1 - pipeline fails because false failed
```

With `pipefail`, the pipeline's exit code is the exit code of the rightmost command
that failed. Combined with `set -e`, this means `bad_command | good_command` will
cause the script to exit.

### trap - Cleanup on Exit

`trap` registers a command to run when the shell receives a signal or exits:

```bash
#!/bin/bash
set -euo pipefail

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT    # runs on ANY exit (0, error, signal)

# Use $tmpdir freely - it will be cleaned up no matter how the script exits
cp important_file "$tmpdir/"
process_stuff "$tmpdir/"
# If process_stuff fails, the trap still fires and cleans up
```

**Common trap signals:**

```bash
trap 'cleanup_function' EXIT      # any exit
trap 'echo "Interrupted" >&2; exit 130' INT   # Ctrl-C
trap 'echo "Terminated" >&2; exit 143' TERM   # kill
trap '' HUP                       # ignore hangup (for daemons)
```

The `EXIT` trap is the most useful. It fires on normal exit, on `exit N`, on `set -e`
triggered exit, and on most signals. It is the shell equivalent of a `finally` block
or a Go `defer`.

**The ERR trap (bash):**

```bash
trap 'echo "Error on line $LINENO" >&2' ERR
```

The ERR trap fires when a command fails (similar to `set -e` conditions). But it has the
same exemptions as `set -e` - it does not fire in conditionals, after `&&` or `||`, etc.
It is also a bash extension, not POSIX. Use it for debugging, but do not rely on it for
correctness.

### Putting It All Together - The Defensive Template

```bash
#!/bin/bash
set -euo pipefail

# Cleanup on exit
cleanup() {
  local exit_code=$?
  # Cleanup commands here
  rm -rf "${tmpdir:-}"
  exit "$exit_code"
}
trap cleanup EXIT

# Usage
usage() {
  cat >&2 <<EOF
Usage: $(basename "$0") [options] <argument>

Options:
  -v    Verbose output
  -h    Show this help
EOF
}

# Argument parsing
verbose=false
while getopts ":vh" opt; do
  case "$opt" in
    v) verbose=true ;;
    h) usage; exit 0 ;;
    :) echo "Error: -$OPTARG requires an argument" >&2; exit 1 ;;
    *) echo "Error: unknown option -$OPTARG" >&2; usage; exit 1 ;;
  esac
done
shift $((OPTIND - 1))

# Require positional argument
: "${1:?Error: argument required. Use -h for help.}"

# Main logic here
tmpdir=$(mktemp -d)
echo "Working in $tmpdir"
```

> **AGENTIC GROUNDING:** Agents almost never generate `set -euo pipefail` unless
> explicitly prompted. They write scripts where failures cascade silently. The most
> dangerous pattern: a CI pipeline step that runs a series of commands without error
> handling. The first command fails silently, subsequent commands operate on stale or
> missing data, and the pipeline reports success because the last command (often an echo)
> returns 0. Every agent-generated script should be checked for this header.

---

## 8. POSIX sh vs Bash

**Estimated time: 45 minutes**

### What is POSIX sh?

POSIX (Portable Operating System Interface) defines a shell language standard. Any
compliant shell implements this standard: bash (in POSIX mode), dash, ash, busybox sh,
ksh, zsh (in emulation mode).

`/bin/sh` is NOT necessarily bash. On Debian/Ubuntu, `/bin/sh` is dash (a minimal POSIX
shell). On Arch, `/bin/sh` is bash. On Alpine (Docker), `/bin/sh` is busybox ash.

```bash
# Check what /bin/sh actually is
ls -la /bin/sh
# Debian: /bin/sh -> dash
# Arch:   /bin/sh -> bash
# Alpine: /bin/sh -> /bin/busybox

# Check bash version
bash --version
```

### What POSIX sh Does Not Have

If your script's shebang is `#!/bin/sh`, you cannot use any of these:

| Feature | POSIX sh | Bash |
|---------|----------|------|
| `[[ ]]` keyword test | No | Yes |
| Arrays | No | Yes |
| Associative arrays | No | Yes (4.0+) |
| `${var//pat/rep}` replace-all | No | Yes |
| `<(process substitution)` | No | Yes |
| `<<<` here strings | No | Yes |
| `{1..10}` brace expansion | No | Yes |
| `(( ))` arithmetic | No | Yes |
| `&>` redirect stdout+stderr | No | Yes |
| `function` keyword | No | Yes |
| `local` keyword | No | Yes (but dash has it) |
| `select` menu loop | No | Yes |
| `BASH_REMATCH` regex | No | Yes |
| `set -o pipefail` | No | Yes |

### When to Use POSIX sh

- **Dockerfiles** - `RUN` commands execute with `/bin/sh` by default. In Alpine-based
  images, that is ash/busybox. Bash may not be installed.
- **System init scripts** - `/etc/init.d/` scripts should be POSIX for portability.
- **Any script that might run on different systems** - if you cannot guarantee bash
  is installed, write POSIX sh.

```dockerfile
# This works in Alpine (busybox sh):
RUN if [ -f /etc/config ]; then cp /etc/config /etc/config.bak; fi

# This FAILS in Alpine (no [[ ]] in busybox):
RUN if [[ -f /etc/config ]]; then cp /etc/config /etc/config.bak; fi
```

### When to Use Bash

- Project scripts where you control the runtime environment
- CI pipelines where you specify the shell
- Interactive shell scripts

The project's Makefile declares `SHELL := /bin/bash`, which means all make recipes
run in bash. This is intentional - it enables `set -o pipefail` and other bash features
in recipes.

### Writing POSIX sh

```bash
#!/bin/sh
# POSIX equivalent of bash features:

# Instead of [[ ]], use [ ] with quoting
if [ -f "$file" ] && [ -r "$file" ]; then
  echo "File exists and is readable"
fi

# Instead of (( )), use $(( )) for arithmetic
i=0
while [ "$i" -lt 10 ]; do
  i=$((i + 1))
done

# Instead of arrays, use positional parameters
set -- one two three
for item; do    # implicitly iterates over "$@"
  echo "$item"
done

# Instead of ${var//pat/rep}, use sed
cleaned=$(echo "$input" | sed 's/old/new/g')

# Instead of <<<, use echo | or here-doc
echo "$string" | while read -r line; do echo "$line"; done

# Instead of <(), use temp files or named pipes
mkfifo /tmp/pipe.$$
sort file1 > /tmp/pipe.$$ &
diff /tmp/pipe.$$ <(sort file2)  # ... you can't do this in POSIX
# In POSIX, you use temp files:
sort file1 > /tmp/sorted1.$$
sort file2 > /tmp/sorted2.$$
diff /tmp/sorted1.$$ /tmp/sorted2.$$
rm /tmp/sorted1.$$ /tmp/sorted2.$$
```

### The Shebang Line

The first line of a script tells the kernel which interpreter to use:

```bash
#!/bin/bash       # Use bash specifically
#!/bin/sh         # Use the system POSIX shell (might be dash, ash, bash)
#!/usr/bin/env bash   # Find bash in $PATH (more portable across systems)
```

`#!/usr/bin/env bash` is preferred for project scripts because bash may be in different
locations on different systems (`/bin/bash`, `/usr/bin/bash`, `/usr/local/bin/bash` on
macOS with Homebrew).

> **AGENTIC GROUNDING:** Agents do not distinguish between POSIX sh and bash when
> generating scripts. They write bash syntax in `#!/bin/sh` scripts. They put `[[ ]]`
> in Dockerfiles that use Alpine. When reviewing agent-generated Dockerfiles, check
> the base image (Alpine = ash, Ubuntu/Debian = dash for sh) and verify the shell
> commands are compatible. When reviewing agent-generated scripts, check the shebang
> matches the syntax used.

> **HISTORY:** Bash (1989) was written by Brian Fox for the GNU Project as a free
> software replacement for the Bourne shell. The name stands for "Bourne Again Shell."
> The POSIX standard (IEEE 1003.2) was published in 1992, codifying a common subset of
> sh behaviour. The dash shell (Debian Almquist Shell) was adopted by Debian as `/bin/sh`
> in 2006 for performance - dash is 4x faster than bash for script interpretation because
> it does not load bash's extensive feature set. This is why Dockerfiles that work on
> your laptop (where `/bin/sh` is bash) can break in production (where `/bin/sh` is dash).

---

## 9. Here Documents and Here Strings

**Estimated time: 30 minutes**

### Here Documents

A here-document provides multi-line input to a command without a temp file:

```bash
# Basic here-doc - variable expansion happens
cat <<EOF
Hello, $USER
Today is $(date +%A)
Your home is $HOME
EOF

# Quoted delimiter - NO expansion
cat <<'EOF'
This is literal: $USER
No expansion: $(date)
Backslashes are literal: \n \t \\
EOF

# Indented here-doc (<<- strips leading TABS, not spaces)
if true; then
	cat <<-EOF
	This is indented with tabs
	Tabs are stripped from the output
	EOF
fi
```

**Practical uses:**

```bash
# Write a config file from a script
cat > /etc/myapp/config.yaml <<EOF
database:
  host: ${DB_HOST:?DB_HOST required}
  port: ${DB_PORT:-5432}
  name: ${DB_NAME:-myapp}
EOF

# Feed SQL to a database client
psql "$DATABASE_URL" <<'EOF'
SELECT count(*) FROM users
WHERE created_at > NOW() - INTERVAL '7 days';
EOF

# Multi-line string in a variable
read -r -d '' usage <<'EOF' || true
Usage: mycommand [options]

Options:
  -v    Verbose
  -h    Help
EOF
echo "$usage"
# Note: || true is needed because read returns non-zero at EOF with -d ''
```

### Here Strings (Bash Extension)

A here-string feeds a string as stdin to a command:

```bash
# Instead of: echo "$string" | command
# Use: command <<< "$string"

# Count words in a variable
wc -w <<< "$message"

# Parse a CSV field
IFS=, read -r name age city <<< "Alice,30,London"

# Feed to bc for math
bc <<< "scale=2; 22 / 7"
```

Here strings are a bash extension. In POSIX sh, use `echo "$string" | command` or a
one-line here-document instead.

### Here Documents in Makefiles

In a Makefile context, here-documents interact with make's recipe processing. Each line
of a recipe is normally a separate shell invocation. The `.ONESHELL:` directive (used
in this project's Makefile) changes this so the entire recipe runs in one shell.

Without `.ONESHELL`, here-documents in Makefiles require the `define/endef` construct
or continuation backslashes.

> **AGENTIC GROUNDING:** Agents frequently use here-documents in GitHub Actions
> workflows for creating multi-line files, generating configs, and feeding input to
> commands. The most common bug: using `<<EOF` (with expansion) when `<<'EOF'` (without
> expansion) was intended, causing `$VARIABLE` references in the content to be expanded
> by the shell. In CI contexts where environment variables are set, this silently
> injects unexpected values. Always check the delimiter quoting.

---

## Challenges

The challenges below are designed to build and verify the skills from this step. They
escalate from targeted drills to full-context analysis of production code.

---

## Challenge: Quoting Gauntlet

**Estimated time: 30 minutes**

Create files with adversarial names and write scripts that correctly handle them.

### Setup

```bash
mkdir -p /tmp/quoting-gauntlet && cd /tmp/quoting-gauntlet

# Create files with adversarial names
touch "normal.txt"
touch "has spaces.txt"
touch "has  double  spaces.txt"
touch 'has "quotes".txt'
touch "has 'single quotes'.txt"
touch $'has\nnewline.txt'          # actual newline in filename
touch "has * glob.txt"
touch -- "-starts-with-dash.txt"   # -- prevents - being read as an option
touch $'has\ttab.txt'
```

### Tasks

1. Write a script that lists all `.txt` files in the directory, one per line, handling
   all adversarial names correctly. Demonstrate that `for f in $(ls *.txt)` fails and
   explain exactly why, referencing the evaluation order from Section 2.

2. Write a script that copies all files to a backup directory, preserving the exact
   filenames. Test with each adversarial name.

3. Write a script that counts the number of lines in each file (they are all empty, so
   the count should be 0 for all). Show the failure mode when files are not quoted.

4. Write a one-liner that deletes the file starting with a dash. Explain why `rm -starts-with-dash.txt` fails.

### Expected Learning

You should be able to explain:
- Why `for f in *.txt` works but `for f in $(ls *.txt)` breaks
- Why glob expansion is safe (it produces correctly-delimited arguments) but command
  substitution output is subject to word splitting
- Why `rm -- "-starts-with-dash.txt"` works (end-of-options marker)
- Why `find -print0 | xargs -0` exists

---

## Challenge: Parameter Expansion Workout

**Estimated time: 30 minutes**

Given the following file paths, extract the requested components using ONLY parameter
expansion. No `dirname`, `basename`, `sed`, `awk`, `cut`, or any external commands.

```bash
# Input paths
p1="/home/user/projects/myapp/src/main.rs"
p2="archive.tar.gz"
p3="/var/log/nginx/access.log.2024-01-15.gz"
p4="./relative/path/to/file"
p5="/no-extension"
```

### Tasks

For each path, extract:
1. The directory (equivalent to `dirname`)
2. The filename (equivalent to `basename`)
3. The extension (just the last one, e.g., `gz` not `tar.gz`)
4. The full extension (e.g., `tar.gz` for `p2`)
5. The filename without any extension
6. The filename with the extension changed to `.bak`

### Bonus

Write a function `path_components()` that takes a path and prints directory, name,
and extension on separate lines, using only parameter expansion. Handle edge cases:
no extension, no directory, multiple extensions, trailing slash.

---

## Challenge: Pipeline Pitfalls

**Estimated time: 30 minutes**

### The Bug

```bash
#!/bin/bash
total=0
cat /etc/passwd | while IFS=: read -r user _ uid _; do
  if [ "$uid" -ge 1000 ] 2>/dev/null; then
    total=$((total + 1))
  fi
done
echo "Users with UID >= 1000: $total"
```

### Tasks

1. Run this script. Observe that it prints 0. Explain exactly why, tracing the process
   tree (which processes are created, which variable is in which process).

2. Fix it using input redirection (POSIX compatible).

3. Fix it using process substitution (bash).

4. Fix it using `lastpipe` (bash 4.2+).

5. Fix it by restructuring to avoid the problem entirely (move the `echo` inside the
   subshell).

6. For each fix, explain the tradeoffs: portability, readability, correctness.

---

## Challenge: Defensive Script Template

**Estimated time: 45 minutes**

Write a production-grade bash script template that includes:

1. Shebang line with `#!/usr/bin/env bash`
2. `set -euo pipefail`
3. A `cleanup` function registered with `trap ... EXIT`
4. A `usage` function that prints to stderr
5. Argument parsing with `getopts` supporting `-v` (verbose), `-o <file>` (output file),
   and `-h` (help)
6. Required positional argument validation using `${1:?}`
7. A `log` function that prints timestamped messages to stderr, and only in verbose mode
8. A `die` function that prints an error message and exits with a given code
9. Temporary directory creation and cleanup
10. Proper exit codes (0 success, 1 user error, 2 system error)

The script should process an input file (the positional argument) and write results to
the output file (defaulting to stdout). The actual processing can be trivial - the
template is the point.

### Verification

- Run with no arguments: should print usage and exit 1
- Run with `-h`: should print usage and exit 0
- Run with a nonexistent file: should print an error and exit 2
- Kill with Ctrl-C mid-execution: should clean up temp directory
- Run with `bash -n script.sh`: should pass syntax check
- Run with `shellcheck script.sh`: should pass with no warnings

---

## Challenge: Parse the POLECAT Wrapper

**Estimated time: 45 minutes**

This is the POLECAT wrapper from the project's Makefile (`Makefile:50-74`):

```make
define POLECAT
	@TASK=$$(basename $(1) .md); \
	echo ">>> polecat $$TASK -- streaming to $(LOGS)/$$TASK.log"; \
	PRE_HEAD=$$(git rev-parse HEAD); \
	PRE_DIFF=$$(git diff --stat); \
	PRE_UNTRACKED=$$(git ls-files --others --exclude-standard | sort); \
	timeout $(POLECAT_TIMEOUT) claude -p "$$(cat $(1))" \
		--dangerously-skip-permissions \
		2>&1 | tee $(LOGS)/$$TASK.log; \
	EXIT_CODE=$$?; \
	if [ $$EXIT_CODE -eq 124 ]; then \
		echo "ERROR: polecat $$TASK timed out after $(POLECAT_TIMEOUT)s"; exit 1; \
	fi; \
	if [ $$EXIT_CODE -ne 0 ]; then \
		echo "ERROR: polecat $$TASK exited with code $$EXIT_CODE"; exit 1; \
	fi; \
	POST_HEAD=$$(git rev-parse HEAD); \
	POST_DIFF=$$(git diff --stat); \
	POST_UNTRACKED=$$(git ls-files --others --exclude-standard | sort); \
	if [ "$$PRE_HEAD" = "$$POST_HEAD" ] \
		&& [ "$$PRE_DIFF" = "$$POST_DIFF" ] \
		&& [ "$$PRE_UNTRACKED" = "$$POST_UNTRACKED" ]; then \
		echo "ERROR: polecat $$TASK produced no delta -- noop detected"; exit 1; \
	fi
endef
```

### Tasks

Annotate every line. For each line, answer:

1. **What does it do?** Plain English.
2. **Why `$$` instead of `$`?** Make processes recipes through its own variable expansion
   first, where `$` is make's variable sigil. `$$` escapes to a literal `$` in the
   shell command. What would happen if you wrote `$TASK` instead of `$$TASK`?
3. **Why `$(1)` with one `$`?** This IS a make variable (the first argument to the
   `POLECAT` macro), not a shell variable. Make expands it before the shell sees it.
4. **What does `@` at the start do?** Suppresses make echoing the command.
5. **What does `\` at line end do?** Continues to the next line. With `.ONESHELL:`,
   the entire recipe is one shell invocation, but the `define` block still uses
   continuation for the make parser.
6. **What does `timeout 300 command` do at the process level?** (Connect to Step 1:
   timeout forks the command as a child, starts a timer, sends SIGTERM after 300s,
   then SIGKILL after a grace period. Exit code 124 means the timeout fired.)
7. **What is the delta detection doing?** It captures git state before and after the
   polecat run. If HEAD, diff stat, and untracked files are all identical, the polecat
   produced no changes and it is treated as a failure.
8. **Why pipe through `tee`?** To stream output to the terminal (for observation) AND
   capture it to a log file simultaneously.
9. **What is `$$(cat $(1))`?** Make expands `$(1)` to the plan filename. Then the shell
   runs `cat <filename>` and substitutes its output. The plan file contents become the
   `-p` argument to claude.

### Bonus

Identify what would break if `.ONESHELL:` were removed from the Makefile. (Hint: each
line would be a separate shell invocation, and variables set on one line would not be
available on the next.)

---

## Challenge: Shell Gotcha Quiz

**Estimated time: 45 minutes**

Each snippet looks correct but contains a bug. Identify the bug, explain the failure
mode, and provide the fix. Classify each bug by which section of this step it relates to.

### Gotcha 1

```bash
#!/bin/bash
set -e
count=$(grep -c "error" /var/log/syslog)
echo "Found $count errors"
```

**Hint:** What is the exit code of `grep -c` when there are zero matches?

### Gotcha 2

```bash
#!/bin/bash
dir="/tmp/my app/data"
mkdir -p $dir
```

**Hint:** How many directories does this create?

### Gotcha 3

```bash
#!/bin/bash
read -p "Enter filename: " file
if [ -f $file ]; then
  echo "File exists"
fi
```

**Hint:** What happens when the user enters nothing (presses Enter)?

### Gotcha 4

```bash
#!/bin/bash
for f in $(find . -name "*.bak" -type f); do
  rm "$f"
done
```

**Hint:** Works fine until a filename contains a space. What do `-exec` and `-print0` solve?

### Gotcha 5

```bash
#!/bin/bash
result=""
echo -e "line1\nline2\nline3" | while read -r line; do
  result="${result}${line},"
done
echo "Result: $result"
```

**Hint:** Section 4. The pipe creates a subshell.

### Gotcha 6

```bash
#!/bin/sh
if [[ -f /etc/config ]]; then
  source /etc/config
fi
```

**Hint:** Section 8. What is `/bin/sh` on Debian? On Alpine?

### Gotcha 7

```bash
#!/bin/bash
url="https://example.com/api?foo=bar&baz=qux"
curl $url
```

**Hint:** Two problems. One is quoting. The other is `&` in a shell context.

### Gotcha 8

```bash
#!/bin/bash
set -euo pipefail
files=$(ls *.txt 2>/dev/null)
if [ -z "$files" ]; then
  echo "No txt files"
  exit 0
fi
```

**Hint:** What does `set -e` do when `ls *.txt` fails (no .txt files)?

### Gotcha 9

```bash
#!/bin/bash
total=0
for n in $(seq 1 1000); do
  result=$(echo "scale=2; $n / 7" | bc)
  total=$(echo "$total + $result" | bc)
done
echo "Total: $total"
```

**Hint:** Not a correctness bug - a performance bug. How many processes does this spawn?

### Gotcha 10

```bash
#!/bin/bash
password=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 32)
echo "Generated password: $password"
```

**Hint:** `set -o pipefail` would kill this. Why? What does `head` do when it has enough
bytes?

---

## Quick Reference: Shell Evaluation Order

For quick lookup. Memorise this order - it explains most shell bugs.

```
1. Brace expansion         {a,b}      -> a b
2. Tilde expansion         ~          -> /home/user
3. Parameter expansion     $var       -> value
4. Command substitution    $(cmd)     -> output
5. Arithmetic expansion    $((1+2))   -> 3
6. Word splitting          value      -> val ue  (if IFS contains space between l and u)
7. Pathname expansion      *.txt      -> a.txt b.txt c.txt
8. Quote removal           "hello"    -> hello
```

Steps 6 and 7 are where bugs live. Double quotes suppress both.

---

## Quick Reference: Parameter Expansion

```bash
${var}              # basic expansion
${var:-default}     # default if unset/empty
${var:=default}     # assign default if unset/empty
${var:?error}       # error if unset/empty
${var:+alternate}   # alternate if set/non-empty
${var#pattern}      # strip shortest prefix
${var##pattern}     # strip longest prefix
${var%pattern}      # strip shortest suffix
${var%%pattern}     # strip longest suffix
${var/pat/rep}      # replace first match
${var//pat/rep}     # replace all matches
${var/#pat/rep}     # replace prefix
${var/%pat/rep}     # replace suffix
${#var}             # length
${var:offset:len}   # substring (bash)
${!prefix*}         # variable names matching prefix (bash)
```

---

## Quick Reference: Defensive Header

```bash
#!/usr/bin/env bash
set -euo pipefail

# set -e    Exit on error (with exemptions for conditionals/&&/||)
# set -u    Error on unset variable
# set -o pipefail   Pipeline fails if ANY command fails

trap 'cleanup' EXIT
```

---

## What to Read Next

**[Step 3: The Filesystem as State](/bootcamp/03-filesystem-as-state/)**

You now understand how the shell launches processes (Step 1) and how to compose those
processes using the shell language (this step). Step 3 covers the other half of the Unix
model: the filesystem. In Unix, nearly everything is a file - regular files, directories,
devices, pipes, sockets, `/proc`, `/sys`. Understanding the filesystem as a stateful
namespace is essential for:

- Understanding how configuration works (`/etc`, dotfiles, environment)
- Reading process state through `/proc/<pid>/`
- Understanding permissions, ownership, and capability models
- Working with container overlay filesystems
- Diagnosing "file not found" errors that are actually permission or mount issues

The shell and the filesystem are the two halves of the Unix interface. After Step 3,
you will have the complete foundation.

> **HISTORY:** The Shellshock vulnerability (CVE-2014-6271), disclosed in September 2014,
> was a bug in bash's function export mechanism that had existed since bash 1.03 (1989) -
> 25 years undetected. The bug was in how bash parsed environment variables that contained
> function definitions: it continued executing code after the function definition ended.
> An attacker could inject arbitrary commands into environment variables that would be
> executed when bash started. This affected every CGI web server, SSH forced-command
> system, and DHCP client that used bash. The lesson: the shell's apparent simplicity
> conceals deep complexity. Surface-level understanding is insufficient for security work.
> Shellshock was not a clever exploit of an obscure feature - it was a fundamental parsing
> error in the most widely deployed shell on Earth, hiding in plain sight for a quarter
> century.

```

### File: `sites/oceanheart/content/bootcamp/04-text-pipeline.md`

```
+++
title = "The Text Processing Pipeline - grep, sed, awk, jq, yq"
date = "2026-03-10"
description = "The tools that transform text streams: jq, grep, awk, sed, yq, and the supporting cast that make Unix pipelines practical."
tags = ["jq", "grep", "awk", "sed", "yq", "text-processing", "pipelines", "bootcamp"]
step = 4
tier = 1
estimate = "6-8 hours"
bootcamp = 1
+++

Step 4 of 12 in the Agentic Engineering Bootcamp.

---

## Why This Step Exists

Step 1 gave you processes. Step 2 gave you the shell to compose them. Step 3 gave you
the filesystem as state. Now you learn the VERBS - the tools that transform text streams.

The taxonomy analysis found that 75% of software categories reduce to data transformation.
A web server transforms an HTTP request into a response. A compiler transforms source into
machine code. A database transforms a query into a result set. At the Unix level, this
pattern becomes: text in, transform, text out. The tools in this step handle the majority
of text-to-text transformation.

Without these tools, pipes are plumbing with no fixtures. With them, you can query, filter,
transform, and reshape any text data flowing through the system.

> **AGENTIC GROUNDING:** When an agent generates structured output - JSON API responses,
> YAML configs, log files, CSV reports - these are the tools that let you verify, query,
> and transform that output. An agent claiming "I updated the config" is unverified until
> you run `yq '.key' config.yaml` and see the value. An agent producing metrics is opaque
> until you can pipe its output through `jq` and extract what matters. These tools are
> your verification instruments.

---

## Part 1: jq - The JSON Surgeon

**Estimated time: 1.5-2 hours**

We start with jq because JSON is the lingua franca of APIs, and jq's functional pipeline
model teaches the same thinking that makes the rest of this step click. jq has its own
pipe operator - you will write pipelines inside pipelines.

> **HISTORY:** jq was created by Stephen Dolan in 2012. It brought the Unix pipeline
> philosophy to structured data. Before jq, parsing JSON from the shell meant Python
> one-liners or fragile grep/sed hacks that broke on nested structures. jq made JSON
> a first-class citizen of the Unix pipeline.

### 1.1 First Contact - The Identity Filter

The simplest jq program is `.` - the identity filter. It reads JSON, pretty-prints it,
and outputs it unchanged.

```bash
# Raw JSON from an API is usually a single long line
printf '{"name":"alice","age":30,"active":true}' | jq '.'
```

Output:
```json
{
  "name": "alice",
  "age": 30,
  "active": true
}
```

This is already useful. APIs return minified JSON. `.` is your pretty-printer.

### 1.2 Field Access

Dot notation extracts fields. This is the operation you will use most.

```bash
# Single field
printf '{"name":"alice","age":30}' | jq '.name'
# Output: "alice"

# Nested field
printf '{"user":{"name":"alice","address":{"city":"London"}}}' | jq '.user.address.city'
# Output: "London"

# Array element by index
printf '{"items":["a","b","c"]}' | jq '.items[0]'
# Output: "a"

# Last element
printf '{"items":["a","b","c"]}' | jq '.items[-1]'
# Output: "c"
```

### 1.3 The jq Pipe - Pipelines Inside Pipelines

jq has its own `|` operator that works like the shell pipe but inside a single jq
expression. This is the key insight: jq programs are pipelines of filters.

```bash
# Array iteration + field access
printf '{"users":[{"name":"alice","age":30},{"name":"bob","age":25}]}' \
  | jq '.users[] | .name'
# Output:
# "alice"
# "bob"
```

`.users[]` iterates the array (producing one output per element), then `| .name` extracts
the name from each. The `[]` without an index is the iterator - it explodes an array into
individual elements.

```bash
# Chain multiple operations
printf '{"data":{"users":[{"name":"alice","role":"admin"},{"name":"bob","role":"user"}]}}' \
  | jq '.data.users[] | .role'
# Output:
# "admin"
# "user"
```

### 1.4 Raw Output and Shell Integration

By default, jq outputs JSON strings with quotes. When you need bare strings for shell
consumption, use `-r` (raw output).

```bash
# With quotes (default) - bad for shell
printf '{"name":"alice"}' | jq '.name'
# Output: "alice"

# Without quotes (-r) - good for shell
printf '{"name":"alice"}' | jq -r '.name'
# Output: alice

# Using jq output in a shell loop
printf '[{"host":"a.example.com"},{"host":"b.example.com"}]' \
  | jq -r '.[].host' \
  | while read -r host; do
      printf "Pinging %s\n" "$host"
    done
```

### 1.5 Filtering with select

`select()` keeps elements that match a condition and drops the rest. This is your WHERE
clause.

```bash
# Filter users by age
printf '[{"name":"alice","age":30},{"name":"bob","age":25},{"name":"carol","age":35}]' \
  | jq '.[] | select(.age > 28)'
# Output:
# {"name":"alice","age":30}
# {"name":"carol","age":35}

# Filter by string match
printf '[{"name":"api-server","status":"running"},{"name":"worker","status":"stopped"}]' \
  | jq '.[] | select(.status == "running") | .name'
# Output: "api-server"

# Combine conditions
printf '[{"name":"a","priority":"high","done":false},{"name":"b","priority":"high","done":true},{"name":"c","priority":"low","done":false}]' \
  | jq '.[] | select(.priority == "high" and .done == false) | .name'
# Output: "a"
```

### 1.6 Constructing New Objects

You can reshape JSON by constructing new objects and arrays.

```bash
# Rename fields
printf '{"first_name":"alice","birth_year":1994}' \
  | jq '{name: .first_name, age: (2026 - .birth_year)}'
# Output: {"name":"alice","age":32}

# Build an array from iteration
printf '{"users":[{"name":"alice","role":"admin"},{"name":"bob","role":"user"}]}' \
  | jq '[.users[] | {who: .name, is: .role}]'
# Output: [{"who":"alice","is":"admin"},{"who":"bob","is":"user"}]
```

Note the outer `[]` wrapping - without it you get multiple separate JSON objects; with it
you get a single JSON array.

### 1.7 map, add, and Aggregation

```bash
# Sum prices
printf '[{"item":"a","price":10},{"item":"b","price":20},{"item":"c","price":15}]' \
  | jq '[.[].price] | add'
# Output: 45

# map is shorthand for [.[] | expr]
printf '[1,2,3,4,5]' | jq 'map(. * 2)'
# Output: [2,4,6,8,10]

# Count elements
printf '[{"s":"open"},{"s":"closed"},{"s":"open"},{"s":"open"}]' \
  | jq '[.[] | select(.s == "open")] | length'
# Output: 3

# Group and count (the SQL GROUP BY equivalent)
printf '[{"s":"open"},{"s":"closed"},{"s":"open"},{"s":"open"}]' \
  | jq 'group_by(.s) | map({status: .[0].s, count: length})'
# Output: [{"status":"closed","count":1},{"status":"open","count":3}]
```

### 1.8 String Interpolation

jq can construct strings from data using `\()` interpolation inside strings.

```bash
printf '[{"name":"alice","score":95},{"name":"bob","score":87}]' \
  | jq -r '.[] | "\(.name) scored \(.score)%"'
# Output:
# alice scored 95%
# bob scored 87%
```

### 1.9 Passing Shell Variables into jq

Never interpolate shell variables into jq expressions by string concatenation. It breaks
on special characters and invites injection. Use `--arg`.

```bash
# WRONG - breaks on special characters, injection risk
status="open"
jq ".[] | select(.s == \"$status\")" file.json

# RIGHT - --arg creates a jq variable
status="open"
jq --arg s "$status" '.[] | select(.s == $s)' file.json
```

`--arg` always passes strings. For numeric values, use `--argjson`:

```bash
min_age=25
printf '[{"name":"alice","age":30},{"name":"bob","age":20}]' \
  | jq --argjson min "$min_age" '.[] | select(.age >= $min)'
```

### 1.10 Conditionals and the try Operator

```bash
# if-then-else
printf '[{"name":"alice","role":"admin"},{"name":"bob","role":"user"}]' \
  | jq -r '.[] | if .role == "admin" then "\(.name) (ADMIN)" else .name end'
# Output:
# alice (ADMIN)
# bob

# The ? operator suppresses errors on missing fields
printf '{"a":1}' | jq '.b.c?'
# Output: null (instead of error)

# try-catch
printf '{"data":"not-a-number"}' \
  | jq 'try (.data | tonumber) catch "parse failed"'
# Output: "parse failed"
```

### 1.11 Slurp Mode

By default, jq processes each JSON object in the input independently. `--slurp` (`-s`)
reads all inputs into a single array.

```bash
# Without slurp - processes each line independently
printf '{"n":1}\n{"n":2}\n{"n":3}\n' | jq '.n'
# Output: 1 2 3 (three separate outputs)

# With slurp - all inputs become one array
printf '{"n":1}\n{"n":2}\n{"n":3}\n' | jq -s '[.[].n] | add'
# Output: 6
```

This is critical when processing line-delimited JSON (JSONL), which is common in log
files and streaming APIs.

### 1.12 Real-World jq - Parsing the GitHub API

```bash
# Get the 5 most recent issues from a GitHub repo
gh api repos/anthropics/courses/issues --paginate \
  | jq -r '.[] | "\(.number)\t\(.state)\t\(.title[:60])"' \
  | head -5

# Get all open PRs with their review status
gh api repos/owner/repo/pulls?state=open \
  | jq -r '.[] | "\(.number)\t\(.user.login)\t\(.title[:50])\t\(.draft)"'

# Extract just the filenames from a git diff (JSON output)
gh api repos/owner/repo/pulls/42/files \
  | jq -r '.[].filename'
```

> **AGENTIC GROUNDING:** The project's `bin/triangulate` script parses structured YAML
> review findings from multiple AI models, matches them by similarity, and computes
> convergence metrics. The output is YAML, consumable by `yq`. When you need to quickly
> inspect triangulation results - "which findings did all three models agree on?" - jq
> and yq let you query the output directly without running the full Python script. For
> example: `yq '.[] | select(.convergence_count >= 3) | .title' findings-union.yaml`

---

## Part 2: grep and Regular Expressions - The Universal Search

**Estimated time: 1-1.5 hours**

grep is the most-used command in this step. You will use it more than any other tool here
because search is the most common text operation. Before you transform data, you have to
find it.

> **HISTORY:** Ken Thompson wrote grep in 1974. The name comes from the ed editor command
> `g/re/p` - "globally search for a regular expression and print matching lines." When
> Thompson's colleagues at Bell Labs asked for a standalone tool to search files, he
> extracted the regex engine from ed and built grep overnight. Regular expressions
> themselves were invented by mathematician Stephen Kleene in 1956 as a formal notation
> for describing patterns in language theory. Thompson implemented Kleene's mathematics in
> the QED editor (1968), then ed, then grep. From abstract algebra to the most practical
> text processing tool in computing - in under 20 years.

### 2.1 Basic grep

```bash
# Search for a pattern in a file
grep "error" /var/log/syslog

# Search recursively in a directory
grep -r "TODO" src/

# Case-insensitive search
grep -i "warning" app.log

# Invert match - lines that do NOT contain the pattern
grep -v "debug" app.log

# Count matching lines
grep -c "error" app.log

# Show line numbers
grep -n "function" src/main.ts

# List only filenames that contain a match
grep -rl "deprecated" lib/
```

### 2.2 Regular Expressions - The Pattern Language

Regular expressions are a language for describing text patterns. They are not specific to
grep - they appear in sed, awk, jq, Python, JavaScript, and virtually every programming
language. Learning them once pays off everywhere.

Use `grep -E` (extended regex) by default. Without `-E`, you need backslashes before
`+`, `?`, `{`, `(`, and `|`, which makes expressions harder to read.

**Anchors and boundaries:**

```bash
# ^ matches start of line, $ matches end of line
grep -E '^import' src/main.ts          # lines starting with "import"
grep -E '^\s*$' file.txt               # blank lines (only whitespace)
grep -E 'TODO$' src/main.ts            # lines ending with "TODO"

# \b matches a word boundary
grep -E '\berror\b' app.log            # "error" but not "errors" or "perror"
```

**Character classes and quantifiers:**

```bash
# . matches any single character
grep -E 'h.t' words.txt                # "hat", "hit", "hot", etc.

# [] matches any character in the set
grep -E '[aeiou]{3}' /usr/share/dict/words  # three consecutive vowels

# * means 0 or more, + means 1 or more, ? means 0 or 1
grep -E 'colou?r' text.txt             # "color" or "colour"
grep -E '[0-9]+\.[0-9]+' versions.txt  # version numbers like "1.5", "12.0"

# {n,m} matches between n and m times
grep -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' access.log  # IP addresses
```

**Groups and alternation:**

```bash
# () groups, | alternates
grep -E '(error|warning|critical)' app.log

# Back-references (requires -P for PCRE in grep, or use sed)
grep -P '(\w+)\s+\1' text.txt          # repeated words ("the the", "is is")
```

### 2.3 Practical grep Flags

```bash
# -o prints only the matching part (not the whole line)
grep -oE '[0-9]+\.[0-9]+\.[0-9]+' package.json   # extract version numbers

# -A/-B/-C shows context lines after/before/around each match
grep -A 3 "error" app.log              # match + 3 lines after
grep -B 2 "FAILED" test.log            # 2 lines before each failure
grep -C 1 "panic" server.log           # 1 line before and after

# -l lists files with matches, -L lists files without matches
grep -rl "console.log" src/            # files that still have console.log
grep -rL "test" lib/                   # source files missing tests
```

### 2.4 ripgrep (rg) - grep for the Modern Codebase

ripgrep is faster than grep, respects `.gitignore` by default, searches recursively by
default, and has saner output formatting. Use it for codebase searches.

```bash
# Basic search (recursive by default, respects .gitignore)
rg "TODO" src/

# Type filtering
rg "import" --type ts                  # only TypeScript files
rg "SELECT" --type sql                 # only SQL files

# Fixed string (no regex interpretation)
rg -F "user.name?.first" src/          # literal dots and question marks

# JSON output (machine-readable)
rg --json "error" app.log | jq '.data.lines.text'

# Count matches per file
rg -c "TODO" src/ | sort -t: -k2 -n -r | head -10
```

> **AGENTIC GROUNDING:** When an agent generates code, grep/rg is your first verification
> tool. "Did the agent actually remove all uses of the deprecated function?" -
> `rg "oldFunction" src/` answers in milliseconds. The Makefile's delta detection uses
> `git diff --stat` (text output) to check whether a polecat agent actually changed
> anything. grep is how you parse that output to find specific changes.

---

## Part 3: awk - The Programmable Filter

**Estimated time: 1.5-2 hours**

awk is to columnar text what jq is to JSON. If you have data in rows and columns -
log files, `ps` output, CSV, `/proc` files, `git log` output - awk is the tool.

> **HISTORY:** awk was created by Alfred Aho, Peter Weinberger, and Brian Kernighan at
> Bell Labs in 1977. The name is their initials. It was the first "little language" - a
> domain-specific language before that term existed. Aho later co-invented lex and
> contributed to compiler theory. Kernighan co-authored "The C Programming Language."
> awk has associative arrays (hash maps), predating Perl and Python by over a decade.

### 3.1 The awk Model

awk processes text line by line. For each line, it splits the line into fields and
applies pattern-action rules.

```
awk 'pattern { action }' input
```

If you omit the pattern, the action runs on every line. If you omit the action, matching
lines are printed.

```bash
# Print every line (like cat)
awk '{ print }' /etc/passwd

# Print lines matching a pattern (like grep)
awk '/error/' app.log

# Print specific fields
# By default, fields are split on whitespace
echo "alice 30 admin" | awk '{ print $1, $3 }'
# Output: alice admin
```

### 3.2 Fields and Separators

`$1` is the first field, `$2` the second, `$NF` the last. `$0` is the entire line.

```bash
# /etc/passwd is colon-separated
awk -F: '{ print $1, $7 }' /etc/passwd
# Output: root /bin/bash, daemon /usr/sbin/nologin, ...

# ps output is whitespace-separated
ps aux | awk '{ print $1, $2, $11 }'
# Output: USER PID COMMAND

# Tab-separated output
awk -F: 'BEGIN { OFS="\t" } { print $1, $3, $7 }' /etc/passwd
```

### 3.3 Built-in Variables

| Variable | Meaning |
|----------|---------|
| `$0`     | The entire current line |
| `$1..$N` | Fields 1 through N |
| `NR`     | Current record (line) number |
| `NF`     | Number of fields in current line |
| `FS`     | Field separator (default: whitespace) |
| `OFS`    | Output field separator (default: space) |
| `RS`     | Record separator (default: newline) |

```bash
# Add line numbers
awk '{ print NR, $0 }' file.txt

# Print lines with more than 5 fields
awk 'NF > 5' data.txt

# Print the last field of each line
awk '{ print $NF }' data.txt
```

### 3.4 BEGIN and END Blocks

`BEGIN` runs before any input is read. `END` runs after all input is processed.
This is where you initialize counters and print summaries.

```bash
# Count lines (like wc -l, but you understand the mechanism)
awk 'END { print NR }' file.txt

# Sum a column
awk '{ sum += $3 } END { print "Total:", sum }' sales.csv

# Average
awk '{ sum += $2; n++ } END { print "Average:", sum/n }' scores.txt

# Count pattern occurrences
awk '/error/ { count++ } END { print count, "errors" }' app.log
```

### 3.5 Conditionals and Pattern Matching

```bash
# Conditional printing
ps aux | awk '$3 > 5.0 { print $1, $2, $3, $11 }'
# Processes using more than 5% CPU

# Range pattern - print lines between two patterns (inclusive)
awk '/BEGIN_SECTION/,/END_SECTION/' config.txt

# Regex match on a specific field
awk -F: '$7 ~ /bash/ { print $1 }' /etc/passwd
# Users whose shell contains "bash"

# Negated match
awk -F: '$7 !~ /nologin/ { print $1 }' /etc/passwd
```

### 3.6 Associative Arrays

awk's associative arrays are hash maps. They are the key to aggregation.

```bash
# Count occurrences of each value in column 1
awk '{ count[$1]++ } END { for (k in count) print k, count[k] }' access.log

# Group-by with sum
# Given: "sales department amount" per line
awk '{ totals[$2] += $3 } END { for (dept in totals) print dept, totals[dept] }' sales.txt

# Top IP addresses from a web access log
awk '{ ips[$1]++ } END { for (ip in ips) print ips[ip], ip }' access.log \
  | sort -rn | head -10
```

### 3.7 printf for Formatted Output

awk's `printf` gives you full control over output formatting.

```bash
# Formatted table
ps aux | awk 'NR>1 { printf "%-12s %6s %5.1f%%  %s\n", $1, $2, $3, $11 }' | head -10

# Right-aligned numbers
awk '{ printf "%20s %10.2f\n", $1, $2 }' prices.txt
```

### 3.8 awk as a Programming Language

awk supports variables, loops, conditionals, functions, and string operations. It is a
complete programming language, though you should reach for Python when awk gets complex
(that is Step 5).

```bash
# Fibonacci
awk 'BEGIN { a=0; b=1; for(i=0; i<20; i++) { print a; c=a+b; a=b; b=c } }'

# Running average with window
awk '{
  buf[NR % 5] = $1
  if (NR >= 5) {
    sum = 0
    for (i in buf) sum += buf[i]
    printf "%d\t%.2f\n", NR, sum/5
  }
}' temperatures.txt
```

### 3.9 Real-World awk

```bash
# Parse git log into a commit frequency table by author
git log --format='%ae' | awk '{ authors[$1]++ } END { for (a in authors) print authors[a], a }' | sort -rn

# Memory usage by process name (from /proc or ps)
ps aux | awk 'NR>1 { mem[$11] += $6 } END { for (p in mem) printf "%10d KB  %s\n", mem[p], p }' | sort -rn | head -10

# Parse /proc/meminfo
awk '/^(MemTotal|MemFree|MemAvailable|Buffers|Cached):/ { printf "%-16s %8.1f MB\n", $1, $2/1024 }' /proc/meminfo

# Extract timing data from a log file
# Log format: "2026-03-10T14:23:01 INFO request completed in 234ms"
grep "completed in" app.log \
  | awk '{ gsub(/ms/, "", $NF); times[NR]=$NF; sum+=$NF }
    END {
      n=NR
      printf "Requests: %d\n", n
      printf "Total:    %dms\n", sum
      printf "Average:  %.1fms\n", sum/n
    }'
```

> **AGENTIC GROUNDING:** `git log --format=...` produces text. `git diff --stat` produces
> text. `ps aux` produces text. Agent-generated metrics, build output, test results - all
> text. awk is the tool that parses these columnar text streams into structured data. The
> Makefile's polecat wrapper captures `git diff --stat` before and after an agent run to
> detect whether the agent actually produced changes. That comparison is a text operation
> that awk handles naturally.

---

## Part 4: sed - The Stream Editor

**Estimated time: 1-1.5 hours**

sed reads input line by line, applies transformation commands, and outputs the result.
It is the simplest transformation tool here: where grep finds and awk computes, sed
substitutes.

> **HISTORY:** sed was written by Lee McMahon at Bell Labs in 1974. It was designed to
> process files too large for ed (the interactive line editor). The "stream" in stream
> editor means it processes input sequentially without loading the entire file into memory.
> This design made it practical for files larger than available RAM - a real constraint in
> 1974 when a PDP-11 had 256KB.

### 4.1 Substitution - The Core Operation

90% of sed usage is the `s` command: `s/pattern/replacement/`.

```bash
# Replace first occurrence on each line
echo "hello world hello" | sed 's/hello/goodbye/'
# Output: goodbye world hello

# Replace ALL occurrences on each line (g flag)
echo "hello world hello" | sed 's/hello/goodbye/g'
# Output: goodbye world goodbye

# Case-insensitive replacement (GNU extension)
echo "Hello HELLO hello" | sed 's/hello/hi/gi'
# Output: hi hi hi
```

### 4.2 In-Place Editing

`-i` modifies the file directly. This is the most dangerous sed flag - there is no undo
except your version control.

```bash
# GNU sed (Linux) - in-place edit, no backup
sed -i 's/old/new/g' config.txt

# GNU sed - in-place with backup
sed -i.bak 's/old/new/g' config.txt    # creates config.txt.bak

# BSD sed (macOS) - requires an argument to -i, even if empty
sed -i '' 's/old/new/g' config.txt
```

The portable pattern for scripts that must work on both GNU and BSD:

```bash
sed -i.bak 's/old/new/g' file.txt && rm file.txt.bak
```

### 4.3 Address Ranges

You can restrict sed commands to specific lines or patterns.

```bash
# Line 3 only
sed '3s/foo/bar/' file.txt

# Lines 3 through 7
sed '3,7s/foo/bar/' file.txt

# From a pattern to another pattern
sed '/START/,/END/s/foo/bar/g' file.txt

# From a pattern to end of file
sed '/BEGIN/,$s/foo/bar/g' file.txt
```

### 4.4 Delete, Insert, Append

```bash
# Delete lines matching a pattern
sed '/^#/d' config.txt                 # remove comment lines
sed '/^$/d' file.txt                   # remove blank lines

# Delete a range
sed '10,20d' file.txt                  # remove lines 10-20

# Insert a line BEFORE a match
sed '/\[database\]/i\# Database configuration' config.ini

# Append a line AFTER a match
sed '/^server=/a\backup=192.168.1.2' config.ini
```

### 4.5 Back-References

Parentheses in the pattern capture groups. `\1`, `\2` etc. refer to them in the
replacement.

```bash
# Swap first and last name
echo "Alice Smith" | sed -E 's/^(\w+) (\w+)$/\2, \1/'
# Output: Smith, Alice

# Add quotes around a value
echo "name=alice" | sed -E 's/^([^=]+)=(.*)$/\1="\2"/'
# Output: name="alice"

# Extract a version number
echo "version: 2.4.1-beta" | sed -E 's/.*([0-9]+\.[0-9]+\.[0-9]+).*/\1/'
# Output: 2.4.1
```

Note: use `sed -E` for extended regex (same as `grep -E`). Without it, you need
`\(` and `\)` for groups.

### 4.6 Multiple Commands

```bash
# Chain with -e or semicolons
sed -e 's/foo/bar/g' -e 's/baz/qux/g' file.txt
sed 's/foo/bar/g; s/baz/qux/g' file.txt

# Comment out a section
sed '/^server_name/,/^}/s/^/#/' nginx.conf
```

### 4.7 Real-World sed

```bash
# Strip ANSI color codes from terminal output
sed 's/\x1b\[[0-9;]*m//g' colored-output.txt

# Convert environment variable format
# FROM: export DB_HOST=localhost
# TO:   DB_HOST: localhost
sed -E 's/^export ([A-Z_]+)=(.*)/\1: \2/' .env

# Fix a config value across all YAML files
find . -name "*.yaml" -exec sed -i 's/timeout: 30/timeout: 60/g' {} +

# Rename a TypeScript import across a codebase
find src/ -name "*.ts" -exec sed -i -E "s/from ['\"]\.\/old-module['\"]/from '.\/new-module'/g" {} +
```

> **AGENTIC GROUNDING:** sed is the tool for batch modifications - the kind of change
> an agent might make across many files. When you need to verify that a rename was applied
> correctly, or roll back a pattern replacement, or modify configs in a pipeline, sed does
> the work. But sed in-place editing (`-i`) is destructive. In an agentic workflow, always
> verify the transformation on a sample before running it across files: pipe first, `-i`
> second.

---

## Part 5: yq - YAML Processing

**Estimated time: 0.5-1 hour**

yq applies the jq mental model to YAML. If you understand jq (Part 1), yq is a syntax
shift, not a conceptual shift.

There are two tools called yq. This material covers mikefarah/yq (written in Go, the
standard on most systems). The other (kislyuk/yq, Python) is a thin wrapper around jq
that converts YAML to JSON, runs jq, and converts back.

### 5.1 Reading YAML

```bash
# Extract a field
yq '.name' config.yaml

# Nested access
yq '.database.host' config.yaml

# Array element
yq '.services[0].name' docker-compose.yaml

# Iterate array
yq '.items[]' list.yaml
```

### 5.2 Querying with select

```bash
# Filter items by status
yq '.[] | select(.status == "open")' backlog.yaml

# Filter and extract a field
yq '.[] | select(.priority == "high") | .title' backlog.yaml

# Combine conditions
yq '.[] | select(.status == "open" and .priority == "high")' backlog.yaml
```

### 5.3 Modifying YAML

```bash
# Set a value (outputs to stdout, does not modify file)
yq '.database.port = 5433' config.yaml

# In-place modification
yq -i '.database.port = 5433' config.yaml

# Add an element to an array
yq -i '.items += [{"name": "new item", "status": "open"}]' list.yaml

# Delete a field
yq -i 'del(.deprecated_field)' config.yaml
```

### 5.4 Format Conversion

```bash
# YAML to JSON
yq -o=json config.yaml

# JSON to YAML
yq -P config.json       # -P is "pretty print" which defaults to YAML output

# YAML to CSV (for simple flat structures)
yq -o=csv '.items' data.yaml
```

### 5.5 Real-World yq

```bash
# Query the project backlog directly (faster than running the Python script)
yq '.[] | select(.status == "open") | .title' docs/internal/backlog.yaml

# Count open items by priority
yq '[.[] | select(.status == "open")] | group_by(.priority) | .[] | {priority: .[0].priority, count: length}' docs/internal/backlog.yaml

# Edit a Docker Compose service
yq -i '.services.app.environment.NODE_ENV = "production"' docker-compose.yaml

# Merge two YAML files
yq eval-all 'select(fileIndex == 0) * select(fileIndex == 1)' base.yaml override.yaml

# Extract all image tags from a Kubernetes manifest
yq '.spec.containers[].image' deployment.yaml
```

> **AGENTIC GROUNDING:** The project's `backlog.yaml` is managed by a Python CLI, but
> ad-hoc queries are faster with yq. When you want to verify an agent updated the backlog
> correctly, or check how many items are in a particular state, yq gives you the answer
> in a single command. The `bin/triangulate` script exports metrics as YAML - you can
> query those exports with yq without running the full script.

---

## Part 6: The Supporting Cast

**Estimated time: 1 hour**

These tools are rarely the star, but they complete nearly every pipeline. They are the
connective tissue.

### 6.1 sort

```bash
# Alphabetical sort
sort names.txt

# Numeric sort
sort -n numbers.txt

# Sort by specific field (e.g., sort by 3rd column)
sort -t, -k3 -n data.csv

# Reverse sort
sort -rn numbers.txt

# Unique sort (sort + deduplicate in one step)
sort -u names.txt

# Sort human-readable sizes
du -sh /var/log/* 2>/dev/null | sort -h
```

### 6.2 uniq

uniq only deduplicates ADJACENT lines. This is why you almost always `sort | uniq`.

```bash
# Deduplicate sorted input
sort access.log | uniq

# Count occurrences (the most common use)
awk '{ print $1 }' access.log | sort | uniq -c | sort -rn | head -10
# Top 10 IP addresses by request count

# Show only duplicated lines
sort names.txt | uniq -d

# Show only unique (non-duplicated) lines
sort names.txt | uniq -u
```

### 6.3 cut

cut extracts columns from delimited text. It is simpler than awk for simple cases.

```bash
# Extract field 1 from colon-delimited file
cut -d: -f1 /etc/passwd

# Extract fields 1 and 7
cut -d: -f1,7 /etc/passwd

# Extract characters 1-10
cut -c1-10 file.txt

# Extract from a CSV (comma-delimited)
cut -d, -f2,4 data.csv
```

### 6.4 tr

tr translates or deletes characters. It operates on characters, not strings.

```bash
# Uppercase
echo "hello" | tr 'a-z' 'A-Z'
# Output: HELLO

# Delete characters
echo "hello world 123" | tr -d '0-9'
# Output: hello world

# Squeeze repeated characters
echo "too    many    spaces" | tr -s ' '
# Output: too many spaces

# Replace newlines with commas (turning lines into CSV)
printf "a\nb\nc\n" | tr '\n' ','
# Output: a,b,c,

# Delete carriage returns (fix Windows line endings)
tr -d '\r' < windows-file.txt > unix-file.txt
```

### 6.5 wc

```bash
# Count lines
wc -l file.txt

# Count words
wc -w file.txt

# Count characters
wc -c file.txt

# Count lines in multiple files
find src/ -name "*.ts" | xargs wc -l | tail -1
# Total lines of TypeScript
```

### 6.6 tee

tee splits a stream - it writes to a file AND passes through to stdout. Named after a
T-junction pipe fitting.

```bash
# Save output AND see it on screen
make build 2>&1 | tee build.log

# Insert a checkpoint in a pipeline (see intermediate results)
cat access.log | awk '{ print $1 }' | tee /dev/stderr | sort | uniq -c | sort -rn | head
# tee /dev/stderr shows the intermediate IP list on stderr while the pipeline continues

# Write to multiple files
echo "data" | tee file1.txt file2.txt > /dev/null
```

### 6.7 xargs

xargs converts stdin into command arguments. It bridges text streams and command
invocation.

```bash
# Delete all .log files found by find
find /tmp -name "*.log" -print0 | xargs -0 rm -f
# -print0 and -0 use null delimiters (handles filenames with spaces)

# Run a command for each line of input
cat urls.txt | xargs -I{} curl -sS "{}" -o /dev/null -w "%{http_code} {}\n"

# Parallel execution
find . -name "*.ts" -print0 | xargs -0 -P4 -I{} npx tsc --noEmit "{}"
# -P4 runs 4 processes in parallel

# Delete git branches matching a pattern
git branch | grep "feature/" | xargs git branch -d
```

### 6.8 column

```bash
# Align columnar output
mount | column -t

# Custom delimiter
cat data.csv | column -t -s,

# Useful after awk/cut to make output readable
ps aux | awk '{ print $1, $2, $3, $11 }' | column -t
```

---

## Part 7: Pipeline Composition - Putting It All Together

**Estimated time: 0.5 hours (reading) + challenges below**

The power of these tools is not individual capability - it is composition. A single
pipeline can replace a 50-line Python script, and it runs with zero startup time.

### 7.1 Composition Patterns

**Pattern 1: Extract, Filter, Count**

```bash
# Top 10 IP addresses from a web access log
awk '{ print $1 }' access.log | sort | uniq -c | sort -rn | head -10
```

This is the most common pipeline pattern. Extract a field (awk), sort for uniq, count
(uniq -c), sort by count, take the top N.

**Pattern 2: Search, Extract, Transform**

```bash
# Find all TODO comments with their file and line number, sorted by file
rg -n "TODO" src/ | sed -E 's/:/ /' | awk '{ printf "%-40s line %-5s %s\n", $1, $2, substr($0, index($0,$3)) }' | sort
```

**Pattern 3: Generate, Expand, Execute**

```bash
# Restart all failed systemd services
systemctl list-units --state=failed --no-legend \
  | awk '{ print $1 }' \
  | xargs -I{} systemctl restart {}
```

**Pattern 4: Stream, Branch, Merge**

```bash
# Process a log, save errors to a file, continue processing everything
tail -f app.log | tee >(grep --line-buffered "ERROR" >> errors.log) | awk '{ print strftime("%H:%M:%S"), $0 }'
```

### 7.2 The Debugging Pipeline

When a complex pipeline gives wrong results, debug by building it incrementally:

```bash
# Start with just the source
cat access.log | head -5

# Add the first transformation
cat access.log | awk '{ print $1 }' | head -5

# Add the second
cat access.log | awk '{ print $1 }' | sort | head -5

# Keep adding until you find where it breaks
cat access.log | awk '{ print $1 }' | sort | uniq -c | head -5
```

Or use tee to inspect at any point without breaking the pipeline:

```bash
cat access.log | awk '{ print $1 }' | tee /dev/stderr | sort | uniq -c | sort -rn | head -10
```

The intermediate output goes to stderr (your terminal), and the pipeline continues on
stdout.

---

## Challenges

## Challenge: jq Deep Dive

Create a file `/tmp/repos.json` with this content:

```bash
cat > /tmp/repos.json << 'SAMPLE'
[
  {"name": "api-server", "language": "TypeScript", "stars": 142, "open_issues": 12, "archived": false, "topics": ["api", "rest", "backend"]},
  {"name": "web-ui", "language": "TypeScript", "stars": 89, "open_issues": 3, "archived": false, "topics": ["frontend", "react"]},
  {"name": "ml-pipeline", "language": "Python", "stars": 256, "open_issues": 28, "archived": false, "topics": ["ml", "data", "backend"]},
  {"name": "old-dashboard", "language": "JavaScript", "stars": 34, "open_issues": 0, "archived": true, "topics": ["frontend", "legacy"]},
  {"name": "cli-tools", "language": "Rust", "stars": 178, "open_issues": 7, "archived": false, "topics": ["cli", "tools"]},
  {"name": "data-loader", "language": "Python", "stars": 67, "open_issues": 15, "archived": false, "topics": ["data", "etl", "backend"]},
  {"name": "auth-service", "language": "Go", "stars": 201, "open_issues": 4, "archived": false, "topics": ["auth", "backend", "security"]},
  {"name": "docs-site", "language": "TypeScript", "stars": 23, "open_issues": 1, "archived": false, "topics": ["docs", "frontend"]}
]
SAMPLE
```

**Tasks (each should be a single jq command):**

1. List all non-archived repos sorted by stars (descending). Output format: `name (stars)`.
2. Total open issues across all non-archived repos.
3. Group repos by language. Output: `{language: count}`.
4. Find repos that have the "backend" topic AND more than 10 open issues.
5. Produce a summary object: `{total_repos, active_repos, total_stars, avg_stars_active, languages: [unique list]}`.
6. For each language, compute the average star count. Output as a sorted table.

<details>
<summary>Hints</summary>

1. `sort_by` takes a path expression. Use negative for descending.
2. `map(select(...)) | map(.field) | add`
3. `group_by(.language) | map({...})`
4. `select` supports `and`. Check `topics` with `any(. == "backend"; .topics[])` or the `contains` function.
5. `length` counts array elements. `unique` deduplicates.
6. Combine `group_by` with arithmetic in `map`.

</details>

<details>
<summary>Solutions</summary>

```bash
# 1. Non-archived repos sorted by stars descending
jq -r '[.[] | select(.archived == false)] | sort_by(-.stars) | .[] | "\(.name) (\(.stars))"' /tmp/repos.json

# 2. Total open issues (active repos)
jq '[.[] | select(.archived == false) | .open_issues] | add' /tmp/repos.json

# 3. Group by language
jq 'group_by(.language) | map({(.[0].language): length}) | add' /tmp/repos.json

# 4. Backend repos with >10 open issues
jq '.[] | select((.topics | any(. == "backend")) and .open_issues > 10) | .name' /tmp/repos.json

# 5. Summary object
jq '{
  total_repos: length,
  active_repos: [.[] | select(.archived == false)] | length,
  total_stars: [.[].stars] | add,
  avg_stars_active: ([.[] | select(.archived == false) | .stars] | add) / ([.[] | select(.archived == false)] | length),
  languages: [.[].language] | unique
}' /tmp/repos.json

# 6. Average stars by language
jq -r 'group_by(.language) | map({lang: .[0].language, avg: ([.[].stars] | add / length)}) | sort_by(-.avg) | .[] | "\(.lang)\t\(.avg)"' /tmp/repos.json
```

</details>

---

## Challenge: Log File Forensics

Create a sample access log:

```bash
cat > /tmp/access.log << 'SAMPLE'
192.168.1.10 - alice [10/Mar/2026:08:15:23 +0000] "GET /api/users HTTP/1.1" 200 1234
192.168.1.20 - bob [10/Mar/2026:08:15:45 +0000] "POST /api/login HTTP/1.1" 200 567
192.168.1.10 - alice [10/Mar/2026:08:16:01 +0000] "GET /api/users/1 HTTP/1.1" 200 890
10.0.0.5 - - [10/Mar/2026:09:22:10 +0000] "GET /api/health HTTP/1.1" 200 12
192.168.1.10 - alice [10/Mar/2026:09:30:00 +0000] "DELETE /api/users/5 HTTP/1.1" 403 45
192.168.1.30 - carol [10/Mar/2026:10:01:15 +0000] "GET /static/app.js HTTP/1.1" 200 89012
10.0.0.5 - - [10/Mar/2026:10:05:00 +0000] "GET /api/health HTTP/1.1" 200 12
192.168.1.20 - bob [10/Mar/2026:10:10:30 +0000] "PUT /api/users/2 HTTP/1.1" 500 234
192.168.1.10 - alice [10/Mar/2026:10:15:00 +0000] "GET /api/users HTTP/1.1" 200 1234
10.0.0.5 - - [10/Mar/2026:11:00:00 +0000] "GET /api/health HTTP/1.1" 200 12
192.168.1.30 - carol [10/Mar/2026:11:05:20 +0000] "GET /api/reports HTTP/1.1" 200 5678
192.168.1.20 - bob [10/Mar/2026:11:10:45 +0000] "POST /api/login HTTP/1.1" 401 89
192.168.1.40 - dave [10/Mar/2026:12:00:00 +0000] "GET / HTTP/1.1" 301 0
192.168.1.40 - dave [10/Mar/2026:12:00:01 +0000] "GET /app HTTP/1.1" 200 4567
192.168.1.10 - alice [10/Mar/2026:12:30:00 +0000] "POST /api/users HTTP/1.1" 201 345
10.0.0.5 - - [10/Mar/2026:13:00:00 +0000] "GET /api/health HTTP/1.1" 200 12
192.168.1.30 - carol [10/Mar/2026:13:15:30 +0000] "GET /api/reports/export HTTP/1.1" 500 123
192.168.1.20 - bob [10/Mar/2026:14:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234
192.168.1.10 - alice [10/Mar/2026:14:30:00 +0000] "GET /api/users HTTP/1.1" 200 1234
10.0.0.5 - - [10/Mar/2026:15:00:00 +0000] "GET /api/health HTTP/1.1" 200 12
SAMPLE
```

**Answer each question with a single pipeline (one line):**

1. How many requests came from each IP? Show as `count IP`, sorted by count descending.
2. Which endpoints returned 5xx status codes? Show the full log lines with context.
3. How many requests per hour? (Extract the hour from the timestamp, count per hour.)
4. List all unique usernames (3rd field), excluding `-` (unauthenticated).
5. What is the total bytes transferred (last field) for successful (2xx) requests?
6. Show a table of `method count` for each HTTP method used.

<details>
<summary>Solutions</summary>

```bash
# 1. Requests per IP
awk '{ print $1 }' /tmp/access.log | sort | uniq -c | sort -rn

# 2. 5xx errors with context
awk '$9 ~ /^5/' /tmp/access.log

# 3. Requests per hour
awk -F'[: ]' '{ print $5 }' /tmp/access.log | sort | uniq -c

# 4. Unique usernames (excluding unauthenticated)
awk '$3 != "-" { print $3 }' /tmp/access.log | sort -u

# 5. Total bytes for 2xx responses
awk '$9 ~ /^2/ { sum += $10 } END { print sum }' /tmp/access.log

# 6. HTTP method counts
grep -oE '"(GET|POST|PUT|DELETE|PATCH) ' /tmp/access.log | tr -d '"' | sort | uniq -c | sort -rn
```

</details>

---

## Challenge: CSV to Report with awk

Create a sample sales dataset:

```bash
cat > /tmp/sales.csv << 'SAMPLE'
date,region,product,units,price
2026-03-01,North,Widget,150,12.50
2026-03-01,South,Widget,200,12.50
2026-03-01,North,Gadget,75,24.99
2026-03-01,South,Gadget,120,24.99
2026-03-02,North,Widget,180,12.50
2026-03-02,South,Widget,165,12.50
2026-03-02,North,Gadget,90,24.99
2026-03-02,South,Gadget,110,24.99
2026-03-03,North,Widget,200,12.50
2026-03-03,South,Widget,175,12.50
2026-03-03,North,Gadget,85,24.99
2026-03-03,South,Gadget,130,24.99
SAMPLE
```

**Tasks (pure awk, no Python):**

1. Print the total revenue (units * price) per product.
2. Print the total revenue per region per product (a 2D group-by).
3. Print a daily revenue report with running totals.
4. Find the day with the highest total revenue.

<details>
<summary>Solutions</summary>

```bash
# 1. Total revenue per product
awk -F, 'NR>1 { rev[$3] += $4 * $5 } END { for (p in rev) printf "%-10s $%10.2f\n", p, rev[p] }' /tmp/sales.csv

# 2. Revenue per region per product
awk -F, 'NR>1 { key = $2 "/" $3; rev[key] += $4 * $5 } END { for (k in rev) printf "%-20s $%10.2f\n", k, rev[k] }' /tmp/sales.csv | sort

# 3. Daily revenue with running total
awk -F, 'NR>1 {
  day_rev[$1] += $4 * $5
}
END {
  n = asorti(day_rev, days)
  running = 0
  printf "%-12s %12s %12s\n", "Date", "Daily Rev", "Running Total"
  printf "%-12s %12s %12s\n", "----", "---------", "-------------"
  for (i = 1; i <= n; i++) {
    running += day_rev[days[i]]
    printf "%-12s $%11.2f $%11.2f\n", days[i], day_rev[days[i]], running
  }
}' /tmp/sales.csv

# 4. Day with highest revenue
awk -F, 'NR>1 { day_rev[$1] += $4 * $5 }
END {
  max = 0
  for (d in day_rev) if (day_rev[d] > max) { max = day_rev[d]; best = d }
  printf "%s ($%.2f)\n", best, max
}' /tmp/sales.csv
```

</details>

---

## Challenge: Config Surgery with sed

Create a config file:

```bash
cat > /tmp/app.conf << 'SAMPLE'
# Application Configuration
# Last updated: 2026-03-01

[server]
host = 0.0.0.0
port = 8080
workers = 4
debug = true

[database]
host = localhost
port = 5432
name = myapp_dev
user = appuser
password = changeme

[cache]
enabled = true
ttl = 300
max_size = 1024

[logging]
level = DEBUG
file = /var/log/app.log
max_bytes = 10485760
backup_count = 5
SAMPLE
```

**Tasks (each should be a single sed command):**

1. Change `debug = true` to `debug = false`.
2. Change the database port from 5432 to 5433.
3. Comment out the entire `[cache]` section (add `#` before each line from `[cache]` to the line before `[logging]`).
4. Add `timeout = 30` after the `workers` line in `[server]`.
5. Change all occurrences of `host` (as a key) to `hostname`.

Verify each modification by diffing before and after:

```bash
cp /tmp/app.conf /tmp/app.conf.orig
# run your sed commands on /tmp/app.conf
diff /tmp/app.conf.orig /tmp/app.conf
```

<details>
<summary>Solutions</summary>

```bash
# Reset to original
cp /tmp/app.conf.orig /tmp/app.conf

# 1. Toggle debug
sed -i 's/^debug = true/debug = false/' /tmp/app.conf

# 2. Change database port
sed -i '/^\[database\]/,/^\[/{s/^port = 5432/port = 5433/}' /tmp/app.conf

# 3. Comment out cache section
sed -i '/^\[cache\]/,/^\[logging\]/{/^\[logging\]/!s/^/#/}' /tmp/app.conf

# 4. Add timeout after workers
sed -i '/^workers/a\timeout = 30' /tmp/app.conf

# 5. Rename host keys to hostname (only when host is a key, not in section headers)
sed -i -E 's/^(host)( = )/hostname\2/g' /tmp/app.conf
```

</details>

---

## Challenge: Pipeline Composition

Solve each problem with a single pipeline. No temp files, no scripts.

**Warm-up (2-tool pipelines):**

1. Count the number of unique file extensions in the current project:
   ```bash
   find . -type f -name "*.*" | sed 's/.*\.//' | sort -u | wc -l
   ```

2. Find the 5 largest files in the project (human-readable sizes):
   ```bash
   find . -type f -exec du -h {} + | sort -rh | head -5
   ```

**Intermediate (3-4 tool pipelines):**

3. List all TypeScript imports and their frequency across the codebase. Show the top 20.

4. Extract all unique error messages from a JSON log file (one JSON object per line)
   and count them.

5. Find all git authors and their commit counts in the last 30 days.

**Advanced (5+ tool pipelines):**

6. Produce a Markdown table of the project's npm dependencies showing name and version,
   sorted alphabetically.

7. For a web access log, produce a histogram of request counts per hour as a horizontal
   bar chart using `#` characters.

<details>
<summary>Solutions</summary>

```bash
# 3. TypeScript import frequency
rg "^import .+ from ['\"](.+)['\"]" --only-matching -g "*.ts" -g "*.tsx" \
  | sed "s/.*from ['\"]//;s/['\"]$//" | sort | uniq -c | sort -rn | head -20

# 4. Unique error messages from JSON log
# Assumes JSONL format with an "error" or "message" field
jq -r 'select(.level == "error") | .message' app.jsonl | sort | uniq -c | sort -rn

# 5. Git authors last 30 days
git log --since="30 days ago" --format='%aN' | sort | uniq -c | sort -rn

# 6. npm deps as Markdown table
jq -r '.dependencies // {} | to_entries | sort_by(.key) | .[] | "| \(.key) | \(.value) |"' package.json \
  | sed '1i\| Package | Version |\n|---------|---------|'

# 7. Hourly histogram from access log
awk -F'[: ]' '{ print $5 }' /tmp/access.log \
  | sort | uniq -c \
  | awk '{ printf "%s:00  %3d  ", $2, $1; for(i=0;i<$1;i++) printf "#"; printf "\n" }'
```

</details>

---

## Challenge: Build a YAML Query Tool

Write a shell function `bl` that queries the project's `docs/internal/backlog.yaml`
with human-friendly syntax:

```bash
bl               # list all open items (id + title)
bl open          # same as above
bl closed        # list closed items
bl all           # list all items
bl high          # high priority open items
bl tag infra     # open items tagged "infra"
bl count         # count of open items
bl show BL-001   # full details for one item
```

Implement this using yq. The function should work in bash and can be added to your
`.bashrc` or sourced from a script.

<details>
<summary>Solution</summary>

```bash
bl() {
  local file="docs/internal/backlog.yaml"
  if [ ! -f "$file" ]; then
    printf "backlog file not found: %s\n" "$file" >&2
    return 1
  fi

  local cmd="${1:-open}"
  local arg="$2"

  case "$cmd" in
    open)
      yq -r '.[] | select(.status == "open") | "\(.id)\t\(.priority)\t\(.title)"' "$file" | column -t -s$'\t'
      ;;
    closed)
      yq -r '.[] | select(.status == "closed") | "\(.id)\t\(.title)\t\(.reason // "-")"' "$file" | column -t -s$'\t'
      ;;
    all)
      yq -r '.[] | "\(.id)\t\(.status)\t\(.priority)\t\(.title)"' "$file" | column -t -s$'\t'
      ;;
    high|medium|low)
      yq -r --arg p "$cmd" '.[] | select(.status == "open" and .priority == $p) | "\(.id)\t\(.title)"' "$file" | column -t -s$'\t'
      ;;
    tag)
      if [ -z "$arg" ]; then
        printf "Usage: bl tag <tagname>\n" >&2
        return 1
      fi
      yq -r --arg t "$arg" '.[] | select(.status == "open" and (.tags // [] | any(. == $t))) | "\(.id)\t\(.title)"' "$file" | column -t -s$'\t'
      ;;
    count)
      yq '[.[] | select(.status == "open")] | length' "$file"
      ;;
    show)
      if [ -z "$arg" ]; then
        printf "Usage: bl show <BL-NNN>\n" >&2
        return 1
      fi
      yq --arg id "$arg" '.[] | select(.id == $id)' "$file"
      ;;
    *)
      printf "Unknown command: %s\n" "$cmd" >&2
      printf "Usage: bl [open|closed|all|high|medium|low|tag <t>|count|show <id>]\n" >&2
      return 1
      ;;
  esac
}
```

</details>

---

## Challenge: Text Pipeline Playground (Notebook)

If you prefer interactive exploration, create a Jupyter notebook that demonstrates the
tools covered in this step. Use the `%%bash` cell magic to run shell commands, and
structure the notebook as:

1. **Cell 1:** Generate sample data (JSON, CSV, log lines)
2. **Cell 2-5:** jq exercises with visible intermediate outputs
3. **Cell 6-8:** grep + awk pipelines with step-by-step buildup
4. **Cell 9-10:** sed transformations showing before/after diffs
5. **Cell 11:** A complex multi-tool pipeline with inline commentary

This is an optional exercise for learners who want hands-on experimentation with
immediate visual feedback.

---

## The Mental Model

After working through this step, you should hold this picture:

```
                        text in
                           |
                    +------+------+
                    |             |
              structured     unstructured
              (JSON/YAML)    (logs, output, CSV)
                    |             |
               jq / yq      grep (find)
              query,         awk  (compute)
              reshape,       sed  (transform)
              filter         cut  (extract)
                    |             |
                    +------+------+
                           |
                     sort | uniq | wc
                     (aggregate)
                           |
                      tee (branch)
                     xargs (execute)
                           |
                        text out
```

Every tool does one thing. Pipes compose them. The structured tools (jq, yq) handle
nested data with their own internal pipelines. The unstructured tools (grep, awk, sed,
cut, tr) handle line-oriented text. sort, uniq, wc, tee, and xargs are the glue.

The boundary between "reach for jq" and "reach for awk" is the data format:
- JSON or YAML with nesting? Use jq/yq.
- Lines and columns? Use awk.
- Find a pattern? Use grep.
- Replace a pattern? Use sed.
- All of the above in sequence? Pipe them together.

---

## Common Pitfalls

**1. Forgetting `-r` with jq.** Without it, strings come out quoted. Your shell pipeline
will break because `"alice"` (with quotes) is not the same as `alice`.

**2. Using `uniq` without `sort`.** uniq only deduplicates adjacent identical lines.
`sort | uniq` is the correct idiom.

**3. sed `-i` without version control.** In-place editing is destructive. Always commit
first or use `-i.bak`.

**4. Shell variable interpolation in jq expressions.** Use `--arg` and `--argjson`.
String concatenation breaks on special characters and is an injection vector.

**5. Forgetting that awk field numbering starts at 1.** `$0` is the whole line, `$1` is
the first field. There is no `$-1` for the last field - use `$NF`.

**6. Using grep when you need awk.** If you are chaining `grep | cut | grep`, you
probably want a single awk command.

**7. Quoting in find + xargs.** Filenames with spaces break `find | xargs`. Always use
`find -print0 | xargs -0`.

---

## What to Read Next

- [**Step 5: Python CLI Tools**](/bootcamp/05-python-cli-tools/) - when shell pipelines
  hit their ceiling (complex logic, error handling, state across iterations), Python takes
  over. Step 5 covers building CLI tools in Python that compose with the same pipeline
  model.

- **Step 6: Make/Just as Orchestrators** - the tools in this step are verbs. Make/Just
  provide the nouns (targets) and grammar (dependency graph) that compose those verbs
  into reproducible build and verification pipelines.

---

## Appendix: Cheat Sheet

### jq

```
jq '.'                                   # Pretty-print JSON
jq '.field'                              # Extract field
jq '.items[]'                            # Iterate array
jq '.items[0]'                           # First element
jq '.items[-1]'                          # Last element
jq '.[] | .name'                         # Extract field from each element
jq '.[] | select(.age > 30)'             # Filter by condition
jq '{name: .first, age: .years}'         # Construct new object
jq '[.[] | .field]'                      # Collect iteration into array
jq 'map(.price) | add'                   # Sum an array
jq 'group_by(.key)'                      # Group by field
jq 'sort_by(.field)'                     # Sort by field
jq 'unique_by(.field)'                   # Deduplicate by field
jq 'length'                              # Array length / object key count
jq 'keys'                                # Object keys as array
jq -r '...'                              # Raw output (no quotes)
jq -s '...'                              # Slurp all inputs into array
jq --arg name "$var" '...'               # Pass string variable
jq --argjson n "$num" '...'              # Pass numeric variable
jq -r '.[] | "\(.a)\t\(.b)"'            # String interpolation
jq 'try ... catch "fallback"'            # Error handling
```

### grep / rg

```
grep "pattern" file                      # Basic search
grep -r "pattern" dir/                   # Recursive search
grep -E "extended|regex" file            # Extended regex
grep -i "case" file                      # Case-insensitive
grep -v "exclude" file                   # Invert match
grep -c "pattern" file                   # Count matches
grep -n "pattern" file                   # Show line numbers
grep -l "pattern" dir/ -r               # List matching files
grep -o "pattern" file                   # Print only match
grep -A3 -B2 "pattern" file             # Context lines
rg "pattern"                             # ripgrep (recursive, .gitignore aware)
rg -t ts "pattern"                       # Filter by file type
rg -F "literal.string"                   # No regex, literal match
rg -c "pattern" | sort -t: -k2 -nr      # Count per file, sorted
```

### awk

```
awk '{ print $1 }' file                  # First field
awk -F: '{ print $1, $NF }' file        # Custom separator, last field
awk '/pattern/ { print }' file           # Filter by pattern
awk '$3 > 100' file                      # Filter by field value
awk '{ sum += $2 } END { print sum }'    # Sum a column
awk '{ count[$1]++ } END { for (k in count) print k, count[k] }'   # Group+count
awk 'NR > 1' file                        # Skip header line
awk '{ printf "%-20s %10.2f\n", $1, $2 }'  # Formatted output
awk 'BEGIN { OFS="\t" } { print $1, $3 }'   # Tab-separated output
awk '/start/,/end/' file                 # Range between patterns
```

### sed

```
sed 's/old/new/' file                    # Replace first occurrence per line
sed 's/old/new/g' file                   # Replace all occurrences per line
sed -i 's/old/new/g' file               # In-place edit (GNU)
sed -i.bak 's/old/new/g' file           # In-place with backup
sed -E 's/(group)/\1-suffix/g' file     # Extended regex, back-references
sed '3,7s/old/new/' file                # Replace in line range
sed '/pattern/d' file                    # Delete matching lines
sed '/pattern/a\new line' file           # Append after match
sed '/pattern/i\new line' file           # Insert before match
sed '/start/,/end/s/a/b/g' file         # Replace within pattern range
```

### yq

```
yq '.field' file.yaml                    # Extract field
yq '.items[]' file.yaml                  # Iterate array
yq '.[] | select(.key == "val")' f.yaml  # Filter
yq -i '.field = "value"' file.yaml       # In-place modify
yq -o=json file.yaml                     # YAML to JSON
yq -P file.json                          # JSON to YAML
yq eval-all '. as $item ireduce ({}; . * $item)' a.yaml b.yaml   # Merge files
```

### Supporting Cast

```
sort file                                # Alphabetical sort
sort -n file                             # Numeric sort
sort -k2 -t, -rn file                   # Sort by 2nd comma-separated field, numeric, reverse
sort -u file                             # Sort and deduplicate
uniq                                     # Deduplicate adjacent lines (use after sort)
uniq -c                                  # Count occurrences
cut -d: -f1,7 file                       # Extract fields by delimiter
tr 'a-z' 'A-Z'                          # Translate characters
tr -d '\r'                               # Delete characters
tr -s ' '                               # Squeeze repeated characters
wc -l file                               # Count lines
wc -w file                               # Count words
tee file.txt                             # Write to file AND pass through
tee /dev/stderr                          # Debug: see intermediate pipeline data
xargs command                            # Convert stdin to arguments
xargs -0                                 # Null-delimited input (with find -print0)
xargs -I{} cmd {} arg                   # Placeholder for each input line
xargs -P4                                # Parallel execution (4 processes)
column -t                                # Align columns
column -t -s,                            # Align with custom separator
```

```


---

## Output Requirements

1. Write your narrative assessment (Section 1)
2. End with the structured YAML findings block (Section 2)
3. Use `prompt_id: 3` and `prompt_name: "accuracy-audit"` in your YAML header
4. Use `model: "gemini"` in your YAML header
5. Classify each finding with an attack vector from the taxonomy
6. Be honest. If the criticism does not hold up, say so.
