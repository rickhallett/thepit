"""Codebase bundler — reads source files and assembles sections A-G.

Each section is a concatenation of all relevant files, with file paths as headers.
Token counting uses tiktoken (cl100k_base) as a proxy — close enough across models
for budget estimation purposes.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import tiktoken


@dataclass
class BundledSection:
    """A bundled codebase section ready for prompt injection."""

    section_id: str
    label: str
    content: str
    file_count: int
    token_count: int

    @property
    def summary(self) -> str:
        return (
            f"Section {self.section_id} ({self.label}): "
            f"{self.file_count} files, {self.token_count:,} tokens"
        )


# File extensions to include per section
_TS_EXTS = {".ts", ".tsx"}
_GO_EXTS = {".go"}
_CONFIG_EXTS = {".ts", ".json", ".js", ".mjs", ".yaml", ".yml", ".toml"}
_SQL_EXTS = {".sql"}
_ALL_CODE_EXTS = _TS_EXTS | _GO_EXTS | _CONFIG_EXTS | _SQL_EXTS

# Directories and files to always skip
_SKIP_DIRS = {
    "node_modules",
    ".next",
    ".git",
    ".vercel",
    "dist",
    "build",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "piteval",  # Don't evaluate ourselves
}
_SKIP_FILES = {
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    ".env",
    ".env.local",
    ".env.production",
}


def _should_skip(path: Path) -> bool:
    """Check if a path should be skipped."""
    for part in path.parts:
        if part in _SKIP_DIRS:
            return True
    if path.name in _SKIP_FILES:
        return True
    return bool(path.name.startswith(".") and path.name not in {".gitignore"})


def _collect_files(
    root: Path,
    subdirs: list[str],
    extensions: set[str],
    specific_files: list[str] | None = None,
) -> list[Path]:
    """Collect files from subdirectories matching extensions."""
    files: list[Path] = []

    # Specific files first
    if specific_files:
        for f in specific_files:
            p = root / f
            if p.exists() and not _should_skip(p):
                files.append(p)

    # Then walk subdirectories
    for subdir in subdirs:
        dir_path = root / subdir
        if not dir_path.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(dir_path):
            dp = Path(dirpath)
            # Prune skip dirs
            dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS]
            for fn in sorted(filenames):
                fp = dp / fn
                if _should_skip(fp):
                    continue
                if fp.suffix in extensions:
                    files.append(fp)

    return sorted(set(files))


def _read_file(path: Path) -> str:
    """Read a file, returning empty string on failure."""
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _format_bundle(root: Path, files: list[Path]) -> str:
    """Format files into a single bundle string with path headers."""
    parts: list[str] = []
    for fp in files:
        rel = fp.relative_to(root)
        content = _read_file(fp)
        if not content.strip():
            continue
        parts.append(f"--- {rel} ---\n{content}")
    return "\n\n".join(parts)


class Bundler:
    """Bundles the tspit codebase into sections A-G for evaluation."""

    def __init__(self, codebase_root: Path | str) -> None:
        self.root = Path(codebase_root).resolve()
        if not self.root.exists():
            raise FileNotFoundError(f"Codebase root not found: {self.root}")
        self._encoder = tiktoken.get_encoding("cl100k_base")
        self._cache: dict[str, BundledSection] = {}

    def count_tokens(self, text: str) -> int:
        """Count tokens using cl100k_base encoding."""
        return len(self._encoder.encode(text))

    def bundle_section(self, section_id: str) -> BundledSection:
        """Bundle a single section by ID (A-G)."""
        if section_id in self._cache:
            return self._cache[section_id]

        builder = _SECTION_BUILDERS.get(section_id.upper())
        if builder is None:
            raise ValueError(f"Unknown section: {section_id}. Valid: A-G")

        files = builder(self.root)
        content = _format_bundle(self.root, files)
        token_count = self.count_tokens(content)
        label = _SECTION_LABELS[section_id.upper()]

        section = BundledSection(
            section_id=section_id.upper(),
            label=label,
            content=content,
            file_count=len(files),
            token_count=token_count,
        )
        self._cache[section_id.upper()] = section
        return section

    def bundle_sections(self, section_ids: list[str]) -> list[BundledSection]:
        """Bundle multiple sections."""
        return [self.bundle_section(sid) for sid in section_ids]

    def bundle_all(self) -> list[BundledSection]:
        """Bundle all sections A-G."""
        return self.bundle_sections(list("ABCDEFG"))

    def total_tokens(self, section_ids: list[str] | None = None) -> int:
        """Get total token count across sections."""
        ids = section_ids or list("ABCDEFG")
        return sum(self.bundle_section(sid).token_count for sid in ids)

    def summary(self) -> str:
        """Print a summary of all sections."""
        sections = self.bundle_all()
        lines = ["Codebase Bundle Summary", "=" * 50]
        total = 0
        for s in sections:
            lines.append(s.summary)
            total += s.token_count
        lines.append("-" * 50)
        lines.append(f"Total: {sum(s.file_count for s in sections)} files, {total:,} tokens")
        return "\n".join(lines)


# --- Section builders ---
# Each returns a list of files for that section.


def _section_a(root: Path) -> list[Path]:
    """Section A: Core Library Layer — all files in lib/."""
    return _collect_files(root, ["lib"], _TS_EXTS)


def _section_b(root: Path) -> list[Path]:
    """Section B: API Routes & Server Actions."""
    files = _collect_files(root, ["app/api"], _TS_EXTS)
    # Also include server actions
    actions = root / "app" / "actions.ts"
    if actions.exists():
        files.append(actions)
    return sorted(set(files))


def _section_c(root: Path) -> list[Path]:
    """Section C: Frontend Components & Pages."""
    files = _collect_files(root, ["components"], _TS_EXTS)
    # Collect page.tsx and layout.tsx from app/
    app_dir = root / "app"
    if app_dir.exists():
        for dirpath, dirnames, filenames in os.walk(app_dir):
            dp = Path(dirpath)
            dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS and d != "api"]
            for fn in filenames:
                if fn in ("page.tsx", "layout.tsx", "loading.tsx", "error.tsx", "not-found.tsx"):
                    fp = dp / fn
                    if not _should_skip(fp):
                        files.append(fp)
    return sorted(set(files))


def _section_d(root: Path) -> list[Path]:
    """Section D: Test Suite — all test files."""
    return _collect_files(root, ["tests"], _TS_EXTS)


def _section_e(root: Path) -> list[Path]:
    """Section E: Configuration & Infrastructure."""
    specific = [
        "next.config.ts",
        "tsconfig.json",
        "vitest.config.ts",
        "playwright.config.ts",
        "middleware.ts",
        "package.json",
        ".gitignore",
        "tailwind.config.ts",
        "postcss.config.mjs",
        "drizzle.config.ts",
    ]
    files = _collect_files(root, [], _CONFIG_EXTS, specific_files=specific)
    # Also include drizzle config dir if present
    drizzle_dir = root / "drizzle"
    if drizzle_dir.exists():
        for fp in sorted(drizzle_dir.iterdir()):
            if fp.suffix in _CONFIG_EXTS and not _should_skip(fp):
                files.append(fp)
    return sorted(set(files))


def _section_f(root: Path) -> list[Path]:
    """Section F: Go CLI Tools."""
    go_dirs = [
        "pitctl",
        "pitforge",
        "pitlab",
        "pitlinear",
        "pitnet",
        "pitstorm",
        "pitbench",
        "shared",
    ]
    files = _collect_files(root, go_dirs, _GO_EXTS)
    # Include go.work if present
    gowork = root / "go.work"
    if gowork.exists():
        files.append(gowork)
    return sorted(set(files))


def _section_g(root: Path) -> list[Path]:
    """Section G: Database Schema & Migrations."""
    files: list[Path] = []
    # db/ directory
    files.extend(_collect_files(root, ["db"], _TS_EXTS))
    # drizzle schema and migrations
    drizzle_dir = root / "drizzle"
    if drizzle_dir.exists():
        for dirpath, _dirnames, filenames in os.walk(drizzle_dir):
            dp = Path(dirpath)
            for fn in sorted(filenames):
                fp = dp / fn
                if fp.suffix in (_TS_EXTS | _SQL_EXTS) and not _should_skip(fp):
                    files.append(fp)
    # Schema file in lib/ if it exists
    schema_lib = root / "lib" / "schema.ts"
    if schema_lib.exists():
        files.append(schema_lib)
    return sorted(set(files))


_SECTION_BUILDERS: dict[str, type[...] | object] = {
    "A": _section_a,
    "B": _section_b,
    "C": _section_c,
    "D": _section_d,
    "E": _section_e,
    "F": _section_f,
    "G": _section_g,
}

_SECTION_LABELS: dict[str, str] = {
    "A": "Core Library Layer (lib/)",
    "B": "API Routes & Server Actions",
    "C": "Frontend Components & Pages",
    "D": "Test Suite",
    "E": "Configuration & Infrastructure",
    "F": "Go CLI Tools",
    "G": "Database Schema & Migrations",
}
