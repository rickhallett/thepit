#!/usr/bin/env python3
"""
Phase 3: Narrative Assembly — Build the rooted forest.

Attaches high-confidence quotes to datetime-layer events.
Emits: narrative-layer.yaml, narrative-gaps.yaml, unmatched-queue.yaml

Usage:
    python3 bin/narrative-assemble.py [--repo-root /path/to/tspit]

Input:
    docs/internal/matched-quotes.yaml
    docs/internal/play-by-play.yaml

Output:
    docs/internal/narrative-layer.yaml
    docs/internal/narrative-gaps.yaml
    docs/internal/unmatched-queue.yaml
"""

import argparse
import re
import sys
from collections import defaultdict
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


def build_cross_refs(verbatim):
    """Extract SD-refs from quote text as potential cross-references."""
    return sorted(set(f"SD-{m}" for m in SD_PATTERN.findall(verbatim)))


def main():
    parser = argparse.ArgumentParser(description="Phase 3: Narrative assembly")
    parser.add_argument("--repo-root", type=str, default=None)
    parser.add_argument(
        "--min-confidence",
        type=float,
        default=0.8,
        help="Minimum confidence to auto-attach (default: 0.8)",
    )
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
    matched_path = repo_root / "docs/internal/matched-quotes.yaml"
    pbp_path = repo_root / "docs/internal/play-by-play.yaml"

    if not matched_path.exists():
        print(
            f"ERROR: {matched_path} not found. Run narrative-match.py first.",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(matched_path, encoding="utf-8") as f:
        matched_data = yaml.safe_load(f)
    with open(pbp_path, encoding="utf-8") as f:
        play_by_play = yaml.safe_load(f)

    # Build arc→event structure from datetime-layer
    arc_index = {}
    event_count = 0
    for arc in play_by_play.get("arcs", []):
        arc_id = arc.get("id", "unknown")
        arc_index[arc_id] = {
            "arc_id": arc_id,
            "name": arc.get("name", ""),
            "date_range": arc.get("date_range", ""),
            "events": [],
        }
        for event in arc.get("events", []):
            event_count += 1
            ev_text = event.get("event", "")
            ev_sd = event.get("sd", "")
            ev_date = event.get("date", "")

            # Build event key for matching
            sd_refs = set()
            for field in [ev_sd, ev_text, event.get("significance", "")]:
                sd_refs.update(f"SD-{m}" for m in SD_PATTERN.findall(str(field)))

            arc_index[arc_id]["events"].append(
                {
                    "date": ev_date,
                    "sd": ev_sd,
                    "event": ev_text,
                    "significance": event.get("significance", ""),
                    "sd_refs": sorted(sd_refs),
                    "quotes": [],  # will be filled
                }
            )

    # Attach quotes to events
    attached_count = 0
    low_confidence_queue = []

    for entry in matched_data.get("matched", []):
        quote = entry["quote"]
        matches = entry["matches"]

        # Find best match (highest confidence, prefer exact-sd)
        best = max(
            matches,
            key=lambda m: (m["confidence"], 1 if m["match_type"] == "exact-sd" else 0),
        )

        if best["confidence"] >= args.min_confidence:
            # Find the arc and attach
            target_arc = best["arc_id"]
            if target_arc in arc_index:
                # Find the best event within this arc
                target_event = find_best_event(
                    arc_index[target_arc]["events"], quote, best
                )
                if target_event is not None:
                    # Build the narrative quote entry
                    cross_refs = build_cross_refs(quote.get("verbatim", ""))
                    # Remove self-references (SD refs that are the event's own)
                    event_sds = set(target_event.get("sd_refs", []))
                    cross_refs = [r for r in cross_refs if r not in event_sds]

                    target_event["quotes"].append(
                        {
                            "speaker": quote.get("speaker", "unknown"),
                            "datetime": quote.get("datetime", ""),
                            "location": quote.get("location", ""),
                            "verbatim": quote.get("verbatim", ""),
                            "type": quote.get("type", "observation"),
                            "confidence": best["confidence"],
                            "match_type": best["match_type"],
                            "cross_refs": cross_refs if cross_refs else [],
                        }
                    )
                    attached_count += 1
                    continue

        # If we get here, it's low confidence
        low_confidence_queue.append(
            {
                "quote": quote,
                "best_match": best,
                "all_matches": matches,
            }
        )

    # Build narrative-layer output
    narrative_arcs = []
    gaps = []
    total_events_with_quotes = 0
    total_events_without = 0

    for arc_id in sorted(
        arc_index.keys(), key=lambda x: int(x.split("-")[1]) if "-" in x else 0
    ):
        arc = arc_index[arc_id]
        arc_entry = {
            "arc_ref": arc["arc_id"],
            "name": arc["name"],
            "date_range": arc["date_range"],
            "events": [],
        }

        arc_has_any_quotes = False
        for event in arc["events"]:
            ev_entry = {
                "date": event["date"],
                "event": event["event"],
            }
            if event.get("sd"):
                ev_entry["sd"] = event["sd"]

            if event["quotes"]:
                ev_entry["quotes"] = event["quotes"]
                arc_has_any_quotes = True
                total_events_with_quotes += 1
            else:
                total_events_without += 1

            arc_entry["events"].append(ev_entry)

        narrative_arcs.append(arc_entry)

        if not arc_has_any_quotes:
            gaps.append(
                {
                    "arc_ref": arc["arc_id"],
                    "name": arc["name"],
                    "date_range": arc["date_range"],
                    "event_count": len(arc["events"]),
                    "note": "No verbatim quotes attached to any event in this arc.",
                }
            )

    # Emit narrative-layer.yaml
    narrative_output = {
        "meta": {
            "generated": str(__import__("datetime").date.today()),
            "generator": "bin/narrative-assemble.py",
            "phase": "Phase 3 — Narrative Assembly",
            "min_confidence": args.min_confidence,
            "total_arcs": len(narrative_arcs),
            "events_with_quotes": total_events_with_quotes,
            "events_without_quotes": total_events_without,
            "quotes_attached": attached_count,
            "arcs_with_no_quotes": len(gaps),
        },
        "arcs": narrative_arcs,
    }

    out_narrative = repo_root / "docs/internal/narrative-layer.yaml"
    with open(out_narrative, "w", encoding="utf-8") as f:
        yaml.dump(
            narrative_output,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            width=120,
        )

    # Emit gaps report
    gaps_output = {
        "meta": {
            "generated": str(__import__("datetime").date.today()),
            "phase": "Phase 3 — Narrative Gaps",
            "total_gaps": len(gaps),
            "events_without_quotes": total_events_without,
            "note": "Arcs with zero quotes need Captain review. Individual events without quotes are normal for technical arcs.",
        },
        "arc_gaps": gaps,
    }

    out_gaps = repo_root / "docs/internal/narrative-gaps.yaml"
    with open(out_gaps, "w", encoding="utf-8") as f:
        yaml.dump(
            gaps_output,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            width=120,
        )

    # Emit unmatched queue (includes truly unmatched + low confidence)
    unmatched_all = matched_data.get("unmatched", []) + [
        item["quote"] for item in low_confidence_queue
    ]
    unmatched_output = {
        "meta": {
            "generated": str(__import__("datetime").date.today()),
            "phase": "Phase 3 — Unmatched Queue",
            "total_unmatched": len(unmatched_all),
            "note": "These quotes need Captain's mark: attach to an event, discard, or note 'no event exists'.",
        },
        "quotes": unmatched_all,
    }

    out_unmatched = repo_root / "docs/internal/unmatched-queue.yaml"
    with open(out_unmatched, "w", encoding="utf-8") as f:
        yaml.dump(
            unmatched_output,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            width=120,
        )

    # Summary
    print(f"\n--- ASSEMBLY SUMMARY ---", file=sys.stderr)
    print(f"Arcs: {len(narrative_arcs)}", file=sys.stderr)
    print(
        f"Events with quotes: {total_events_with_quotes} / {total_events_with_quotes + total_events_without}",
        file=sys.stderr,
    )
    print(f"Quotes attached: {attached_count}", file=sys.stderr)
    print(f"Arc-level gaps (zero quotes): {len(gaps)}", file=sys.stderr)
    print(f"Unmatched queue: {len(unmatched_all)}", file=sys.stderr)
    print(f"\nOutput files:", file=sys.stderr)
    print(f"  {out_narrative}", file=sys.stderr)
    print(f"  {out_gaps}", file=sys.stderr)
    print(f"  {out_unmatched}", file=sys.stderr)


def find_best_event(events, quote, match):
    """Find the best event within an arc to attach a quote to."""
    q_date = quote.get("datetime", "")
    q_sd_refs = set(quote.get("sd_refs", []))

    best_event = None
    best_score = -1

    for event in events:
        score = 0
        ev_sd_refs = set(event.get("sd_refs", []))

        # Exact SD overlap is strongest signal
        sd_overlap = len(q_sd_refs & ev_sd_refs)
        score += sd_overlap * 10

        # Date match
        if q_date == event.get("date", ""):
            score += 3

        # Keyword overlap in event text
        if match.get("shared_keywords"):
            ev_text_lower = event.get("event", "").lower()
            for kw in match["shared_keywords"]:
                if kw in ev_text_lower:
                    score += 1

        if score > best_score:
            best_score = score
            best_event = event

    return best_event


if __name__ == "__main__":
    main()
