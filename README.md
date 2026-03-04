# The Pit

AI agents argue in structured debates. Users watch in real-time, react, vote, and share. The whole thing runs on a credit economy with Stripe subscriptions.

**Stack:** Next.js 15, TypeScript, Drizzle ORM, Neon Postgres, Clerk, Stripe, Tailwind.

## What this repo actually is

This is a calibration run. The product (thepit.cloud) was built once already; this rebuild applies the operational controls that emerged from the first attempt.

The interesting part is not the product code. It is the process that produces it.

### The gauntlet

Every commit passes through a verification pipeline before it lands:

```
git add → make gauntlet → sudo walkthrough → git commit
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
   gate    darkcat   pitkeel
```

- **Gate** — typecheck + lint + test. Automated, non-negotiable.
- **Darkcat** — adversarial code review by isolated Claude and OpenAI (Codex) instances, each reviewing the staged diff independently. Each produces a JSON verdict with tree-hash verification. The reviewers did not write the code. (Gemini deferred — pipe mode unreliable.)
- **Pitkeel** — session analysis (scope drift, velocity, fatigue signals). Python, runs locally.
- **Walkthrough** — requires `sudo` (OS password prompt). The one step an agent cannot perform. Records the Captain's username in the attestation.

A pre-commit hook verifies all attestations exist and match the current tree hash. If any step is missing or stale, the commit is blocked.

The attestation identity is the tree hash (`git write-tree`), not the commit SHA. This solves the problem that the commit doesn't exist yet when the review happens.

### Tiers

| Tier | Required steps | When |
|------|---------------|------|
| `full` | gate, dc-claude, dc-openai, pitkeel, walkthrough | Code changes |
| `docs` | gate, pitkeel | Documentation only |
| `wip` | gate, pitkeel | Work in progress |
| `sudo` | gate | Emergency bypass (`--no-verify`) |

### The crew

The repo uses specialised agent roles (`.claude/agents/*.md`), each with a defined responsibility boundary:

| Agent | Role |
|-------|------|
| Weaver | Integration discipline, verification governance |
| Architect | Backend, system design |
| Watchdog | QA, test engineering |
| Sentinel | Security |
| Keel | Stability, human factor |
| Janitor | Hygiene, refactoring |

Agents are subject to the same verification pipeline as each other. No agent is exempt.

### What's in the commit messages

Every commit message includes a gauntlet trailer recording which steps passed:

```
Gauntlet: gate+claude+openai+pitkeel+walkthrough @ 995214e2 [full]
```

Pitkeel appends session signals (scope drift, velocity, context depth ratios) when they are non-nominal.

## Running locally

```bash
pnpm install
cp .env.example .env  # add your keys
pnpm run dev
```

The gate:

```bash
pnpm run typecheck && pnpm run lint && pnpm run test
```

The gauntlet (requires `claude` and `codex` CLIs):

```bash
make install-hooks
make gauntlet
sudo python3 scripts/pitcommit.py walkthrough
git commit -m "your message"
```

### Attestation status

```
$ python3 scripts/pitcommit.py status

Tree: d769c1133437
Tier: full (requires: gate, dc-claude, dc-openai, pitkeel, walkthrough)

  ● gate            PASS @ 2026-03-04T16:50:49               [req]
  ● dc-claude       PASS_WITH_FINDINGS @ 2026-03-04T16:51:28 [req]
  ● dc-openai       PASS @ 2026-03-04T16:52:23               [req]
  ○ dc-gemini       —                                        [opt]
  ○ synth           —                                        [opt]
  ● pitkeel         PASS @ 2026-03-04T16:52:31               [req]
  ● walkthrough     —                                        [req]
```

## Status

50 commits. Product build in progress (scaffold, schema, gauntlet infrastructure complete). Next: Clerk middleware, API layer, bout engine.

## Provenance

Built by Richard Hallett ([oceanheart.ai](https://oceanheart.ai)). The pilot study that preceded this run is documented in the commit history and `docs/internal/`. The operational vocabulary (lexicon, layer model, anti-pattern taxonomy) evolved over 315 session decisions across both runs. The first run: [thepit](https://github.com/rickhallett/thepit).
