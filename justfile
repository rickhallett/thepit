# ============================================================
# The Pit - Build Orchestration
# ============================================================
#
# Ported from Makefile. All targets preserve identical behaviour.
#
# Usage:
#   just gate              run container test suite
#   just darkcat           DC-1 adversarial review (Claude)
#   just darkcat-all       DC pair (Claude + OpenAI)
#   just gauntlet          full verification pipeline
#   just gauntlet docs     docs tier (gate + pitkeel only)
#   just status            show which tasks have completed
#   just graph             print dependency graph
#
# ============================================================

set shell := ["bash", "-euo", "pipefail", "-c"]
set dotenv-load := true

# ── Variables ────────────────────────────────────────────────

done_dir := ".done"
logs_dir := ".logs"
midget_image := "midget-poc"
polecat_timeout := "300"
darkcat_prompt := "scripts/darkcat.md"
darkcat_synth_prompt := "scripts/darkcat-synth.md"
darkcat_timeout := "180"
pitcommit := "python3 scripts/pitcommit.py"

# Identity: tree hash of staged content (solves the SHA paradox)

tree := `git write-tree 2>/dev/null | cut -c1-8`
tree_full := `git write-tree 2>/dev/null`
sha := `git rev-parse --short HEAD`

# ── Setup ────────────────────────────────────────────────────

[private]
setup:
    mkdir -p {{ done_dir }} {{ logs_dir }}

# ── Gate ─────────────────────────────────────────────────────
#
# Builds the midget container and runs test suites inside it.
# All tests must pass. Exit 0 = green.

gate: setup
    @echo ">> Building midget container..."
    docker build -t {{ midget_image }} . 2>&1
    @echo ">> Running steer test suite inside container..."
    docker run --rm {{ midget_image }} /opt/test-poc.sh
    @echo ">> Running drive test suite inside container..."
    docker run --rm {{ midget_image }} /opt/test-drive.sh
    @echo ">> Running OCR test suite inside container..."
    docker run --rm {{ midget_image }} /opt/test-ocr.sh
    @echo ">> Running Chromium test suite inside container..."
    docker run --rm {{ midget_image }} /opt/test-chromium.sh
    @echo ">> Running agent framework test suite inside container..."
    docker run --rm {{ midget_image }} /opt/test-agent.sh
    @echo ">> Running job server test suite inside container..."
    docker run --rm {{ midget_image }} /opt/test-jobs.sh

# ── Interop ──────────────────────────────────────────────────
#
# C2: inter-container communication test.

interop: setup
    @echo ">> Inter-container communication (C2)"
    bash tests/test-c2.sh

# ── Swarm ────────────────────────────────────────────────────
#
# C3: multi-container orchestration test.

swarm n="3": setup
    @echo ">> Multi-container orchestration (C3) - N={{ n }}"
    N={{ n }} bash tests/test-c3.sh

# ── Crew ─────────────────────────────────────────────────────
#
# C4: governance crew as physical agents.

crew-test: setup
    @echo ">> Governance crew plumbing (C4 - deterministic)"
    bash tests/test-c4.sh

steering: setup
    @echo ">> Mid-flight steering tests (deterministic)"
    bash tests/test-steer.sh

steering-live: setup
    @echo ">> Live steering tests (costs API tokens, requires ANTHROPIC_API_KEY)"
    bash tests/test-steer-live.sh

crew: setup
    @echo ">> Live crew orchestration (cross-model, costs API calls)"
    bash orchestrate.sh

# ── Polecat Wrapper ──────────────────────────────────────────
#
# Observable, permission-safe, timeout-guarded.

[private]
polecat planfile: setup
    #!/usr/bin/env bash
    set -euo pipefail
    TASK=$(basename {{ planfile }} .md)
    echo ">> polecat $TASK - streaming to {{ logs_dir }}/$TASK.log"
    PRE_HEAD=$(git rev-parse HEAD)
    PRE_DIFF=$(git diff --stat)
    PRE_UNTRACKED=$(git ls-files --others --exclude-standard | sort)
    timeout {{ polecat_timeout }} claude -p "$(cat {{ planfile }})" \
        --dangerously-skip-permissions \
        2>&1 | tee {{ logs_dir }}/$TASK.log
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        echo "ERROR: polecat $TASK timed out after {{ polecat_timeout }}s"; exit 1
    fi
    if [ $EXIT_CODE -ne 0 ]; then
        echo "ERROR: polecat $TASK exited with code $EXIT_CODE"; exit 1
    fi
    POST_HEAD=$(git rev-parse HEAD)
    POST_DIFF=$(git diff --stat)
    POST_UNTRACKED=$(git ls-files --others --exclude-standard | sort)
    if [ "$PRE_HEAD" = "$POST_HEAD" ] \
        && [ "$PRE_DIFF" = "$POST_DIFF" ] \
        && [ "$PRE_UNTRACKED" = "$POST_UNTRACKED" ]; then
        echo "ERROR: polecat $TASK produced no delta - noop detected"; exit 1
    fi

# ── Phase Tasks ──────────────────────────────────────────────
#
# Phase A: agent operating inside the container
# Phase B: governance adapted for midgets
# Phase C: multi-agent coordination
#
# Note: justfile does not support file-based prerequisites like Make.
# Dependency checking is done via test -f on the .done marker files.

[private]
require-done task:
    @test -f {{ done_dir }}/{{ task }} || (echo "ERROR: {{ task }} not complete. Run 'just {{ task }}' first." && exit 1)

a1: gate
    touch {{ done_dir }}/A1
    @echo "A1 gate green"

a2: (require-done "A1") gate
    touch {{ done_dir }}/A2
    @echo "A2 gate green"

a3: (require-done "A1") gate
    touch {{ done_dir }}/A3
    @echo "A3 gate green"

a4: (require-done "A1") (require-done "A3") gate
    touch {{ done_dir }}/A4
    @echo "A4 gate green"

a5: (require-done "A2") (require-done "A3") (require-done "A4") gate
    touch {{ done_dir }}/A5
    @echo "A5 gate green"

b1:
    touch {{ done_dir }}/B1
    @echo "B1 complete (SPEC.md exists)"

b2: (require-done "A1") (require-done "B1")
    touch {{ done_dir }}/B2
    @echo "B2 complete"

b3: (require-done "A5") (require-done "B2") gate
    touch {{ done_dir }}/B3
    @echo "B3 gate green"

b4: (require-done "B1")
    touch {{ done_dir }}/B4
    @echo "B4 complete (EVAL.md exists)"

c1: (require-done "A5") gate
    touch {{ done_dir }}/C1
    @echo "C1 gate green"

c2: (require-done "C1") gate
    touch {{ done_dir }}/C2
    @echo "C2 gate green"

c3: (require-done "C1") (require-done "C2") gate
    touch {{ done_dir }}/C3
    @echo "C3 gate green"

c4: (require-done "C3") (require-done "B3") gate
    touch {{ done_dir }}/C4
    @echo "C4 gate green - thesis proven"

all: a1 a2 a3 a4 a5 b1 b2 b3 b4 c1 c2 c3 c4

# ── Darkcat - Adversarial Review Pipeline ────────────────────

# DC-1: Claude
darkcat: setup
    @echo ">> DC-1 (Claude) - {{ tree }}"
    timeout {{ darkcat_timeout }} claude -p "$(cat {{ darkcat_prompt }})" \
        --allowedTools "Bash(git:*) Read" \
        > {{ logs_dir }}/dc-{{ tree }}-claude.log 2>&1
    @echo "  -> {{ logs_dir }}/dc-{{ tree }}-claude.log"
    grep -E '^[#]{3} \[SEVERITY' {{ logs_dir }}/dc-{{ tree }}-claude.log | sed 's/^[#]*/   /' || true
    grep -E '^(Findings:|Verdict:)' {{ logs_dir }}/dc-{{ tree }}-claude.log | sed 's/^/  /' || true
    {{ pitcommit }} attest dc-claude --tree {{ tree_full }} --log {{ logs_dir }}/dc-{{ tree }}-claude.log

# DC-2: OpenAI (Codex)
darkcat-openai: setup
    @echo ">> DC-2 (OpenAI) - {{ tree }}"
    timeout {{ darkcat_timeout }} codex exec --sandbox read-only \
        "$(cat {{ darkcat_prompt }})" \
        > {{ logs_dir }}/dc-{{ tree }}-openai.log 2>&1
    @echo "  -> {{ logs_dir }}/dc-{{ tree }}-openai.log"
    grep -E '^[#]{3} \[SEVERITY' {{ logs_dir }}/dc-{{ tree }}-openai.log | sed 's/^[#]*/   /' || true
    grep -E '^(Findings:|Verdict:)' {{ logs_dir }}/dc-{{ tree }}-openai.log | sed 's/^/  /' || true
    {{ pitcommit }} attest dc-openai --tree {{ tree_full }} --log {{ logs_dir }}/dc-{{ tree }}-openai.log

# DC-3: Gemini
darkcat-gemini: setup
    @echo ">> DC-3 (Gemini) - {{ tree }}"
    timeout {{ darkcat_timeout }} gemini -y -p \
        "$(cat {{ darkcat_prompt }})" \
        > {{ logs_dir }}/dc-{{ tree }}-gemini.log 2>&1
    @echo "  -> {{ logs_dir }}/dc-{{ tree }}-gemini.log"
    grep -E '^[#]{3} \[SEVERITY' {{ logs_dir }}/dc-{{ tree }}-gemini.log | sed 's/^[#]*/   /' || true
    grep -E '^(Findings:|Verdict:)' {{ logs_dir }}/dc-{{ tree }}-gemini.log | sed 's/^/  /' || true
    {{ pitcommit }} attest dc-gemini --tree {{ tree_full }} --log {{ logs_dir }}/dc-{{ tree }}-gemini.log

# Darkcat pair - dc-claude + dc-openai (codex).
darkcat-all: darkcat darkcat-openai
    @echo ""
    @echo "  Darkcat complete (claude + codex)"

# DC-SYNTH: Convergence synthesis
darkcat-synth harness="claude": setup
    #!/usr/bin/env bash
    set -euo pipefail
    echo ">> DC-SYNTH ({{ harness }}) - {{ tree }}"
    if [ ! -f {{ logs_dir }}/dc-{{ tree }}-claude.log ] || \
       [ ! -f {{ logs_dir }}/dc-{{ tree }}-openai.log ] || \
       [ ! -f {{ logs_dir }}/dc-{{ tree }}-gemini.log ]; then
        echo "ERROR: missing DC logs for {{ tree }}. Run 'just darkcat', 'just darkcat-openai', and 'just darkcat-gemini' first."; exit 1
    fi
    case "{{ harness }}" in
        claude)
            timeout {{ darkcat_timeout }} claude -p "$(cat {{ darkcat_synth_prompt }})" \
                --allowedTools "Bash(git:*) Read" \
                > {{ logs_dir }}/dc-{{ tree }}-synth.log 2>&1
            ;;
        codex)
            timeout {{ darkcat_timeout }} codex exec --sandbox read-only \
                "$(cat {{ darkcat_synth_prompt }})" \
                > {{ logs_dir }}/dc-{{ tree }}-synth.log 2>&1
            ;;
        gemini)
            timeout {{ darkcat_timeout }} gemini -y -p \
                "$(cat {{ darkcat_synth_prompt }})" \
                > {{ logs_dir }}/dc-{{ tree }}-synth.log 2>&1
            ;;
        *)
            echo "ERROR: unknown harness={{ harness }}"; exit 1
            ;;
    esac
    echo "  -> {{ logs_dir }}/dc-{{ tree }}-synth.log"
    grep -E '^(Findings:|Verdict:|##|###)' {{ logs_dir }}/dc-{{ tree }}-synth.log || true
    {{ pitcommit }} attest synth --tree {{ tree_full }} --log {{ logs_dir }}/dc-{{ tree }}-synth.log

# Review a specific commit (ad-hoc)
darkcat-ref ref: setup
    @echo ">> darkcat - {{ ref }}"
    timeout {{ darkcat_timeout }} claude -p "$(cat {{ darkcat_prompt }}) \n\nReview this specific commit: {{ ref }}" \
        --allowedTools "Bash(git:*) Read" \
        > {{ logs_dir }}/dc-{{ ref }}-claude.log 2>&1
    @echo "  -> {{ logs_dir }}/dc-{{ ref }}-claude.log"
    grep -E '^(Findings:|Verdict:|##|###)' {{ logs_dir }}/dc-{{ ref }}-claude.log || true

# ── Gauntlet - Full Verification Pipeline ────────────────────

[private]
gauntlet-gate:
    #!/usr/bin/env bash
    set -euo pipefail
    echo ">> Gate"
    if just gate; then
        {{ pitcommit }} attest gate --tree {{ tree_full }} --verdict pass
    else
        {{ pitcommit }} attest gate --tree {{ tree_full }} --verdict fail
        exit 1
    fi

[private]
gauntlet-interop:
    #!/usr/bin/env bash
    set -euo pipefail
    echo ">> Interop (C2)"
    if just interop; then
        {{ pitcommit }} attest interop --tree {{ tree_full }} --verdict pass
    else
        {{ pitcommit }} attest interop --tree {{ tree_full }} --verdict fail
        exit 1
    fi

[private]
gauntlet-swarm:
    #!/usr/bin/env bash
    set -euo pipefail
    echo ">> Swarm (C3)"
    if just swarm; then
        {{ pitcommit }} attest swarm --tree {{ tree_full }} --verdict pass
    else
        {{ pitcommit }} attest swarm --tree {{ tree_full }} --verdict fail
        exit 1
    fi

[private]
gauntlet-crew:
    #!/usr/bin/env bash
    set -euo pipefail
    echo ">> Crew (C4)"
    if just crew-test; then
        {{ pitcommit }} attest crew --tree {{ tree_full }} --verdict pass
    else
        {{ pitcommit }} attest crew --tree {{ tree_full }} --verdict fail
        exit 1
    fi

[private]
gauntlet-pitkeel:
    #!/usr/bin/env bash
    set -euo pipefail
    echo ">> Pitkeel signals"
    if (cd pitkeel && uv run python pitkeel.py); then
        {{ pitcommit }} attest pitkeel --tree {{ tree_full }} --verdict pass
    else
        {{ pitcommit }} attest pitkeel --tree {{ tree_full }} --verdict fail
        exit 1
    fi

gauntlet tier="full":
    #!/usr/bin/env bash
    set -euo pipefail
    echo ""
    echo "-- Gauntlet -- {{ tree }} [{{ tier }}] --"
    echo ""
    {{ pitcommit }} tier --set {{ tier }}
    if [ "{{ tier }}" = "full" ]; then
        echo ""; echo "-- 1/6 Gate --"; echo ""
    else
        echo ""; echo "-- 1/2 Gate --"; echo ""
    fi
    just gauntlet-gate
    if [ "{{ tier }}" = "full" ]; then
        echo ""; echo "-- 2/6 Interop --"; echo ""
        just gauntlet-interop
        echo ""; echo "-- 3/6 Swarm --"; echo ""
        just gauntlet-swarm
        echo ""; echo "-- 4/6 Crew --"; echo ""
        just gauntlet-crew
        echo ""; echo "-- 5/6 Darkcat --"; echo ""
        just darkcat-all
        echo ""; echo "-- 6/6 Pitkeel --"
    else
        echo ""; echo "-- 2/2 Pitkeel --"
    fi
    echo ""
    just gauntlet-pitkeel
    echo ""
    echo "========================================"
    echo "  GAUNTLET COMPLETE - {{ tree }} [{{ tier }}]"
    echo "========================================"
    echo ""
    {{ pitcommit }} status
    echo ""
    if [ "{{ tier }}" = "full" ]; then
        echo "  Next: python3 scripts/pitcommit.py walkthrough"
        echo "  Then: git commit -m '...'"
    else
        echo "  Next: git commit -m '...'"
    fi
    echo ""
    echo "========================================"

# ── Meta Targets ─────────────────────────────────────────────

status:
    #!/usr/bin/env bash
    done_mark() { [ -f {{ done_dir }}/$1 ] && printf "+" || printf "."; }
    echo ""
    echo "-- Midgets Phase Status --"
    echo ""
    echo "Phase A - Agent in container"
    printf "  %s A1  gate: build container + test-poc.sh\n"        "$(done_mark A1)"
    printf "  %s A2  terminal protocol: drive + tmux sentinel\n"   "$(done_mark A2)"
    printf "  %s A3  OCR: tesseract + steer see --ocr\n"           "$(done_mark A3)"
    printf "  %s A4  Chromium: headless browser\n"                 "$(done_mark A4)"
    printf "  %s A5  agent framework in container\n"               "$(done_mark A5)"
    echo ""
    echo "Phase B - Governance adapted"
    printf "  %s B1  SPEC.md\n"                                    "$(done_mark B1)"
    printf "  %s B2  Makefile rewrite for midgets\n"               "$(done_mark B2)"
    printf "  %s B3  gauntlet for containers\n"                    "$(done_mark B3)"
    printf "  %s B4  EVAL.md\n"                                    "$(done_mark B4)"
    echo ""
    echo "Phase C - Multi-agent coordination"
    printf "  %s C1  listen port: job server\n"                    "$(done_mark C1)"
    printf "  %s C2  inter-container communication\n"              "$(done_mark C2)"
    printf "  %s C3  multi-container orchestration\n"              "$(done_mark C3)"
    printf "  %s C4  governance crew as physical agents\n"         "$(done_mark C4)"
    echo ""

graph:
    @echo "Dependency Graph (< depends on)"
    @echo ""
    @echo "A1 gate"
    @echo "  A2 terminal protocol"
    @echo "    (A5)"
    @echo "  A3 OCR"
    @echo "    A4 chromium"
    @echo "      A5 agent framework <(A2+A3+A4)"
    @echo "        B3 gauntlet-containers <(A5+B2)"
    @echo "          C4 governance crew <(C3+B3)"
    @echo "        C1 job server"
    @echo "          C2 inter-container"
    @echo "            C3 orchestration <(C1+C2)"
    @echo "          (C3)"
    @echo "  B2 makefile <(A1+B1)"
    @echo "    (B3)"
    @echo "B1 SPEC.md"
    @echo "  B2 (see above)"
    @echo "  B4 EVAL.md"

# ── Agent Live Run ───────────────────────────────────────────

agent-live task="Use drive to create a tmux session called 'work', run 'echo CLAUDE_INSIDE_MIDGET', capture the output with drive logs, then report back the exact output you saw.":
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
        echo "ERROR: ANTHROPIC_API_KEY not set"; exit 1
    fi
    echo ">> Running live agent task inside midget container..."
    echo "  Task: {{ task }}"
    docker run --rm \
        -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
        -e DISPLAY=:99 \
        {{ midget_image }} \
        bash -c 'Xvfb :99 -screen 0 1280x720x24 -ac & sleep 1; \
                 fluxbox -display :99 & sleep 1; \
                 claude -p "{{ task }}" \
                   --dangerously-skip-permissions \
                   --allowedTools "Bash"'

# ── Hooks ────────────────────────────────────────────────────

install-hooks:
    ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
    ln -sf ../../scripts/prepare-commit-msg .git/hooks/prepare-commit-msg
    @echo "Hooks installed: pre-commit, prepare-commit-msg"

# ── Clean ────────────────────────────────────────────────────

clean:
    rm -rf {{ done_dir }}
    @echo "All task completion markers cleared."

# ── Ebook Build ──────────────────────────────────────────────

ebook_build := "build/ebook"
ebook_out := ebook_build / "the-agentic-engineer-v1.0.epub"
ebook_css := "assets/ebook.css"
ebook_slim_build := "build/ebook-slim"
ebook_slim_out := ebook_slim_build / "the-agentic-engineer-v1.0-slim.epub"

ebook: ebook-epub
    @echo ""
    @echo "EPUB (full): {{ ebook_out }}"
    ls -lh {{ ebook_out }}

ebook-slim: ebook-slim-epub
    @echo ""
    @echo "EPUB (slim): {{ ebook_slim_out }}"
    ls -lh {{ ebook_slim_out }}

ebook-all: ebook ebook-slim
    @echo ""
    @echo "Both editions built."

ebook-prep:
    uv run bin/ebook-prep

ebook-slim-prep:
    uv run bin/ebook-prep --edition slim

ebook-epub: ebook-prep
    pandoc \
        --from markdown \
        --to epub3 \
        --metadata-file {{ ebook_build }}/metadata.yaml \
        --toc \
        --toc-depth 2 \
        --split-level 1 \
        --css {{ ebook_css }} \
        -o {{ ebook_out }} \
        $(cat {{ ebook_build }}/manifest.txt)
    @echo "EPUB generated: {{ ebook_out }}"

ebook-slim-epub: ebook-slim-prep
    pandoc \
        --from markdown \
        --to epub3 \
        --metadata-file {{ ebook_slim_build }}/metadata.yaml \
        --toc \
        --toc-depth 2 \
        --split-level 1 \
        --css {{ ebook_css }} \
        -o {{ ebook_slim_out }} \
        $(cat {{ ebook_slim_build }}/manifest.txt)
    @echo "EPUB generated: {{ ebook_slim_out }}"

ebook-clean:
    rm -rf {{ ebook_build }} {{ ebook_slim_build }}
    @echo "Ebook build directories cleared."

# ── Watch ────────────────────────────────────────────────────

watch cmd="" role="":
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Starting midget with VNC on localhost:5900..."
    if [ -z "{{ cmd }}" ]; then
        echo "Interactive shell. Connect VNC viewer to localhost:5900"
        echo "Ctrl+C to stop."
        docker run --rm -it \
            --cpus 2 --memory 4g \
            -e MIDGET_VNC=1 \
            -e MIDGET_ROLE="{{ role }}" \
            -p 5900:5900 \
            {{ midget_image }}
    else
        CONTAINER_ID=$(docker run -d \
            --cpus 2 --memory 4g \
            -e MIDGET_VNC=1 \
            -e MIDGET_ROLE="{{ role }}" \
            -p 5900:5900 \
            {{ midget_image }} \
            bash -c "{{ cmd }}; echo 'CMD finished, container stays for VNC. Ctrl+C to stop.'; sleep infinity")
        echo "Container: $CONTAINER_ID"
        echo "Connect VNC viewer to localhost:5900"
        echo "Ctrl+C to stop."
        echo ""
        trap "docker stop $CONTAINER_ID >/dev/null 2>&1; docker rm $CONTAINER_ID >/dev/null 2>&1" EXIT INT TERM
        docker logs -f $CONTAINER_ID
    fi
