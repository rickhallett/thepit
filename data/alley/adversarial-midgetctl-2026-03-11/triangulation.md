# Triangulation: adversarial review of midgetctl steering

3 models (Gemini 2.5 Flash, Grok 3 Mini, GPT-4o), same material, independent.
All three returned verdict: FAIL.

## Convergence (all 3 agree)

| Finding | Gemini | Grok | GPT-4o | Severity |
|---------|--------|------|--------|----------|
| VNC visual audit claim unproven by any test | F-3 | F-1 | - | med/high |
| Live test Rust detection is right-answer-wrong-work | - | F-2 | F-02 | medium |
| Gap between deterministic plumbing and agent compliance | F-1 | F-3 | - | medium |
| Value proposition claims not covered by steering tests | F-2 | - | F-01 | high |

## Divergence (model-specific)

| Finding | Model | Assessment |
|---------|-------|------------|
| Filename sequencing relies on lexicographic = chronological | GPT-4o F-03 | Valid but low severity. Filenames are millisecond timestamps, so lex order = chrono order unless clock skew. |
| History command doesn't verify data integrity | GPT-4o F-04 | Weak finding. History lists what exists. Verifying integrity is a different concern. |
| E2E/drive/tesseract claims unproven in steering tests | Gemini F-2 | Scope confusion - those are tested in test-poc.sh, test-drive.sh, test-ocr.sh. But the value-proposition doc references them without backrefs to where they're tested. |

## Actionable findings (converged, valid)

### 1. Rust detection is right-answer-wrong-work
**Grok F-2, GPT-4o F-02.** `grep -qE "(fn |-> |i32|i64)"` could match English text.
Fix: check for `fn add_numbers` or require multiple Rust-specific tokens co-occurring.
Or: ask the agent to output in a fenced code block with language tag and parse the tag.

### 2. VNC claim unproven
**Gemini F-3, Grok F-1.** `midgetctl watch` exists but no test connects to VNC.
The xsetroot role name is set in entrypoint.sh but never verified by screenshot/OCR.
Fix: test-poc.sh already proves OCR works. A VNC-specific test could start a container
with VNC, connect, screenshot, OCR for the role name. Or: downgrade the claim to
"VNC is available" rather than "visual audit."

### 3. Value proposition scope gap
**Gemini F-2, GPT-4o F-01.** value-proposition.md makes claims that are proven by
other test suites (test-poc, test-drive, test-ocr, test-chromium) but does not
backref to those tests. A reader seeing only the steering tests would conclude the
claims are unproven. Fix: add backrefs in value-proposition.md to the specific
test suites that prove each claim.

### 4. Deterministic vs live gap
**Gemini F-1, Grok F-3.** test-steer.sh proves plumbing with `cat` as consumer,
not an agent. test-steer-live.sh bridges this but is non-deterministic and optional.
This is correctly acknowledged in the codebase ("Only a live run can prove compliance")
but the gap exists. Fix: this is inherent - you cannot deterministically test
non-deterministic agent behaviour. The fix is to run the live test regularly and
track results, not to pretend the deterministic test covers more than it does.

## Non-findings (raised but invalid)

- Gemini's E2E/drive/tesseract finding (F-2) is a scope error. Those capabilities are
  tested elsewhere. The review was scoped to the steering module.
- GPT-4o's history integrity finding (F-04) is phantom. History reads what's on disk.
  Data integrity verification is a different requirement not claimed by the tool.

## Verdict

FAIL on claims-vs-proof. The plumbing is sound. The claims outrun the evidence.
Specifically: Rust detection pattern is too loose (fix the grep), VNC claim needs
a test or a downgrade, and value-proposition.md needs backrefs to existing tests.
