# Midgets

> Agent-native Linux containers for autonomous software engineering.

## What This Is

A Docker container is an agent's workspace. The agent boots into its own Linux environment, sees the screen, clicks, types, and operates software through a CLI wrapper.

This project builds the infrastructure for agent swarms: multiple containerised agents, each with a defined role, operating in parallel on composable units of software.

## Concept — Proven

A Docker container (Ubuntu 24.04 + Xvfb + fluxbox + xdotool + scrot) where an AI agent can see the screen, click, type, and control applications through a `steer` CLI wrapper. 10/10 tests passed.

```
midgets/
├── Dockerfile          # Ubuntu 24.04, Xvfb, fluxbox, xdotool, scrot, xclip, wmctrl, tmux
├── entrypoint.sh       # Boots Xvfb virtual display at 1280x720x24, starts fluxbox WM
├── steer/steer         # Python CLI: see, click, type, hotkey, scroll, apps, clipboard, screens
└── test-poc.sh         # 10-test end-to-end suite
```

## The Thesis

On Linux, you create bespoke, minimal, agent-native software. The machine is the agent's sandbox.

1. **Agent-native software** — text interfaces, composable primitives, structured feedback. Built for agents, not adapted from human GUI apps.
2. **Operational training** — through trial and error, the human-agent system develops custom conventions that compound over time. Distinct from ML training. The conventions are the primary output.
3. **Linux as agent OS** — Linux never abandoned the CLI. Every GUI is optional. The system is fully operable from a terminal.

## Roadmap

- [x] Container POC (Xvfb + steer wrapper, 10/10)
- [ ] OCR (tesseract)
- [ ] Chromium
- [ ] Drive port (tmux sentinel protocol from mac-mini-agent)
- [ ] Listen port (job server)
- [ ] Agent framework in container (Pi or Claude Code)
- [ ] Multi-container orchestration
- [ ] Governance crew as physical agents

## Infrastructure

**Development machine:** Ryzen 7 6800H, 32GB RAM, Arch Linux. Runs 3-5 midget containers.

**Target cluster:** 6× HP ProDesk 400 G4 Mini (i5-8500T, 16GB, 256GB SSD) on a 2.5GbE switch. k3s. Mixed distros. £80-150 per node from eBay.

## Provenance

Carries forward from [thepit-v2](https://github.com/rickhallett/thepit-v2), where the governance system and research artifacts were developed during a month-long agentic engineering study. The product code is archived on the `phase2` branch. The governance, anti-pattern taxonomy, and context engineering vocabulary are the outputs that carried forward.

**Operator:** Richard Hallett · [OCEANHEART.AI LTD](https://oceanheart.ai) · UK company 16029162

## License

MIT
