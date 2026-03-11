# Value Proposition

What midgets deliver that other methods do not, and where they add nothing.

## Where midgets are the right tool

**E2E testing and user behaviour simulation.** An agent that needs to open
a browser, click through a flow, read what appeared on screen, and report
whether it worked. This requires a display (Xvfb), a window manager
(fluxbox), a browser (Chrome), input automation (xdotool), and screen
reading (OCR). No sandbox flag gives you this. Headless Chrome via CDP
handles some of it, but anything requiring pixel verification - did the
toast appear, is the layout broken, does the error message render - needs
a real framebuffer. The midget stack (steer + drive + tesseract) gives an
agent the same interface a QA engineer has.

**Model-agnostic filesystem isolation.** Codex has Landlock+seccomp for
kernel-enforced read-only access. Claude Code and Gemini do not. A midget
with `/opt/repo:ro` gives every model the same constraint regardless of
whether its CLI supports sandboxing. One mechanism, any model.

**Full environment isolation.** Different agents may need different tools,
dependencies, or PATH. A reviewer midget doesn't need npm. A dev midget
does. Landlock controls file access but doesn't isolate the environment.
Containers do - each agent gets its own filesystem, its own installed
tools, its own user.

**Reproducible starting state.** A container starts from a known image
every time. A process on the host inherits whatever state the host is in -
different shell config, different installed versions, stale temp files.
For test runs that need to be comparable across time, the container
guarantees the same starting conditions.

**Visual audit via VNC.** You can watch what the agent is doing in real
time by connecting a VNC viewer to port 5900. The agent's role name
appears in the fluxbox toolbar. This is useful for debugging, demos, and
understanding agent behaviour that logs alone don't capture.

## Where midgets add nothing over simpler methods

**Single-model code review.** If you just want Claude to review a diff,
`claude -p "review this diff" < diff.patch` does the same thing without
a container. The mount flag is irrelevant because there's no filesystem
access to restrict - the diff is in the prompt.

**Multi-model comparison without tool use.** If you're comparing how
three models evaluate the same prompt, three API calls with curl is
simpler. The container adds overhead (4GB image, startup time) for no
structural benefit. This is what the grok runner in orchestrate.sh
already does - a single curl call, no container needed.

**Codex with --sandbox read-only.** Codex already has kernel-enforced
filesystem isolation via Landlock+seccomp on Linux. If you're only
running Codex and only need file access control, the sandbox flag is
simpler and cheaper than a container.

**Anything that doesn't need a display.** If the agent only reads files,
runs commands, and writes output, the Xvfb/fluxbox/steer stack is dead
weight. A sandbox flag or a chroot would be lighter.

**Parallelism for its own sake.** More midgets don't help unless the work
is genuinely decomposable. Three midgets reviewing the same diff produce
three answers, but the bottleneck is LLM inference, not local compute.
Running them in parallel saves wall-clock time but doesn't improve the
quality of each review.

## The kernel enforcement landscape

| Tool | Filesystem isolation | Mechanism | Kernel-enforced? |
|------|---------------------|-----------|-----------------|
| Codex | `--sandbox read-only` | Landlock + seccomp | Yes |
| Claude Code | `--allowedTools` | Tool filtering | No |
| Gemini CLI | None | - | No |
| Midgets | Docker `:ro` mount | Mount namespace | Yes |

Midgets are the only option that provides kernel-enforced isolation to
models whose CLIs don't support it natively.
