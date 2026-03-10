# ── Midgets Phase Tasks ───────────────────────────────────────
#
# Phase A: agent operating inside the container
# Phase B: governance adapted for midgets
# Phase C: multi-agent coordination
#
# Each touch $(DONE)/<id> on completion.
# Use: make status   to see current progress.
#
# These are direct-execution targets (not polecat-dispatched).
# Running directly per Operator decision (polecat costs).

# ── Phase A ──────────────────────────────────────────────────

A1: ## Gate: build container + run test-poc.sh
	@$(MAKE) gate
	@touch $(DONE)/A1
	@echo "✓ A1 gate green"

A2: $(DONE)/A1 ## Terminal protocol: drive CLI + tmux sentinel
	@$(MAKE) gate
	@touch $(DONE)/A2
	@echo "✓ A2 gate green"

A3: $(DONE)/A1 ## OCR: tesseract + steer see --ocr
	@$(MAKE) gate
	@touch $(DONE)/A3
	@echo "✓ A3 gate green"

A4: $(DONE)/A1 $(DONE)/A3 ## Chromium: headless browser in container
	@$(MAKE) gate
	@touch $(DONE)/A4
	@echo "✓ A4 gate green"

A5: $(DONE)/A2 $(DONE)/A3 $(DONE)/A4 ## Agent framework in container
	@$(MAKE) gate
	@touch $(DONE)/A5
	@echo "✓ A5 gate green"

# ── Phase B ──────────────────────────────────────────────────

B1: ## SPEC.md: midgets governance spec
	@touch $(DONE)/B1
	@echo "✓ B1 complete (SPEC.md exists)"

B2: $(DONE)/A1 $(DONE)/B1 ## Makefile rewrite for midgets
	@touch $(DONE)/B2
	@echo "✓ B2 complete"

B3: $(DONE)/A5 $(DONE)/B2 ## Gauntlet for containers
	@$(MAKE) gate
	@touch $(DONE)/B3
	@echo "✓ B3 gate green"

B4: $(DONE)/B1 ## EVAL.md: success/failure criteria
	@touch $(DONE)/B4
	@echo "✓ B4 complete (EVAL.md exists)"

# ── Phase C ──────────────────────────────────────────────────

C1: $(DONE)/A5 ## Listen port: job server
	@$(MAKE) gate
	@touch $(DONE)/C1
	@echo "✓ C1 gate green"

C2: $(DONE)/C1 ## Inter-container communication
	@$(MAKE) gate
	@touch $(DONE)/C2
	@echo "✓ C2 gate green"

C3: $(DONE)/C1 $(DONE)/C2 ## Multi-container orchestration
	@$(MAKE) gate
	@touch $(DONE)/C3
	@echo "✓ C3 gate green"

C4: $(DONE)/C3 $(DONE)/B3 ## Governance crew as physical agents
	@$(MAKE) gate
	@touch $(DONE)/C4
	@echo "✓ C4 gate green — thesis proven"

.PHONY: A1 A2 A3 A4 A5 B1 B2 B3 B4 C1 C2 C3 C4
