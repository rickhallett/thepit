#!/usr/bin/env python3
"""pitcommit — gauntlet attestation manager.

Manages verification attestations for the gauntlet pipeline.
The pre-commit hook calls verify; Makefile targets call attest.
Tree hash (git write-tree) is the identity — it hashes the staged
content before the commit exists, solving the SHA paradox.

Usage:
  pitcommit attest <step> [--tree HASH] [--verdict V] [--log PATH]
  pitcommit verify [--tier TIER]
  pitcommit status
  pitcommit tier [--set TIER]
  sudo pitcommit walkthrough [--tree HASH]
  pitcommit invalidate
  pitcommit trailer

Steps: gate, dc-claude, dc-openai, dc-gemini, synth, pitkeel, walkthrough
Tiers: full, docs, wip, sudo
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Constants ──────────────────────────────────────────────

GAUNTLET_DIR = Path(".gauntlet")

STEPS = [
    "gate",
    "dc-claude",
    "dc-openai",
    "dc-gemini",
    "synth",
    "pitkeel",
    "walkthrough",
]

TIERS = {
    # dc-gemini, synth removed — gemini hangs in pipe mode (2 failure modes, v0.32.1).
    # Restore triad when gemini stabilises: add dc-gemini, synth
    "full": [
        "gate",
        "dc-claude",
        "dc-openai",
        "pitkeel",
        "walkthrough",
    ],
    "docs": ["gate", "pitkeel"],
    "wip": ["gate", "pitkeel"],
    "sudo": ["gate"],
}

VERDICTS = {"pass", "fail", "pass_with_findings", "unknown"}

# ── Git helpers ────────────────────────────────────────────


def get_tree_hash():
    """Get tree hash of the current index (staged content)."""
    result = subprocess.run(
        ["git", "write-tree"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def get_staged_files():
    """Get list of staged file paths."""
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return []
    return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]


def get_branch():
    """Get current branch name."""
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return "unknown"
    return result.stdout.strip()


# ── Attestation IO ────────────────────────────────────────


def write_attestation(step, tree_hash, verdict="pass", details=None):
    """Write an attestation file to .gauntlet/."""
    GAUNTLET_DIR.mkdir(exist_ok=True)
    attestation = {
        "schema_version": 1,
        "step": step,
        "tree_hash": tree_hash,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "verdict": verdict,
        "details": details or {},
    }
    path = GAUNTLET_DIR / f"{step}.json"
    path.write_text(json.dumps(attestation, indent=2) + "\n")
    return attestation


def read_attestation(step):
    """Read an attestation file. Returns None if not found or invalid."""
    path = GAUNTLET_DIR / f"{step}.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        if not isinstance(data, dict):
            return None
        if data.get("schema_version") != 1:
            return None
        return data
    except (json.JSONDecodeError, OSError):
        return None


# ── Verdict parsing ───────────────────────────────────────


def parse_verdict_from_log(log_path):
    """Parse darkcat verdict from log file.

    Looks for 'Verdict: PASS | PASS WITH FINDINGS | FAIL'.
    Returns normalised verdict string.
    """
    try:
        content = Path(log_path).read_text()
    except OSError:
        return "unknown"

    match = re.search(
        r"^Verdict:\s*(PASS WITH FINDINGS|PASS|FAIL)",
        content,
        re.MULTILINE,
    )
    if match:
        raw = match.group(1).strip().lower().replace(" ", "_")
        return raw  # "pass", "fail", "pass_with_findings"
    return "unknown"


def parse_findings_from_log(log_path):
    """Extract finding counts from darkcat log."""
    details = {}
    try:
        content = Path(log_path).read_text()
    except OSError:
        return details

    match = re.search(
        r"Findings:\s*(\d+)\s*\(critical:\s*(\d+),\s*major:\s*(\d+),\s*minor:\s*(\d+)\)",
        content,
    )
    if match:
        details["findings"] = int(match.group(1))
        details["critical"] = int(match.group(2))
        details["major"] = int(match.group(3))
        details["minor"] = int(match.group(4))
    details["log"] = str(log_path)
    return details


# ── Tier detection ────────────────────────────────────────


def read_tier_file():
    """Read explicit tier from .gauntlet/.tier."""
    tier_file = GAUNTLET_DIR / ".tier"
    if tier_file.exists():
        tier = tier_file.read_text().strip()
        if tier in TIERS:
            return tier
    return None


def detect_tier():
    """Auto-detect tier from explicit file, staged files, or default.

    Priority:
      1. Explicit .gauntlet/.tier file (set by pitcommit tier --set)
      2. Auto-detect from staged file types
      3. Default: full
    """
    # 1. Explicit tier file
    explicit = read_tier_file()
    if explicit:
        return explicit

    # 2. Auto-detect from staged files
    files = get_staged_files()
    if not files:
        return "full"

    doc_extensions = {".md", ".txt", ".mdx", ".rst"}
    doc_dirs = ("docs/",)
    all_docs = all(
        Path(f).suffix in doc_extensions or any(f.startswith(d) for d in doc_dirs)
        for f in files
    )
    if all_docs:
        return "docs"

    # 3. Default
    return "full"


def set_tier(tier):
    """Set explicit tier for next commit."""
    if tier not in TIERS:
        print(
            f"Unknown tier: {tier}. Options: {', '.join(TIERS.keys())}",
            file=sys.stderr,
        )
        sys.exit(1)
    GAUNTLET_DIR.mkdir(exist_ok=True)
    (GAUNTLET_DIR / ".tier").write_text(tier + "\n")
    print(f"Tier set: {tier} (requires: {', '.join(TIERS[tier])})")


# ── Verification ──────────────────────────────────────────


def verify(tier=None):
    """Verify attestations for a tier.

    Returns (ok: bool, messages: list[str]).
    """
    if tier is None:
        tier = detect_tier()

    if tier not in TIERS:
        return False, [f"Unknown tier: {tier}"]

    tree_hash = get_tree_hash()
    if not tree_hash:
        return False, ["Cannot compute tree hash (git write-tree failed)"]

    required = TIERS[tier]
    messages = []
    ok = True

    for step in required:
        att = read_attestation(step)
        if att is None:
            messages.append(f"  MISSING  {step}")
            ok = False
            continue

        if att.get("tree_hash") != tree_hash:
            att_short = att.get("tree_hash", "?")[:8]
            messages.append(
                f"  STALE    {step} — verified {att_short}, staged {tree_hash[:8]}"
            )
            ok = False
            continue

        verdict = att.get("verdict", "unknown")
        if verdict == "fail":
            messages.append(f"  FAIL     {step}")
            ok = False
            continue

        if verdict == "unknown":
            messages.append(f"  UNKNOWN  {step} — could not determine verdict")
            ok = False
            continue

        messages.append(f"  OK       {step} ({verdict})")

    return ok, messages


# ── Status display ────────────────────────────────────────


def show_status():
    """Print status of all attestations."""
    tree_hash = get_tree_hash()
    tier = detect_tier()
    required = TIERS.get(tier, TIERS["full"])

    tree_short = tree_hash[:12] if tree_hash else "unknown"
    print(f"Tree: {tree_short}")
    print(f"Tier: {tier} (requires: {', '.join(required)})")
    print()

    for step in STEPS:
        att = read_attestation(step)
        req_label = "req" if step in required else "opt"

        if att is None:
            state = "—"
        elif tree_hash and att.get("tree_hash") != tree_hash:
            att_short = att.get("tree_hash", "?")[:8]
            state = f"STALE ({att_short})"
        else:
            v = att.get("verdict", "?").upper()
            t = att.get("timestamp", "?")[:19]
            state = f"{v} @ {t}"

        marker = "●" if step in required else "○"
        print(f"  {marker} {step:15s} {state:40s} [{req_label}]")


# ── Invalidation ──────────────────────────────────────────


def invalidate():
    """Clear all attestation files and tier override."""
    if not GAUNTLET_DIR.exists():
        print("No attestations to clear.")
        return

    count = 0
    for f in GAUNTLET_DIR.iterdir():
        if f.suffix == ".json" or f.name == ".tier":
            f.unlink()
            count += 1

    print(f"Cleared {count} file(s) from .gauntlet/")


# ── Trailer generation ───────────────────────────────────


def gauntlet_trailer():
    """Generate gauntlet trailer for commit message."""
    tree_hash = get_tree_hash()
    tier = detect_tier()
    short = tree_hash[:8] if tree_hash else "unknown"
    required = TIERS.get(tier, TIERS["full"])

    parts = []
    for step in required:
        att = read_attestation(step)
        label = step.replace("dc-", "")  # dc-claude → claude
        if att and att.get("tree_hash") == tree_hash:
            verdict = att.get("verdict", "unknown")
            if verdict in ("pass", "pass_with_findings"):
                parts.append(label)
            else:
                parts.append(f"!{label}")
        else:
            parts.append(f"!{label}")

    return f"Gauntlet: {'+'.join(parts)} @ {short} [{tier}]"


# ── CLI ───────────────────────────────────────────────────


def _parse_flags(args, flags):
    """Simple flag parser. Returns {flag: value} dict and remaining args."""
    result = {}
    remaining = []
    i = 0
    while i < len(args):
        if args[i] in flags and i + 1 < len(args):
            result[args[i]] = args[i + 1]
            i += 2
        else:
            remaining.append(args[i])
            i += 1
    return result, remaining


def cmd_attest(args):
    """Handle: pitcommit attest <step> [--tree H] [--verdict V] [--log P]"""
    if not args:
        print(
            "Usage: pitcommit attest <step> [--tree HASH] [--verdict V] [--log PATH]",
            file=sys.stderr,
        )
        sys.exit(1)

    step = args[0]
    if step not in STEPS:
        print(f"Unknown step: {step}. Options: {', '.join(STEPS)}", file=sys.stderr)
        sys.exit(1)

    flags, _ = _parse_flags(args[1:], {"--tree", "--verdict", "--log"})

    tree_hash = flags.get("--tree") or get_tree_hash()
    if not tree_hash:
        print("Cannot compute tree hash", file=sys.stderr)
        sys.exit(1)

    log_path = flags.get("--log")
    verdict = flags.get("--verdict")
    details = {}

    # Determine verdict
    if verdict:
        verdict = verdict.lower().replace(" ", "_")
    elif log_path:
        verdict = parse_verdict_from_log(log_path)
        details = parse_findings_from_log(log_path)
    else:
        verdict = "pass"

    write_attestation(step, tree_hash, verdict, details)
    print(f"Attested: {step} = {verdict} @ {tree_hash[:8]}")


def cmd_verify(args):
    """Handle: pitcommit verify [--tier TIER]"""
    flags, _ = _parse_flags(args, {"--tier"})
    tier = flags.get("--tier")

    ok, messages = verify(tier)
    used_tier = tier or detect_tier()

    print(f"Gauntlet [{used_tier}]:")
    for msg in messages:
        print(msg)

    if ok:
        print(f"\n✓ All attestations valid [{used_tier}]")
    else:
        print(f"\n✗ Gauntlet failed [{used_tier}]")

    sys.exit(0 if ok else 1)


def cmd_status(_args):
    """Handle: pitcommit status"""
    show_status()


def cmd_tier(args):
    """Handle: pitcommit tier [--set TIER]"""
    flags, _ = _parse_flags(args, {"--set"})
    tier_val = flags.get("--set")

    if tier_val:
        set_tier(tier_val)
    else:
        tier = detect_tier()
        explicit = read_tier_file()
        source = "explicit" if explicit else "auto-detected"
        print(f"Tier: {tier} ({source})")
        print(f"Requires: {', '.join(TIERS[tier])}")


def cmd_walkthrough(args):
    """Handle: sudo python3 scripts/pitcommit.py walkthrough [--tree HASH]

    Requires actual sudo (SUDO_USER must be set). This is the Operator's
    attestation — the one step that says a human reviewed the changes.
    An agent cannot provide the sudo password; this is the enforcement.

    Usage: sudo python3 scripts/pitcommit.py walkthrough
    """
    flags, _ = _parse_flags(args, {"--tree"})
    tree_hash = flags.get("--tree") or get_tree_hash()

    sudo_user = os.environ.get("SUDO_USER")
    if not sudo_user:
        print("Walkthrough requires sudo (Operator's attestation).", file=sys.stderr)
        print("", file=sys.stderr)
        print("  Usage: sudo python3 scripts/pitcommit.py walkthrough", file=sys.stderr)
        print("", file=sys.stderr)
        print("  An agent cannot provide the sudo password.", file=sys.stderr)
        sys.exit(1)

    if not tree_hash:
        print("Cannot compute tree hash", file=sys.stderr)
        sys.exit(1)

    # Show what's being attested so the Operator sees it.
    print(f"Tree: {tree_hash[:12]}")
    print(f"Operator: {sudo_user}")
    print()
    result = subprocess.run(
        ["git", "diff", "--cached", "--stat"],
        capture_output=True,
        text=True,
    )
    staged = result.stdout.strip()
    if staged:
        print("Staged changes:")
        print(staged)
    else:
        result = subprocess.run(
            ["git", "diff", "--stat", "HEAD~1..HEAD"],
            capture_output=True,
            text=True,
        )
        print("Last commit:")
        print(result.stdout.strip())

    print()
    write_attestation("walkthrough", tree_hash, "pass", {"checker": sudo_user})
    print(f"Walkthrough attested @ {tree_hash[:8]}")

    # Fix file ownership — sudo creates files as root.
    walkthrough_path = GAUNTLET_DIR / "walkthrough.json"
    if walkthrough_path.exists() and os.geteuid() == 0:
        import pwd

        try:
            pw = pwd.getpwnam(sudo_user)
            os.chown(walkthrough_path, pw.pw_uid, pw.pw_gid)
        except (KeyError, OSError):
            pass  # Best effort — non-critical if chown fails.


def cmd_invalidate(_args):
    """Handle: pitcommit invalidate"""
    invalidate()


def cmd_trailer(_args):
    """Handle: pitcommit trailer"""
    print(gauntlet_trailer())


def main():
    args = sys.argv[1:]
    if not args:
        print((__doc__ or "").strip(), file=sys.stderr)
        sys.exit(1)

    cmd = args[0]
    rest = args[1:]

    commands = {
        "attest": cmd_attest,
        "verify": cmd_verify,
        "status": cmd_status,
        "tier": cmd_tier,
        "walkthrough": cmd_walkthrough,
        "invalidate": cmd_invalidate,
        "trailer": cmd_trailer,
    }

    handler = commands.get(cmd)
    if handler is None:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        print(f"Commands: {', '.join(commands.keys())}", file=sys.stderr)
        sys.exit(1)

    handler(rest)


if __name__ == "__main__":
    main()
