YOLO mode is enabled. All tool calls will be automatically approved.
Loaded cached credentials.
YOLO mode is enabled. All tool calls will be automatically approved.
Error stating path "` vs `$@`. When reviewing agent-generated shell functions,
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
echo "This: ENAMETOOLONG: name too long, stat '/home/mrkai/code/midgets/"` vs `$@`. When reviewing agent-generated shell functions,
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
echo "This'
Attempt 1 failed: You have exhausted your capacity on this model. Your quota will reset after 4s.. Retrying after 5516ms...
# Adversarial Review: Accuracy Audit
**Model:** gemini | **Prompt:** 3 | **Name:** accuracy-audit

## Section 1: Narrative

The curriculum presented in `02-shell-language.md` and `04-text-pipeline.md` is a highly effective, high-signal guide that correctly identifies the primary "agent-killers" of shell scripting: word splitting, quoting, and subshell state loss. As a senior systems engineer, I appreciate the grounding in the process model. However, the "Accuracy Audit" reveals several technical errors, some of which are critical because they reinforce the very misconceptions that lead to the "cascading failures" the author aims to prevent.

The most severe issue lies in the treatment of `set -e` (Exit on Error). The curriculum repeatedly implies that `set -e` will catch failures in command substitutions when assigned to variables (Gotcha 1 and Gotcha 8). In standard Bash 5.x, a simple assignment like `count=$(grep -c "pattern" file)` **will not** trigger an exit if `grep` returns non-zero. By presenting this as a "Gotcha" where the script fails, the author is teaching a fundamental misunderstanding of shell behavior. An agent relying on this instruction would believe its script is safe when it is actually failing silently.

Secondly, the explanation of variable expansion and process control in "Gotcha 7" is technically incorrect. The author claims that an unquoted URL variable containing an `&` fails because `&` is a "shell context" background operator. This is false. The shell identifies metacharacters like `&` and `|` during the initial parsing phase, *before* variable expansion occurs. An `&` resulting from an expansion is treated as literal text. The actual reason to quote URLs is to prevent the `?` character from being interpreted as a glob (Step 7) and to prevent word splitting (Step 6).

Finally, the curriculum contains a few minor but notable inaccuracies: it claims `[ ]` cannot perform boolean AND logic (it can via `-a` or command chaining), uses `xxd` (which is often missing from minimal "standard" Linux installs), and suggests `column -t -s,` for CSV processing, which fails on any field containing a comma.

While the "Agentic Grounding" sections are excellent for safety, the technical foundation needs a "surgically" precise update to ensure that the agents reading this material don't inherit these common human misconceptions about the shell.

---

## Section 2: Structured Findings

```yaml
review:
  model: "gemini"
  date: "2026-03-10"
  prompt_id: 3
  prompt_name: "accuracy-audit"

findings:
  - id: F-001
    attack_vector: AV-ACCURACY
    severity: critical
    claim_challenged: "set -e catches failures in command substitutions during assignment (Gotcha 1 and 8)."
    evidence: "sites/oceanheart/content/bootcamp/02-shell-language.md (Gotcha 1, Gotcha 8, and Section 7)"
    survives_scrutiny: true
    description: >
      In Bash, the exit status of a command substitution is ignored in a simple assignment (e.g., `var=$(false)`). 
      The script will NOT exit under `set -e`. Gotcha 1 would actually print 'Found 0 errors' and continue. 
      This is a dangerous error because it teaches agents to trust a safety net that doesn't exist for assignments.

  - id: F-002
    attack_vector: AV-ACCURACY
    severity: high
    claim_challenged: "curl $url fails because & is a background operator in a shell context."
    evidence: "sites/oceanheart/content/bootcamp/02-shell-language.md (Gotcha 7)"
    survives_scrutiny: true
    description: >
      Shell metacharacters (like &) are identified during the parsing phase, before expansion. 
      Expansion results are only subject to word splitting and globbing. An & inside $url is literal. 
      The real 'Gotcha' is that '?' is a globbing character that matches any single character in the filesystem.

  - id: F-003
    attack_vector: AV-ACCURACY
    severity: medium
    claim_challenged: "[[ ]] allows logical operators inside brackets that 'cannot' be done with [ ]."
    evidence: "sites/oceanheart/content/bootcamp/02-shell-language.md (Section 5)"
    survives_scrutiny: true
    description: >
      Boolean AND is supported in `[ ]` via the `-a` operator. While POSIX marks it as obsolescent, 
      it is functional. More importantly, the standard POSIX way to AND is `[ ] && [ ]`. 
      Claiming it 'cannot' be done is a technical error.

  - id: F-004
    attack_vector: AV-ACCURACY
    severity: medium
    claim_challenged: "column -t -s, is used to align CSV data."
    evidence: "sites/oceanheart/content/bootcamp/04-text-pipeline.md (Part 6.8 and Challenges)"
    survives_scrutiny: true
    description: >
      `column -t -s,` is not a CSV parser. It splits strictly on every comma. 
      If a CSV field contains a quoted comma (e.g., "London, UK"), `column` will break the field. 
      This is a 'demonstration of the right concept incorrectly' for real-world data.

  - id: F-005
    attack_vector: AV-AUDIENCE
    severity: low
    claim_challenged: "xxd is used to demonstrate newline corruption in a standard Linux environment."
    evidence: "sites/oceanheart/content/bootcamp/02-shell-language.md (Section 2)"
    survives_scrutiny: true
    description: >
      `xxd` is part of the `vim-common` package and is not guaranteed on minimal Arch or Debian installs. 
      For a bootcamp targeting 'Technical Accuracy', `od -c` is the POSIX-standard way to inspect bytes.

  - id: F-006
    attack_vector: AV-PEDAGOGY
    severity: low
    claim_challenged: "A while read loop is the 'CORRECT' way to handle find output."
    evidence: "sites/oceanheart/content/bootcamp/02-shell-language.md (Section 2)"
    survives_scrutiny: true
    description: >
      The text identifies this as 'CORRECT', but the very next section (Section 3) warns against 
      forking inside loops. `rm "$f"` inside a `while read` loop forks for every file. 
      The senior engineer's 'Correct' way is `find ... -exec rm {} +`, which minimizes forks.

  - id: F-007
    attack_vector: AV-ACCURACY
    severity: low
    claim_challenged: "Shell evaluation order follows a strict 8-step sequence."
    evidence: "sites/oceanheart/content/bootcamp/02-shell-language.md (Section 2)"
    survives_scrutiny: true
    description: >
      Step 3 (Parameter), 4 (Command Sub), and 5 (Arithmetic) are actually performed in a single 
      pass from left to right, not as three sequential steps. This matters if one expansion's 
      result depends on another in the same line.
```
