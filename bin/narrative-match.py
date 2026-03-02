#!/usr/bin/env python3
"""
Phase 2: Narrative Matching — Link quotes to datetime-layer events.

Phase 2a: Exact SD-ref match (confidence 1.0)
Phase 2b: Date + keyword match (confidence 0.8)
Phase 2c: Semantic match — DEFERRED (requires LLM, run separately)
Phase 2d: Emit matched-quotes.yaml

Usage:
    python3 bin/narrative-match.py [--repo-root /path/to/tspit]

Input:
    docs/internal/quote-inventory.yaml
    docs/internal/play-by-play.yaml

Output:
    docs/internal/matched-quotes.yaml
"""

import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml", file=sys.stderr)
    sys.exit(1)


def str_representer(dumper, data):
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


yaml.add_representer(str, str_representer)

SD_PATTERN = re.compile(r"SD-(\d+)")


# ---------------------------------------------------------------------------
# Parse datetime-layer into event index
# ---------------------------------------------------------------------------


def build_event_index(play_by_play):
    """Build a flat index of events from the datetime-layer."""
    events = []
    arcs = play_by_play.get("arcs", [])

    for arc in arcs:
        arc_id = arc.get("id", "unknown")
        arc_name = arc.get("name", "")
        date_range = arc.get("date_range", "")

        for event in arc.get("events", []):
            ev_date = event.get("date", "")
            ev_sd = event.get("sd", "")
            ev_text = event.get("event", "")
            ev_sig = event.get("significance", "")

            # Extract all SD refs from event
            sd_refs = set()
            for field in [ev_sd, ev_text, ev_sig]:
                sd_refs.update(f"SD-{m}" for m in SD_PATTERN.findall(str(field)))

            # Extract keywords (words > 4 chars, lowered, deduplicated)
            combined_text = f"{ev_text} {ev_sig}".lower()
            keywords = set(
                w
                for w in re.findall(r"[a-z]+", combined_text)
                if len(w) > 4 and w not in STOP_WORDS
            )

            events.append(
                {
                    "arc_id": arc_id,
                    "arc_name": arc_name,
                    "date": ev_date,
                    "date_range": date_range,
                    "sd_refs": sorted(sd_refs),
                    "event_text": ev_text,
                    "significance": ev_sig,
                    "keywords": keywords,
                }
            )

    return events


STOP_WORDS = {
    "about",
    "above",
    "after",
    "again",
    "against",
    "along",
    "already",
    "being",
    "before",
    "between",
    "could",
    "during",
    "every",
    "first",
    "found",
    "getting",
    "going",
    "having",
    "inside",
    "means",
    "might",
    "never",
    "other",
    "should",
    "since",
    "still",
    "their",
    "there",
    "these",
    "thing",
    "those",
    "three",
    "through",
    "under",
    "until",
    "using",
    "where",
    "which",
    "while",
    "within",
    "would",
    "years",
}


# ---------------------------------------------------------------------------
# Matching functions
# ---------------------------------------------------------------------------


def match_exact_sd(quote, events):
    """Phase 2a: Exact SD-ref match. Confidence 1.0."""
    matches = []
    q_sd_refs = set(quote.get("sd_refs", []))
    if not q_sd_refs:
        return matches

    for event in events:
        ev_sd_refs = set(event["sd_refs"])
        shared = q_sd_refs & ev_sd_refs
        if shared:
            matches.append(
                {
                    "arc_id": event["arc_id"],
                    "event_text": event["event_text"],
                    "confidence": 1.0,
                    "match_type": "exact-sd",
                    "matched_refs": sorted(shared),
                }
            )

    return matches


def match_date_keyword(quote, events):
    """Phase 2b: Date + keyword overlap. Confidence 0.8."""
    matches = []
    q_date = quote.get("datetime", "")
    q_text = quote.get("verbatim", "").lower()
    q_keywords = set(
        w for w in re.findall(r"[a-z]+", q_text) if len(w) > 4 and w not in STOP_WORDS
    )

    if not q_date or q_date == "unknown":
        return matches

    for event in events:
        # Check date overlap
        ev_date = event["date"]
        ev_range = event["date_range"]

        date_match = False
        if q_date == ev_date:
            date_match = True
        elif q_date in ev_range:
            date_match = True
        elif "to" in ev_range:
            parts = ev_range.split(" to ")
            if len(parts) == 2:
                start = parts[0].strip()
                end = parts[1].strip()
                if start <= q_date <= end:
                    date_match = True

        if not date_match:
            continue

        # Check keyword overlap
        shared_kw = q_keywords & event["keywords"]
        if len(shared_kw) >= 2:  # at least 2 shared keywords
            matches.append(
                {
                    "arc_id": event["arc_id"],
                    "event_text": event["event_text"],
                    "confidence": 0.8,
                    "match_type": "date-keyword",
                    "shared_keywords": sorted(list(shared_kw)[:5]),
                }
            )

    return matches


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Phase 2: Narrative matching")
    parser.add_argument("--repo-root", type=str, default=None)
    args = parser.parse_args()

    if args.repo_root:
        repo_root = Path(args.repo_root)
    else:
        script_dir = Path(__file__).resolve().parent
        repo_root = script_dir.parent
        if not (repo_root / "AGENTS.md").exists():
            for candidate in [
                Path("/home/mrkai/code/tspit"),
                Path.cwd(),
                Path.cwd().parent,
            ]:
                if (candidate / "AGENTS.md").exists():
                    repo_root = candidate
                    break

    print(f"Repo root: {repo_root}", file=sys.stderr)

    # Load inputs
    inventory_path = repo_root / "docs/internal/quote-inventory.yaml"
    pbp_path = repo_root / "docs/internal/play-by-play.yaml"

    if not inventory_path.exists():
        print(
            f"ERROR: {inventory_path} not found. Run narrative-inventory.py first.",
            file=sys.stderr,
        )
        sys.exit(1)
    if not pbp_path.exists():
        print(f"ERROR: {pbp_path} not found.", file=sys.stderr)
        sys.exit(1)

    with open(inventory_path, encoding="utf-8") as f:
        inventory = yaml.safe_load(f)
    with open(pbp_path, encoding="utf-8") as f:
        play_by_play = yaml.safe_load(f)

    # Build event index
    events = build_event_index(play_by_play)
    print(
        f"Event index: {len(events)} events across {len(play_by_play.get('arcs', []))} arcs",
        file=sys.stderr,
    )

    # Match each quote
    matched = []
    unmatched = []
    stats = {"exact-sd": 0, "date-keyword": 0, "unmatched": 0}

    for quote in inventory.get("quotes", []):
        # Phase 2a: exact SD match
        sd_matches = match_exact_sd(quote, events)
        # Phase 2b: date+keyword match
        dk_matches = match_date_keyword(quote, events)

        # Deduplicate: if an event matched by SD also matched by date-keyword,
        # keep only the SD match (higher confidence)
        sd_arc_ids = {m["arc_id"] for m in sd_matches}
        dk_matches = [m for m in dk_matches if m["arc_id"] not in sd_arc_ids]

        all_matches = sd_matches + dk_matches

        if all_matches:
            matched.append(
                {
                    "quote": quote,
                    "matches": all_matches,
                    "best_confidence": max(m["confidence"] for m in all_matches),
                }
            )
            for m in all_matches:
                stats[m["match_type"]] = stats.get(m["match_type"], 0) + 1
        else:
            unmatched.append(quote)
            stats["unmatched"] += 1

    # Sort matched by best confidence desc, then date
    matched.sort(key=lambda m: (-m["best_confidence"], m["quote"].get("datetime", "")))

    # Build output
    output = {
        "meta": {
            "generated": str(__import__("datetime").date.today()),
            "generator": "bin/narrative-match.py",
            "phase": "Phase 2 — Quote-to-Event Matching",
            "total_quotes": len(inventory.get("quotes", [])),
            "matched": len(matched),
            "unmatched": len(unmatched),
            "match_stats": stats,
            "note": "Phase 2c (semantic matching via LLM) not yet run. Unmatched quotes may gain matches in 2c.",
        },
        "matched": matched,
        "unmatched": unmatched,
    }

    out_path = repo_root / "docs/internal/matched-quotes.yaml"
    with open(out_path, "w", encoding="utf-8") as f:
        yaml.dump(
            output,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            width=120,
        )

    print(f"\nWritten to {out_path}", file=sys.stderr)
    print(f"\n--- MATCHING SUMMARY ---", file=sys.stderr)
    print(f"Total quotes: {len(inventory.get('quotes', []))}", file=sys.stderr)
    print(f"Matched: {len(matched)} ({stats})", file=sys.stderr)
    print(f"Unmatched: {len(unmatched)} (candidates for Phase 2c/4)", file=sys.stderr)


if __name__ == "__main__":
    main()
