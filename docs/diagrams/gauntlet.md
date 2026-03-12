# Full Gauntlet

`make gauntlet TIER=full` runs the complete 6-stage verification pipeline.
Each stage writes an attestation. Any failure stops the pipeline. The
principle is Swiss Cheese: no single layer catches everything, but the
probability of a defect surviving all layers is the product of the
individual miss rates.

```
+============+     +============+     +============+
| 1. Gate    |---->| 2. Interop |---->| 3. Swarm   |
| 35 tests   |     | 2 containers|     | N workers  |
| in-container|     | shared vol  |     | compose    |
+============+     +============+     +============+
                                            |
     +--------------------------------------+
     |
+============+     +============+     +============+
| 4. Crew    |---->| 5. Darkcat |---->| 6. Pitkeel |
| mount flags |     | 3-model    |     | signal     |
| ro/rw proof |     | adversarial|     | analysis   |
+============+     +============+     +============+
                                            |
                                            v
                                   GAUNTLET COMPLETE
```

## The six stages

**1. Gate** (`make gate`). Builds the container, runs 35 tests inside it.
Proves every capability layer works in isolation. Deterministic - no LLM,
no network, no API keys. If the gate is red, nothing else runs.

**2. Interop** (`make interop`). Two containers sharing a Docker volume.
Midget-A writes an artifact, Midget-B reads it. Proves the file-based
handoff mechanism works across container boundaries. The convergence check
confirms both containers see the same data.

**3. Swarm** (`make swarm N=3`). Docker Compose spins up an init service
and N worker replicas. Each worker processes one job from the shared queue.
Proves atomic job acquisition under contention and that the orchestration
layer scales. All N results collected, incoming/ fully drained.

**4. Crew** (`make crew-test`). Deterministic plumbing test for the
governance crew. Proves mount constraints are correctly applied: dev has
write access, watchdog/weaver/sentinel have read-only. The `docker inspect`
step verifies `RW=false` on the repo volume - proof from Docker's own
metadata, not from agent claims.

**5. Darkcat** (`make darkcat-all`). Adversarial review of the current
diff by multiple models (Claude + Codex). Each model reviews independently
using a structured prompt. Convergence raises confidence, divergence
locates potential blind spots. This is the cross-model verification layer -
different priors produce genuinely independent signal.

**6. Pitkeel** (`make gauntlet-pitkeel`). Signal analysis on the commit.
The final attestation before the pipeline reports complete.

## Tiers

Not every change needs the full pipeline:

- `TIER=full` - all 6 stages (default)
- `TIER=wip` - gate + pitkeel only (work in progress, quick check)
- `TIER=docs` - gate + pitkeel only (documentation changes)

## Attestation

Each stage writes to `.gauntlet/` via `pitcommit.py`. The attestation
includes the git tree hash (content-addressed, not commit SHA) and the
verdict. The tree hash means the attestation is tied to the exact content
that was verified, not to a mutable ref.
