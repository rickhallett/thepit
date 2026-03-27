# Markdown Roadmap Audit

**Date:** 2026-03-27
**Auditor:** Codex
**Scope:** All authored Markdown in the repo, excluding vendor or generated dependency mirrors under `node_modules/`, `.git/`, `.next/`, `.clerk/.tmp/`, and `.opencode/node_modules/`
**Corpus size:** 530 Markdown files
**Decision rule:** If a file does not directly support the current MVP path in `docs/roadmap.md`, it should leave the active surface. Default destination is deep archive. Delete is appropriate when the file is duplicate, generated, or low-value raw material that git history already preserves.

## Executive Verdict

The active documentation surface is far too large for the next development phase.

`docs/roadmap.md` is a sharp MVP plan built from two source files:

- `docs/the-pit-spec.md`
- `docs/the-pit-skills-and-governance-notes.md`

Almost everything else describes:

- the pre-roadmap product
- historical review runs
- internal operating theory
- experiments and adversarial material
- agent prompt scaffolding
- archived launch work

That material may still have historical value, but it is not roadmap-driving. It should not remain in the active path.

## Active Surface To Keep

These files directly contribute to the next phase and should remain easy to find:

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/roadmap.md`
- `docs/the-pit-spec.md`
- `docs/the-pit-skills-and-governance-notes.md`

## Keep Only If Rewritten Immediately

These files can stay only if they are rewritten to reflect the roadmap-first product. In their current form they mostly document the prior product shape:

- `docs/README.md`
- `docs/architecture.md`
- `docs/building.md`
- `docs/security.md`
- `app/README.md`
- `app/api/README.md`
- `components/README.md`
- `db/README.md`
- `drizzle/README.md`
- `lib/README.md`
- `presets/README.md`
- `qa/README.md`
- `scripts/README.md`
- `shared/README.md`
- `tests/README.md`

If they are not rewritten during the first roadmap milestones, move them to deep archive now and reintroduce only the docs that become necessary.

## Deep Archive Candidates

These groups are not direct inputs to `docs/roadmap.md`. They should move out of the active surface as whole directories or batches.

### Historical product and launch material

- `docs/archive/` (31 files)
- `docs/provenance/` (9 files)
- `docs/field-notes/` (4 files)
- `docs/eval-briefs/` (2 files)
- `docs/eval-prompts/100-protocol.md`
- `docs/audience-models/demographic-lenses-v1.md`
- `docs/diagrams/` (7 files)

### Decision and internal theory corpus

- `docs/decisions/` (14 files)
- `docs/internal/` Markdown corpus (215 files)

Reason: these files explain how the repo got here, not what must be built next. Keep the non-Markdown boot index files that still matter operationally, but remove this Markdown mass from the active path.

### Experimental data and research artifacts

- `data/` Markdown corpus (72 files)
- `notebooks/` Markdown corpus (5 files)
- `pitstorm/results/hypotheses/` (11 files)
- `slopodar-ext/` Markdown corpus (2 files)

Reason: raw experiment inputs, reports, and replications are evidence, not roadmap inputs.

### Agent scaffolding and instruction libraries

- `.claude/` Markdown corpus (61 files)
- `.agents/skills/` Markdown corpus (29 files)
- `.opencode/agents/` and `.opencode/plans/` Markdown corpus (16 files)
- `midgets/crew/` Markdown corpus (4 files)

Reason: these are agent-operational references, skill packs, and mirror instruction sets. They do not contribute directly to the MVP roadmap.

### Tool and sidecar docs not tied to the next phase

- `pitbench/README.md`
- `pitctl/README.md`
- `pitctl/QA_BATTLE_PLAN.md`
- `pitforge/README.md`
- `pitkeel-py/README.md`
- `pitlab/README.md`
- `pitnet/README.md`
- `ops/level4/README.md`
- `posthog-setup-report.md`
- `scripts/darkcat.md`
- `scripts/darkcat-synth.md`
- `scripts/study-companion.md`

Reason: sidecar tooling and historical process docs. Archive unless a roadmap milestone explicitly depends on one of them.

## Delete Candidates

These do not justify archive weight and are safe to drop if no immediate consumer is identified:

- `CLAUDE.combined.md`
- `master.md`
- `master-agentic.md`

Also delete one side of duplicated agent instruction mirrors after choosing a canonical home:

- `.claude/agents/` vs `.opencode/agents/`

Do not keep both. Pick one source of truth and remove the mirror set.

## Batch Actions

### Batch 1: shrink the visible surface now

Keep active:

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/roadmap.md`
- `docs/the-pit-spec.md`
- `docs/the-pit-skills-and-governance-notes.md`

Move the rest of `docs/` Markdown into `docs/deep-archive/` or an equivalent cold-storage location unless there is an immediate rewrite task attached to it.

### Batch 2: remove duplicated operational docs

- delete `CLAUDE.combined.md`
- delete `master.md`
- delete `master-agentic.md`
- choose either `.claude/agents/` or `.opencode/agents/` as canonical and delete the mirror

### Batch 3: cold-store evidence and prompt dumps

- move `data/`, `notebooks/`, `pitstorm/results/hypotheses/`, and `docs/internal/` Markdown into a deep archive root outside the active product doc surface

If archive weight still feels too high after that, delete the raw prompt dump subsets first. Git history is enough for recovery.

## Risks

### Risk 1: accidental loss of operational memory

Mitigation:

- keep `docs/internal/session-decisions-index.yaml`
- keep `AGENTS.md`
- keep any non-Markdown boot files still required by agent startup

### Risk 2: archiving docs that still describe the current codebase

Mitigation:

- archive current module READMEs only after deciding whether they will be rewritten for the run-and-evaluate MVP
- if a file describes old product behavior, archive first and rewrite from scratch later

### Risk 3: duplicate archive layers

Mitigation:

- use one cold-storage destination
- do not invent more nested archive directories than necessary

## Recommended Next Move

Do the cleanup as a two-step sweep:

1. Delete obvious duplicates and mirrors.
2. Move non-roadmap Markdown into one deep-archive location, leaving only the six active files plus any README that is explicitly being rewritten for Phase 1.

That gets the deck clear without destroying provenance.
