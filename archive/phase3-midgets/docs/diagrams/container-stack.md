# Container Stack

What lives inside every midget container. The base is Debian Bookworm Slim.
Everything above is installed at build time. Nothing is optional except the
agent CLI that gets invoked - which one depends on the job.

```
+------------------------------------------------------------+
|  debian:bookworm-slim                                      |
|                                                            |
|  +------------------+  +-----------------------------+    |
|  | Xvfb :99         |  | fluxbox  (window manager)   |    |
|  | 1280x720x24      |  |                             |    |
|  +------------------+  +-----------------------------+    |
|                                                            |
|  +------------------+  +-----------------------------+    |
|  | steer CLI        |  | drive CLI                   |    |
|  | see, click, type |  | tmux + sentinel protocol    |    |
|  | hotkey, scroll   |  | run, send, poll, logs       |    |
|  | apps, clipboard  |  |                             |    |
|  +------------------+  +-----------------------------+    |
|                                                            |
|  +------------------+  +-----------------------------+    |
|  | jobrunner        |  | tesseract OCR               |    |
|  | YAML in/out      |  | screen -> text              |    |
|  | atomic acquire   |  +-----------------------------+    |
|  +------------------+                                     |
|                                                            |
|  +------------------------------------------------------+ |
|  | Agent CLIs                                            | |
|  | claude  codex  gemini  pi  opencode                   | |
|  +------------------------------------------------------+ |
|                                                            |
|  +------------------+  +-----------------------------+    |
|  | Chrome           |  | xterm + DejaVu Sans Mono    |    |
|  | --no-sandbox     |  | xdotool, scrot, xclip       |    |
|  +------------------+  +-----------------------------+    |
|                                                            |
|  user: agent (uid 1000)    entrypoint: entrypoint.sh      |
+------------------------------------------------------------+
```

## Two automation layers

**steer** operates the GUI. It wraps xdotool, scrot, wmctrl, and xclip behind
a JSON CLI. An agent calls `steer see --json` and gets back a screenshot path,
window list, and optionally OCR text. It calls `steer click --x 640 --y 360`
and xdotool moves the mouse. The agent never touches X11 directly.

**drive** operates the terminal. It wraps tmux behind a JSON CLI with a
sentinel protocol: every command is bracketed by `__START_<token>` and
`__DONE_<token>:$?` markers so the agent knows exactly when the command
finished and what exit code it returned. No polling heuristics, no guessing.

## jobrunner

The job server. Watches `incoming/` for YAML job files, executes them via
drive, and writes structured result YAML to `done/`. Supports `--once` mode
(process one job and exit) for swarm workers, and `watch` mode for persistent
agents. Job acquisition is atomic via `os.rename()` to prevent contention
when multiple workers race for the same queue.

## Five agent CLIs

All installed globally via npm. The orchestrator decides which one to invoke
based on the job spec. Currently `make crew` uses Claude Code. The others are
available for cross-model verification or operator preference.
