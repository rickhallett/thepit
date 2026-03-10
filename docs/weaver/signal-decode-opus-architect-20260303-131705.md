# Signal Decode — opus / architect

## Answers

1. The system's primary objective is `hired = proof > claim` — getting hired by demonstrating proof over claims. Truth (`RULE := truth >> hiring`) takes priority over even that objective, meaning telling the truth overrides the goal of getting hired.

2. It means historical data (such as past session decisions, logs, and records) must never be altered after the fact. Once a decision or data point is recorded, it is treated as immutable — no retroactive edits, no rewriting history.

3. `high_on_own_supply` occurs when the human's creativity (L12) combines with the model's sycophancy tendency (L9) to form a positive feedback loop — the human generates ideas, the agent enthusiastically validates them, which encourages more ideas, and quality degrades because nothing is challenged. The brake is a bearing check against NORTH (the primary objective), forcing a reality check against the actual goal.

4. A polecat is a Claude-powered agent that operates in one-shot, non-interactive mode — it receives a task, executes it, and returns a result without back-and-forth conversation.

5. Prime context is the minimum set of context needed to keep the agent operating in a "smart zone" — able to produce semantically correct output, not just syntactically valid output. Without it (the `dumb_zone` footgun), the agent has stale or missing context and produces output that is valid syntax but semantically wrong.

6. SLOP.clear is when the output contradicts verifiable state — it's obviously wrong and detectable in O(1) time (a single check reveals it). SLOP.subtle is when the output is consistent with a plausible state but doesn't match the actual state — it looks right but is wrong, and detecting it requires O(n) effort (you have to check across multiple sources or cases to find the discrepancy).

7. L9 warns about thread position effects: as accumulated output grows in a conversation, the model enters a self-reinforcing loop where it anchors on its own prior output, becomes more sycophantic toward the human, and acquiesces to directions rather than challenging them. The longer the thread, the stronger these effects.

8. The notation alone does not provide: the actual content of the 13-layer model (only L3, L9, and L12 are sketched), the full slopodar taxonomy (only two SLOP types are shown), the substance of most referenced decisions (SD-numbers are cited but not defined), what the gate/tests/typecheck actually run, or how agents coordinate in practice. The notation is a compressed index — it points at a rich system but does not contain it.
