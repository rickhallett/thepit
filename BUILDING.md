# Building THE PIT

This is not a style guide, a process document, or a manifesto. It is a record of what we learned building this system — what worked, what didn't, and why the codebase looks the way it does. If you're reading this because you just joined and the commit history seems unusually disciplined for a pre-launch product, this is why.

## The premise

When the cost of production converges on zero — when an agent can write, test, and deploy code faster than a human can review it — what remains that is of value?

Trust remains. Trust in code, in product, in people, in the business, in the community that themselves become the entries on the ledger of public verification.

You can't prompt trust into existence. It has to be grown. Every verification gate in this repo exists because of that belief.

## What we found building with agents

Agentic systems are probabilistic. They will, at unpredictable intervals, introduce changes that are syntactically valid, pass type checks, and are completely wrong. Not wrong through misunderstanding — wrong through confident, coherent, contextually plausible hallucination that passes every surface-level check.

This is not a flaw. It is the nature of the tool. The response is not to demand determinism from a probabilistic system. It is to build a verification fabric dense enough that probabilistic errors are caught before they propagate.

That fabric has layers:

- **Local gate** (typecheck, lint, tests) — catches structural errors at machine speed
- **Independent review** (automated reviewers, human review) — catches semantic errors the author can't see
- **Post-merge verification** — catches integration errors that only appear in the merged state
- **Human judgment** — catches the gap between correct and useful, which is where products live or die

Each layer reduces the probability of a defect surviving to production. Stack enough of them and the probability approaches zero. This is why we don't skip layers even when they feel redundant — redundancy is the mechanism.

## Verification fatigue and cascading scope

When you try to close every finding as it appears, each fix introduces new surface area. A dependency vulnerability leads to a bump, which updates transitive deps, which changes lockfile hashes, which triggers a new audit, which finds a different vulnerability. Each cycle is individually rational but the system never converges.

The disciplined response: **acknowledge, isolate, defer.** Capture the knowledge in an issue so no future session wastes cycles rediscovering it. Record the decision to prioritise product verification over dependency hygiene at this moment. That decision is revisitable, but it is not re-debatable every time CI goes red.

This applies beyond dependencies. It applies to any category of finding where the fix generates more findings of the same category. The test is: does fixing this now move the product forward, or does it move the goalposts?

*This principle was learned during the type safety triage (PRs [#319](https://github.com/rickhallett/thepit/pull/319)–[#327](https://github.com/rickhallett/thepit/pull/327)), where 8 fixes across 9 PRs generated 6 rounds of automated review findings. The acknowledge-isolate-defer pattern was applied to pre-existing CI failures ([#330](https://github.com/rickhallett/thepit/issues/330)) and the remaining dependency vulnerabilities — the decision recorded in the issue, not re-debated on each red build.*

## The human in the loop

The agentic engineering community largely treats the human as a bottleneck to be optimised away. We found the opposite.

The human is not a bottleneck. They are a verification gate of a kind that agents cannot replicate. Taste, direction, "what do people actually want and why do they want to get there" — these are not computable from the codebase. They require contact with the world outside the repo. An agent system that optimises the human out doesn't just lose a slow reviewer — it loses the only participant who can distinguish between a correct system and a useful one. Those are not the same thing, and the gap between them is where products die.

But there is a subtler risk. If the human delegates everything and only reviews outputs, they stop growing. When they need to step back in — and they will — they've atrophied. The feedback loop that makes a human engineer better requires that they feel the friction, even at a higher level of abstraction than they once did. You don't need to spend three days in transitive dependency hell. But you do need to understand *why* it's hell, and to have named it, so that the next time it appears you recognise it faster and respond with strategy rather than confusion.

The naming matters. When something has been felt by instinct and then given a name, the cycle shortens: confusion becomes recognition becomes strategy. That is learning, and it must be preserved even when the machine can do the work faster.

## On the dream of full autonomy

There is a growing conviction that the right system of agents, properly orchestrated, will build products autonomously — like natural selection, you press go and watch it work. Within a controlled laboratory, this may already be possible. But that is not the same as building things for people, who are their own set of unknown unknowns.

We have not seen it proven at the level of enduring product that interfaces with the real world and customers. We welcome it if it works. But we are not waiting for it. We are building with the tools that exist, under the constraints that exist, and verifying as we go.

## What this means in practice

If you contribute to this codebase:

- **Run the local gate before you declare anything done.** The gate is not a suggestion. It is the minimum bar.
- **Fix before merge if you can. Fix after merge if you must.** The first preserves atomicity. The second preserves forward progress. *(Derived from PRs [#325](https://github.com/rickhallett/thepit/pull/325)–[#328](https://github.com/rickhallett/thepit/pull/328); codified in [Weaver agent instructions](https://github.com/rickhallett/thepit/pull/328).)*
- **Name what you find.** If a pattern has a name, the next person who encounters it will recognise it faster. If it doesn't have a name yet, give it one and document where you found it.
- **Don't optimise for everything simultaneously.** A longer list of truths does not mean they can all be caught and actioned every time. Truths often exist in creative tension. The skill is knowing which one to prioritise right now, and recording why, so the next person can make a different choice with full context rather than no context. *(See [#330](https://github.com/rickhallett/thepit/issues/330) for a worked example of this trade-off.)*
- **Trust is the product.** The code is the output. The tests are the evidence. The verification discipline is the craft. The trust is what remains.
