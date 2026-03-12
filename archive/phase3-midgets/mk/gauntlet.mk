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
	@if $(MAKE) gate; then \
		$(PITCOMMIT) attest gate --tree $(TREE_FULL) --verdict pass; \
	else \
		$(PITCOMMIT) attest gate --tree $(TREE_FULL) --verdict fail; \
		exit 1; \
	fi

gauntlet-interop:
	@echo "▶ Interop (C2)"
	@if $(MAKE) interop; then \
		$(PITCOMMIT) attest interop --tree $(TREE_FULL) --verdict pass; \
	else \
		$(PITCOMMIT) attest interop --tree $(TREE_FULL) --verdict fail; \
		exit 1; \
	fi

gauntlet-swarm:
	@echo "▶ Swarm (C3)"
	@if $(MAKE) swarm; then \
		$(PITCOMMIT) attest swarm --tree $(TREE_FULL) --verdict pass; \
	else \
		$(PITCOMMIT) attest swarm --tree $(TREE_FULL) --verdict fail; \
		exit 1; \
	fi

gauntlet-crew:
	@echo "▶ Crew (C4)"
	@if $(MAKE) crew-test; then \
		$(PITCOMMIT) attest crew --tree $(TREE_FULL) --verdict pass; \
	else \
		$(PITCOMMIT) attest crew --tree $(TREE_FULL) --verdict fail; \
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
		echo ""; echo "── 1/5 Gate ──"; echo ""; \
	else \
		echo ""; echo "── 1/2 Gate ──"; echo ""; \
	fi
	@$(MAKE) gauntlet-gate
	@if [ "$(TIER)" = "full" ]; then \
		echo ""; \
		echo "── 2/5 Interop ──"; \
		echo ""; \
		$(MAKE) gauntlet-interop; \
	fi
	@if [ "$(TIER)" = "full" ]; then \
		echo ""; \
		echo "── 3/6 Swarm ──"; \
		echo ""; \
		$(MAKE) gauntlet-swarm; \
	fi
	@if [ "$(TIER)" = "full" ]; then \
		echo ""; \
		echo "── 4/6 Crew ──"; \
		echo ""; \
		$(MAKE) gauntlet-crew; \
	fi
	@if [ "$(TIER)" = "full" ]; then \
		echo ""; \
		echo "── 5/6 Darkcat ──"; \
		echo ""; \
		$(MAKE) darkcat-all; \
	fi
	@if [ "$(TIER)" = "full" ]; then \
		echo ""; echo "── 6/6 Pitkeel ──"; \
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
