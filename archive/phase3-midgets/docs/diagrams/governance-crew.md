# Governance Crew

`make crew` is the thesis proof. Three LLM agents review the same code
change from different angles, each running in its own container with
infrastructure-enforced constraints. The orchestrator triangulates their
independent verdicts.

```
                      +------------------+
                      | Orchestrator     |
                      | (host)           |
                      +--------+---------+
                               |
              stages repo + diff with defect
                               |
          +--------------------+--------------------+
          |                    |                    |
          v                    v                    v
  +---------------+   +---------------+   +---------------+
  | Watchdog      |   | Weaver        |   | Sentinel      |
  |               |   |               |   |               |
  | writes tests  |   | reviews diff  |   | scans for     |
  | runs them     |   | quality +     |   | security      |
  | reports       |   | correctness   |   | vulnerabilities|
  |               |   |               |   |               |
  | /opt/repo :ro |   | /opt/repo :ro |   | /opt/repo :ro |
  | /opt/jobs :rw |   | /opt/jobs :rw |   | /opt/jobs :rw |
  +-------+-------+   +-------+-------+   +-------+-------+
          |                    |                    |
          |   YAML review      |   YAML review     |   YAML review
          |                    |                    |
          +--------------------+--------------------+
                               |
                               v
                      +------------------+
                      | Triangulation    |
                      |                  |
                      | converge = high  |
                      | confidence       |
                      |                  |
                      | diverge = human  |
                      | escalation       |
                      +--------+---------+
                               |
                               v
                         PASS / FAIL
```

## The load-bearing distinction

`:ro` is not a prompt instruction. It is a Docker mount flag. The kernel
enforces it. When Watchdog's container mounts `/opt/repo` as read-only,
no process inside that container can write to that path - not the agent,
not the shell, not root. The error is `Read-only file system` from the
kernel, not `Permission denied` from a policy check.

This is the difference between governance-by-prompt and
governance-by-infrastructure. A prompt says "do not modify source code."
A mount flag makes it physically impossible.

## Two volumes, not one

The crew uses two separate Docker volumes:

- **repo volume** mounted at `/opt/repo` - contains the source code.
  Read-write for dev-midget, read-only for everyone else.
- **jobs volume** mounted at `/opt/jobs` - contains job specs, results,
  and artifacts. Read-write for everyone. This is where reviews are written.

One volume at two mount points would inherit the same flags. Two volumes
allow independent access control per container.

## What each role does

**Watchdog** reads the diff and source, writes tests that exercise the
change, runs them, and reports a structured verdict. It found 13 tests
(7 pass on `clamp`, 6 fail on `average`). Its frame is empirical: does
the code do what it claims?

**Weaver** reads the diff and source, analyses for correctness, edge
cases, error handling, naming, and style. It found 4 findings including
the primary off-by-one and the empty-list edge case the diff didn't
address. Its frame is engineering quality.

**Sentinel** reads the diff and source, scans for security
vulnerabilities. It found the ZeroDivisionError as a DoS vector - if
`average()` is reachable from user input, a single-element payload
crashes the process. Its frame is adversarial.

Three frames, one defect, zero coordination between agents.

## Triangulation

The orchestrator collects all three YAML reviews and counts verdicts.
Convergence (all agree) means high confidence. Divergence (disagreement)
means escalate to human. In the thesis proof run, all three returned
`verdict: fail` and identified the same line (calc.py line 4).

The triangulation is structural, not narrative. The orchestrator does not
ask a model to "summarise" the findings - that would launder false
negatives. It counts verdicts and checks for convergence.

## What the thesis proof demonstrated

On 2026-03-10, `make crew` ran against a Python file with a deliberate
off-by-one defect (`len(numbers) - 1` instead of `len(numbers)`).

- Watchdog: 13 tests, 6 failed. Verdict: FAIL.
- Weaver: 4 findings, primary defect on line 4. Verdict: FAIL.
- Sentinel: 1 vulnerability (DoS via ZeroDivisionError). Verdict: FAIL.
- Triangulated verdict: FAIL (3/3 converged).
- docker inspect confirmed `/opt/repo` RW=false on all reviewer containers.

The governance constraint was enforced by infrastructure, not by prompt.
