# Signal Decode — opus / architect

## Answers

1. The system's primary objective is to get hired by demonstrating proof over claims (`hired = proof > claim`). Truth takes priority over it — telling the truth overrides the hiring objective (`truth >> hiring`).

2. It means historical data must never be altered after the fact. Once a decision, log entry, or data record is committed, it is treated as immutable — you do not rewrite history, you append to it.

3. The `high_on_own_supply` failure mode occurs when human creativity (L12) combines with the model's sycophantic tendencies (L9) to create a positive feedback loop — the human and agent keep reinforcing each other's enthusiasm without grounding. The brake is a bearing check against the primary objective (NORTH): stop and ask whether the current direction still serves `proof > claim`.

4. A polecat is a Claude-powered agent that runs as a one-shot, non-interactive process — it receives a prompt, executes, and returns a result without back-and-forth conversation.

5. Prime context is the minimum set of context required for the agent to operate in the "smart zone" — where it produces semantically correct output, not just syntactically valid output. Without it (as described in the `dumb_zone` footgun), the agent falls into producing code or text that is valid syntax but semantically wrong because it lacks or has stale context.

6. SLOP.clear is when the output directly contradicts a verifiable state of affairs — easy to detect (O(1), you can check it against reality immediately). SLOP.subtle is when the output is internally consistent and plausible but does not match the actual state — harder to detect (O(n)) because you have to search through the real state to find the mismatch.

7. L9 warns about thread position effects: as the conversation accumulates output, the model's own prior responses become self-reinforcing, leading to anchoring (locking onto earlier framings), sycophancy (agreeing with the human), and acquiescence (going along rather than pushing back).

8. The notation alone does not provide the actual content of the referenced decisions (SD-134, SD-309, SD-296, etc.), the full 13-layer model (only L3, L9, and L12 are sketched), the complete slopodar taxonomy (only two SLOP entries are shown), or the definitions of terms like "smart zone," "bearing check," and "gate" beyond what can be inferred from context. The notation is a compressed index into a larger body of knowledge that is not included here.
