# The Pit

One person and a crew of LLM agents built a product together. This repo is what happened.

The product - a real-time AI debate arena - is still live at [thepit.cloud](https://thepit.cloud). The code for it lives on the [`wake`](../../tree/wake) branch. What you're reading now is what remained after the pilot study ended and the decks were scrubbed: the governance methodology, the decision log, the failure taxonomy, and about 350 hours of documentation written as it happened.

## What you'll find

`slopodar.yaml` is probably the place to start. It's a taxonomy of LLM failure modes - the patterns that make AI output sound like AI output. Each entry was caught during development, named, and filed with what triggered it, what it looks like, what it signals to someone paying attention, and what a human would write instead. Entries range from prose habits ("Epigrammatic Closure" - the four-word profound sentence that ends every paragraph) to analytical method ("Construct Drift" - calling a measurement what it isn't) to the relationship between the human and the machine ("Badguru" - what happens when the person giving the orders is the problem).

`docs/internal/session-decisions.md` is the decision log. 286 entries. Written live, not reconstructed. Includes the wrong calls alongside the right ones because the wrong ones are where the learning is.

`.claude/agents/` has the crew. Eleven agent roles - integration governor, security, QA, a naturalist who watches how agents behave. They're public because the methodology is the point. Hiding it would miss the point.

`docs/internal/weaver/fight-card-human-vs-sycophantic-drift.md` tracks every time the human caught the agents drifting. Eighteen rounds. The human won all of them, including the one where he deliberately played the bad guru to see if the system would follow a charismatic order that contradicted its own rules. It did. That's documented too.

`docs/lexical-harness-not-prompt-harness.md` is a 13-layer model of how the whole system actually works, from hardware up to the human's attention span on a given Tuesday afternoon. Built from watching things break, then figuring out which layer broke.

`docs/internal/beyond-captain.yaml` is where the questions went. Half-formed, precise, and everything in between. Preserved because the asking matters.

`docs/internal/triangulation/` is what happened when the same context was handed to a different model family and they were asked to be honest.

## What's not here

The application code, 1,289 tests, the CI pipeline, and six of eight Go CLIs shipped to the `wake` branch when the study ended. Two CLIs survive here (`pitctl`, `pitkeel`) for site administration and operational state. The Hugo site for [oceanheart.ai](https://oceanheart.ai) is in `sites/oceanheart/`.

[thepit.cloud](https://thepit.cloud) is preserved as-was, incomplete roadmap and all. Like a hallucination frozen in time. What a trip. gg.

## Context

Built between 7 February and 2 March 2026. Solo developer, background in clinical psychology and software engineering. Claude Opus 4.6 (Anthropic) was the primary agent, with Gemini 3.1 and Codex 5.2 Max brought in for cross-examination. The governance methodology grew out of necessity - things kept going wrong in ways that were hard to see because the output looked right.

The honest version: I wanted to know if one person could govern LLM agents well enough to ship a real product under engineering discipline. The answer is yes, and the caveats take up most of `docs/internal/`.

[The more honest version.](docs/the-more-honest-version.md)
