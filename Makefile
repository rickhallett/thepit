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

# ── Environment ───────────────────────────────────────────────
# Load .env if present (ANTHROPIC_API_KEY etc). Gitignored.
ifneq (,$(wildcard .env))
  include .env
  export
endif

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
	@echo "▶ Running steer test suite inside container..."
	@docker run --rm $(MIDGET_IMAGE) /opt/test-poc.sh
	@echo "▶ Running drive test suite inside container..."
	@docker run --rm $(MIDGET_IMAGE) /opt/test-drive.sh
	@echo "▶ Running OCR test suite inside container..."
	@docker run --rm $(MIDGET_IMAGE) /opt/test-ocr.sh
	@echo "▶ Running Chromium test suite inside container..."
	@docker run --rm $(MIDGET_IMAGE) /opt/test-chromium.sh
	@echo "▶ Running agent framework test suite inside container..."
	@docker run --rm $(MIDGET_IMAGE) /opt/test-agent.sh
	@echo "▶ Running job server test suite inside container..."
	@docker run --rm $(MIDGET_IMAGE) /opt/test-jobs.sh

# ── Interop ───────────────────────────────────────────────────
#
# C2: inter-container communication test.
# Runs on the HOST — orchestrates two containers sharing a Docker volume.
# Separate from gate (gate = single-container correctness).
# Run before darkcat in full gauntlet.

interop:
	@echo "▶ Inter-container communication (C2)"
	@bash tests/test-c2.sh

# ── Swarm ─────────────────────────────────────────────────────
#
# C3: multi-container orchestration test.
# Docker Compose: init service + N workers sharing a volume.
# Dispatches N jobs, workers process one each, results collected.
# Usage: make swarm N=3

N ?= 3

swarm:
	@echo "▶ Multi-container orchestration (C3) — N=$(N)"
	@N=$(N) bash tests/test-c3.sh

# ── Crew ──────────────────────────────────────────────────────
#
# C4: governance crew as physical agents.
# Deterministic test: proves mount constraints + orchestration plumbing.
# Live crew run: requires API keys, dispatches real LLM agents.
# Usage:
#   make crew-test            deterministic plumbing test (gate-safe)
#   make crew                 live LLM crew run (requires ANTHROPIC_API_KEY)

crew-test:
	@echo "▶ Governance crew plumbing (C4 — deterministic)"
	@bash tests/test-c4.sh

# ── Steer ─────────────────────────────────────────────────────
#
# Mid-flight steering tests. Tests both mechanisms:
#   - steer: infrastructure-enforced (stream-json pipe, Claude Code only)
#   - signal: prompt-based (instructions.md file poll, any model)
# Runs on HOST. Launches containers, writes steering messages, verifies.

steering:
	@echo "▶ Mid-flight steering tests"
	@bash tests/test-steer.sh

crew:
	@echo "▶ Live crew orchestration (cross-model, costs API calls)"
	@bash orchestrate.sh

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

all: A1 A2 A3 A4 A5 B1 B2 B3 B4 C1 C2 C3 C4

_done_mark = $(if $(wildcard $(DONE)/$(1)),✓,·)

status:
	@echo ""
	@echo "── Midgets Phase Status ──────────────────────────────"
	@echo ""
	@echo "Phase A — Agent in container"
	@printf "  %s A1  gate: build container + test-poc.sh\n"        "$(call _done_mark,A1)"
	@printf "  %s A2  terminal protocol: drive + tmux sentinel\n"   "$(call _done_mark,A2)"
	@printf "  %s A3  OCR: tesseract + steer see --ocr\n"           "$(call _done_mark,A3)"
	@printf "  %s A4  Chromium: headless browser\n"                 "$(call _done_mark,A4)"
	@printf "  %s A5  agent framework in container\n"               "$(call _done_mark,A5)"
	@echo ""
	@echo "Phase B — Governance adapted"
	@printf "  %s B1  SPEC.md\n"                                    "$(call _done_mark,B1)"
	@printf "  %s B2  Makefile rewrite for midgets\n"               "$(call _done_mark,B2)"
	@printf "  %s B3  gauntlet for containers\n"                    "$(call _done_mark,B3)"
	@printf "  %s B4  EVAL.md\n"                                    "$(call _done_mark,B4)"
	@echo ""
	@echo "Phase C — Multi-agent coordination"
	@printf "  %s C1  listen port: job server\n"                    "$(call _done_mark,C1)"
	@printf "  %s C2  inter-container communication\n"              "$(call _done_mark,C2)"
	@printf "  %s C3  multi-container orchestration\n"              "$(call _done_mark,C3)"
	@printf "  %s C4  governance crew as physical agents\n"         "$(call _done_mark,C4)"
	@echo ""
	@echo "──────────────────────────────────────────────────────"
	@echo ""

graph:
	@echo "Dependency Graph (← depends on)"
	@echo ""
	@echo "A1 gate"
	@echo "├── A2 terminal protocol"
	@echo "│   └── (A5)"
	@echo "├── A3 OCR"
	@echo "│   └── A4 chromium"
	@echo "│       └── A5 agent framework ←(A2+A3+A4)"
	@echo "│           ├── B3 gauntlet-containers ←(A5+B2)"
	@echo "│           │   └── C4 governance crew ←(C3+B3)"
	@echo "│           └── C1 job server"
	@echo "│               ├── C2 inter-container"
	@echo "│               │   └── C3 orchestration ←(C1+C2)"
	@echo "│               └── (C3)"
	@echo "├── B2 makefile ←(A1+B1)"
	@echo "│   └── (B3)"
	@echo "B1 SPEC.md"
	@echo "├── B2 (see above)"
	@echo "└── B4 EVAL.md"

# ── Agent Live Run ────────────────────────────────────────────
#
# Runs a real claude task inside the container.
# Requires ANTHROPIC_API_KEY to be set in the environment.
# Not part of the gate (non-deterministic, costs API calls).
# Usage: make agent-live TASK="clone repo X, run tests, report"

AGENT_TASK ?= Use drive to create a tmux session called 'work', run 'echo CLAUDE_INSIDE_MIDGET', capture the output with drive logs, then report back the exact output you saw.

agent-live:
	@if [ -z "$(ANTHROPIC_API_KEY)" ]; then \
		echo "ERROR: ANTHROPIC_API_KEY not set"; exit 1; \
	fi
	@echo "▶ Running live agent task inside midget container..."
	@echo "  Task: $(AGENT_TASK)"
	@docker run --rm \
		-e ANTHROPIC_API_KEY=$(ANTHROPIC_API_KEY) \
		-e DISPLAY=:99 \
		$(MIDGET_IMAGE) \
		bash -c 'Xvfb :99 -screen 0 1280x720x24 -ac & sleep 1; \
		         fluxbox -display :99 & sleep 1; \
		         claude -p "$(AGENT_TASK)" \
		           --dangerously-skip-permissions \
		           --allowedTools "Bash"'

.PHONY: agent-live

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

# ── Watch ─────────────────────────────────────────────────────
#
# View a midget's display via VNC. Starts a container with x11vnc
# exposed on localhost:5900, then opens a VNC viewer.
# Usage:
#   make watch                              interactive shell, VNC on :5900
#   make watch CMD="bash test-poc.sh"        run a command and watch
#   make watch ROLE=watchdog CMD="..."       show role name in VNC title

CMD ?=
ROLE ?=

watch:
	@echo "Starting midget with VNC on localhost:5900..."
	@if [ -z "$(CMD)" ]; then \
		echo "Interactive shell. Connect VNC viewer to localhost:5900"; \
		echo "Ctrl+C to stop."; \
		docker run --rm -it \
			--cpus 2 --memory 4g \
			-e MIDGET_VNC=1 \
			-e MIDGET_ROLE="$(ROLE)" \
			-p 5900:5900 \
			$(MIDGET_IMAGE); \
	else \
		CONTAINER_ID=$$(docker run -d \
			--cpus 2 --memory 4g \
			-e MIDGET_VNC=1 \
			-e MIDGET_ROLE="$(ROLE)" \
			-p 5900:5900 \
			$(MIDGET_IMAGE) \
			bash -c "$(CMD); echo 'CMD finished, container stays for VNC. Ctrl+C to stop.'; sleep infinity"); \
		echo "Container: $$CONTAINER_ID"; \
		echo "Connect VNC viewer to localhost:5900"; \
		echo "Ctrl+C to stop."; \
		echo ""; \
		trap "docker stop $$CONTAINER_ID >/dev/null 2>&1; docker rm $$CONTAINER_ID >/dev/null 2>&1" EXIT INT TERM; \
		docker logs -f $$CONTAINER_ID; \
	fi

.PHONY: all status graph clean install-hooks gate interop swarm crew-test crew watch
.PHONY: ebook ebook-prep ebook-epub ebook-slim ebook-slim-prep ebook-slim-epub ebook-all ebook-clean
.PHONY: darkcat darkcat-openai darkcat-gemini darkcat-all darkcat-synth darkcat-ref
.PHONY: gauntlet gauntlet-gate gauntlet-interop gauntlet-swarm gauntlet-crew gauntlet-pitkeel
