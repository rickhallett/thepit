# ============================================================
# Calibration Run — Deterministic Build Orchestration
# ============================================================
#
# Each target is one task, one fresh agent context.
# Prerequisites encode the dependency graph.
# The human runs targets in order; Make enforces deps.
#
# Usage:
#   make 01          # run task 01
#   make 01 02 03    # run sequence
#   make all         # run everything (brave)
#   make graph       # print dependency graph
#   make status      # show which tasks have completed
#
# Each task:
#   1. Calls claude -p with the plan file
#   2. Runs the gate
#   3. Touches .done/XX to mark completion
#
# The human reviews output AFTER each task, not during.
# ============================================================

SHELL := /bin/bash
.ONESHELL:

DONE := .done
LOGS := .logs
GATE := pnpm run typecheck && pnpm run lint && pnpm run test:unit 2>/dev/null
POLECAT_TIMEOUT := 300

# Polecat wrapper v2 — observable, permission-safe, timeout-guarded.
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

# ── Phase 0: Foundation ──────────────────────────────────────

01: plans/01-scaffold.md
	$(call POLECAT,plans/01-scaffold.md)
	$(GATE)
	@touch $(DONE)/01
	@echo "✓ 01-scaffold complete. Review, then: make 02"

02: $(DONE)/01 plans/02-database.md
	$(call POLECAT,plans/02-database.md)
	$(GATE)
	@touch $(DONE)/02
	@echo "✓ 02-database complete. Review, then: make 03"

# ── Phase 1: Infrastructure ──────────────────────────────────

03: $(DONE)/02 plans/03-clerk-middleware.md
	$(call POLECAT,plans/03-clerk-middleware.md)
	$(GATE)
	@touch $(DONE)/03
	@echo "✓ 03-clerk complete. Review, then: make 04"

04: $(DONE)/03 plans/04-user-mirroring.md
	$(call POLECAT,plans/04-user-mirroring.md)
	$(GATE)
	@touch $(DONE)/04
	@echo "✓ 04-user-mirroring complete. Review, then: make 05"

05: $(DONE)/03 plans/05-api-utils.md
	$(call POLECAT,plans/05-api-utils.md)
	$(GATE)
	@touch $(DONE)/05
	@echo "✓ 05-api-utils complete. Review, then: make 06"

# ── Phase 2: Core (parallel branches converge at 12) ────────

06: $(DONE)/05 plans/06-presets.md
	$(call POLECAT,plans/06-presets.md)
	$(GATE)
	@touch $(DONE)/06
	@echo "✓ 06-presets complete. Review, then: make 07"

# Bout branch
07: $(DONE)/06 plans/07-bout-validation.md
	$(call POLECAT,plans/07-bout-validation.md)
	$(GATE)
	@touch $(DONE)/07
	@echo "✓ 07-bout-validation complete. Review, then: make 08"

08: $(DONE)/07 plans/08-bout-turn-loop.md
	$(call POLECAT,plans/08-bout-turn-loop.md)
	$(GATE)
	@touch $(DONE)/08
	@echo "✓ 08-bout-turn-loop complete. Review, then: make 09"

09: $(DONE)/08 plans/09-bout-streaming.md
	$(call POLECAT,plans/09-bout-streaming.md)
	$(GATE)
	@touch $(DONE)/09
	@echo "✓ 09-bout-streaming complete. Review, then: make 10 (needs 11 first)"

# Credit branch (can run after 05, parallel with bout branch)
10: $(DONE)/05 plans/10-credit-balance.md
	$(call POLECAT,plans/10-credit-balance.md)
	$(GATE)
	@touch $(DONE)/10
	@echo "✓ 10-credit-balance complete. Review, then: make 11"

11: $(DONE)/10 plans/11-credit-preauth.md
	$(call POLECAT,plans/11-credit-preauth.md)
	$(GATE)
	@touch $(DONE)/11
	@echo "✓ 11-credit-preauth complete. Review, then: make 12"

12: $(DONE)/11 plans/12-credit-catalog.md
	$(call POLECAT,plans/12-credit-catalog.md)
	$(GATE)
	@touch $(DONE)/12
	@echo "✓ 12-credit-catalog complete. Review, then: make 13"

# ── Phase 3: Integration ─────────────────────────────────────

# Bout + Credits converge here
13: $(DONE)/09 $(DONE)/10 plans/13-bout-persistence-credits.md
	$(call POLECAT,plans/13-bout-persistence-credits.md)
	$(GATE)
	@touch $(DONE)/13
	@echo "✓ 13-bout-persistence+credits complete. Review, then: make 14"

# Bout UI branch
14: $(DONE)/13 plans/14-use-bout-hook.md
	$(call POLECAT,plans/14-use-bout-hook.md)
	$(GATE)
	@touch $(DONE)/14
	@echo "✓ 14-useBout-hook complete. Review, then: make 15"

15: $(DONE)/14 plans/15-bout-viewer-page.md
	$(call POLECAT,plans/15-bout-viewer-page.md)
	$(GATE)
	@touch $(DONE)/15
	@echo "✓ 15-bout-viewer complete. Review, then: make 16"

16: $(DONE)/15 plans/16-arena-page.md
	$(call POLECAT,plans/16-arena-page.md)
	$(GATE)
	@touch $(DONE)/16
	@echo "✓ 16-arena-page complete. Review, then: make 17"

# Stripe branch
17: $(DONE)/12 plans/17-tier-config.md
	$(call POLECAT,plans/17-tier-config.md)
	$(GATE)
	@touch $(DONE)/17
	@echo "✓ 17-tier-config complete. Review, then: make 18"

18: $(DONE)/17 plans/18-stripe-webhook.md
	$(call POLECAT,plans/18-stripe-webhook.md)
	$(GATE)
	@touch $(DONE)/18
	@echo "✓ 18-stripe-webhook complete. Review, then: make 19"

19: $(DONE)/18 plans/19-stripe-checkout.md
	$(call POLECAT,plans/19-stripe-checkout.md)
	$(GATE)
	@touch $(DONE)/19
	@echo "✓ 19-stripe-checkout complete. Review, then: make 20"

# ── Phase 4: Features ────────────────────────────────────────

20: $(DONE)/05 $(DONE)/02 plans/20-reactions.md
	$(call POLECAT,plans/20-reactions.md)
	$(GATE)
	@touch $(DONE)/20
	@echo "✓ 20-reactions complete. Review, then: make 21"

21: $(DONE)/20 plans/21-votes-leaderboard.md
	$(call POLECAT,plans/21-votes-leaderboard.md)
	$(GATE)
	@touch $(DONE)/21
	@echo "✓ 21-votes+leaderboard complete. Review, then: make 22"

22: $(DONE)/21 plans/22-short-links-sharing.md
	$(call POLECAT,plans/22-short-links-sharing.md)
	$(GATE)
	@touch $(DONE)/22
	@echo "✓ 22-short-links complete. Review, then: make 23"

23: $(DONE)/05 $(DONE)/02 plans/23-agent-api.md
	$(call POLECAT,plans/23-agent-api.md)
	$(GATE)
	@touch $(DONE)/23
	@echo "✓ 23-agent-api complete. Review, then: make 24"

24: $(DONE)/23 plans/24-agent-pages.md
	$(call POLECAT,plans/24-agent-pages.md)
	$(GATE)
	@touch $(DONE)/24
	@echo "✓ 24-agent-pages complete. Review, then: make 25"

# ── Phase 5: Polish ──────────────────────────────────────────

25: $(DONE)/15 $(DONE)/22 plans/25-replay-page.md
	$(call POLECAT,plans/25-replay-page.md)
	$(GATE)
	@touch $(DONE)/25
	@echo "✓ 25-replay complete. Review, then: make 26"

26: plans/26-deploy.md
	$(call POLECAT,plans/26-deploy.md)
	@touch $(DONE)/26
	@echo "✓ 26-deploy complete. Run smoke test against production."

# ── Meta targets ─────────────────────────────────────────────

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

# ── The Gauntlet — Adversarial Review Pipeline ──────────────
#
# DEV → DARKCAT{claude,openai,gemini} → SYNTH → PITKEEL → WALKTHROUGH → COMMIT
# See: docs/internal/the-gauntlet.md
#
# Invocation:
#   make darkcat           DC-1 (Claude)
#   make darkcat-openai    DC-2 (OpenAI/Codex)
#   make darkcat-gemini    DC-3 (Gemini)
#   make darkcat-synth     Convergence synthesis
#   make darkcat-all       All three DCs in parallel
#   make gauntlet          Full pipeline: DCs + synth + pitkeel

DARKCAT_PROMPT := scripts/darkcat.md
DARKCAT_SYNTH_PROMPT := scripts/darkcat-synth.md
DARKCAT_TIMEOUT := 180
PITCOMMIT := python3 scripts/pitcommit.py

# Identity: tree hash of staged content (solves the SHA paradox)
TREE := $(shell git write-tree 2>/dev/null | cut -c1-8)
TREE_FULL := $(shell git write-tree 2>/dev/null)
# SHA kept for display/ad-hoc use only
SHA := $(shell git rev-parse --short HEAD)

# DC-1: Claude
darkcat:
	@echo "▶ DC-1 (Claude) — $(TREE)"
	@timeout $(DARKCAT_TIMEOUT) claude -p "$$(cat $(DARKCAT_PROMPT))" \
		--allowedTools "Bash(git:*) Read" \
		> $(LOGS)/dc-$(TREE)-claude.log 2>&1
	@echo "  → $(LOGS)/dc-$(TREE)-claude.log"
	@grep -E '^(Findings:|Verdict:|##|###)' $(LOGS)/dc-$(TREE)-claude.log || true
	@$(PITCOMMIT) attest dc-claude --tree $(TREE_FULL) --log $(LOGS)/dc-$(TREE)-claude.log

# DC-2: OpenAI (Codex)
darkcat-openai:
	@echo "▶ DC-2 (OpenAI) — $(TREE)"
	@timeout $(DARKCAT_TIMEOUT) codex exec --sandbox read-only \
		"$$(cat $(DARKCAT_PROMPT))" \
		> $(LOGS)/dc-$(TREE)-openai.log 2>&1
	@echo "  → $(LOGS)/dc-$(TREE)-openai.log"
	@grep -E '^(Findings:|Verdict:|##|###)' $(LOGS)/dc-$(TREE)-openai.log || true
	@$(PITCOMMIT) attest dc-openai --tree $(TREE_FULL) --log $(LOGS)/dc-$(TREE)-openai.log

# DC-3: Gemini
darkcat-gemini:
	@echo "▶ DC-3 (Gemini) — $(TREE)"
	@timeout $(DARKCAT_TIMEOUT) gemini -y -p \
		"$$(cat $(DARKCAT_PROMPT))" \
		> $(LOGS)/dc-$(TREE)-gemini.log 2>&1
	@echo "  → $(LOGS)/dc-$(TREE)-gemini.log"
	@grep -E '^(Findings:|Verdict:|##|###)' $(LOGS)/dc-$(TREE)-gemini.log || true
	@$(PITCOMMIT) attest dc-gemini --tree $(TREE_FULL) --log $(LOGS)/dc-$(TREE)-gemini.log

# Darkcat pair — dc-claude + dc-openai (codex).
# DC-3 (gemini) deferred: hangs in pipe mode (2 failure modes, v0.32.1).
# Restore triad with: $(MAKE) -j3 darkcat darkcat-openai darkcat-gemini
darkcat-all:
	@$(MAKE) -j2 darkcat darkcat-openai
	@echo ""
	@echo "  ✓ Darkcat complete (claude + codex)"

# DC-SYNTH: Convergence synthesis (4th polecat, Captain's choice of harness)
# Default: Claude. Override with SYNTH_HARNESS=codex or SYNTH_HARNESS=gemini
SYNTH_HARNESS ?= claude
darkcat-synth:
	@echo "▶ DC-SYNTH ($(SYNTH_HARNESS)) — $(TREE)"
	@if [ ! -f $(LOGS)/dc-$(TREE)-claude.log ] || \
	    [ ! -f $(LOGS)/dc-$(TREE)-openai.log ] || \
	    [ ! -f $(LOGS)/dc-$(TREE)-gemini.log ]; then \
		echo "ERROR: missing DC logs for $(TREE). Run 'make darkcat-all' first."; exit 1; \
	fi
	@if [ "$(SYNTH_HARNESS)" = "claude" ]; then \
		timeout $(DARKCAT_TIMEOUT) claude -p "$$(cat $(DARKCAT_SYNTH_PROMPT))" \
			--allowedTools "Bash(git:*) Read" \
			> $(LOGS)/dc-$(TREE)-synth.log 2>&1; \
	elif [ "$(SYNTH_HARNESS)" = "codex" ]; then \
		timeout $(DARKCAT_TIMEOUT) codex exec --sandbox read-only \
			"$$(cat $(DARKCAT_SYNTH_PROMPT))" \
			> $(LOGS)/dc-$(TREE)-synth.log 2>&1; \
	elif [ "$(SYNTH_HARNESS)" = "gemini" ]; then \
		timeout $(DARKCAT_TIMEOUT) gemini -y -p \
			"$$(cat $(DARKCAT_SYNTH_PROMPT))" \
			> $(LOGS)/dc-$(TREE)-synth.log 2>&1; \
	else \
		echo "ERROR: unknown SYNTH_HARNESS=$(SYNTH_HARNESS)"; exit 1; \
	fi
	@echo "  → $(LOGS)/dc-$(TREE)-synth.log"
	@grep -E '^(Findings:|Verdict:|##|###)' $(LOGS)/dc-$(TREE)-synth.log || true
	@$(PITCOMMIT) attest synth --tree $(TREE_FULL) --log $(LOGS)/dc-$(TREE)-synth.log

# Review a specific commit (ad-hoc, uses SHA not tree)
darkcat-ref:
	@if [ -z "$(REF)" ]; then echo "Usage: make darkcat-ref REF=<commit>"; exit 1; fi
	@echo "▶ darkcat — $(REF)"
	@timeout $(DARKCAT_TIMEOUT) claude -p "$$(cat $(DARKCAT_PROMPT)) \n\nReview this specific commit: $(REF)" \
		--allowedTools "Bash(git:*) Read" \
		> $(LOGS)/dc-$(REF)-claude.log 2>&1
	@echo "  → $(LOGS)/dc-$(REF)-claude.log"
	@grep -E '^(Findings:|Verdict:|##|###)' $(LOGS)/dc-$(REF)-claude.log || true

# ── The Gauntlet — Full Verification Pipeline ─────────────
#
# Sequential: gate → darkcats → synth → pitkeel → status
# Each step writes an attestation to .gauntlet/.
# Pre-commit hook verifies attestations before allowing commit.
#
# Tiers: full (default), docs, wip, sudo
#   make gauntlet                    full tier
#   make gauntlet TIER=docs          docs tier (gate + pitkeel only)
#   make gauntlet TIER=wip           wip tier (gate + pitkeel only)

TIER ?= full

gauntlet-gate:
	@echo "▶ Gate"
	@if pnpm run typecheck && pnpm run lint && pnpm run test; then \
		$(PITCOMMIT) attest gate --tree $(TREE_FULL) --verdict pass; \
	else \
		$(PITCOMMIT) attest gate --tree $(TREE_FULL) --verdict fail; \
		exit 1; \
	fi

gauntlet-pitkeel:
	@echo "▶ Pitkeel signals"
	@cd pitkeel && uv run python pitkeel.py
	@cd "$(CURDIR)" && $(PITCOMMIT) attest pitkeel --tree $(TREE_FULL) --verdict pass

gauntlet:
	@echo ""
	@echo "── Gauntlet ── $(TREE) [$(TIER)] ──"
	@echo ""
	@$(PITCOMMIT) tier --set $(TIER)
	@if [ "$(TIER)" = "full" ]; then \
		echo ""; echo "── 1/3 Gate ──"; echo ""; \
	else \
		echo ""; echo "── 1/2 Gate ──"; echo ""; \
	fi
	@$(MAKE) gauntlet-gate
	@if [ "$(TIER)" = "full" ]; then \
		echo ""; \
		echo "── 2/3 Darkcat ──"; \
		echo ""; \
		$(MAKE) darkcat-all; \
	fi
	@if [ "$(TIER)" = "full" ]; then \
		echo ""; echo "── 3/3 Pitkeel ──"; \
	else \
		echo ""; echo "── 2/2 Pitkeel ──"; \
	fi
	@echo ""
	@$(MAKE) gauntlet-pitkeel
	@echo ""
	@echo "════════════════════════════════════════════"
	@echo "  GAUNTLET COMPLETE — $(TREE) [$(TIER)]"
	@echo "════════════════════════════════════════════"
	@echo ""
	@$(PITCOMMIT) status
	@echo ""
	@if [ "$(TIER)" = "full" ]; then \
		echo "  Next: python3 scripts/pitcommit.py walkthrough"; \
		echo "  Then: git commit -m '...'"; \
	else \
		echo "  Next: git commit -m '...'"; \
	fi
	@echo ""
	@echo "════════════════════════════════════════════"

# Install git hooks (run once after clone)
install-hooks:
	@ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
	@ln -sf ../../scripts/prepare-commit-msg .git/hooks/prepare-commit-msg
	@echo "✓ Hooks installed: pre-commit, prepare-commit-msg"

clean:
	rm -rf $(DONE)
	@echo "All task completion markers cleared."

.PHONY: all status graph clean darkcat darkcat-openai darkcat-gemini darkcat-all darkcat-synth darkcat-ref gauntlet gauntlet-gate gauntlet-pitkeel install-hooks 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
