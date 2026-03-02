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
GATE := pnpm run typecheck && pnpm run lint && pnpm run test:unit 2>/dev/null

# Ensure .done directory exists
$(shell mkdir -p $(DONE))

# ── Phase 0: Foundation ──────────────────────────────────────

01: plans/01-scaffold.md
	claude -p "$$(cat $<)"
	$(GATE)
	@touch $(DONE)/01
	@echo "✓ 01-scaffold complete. Review, then: make 02"

02: $(DONE)/01 plans/02-database.md
	claude -p "$$(cat plans/02-database.md)"
	$(GATE)
	@touch $(DONE)/02
	@echo "✓ 02-database complete. Review, then: make 03"

# ── Phase 1: Infrastructure ──────────────────────────────────

03: $(DONE)/02 plans/03-clerk-middleware.md
	claude -p "$$(cat plans/03-clerk-middleware.md)"
	$(GATE)
	@touch $(DONE)/03
	@echo "✓ 03-clerk complete. Review, then: make 04"

04: $(DONE)/03 plans/04-user-mirroring.md
	claude -p "$$(cat plans/04-user-mirroring.md)"
	$(GATE)
	@touch $(DONE)/04
	@echo "✓ 04-user-mirroring complete. Review, then: make 05"

05: $(DONE)/03 plans/05-api-utils.md
	claude -p "$$(cat plans/05-api-utils.md)"
	$(GATE)
	@touch $(DONE)/05
	@echo "✓ 05-api-utils complete. Review, then: make 06"

# ── Phase 2: Core (parallel branches converge at 12) ────────

06: $(DONE)/05 plans/06-presets.md
	claude -p "$$(cat plans/06-presets.md)"
	$(GATE)
	@touch $(DONE)/06
	@echo "✓ 06-presets complete. Review, then: make 07"

# Bout branch
07: $(DONE)/06 plans/07-bout-validation.md
	claude -p "$$(cat plans/07-bout-validation.md)"
	$(GATE)
	@touch $(DONE)/07
	@echo "✓ 07-bout-validation complete. Review, then: make 08"

08: $(DONE)/07 plans/08-bout-turn-loop.md
	claude -p "$$(cat plans/08-bout-turn-loop.md)"
	$(GATE)
	@touch $(DONE)/08
	@echo "✓ 08-bout-turn-loop complete. Review, then: make 09"

09: $(DONE)/08 plans/09-bout-streaming.md
	claude -p "$$(cat plans/09-bout-streaming.md)"
	$(GATE)
	@touch $(DONE)/09
	@echo "✓ 09-bout-streaming complete. Review, then: make 10 (needs 11 first)"

# Credit branch (can run after 05, parallel with bout branch)
10: $(DONE)/05 plans/10-credit-balance.md
	claude -p "$$(cat plans/10-credit-balance.md)"
	$(GATE)
	@touch $(DONE)/10
	@echo "✓ 10-credit-balance complete. Review, then: make 11"

11: $(DONE)/10 plans/11-credit-preauth.md
	claude -p "$$(cat plans/11-credit-preauth.md)"
	$(GATE)
	@touch $(DONE)/11
	@echo "✓ 11-credit-preauth complete. Review, then: make 12"

12: $(DONE)/11 plans/12-credit-catalog.md
	claude -p "$$(cat plans/12-credit-catalog.md)"
	$(GATE)
	@touch $(DONE)/12
	@echo "✓ 12-credit-catalog complete. Review, then: make 13"

# ── Phase 3: Integration ─────────────────────────────────────

# Bout + Credits converge here
13: $(DONE)/09 $(DONE)/10 plans/13-bout-persistence-credits.md
	claude -p "$$(cat plans/13-bout-persistence-credits.md)"
	$(GATE)
	@touch $(DONE)/13
	@echo "✓ 13-bout-persistence+credits complete. Review, then: make 14"

# Bout UI branch
14: $(DONE)/13 plans/14-use-bout-hook.md
	claude -p "$$(cat plans/14-use-bout-hook.md)"
	$(GATE)
	@touch $(DONE)/14
	@echo "✓ 14-useBout-hook complete. Review, then: make 15"

15: $(DONE)/14 plans/15-bout-viewer-page.md
	claude -p "$$(cat plans/15-bout-viewer-page.md)"
	$(GATE)
	@touch $(DONE)/15
	@echo "✓ 15-bout-viewer complete. Review, then: make 16"

16: $(DONE)/15 plans/16-arena-page.md
	claude -p "$$(cat plans/16-arena-page.md)"
	$(GATE)
	@touch $(DONE)/16
	@echo "✓ 16-arena-page complete. Review, then: make 17"

# Stripe branch
17: $(DONE)/12 plans/17-tier-config.md
	claude -p "$$(cat plans/17-tier-config.md)"
	$(GATE)
	@touch $(DONE)/17
	@echo "✓ 17-tier-config complete. Review, then: make 18"

18: $(DONE)/17 plans/18-stripe-webhook.md
	claude -p "$$(cat plans/18-stripe-webhook.md)"
	$(GATE)
	@touch $(DONE)/18
	@echo "✓ 18-stripe-webhook complete. Review, then: make 19"

19: $(DONE)/18 plans/19-stripe-checkout.md
	claude -p "$$(cat plans/19-stripe-checkout.md)"
	$(GATE)
	@touch $(DONE)/19
	@echo "✓ 19-stripe-checkout complete. Review, then: make 20"

# ── Phase 4: Features ────────────────────────────────────────

20: $(DONE)/05 $(DONE)/02 plans/20-reactions.md
	claude -p "$$(cat plans/20-reactions.md)"
	$(GATE)
	@touch $(DONE)/20
	@echo "✓ 20-reactions complete. Review, then: make 21"

21: $(DONE)/20 plans/21-votes-leaderboard.md
	claude -p "$$(cat plans/21-votes-leaderboard.md)"
	$(GATE)
	@touch $(DONE)/21
	@echo "✓ 21-votes+leaderboard complete. Review, then: make 22"

22: $(DONE)/21 plans/22-short-links-sharing.md
	claude -p "$$(cat plans/22-short-links-sharing.md)"
	$(GATE)
	@touch $(DONE)/22
	@echo "✓ 22-short-links complete. Review, then: make 23"

23: $(DONE)/05 $(DONE)/02 plans/23-agent-api.md
	claude -p "$$(cat plans/23-agent-api.md)"
	$(GATE)
	@touch $(DONE)/23
	@echo "✓ 23-agent-api complete. Review, then: make 24"

24: $(DONE)/23 plans/24-agent-pages.md
	claude -p "$$(cat plans/24-agent-pages.md)"
	$(GATE)
	@touch $(DONE)/24
	@echo "✓ 24-agent-pages complete. Review, then: make 25"

# ── Phase 5: Polish ──────────────────────────────────────────

25: $(DONE)/15 $(DONE)/22 plans/25-replay-page.md
	claude -p "$$(cat plans/25-replay-page.md)"
	$(GATE)
	@touch $(DONE)/25
	@echo "✓ 25-replay complete. Review, then: make 26"

26: plans/26-deploy.md
	claude -p "$$(cat plans/26-deploy.md)"
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

clean:
	rm -rf $(DONE)
	@echo "All task completion markers cleared."

.PHONY: all status graph clean 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
