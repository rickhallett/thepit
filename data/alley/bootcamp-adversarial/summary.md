# Adversarial Review - Convergence Summary

**Run:** bootcamp-adversarial-2026-03-10
**Date:** 2026-03-10
**Models:** codex, grok, gemini
**Prompts:** 9
**Responses received:** 27
**Missing:** 0
**Total findings:** 93

---

## Attack Vectors Ranked by Convergence

Most frequently converged (cited by most models) to least:

| Rank | Vector | Label | Models | Count | Survives | Fails |
|------|--------|-------|--------|-------|----------|-------|
| 1 | `AV-ACCURACY` | Technical error | codex, gemini (2) | 19 | 19 | 0 |
| 2 | `AV-PEDAGOGY` | Pedagogical design flaw | codex, gemini (2) | 19 | 18 | 1 |
| 3 | `AV-COMPLETENESS` | Scope exceeds delivery | codex, gemini (2) | 13 | 11 | 2 |
| 4 | `AV-AUDIENCE` | No viable audience | codex, gemini (2) | 10 | 9 | 1 |
| 5 | `AV-SLOP` | Writing anti-patterns present | codex, gemini (2) | 9 | 7 | 2 |
| 6 | `AV-REPACK` | Repackaged existing material | codex, gemini (2) | 8 | 3 | 5 |
| 7 | `AV-OBSOLESCENCE` | Will not survive agent improvement | codex, gemini (2) | 6 | 5 | 1 |
| 8 | `AV-EXISTENTIAL` | Existence contradicts premise | codex, gemini (2) | 5 | 4 | 1 |
| 9 | `AV-DEPTH` | Lacks depth vs alternatives | codex, gemini (2) | 4 | 2 | 2 |

---

## Per-Prompt Convergence

### Prompt 1: repackaging (6 findings from 1 models)
- `AV-AUDIENCE`: cited by codex
- `AV-REPACK`: cited by codex
- `AV-COMPLETENESS`: cited by codex
- `AV-PEDAGOGY`: cited by codex
- `AV-DEPTH`: cited by codex

### Prompt 2: depth-test (10 findings from 2 models)
- `AV-COMPLETENESS`: cited by codex, gemini
- `AV-ACCURACY`: cited by codex, gemini
- `AV-PEDAGOGY`: cited by codex, gemini
- `AV-REPACK`: cited by codex, gemini
- `AV-SLOP`: cited by codex
- `AV-DEPTH`: cited by gemini

### Prompt 3: accuracy-audit (19 findings from 2 models)
- `AV-ACCURACY`: cited by codex, gemini
- `AV-AUDIENCE`: cited by gemini
- `AV-PEDAGOGY`: cited by gemini

### Prompt 4: irreplaceability (9 findings from 2 models)
- `AV-OBSOLESCENCE`: cited by codex, gemini
- `AV-PEDAGOGY`: cited by codex, gemini
- `AV-EXISTENTIAL`: cited by gemini
- `AV-COMPLETENESS`: cited by codex
- `AV-DEPTH`: cited by gemini

### Prompt 5: audience-problem (11 findings from 2 models)
- `AV-COMPLETENESS`: cited by codex, gemini
- `AV-REPACK`: cited by codex, gemini
- `AV-AUDIENCE`: cited by codex, gemini
- `AV-EXISTENTIAL`: cited by gemini
- `AV-PEDAGOGY`: cited by gemini

### Prompt 6: completeness-trap (10 findings from 2 models)
- `AV-SLOP`: cited by codex, gemini
- `AV-AUDIENCE`: cited by codex, gemini
- `AV-COMPLETENESS`: cited by codex, gemini
- `AV-PEDAGOGY`: cited by gemini

### Prompt 7: slop-detector (6 findings from 1 models)
- `AV-SLOP`: cited by codex

### Prompt 8: pedagogy-review (12 findings from 2 models)
- `AV-PEDAGOGY`: cited by codex, gemini
- `AV-REPACK`: cited by gemini
- `AV-COMPLETENESS`: cited by codex
- `AV-DEPTH`: cited by gemini

### Prompt 9: so-what-test (10 findings from 2 models)
- `AV-EXISTENTIAL`: cited by codex, gemini
- `AV-OBSOLESCENCE`: cited by codex, gemini
- `AV-PEDAGOGY`: cited by codex, gemini
- `AV-AUDIENCE`: cited by gemini
- `AV-COMPLETENESS`: cited by codex
- `AV-REPACK`: cited by gemini

---

## Severity Distribution by Model

| Model | Critical | High | Medium | Low |
|-------|----------|------|--------|-----|
| codex | 5 | 21 | 25 | 6 |
| grok | 0 | 0 | 0 | 0 |
| gemini | 2 | 10 | 14 | 10 |

---

## Survives Scrutiny by Attack Vector

Does the criticism actually hold up after the model's own analysis?

| Vector | Survives | Does Not Survive | Ratio |
|--------|----------|------------------|-------|
| `AV-ACCURACY` | 19 | 0 | 19/19 |
| `AV-AUDIENCE` | 9 | 1 | 9/10 |
| `AV-COMPLETENESS` | 11 | 2 | 11/13 |
| `AV-DEPTH` | 2 | 2 | 2/4 |
| `AV-EXISTENTIAL` | 4 | 1 | 4/5 |
| `AV-OBSOLESCENCE` | 5 | 1 | 5/6 |
| `AV-PEDAGOGY` | 18 | 1 | 18/19 |
| `AV-REPACK` | 3 | 5 | 3/8 |
| `AV-SLOP` | 7 | 2 | 7/9 |