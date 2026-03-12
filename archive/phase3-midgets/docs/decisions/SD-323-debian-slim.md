# SD-323 - debian-slim base image

**Date:** 2026-03-10
**Status:** ACTIVE
**Author:** Operator + Claude Code

---

## Decision

Switch the midget container base from `ubuntu:24.04` to `debian:bookworm-slim`.

---

## Rationale

Ubuntu 24.04 is ~200MB uncompressed. Debian Bookworm Slim is ~75MB. Given Chrome adds
~400MB regardless, the absolute saving on the base layer is modest but the principle
matters: minimum surface, minimum assumption.

The risk analysis (conducted before this SD) found:

- All required packages (`xvfb`, `fluxbox`, `xdotool`, `scrot`, `xclip`, `wmctrl`,
  `x11-utils`, `xterm`, `tmux`, `tesseract-ocr`, `python3`, `wget`) exist in Debian
  Bookworm with identical names.
- `apt` syntax is unchanged.
- `google-chrome-stable_current_amd64.deb` is a Debian-native package. Dependencies
  resolve against Debian Bookworm repos via `apt-get install -y /tmp/chrome.deb`.
  Bookworm predates the Trixie t64 library transition; no package-rename hazards.
- The `DEBIAN_FRONTEND=noninteractive` ENV is unchanged.
- `useradd` is present in Debian Slim via the `login` package (part of the minimal set).

Wolfi was considered and rejected: blocked by the Chrome `.deb` install method (no dpkg),
the X11 desktop toolchain (not packaged for server-focused distro), and the need to
rewrite all `apt` calls to `apk`. Not viable without replacing the Chrome installation
method and verifying the entire GUI toolchain.

---

## Change

Single line in `Dockerfile`:

```
- FROM ubuntu:24.04
+ FROM debian:bookworm-slim
```

Prose references in `README.md`, `SPEC.md`, and `PLAN.md` updated accordingly.

---

## Watch points

1. **Chrome dependency resolution.** If any of Chrome's declared deps are absent from
   Debian Bookworm's default mirrors, `apt-get install -y /tmp/chrome.deb` will fail
   with an unmet-dependencies error. The gate catches this immediately - Docker build
   exits non-zero.

2. **`procps` presence.** Explicitly installed in the Dockerfile; no risk.

3. **`python3-venv` / `python3-pip`.** Available in Debian Bookworm. Steer and drive use
   stdlib only (argparse, json, subprocess, etc.) so no pip installs are needed at runtime.

4. **`x11-utils` package name.** Identical in Debian Bookworm. Provides `xdpyinfo` which
   test 1 of test-poc.sh calls directly.

---

## Actual migration findings

Two issues found during gate validation on Debian Slim. Both resolved.

**Finding 1: xterm bitmap fonts unreadable by tesseract.**

Debian Slim with `--no-install-recommends` does not pull xterm's recommended packages
(`xfonts-base`, `xfonts-100dpi`/`xfonts-75dpi`). Ubuntu 24.04's base image includes
these. Without them, xterm falls back to a tiny default bitmap font. Tesseract returned
almost nothing (single character) from xterm screen content.

Fix: added `xfonts-base` and `fonts-dejavu-core` to the Dockerfile apt layer. Modified
`test-ocr.sh` to launch xterm with `-fa DejaVuSansMono -fs 14` (XFT/TrueType mode).
DejaVu Sans Mono is designed for legibility; tesseract reads it reliably.

Note: `test-poc.sh` did not surface this - it only asserts that `steer type` returns
`ok=true`, not that text appeared on screen. `test-ocr.sh` is the only test that
validates the full chain to visible screen content. This is a legitimate catch.

**Finding 2: (none)** Chrome dependency resolution worked cleanly. All Chrome deps
resolved against Debian Bookworm mirrors without modification.

---

## Definition of done

- `make gate` exits 0
- All 29 tests pass (test-poc: 10, test-drive: 9, test-ocr: 3, test-chromium: 3,
  agent loop: 4)
- `docker images midget-poc` shows a smaller image than the Ubuntu baseline

---

## Rollback

Revert `FROM debian:bookworm-slim` to `FROM ubuntu:24.04`. One line. Gate re-run confirms
recovery. No state is held in the base layer.
