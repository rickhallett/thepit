# Midgets

> Docker containers as governance boundaries for AI agents.

## What This Is

A container where an AI agent can see a screen, type into terminals, run
commands, and produce structured output. The container boundary enforces
role constraints that prompts cannot: a read-only mount flag is enforced
by the kernel, not by the system prompt.

This is working infrastructure, not a framework. It was built in one
session on 2026-03-10 across three phases: single container, multi-container
communication, and a governance crew.

## What Has Actually Been Demonstrated

**The container stack works.** An agent inside the container can see the
screen via Xvfb, interact via xdotool, read text via Tesseract OCR, run
terminal commands via tmux with a sentinel protocol that captures exit
codes. 35 tests prove this without any LLM calls.

**Containers can exchange work.** A shared Docker volume with YAML job
files in `incoming/`, results in `done/`. When multiple workers race for
the same job, atomic `os.rename()` ensures exactly one wins. Docker Compose
scales to N workers.

**Mount flags enforce role constraints.** A reviewer container mounts
`/opt/repo` as read-only. `docker inspect` confirms `RW=false`. No process
inside the container can write to that path. This is a real constraint -
unlike a prompt that says "do not modify source code," this one cannot be
reasoned around.

**The live crew run found the bug.** Three Claude instances in separate
containers each identified a deliberate off-by-one defect in `calc.py`.
All three returned structured YAML reviews. The orchestrator counted
verdicts: 3/3 FAIL.

## What Has Not Been Demonstrated

**Independent triangulation.** The three reviewers were all Claude. Same
model, same weights, same priors. 3/3 agreement from one model family
has the evidential weight of one observation, not three. Genuine
triangulation would require different model families.

**Non-trivial defects.** The planted bug was self-documenting - its own
comment said it was wrong. Any single API call would catch it. The crew
run proved the plumbing works end to end. It did not prove the system
catches subtle bugs.

**Production-grade governance.** This is a proof of concept. The job
protocol is file-based YAML. The orchestrator is a bash script. The
attestation system is not tamper-resistant. Real deployment would need
hardening that has not been done.

## Architecture

- [Container Stack](docs/diagrams/container-stack.md) - what lives inside every midget
- [Quality Gate](docs/diagrams/quality-gate.md) - 35 deterministic tests, 6 suites
- [Inter-Container Communication](docs/diagrams/inter-container.md) - shared volumes, job protocol, atomic acquisition
- [Governance Crew](docs/diagrams/governance-crew.md) - mount constraints, role separation, crew run results
- [Full Gauntlet](docs/diagrams/gauntlet.md) - 6-stage verification pipeline
- [Audit Trail](docs/diagrams/audit-trail.md) - per-agent action traces, what is captured and why
- [Value Proposition](docs/diagrams/value-proposition.md) - where midgets add value, where they don't

Terminal diagrams: `bin/diagrams [stack|gate|interop|crew|gauntlet|all]`

## Make Targets

```
make gate              35 tests inside the container (deterministic)
make interop           2-container handoff via shared volume
make swarm N=3         N workers via Docker Compose
make crew-test         mount constraint proof (deterministic)
make crew              live LLM crew run (requires ANTHROPIC_API_KEY)
make status            phase completion overview
bin/diagrams           terminal architecture diagrams
```

## Project Structure

```
Dockerfile              Debian Bookworm Slim, all dependencies
entrypoint.sh           Xvfb + fluxbox startup
steer/steer             GUI automation CLI (Python, wraps xdotool/scrot/wmctrl)
steer/drive             Terminal automation CLI (Python, wraps tmux)
steer/jobrunner         Job server (YAML in/out, atomic acquisition)
crew/                   Role identity files (dev, watchdog, weaver, sentinel)
orchestrate.sh          Live crew orchestrator
docker-compose.yaml     Swarm definition (init + N workers)
test-*.sh               35 tests across 6 suites + 3 integration suites
SPEC.md                 What a midget is, governance crew, interfaces
PLAN.md                 Build trajectory, completed table
docs/diagrams/          Architecture diagrams with commentary
docs/field-notes/       Observations, including caught anti-patterns
```

## What Was Learned

The interesting finding is not that agents can find bugs in containers.
It is that Docker mount flags are a governance primitive. `:ro` is
cheaper, simpler, and more reliable than any prompt-based constraint.
You do not need to convince the model not to modify source code. You
make it physically impossible.

The open question is whether this matters at scale - whether
infrastructure-enforced role separation produces better outcomes than
prompt-based separation when the defects are subtle and the reviewers
are diverse. That has not been tested.

## Provenance

Carries forward from [thepit-v2](https://github.com/rickhallett/thepit-v2),
a month-long agentic engineering study. The governance vocabulary and
anti-pattern taxonomy ([slopodar](docs/internal/slopodar.yaml)) are the
outputs that carried forward. During the README write-up for this project,
the agent inflated a trivial demo into a "thesis proof" - the Operator
caught it, and the catch itself became evidence for the epistemic-theatre
and unanimous-chorus entries in the slopodar. The correction is on file
at `docs/field-notes/2026-03-10-epistemic-theatre-catch.md`.

**Operator:** Richard Hallett - [OCEANHEART.AI LTD](https://oceanheart.ai) -
UK company 16029162

## License

MIT
