# ============================================================
# Calibration Run — Deterministic Build Orchestration
# ============================================================
#
# Modular Makefile. Three include files:
#   mk/polecats.mk  — 26 build tasks with dependency graph
#   mk/darkcat.mk   — adversarial review (DC-1/2/3, synth)
#   mk/gauntlet.mk  — full verification pipeline (gate → DCs → pitkeel)
#
# Usage:
#   make 07           # run task 07 (bout validation)
#   make 07 08 09     # run sequence
#   make all          # run everything (brave)
#   make status       # show which tasks have completed
#   make graph        # print dependency graph
#   make gauntlet     # full verification pipeline
#   make darkcat      # DC-1 adversarial review (Claude)
#   make darkcat-all  # DC pair (Claude + OpenAI)
#
# ============================================================

SHELL := /bin/bash
.ONESHELL:

# ── Shared Variables ──────────────────────────────────────────

DONE := .done
LOGS := .logs
MIDGET_IMAGE := midget-poc
POLECAT_TIMEOUT := 300

DARKCAT_PROMPT := scripts/darkcat.md
DARKCAT_SYNTH_PROMPT := scripts/darkcat-synth.md
DARKCAT_TIMEOUT := 180
PITCOMMIT := python3 scripts/pitcommit.py

# Identity: tree hash of staged content (solves the SHA paradox)
TREE := $(shell git write-tree 2>/dev/null | cut -c1-8)
TREE_FULL := $(shell git write-tree 2>/dev/null)
# SHA kept for display/ad-hoc use only
SHA := $(shell git rev-parse --short HEAD)

# ── Gate ─────────────────────────────────────────────────────
#
# Builds the midget container and runs test-poc.sh inside it.
# All 10 tests must pass. Exit 0 = green.

gate:
	@echo "▶ Building midget container..."
	@docker build -t $(MIDGET_IMAGE) . 2>&1
	@echo "▶ Running test suite inside container..."
	@docker run --rm $(MIDGET_IMAGE) /opt/test-poc.sh

# ── Polecat Wrapper ───────────────────────────────────────────
#
# Observable, permission-safe, timeout-guarded.
#   - --dangerously-skip-permissions: no permission hangs (trusted local sandbox)
#   - tee streams output live AND captures to .logs/
#   - timeout kills hung polecats
#   - delta detection catches noop runs
define POLECAT
	@TASK=$$(basename $(1) .md); \
	echo "▶ polecat $$TASK — streaming to $(LOGS)/$$TASK.log"; \
	PRE_HEAD=$$(git rev-parse HEAD); \
	PRE_DIFF=$$(git diff --stat); \
	PRE_UNTRACKED=$$(git ls-files --others --exclude-standard | sort); \
	timeout $(POLECAT_TIMEOUT) claude -p "$$(cat $(1))" \
		--dangerously-skip-permissions \
		2>&1 | tee $(LOGS)/$$TASK.log; \
	EXIT_CODE=$$?; \
	if [ $$EXIT_CODE -eq 124 ]; then \
		echo "ERROR: polecat $$TASK timed out after $(POLECAT_TIMEOUT)s"; exit 1; \
	fi; \
	if [ $$EXIT_CODE -ne 0 ]; then \
		echo "ERROR: polecat $$TASK exited with code $$EXIT_CODE"; exit 1; \
	fi; \
	POST_HEAD=$$(git rev-parse HEAD); \
	POST_DIFF=$$(git diff --stat); \
	POST_UNTRACKED=$$(git ls-files --others --exclude-standard | sort); \
	if [ "$$PRE_HEAD" = "$$POST_HEAD" ] \
		&& [ "$$PRE_DIFF" = "$$POST_DIFF" ] \
		&& [ "$$PRE_UNTRACKED" = "$$POST_UNTRACKED" ]; then \
		echo "ERROR: polecat $$TASK produced no delta — noop detected"; exit 1; \
	fi
endef

# Ensure directories exist
$(shell mkdir -p $(DONE) $(LOGS))

# ── Include Modules ───────────────────────────────────────────

include mk/polecats.mk
include mk/darkcat.mk
include mk/gauntlet.mk

# ── Meta Targets ──────────────────────────────────────────────

all: 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26

status:
	@echo "Completed tasks:"
	@ls -1 $(DONE)/ 2>/dev/null | sort -n || echo "  (none)"
	@echo ""
	@echo "Remaining:"
	@for i in $$(seq -w 1 26); do \
		[ ! -f $(DONE)/$$i ] && echo "  $$i — $$(head -1 plans/$$i-*.md 2>/dev/null | sed 's/^# //')"; \
	done

graph:
	@echo "Dependency Graph (→ means 'depends on')"
	@echo ""
	@echo "01 scaffold"
	@echo "└── 02 database"
	@echo "    ├── 03 clerk"
	@echo "    │   ├── 04 user-mirroring"
	@echo "    │   └── 05 api-utils"
	@echo "    │       ├── 06 presets"
	@echo "    │       │   └── 07 bout-validation"
	@echo "    │       │       └── 08 bout-turn-loop"
	@echo "    │       │           └── 09 bout-streaming"
	@echo "    │       │               └── 13 bout-persistence+credits ←(+10)"
	@echo "    │       │                   └── 14 useBout-hook"
	@echo "    │       │                       └── 15 bout-viewer"
	@echo "    │       │                           └── 16 arena-page"
	@echo "    │       ├── 10 credit-balance"
	@echo "    │       │   └── 11 credit-preauth"
	@echo "    │       │       └── 12 credit-catalog"
	@echo "    │       │           └── 17 tier-config"
	@echo "    │       │               └── 18 stripe-webhook"
	@echo "    │       │                   └── 19 stripe-checkout"
	@echo "    │       ├── 20 reactions"
	@echo "    │       │   └── 21 votes+leaderboard"
	@echo "    │       │       └── 22 short-links"
	@echo "    │       └── 23 agent-api"
	@echo "    │           └── 24 agent-pages"
	@echo "    └── 25 replay ←(15+22)"
	@echo "        └── 26 deploy"

install-hooks:
	@ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
	@ln -sf ../../scripts/prepare-commit-msg .git/hooks/prepare-commit-msg
	@echo "✓ Hooks installed: pre-commit, prepare-commit-msg"

clean:
	rm -rf $(DONE)
	@echo "All task completion markers cleared."

# ── Ebook Build ───────────────────────────────────────────────
#
# Builds "The Agentic Engineer: A Practitioner's Field Manual" v1.0
# Source: sites/oceanheart/content/bootcamp/*.md (51 chapters)
# Pipeline: bin/ebook-prep (stage) -> pandoc (convert) -> EPUB3
#
EBOOK_BUILD := build/ebook
EBOOK_OUT := $(EBOOK_BUILD)/the-agentic-engineer-v1.0.epub
EBOOK_CSS := assets/ebook.css

EBOOK_SLIM_BUILD := build/ebook-slim
EBOOK_SLIM_OUT := $(EBOOK_SLIM_BUILD)/the-agentic-engineer-v1.0-slim.epub

ebook: ebook-epub
	@echo ""
	@echo "EPUB (full): $(EBOOK_OUT)"
	@ls -lh $(EBOOK_OUT)

ebook-slim: ebook-slim-epub
	@echo ""
	@echo "EPUB (slim): $(EBOOK_SLIM_OUT)"
	@ls -lh $(EBOOK_SLIM_OUT)

ebook-all: ebook ebook-slim
	@echo ""
	@echo "Both editions built."

ebook-prep:
	@uv run bin/ebook-prep

ebook-slim-prep:
	@uv run bin/ebook-prep --edition slim

ebook-epub: ebook-prep
	@pandoc \
		--from markdown \
		--to epub3 \
		--metadata-file $(EBOOK_BUILD)/metadata.yaml \
		--toc \
		--toc-depth 2 \
		--split-level 1 \
		--css $(EBOOK_CSS) \
		-o $(EBOOK_OUT) \
		$$(cat $(EBOOK_BUILD)/manifest.txt)
	@echo "EPUB generated: $(EBOOK_OUT)"

ebook-slim-epub: ebook-slim-prep
	@pandoc \
		--from markdown \
		--to epub3 \
		--metadata-file $(EBOOK_SLIM_BUILD)/metadata.yaml \
		--toc \
		--toc-depth 2 \
		--split-level 1 \
		--css $(EBOOK_CSS) \
		-o $(EBOOK_SLIM_OUT) \
		$$(cat $(EBOOK_SLIM_BUILD)/manifest.txt)
	@echo "EPUB generated: $(EBOOK_SLIM_OUT)"

ebook-clean:
	rm -rf $(EBOOK_BUILD) $(EBOOK_SLIM_BUILD)
	@echo "Ebook build directories cleared."

.PHONY: all status graph clean install-hooks gate
.PHONY: ebook ebook-prep ebook-epub ebook-slim ebook-slim-prep ebook-slim-epub ebook-all ebook-clean
.PHONY: darkcat darkcat-openai darkcat-gemini darkcat-all darkcat-synth darkcat-ref
.PHONY: gauntlet gauntlet-gate gauntlet-pitkeel
.PHONY: 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
