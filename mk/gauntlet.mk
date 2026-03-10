# ── The Gauntlet — Full Verification Pipeline ─────────────────
#
# Sequential: gate → darkcats → pitkeel → status
# Each step writes an attestation to .gauntlet/.
#
# Tiers: full (default), docs, wip
#   make gauntlet                    full tier
#   make gauntlet TIER=docs          docs tier (gate + pitkeel only)
#   make gauntlet TIER=wip           wip tier (gate + pitkeel only)
#
# Variables used (defined in root Makefile):
#   TREE, TREE_FULL, PITCOMMIT

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
