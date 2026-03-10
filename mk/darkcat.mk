# ── Darkcat — Adversarial Review Pipeline ─────────────────────
#
# DEV → DARKCAT{claude,openai,gemini} → SYNTH
# See: docs/internal/the-gauntlet.md
#
# Invocation:
#   make darkcat           DC-1 (Claude)
#   make darkcat-openai    DC-2 (OpenAI/Codex)
#   make darkcat-gemini    DC-3 (Gemini)
#   make darkcat-synth     Convergence synthesis
#   make darkcat-all       DC pair (claude + codex)
#   make darkcat-ref REF=<commit>  Ad-hoc review
#
# Variables used (defined in root Makefile):
#   LOGS, TREE, TREE_FULL, DARKCAT_PROMPT, DARKCAT_SYNTH_PROMPT,
#   DARKCAT_TIMEOUT, PITCOMMIT

# DC-1: Claude
darkcat:
	@echo "▶ DC-1 (Claude) — $(TREE)"
	@timeout $(DARKCAT_TIMEOUT) claude -p "$$(cat $(DARKCAT_PROMPT))" \
		--allowedTools "Bash(git:*) Read" \
		> $(LOGS)/dc-$(TREE)-claude.log 2>&1
	@echo "  → $(LOGS)/dc-$(TREE)-claude.log"
	@grep -E '^[#]{3} \[SEVERITY' $(LOGS)/dc-$(TREE)-claude.log | sed 's/^[#]*/   /' || true
	@grep -E '^(Findings:|Verdict:)' $(LOGS)/dc-$(TREE)-claude.log | sed 's/^/  /' || true
	@$(PITCOMMIT) attest dc-claude --tree $(TREE_FULL) --log $(LOGS)/dc-$(TREE)-claude.log

# DC-2: OpenAI (Codex)
darkcat-openai:
	@echo "▶ DC-2 (OpenAI) — $(TREE)"
	@timeout $(DARKCAT_TIMEOUT) codex exec --sandbox read-only \
		"$$(cat $(DARKCAT_PROMPT))" \
		> $(LOGS)/dc-$(TREE)-openai.log 2>&1
	@echo "  → $(LOGS)/dc-$(TREE)-openai.log"
	@grep -E '^[#]{3} \[SEVERITY' $(LOGS)/dc-$(TREE)-openai.log | sed 's/^[#]*/   /' || true
	@grep -E '^(Findings:|Verdict:)' $(LOGS)/dc-$(TREE)-openai.log | sed 's/^/  /' || true
	@$(PITCOMMIT) attest dc-openai --tree $(TREE_FULL) --log $(LOGS)/dc-$(TREE)-openai.log

# DC-3: Gemini
darkcat-gemini:
	@echo "▶ DC-3 (Gemini) — $(TREE)"
	@timeout $(DARKCAT_TIMEOUT) gemini -y -p \
		"$$(cat $(DARKCAT_PROMPT))" \
		> $(LOGS)/dc-$(TREE)-gemini.log 2>&1
	@echo "  → $(LOGS)/dc-$(TREE)-gemini.log"
	@grep -E '^[#]{3} \[SEVERITY' $(LOGS)/dc-$(TREE)-gemini.log | sed 's/^[#]*/   /' || true
	@grep -E '^(Findings:|Verdict:)' $(LOGS)/dc-$(TREE)-gemini.log | sed 's/^/  /' || true
	@$(PITCOMMIT) attest dc-gemini --tree $(TREE_FULL) --log $(LOGS)/dc-$(TREE)-gemini.log

# Darkcat pair — dc-claude + dc-openai (codex).
# DC-3 (gemini) deferred: hangs in pipe mode (2 failure modes, v0.32.1).
# Restore triad with: $(MAKE) -j3 darkcat darkcat-openai darkcat-gemini
darkcat-all:
	@$(MAKE) -j2 darkcat darkcat-openai
	@echo ""
	@echo "  ✓ Darkcat complete (claude + codex)"

# DC-SYNTH: Convergence synthesis (4th polecat, Operator's choice of harness)
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
