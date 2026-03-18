+++
title = "The halos toolchain: 8 CLI modules for personal AI infrastructure"
date = "2026-03-18"
description = "Memory graphs, work tracking with 13-state machines, agent telemetry with spin detection, and the CLIs that make fleet management auditable."
tags = ["halos", "toolchain", "cli", "agents", "infrastructure"]
series = ["halos"]
+++

## The problem

Running personal AI infrastructure requires operational tooling. Not dashboards - dashboards are for teams with dedicated ops engineers. CLI tools that a single operator can run from a terminal, producing auditable output that feeds into the next step.

halos is 8 Python modules, each with its own CLI, each solving a specific operational problem.

## memctl: structured memory

AI assistants forget everything between sessions. The context window is finite and ephemeral. Anything worth remembering needs durable storage with structure.

```bash
memctl new --title "Ben's preferred email format" --type preference --tags communication,ben
memctl search --tags ben --text email
memctl link --from note-42 --to note-17
memctl enrich                    # Propose new backlinks based on content similarity
memctl prune --execute           # Archive low-value notes (score < threshold)
memctl graph --format html       # Render backlink graph
```

Each note is a markdown file with YAML frontmatter. The index is a JSON file that tracks metadata, backlinks, and decay scores.

The key abstraction: **one claim per note**. "Ben prefers plain text emails" is a note. "Ben's communication preferences" with 12 bullet points is not - that's 12 notes with backlinks.

Backlinks create a knowledge graph. Time-decay pruning prevents bloat. The index is the source of truth.

## nightctl: work tracking

Tasks, jobs, and agent-jobs flow through a 13-state machine:

```
open -> planning -> plan_review -> in_progress -> review -> testing -> done
                                      |
                                   blocked -> cancelled
                                      |
                                   running -> failed -> retry
```

```bash
nightctl add "Fix deployment script" --kind task
nightctl plan T-042                  # Generate execution plan
nightctl start T-042                 # Transition to in_progress
nightctl block T-042 --reason "Waiting on API credentials"
nightctl unblock T-042
nightctl done T-042
```

Three kinds of items:

- **task** - State tracking only. Human executes.
- **job** - Executable script. Runs in overnight window.
- **agent-job** - Structured plan with XML validation. Agent executes.

Agent-jobs require a plan before execution. The plan is validated against schema. If the plan fails review, the job returns to planning state - it cannot proceed without valid plan.

## halctl: fleet management

Covered in [part 1](/blog/2026-03-18-halos-01-fleet/). The summary:

```bash
halctl create --name X --personality Y    # Provision new instance
halctl list                               # Audit table
halctl push --all                         # Propagate governance updates
halctl smoke X                            # 15 infrastructure checks
halctl assess X                           # 8 behavioural scenarios
halctl status X                           # Instance health
halctl freeze | fold | fry | reset X      # Lifecycle management
```

## agentctl: session telemetry

Tracks LLM usage across sessions. The key feature: **spin detection**.

```bash
agentctl sessions                    # List recent sessions
agentctl usage --period 7d           # Token usage summary
agentctl spin-check                  # Detect spinning-to-infinity
```

Spinning-to-infinity is when an agent enters a loop of self-reflection without making progress. It looks like work. It produces tokens. It accomplishes nothing.

The detector watches for:
- High token count with low file changes
- Repeated similar prompts within a session
- Planning cycles that never transition to execution

When detected, the session is flagged. The operator reviews whether intervention is needed.

## cronctl: scheduled jobs

```bash
cronctl list                         # Show defined cron jobs
cronctl enable daily-briefing        # Enable job
cronctl disable daily-briefing       # Disable job
cronctl generate                     # Output crontab for installation
```

Jobs are defined in YAML. The `generate` command outputs crontab syntax for installation. Separation of definition from installation keeps the config portable.

## briefings: daily digests

```bash
hal-briefing generate                # Generate today's briefing
hal-briefing send                    # Send to configured channel
```

Briefings aggregate:
- Active tasks from nightctl
- Recent memory notes from memctl
- Fleet status from halctl
- Any alerts or anomalies

Delivered daily via Telegram at 07:00. The operator wakes up to a status summary without needing to run multiple queries.

## logctl: structured log reader

```bash
logctl search --level error --since 1h
logctl tail --instance dad --lines 50
logctl export --period 24h --format json
```

Agents produce structured logs (JSON with level, timestamp, instance, message). logctl queries them. The abstraction layer means log format can change without breaking queries.

## reportctl: periodic digests

```bash
reportctl daily                      # Generate daily ecosystem report
reportctl weekly                     # Generate weekly summary
reportctl export --period 30d        # Export data for analysis
```

Aggregates across all modules:
- Fleet health trend
- Memory growth rate
- Task completion rate
- Token usage trend
- Anomaly frequency

The output is markdown, suitable for archiving or review.

## The integration pattern

The modules compose:

```bash
# Morning routine
hal-briefing send                    # Digest arrives on Telegram
halctl list                          # Quick fleet health check
nightctl list --status open          # Today's tasks

# After making changes
halctl smoke ben                     # Verify instance health
halctl assess ben                    # Verify behaviour

# Evening
reportctl daily                      # What happened today
memctl prune --dry-run               # What's stale
```

Each command is idempotent. Each produces structured output. Each can be scripted.

## Why CLI, not dashboard

Dashboards require:
- A web server to run
- Authentication to secure
- A UI framework to maintain
- Browser context switching to use

CLIs require:
- A terminal
- Python with uv

For a single operator managing personal infrastructure, the CLI is lower overhead. The output is text that can be piped, grepped, and versioned. The commands can be scripted into larger workflows.

If fleet size grows to where a dashboard makes sense, the structured output from these tools becomes the data layer for that dashboard. The primitives stay the same.

## Source

- All modules: `halos/`
- Config schemas: `*ctl.yaml` in repo root
- Python environment: `pyproject.toml` with uv

---

*This is part 3 of the halos series. Previous: [the assessment system](/blog/2026-03-18-halos-02-assessments/). Previous: [fleet provisioning](/blog/2026-03-18-halos-01-fleet/).*
