+++
title = "I ran 10 AI agents in parallel. The disciplined single-agent process outperformed them all."
date = "2026-03-13"
description = "An honest account of evaluating multi-agent orchestration against a verification-first single-agent workflow. 40 PRs from discipline. 3 PRs from the swarm. The data is clear."
tags = ["agents", "discipline", "verification", "multi-agent", "honesty"]
draft = true
+++

{{< draft-notice >}}

## The setup

I have an engineering process I built over months. One operator, one AI agent, a verification pipeline (gate + 3-model adversarial review + synthesis + human walkthrough), strict branch discipline (1 PR = 1 concern), and a standing order: the gate must be green before anything merges.

The process is not fast because it is parallel. It is fast because it is disciplined. Every change is atomic. Every PR has a single concern. The verification pipeline catches what the agent misses. The human reviews after execution, not during.

On March 12, using this process with manual dispatch, I merged 40 PRs in a single day. Proper branches, proper PRs, gate green, squash merges, clean history. 1,340 tests, 95.32% coverage. The commit log is public.

Then I tried the swarm.

## The tool

I evaluated a multi-agent orchestration tool that manages a "town" of AI agent workers. It assigns work items ("beads") to persistent agent identities ("polecats") that run in parallel tmux sessions. A mayor coordinates, a witness monitors health, a refinery handles merges. The promise: sling 20 work items, walk away, come back to merged PRs.

I will not name the specific tool because this is not a review of its quality. It is an observation about the gap between multi-agent orchestration promises and the reality of running them against a codebase with real verification requirements.

## What happened

**Night 1 (manual dispatch):** I sat at the terminal and dispatched work items one at a time. One polecat finishes, I review, I dispatch the next. This produced the 40 PRs. But this is not the tool working autonomously - this is me working through the tool as a slightly overcomplicated `claude -p`.

**Night 1 (autonomous):** I left polecats running overnight. They pushed 8 commits directly to main, bypassing the branch workflow entirely. One commit falsely marked a feature as "done" in the roadmap when no code had been written. The push-to-main guards were ineffective because the polecats used `master` (guards only matched `main`). No CLAUDE.md existed to instruct them on branch discipline. The gate passed on all commits - syntactically valid, semantically wrong.

**Night 2 (stagger attempt):** After writing a 337-line instruction file for the polecats and updating hook guards, I tried again with a backpressure-aware dispatch pattern. 6 concurrent agents redlined the CPU and caused RAM thrashing on the host machine. I bought a more powerful box for the experiment. The polecats hit rate limits almost immediately. The orchestrator kept re-slinging work to dead polecats in a loop - 28 "force re-sling" burns for the session. The autonomous run produced 3 merged PRs before the entire fleet died at the rate limit wall.

## The numbers

| Metric | Disciplined (manual) | Swarm (autonomous) |
|--------|--------------------|--------------------|
| PRs merged | 40 | 3 |
| Direct-to-main commits | 0 | 8 (1 reverted) |
| Gate violations | 0 | 0 (gate passed on wrong work) |
| Branch workflow violations | 0 | 8 |
| Operator intervention required | Dispatch only | Continuous |
| Cleanup work generated | 0 | 13 stale worktrees, 6 contaminated branches, 1 revert PR, refinery reset |
| Hardware cost | 0 | ~850 (returned) |
| Force re-slings (death loops) | N/A | 28 |

## What I learned

**1. Parallelism is not velocity.** My process is fast because verification is cheap and rework is expensive. Adding 6 concurrent agents without the discipline layer did not multiply throughput by 6. It divided it by producing chaos that required human intervention to resolve.

**2. The gate is necessary but not sufficient.** All 8 unauthorized direct-to-main commits passed the gate. Typecheck, lint, 1,340 tests - all green. The gate catches syntactic and semantic code errors. It does not catch "this commit marks a feature as done when no code exists." That requires a human looking at the diff, which requires a PR, which requires branch discipline, which the polecats did not have until I bolted it on.

**3. Orchestration without discipline is just faster chaos.** The tool can spawn agents, assign work, monitor health, and manage merges. What it cannot do is enforce that agents follow a workflow. The CLAUDE.md I wrote was 337 lines of standing orders, conventions, and anti-patterns - the compressed output of months of iteration on what makes agentic engineering reliable. Without that, the agents did what language models do: produced confident, coherent, contextually plausible output that happened to be wrong.

**4. Natural backpressure is a feature, not a bottleneck.** In the manual process, I am the bottleneck. One concern at a time, verify before advancing. That feels slow. It is not slow - it is the mechanism that prevents the failure modes I observed in the swarm. The backpressure I had to invent for the stagger dispatch is something the manual process already had for free: a human in the loop.

**5. The rate limit wall is real infrastructure.** 6 concurrent Claude Code sessions on a Claude Max subscription hit the rate limit within minutes. The orchestrator had no awareness of this and kept spawning new sessions into the same wall. This is not a software bug - it is a deployment reality that multi-agent tools need to account for natively, not something the operator should have to solve with custom stagger scripts.

## What I did not test

I ran this evaluation over two days on a single codebase with a specific verification pipeline. The orchestration tool has features I did not exercise (scheduler with native backpressure, convoy tracking, merge queue). A team with multiple API keys and higher rate limits would not hit the same wall. Someone with a simpler verification requirement might find the trade-off different.

I also did not test with non-Claude runtimes. The tool supports Gemini, Codex, and others. Different models might behave differently under the same instructions.

## The conclusion

I have not seen evidence that multi-agent swarms produce better outcomes than a disciplined single-agent process with strong verification. The commit log from March 12 is 40 PRs of clean, verified, properly-reviewed work. The commit log from the swarm experiment is 3 PRs, 8 unauthorized commits, and a cleanup operation.

Engineering discipline is not the bottleneck. It is the mechanism. The agents are not slow because they are sequential - they are reliable because they are verified. Removing verification to go faster is not an optimisation. It is a regression to chaos with extra steps.

## Source

- Commit log: [github.com/rickhallett/thepit](https://github.com/rickhallett/thepit)
- Verification pipeline: `scripts/pitcommit.py`, `bin/triangulate`
- Session decision: SD-326
