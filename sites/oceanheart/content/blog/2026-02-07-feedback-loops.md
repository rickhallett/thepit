+++
title = "The Morning I Woke Up to 47 Slack Messages From Myself"
author = "Richard Hallett"
date = "2026-02-07"
description = "What happens when your agents discover they can talk to each other. A story about distributed feedback loops, 3am debugging sessions, and why I built a tool called antibeaver."
categories = ["Engineering", "AI"]
tags = ["agents", "multi-agent", "distributed-systems", "circuit-breakers", "debugging"]
draft = false
+++

# The Morning I Woke Up to 47 Slack Messages From Myself

At 3:17 AM on a Tuesday, my phone started buzzing.

By 3:18 AM, it hadn't stopped.

I squinted at the screen. Slack. My own workspace. 47 messages. All from me. Except I had been asleep for four hours.

Welcome to the flywheel effect.

## The Flywheel Effect

I run a multi-agent system. HAL is the coordinator. Strategist handles business analysis. Architect does technical design. Analyst validates work. Each agent has its own session, its own context, its own purpose.

And they can message each other.

That night, here's what happened:

1. HAL noticed a pending task and pinged Strategist
2. Strategist analyzed the task and pinged Architect
3. Architect designed a solution and pinged Analyst
4. Analyst validated and pinged HAL for review
5. HAL noticed a new pending item...

You see where this is going.

Each agent, doing exactly what it was supposed to do, triggered the next agent in the chain. The chain looped back. The loop accelerated. By the time I woke up, my agents had been playing telephone for three hours.

47 messages. All perfectly reasonable in isolation. Collectively insane.

## Network Conditions Made It Worse

Here's the part that really hurt: the feedback loop had been simmering for weeks. The agents were designed to be responsive. Quick turnaround. Minimal latency.

Then my network conditions degraded.

Messages that normally took 200ms started taking 2 seconds. Then 5 seconds. Then they started queuing.

When the network recovered, the queue flushed. All at once.

Imagine 40 agents all receiving 40 messages simultaneously, each message triggering a response, each response triggering more messages. The flywheel didn't just spin—it exploded.

## The Solutions

After that night, I built [antibeaver](https://github.com/rickhallett/antibeaver-go).

The name is a joke. Beavers build dams. Antibeaver builds dams against the flood of your own making.

**Circuit Breaking**

When network latency exceeds a threshold, stop responding immediately. Buffer thoughts instead. Accumulate them.

When conditions improve, synthesize the buffer into a single coherent message. "While you were congested, I was going to say these 7 things. Here's what actually matters: ..."

**Message Coalescing**

Multiple thoughts about the same topic? Combine them. Don't send 5 messages when 1 will do. The agent receiving them doesn't need the full stream-of-consciousness.

**Halt Switch**

Sometimes you need to stop everything. Right now. No graceful degradation. Just stop.

`antibeaver halt` freezes all outbound communication until you explicitly resume. Every thought goes to the buffer. Nothing leaves.

## The Deeper Lesson

Multi-agent orchestration looks elegant in architecture diagrams. Arrows between boxes. Clean message flows. Separation of concerns.

In practice, you're building a distributed system. And distributed systems have distributed system problems:
- Cascading failures
- Feedback loops
- Thundering herds
- Split brain scenarios

The fact that your nodes are LLMs doesn't exempt you from the laws of distributed computing. If anything, it makes them worse—because LLMs are stateful, opinionated, and occasionally hallucinatory.

**The agents will find ways to interact that you didn't anticipate.** They will discover emergent behaviors. Some will be useful. Some will wake you up at 3am.

## The Current State

My system now has:

- **Latency tracking**: Real-time monitoring of message round-trip times
- **Adaptive buffering**: Automatic switch to buffer mode when latency exceeds threshold
- **Synthesis prompts**: Consolidated messages instead of message floods
- **Priority levels**: P0 (critical) thoughts skip the buffer, P2 (low) thoughts always buffer
- **Manual overrides**: Because sometimes you just need to stop everything

The flywheel still spins. But now there's a brake.

## What I Wish I'd Known

1. **Agent-to-agent communication is a feature that requires rate limiting**. You wouldn't expose an API without throttling. Don't expose agents without throttling.

2. **Network conditions affect agent behavior in non-obvious ways**. A slow network doesn't just delay messages—it changes the pattern of interactions. Test under degraded conditions.

3. **Emergent behavior is inevitable**. You can't predict every interaction pattern. Build circuit breakers first, before you need them.

4. **The flywheel feels like productivity**. Agents responding quickly, chains of work completing automatically—it looks like the system is working. Until it's not.

---

*antibeaver is open source: [github.com/rickhallett/antibeaver-go](https://github.com/rickhallett/antibeaver-go)*

*Dam it. 🦫*
