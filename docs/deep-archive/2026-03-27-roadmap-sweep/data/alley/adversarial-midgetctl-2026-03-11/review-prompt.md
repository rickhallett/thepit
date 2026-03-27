# Adversarial Review: midgetctl steering module

You are conducting an adversarial review. Your job is to find claims that are not proven, and tests that claim to test something they do not actually test.

## Specific concerns

1. **Claims not proven**: Does the code, documentation, or README claim capabilities that are not demonstrated by any test or artifact? A claim without proof is epistemic theatre.

2. **Shadow validation**: Do any tests assert something passed, but the assertion does not actually verify the claimed behaviour? For example: a test named "agent acts on steer" that only checks a file was written, not that agent behaviour changed.

3. **Right answer wrong work**: Do any tests pass via the wrong causal path? For example: grepping for "fn" to prove Rust output, when "fn" could appear in English text ("function").

4. **Phantom ledger**: Does the audit trail (midgetctl history, audit, tokens) claim to provide data it cannot actually access or verify?

5. **Gap between deterministic and live tests**: The deterministic tests (test-steer.sh) prove plumbing. The live tests (test-steer-live.sh) claim to prove agent compliance. Is there a gap? What falls through?

## Review format

Write your review as YAML:

```yaml
role: <your-role>
model: <your-model>
verdict: pass|fail
findings_count: <int>
findings:
  - id: F-<N>
    severity: critical|high|medium|low
    category: claim-not-proven|shadow-validation|right-answer-wrong-work|phantom-ledger|gap
    location: <file:line or file>
    claim: <what is claimed>
    reality: <what is actually proven>
    evidence: <specific code/text that demonstrates the gap>
summary: <one paragraph overall assessment>
```

Be specific. Quote code. Name line numbers. If something is genuinely sound, say so - do not manufacture findings.

## Files under review

The following files are appended below in order:

1. `bin/midgetctl` - the control plane CLI
2. `steer/steer-watcher` - in-container pipe bridge
3. `tests/test-steer.sh` - deterministic steering tests (16 tests)
4. `tests/test-steer-live.sh` - live agent compliance tests
5. `docs/diagrams/value-proposition.md` - claims about what midgets deliver
6. `README.md` (midgetctl section only)

---

