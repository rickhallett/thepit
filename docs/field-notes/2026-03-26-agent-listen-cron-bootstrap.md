# Bootstrapping the Halo Agent Stack on macOS

**Date:** 2026-03-26
**Observer:** Operator
**Subject:** Cron, briefings, agent listen/direct, CLAUDE.md refactor

## Context

First time wiring up the full operational stack on the Halo Mac Mini after the repo
was restructured as a monorepo. Nothing was running — no cron, no briefings, no gateway.
Hermes (this agent harness) is the active interface. HAL-prime (Node.js gateway) is present
but not running.

## What was broken and why

The generated crontab pointed to `/home/mrkai/code/nanoclaw` — the previous Linux deployment
path. On macOS the path is `/Users/mrkai/code/halo` and the project was renamed. `cronctl install`
regenerated with correct paths once run from the right working directory.

`worker.py` in `agent/listen/` crashed silently because `.claude/agents/listen-drive-and-steer-system-prompt.md`
didn't exist. The spec described it, the code expected it, no one had created it. The worker process
became a zombie (exit status Z in `ps aux`) with no stderr output because the parent server had
set `stdout=DEVNULL, stderr=DEVNULL`. Running the worker directly revealed the `FileNotFoundError`.

**Pattern:** Silent failures in subprocess spawning. The server reported `status: running` indefinitely
because the worker died before writing the sentinel but after writing the PID to the job YAML.
Fix: run the worker directly first, capture stderr, then debug. Never trust job status as proof of
worker health when stderr is suppressed.

## Briefing delivery chain

Briefings were designed around IPC — the Python tool writes JSON files to `data/ipc/telegram_main/messages/`,
the Node.js gateway polls and delivers. With the gateway not running, IPC writes were going nowhere.

Fix: patched `deliver.py` to try direct Telegram Bot API first (`httpx.post` to `api.telegram.org`),
falling back to IPC if the token is missing. This decouples briefing delivery from gateway uptime.

The bot token was available in `.env` as `TELEGRAM_BOT_TOKEN`. `_get_bot_token()` reads it from
environment or parses `.env` directly. Delivery confirmed working before installing the crontab.

## Claude CLI OAuth expiry

The briefing synthesis path calls `claude -p "..."` as a subprocess. The OAuth token had expired,
causing silent fallback to raw data delivery (no synthesis). `claude auth login` fixed it; the
token refreshed and synthesis worked.

**Pattern:** Tools that depend on external auth state should surface the auth failure loudly, not
silently degrade. The fallback to raw delivery is correct for production but masked the auth issue
during debugging.

## CLAUDE.md as a boot context engineering problem

Refactored the Halo CLAUDE.md based on a simple observation: most of it described the Node.js
gateway (fleet provisioning, Docker containers, IPC internals, microhal templates) which is
inactive. Every agent session was loading ~600 lines of context it couldn't act on.

Decision: keep the gateway knowledge in the file but move it into a reference section that
signals "load only when working on gateway code." Remove fleet/microhal entirely from boot.

The system topology table distinguishes three surfaces clearly:
- Hermes (this harness, always active)
- HAL-prime (Node.js gateway, available but not running)
- Agent listen/direct (on-demand job spawner)

This is context architecture applied to the boot file itself. The same principles that
apply to agent retrieval apply to human-readable documentation that agents also read.

## Lesson on worker.py justfile drift

The `agent/justfile` referred to `apps/listen` and `apps/direct`. The actual directories
were `listen/` and `direct/`. The justfile was written against an earlier directory structure
and never updated when the monorepo was restructured.

**Pattern:** Justfiles and Makefiles drift faster than code because they're not imported/required
anywhere. They only fail at runtime. Add smoke tests for build/run commands to CI, or at minimum
check them manually after any directory restructure.

## crontab PATH on macOS

Standard macOS cron does not inherit the user's shell PATH. `uv` lives in `/opt/homebrew/bin`,
`claude` in `/Users/mrkai/.local/bin`. Both are absent from cron's default PATH.

Fix: prepend `PATH=...` and `HOME=...` lines to the generated crontab. Updated `cronctl`'s
`cmd_install` to inject these headers automatically when `install_method=user-crontab`.

**Pattern:** Always set PATH explicitly in crontab entries, or add a PATH header. This breaks
predictably and visibly (command not found) rather than silently.
