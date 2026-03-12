# pitkeel-py

Python implementation of pitkeel, developed during Phase 2-3 R&D.

Session analysis tool that tracks context depth distribution, commit velocity, scope drift, and operator wellness signals. Runs locally as part of the verification pipeline.

The Go implementation (`pitkeel/`) was developed during Phase 1 as part of the product's CLI toolchain. This Python rewrite was built during Phase 2 when the verification pipeline moved to Make + Python scripting. Both implementations serve the same purpose; the Go version integrates with the product's shared library, the Python version runs standalone via uv.

## Usage

```bash
uv run pitkeel-py/pitkeel.py              # all signal checks
uv run pitkeel-py/pitkeel.py session      # session duration
uv run pitkeel-py/pitkeel.py velocity     # commits per hour
uv run pitkeel-py/pitkeel.py context      # context depth distribution
```

## Files

- `pitkeel.py` - CLI entry point
- `analysis.py` - session analysis logic
- `daemon.py` - sleep daemon for break reminders
- `git_io.py` - git log parsing
- `keelstate.py` - .keel-state file management
- `test_analysis.py` - tests
