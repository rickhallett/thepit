#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx"]
# ///
"""
Voice log — record, transcribe, collate, and manage Operator's audio logs.

Usage:
    uv run scripts/voice-log.py                    # record + auto-transcribe
    uv run scripts/voice-log.py --no-transcribe    # record only, skip transcription
    uv run scripts/voice-log.py --list             # list all recordings with status
    uv run scripts/voice-log.py --transcribe FILE  # transcribe a specific .wav file
    uv run scripts/voice-log.py --transcribe-all   # transcribe all untranscribed .wav files
    uv run scripts/voice-log.py --collate          # collate all transcripts into daily digest
    uv run scripts/voice-log.py --collate DATE     # collate transcripts for specific date (YYYY-MM-DD)
    uv run scripts/voice-log.py --gc               # list recordings eligible for garbage collection
    uv run scripts/voice-log.py --gc --confirm     # delete .wav files that have been transcribed

Naming convention:
    docs/operator/voice/{YYYY-MM-DD}/{HH-MM-SS}.wav          — raw audio
    docs/operator/voice/{YYYY-MM-DD}/{HH-MM-SS}.transcript   — plain text transcript
    docs/operator/voice/{YYYY-MM-DD}/digest.md                — collated daily digest

GC policy: .wav files are eligible for deletion once a .transcript file exists alongside them.
"""

import json
import os
import subprocess
import sys
import signal
import tempfile
from datetime import datetime
from pathlib import Path

import httpx

HULL_ROOT = Path(__file__).resolve().parent.parent / "docs" / "operator" / "voice"
DEVICE = "hw:0,0"  # TONOR TC30 — card 0, device 0
FORMAT = "S16_LE"
RATE = "44100"
CHANNELS = "1"

# Groq Whisper config
GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_MODEL = "whisper-large-v3"
GROQ_MAX_BYTES = 24 * 1024 * 1024  # 25MB limit, use 24MB for safety
CHUNK_DURATION_S = 120  # Whisper truncates long audio; chunk at 2 minutes


def get_groq_key() -> str:
    """Load GROQ_API_KEY from environment or .env file."""
    key = os.environ.get("GROQ_API_KEY")
    if key:
        return key
    # Walk up from script to find .env
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("GROQ_API_KEY="):
                return line.split("=", 1)[1].strip()
    print("ERROR: GROQ_API_KEY not found in environment or .env", file=sys.stderr)
    sys.exit(1)


def get_output_path() -> Path:
    """Generate timestamped output path: {YYYY-MM-DD}/{HH-MM-SS}.wav"""
    now = datetime.now()
    day_dir = HULL_ROOT / now.strftime("%Y-%m-%d")
    day_dir.mkdir(parents=True, exist_ok=True)
    filename = now.strftime("%H-%M-%S") + ".wav"
    return day_dir / filename


def transcript_path_for(wav_path: Path) -> Path:
    """Return the .transcript path that corresponds to a .wav file."""
    return wav_path.with_suffix(".transcript")


def has_transcript(wav_path: Path) -> bool:
    """Check if a .wav file has a corresponding .transcript."""
    return transcript_path_for(wav_path).exists()


def get_audio_duration(path: Path) -> float:
    """Get audio duration in seconds via ffprobe."""
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "quiet",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip())
    except (ValueError, AttributeError):
        # Fallback: estimate from file size for raw WAV
        return path.stat().st_size / (int(RATE) * 2 * int(CHANNELS))


def chunk_audio(wav_path: Path) -> list[Path]:
    """Split audio into CHUNK_DURATION_S MP3 chunks. Returns list of chunk paths."""
    tmpdir = Path(tempfile.mkdtemp(prefix="voice-log-"))
    result = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(wav_path),
            "-f",
            "segment",
            "-segment_time",
            str(CHUNK_DURATION_S),
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "4",
            str(tmpdir / "chunk_%03d.mp3"),
        ],
        capture_output=True,
    )
    if result.returncode != 0:
        print(f"  Chunking FAILED: {result.stderr.decode()}", file=sys.stderr)
        return []
    chunks = sorted(tmpdir.glob("chunk_*.mp3"))
    return chunks


def compress_to_mp3(wav_path: Path) -> Path | None:
    """Compress WAV to single MP3. Returns path or None on failure."""
    mp3_path = Path(tempfile.mktemp(suffix=".mp3"))
    result = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(wav_path),
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "4",
            str(mp3_path),
        ],
        capture_output=True,
    )
    if result.returncode != 0:
        print(f"  Compression FAILED: {result.stderr.decode()}", file=sys.stderr)
        return None
    return mp3_path


def transcribe_single(upload_path: Path, key: str) -> str:
    """Transcribe a single audio file via Groq Whisper API."""
    mime = "audio/mpeg" if upload_path.suffix == ".mp3" else "audio/wav"
    with open(upload_path, "rb") as f:
        response = httpx.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {key}"},
            files={"file": (upload_path.name, f, mime)},
            data={
                "model": GROQ_MODEL,
                "response_format": "text",
                "language": "en",
            },
            timeout=120.0,
        )
    if response.status_code != 200:
        print(f"FAILED ({response.status_code})")
        print(f"  {response.text}", file=sys.stderr)
        return ""
    return response.text.strip()


def transcribe(wav_path: Path) -> str:
    """Transcribe a .wav file, chunking if longer than CHUNK_DURATION_S."""
    key = get_groq_key()
    duration = get_audio_duration(wav_path)
    print(f"Transcribing: {wav_path.name} ({duration:.0f}s) ...", end=" ", flush=True)

    if duration <= CHUNK_DURATION_S + 10:
        # Short enough for single request — always compress to MP3 for consistency
        mp3 = compress_to_mp3(wav_path)
        if not mp3:
            return ""
        try:
            text = transcribe_single(mp3, key)
        finally:
            mp3.unlink(missing_ok=True)
        print(f"OK ({len(text)} chars)")
        return text

    # Long audio: chunk into CHUNK_DURATION_S segments
    print(
        f"\n  Chunking {duration:.0f}s into {CHUNK_DURATION_S}s segments ...",
        end=" ",
        flush=True,
    )
    chunks = chunk_audio(wav_path)
    if not chunks:
        return ""
    print(f"{len(chunks)} chunks")

    texts = []
    for i, chunk in enumerate(chunks):
        print(f"  Chunk {i + 1}/{len(chunks)} ...", end=" ", flush=True)
        text = transcribe_single(chunk, key)
        if text:
            print(f"OK ({len(text)} chars)")
            texts.append(text)
        else:
            print("FAILED")

    # Clean up temp directory
    for chunk in chunks:
        chunk.unlink(missing_ok=True)
    chunks[0].parent.rmdir()

    full_text = "\n\n".join(texts)
    print(f"  Total: {len(full_text)} chars from {len(texts)} chunks")
    return full_text


def transcribe_and_save(wav_path: Path) -> bool:
    """Transcribe a .wav file and save the transcript alongside it."""
    text = transcribe(wav_path)
    if not text:
        return False
    out = transcript_path_for(wav_path)
    out.write_text(text + "\n")
    print(f"  Saved: {out}")
    return True


def record(auto_transcribe: bool = True):
    """Record audio, optionally transcribe immediately after."""
    out = get_output_path()
    print(f"Recording to: {out}")
    print("Press Enter or Ctrl+C to stop.\n")

    proc = subprocess.Popen(
        ["arecord", "-D", DEVICE, "-f", FORMAT, "-r", RATE, "-c", CHANNELS, str(out)],
        stderr=subprocess.DEVNULL,
    )

    def stop(*_):
        proc.terminate()
        proc.wait()
        size_kb = out.stat().st_size / 1024
        duration_s = out.stat().st_size / (int(RATE) * 2 * int(CHANNELS))
        print(f"\nSaved: {out}")
        print(f"Size: {size_kb:.0f} KB | Duration: {duration_s:.1f}s")

        if auto_transcribe and duration_s > 0.5:
            print()
            transcribe_and_save(out)

        sys.exit(0)

    signal.signal(signal.SIGINT, stop)

    try:
        input()  # block until Enter
    except EOFError:
        pass
    stop()


def list_recordings():
    """List all recordings with transcription status."""
    if not HULL_ROOT.exists():
        print("No recordings yet.")
        return
    total_wav = 0
    total_transcribed = 0
    total_size = 0
    for day_dir in sorted(HULL_ROOT.iterdir()):
        if not day_dir.is_dir():
            continue
        files = sorted(day_dir.glob("*.wav"))
        if not files:
            continue
        print(f"\n{day_dir.name}:")
        for f in files:
            size_kb = f.stat().st_size / 1024
            duration_s = f.stat().st_size / (int(RATE) * 2 * int(CHANNELS))
            has_t = has_transcript(f)
            status = "✓ transcribed" if has_t else "○ raw"
            print(f"  {f.name}  ({size_kb:.0f} KB, {duration_s:.1f}s)  {status}")
            total_wav += 1
            total_size += f.stat().st_size
            if has_t:
                total_transcribed += 1
        # Show digest if it exists
        digest = day_dir / "digest.md"
        if digest.exists():
            print(f"  digest.md   (collated)")
    print(
        f"\nTotal: {total_wav} recordings, {total_transcribed} transcribed, "
        f"{total_size / (1024 * 1024):.1f} MB"
    )
    gc_eligible = total_transcribed
    if gc_eligible > 0:
        print(f"GC eligible: {gc_eligible} .wav files ({gc_eligible} have transcripts)")


def transcribe_all():
    """Transcribe all .wav files that don't yet have a .transcript."""
    if not HULL_ROOT.exists():
        print("No recordings yet.")
        return
    count = 0
    for day_dir in sorted(HULL_ROOT.iterdir()):
        if not day_dir.is_dir():
            continue
        for wav in sorted(day_dir.glob("*.wav")):
            if not has_transcript(wav):
                if transcribe_and_save(wav):
                    count += 1
    if count == 0:
        print("All recordings already transcribed.")
    else:
        print(f"\nTranscribed {count} recording(s).")


def collate(target_date: str | None = None):
    """Collate transcripts into a daily digest.md."""
    if not HULL_ROOT.exists():
        print("No recordings yet.")
        return

    dirs = []
    if target_date:
        d = HULL_ROOT / target_date
        if not d.exists():
            print(f"No recordings for {target_date}")
            return
        dirs = [d]
    else:
        dirs = sorted(d for d in HULL_ROOT.iterdir() if d.is_dir())

    for day_dir in dirs:
        transcripts = sorted(day_dir.glob("*.transcript"))
        if not transcripts:
            continue

        date_str = day_dir.name
        lines = [f"# Voice Log — {date_str}\n"]
        for t in transcripts:
            time_str = t.stem.replace("-", ":")
            text = t.read_text().strip()
            lines.append(f"\n## {time_str}\n")
            lines.append(f"{text}\n")

        digest_path = day_dir / "digest.md"
        digest_path.write_text("\n".join(lines) + "\n")
        print(f"Collated {len(transcripts)} transcript(s) → {digest_path}")


def gc(confirm: bool = False):
    """Garbage collect .wav files that have been transcribed."""
    if not HULL_ROOT.exists():
        print("No recordings yet.")
        return
    eligible = []
    for day_dir in sorted(HULL_ROOT.iterdir()):
        if not day_dir.is_dir():
            continue
        for wav in sorted(day_dir.glob("*.wav")):
            if has_transcript(wav):
                eligible.append(wav)

    if not eligible:
        print("No .wav files eligible for GC (all untranscribed or none exist).")
        return

    total_size = sum(f.stat().st_size for f in eligible)
    print(
        f"GC eligible: {len(eligible)} .wav files ({total_size / (1024 * 1024):.1f} MB)"
    )

    if not confirm:
        print("\nFiles that would be deleted:")
        for f in eligible:
            print(f"  {f.relative_to(HULL_ROOT)}")
        print(f"\nRun with --gc --confirm to delete.")
        return

    for f in eligible:
        print(f"  Deleting: {f.relative_to(HULL_ROOT)}")
        f.unlink()

    print(
        f"\nDeleted {len(eligible)} file(s), freed {total_size / (1024 * 1024):.1f} MB."
    )

    # Clean up empty day directories
    for day_dir in sorted(HULL_ROOT.iterdir()):
        if day_dir.is_dir() and not any(day_dir.iterdir()):
            day_dir.rmdir()
            print(f"  Removed empty directory: {day_dir.name}")


if __name__ == "__main__":
    args = sys.argv[1:]

    if "--list" in args:
        list_recordings()
    elif "--transcribe-all" in args:
        transcribe_all()
    elif "--transcribe" in args:
        idx = args.index("--transcribe")
        if idx + 1 < len(args):
            target = Path(args[idx + 1])
            if not target.is_absolute():
                target = Path.cwd() / target
            if not target.exists():
                print(f"File not found: {target}", file=sys.stderr)
                sys.exit(1)
            transcribe_and_save(target)
        else:
            print("Usage: --transcribe FILE", file=sys.stderr)
            sys.exit(1)
    elif "--collate" in args:
        idx = args.index("--collate")
        target_date = args[idx + 1] if idx + 1 < len(args) else None
        collate(target_date)
    elif "--gc" in args:
        gc(confirm="--confirm" in args)
    elif "--no-transcribe" in args:
        record(auto_transcribe=False)
    else:
        record(auto_transcribe=True)
