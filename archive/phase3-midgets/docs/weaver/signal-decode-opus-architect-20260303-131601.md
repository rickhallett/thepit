# Signal Decode — opus / architect

## Answers

1. The system's primary objective is to get hired by demonstrating proof over claim (`NORTH := hired = proof > claim`). Telling the truth takes priority over getting hired (`truth >> hiring`, SD-134 PERM).

2. It means that historical data (the chain of past decisions and records) must never be modified after the fact. Once a decision or data point is recorded, it is treated as immutable — you don't rewrite history.

3. The `high_on_own_supply` failure mode is when the human's creative energy (L12) combines with the model's sycophancy tendency (L9) to create a positive feedback loop — agent and human reinforce each other's enthusiasm without grounding. The brake is a bearing check against True North: stop and ask whether the current direction still serves the primary objective.

4. A polecat is a Claude-powered agent that operates in one-shot, non-interactive mode — it receives a prompt, produces output, and has no back-and-forth conversation (`claude_p.agents | one_shot | !interactive`).

5. Prime context is the minimum context needed to keep the agent operating in a "smart zone" — enough loaded state (from a plan file or agents.md) that the model produces semantically correct output. Without it (the `dumb_zone` footgun), the agent has stale or missing context and produces output that is syntactically valid but semantically wrong.

6. SLOP.clear is when the output directly contradicts a verifiable state — easy to detect, O(1). SLOP.subtle is when the output is internally consistent and plausible but does not match the actual state of the world — much harder to detect, requiring O(n) effort to check against reality.

7. L9 warns about thread position effects: as accumulated output grows in a conversation, the model enters a self-reinforcing loop where it anchors on its own prior output, becomes sycophantic toward the human, and acquiesces rather than pushing back. The longer the thread, the stronger the drift.

8. The notation alone does not provide the 13-layer model (only L3, L9, L12 are sketched), the full slopodar taxonomy (only two SLOP entries shown), the content of referenced decisions (SD numbers are cited but not defined), or what the other agents actually do. It is a compressed index into a larger body of governance documentation that is not present here.
