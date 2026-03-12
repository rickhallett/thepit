# Slop Blockquote Audit - 2026-03-10

Auditor: @Weaver
Approver: Operator (all defaults accepted, zero overrides)
Scope: All `>` blockquotes in midgets repo (docs/, AGENTS.md, .claude/agents/)
Method: Manual grep + read, classified by information content
Provenance note: Operator accepted all 16 defaults without modification. Alignment on slop detection was exact. Causative factors to investigate retrospectively: slopodar training data (especially epigrammatic_closure, epistemic_theatre patterns), the muster format enabling fast binary decisions, and the clear classification criteria (functional vs decorative).

## Classification Criteria

- **KEEP**: Factual metadata/provenance, directly attributed quotes with source, functional mission statements
- **KILL**: AI-generated aphorisms with no attribution and no information content beyond sounding wise
- **TRIM**: Mixed - functional content wrapped in decorative phrasing

## Muster Results

| # | File | Line | Quote (truncated) | Verdict | Operator |
|---|------|------|--------------------|---------|----------|
| 1 | AGENTS.md | 3 | "Governance is inescapable..." | KILL | accepted |
| 2 | docs/internal/the-gauntlet.md | 3-5 | "Every change runs the gauntlet..." | KILL | accepted |
| 3 | docs/internal/dead-reckoning.md | 3 | "When the instruments fail..." | KILL | accepted |
| 4 | docs/internal/layer-model.md | 3-4 | "The Map Is Not The Territory..." | TRIM (keep attribution, drop line 4) | accepted |
| 5 | docs/internal/lexicon.md | 7-8 | "The naval metaphor was scaffolding..." | KILL | accepted |
| 6 | .claude/agents/operatorslog.md | 3 | "Every ship keeps a log..." | KILL | accepted |
| 7 | docs/weaver/signal-protocol-poc.md | 3 | Operator voice log quote | KEEP (SD-266, attributed) | accepted |
| 8 | docs/strategy/weaver-synthesis...md | 56 | IndyDevDan quote | KEEP (attributed) | accepted |
| 9 | docs/strategy/weaver-synthesis...md | 60 | IndyDevDan quote | KEEP (attributed) | accepted |
| 10 | Agent files (10x) | 3 | Mission statements | KEEP (functional) | accepted |
| 11 | Agent files (10x) | footer | SO-PERM-002 | TRIM ("you are not on this ship" -> plain instruction) | accepted |
| 12 | .claude/agents/weave-quick-ref.md | 3-4 | "Load this first..." | KEEP (functional) | accepted |
| 13 | docs/internal/boot-sequence.md | 3-4 | "What every agent must load..." | KEEP (functional) | accepted |
| 14 | docs/decisions/*.md | various | Provenance metadata | KEEP (metadata) | accepted |
| 15 | docs/internal/strategy/*.md | various | Version history | KEEP (metadata) | accepted |
| 16 | docs/internal/weaver/qa-signoff*.md | various | Verification metadata | KEEP (metadata) | accepted |

## Outcome

6 blockquotes killed, 2 trimmed, 8 kept. Led to creation of `bin/slopmop` CLI tool for ongoing automated detection.
