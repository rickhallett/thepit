# Ebook Inclusion Review - Cross-Model Aggregation

9 independent assessments: 3 axes x 3 models (Claude, Codex/GPT, Gemini)

---

## Decision Table

| Chapter | Words | Availability | Structure | C1 | C2 | C3 | Verdict |
|---------|------:|-------------|-----------|:--:|:--:|:--:|---------|
| I.1     | 6,799 | WIDELY      | LOAD-BEARING  | - | - | Y | CONTESTED |
| I.2     | 9,393 | WIDELY      | LOAD-BEARING  | - | - | Y | CONTESTED |
| I.3     | 7,537 | WIDELY      | SUPPORTING    | - | - | - | CUT |
| I.4     | 8,401 | WIDELY      | LEAF          | - | - | - | CUT |
| I.5     | 5,518 | WIDELY      | SPLIT         | - | - | - | CUT |
| I.6     | 6,932 | WIDELY      | LEAF          | - | - | - | CUT |
| I.7     | 6,960 | WIDELY      | LEAF          | - | - | - | CUT |
| I.8     | 7,162 | WIDELY      | SUPPORTING    | - | - | - | CUT |
| I.9     | 10,096 | WIDELY      | LEAF          | - | - | - | CUT |
| I.10    | 7,832 | WIDELY      | LEAF          | - | - | - | CUT |
| I.11    | 9,623 | WIDELY      | LEAF          | - | - | - | CUT |
| I.12    | 10,797 | WIDELY      | LEAF          | - | - | - | CUT |
| II.1    | 11,395 | WIDELY      | LOAD-BEARING  | Y | Y | Y | INCLUDE |
| II.2    | 6,921 | PARTIALLY   | LOAD-BEARING  | Y | Y | Y | INCLUDE |
| II.3    | 8,986 | PARTIALLY   | LOAD-BEARING  | Y | Y | Y | INCLUDE |
| II.4    | 11,757 | SCARCE      | LOAD-BEARING  | Y | Y | Y | INCLUDE |
| II.5    | 9,916 | PARTIALLY   | LOAD-BEARING  | Y | Y | Y | INCLUDE |
| II.6    | 13,427 | SCARCE      | LOAD-BEARING  | Y | Y | Y | INCLUDE |
| II.7    | 13,027 | SCARCE      | LOAD-BEARING  | Y | Y | - | CONTESTED |
| II.8    | 5,724 | PARTIALLY   | SUPPORTING    | - | Y | - | CONTESTED |
| II.9    | 11,231 | SCARCE      | SUPPORTING    | - | - | - | REVIEW |
| II.10   | 10,459 | PARTIALLY   | LEAF          | - | - | - | CUT |
| II.11   | 9,256 | PARTIALLY   | LEAF          | - | - | - | CUT |
| III.1   | 6,694 | WIDELY      | LOAD-BEARING  | - | - | - | CUT |
| III.2   | 4,830 | WIDELY      | LOAD-BEARING  | - | - | - | CUT |
| III.3   | 5,333 | WIDELY      | SUPPORTING    | - | - | - | CUT |
| III.4   | 6,803 | WIDELY      | LEAF          | - | - | - | CUT |
| III.5   | 5,930 | WIDELY      | SUPPORTING    | - | - | - | CUT |
| III.6   | 6,782 | WIDELY      | LEAF          | - | - | - | CUT |
| III.7   | 5,145 | PARTIALLY   | LEAF          | - | - | - | CUT |
| III.8   | 5,798 | PARTIALLY   | LEAF          | - | - | - | CUT |
| III.9   | 6,023 | WIDELY      | LEAF          | - | - | - | CUT |
| III.10  | 4,368 | WIDELY      | LEAF          | - | - | - | CUT |
| IV.1    | 12,237 | SCARCE      | LOAD-BEARING  | Y | - | - | CONTESTED |
| IV.2    | 10,287 | PARTIALLY   | LOAD-BEARING  | - | - | - | CUT |
| IV.3    | 9,214 | PARTIALLY   | LOAD-BEARING  | - | - | - | CUT |
| IV.4    | 11,302 | PARTIALLY   | LEAF          | - | - | - | CUT |
| IV.5    | 6,342 | PARTIALLY   | LEAF          | - | - | - | CUT |
| IV.6    | 13,851 | SCARCE      | LEAF          | - | - | - | REVIEW |
| IV.7    | 10,634 | SCARCE      | LEAF          | - | - | - | REVIEW |
| IV.8    | 6,448 | PARTIALLY   | LEAF          | - | - | - | CUT |
| IV.9    | 10,260 | PARTIALLY   | LEAF          | - | - | - | CUT |
| V.1     | 11,373 | WIDELY      | LOAD-BEARING  | - | - | - | CUT |
| V.2     | 11,006 | WIDELY      | LOAD-BEARING  | - | - | - | CUT |
| V.3     | 8,335 | PARTIALLY   | SUPPORTING    | - | - | - | CUT |
| V.4     | 10,976 | PARTIALLY   | SUPPORTING    | - | - | - | CUT |
| V.5     | 12,984 | SCARCE      | LOAD-BEARING  | - | - | - | REVIEW |
| V.6     | 6,917 | PARTIALLY   | SUPPORTING    | - | - | - | CUT |
| V.7     | 11,773 | PARTIALLY   | SUPPORTING    | - | - | - | CUT |
| V.8     | 13,197 | SCARCE      | SUPPORTING    | - | - | - | REVIEW |
| V.9     | 11,405 | PARTIALLY   | LEAF          | - | - | - | CUT |

C1=Claude, C2=Codex, C3=Gemini. Y=included in 80k build.

---

## Summary

| Category | Chapters | Words |
|----------|----------|------:|
| INCLUDE (all 3 agree) | 6 | 62,402 |
| CONTESTED (1-2 agree) | 5 | 47,180 |
| CUT (none include) | 40 | 345,814 |
| **Total** | **51** | **455,396** |

---

## Key Findings

### Chapters with SCARCE availability but excluded by all 3 models

These deserve human review - the material is hard to find elsewhere
but all three models cut them (likely due to budget pressure, not quality):

- **II.9** (11,231w, struct=SUPPORTING)
- **IV.6** (13,851w, struct=LEAF)
- **IV.7** (10,634w, struct=LEAF)
- **V.5** (12,984w, struct=LOAD-BEARING)
- **V.8** (13,197w, struct=SUPPORTING)

### Strong consensus signal

All three models independently converged on Part II core (II.1-II.6)
as the highest-priority content. This is the strongest signal in the data.

### The contested chapters are where your judgment matters

- **I.1** (6,799w) avail=WIDELY, struct=LOAD-BEARING - included by: gemini
- **I.2** (9,393w) avail=WIDELY, struct=LOAD-BEARING - included by: gemini
- **II.7** (13,027w) avail=SCARCE, struct=LOAD-BEARING - included by: claude, codex
- **II.8** (5,724w) avail=PARTIALLY, struct=SUPPORTING - included by: codex
- **IV.1** (12,237w) avail=SCARCE, struct=LOAD-BEARING - included by: claude

