# Adversarial Review: `shared/keelstate/`

## 1. Summary Verdict

**Clearly LLM-generated, competent but unseasoned.** On the spectrum, this sits at about 75% toward the "clearly LLM" end. It is correct, passes the gate, serves its consumer well. But it has the syntactic fingerprint of a single-pass generation by a model that has seen many Go tutorials and few production Go codebases. A human Go developer with 2+ years experience would produce code that looks meaningfully different from this — not better, necessarily, but *different* in ways a classifier could exploit.

The code is the equivalent of slopodar's "clean but lifeless" prose signal — there is nothing wrong with it, and that is what's wrong with it.

---

## 2. Feature-by-Feature Findings

### 2.1 Comment-to-Code Ratio and Comment Style

**Finding:** 29 comment lines in 210 lines of production code = **13.8% comment density**. The package doc alone is 17 lines — 8% of the entire file dedicated to a package docstring for a 4-function package.

**The damning detail:** Every struct field has a comment. Every comment explains WHAT the field is, not WHY it exists. Compare:

```go
// head: short git SHA of HEAD. Written by pitkeel state-update.
Head string `json:"head"`
```

vs. what a human might write:

```go
Head string `json:"head"` // short SHA; stale after rebase
```

The LLM's comments are *uniform* — every field comment follows `// fieldname: description. Written by X.` A human would comment the surprising ones and leave the obvious ones bare. `Gate string \`json:"gate"\`` doesn't need a comment — it's a gate, it's green or red. But `Note string \`json:"note"\`` genuinely needs one ("never overwritten by pitkeel"), and that comment is there, buried in the same uniform format as all the others. The signal drowns in noise.

The producer/consumer block in the package doc is disproportionately thorough for a 4-function internal package. It reads like generated documentation scaffolding, not organic annotation.

**Signal:** LLM. **Confidence:** High.

### 2.2 Error Message Uniformity

**Finding:** Every `fmt.Errorf` in the file follows the exact pattern `keelstate: verb %s: %w`. Count them:

| Line | Pattern |
|------|---------|
| 87 | `keelstate: gate must be...` |
| 106 | `keelstate: read %s: %w` |
| 111 | `keelstate: parse %s: %w` |
| 128 | `keelstate: open %s: %w` |
| 133 | `keelstate: flock %s: %w` |
| 139 | `keelstate: marshal: %w` |
| 143 | `keelstate: truncate %s: %w` |
| 147 | `keelstate: seek %s: %w` |
| 150 | `keelstate: write %s: %w` |

Nine error messages. Every single one is `keelstate: <verb> [%s]: %w`. No drift. No variation. Compare Go stdlib's `os` package where you'll find `open`, `OpenFile failed`, `close error`, `stat: ` — humans drift over time and across contributors.

This uniformity is *useful* (great for log parsing) but *unnatural*. A human writing these sequentially would vary — maybe one says `"keelstate: failed to open %s: %w"` or one drops the package prefix. The machine template is visible.

**Signal:** LLM. **Confidence:** Very high. This is probably the single strongest classifier feature.

### 2.3 Naming Symmetry

**Finding:** Function names are perfectly parallel: `Read`, `Write`, `ReadModifyWrite`. Parameter naming is exactly consistent: `root string` in every public function, `path` as the derived local, `s` for State, `f` for file, `data`/`out` for marshalled bytes.

The internal helper is `statePath` — lowercase, unexported, exactly what the linter would suggest. There is zero naming drift.

In the test file: `original`, `got`, `dir` — all standard Go test idioms. Not a single non-standard variable name.

A human developer might name the `ReadModifyWrite` parameter `mutate` or `update` instead of `fn`. They might call the local in `Write` something like `buf` instead of `data`. Small variations that reflect personal muscle memory.

**Signal:** Weak LLM. **Confidence:** Medium. Some experienced Go developers are genuinely this consistent. This one is harder to distinguish.

### 2.4 Structural Duplication as Completeness Bias

**Finding:** `Write()` (lines 118-153) and the write-back portion of `ReadModifyWrite()` (lines 192-207) share **identical** structure:

```
Marshal → append newline → Truncate → Seek → Write
```

Including identical flock acquire/release patterns. The total duplicated logic is ~15 lines. A human maintaining this would either:
- Extract a `writeUnderLock(f *os.File, s State) error` helper, OR
- Leave it duplicated but add `// same as Write, under existing lock` to acknowledge the duplication

The LLM did neither. It generated each function as a complete unit, because it was completing a template each time. There is no cross-reference between the two functions. Each stands alone as a textbook-correct implementation. This is the completeness bias — the model generates *complete correct units* rather than *maintainable systems*.

**Signal:** LLM. **Confidence:** High.

### 2.5 Test Coverage Pattern

**Finding:** 5 tests, each covering exactly one scenario:

| Test | What it covers |
|------|---------------|
| `TestRoundTrip` | Write then Read, field-by-field equality |
| `TestReadMissingFile` | Read returns zero value for nonexistent file |
| `TestValidateGate` | Invalid, valid, empty gate values |
| `TestReadModifyWrite` | Read-modify-write preserves unmodified fields |
| `TestWriteCreatesFile` | Write creates the file on disk |

**What's missing — things a human systems programmer would test:**
- Concurrent `ReadModifyWrite` calls (the whole point of flock)
- Corrupted JSON on disk (partial write, empty file, truncated JSON)
- File permission errors
- `Validate()` on the result of `ReadModifyWrite` when `fn` sets an invalid state
- Large state values (long strings, max int)
- Unicode in string fields
- Unknown JSON fields being rejected (the comment on line 29 claims this, but `json.Unmarshal` does NOT reject unknown fields by default — this is a latent documentation lie)

The test data is **suspiciously project-specific** — `"SD-277"`, `"Weaver"`, `"Get Hired"`, `1289` tests. This is the LLM pulling from its context window to generate realistic test data. A human would more likely use `"abc"`, `"test-officer"`, `42`.

The round-trip test compares fields one-by-one instead of using `reflect.DeepEqual` or `cmp.Diff`. This is the LLM generating the most explicitly correct approach rather than the most practical one.

**Signal:** LLM. **Confidence:** High.

### 2.6 Defensive Coding Distribution

**Finding:** `Validate()` checks exactly one thing: gate value. That's it. No other field is validated.

- `Head` could be empty, any string, 500 characters — no check.
- `Tests` could be negative — no check.
- `Officer` could be any string — no check against the known agent list.
- `Bearing.Commits` could be negative — no check.

This is *uniformly optimistic* except for the one field (`Gate`) that has an enumerated value set. A human would either validate nothing (trusting the callers) or validate selectively based on experience with what actually breaks. The pattern here is: "I need a Validate function, what's the most obvious thing to validate? The enum field."

This matches the LLM's pattern of doing the single most obvious thing when asked for a validation function.

**Signal:** LLM. **Confidence:** Medium-high.

### 2.7 Import Hygiene and Stdlib Choices

**Finding:** Uses `syscall` for `Flock`. On Go 1.25.7.

`syscall` has been frozen since Go 1.4 (2014). The documented replacement is `golang.org/x/sys/unix`. The `syscall` package docs literally say: "Deprecated: this package is locked down. Callers should use the corresponding package in the golang.org/x/sys repository."

An experienced Go developer knows this — or hits it during `go vet` warnings on some platforms (though `syscall.Flock` specifically doesn't trigger vet). An LLM trained on a corpus that spans 2014-2024 will have seen far more `syscall.Flock` examples than `unix.Flock` examples, because the transition happened gradually and most Stack Overflow answers and tutorials still use `syscall`.

This is a **training data frequency** signal, not a correctness signal. Both work. But the choice reveals the decision source.

**Signal:** LLM. **Confidence:** Medium. A pragmatic human might also choose `syscall` to avoid adding an external dependency for a single call.

### 2.8 The "Textbook" Signal

**Finding:** The flock pattern is exactly what appears in "Go file locking tutorial" results:

```go
f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0644)
defer f.Close()
syscall.Flock(int(f.Fd()), syscall.LOCK_EX)
defer syscall.Flock(int(f.Fd()), syscall.LOCK_UN)
// ... truncate, seek, write
```

There is nothing idiosyncratic. No personal style. No hard-won lessons visible (like checking `f.Sync()` after write to ensure durability, or using `os.O_TRUNC` instead of manual truncate, or wrapping the flock in a `Locker` interface for testability).

The `defer` for unlock is correct but masks a subtlety: if `Close()` is deferred first (line 130) and `Flock(LOCK_UN)` is deferred second (line 135), they execute in LIFO order — unlock then close. This is correct but accidental. A human who knew about defer ordering would either comment on it or reorder the defers to make the intent explicit.

**Signal:** LLM. **Confidence:** High. The code has no scars.

### 2.9 Test-Production Asymmetry

**Finding:** The test file has **zero comments** except for two inline ones (`// Write initial state`, `// Modify just the head`, `// Officer should be preserved`). The production file has 29 comment lines. This is the *inverse* of typical human patterns.

Humans write production code carefully and tests hastily. LLMs write production code with complete documentation scaffolding and tests with minimal annotation — because the tests are generated *after* the production code, in a single pass, and the model's "documentation instinct" is already satisfied.

The test file also has no table-driven tests, no `t.Run` subtests, no helper functions. Each test is a standalone function. This is valid Go but stylistically dated — modern Go testing heavily uses subtests and table-driven patterns.

**Signal:** LLM. **Confidence:** Medium-high.

### 2.10 The ReadModifyWrite Race

**Finding:** This is the technical crux. Let me be precise about file descriptors and POSIX semantics.

**Line 161:** `os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0644)` — opens fd1.
**Line 167:** `syscall.Flock(int(f.Fd()), syscall.LOCK_EX)` — locks fd1.
**Line 173:** `os.ReadFile(path)` — internally opens fd2, reads, closes fd2.

**Is this safe?**

POSIX `flock` is an *advisory* lock associated with the **open file description** (the kernel-level entry), not the file name. The lock on fd1 does NOT prevent another process from opening the same path and reading/writing via a different fd. Advisory locks only work if all participants cooperate by acquiring the lock before access.

**Within this codebase:** Every read-modify-write goes through `ReadModifyWrite()`, which acquires the flock before doing anything. Every standalone write goes through `Write()`, which also acquires the flock. So far so good — all writers cooperate.

**But:** `Read()` (line 99) does NOT acquire any lock. It calls `os.ReadFile` directly. And `pitkeel/main.go:562` calls `keelstate.Read()` directly. So `Read()` can execute concurrently with `ReadModifyWrite()`, and could see a partially-written file (the truncate-then-write sequence in lines 199-206 is not atomic — there's a window where the file is empty or partially written).

**The ReadFile-on-fd2 issue specifically:** Even within `ReadModifyWrite` itself, the `os.ReadFile(path)` on line 173 opens a separate fd. The flock on fd1 is held, so any *cooperating* process that tries to flock the same file will block. But the ReadFile on fd2 is reading the file's current content, which is consistent because we hold the lock and no other cooperating writer can modify it between our flock and our ReadFile. So **within the cooperative protocol, this is safe.**

**The actual bug:** The race is not in `ReadModifyWrite` internally. The race is between `Read()` (which is lock-free) and any concurrent writer. This is a real bug, but it's a **design-level** bug, not a line-level bug. The code *looks* correct because each function is correct in isolation. An LLM generates correct-in-isolation. A human systems programmer would either:
- Add a shared lock (`LOCK_SH`) to `Read()`, or
- Document that `Read()` is intentionally racy and callers must tolerate stale reads, or
- Not have `Read()` as a separate public function at all

There is also a second, subtler issue: `os.ReadFile` on line 173 could theoretically see a zero-length file if this is a freshly-created file (the `O_CREATE` flag on line 161 creates it, but no content has been written yet). The code handles this correctly on line 179 (`if len(data) > 0`), so this path works. But the `os.IsNotExist` check on line 174 will never be true — the file was just created or opened by `OpenFile` on line 161. This is dead code. The LLM generated the check because `Read()` has it, and the pattern was copied.

**Signal:** LLM (generated correct-looking pattern with dead code and an undocumented race). **Confidence:** High.

---

## 3. The Strongest Signals for a Statistical Classifier

**Rank 1: Error message uniformity (2.2).** Nine `fmt.Errorf` calls, identical template, zero drift. This is the highest-confidence, most mechanically measurable signal. Compute the edit distance between all error format strings in a file. LLM code will have near-zero variance. Human code drifts.

**Rank 2: Structural duplication without acknowledgment (2.4).** The Write/ReadModifyWrite duplication is not just duplicated — it's duplicated *exactly*, with no comment, no TODO, no extraction. Measure: take the longest repeated subsequence of AST nodes within a file. LLM code will have higher exact-match duplication. Human duplication tends to drift (different variable names, slightly different ordering).

**Rank 3: Comment-density inversion between production and test code (2.9).** In LLM-generated code, the production file is over-commented and the test file is under-commented. In human code, the ratio inverts. Measure: `(prod_comment_density / test_comment_density)`. LLM > 2.0. Human < 1.0.

---

## 4. Candidate Code-Slopodar Features

### 4.1 `error_template_variance`
**Definition:** For all `fmt.Errorf` (or equivalent error-construction calls) in a file, compute the normalized Levenshtein distance of their format strings, pairwise. Report the mean.
**Interpretation:** LLM-generated code → low variance (< 0.2). Human code → higher variance (> 0.4). Stdlib Go code → very high variance (> 0.6).

### 4.2 `comment_what_vs_why_ratio`
**Definition:** Classify each comment as WHAT (restates the code's action) vs WHY (explains intent, trade-off, history, or risk). Report `what_count / total_comments`.
**Interpretation:** LLM → ratio > 0.7 (mostly WHAT). Experienced human → ratio < 0.4 (mostly WHY, or no comment at all).

### 4.3 `struct_field_comment_coverage`
**Definition:** For struct definitions, compute `commented_fields / total_fields`.
**Interpretation:** LLM → approaches 1.0 (every field commented). Human → bimodal: either ~0 (no comments) or ~0.3 (only the non-obvious fields commented).

### 4.4 `ast_clone_exactness`
**Definition:** For detected code clones (repeated AST subtrees > N nodes), measure how identical the clones are at the token level. Report `exact_token_matches / clone_token_count`.
**Interpretation:** LLM → approaches 1.0 (clones are character-perfect copies). Human → < 0.8 (variable names drift, ordering shifts, one copy has an extra check).

### 4.5 `test_production_style_delta`
**Definition:** Compute a style vector for each file (comment density, average identifier length, blank line frequency, function length distribution). Report the L2 distance between the test file's vector and the production file's vector.
**Interpretation:** LLM → high delta (different registers for production vs test). Human → low delta (same person, same habits, same file).

---

## 5. The Bug Question

**Is there an actual bug in `ReadModifyWrite`'s flock/ReadFile interaction?**

**Within `ReadModifyWrite` itself: No.** The flock on fd1 is held before `os.ReadFile` opens fd2. Because all cooperative writers (Write and ReadModifyWrite) also acquire the flock, no cooperative writer can modify the file between our flock acquisition and our ReadFile. The two-fd pattern is safe *under the cooperative locking protocol*.

**However, there are two real issues:**

1. **`Read()` is lock-free and can observe torn writes.** The truncate→write sequence in both `Write()` and `ReadModifyWrite()` is not atomic. A concurrent `Read()` call (which takes no lock) could see an empty file (after truncate, before write) or a partial file (during write). `pitkeel/main.go:562` calls `Read()` directly. This is a **real race condition** with observable consequences: `Read()` could return a zero State or a JSON parse error.

2. **Dead code on line 174.** The `os.IsNotExist(err)` check on the `os.ReadFile` inside `ReadModifyWrite` is unreachable. The file was just opened (or created) by `os.OpenFile` on line 161. The path exists. `os.ReadFile` will never return `os.ErrNotExist` for a path that was successfully opened one line earlier. This is copy-paste from `Read()`, where it IS reachable. The LLM copied the error-handling pattern without evaluating whether it applies in this context.

Neither of these bugs will manifest in normal operation (single-process CLI tool, sequential calls). But they reveal the generation pattern: correct-in-isolation, unverified-in-composition.
