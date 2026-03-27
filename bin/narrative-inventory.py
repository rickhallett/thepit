#!/usr/bin/env python3
"""
Phase 1: Narrative Inventory — Aggressive deterministic quote extraction.

v2: Dynamic extraction replaces handcrafted dictionary.
Optimises for yield. Data is cheap. Captain's time is not.

Parses ALL source files and extracts every verbatim passage, inline quote,
blockquote, fight card round (including "What it beat"), slopodar triggers,
and SD inline-quoted phrases.

Usage:
    python3 bin/narrative-inventory.py [--repo-root /path/to/tspit]

Output:
    docs/internal/quote-inventory.yaml
"""

import argparse
import hashlib
import re
import sys
from datetime import date
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# YAML representers
# ---------------------------------------------------------------------------


def str_representer(dumper, data):
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


yaml.add_representer(str, str_representer)


# ---------------------------------------------------------------------------
# Quote class
# ---------------------------------------------------------------------------


class Quote:
    def __init__(
        self,
        speaker,
        datetime_str,
        location,
        verbatim,
        quote_type,
        sd_refs=None,
        source_method="",
    ):
        self.speaker = speaker
        self.datetime = datetime_str
        self.location = location
        self.verbatim = verbatim.strip()
        self.type = quote_type
        self.sd_refs = sd_refs or []
        self.source_method = source_method
        self.content_hash = hashlib.sha256(self.verbatim.encode()).hexdigest()[:12]

    def to_dict(self):
        d = {
            "speaker": self.speaker,
            "datetime": self.datetime,
            "location": self.location,
            "verbatim": self.verbatim,
            "type": self.type,
            "content_hash": self.content_hash,
        }
        if self.sd_refs:
            d["sd_refs"] = self.sd_refs
        return d


SD_PATTERN = re.compile(r"SD-(\d+)")


def extract_sd_refs(text):
    return sorted(set(f"SD-{m}" for m in SD_PATTERN.findall(text)))


def sd_to_date(sd_num):
    """Approximate date from SD number."""
    if sd_num <= 60:
        return "2026-02-23"
    elif sd_num <= 136:
        return "2026-02-24"
    elif sd_num <= 168:
        return "2026-02-25"
    elif sd_num <= 194:
        return "2026-02-26"
    elif sd_num <= 228:
        return "2026-02-27"
    elif sd_num <= 242:
        return "2026-02-28"
    else:
        return "2026-03-01"


def classify_quote(text, speaker):
    text_lower = text.lower()
    if speaker == "Captain":
        if any(
            w in text_lower
            for w in [
                "standing order",
                "must",
                "shall",
                "no exceptions",
                "from here on",
                "all hands",
                "kill it",
                "ordered",
                "directing",
                "full steam",
            ]
        ):
            return "directive"
        if any(
            w in text_lower
            for w in [
                "i am not",
                "i have had",
                "i could not",
                "i don't know",
                "frankly",
                "between roles",
                "time of my life",
                "i don't think",
                "i am sure",
                "dogshit",
                "lightheaded",
                "not eaten",
                "mental health",
                "forgive myself",
                "unable to prove",
            ]
        ):
            return "vulnerability"
        if any(
            w in text_lower
            for w in [
                "i call it",
                "protocol",
                "named",
                "sweet spot",
                "fair wind",
                "category one",
                "learning in the wild",
                "the chain",
                "muster",
                "slopodar",
            ]
        ):
            return "named-moment"
        if any(
            w in text_lower
            for w in [
                "discovered",
                "found",
                "realise",
                "the map is not",
                "caught live",
                "first data point",
                "oracle",
            ]
        ):
            return "discovery"
        return "observation"
    elif speaker == "Weaver":
        if any(
            w in text_lower
            for w in [
                "we do not know",
                "cannot tell",
                "honest assessment",
                "the human won",
            ]
        ):
            return "observation"
        return "observation"
    else:
        return "observation"


# ---------------------------------------------------------------------------
# PARSER 1: session-decisions.md — DYNAMIC extraction
# ---------------------------------------------------------------------------


def parse_session_decisions_dynamic(repo_root):
    """Aggressively extract all quoted/verbatim passages from SD file."""
    path = repo_root / "docs/internal/session-decisions.md"
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")
    quotes = []
    rel_path = str(path.relative_to(repo_root))

    # Determine session date context from headers
    current_date = "2026-02-23"
    date_header_pattern = re.compile(r"^## (\d{4}-\d{2}-\d{2})")

    # Split into table rows by finding | SD-NNN | ... | patterns
    # Each row spans from one | SD- to the next
    sd_entry_pattern = re.compile(
        r"\| (SD-\d+) \| (.+?) \| (.+?) \| (.+?) \|", re.DOTALL
    )

    lines = text.split("\n")
    for i, line in enumerate(lines):
        # Track date context
        dm = date_header_pattern.match(line.strip())
        if dm:
            current_date = dm.group(1)

        # Extract SD table entries
        sd_match = sd_entry_pattern.search(line)
        if sd_match:
            sd_id = sd_match.group(1)
            decision_text = sd_match.group(2).strip()
            made_by = sd_match.group(3).strip()

            sd_num = int(SD_PATTERN.search(sd_id).group(1))
            dt = sd_to_date(sd_num)

            # Strategy 1: Extract explicit inline quotes (double-quoted phrases)
            inline_quotes = re.findall(r'"([^"]{15,})"', decision_text)
            for iq in inline_quotes:
                iq_clean = iq.strip()
                if len(iq_clean) < 15:
                    continue
                # Determine speaker from attribution
                speaker = "Captain"
                if "Analyst" in made_by and "Captain" not in made_by:
                    speaker = "Analyst"
                elif "Weaver" in made_by and "Captain" not in made_by:
                    speaker = "Weaver"
                elif "AnotherPair" in made_by and "Captain" not in made_by:
                    speaker = "AnotherPair"
                elif "Keel" in made_by and "Captain" not in made_by:
                    speaker = "Keel"

                quotes.append(
                    Quote(
                        speaker=speaker,
                        datetime_str=dt,
                        location=rel_path,
                        verbatim=iq_clean,
                        quote_type=classify_quote(iq_clean, speaker),
                        sd_refs=[sd_id],
                        source_method="sd-inline-quote",
                    )
                )

            # Strategy 2: Detect "verbatim" or "Captain's words" markers
            if any(
                marker in decision_text.lower()
                for marker in [
                    "verbatim",
                    "captain's words",
                    "captain:",
                    "captain's verbatim",
                ]
            ):
                # The whole description may contain the verbatim text
                # Extract the longest quoted segment
                verbatim_segments = re.findall(r'"([^"]{20,})"', decision_text)
                for vs in verbatim_segments:
                    # Already captured above, dedup handles it
                    pass

            # Strategy 3: Look for Captain's voice patterns in the decision text
            # (profanity, lowercase starts, British markers, raw emotional content)
            voice_markers = [
                r"\bfuck\w*\b",
                r"\bbollocks\b",
                r"\barse\b",
                r"\bshit\b",
                r"\bblimey\b",
                r"\bchaps\b",
                r"\bgentlemen\b",
                r"\bfrankly\b",
                r"\bbloody\b",
                r"\bblast\b",
                r"\bdog\s?shit\b",
            ]
            has_voice = any(
                re.search(p, decision_text, re.IGNORECASE) for p in voice_markers
            )

            # Also: passages starting with "Captain:" or after "Captain's" markers
            captain_direct = re.findall(
                r'Captain(?:\'s)?\s*(?:verbatim|words|order|observation|quote|position|reasoning|diagnosis|directive|assessment|ruling|correction)?:?\s*["\'](.+?)["\']',
                decision_text,
                re.DOTALL,
            )
            for cd in captain_direct:
                if len(cd.strip()) > 15:
                    quotes.append(
                        Quote(
                            speaker="Captain",
                            datetime_str=dt,
                            location=rel_path,
                            verbatim=cd.strip(),
                            quote_type=classify_quote(cd.strip(), "Captain"),
                            sd_refs=[sd_id],
                            source_method="sd-captain-direct",
                        )
                    )

    return quotes


# ---------------------------------------------------------------------------
# PARSER 2: Blockquote extractor (reused across many files)
# ---------------------------------------------------------------------------


def extract_blockquotes(repo_root, rel_path, default_date, split_paragraphs=True):
    """Extract markdown blockquotes. Optionally split large blocks into paragraphs."""
    path = repo_root / rel_path
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")
    quotes = []
    current_speaker = "Captain"
    in_block = False
    current_block = []

    for line in text.split("\n"):
        stripped = line.strip()

        # Detect speaker labels
        if re.match(r"\*\*Captain", stripped):
            current_speaker = "Captain"
        elif re.match(r"\*\*Weaver", stripped):
            current_speaker = "Weaver"
        elif re.match(r"\*\*Keel", stripped):
            current_speaker = "Keel"
        elif re.match(r"\*\*Analyst", stripped):
            current_speaker = "Analyst"
        elif re.match(r"\*\*AnotherPair", stripped):
            current_speaker = "AnotherPair"

        if stripped.startswith("> ") or stripped == ">":
            in_block = True
            content = stripped[2:] if stripped.startswith("> ") else ""
            current_block.append(content)
        elif in_block and stripped == "":
            current_block.append("")
        else:
            if in_block and current_block:
                _emit_block(
                    quotes,
                    current_block,
                    current_speaker,
                    default_date,
                    rel_path,
                    split_paragraphs,
                )
                current_block = []
                in_block = False

    # Flush
    if in_block and current_block:
        _emit_block(
            quotes,
            current_block,
            current_speaker,
            default_date,
            rel_path,
            split_paragraphs,
        )

    return quotes


def _emit_block(quotes, block_lines, speaker, dt, location, split_paragraphs):
    """Emit a blockquote, optionally splitting on double-newlines."""
    full_text = "\n".join(block_lines).strip()
    if not full_text or len(full_text) < 20:
        return

    if split_paragraphs and "\n\n" in full_text:
        # Split into paragraph-level quotes for higher resolution
        paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]
        for para in paragraphs:
            if len(para) >= 20:
                quotes.append(
                    Quote(
                        speaker=speaker,
                        datetime_str=dt,
                        location=location,
                        verbatim=para,
                        quote_type=classify_quote(para, speaker),
                        sd_refs=extract_sd_refs(para),
                        source_method="blockquote-paragraph",
                    )
                )
        # Also emit the full block as a composite
        if len(paragraphs) > 1:
            quotes.append(
                Quote(
                    speaker=speaker,
                    datetime_str=dt,
                    location=location,
                    verbatim=full_text,
                    quote_type=classify_quote(full_text, speaker),
                    sd_refs=extract_sd_refs(full_text),
                    source_method="blockquote-composite",
                )
            )
    else:
        quotes.append(
            Quote(
                speaker=speaker,
                datetime_str=dt,
                location=location,
                verbatim=full_text,
                quote_type=classify_quote(full_text, speaker),
                sd_refs=extract_sd_refs(full_text),
                source_method="blockquote",
            )
        )


# ---------------------------------------------------------------------------
# PARSER 3: Fight Card — ALL fields (words, what happened, what it beat)
# ---------------------------------------------------------------------------


def parse_fight_card(repo_root):
    """Extract ALL narrative content from the fight card."""
    path = repo_root / "docs/internal/weaver/fight-card-human-vs-sycophantic-drift.md"
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")
    quotes = []
    rel_path = str(path.relative_to(repo_root))

    round_pattern = re.compile(r"## Round (\d+) — (SD-\d+): (.+?)$", re.MULTILINE)
    round_starts = list(round_pattern.finditer(text))

    for i, match in enumerate(round_starts):
        round_num = match.group(1)
        sd_ref = match.group(2)
        title = match.group(3).strip()
        sd_num = int(SD_PATTERN.search(sd_ref).group(1))
        dt = sd_to_date(sd_num)

        start = match.end()
        end = round_starts[i + 1].start() if i + 1 < len(round_starts) else len(text)
        round_text = text[start:end]

        # Extract "Your/Her words" — Captain or Analyst quote
        words_match = re.search(
            r"\*\*(?:Your|Her|The) (?:words|constraint|position):\*\*\s*(.+?)(?=\n\n\*\*|\n##|\Z)",
            round_text,
            re.DOTALL,
        )
        if words_match:
            verbatim = words_match.group(1).strip()
            verbatim = re.sub(r'^["\']|["\']$', "", verbatim)
            speaker = "Analyst" if "Her words" in round_text[:200] else "Captain"
            quotes.append(
                Quote(
                    speaker=speaker,
                    datetime_str=dt,
                    location=rel_path,
                    verbatim=verbatim,
                    quote_type=classify_quote(verbatim, speaker),
                    sd_refs=[sd_ref],
                    source_method="fight-card-words",
                )
            )

        # Extract "What happened" — narrative context
        happened_match = re.search(
            r"\*\*What happened:\*\*\s*(.+?)(?=\n\n\*\*|\n##|\Z)", round_text, re.DOTALL
        )
        if happened_match:
            happened = happened_match.group(1).strip()
            if len(happened) > 30:
                quotes.append(
                    Quote(
                        speaker="Weaver",
                        datetime_str=dt,
                        location=rel_path,
                        verbatim=happened,
                        quote_type="observation",
                        sd_refs=[sd_ref],
                        source_method="fight-card-happened",
                    )
                )

        # Extract "What it beat" — the agent/system behavior that was corrected
        beat_match = re.search(
            r"\*\*What it beat:\*\*\s*(.+?)(?=\n\n\*\*|\n##|\Z)", round_text, re.DOTALL
        )
        if beat_match:
            beat_text = beat_match.group(1).strip()
            if len(beat_text) > 20:
                quotes.append(
                    Quote(
                        speaker="Weaver",
                        datetime_str=dt,
                        location=rel_path,
                        verbatim=beat_text,
                        quote_type="observation",
                        sd_refs=[sd_ref],
                        source_method="fight-card-beat",
                    )
                )

    # Extract the summary section
    summary_match = re.search(r"## Summary\s*\n\s*\n(.+?)$", text, re.DOTALL)
    if summary_match:
        summary = summary_match.group(1).strip()
        if summary:
            quotes.append(
                Quote(
                    speaker="Weaver",
                    datetime_str="2026-02-27",
                    location=rel_path,
                    verbatim=summary,
                    quote_type="observation",
                    sd_refs=extract_sd_refs(summary),
                    source_method="fight-card-summary",
                )
            )

    return quotes


# ---------------------------------------------------------------------------
# PARSER 4: Pearls
# ---------------------------------------------------------------------------


def parse_pearls(repo_root):
    path = repo_root / "docs/internal/pearls.md"
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")
    quotes = []
    rel_path = str(path.relative_to(repo_root))

    # Match > quoted lines followed by attribution
    pearl_blocks = re.findall(
        r'> "?(.+?)"?\s*\n\s*\n\s*— (\w+),\s*(.+?)(?:\n|$)', text, re.DOTALL
    )
    for verbatim, speaker, date_str in pearl_blocks:
        dt = "2026-02-24"
        if "24 Feb" in date_str:
            dt = "2026-02-24"
        elif "25 Feb" in date_str:
            dt = "2026-02-25"
        elif "26 Feb" in date_str:
            dt = "2026-02-26"

        quotes.append(
            Quote(
                speaker=speaker.strip(),
                datetime_str=dt,
                location=rel_path,
                verbatim=verbatim.strip(),
                quote_type="named-moment",
                sd_refs=extract_sd_refs(verbatim),
                source_method="pearls",
            )
        )

    return quotes


# ---------------------------------------------------------------------------
# PARSER 5: Strategic Challenge
# ---------------------------------------------------------------------------


def parse_strategic_challenge(repo_root):
    path = repo_root / "docs/internal/captain/strategic-challenge-001.md"
    if not path.exists():
        return []
    return extract_blockquotes(
        repo_root, str(path.relative_to(repo_root)), "2026-02-23", split_paragraphs=True
    )


# ---------------------------------------------------------------------------
# PARSER 6: Phasmid Analysis — key Weaver passages
# ---------------------------------------------------------------------------


def parse_phasmid(repo_root):
    path = (
        repo_root
        / "docs/internal/main-thread/2026-02-26-002-phasmid-analysis-review.md"
    )
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")
    quotes = []
    rel_path = str(path.relative_to(repo_root))

    # Extract standalone paragraphs that are clearly Weaver's analysis voice
    # (sections that start with bold or contain key phrases)
    key_passages = [
        r"The honest assessment is:.*?(?=\n\n##|\n\n###|\Z)",
        r"The Phasmid, taken seriously.*?(?=\n\n##|\n\n###|\Z)",
        r"The Captain can tell.*?(?=\n\n##|\n\n###|\Z)",
        r"The analysis is competent work.*?(?=\n\n##|\n\n###|\Z)",
        r"The analysis is confident.*?(?=\n\n##|\n\n###|\Z)",
        r"Filed by Weaver.*?(?=\n\n|\Z)",
        r"Calling it emergence.*?(?=\n\n|\Z)",
        r"The agents did not choose.*?(?=\n\n|\Z)",
        r"Nobody told the agents.*?(?=\n\n|\Z)",
        r"The § is Weaver's symbol.*?(?=\n\n|\Z)",
    ]
    for pattern in key_passages:
        for match in re.finditer(pattern, text, re.DOTALL):
            passage = match.group(0).strip()
            if len(passage) > 30:
                quotes.append(
                    Quote(
                        speaker="Weaver",
                        datetime_str="2026-02-26",
                        location=rel_path,
                        verbatim=passage,
                        quote_type="observation",
                        sd_refs=extract_sd_refs(passage),
                        source_method="phasmid-passage",
                    )
                )

    return quotes


# ---------------------------------------------------------------------------
# PARSER 7: Slopodar — ALL entries (triggers + descriptions)
# ---------------------------------------------------------------------------


def parse_slopodar(repo_root):
    path = repo_root / "slopodar.yaml"
    if not path.exists():
        return []

    rel_path = str(path.relative_to(repo_root))
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    quotes = []

    patterns = data.get("patterns", []) if isinstance(data, dict) else data
    if not isinstance(patterns, list):
        return []

    for entry in patterns:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name", "")
        trigger = entry.get("trigger", "")
        detected = str(entry.get("detected", "unknown"))
        description = entry.get("description", "")
        refs = entry.get("refs", [])
        sd_refs = []
        for ref in refs if isinstance(refs, list) else []:
            sd_refs.extend(extract_sd_refs(str(ref)))

        # The trigger is often a verbatim quote
        if trigger and len(trigger) > 15:
            quotes.append(
                Quote(
                    speaker="Captain",
                    datetime_str=detected,
                    location=rel_path,
                    verbatim=f'[Slopodar: {name}] Trigger: "{trigger}"',
                    quote_type="named-moment",
                    sd_refs=sd_refs,
                    source_method="slopodar-trigger",
                )
            )

        # Captain quote field if present
        captain_quote = entry.get("captain_quote", "")
        if captain_quote and len(captain_quote) > 15:
            quotes.append(
                Quote(
                    speaker="Captain",
                    datetime_str=detected,
                    location=rel_path,
                    verbatim=captain_quote,
                    quote_type="named-moment",
                    sd_refs=sd_refs,
                    source_method="slopodar-captain-quote",
                )
            )

    return quotes


# ---------------------------------------------------------------------------
# PARSER 8: Sextant (Captain's cognitive instruments)
# ---------------------------------------------------------------------------


def parse_sextant(repo_root):
    path = repo_root / "docs/internal/sextant.yaml"
    if not path.exists():
        return []

    rel_path = str(path.relative_to(repo_root))
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    quotes = []

    if isinstance(data, dict):
        entries = data.get("entries", data.get("instruments", []))
        if isinstance(entries, list):
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                provenance = entry.get("provenance", entry.get("lived_experience", ""))
                name = entry.get("name", entry.get("concept", ""))
                if provenance and len(str(provenance)) > 20:
                    quotes.append(
                        Quote(
                            speaker="Captain",
                            datetime_str="2026-03-01",
                            location=rel_path,
                            verbatim=f"[Sextant: {name}] {provenance}",
                            quote_type="discovery",
                            sd_refs=extract_sd_refs(str(entry)),
                            source_method="sextant-provenance",
                        )
                    )

    return quotes


# ---------------------------------------------------------------------------
# PARSER 9: Main Thread Logs (all files)
# ---------------------------------------------------------------------------


def parse_main_thread_logs(repo_root):
    mt_dir = repo_root / "docs/internal/main-thread"
    if not mt_dir.exists():
        return []

    quotes = []
    for f in sorted(mt_dir.glob("*.md")):
        date_match = re.match(r"(\d{4}-\d{2}-\d{2})", f.name)
        dt = date_match.group(1) if date_match else "unknown"
        rel_path = str(f.relative_to(repo_root))
        quotes.extend(
            extract_blockquotes(repo_root, rel_path, dt, split_paragraphs=True)
        )

    return quotes


# ---------------------------------------------------------------------------
# PARSER 10: Captain's Logs (all files in captainslog/)
# ---------------------------------------------------------------------------


def parse_captains_logs(repo_root):
    log_dir = repo_root / "docs/internal/captain/captainslog"
    if not log_dir.exists():
        return []

    quotes = []
    for f in sorted(log_dir.rglob("*.md")):
        date_match = re.search(r"(\d{4})/(\d{2})/(\d{2})", str(f))
        if date_match:
            dt = (
                f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)[:2]}"
            )
        else:
            dt = "unknown"
        rel_path = str(f.relative_to(repo_root))
        quotes.extend(
            extract_blockquotes(repo_root, rel_path, dt, split_paragraphs=True)
        )

    return quotes


# ---------------------------------------------------------------------------
# PARSER 11: Weaver internal docs (fight card, principles, etc.)
# ---------------------------------------------------------------------------


def parse_weaver_docs(repo_root):
    weaver_dir = repo_root / "docs/internal/weaver"
    if not weaver_dir.exists():
        return []

    quotes = []
    for f in sorted(weaver_dir.glob("*.md")):
        if "fight-card" in f.name:
            continue  # handled by dedicated parser
        date_match = re.search(r"(\d{4}-\d{2}-\d{2})", f.name)
        dt = date_match.group(1) if date_match else "2026-02-27"
        rel_path = str(f.relative_to(repo_root))

        # Extract blockquotes from all weaver docs
        quotes.extend(
            extract_blockquotes(repo_root, rel_path, dt, split_paragraphs=False)
        )

    return quotes


# ---------------------------------------------------------------------------
# PARSER 12: datetime-layer significance fields
# ---------------------------------------------------------------------------


def parse_datetime_layer_significance(repo_root):
    """Extract significance fields that contain Captain's voice."""
    path = repo_root / "docs/internal/play-by-play.yaml"
    if not path.exists():
        return []

    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    quotes = []
    rel_path = str(path.relative_to(repo_root))

    for arc in data.get("arcs", []):
        for event in arc.get("events", []):
            sig = event.get("significance", "")
            ev_date = event.get("date", "")
            sd_ref = event.get("sd", "")

            if not sig or len(sig) < 30:
                continue

            # Only extract significance fields with strong narrative voice
            voice_score = 0
            sig_lower = sig.lower()
            if any(
                w in sig_lower
                for w in [
                    "captain",
                    "human",
                    "honest",
                    "discovered",
                    "named",
                    "born",
                    "breaking point",
                    "confession",
                    "turning point",
                    "first time",
                ]
            ):
                voice_score += 1
            if any(w in sig for w in ["—", "…", ";"]):
                voice_score += 1

            if voice_score >= 1:
                quotes.append(
                    Quote(
                        speaker="Narrator",
                        datetime_str=str(ev_date),
                        location=rel_path,
                        verbatim=sig,
                        quote_type="observation",
                        sd_refs=extract_sd_refs(str(sd_ref) + " " + sig),
                        source_method="datetime-layer-significance",
                    )
                )

    return quotes


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------


def deduplicate(quotes):
    seen = {}
    for q in quotes:
        key = q.content_hash
        if key not in seen:
            seen[key] = q
        else:
            existing = seen[key]
            if len(q.sd_refs) > len(existing.sd_refs):
                seen[key] = q
    return list(seen.values())


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Phase 1 v2: Aggressive narrative inventory"
    )
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

    if not (repo_root / "AGENTS.md").exists():
        print(f"ERROR: Cannot find repo root. Tried {repo_root}", file=sys.stderr)
        sys.exit(1)

    print(f"Repo root: {repo_root}", file=sys.stderr)

    all_quotes = []
    parser_stats = {}

    def run_parser(name, fn, *fn_args):
        result = fn(*fn_args)
        parser_stats[name] = len(result)
        print(f"  {name}: {len(result)} quotes", file=sys.stderr)
        all_quotes.extend(result)

    print("Running 12 parsers...", file=sys.stderr)
    run_parser("session-decisions-dynamic", parse_session_decisions_dynamic, repo_root)
    run_parser("captains-logs", parse_captains_logs, repo_root)
    run_parser("fight-card", parse_fight_card, repo_root)
    run_parser("pearls", parse_pearls, repo_root)
    run_parser("main-thread-logs", parse_main_thread_logs, repo_root)
    run_parser("strategic-challenge", parse_strategic_challenge, repo_root)
    run_parser("phasmid-analysis", parse_phasmid, repo_root)
    run_parser("slopodar", parse_slopodar, repo_root)
    run_parser("sextant", parse_sextant, repo_root)
    run_parser("weaver-docs", parse_weaver_docs, repo_root)
    run_parser("datetime-significance", parse_datetime_layer_significance, repo_root)

    # Also parse the compaction event log
    comp_path = "docs/internal/main-thread/2026-02-25-005-compaction-event.md"
    if (repo_root / comp_path).exists():
        run_parser(
            "compaction-event",
            extract_blockquotes,
            repo_root,
            comp_path,
            "2026-02-25",
            True,
        )

    before_dedup = len(all_quotes)
    all_quotes = deduplicate(all_quotes)
    after_dedup = len(all_quotes)
    print(
        f"\nTotal raw: {before_dedup}, duplicates removed: {before_dedup - after_dedup}, unique: {after_dedup}",
        file=sys.stderr,
    )

    all_quotes.sort(key=lambda q: (q.datetime, q.speaker, q.content_hash))

    output = {
        "meta": {
            "generated": str(date.today()),
            "generator": "bin/narrative-inventory.py v2",
            "phase": "Phase 1 — Aggressive Deterministic Quote Inventory",
            "total_quotes": len(all_quotes),
            "parser_stats": parser_stats,
            "sources_parsed": sorted(set(q.location for q in all_quotes)),
            "speakers": sorted(set(q.speaker for q in all_quotes)),
            "type_distribution": {},
        },
        "quotes": [q.to_dict() for q in all_quotes],
    }

    for q in all_quotes:
        t = q.type
        output["meta"]["type_distribution"][t] = (
            output["meta"]["type_distribution"].get(t, 0) + 1
        )

    out_path = repo_root / "docs/internal/quote-inventory.yaml"
    out_path.parent.mkdir(parents=True, exist_ok=True)
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
    print(f"\n--- INVENTORY SUMMARY ---", file=sys.stderr)
    print(f"Total quotes: {len(all_quotes)}", file=sys.stderr)
    print(f"Speakers: {output['meta']['speakers']}", file=sys.stderr)
    print(f"Types: {output['meta']['type_distribution']}", file=sys.stderr)
    print(
        f"Date range: {all_quotes[0].datetime} to {all_quotes[-1].datetime}",
        file=sys.stderr,
    )
    print(f"\nPer-parser yield:", file=sys.stderr)
    for name, count in sorted(parser_stats.items(), key=lambda x: -x[1]):
        print(f"  {name}: {count}", file=sys.stderr)


if __name__ == "__main__":
    main()
