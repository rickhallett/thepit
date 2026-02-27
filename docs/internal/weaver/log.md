# Weaver's Log

> Successes and mistakes, recorded so the next window doesn't repeat them.

## Format

Each entry: date, type (SUCCESS | MISTAKE | PATTERN), one-line summary, optional detail.

---

## Entries

| Date | Type | Summary |
|------|------|---------|
| 2026-02-27 | SUCCESS | Context audit: 52 → 7 depth-1 files. O(1) triage table format enabled Captain to approve 7 decisions in one pass. |
| 2026-02-27 | SUCCESS | Terminal HUD bridging agent and human via shared `.keel-state`. All 13 fields live. |
| 2026-02-27 | PATTERN | Captain responds fastest to numbered tables with a "my default" column. This is now called a Muster (SD-201). |
| 2026-02-27 | SUCCESS | SD-195 `[context-audit]` 52 → 7 depth-1 files. Cleared the breakfast table. Valuable because it directly reduced the Captain's cognitive load on every session open — the research paper confirmed what he already knew independently. |
| 2026-02-27 | SUCCESS | SD-196 `[crew-prune]` Ghost crew, stale branches, lexicon rename, operational models elevated. Valuable because it removed phantom entries that had been silently consuming scan time — dead references are worse than no references. |
| 2026-02-27 | SUCCESS | SD-197 `[hud-terminal]` Python HUD + SD label convention. Valuable because it gave the Captain a persistent, glanceable external monitor — reducing the need to ask the agent "where are we?" and freeing ingress for O(1) decisions. |
| 2026-02-27 | SUCCESS | SD-198 `[hud-state]` .keel-state as shared bridge between agent and terminal. Valuable because it collapsed the gap between what the agent knows and what the Captain can see without asking — the shared file is the handshake. |
| 2026-02-27 | SUCCESS | SD-199 `[weaver-log]` Personal directory, learning log, boot-sequence diagram. Valuable because the Captain could see the full wiring diagram and confirm the system matched his mental model — the map and territory aligned. |
| 2026-02-27 | SUCCESS | SD-200 `[state-history]` Clone-before-write on .keel-state. Valuable because it turns ephemeral runtime state into an append-only audit trail — if the context window dies, the conditions at each gate run survive. |
| 2026-02-27 | SUCCESS | SD-201 `[slopodar-flag]` Provenance headers on v0.1 docs. Valuable because the meta-humour hit the sweet spot — an AI flagging its own output as untrustworthy is exactly the honesty signal that earns trust from veterans. |
| 2026-02-27 | SUCCESS | SD-202 `[muster-term]` "Muster" adopted for O(1) triage. Valuable because it gave a name to a pattern the Captain was already using, making it requestable — naming a pattern is what turns a habit into a tool. |
| 2026-02-27 | SUCCESS | SD-203 `[commit-trailers]` Always-on git trailers. Valuable because deterministic beats selective — the Captain identified the reliability question before implementation and chose the option with zero failure modes. Record over aesthetics. |
