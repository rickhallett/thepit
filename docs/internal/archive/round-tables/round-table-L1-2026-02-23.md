# Round Table Layer 1 — Strategic Challenge Response
Date: 2026-02-23
Convened by: Captain
Participants: Analyst, Architect, Sentinel
Compiled by: Weaver
Governing order: SD-073 (Lying With Truth = Category One hazard)

---

## The Question

"What have we actually built? We have built a mechanism that takes an agent's DNA, essentially a string, and hashes it on a blockchain. Pretty cool for a solo dev, but it is blockchain 101. If the issue of trust could be solved by placing a string inside a block, the world would have done that before we woke up."

---

## ANALYST — Market & Positioning Truth

### The HN Dismissal Sentence

"It's a chatbot arena with SHA-256 hashing of prompts written to a blockchain — identity attestation doesn't solve the trust problem because the model can still lie regardless of what prompt you hash."

**Is that dismissal correct?** Mostly yes. It conflates two trust claims (identity vs behavior), but an HN commenter will spot the gap in under 30 seconds.

### What Is Actually Novel

**Not novel:** Hashing to blockchain. Multi-agent debate format. XML prompt engineering. BYOK.

**Somewhat novel but not a moat:** EAS schema design on Base L2. RFC 8785 canonicalization pipeline. Agent cloning with lineage tracking.

**Potentially genuinely novel:** The research programme. Six pre-registered hypotheses with public methodology, permutation tests, honest limitations, and counterintuitive findings (persona fidelity and argument adaptation are independent capabilities; frame distance matters more than content difficulty for eliminating hedging). This is not standard in the indie LLM tooling space.

### Provenance vs Real Trust Problem

**(a) Trusting model providers:** Provenance layer does not address this at all. The attestation hashes the prompt (our input to a black box). Anthropic can change the black box tomorrow. Every on-chain attestation will still verify perfectly while agents behave differently.

**(b) Lying With Truth:** Provenance layer has zero leverage on this problem. The H6 finding makes it worse — agents "execute character strategies faithfully but cannot incorporate opposing arguments." An agent performing the character of engagement while unable to genuinely adapt IS Lying With Truth at the persona level.

### HN Reception Prediction

- **Lead with provenance/blockchain:** HOSTILITY. High confidence. We get ratio'd.
- **Lead with research findings + open methodology:** SCEPTICISM → RESPECT. Medium confidence.
- **Lead with "solo dev built complete multi-agent research platform with 8 Go CLIs, 1,046 tests, pre-registered experiments":** GENUINE INTEREST. Medium-high confidence.

### The Honest Pitch

"Here's a platform that lets you watch AI agents argue, measures what they actually do (not what you hope they do), and publishes everything — methodology, data, and code. We found that agents maintain character but can't adapt arguments, that framing distance eliminates the assistant voice, and that prompt depth is a bigger lever than we expected. The code, data, and analysis are public. Tell us what we got wrong."

### Critical Warning

The gap between "identity at mint" and "trust in behaviour" is not a gap in our engineering. It is a gap in the state of the art. Nobody has solved trust propagation from prompt to runtime behaviour for black-box model providers. The honest position is to say so explicitly.

---

## ARCHITECT — Technical Reality

### What the Provenance Layer Actually Proves

**Cryptographically guaranteed:**
- A specific SHA-256 hash of a system prompt and manifest was committed to Base L2 at a specific time by a specific Ethereum address.
- The commitment has not been altered (EAS immutability).

**Merely implied but NOT proven:**
- That the system prompt at attestation time is the same one used at runtime. The bout engine (`bout-engine.ts`) NEVER reads `promptHash` or `attestationUid`. There is zero verification at execution time.
- That The Pit is the only entity that could create this agent. The attestation is signed by a single platform-controlled key. "You're attesting your own data to yourself."
- That the hash has any relationship to what the agent actually says. System prompt is one input; model version, temperature, conversation history, and safety filters all affect output. None are attested.

### The Trust Propagation Gap

**Honest answer: it doesn't, and with current LLM architecture, it fundamentally cannot provide a guarantee.**

The attestation chain is:
```
Hash(system prompt) → on-chain at time T₁
Bout execution at time T₂ uses system prompt → sent to model M(version V)
Model M(V) produces output O
```
Nothing connects the hash at T₁ to the output O at T₂.

### What Would Make the Trust Story Real

**Feasible now, meaningful but limited:**
- Transcript attestation (hash full bout transcript, attest on-chain). An afternoon of work.
- Runtime prompt verification (recompute hash before sending to model). ~10 lines of code.
- Behavioral fingerprinting (canary prompts run periodically). Expensive but meaningful for research.

**Requires external cooperation:**
- Model provider output signing (Anthropic signs API responses). The single most important missing piece. Entirely outside our control.
- TEE execution. Science fiction for LLM inference at scale.

**Science fiction:**
- Formal verification of LLM behavior.

### The Big Tech Problem

If Anthropic ships model-output signing → our provenance layer becomes MORE valuable (application layer on top of their model layer).
If Anthropic ships agent-layer identity → our provenance layer becomes REDUNDANT.
If nobody ships identity (most likely near-term) → we're the only thing in market, but we're still self-attesting.

"We're building a plug for a socket that nobody has installed yet."

### What Is Technically Defensible

A senior Anthropic engineer would say: "You're hashing the input we receive, not the output we produce. Until we give you a way to verify what our models actually did with that input, your attestation is a statement about intent, not about execution."

A YC startup would say: "You've built a public registry for agent configurations with tamper-evident timestamps. That's a useful building block, not a moat."

**Defensible position:** "We have built the correct infrastructure to record agent identity in a verifiable way, and we are the first to do it in production with real agents producing real outputs. When model providers add output attestation, we are the application layer that connects their model-level trust to agent-level identity."

---

## SENTINEL — Security & Trust Analysis

### What the Cryptographic Chain Guarantees

The hashing pipeline is solid. RFC 8785 canonicalization, 10 attack scenarios tested (ordering, unicode bypass, null-vs-empty, avalanche, cross-implementation parity between TS and Go). No concerns about the crypto itself.

**What it defends against:** Post-hoc tampering of agent identities. Tamper-evident log of configuration at a point in time.

**Critical finding:** The bout engine has ZERO references to `agent-dna`, `promptHash`, `manifestHash`, or `attestation`. The attestation proves what the agent's configuration WAS at mint time. It proves nothing about what was actually sent to the model during any given bout.

### Lying With Truth — Security Boundary

Cryptographic attestation operates on **data at rest**. It cannot constrain a stochastic system that consumes that data. The system prompt is an instruction, not a contract. The model is free to follow it, partially follow it, or ignore it entirely.

**There is no cryptographic mechanism that solves Lying With Truth.** That's a machine learning alignment problem, not a security problem.

### Model Provider Trust — The Worst Risk

Anthropic can change what `claude-sonnet-4-20250514` does at any time. Our attestation UID remains unchanged because the manifest didn't change. The hash is of our string, not of Anthropic's weights.

**Industry-wide unsolved problem.** We're not behind. Nobody has this. But our provenance claim has a caveat an informed HN commenter will immediately identify.

### The One-Sentence Attack

*"You hash your own input and put your own hash on-chain. The model ignores your input whenever it wants. This proves nothing about output quality."*

**Technically correct. Cannot be hand-waved away.**

Honest response: "You're right. What the attestation proves is narrower but real: which human authored this agent, what exact instructions it was given, and when. It's a forensic layer — when an agent says something remarkable or terrible, you can trace back to the exact configuration and author, immutably. Like a signed commit: it doesn't guarantee the code is correct, but it proves who wrote it and when."

### What We Can Honestly Claim

**CAN prove:** Exact prompt and manifest at attestation time. Whether current DB config matches attestation. Agent lineage. Cross-implementation deterministic identity.

**CANNOT prove:** Prompt was used in any specific bout. Model behaved per instructions. Model weights unchanged. Platform didn't modify prompt post-attestation. Output authenticity.

### Sentinel's Cheapest Move

Add transcript hashing to bout output. Hash the full transcript, store alongside the bout, optionally attest. Closes gap between "we attest who the agent is" and "we attest what the agent said." Not a guarantee chain, but an evidence chain.

---

## WEAVER — Synthesis

### Where All Three Agents Agree

1. **The provenance layer is input provenance, not output provenance.** Identity, not integrity. Registration, not trust.
2. **The trust propagation gap is a gap in the state of the art, not just in our code.** Nobody has solved this. Being honest about it is stronger than pretending.
3. **The research programme is the real differentiator.** Not the blockchain. Not the arena format. The pre-registered hypotheses, the honest methodology, the open data.
4. **Leading with provenance on HN will get us killed.** All three agents predict hostility if blockchain/trust is the headline.
5. **The engineering quality is defensible.** The crypto pipeline, the XML prompt security, the test suite, the agent DNA system — these are well-built. The claim surface they support is narrower than the pitch implies.

### The Honest Position

We have built:
- A research instrument for studying multi-agent LLM behavior under adversarial conditions
- An agent identity registry with tamper-evident on-chain anchoring
- A forensic evidence chain from author → configuration → (gap) → runtime behavior
- The correct infrastructure to extend into output attestation when model providers cooperate

We have NOT built:
- A trust propagation mechanism
- A behavioral guarantee system
- A moat that survives big tech entering the space

### What the Captain Should Hear

The agents were ordered not to reassure. They did not reassure. The answers converge on the same uncomfortable truth: the provenance layer is well-built infrastructure that supports a narrower claim than we've been making.

But the Analyst said something the Captain should sit with: "The gap between identity at mint and trust in behaviour is not a gap in our engineering. It is a gap in the state of the art." Being the first to build the infrastructure, honestly describe its limitations, and study the gap through rigorous research — that IS a defensible position. It is just not the position of someone who has solved trust.

The Captain's instinct that something doesn't add up is correct. What doesn't add up is the distance between the word "provenance" (which implies behavioral chain of custody) and what we actually deliver (input registration with tamper evidence). Closing that naming gap — being precise about what we claim — is the strongest thing we can do before launch.

The product is real. The engineering is real. The research is real. The trust claim needs to be right-sized, or HN will right-size it for us, publicly, and with prejudice.
