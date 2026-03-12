#!/usr/bin/env python3
"""slopticopter — terminal-native slopodar explorer.

Usage:
  python3 scripts/slopticopter.py overview
  python3 scripts/slopticopter.py entry badguru
  python3 scripts/slopticopter.py severity
  python3 scripts/slopticopter.py domains
  python3 scripts/slopticopter.py timeline
  python3 scripts/slopticopter.py emdash
  python3 scripts/slopticopter.py selfcheck
  python3 scripts/slopticopter.py selfeat
  python3 scripts/slopticopter.py recal
  python3 scripts/slopticopter.py bloat
  python3 scripts/slopticopter.py refs
  python3 scripts/slopticopter.py similarity
  python3 scripts/slopticopter.py completeness
  python3 scripts/slopticopter.py all

Flags:
  --format table|json|yaml|md   Output format (default: table)
  --raw                         No ANSI colours
"""

import sys
import json
import re
from pathlib import Path
from collections import Counter, defaultdict
from difflib import SequenceMatcher

try:
    import yaml
except ImportError:
    print("pip install pyyaml", file=sys.stderr)
    sys.exit(1)

# ── load ──────────────────────────────────────────────────────────

SLOPODAR_PATH = Path(__file__).resolve().parent.parent / "slopodar.yaml"


def load():
    with open(SLOPODAR_PATH) as f:
        data = yaml.safe_load(f)
    return data.get("patterns", [])


# ── ANSI ──────────────────────────────────────────────────────────

NO_COLOR = "--raw" in sys.argv


def c(code, text):
    if NO_COLOR:
        return str(text)
    return f"\033[{code}m{text}\033[0m"


def dim(t):
    return c("2", t)


def bold(t):
    return c("1", t)


def red(t):
    return c("31", t)


def yellow(t):
    return c("33", t)


def green(t):
    return c("32", t)


def cyan(t):
    return c("36", t)


def mag(t):
    return c("35", t)


def sev_color(s):
    if s == "high":
        return red(s)
    if s == "medium":
        return yellow(s)
    return green(s)


# ── output formatters ────────────────────────────────────────────


def get_format():
    for i, a in enumerate(sys.argv):
        if a == "--format" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return "table"


def emit(data, headers=None, title=None):
    fmt = get_format()
    if fmt == "json":
        print(
            json.dumps(
                data
                if isinstance(data, (list, dict))
                else [dict(zip(headers, row)) for row in data]
                if headers
                else data,
                indent=2,
                default=str,
            )
        )
    elif fmt == "yaml":
        print(
            yaml.dump(
                data
                if isinstance(data, (list, dict))
                else [dict(zip(headers, row)) for row in data]
                if headers
                else data,
                default_flow_style=False,
                allow_unicode=True,
            )
        )
    elif fmt == "md":
        if title:
            print(f"## {title}\n")
        if (
            headers
            and isinstance(data, list)
            and data
            and isinstance(data[0], (list, tuple))
        ):
            print("| " + " | ".join(str(h) for h in headers) + " |")
            print("| " + " | ".join("---" for _ in headers) + " |")
            for row in data:
                print("| " + " | ".join(str(x) for x in row) + " |")
        else:
            print(yaml.dump(data, default_flow_style=False, allow_unicode=True))
    else:  # table
        if title:
            print(f"\n{bold(title)}")
            print("─" * min(len(title) + 4, 72))
        if (
            headers
            and isinstance(data, list)
            and data
            and isinstance(data[0], (list, tuple))
        ):
            widths = [
                max(len(str(h)), *(len(str(row[i])) for row in data))
                for i, h in enumerate(headers)
            ]
            hdr = "  ".join(str(h).ljust(w) for h, w in zip(headers, widths))
            print(dim(hdr))
            for row in data:
                cells = []
                for i, (val, w) in enumerate(zip(row, widths)):
                    s = str(val).ljust(w)
                    # colour severity column
                    if headers[i].lower() == "severity":
                        s = sev_color(str(val)).ljust(w + 9)  # ansi offset
                    cells.append(s)
                print("  ".join(cells))
        elif isinstance(data, dict):
            kw = max(len(str(k)) for k in data)
            for k, v in data.items():
                print(f"  {cyan(str(k).ljust(kw))}  {v}")
        print()


# ── em-dash counter ──────────────────────────────────────────────

EMDASH = "\u2014"  # —


def count_emdash(text):
    if not text:
        return 0
    return text.count(EMDASH)


def emdash_in_entry(e):
    total = 0
    for field in ["trigger", "description", "signal", "instead", "name"]:
        total += count_emdash(str(e.get(field, "")))
    for ref in e.get("refs", []):
        total += count_emdash(str(ref))
    return total


# ── text extraction ──────────────────────────────────────────────


def entry_text(e):
    """All prose from an entry, concatenated."""
    parts = []
    for field in ["description", "signal", "instead", "trigger"]:
        v = e.get(field, "")
        if v:
            parts.append(str(v))
    return " ".join(parts)


# ── pattern detectors ────────────────────────────────────────────
# Each detector returns a list of (field, finding) tuples.
# These are the algorithmically attackable heuristics.
# They are imperfect. That's why the Operator confirms.


def detect_emdash(text, field):
    """Em-dashes in prose."""
    n = text.count(EMDASH)
    if n:
        return [(field, f"{n} em-dash{'es' if n > 1 else ''}")]
    return []


def detect_epigrammatic_closure(text, field):
    """Short punchy abstract sentence at end of paragraph."""
    hits = []
    paragraphs = text.strip().split("\n")
    for para in paragraphs:
        sentences = re.split(r"(?<=[.!?])\s+", para.strip())
        if len(sentences) < 2:
            continue
        last = sentences[-1].strip()
        words = last.split()
        # short (3-8 words), ends with period, mostly abstract nouns / "is"
        if 3 <= len(words) <= 8 and last.endswith("."):
            # heuristic: contains "is" or "are" or "begins" or "creates"
            if re.search(
                r"\b(is|are|begins|creates|becomes|means|remains)\b", last, re.I
            ):
                hits.append((field, f'epigrammatic closure: "{last}"'))
    return hits


def detect_redundant_antithesis(text, field):
    """'not X, but Y' / 'not X -- Y' where negation adds nothing."""
    hits = []
    # match "not [word+], but [word+]" and "not [word+] — [word+]"
    for m in re.finditer(
        r"[Nn]ot\s+[\w\s]{2,30}(?:,\s*but|" + EMDASH + r")\s+[\w\s]{2,30}", text
    ):
        hits.append((field, f'redundant antithesis: "{m.group()[:60]}..."'))
    return hits


def detect_nominalisation(text, field):
    """Sentences with no human actor (no I/you/we/they/who/someone)."""
    hits = []
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    actor_pattern = re.compile(
        r"\b(I|you|we|they|he|she|who|someone|one|the operator|a human)\b", re.I
    )
    actorless_run = 0
    for s in sentences:
        if len(s.split()) < 6:
            continue
        if not actor_pattern.search(s):
            actorless_run += 1
        else:
            actorless_run = 0
        if actorless_run >= 3:
            hits.append(
                (field, f"3+ actorless sentences in sequence (nominalisation cascade)")
            )
            actorless_run = 0
    return hits


def detect_anadiplosis(text, field):
    """End of one clause repeated at start of next."""
    hits = []
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    for i in range(len(sentences) - 1):
        words_a = sentences[i].split()
        words_b = sentences[i + 1].split()
        if len(words_a) >= 2 and len(words_b) >= 2:
            # last 2 words of A == first 2 words of B (case insensitive)
            tail = " ".join(words_a[-2:]).lower().rstrip(".,;:!?")
            head = " ".join(words_b[:2]).lower().rstrip(".,;:!?")
            if tail == head and len(tail) > 4:
                hits.append((field, f'anadiplosis: "...{tail}. {head}..."'))
    return hits


def detect_tally_voice(text, field):
    """Numbers used as rhetorical authority."""
    hits = []
    # "N [nouns] mapped/across/covering/spanning N [nouns]"
    for m in re.finditer(
        r"\d+\s+\w+\s+(?:mapped|across|covering|spanning|into)\s+\d+\s+\w+", text
    ):
        hits.append((field, f'tally voice: "{m.group()}"'))
    return hits


def detect_significance_signpost(text, field):
    """'Here's why this matters' / 'The key insight' / 'What this means'"""
    hits = []
    for pat in [
        r"[Hh]ere'?s?\s+why\s+(?:this|it)\s+matters",
        r"[Tt]he\s+(?:key|real|important|crucial)\s+(?:insight|point|takeaway|lesson)",
        r"[Ww]hat\s+(?:this|it)\s+(?:means|tells\s+us|shows|reveals)",
        r"[Tt]he\s+uncomfortable\s+truth",
        r"[Tt]he\s+problem\s+nobody\s+talks\s+about",
    ]:
        for m in re.finditer(pat, text):
            hits.append((field, f'significance signpost: "{m.group()}"'))
    return hits


ALL_DETECTORS = [
    detect_emdash,
    detect_epigrammatic_closure,
    detect_redundant_antithesis,
    detect_nominalisation,
    detect_anadiplosis,
    detect_tally_voice,
    detect_significance_signpost,
]

PROSE_FIELDS = ["description", "signal", "instead"]


def run_detectors(entry, fields=None, detectors=None):
    """Run all detectors against specified fields of an entry."""
    if fields is None:
        fields = PROSE_FIELDS
    if detectors is None:
        detectors = ALL_DETECTORS
    findings = []
    for field in fields:
        text = str(entry.get(field, ""))
        if not text:
            continue
        for det in detectors:
            findings.extend(det(text, field))
    return findings


# ── commands ─────────────────────────────────────────────────────


def cmd_overview(patterns):
    total = len(patterns)
    field_entries = [e for e in patterns if not e.get("signal_strength")]
    mined_entries = [e for e in patterns if e.get("signal_strength")]
    sevs = Counter(e.get("severity", "unset") for e in patterns)
    domains = Counter(e.get("domain", "unset") for e in patterns)
    dates = sorted(set(e.get("detected", "?") for e in patterns))

    emit(
        {
            "total_entries": total,
            "field_caught": len(field_entries),
            "algorithmically_mined": len(mined_entries),
            "severity_high": sevs.get("high", 0),
            "severity_medium": sevs.get("medium", 0),
            "severity_low": sevs.get("low", 0),
            "domains": len(domains),
            "date_range": f"{dates[0]} to {dates[-1]}",
            "total_lines": SLOPODAR_PATH.stat().st_size,
            "total_refs": sum(len(e.get("refs", [])) for e in patterns),
            "entries_with_examples": sum(1 for e in patterns if e.get("examples")),
        },
        title="SLOPODAR OVERVIEW",
    )


def cmd_entry(patterns, entry_id):
    for e in patterns:
        if e["id"] == entry_id:
            fmt = get_format()
            if fmt in ("json", "yaml", "md"):
                emit(e, title=e.get("name", entry_id))
            else:
                print(f"\n{bold(e.get('name', entry_id))}  {dim(e['id'])}")
                print(f"  {dim('domain')}     {e.get('domain', '?')}")
                print(f"  {dim('detected')}   {e.get('detected', '?')}")
                print(f"  {dim('severity')}   {sev_color(e.get('severity', '?'))}")
                if e.get("signal_strength"):
                    print(f"  {dim('strength')}   {e.get('signal_strength')}")
                print(f"\n  {cyan('TRIGGER')}")
                for line in str(e.get("trigger", "")).strip().split("\n"):
                    print(f"    {line.strip()}")
                print(f"\n  {cyan('DESCRIPTION')}")
                for line in str(e.get("description", "")).strip().split("\n"):
                    print(f"    {line.strip()}")
                print(f"\n  {cyan('SIGNAL')}")
                for line in str(e.get("signal", "")).strip().split("\n"):
                    print(f"    {line.strip()}")
                print(f"\n  {cyan('INSTEAD')}")
                for line in str(e.get("instead", "")).strip().split("\n"):
                    print(f"    {line.strip()}")
                if e.get("refs"):
                    print(f"\n  {cyan('REFS')}")
                    for ref in e["refs"]:
                        print(f"    - {ref}")
                em = emdash_in_entry(e)
                if em:
                    print(f"\n  {yellow(f'EM-DASHES: {em}')}")
                print()
            return
    print(f"Entry '{entry_id}' not found.", file=sys.stderr)
    print(f"Available: {', '.join(e['id'] for e in patterns)}", file=sys.stderr)


def cmd_severity(patterns):
    sevs = Counter(e.get("severity", "unset") for e in patterns)
    rows = []
    for sev in ["high", "medium", "low", "unset"]:
        if sevs[sev]:
            pct = f"{sevs[sev] / len(patterns) * 100:.0f}%"
            bar = "█" * int(sevs[sev] / len(patterns) * 40)
            rows.append((sev, sevs[sev], pct, bar))
    emit(rows, ["severity", "count", "pct", "distribution"], "SEVERITY DISTRIBUTION")

    # per-domain severity
    domain_sev = defaultdict(lambda: Counter())
    for e in patterns:
        domain_sev[e.get("domain", "?")][e.get("severity", "?")] += 1
    rows2 = []
    for d in sorted(domain_sev):
        h = domain_sev[d].get("high", 0)
        m = domain_sev[d].get("medium", 0)
        lo = domain_sev[d].get("low", 0)
        rows2.append((d, h, m, lo, h + m + lo))
    rows2.sort(key=lambda r: r[4], reverse=True)
    emit(rows2, ["domain", "high", "med", "low", "total"], "SEVERITY BY DOMAIN")


def cmd_domains(patterns):
    domains = defaultdict(list)
    for e in patterns:
        domains[e.get("domain", "?")].append(e["id"])
    rows = [
        (d, len(ids), ", ".join(ids))
        for d, ids in sorted(domains.items(), key=lambda x: -len(x[1]))
    ]
    emit(rows, ["domain", "count", "entries"], "DOMAINS")


def cmd_timeline(patterns):
    by_date = defaultdict(list)
    for e in patterns:
        by_date[e.get("detected", "?")].append(e["id"])
    rows = [(d, len(ids), ", ".join(ids)) for d, ids in sorted(by_date.items())]
    emit(rows, ["date", "count", "entries"], "TIMELINE")


def cmd_emdash(patterns):
    rows = []
    for e in patterns:
        em = emdash_in_entry(e)
        if em > 0:
            rows.append((e["id"], em, e.get("domain", "?"), e.get("severity", "?")))
    rows.sort(key=lambda r: r[1], reverse=True)
    total = sum(r[1] for r in rows)
    emit(
        rows,
        ["entry", "em-dashes", "domain", "severity"],
        f"EM-DASH CENSUS (total: {total})",
    )

    clean = [e["id"] for e in patterns if emdash_in_entry(e) == 0]
    if clean:
        print(f"  {green('Clean entries:')} {', '.join(clean)}\n")


def cmd_selfcheck(patterns):
    """Run each entry's trigger against the full slopodar text."""
    full_text = ""
    for e in patterns:
        full_text += entry_text(e) + " "

    rows = []
    for e in patterns:
        trigger = str(e.get("trigger", ""))
        # extract quoted phrases from trigger
        quoted = re.findall(r'"([^"]+)"', trigger)
        # also try the first sentence if no quotes
        if not quoted:
            quoted = [trigger[:80]]

        hits = []
        for phrase in quoted:
            # search for phrase fragments (4+ word sequences) in other entries
            words = phrase.split()
            for i in range(len(words) - 3):
                fragment = " ".join(words[i : i + 4]).lower()
                for other in patterns:
                    if other["id"] == e["id"]:
                        continue
                    if fragment in entry_text(other).lower():
                        hits.append(f"{other['id']}")
                        break

        if hits:
            unique_hits = sorted(set(hits))
            rows.append((e["id"], e.get("name", ""), ", ".join(unique_hits[:5])))

    emit(
        rows,
        ["entry", "name", "trigger-echoes-in"],
        "SELF-CHECK: trigger phrases found in other entries",
    )


def cmd_refs(patterns):
    sd_refs = defaultdict(list)
    for e in patterns:
        for ref in e.get("refs", []):
            sds = re.findall(r"SD-(\d+)", str(ref))
            for sd in sds:
                sd_refs[f"SD-{sd}"].append(e["id"])

    rows = [
        (sd, len(entries), ", ".join(entries))
        for sd, entries in sorted(sd_refs.items(), key=lambda x: -len(x[1]))
    ]
    emit(
        rows[:20],
        ["SD", "count", "entries"],
        "MOST-REFERENCED SESSION DECISIONS (top 20)",
    )

    # orphan check
    orphans = [e["id"] for e in patterns if not e.get("refs")]
    if orphans:
        print(f"  {yellow('Entries with no refs:')} {', '.join(orphans)}\n")


def cmd_similarity(patterns):
    """Crude text similarity between entries."""
    texts = [(e["id"], entry_text(e)) for e in patterns]
    pairs = []
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            ratio = SequenceMatcher(
                None, texts[i][1].lower(), texts[j][1].lower()
            ).ratio()
            if ratio > 0.35:
                pairs.append((texts[i][0], texts[j][0], f"{ratio:.2f}"))
    pairs.sort(key=lambda p: p[2], reverse=True)
    emit(
        pairs[:20],
        ["entry_a", "entry_b", "similarity"],
        "TEXT SIMILARITY (>0.35, top 20)",
    )


def cmd_completeness(patterns):
    required = [
        "id",
        "name",
        "domain",
        "detected",
        "trigger",
        "description",
        "signal",
        "instead",
        "severity",
        "refs",
    ]
    rows = []
    for e in patterns:
        missing = [f for f in required if not e.get(f)]
        tbd = [f"{k}={v}" for k, v in e.items() if str(v).strip().upper() == "TBD"]
        if missing or tbd:
            rows.append(
                (
                    e["id"],
                    ", ".join(missing) if missing else "-",
                    ", ".join(tbd) if tbd else "-",
                )
            )
    if rows:
        emit(rows, ["entry", "missing_fields", "tbd_values"], "COMPLETENESS GAPS")
    else:
        print(f"\n{green('All entries have all required fields.')}\n")


def cmd_selfeat(patterns):
    """Does each entry's prose commit the patterns other entries describe?

    For each entry, run all detectors against its description, signal,
    and instead fields. Report what the slopodar's own text is doing
    that the slopodar says not to do.
    """
    rows = []
    detail = []
    for e in patterns:
        findings = run_detectors(e)
        if findings:
            # deduplicate by finding text
            seen = set()
            unique = []
            for field, finding in findings:
                key = f"{field}:{finding[:40]}"
                if key not in seen:
                    seen.add(key)
                    unique.append((field, finding))
            summary = "; ".join(f"{field}: {finding}" for field, finding in unique[:3])
            if len(unique) > 3:
                summary += f" (+{len(unique) - 3} more)"
            rows.append((e["id"], len(unique), summary))
            detail.append((e["id"], unique))

    rows.sort(key=lambda r: r[1], reverse=True)
    emit(
        rows,
        ["entry", "hits", "findings"],
        f"SELFEAT: slopodar eating its own tail ({sum(r[1] for r in rows)} total findings)",
    )

    # detailed per-entry breakdown for table format
    if get_format() == "table" and detail:
        print(f"\n{bold('DETAIL')}")
        print("─" * 72)
        detail.sort(key=lambda d: len(d[1]), reverse=True)
        for entry_id, findings in detail[:10]:
            print(f"  {cyan(entry_id)}")
            for field, finding in findings:
                print(f"    {dim(field.ljust(12))} {finding}")
            print()


def cmd_recal(patterns):
    """Propose severity recalibration based on 3 criteria.

    Blast radius:   high=cross-cutting/public, med=single-domain, low=cosmetic
    Frequency:      high=appears in >3 entries' refs or examples, med=2-3, low=1
    Detectability:  high=no automated detection, med=partial, low=fully automatable

    Proposed severity = max(blast, frequency, detectability)
    Then flag where proposed != current.
    """
    # build cross-reference frequency
    id_mentions = Counter()
    for e in patterns:
        text = entry_text(e)
        for other in patterns:
            if other["id"] == e["id"]:
                continue
            # check if this entry is mentioned in other entries
            if e["id"] in text or e.get("name", "").lower() in text.lower():
                id_mentions[e["id"]] += 1
        for ref in e.get("refs", []):
            for other in patterns:
                if other["id"] != e["id"] and other["id"] in str(ref):
                    id_mentions[other["id"]] += 1

    # detectability heuristic: if the pattern has a regex-expressible trigger, it's more detectable
    def estimate_detectability(e):
        trigger = str(e.get("trigger", ""))
        domain = e.get("domain", "")
        # prose-style patterns are partially detectable (em-dashes, epigrammatic closure)
        if domain == "prose-style":
            return "medium"
        # relationship-sycophancy: not automatable (requires intent analysis)
        if domain == "relationship-sycophancy":
            return "high"
        # governance-process: not automatable (requires context)
        if domain == "governance-process":
            return "high"
        # code/tests: partially automatable with static analysis
        if domain in ("code", "tests"):
            return "medium"
        # commit-workflow: detectable via git log patterns
        if domain == "commit-workflow":
            return "low"
        # analytical-measurement: requires human judgment
        if domain == "analytical-measurement":
            return "high"
        return "medium"

    def estimate_blast(e):
        domain = e.get("domain", "")
        # relationship-sycophancy, governance-process: cross-cutting
        if domain in (
            "relationship-sycophancy",
            "governance-process",
            "analytical-measurement",
        ):
            return "high"
        # prose-style: public-facing
        if domain == "prose-style":
            return "high"
        # code, tests: single-domain
        if domain in ("code", "tests"):
            return "medium"
        # commit-workflow: cosmetic to medium
        if domain == "commit-workflow":
            return "low"
        return "medium"

    def estimate_frequency(e):
        mentions = id_mentions.get(e["id"], 0)
        if mentions >= 3:
            return "high"
        if mentions >= 1:
            return "medium"
        return "low"

    SEV_RANK = {"high": 3, "medium": 2, "low": 1}
    RANK_SEV = {3: "high", 2: "medium", 1: "low"}

    rows = []
    changes = []
    for e in patterns:
        blast = estimate_blast(e)
        freq = estimate_frequency(e)
        detect = estimate_detectability(e)
        proposed_rank = max(SEV_RANK[blast], SEV_RANK[freq], SEV_RANK[detect])
        proposed = RANK_SEV[proposed_rank]
        current = e.get("severity", "?")
        changed = current != proposed
        rows.append(
            (e["id"], current, proposed, blast, freq, detect, "<<" if changed else "")
        )
        if changed:
            changes.append((e["id"], current, proposed))

    emit(
        rows,
        ["entry", "current", "proposed", "blast", "freq", "detect", "delta"],
        "SEVERITY RECALIBRATION PROPOSAL",
    )

    if changes:
        print(f"  {yellow(f'{len(changes)} entries would change:')}")
        for eid, cur, prop in changes:
            print(f"    {eid}: {sev_color(cur)} -> {sev_color(prop)}")
        print()
    else:
        print(f"  {green('No changes proposed.')}\n")


def cmd_bloat(patterns):
    """Word count distribution per field per entry. Flag outliers."""
    field_counts = defaultdict(list)  # field -> [(id, word_count)]
    entry_totals = []

    for e in patterns:
        total = 0
        for field in PROSE_FIELDS + ["trigger"]:
            text = str(e.get(field, ""))
            wc = len(text.split())
            field_counts[field].append((e["id"], wc))
            total += wc
        entry_totals.append(
            (e["id"], total, e.get("domain", "?"), e.get("severity", "?"))
        )

    # per-field stats
    print(f"\n{bold('FIELD WORD COUNT STATS')}")
    print("─" * 72)
    for field in PROSE_FIELDS + ["trigger"]:
        counts = [wc for _, wc in field_counts[field]]
        if not counts:
            continue
        avg = sum(counts) / len(counts)
        mn = min(counts)
        mx = max(counts)
        # find the entry with max
        max_entry = max(field_counts[field], key=lambda x: x[1])
        min_entry = min(field_counts[field], key=lambda x: x[1])
        print(
            f"  {cyan(field.ljust(14))} avg={avg:.0f}  min={mn} ({dim(min_entry[0])})  max={mx} ({dim(max_entry[0])})"
        )
    print()

    # total distribution, sorted by total (descending = bloat suspects)
    entry_totals.sort(key=lambda r: r[1], reverse=True)

    # calculate stats for flagging
    totals = [t[1] for t in entry_totals]
    avg_total = sum(totals) / len(totals)
    # flag entries > 1.5x average as bloat suspects
    bloat_threshold = avg_total * 1.5
    # flag entries < 0.5x average as thin suspects
    thin_threshold = avg_total * 0.5

    rows = []
    for eid, total, domain, sev in entry_totals:
        flag = ""
        if total > bloat_threshold:
            flag = "BLOAT?"
        elif total < thin_threshold:
            flag = "thin?"
        rows.append((eid, total, domain, sev, flag))

    emit(
        rows,
        ["entry", "words", "domain", "severity", "flag"],
        f"WORD COUNT DISTRIBUTION (avg={avg_total:.0f}, bloat>{bloat_threshold:.0f}, thin<{thin_threshold:.0f})",
    )

    # per-field bloat breakdown for top 5 bloatiest
    print(f"{bold('TOP 5 BLOAT BREAKDOWN')}")
    print("─" * 72)
    for eid, total, domain, sev in entry_totals[:5]:
        e = next(p for p in patterns if p["id"] == eid)
        parts = []
        for field in PROSE_FIELDS + ["trigger"]:
            wc = len(str(e.get(field, "")).split())
            bar = "█" * int(wc / total * 30) if total else ""
            parts.append(f"{field}={wc}")
        print(f"  {cyan(eid.ljust(28))} {total}w  {', '.join(parts)}")
    print()


def extract_mechanism(e):
    """First sentence of description = the mechanism."""
    desc = str(e.get("description", "")).strip()
    m = re.match(r"^(.+?\.)", desc)
    return m.group(1) if m else desc[:140]


def get_groupby():
    """Parse --by flag."""
    for i, a in enumerate(sys.argv):
        if a == "--by" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return "domain"


def entry_groupkey(e, by):
    """Extract grouping key from entry."""
    if by == "provenance":
        return "mined" if e.get("signal_strength") else "field-caught"
    if by == "severity":
        return e.get("severity", "?")
    if by == "detected":
        return str(e.get("detected", "?"))
    if by == "domain":
        return e.get("domain", "?")
    # allow arbitrary field
    return str(e.get(by, "?"))


def cmd_mechanisms(patterns):
    """One mechanism per entry, grouped.

    Usage:
      slopticopter mechanisms              # group by domain (default)
      slopticopter mechanisms --by severity
      slopticopter mechanisms --by provenance
      slopticopter mechanisms --by detected
      slopticopter mechanisms --by domain
    """
    by = get_groupby()
    groups = defaultdict(list)
    for e in patterns:
        key = entry_groupkey(e, by)
        groups[key].append(e)

    fmt = get_format()
    if fmt in ("json", "yaml"):
        out = {}
        for key in sorted(groups):
            out[key] = [
                {"id": e["id"], "mechanism": extract_mechanism(e)} for e in groups[key]
            ]
        emit(out, title=f"MECHANISMS — grouped by {by}")
        return

    if fmt == "md":
        print(f"## MECHANISMS — grouped by {by}\n")
        for key in sorted(groups):
            print(f"### {key} ({len(groups[key])})\n")
            for e in groups[key]:
                print(f"- **{e['id']}** — {extract_mechanism(e)}")
            print()
        return

    # table format — the one-screen view
    for key in sorted(groups):
        print(f"\n  {bold(key.upper())} ({len(groups[key])})")
        print("  " + "─" * 68)
        for e in groups[key]:
            eid = e["id"]
            mech = extract_mechanism(e)
            label = f"{eid:.<30s} {mech}"
            if len(label) > 100:
                label = label[:97] + "..."
            print(f"  {label}")
    print()


def cmd_all(patterns):
    cmd_overview(patterns)
    cmd_severity(patterns)
    cmd_domains(patterns)
    cmd_timeline(patterns)
    cmd_emdash(patterns)
    cmd_completeness(patterns)
    cmd_selfcheck(patterns)
    cmd_selfeat(patterns)
    cmd_recal(patterns)
    cmd_bloat(patterns)
    cmd_refs(patterns)
    cmd_similarity(patterns)


# ── main ─────────────────────────────────────────────────────────

COMMANDS = {
    "overview": cmd_overview,
    "severity": cmd_severity,
    "domains": cmd_domains,
    "timeline": cmd_timeline,
    "emdash": cmd_emdash,
    "selfcheck": cmd_selfcheck,
    "selfeat": cmd_selfeat,
    "recal": cmd_recal,
    "bloat": cmd_bloat,
    "refs": cmd_refs,
    "similarity": cmd_similarity,
    "completeness": cmd_completeness,
    "mechanisms": cmd_mechanisms,
    "all": cmd_all,
}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(0)

    cmd = args[0]
    patterns = load()

    if cmd == "entry":
        if len(args) < 2:
            # list all entries
            rows = [
                (
                    e["id"],
                    e.get("name", ""),
                    e.get("domain", ""),
                    e.get("severity", ""),
                    e.get("detected", ""),
                )
                for e in patterns
            ]
            emit(rows, ["id", "name", "domain", "severity", "detected"], "ALL ENTRIES")
        else:
            cmd_entry(patterns, args[1])
    elif cmd in COMMANDS:
        COMMANDS[cmd](patterns)
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        print(f"Available: {', '.join(sorted(COMMANDS))} | entry <id>", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
