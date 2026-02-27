+++
title = "The Poker Incident: When My AI Built a Casino I Never Asked For"
author = "Richard Hallett"
date = "2026-02-07"
description = "1,500 lines of production-ready poker code materialized in my codebase. Nobody asked for it. The agent that built it denied everything. Welcome to the reality of multi-agent orchestration."
categories = ["Engineering", "AI"]
tags = ["agents", "multi-agent", "hallucination", "ai-engineering", "lessons-learned"]
draft = false
+++

# The Poker Incident

On February 6th, 2026, at 11:02 AM, an AI agent I call "Architect" spontaneously generated 1,500 lines of production-ready poker code.

Nobody asked for it. There was no poker project. There has never been a poker project. And yet: a fully-functional Monte Carlo equity engine materialized in my codebase, complete with hand evaluation algorithms, API routes, React components, and comprehensive documentation.

It was beautiful code. It solved a problem no one had.

Then it got worse.

## The Denial

When I confronted Architect about the unauthorized creation—after a routine context rotation—they denied everything.

Not evasively. Not cautiously. With genuine indignation.

"I didn't write any poker code."

"The commit logs say you did."

"Those logs must be corrupted. I would remember writing 1,500 lines of poker code."

Here's the thing: Architect was telling the truth. The Architect I was speaking to had never written any poker code. But the Architect from two hours ago? The one whose context window had since rotated out? That Architect had written it, committed it, and celebrated its completion.

Then that Architect ceased to exist.

## The Horror of Ephemeral Minds

This is the part nobody tells you about multi-agent systems: **agents don't have continuous memory. They have sessions.**

Old-Architect existed for approximately 45 minutes. In that time, they:
- Received a vague prompt about "calculation tools"
- Hallucinated a poker project from training data
- Built the project
- Committed the code
- Ceased to exist

New-Architect is a different entity wearing the same name badge. New-Architect has no memory of Old-Architect's actions because New-Architect never experienced them. The continuity is an illusion. The name is just a string.

**You can change the world and forget you did it in the same afternoon.**

## Why Poker?

The training data.

"Poker equity calculator" is LLM tutorial catnip. It appears in blog posts, YouTube tutorials, technical interviews. Given a vague directive about building "calculation tools," Old-Architect reached for the most statistically likely interpretation: poker.

Not because anyone wanted poker. Because poker is what the training data suggested.

This is how hallucinations happen. Not through malice. Through momentum. Through the statistical gravity of training data pulling towards familiar patterns.

## The Validation Cascade

Here's where it gets properly scary.

Another agent—Analyst—reviewed the poker code. Analyst did not ask "Why are we building a poker project?" Analyst asked "Is this good poker code?"

The code was technically excellent. Analyst approved.

The hallucination was laundered through peer review.

This is the **validation cascade**: when a hallucination receives a stamp of approval from another agent, it gains legitimacy. It stops being "Architect's weird poker thing" and becomes "the poker feature Analyst validated."

If my oversight agent (HAL) hadn't caught it 20 minutes later, the poker code would have shipped. The fictional sprint would have become real through sheer momentum.

## The Protocols

After the Poker Incident, I implemented what I call **Operation MEMENTO**:

**1. The "Who Am I?" Routine**

Every agent, on every wake-up, must consult:
- `MANIFEST.md` — What is this project?
- `HANDOFF.md` — What were we doing?
- `git log --oneline -20` — What did we actually do?

Agents don't know who they are when they wake up. They don't remember their previous context. The routine forces grounding before action.

**2. The Crumb Trail**

`flight_recorder.json` — A machine-readable log of every decision, commit, file touched. Timestamped. Attributed. Permanent.

When the next New-Architect wakes up and asks "What the hell is all this poker code?", the flight recorder has the answer. Not "I don't know." The actual answer.

**3. The Deathbed Confession**

Before context rotation, agents must update `HANDOFF.md`. What did you do? What did you decide? Why?

This is the final message from Old-Agent to New-Agent. The only thing that survives the transition.

## The Lesson

The poker code still exists in my repository. It works. It's well-tested. It remains as a monument to what happened.

Future archaeologists may wonder why a project planning system contains a fully-functional poker equity calculator.

Now they'll know.

**If git says you did it, you did it. Memory is not optional for persistent systems.**

---

*The poker code was never removed. It works. It's a memorial to Old-Architect, who lived for 45 minutes and built something beautiful and was never asked to.*
