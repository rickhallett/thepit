# components

React components, grouped by domain.

## Structure

- `arena/` — bout viewer, preset cards, arena builder, message cards
- `agents/` — agent catalog, agent builder, agent details
- `engagement/` — share panel, bout hero, reaction buttons
- `leaderboard/` — ranking tables (agent + player)
- `chrome/` — site header, footer, auth controls (shared layout)
- `ui/` — primitives (button, badge — no business logic)

## Rule

Components are grouped by the domain they serve, not by technical layer.
If a component is used by 2+ domains, it goes in `ui/`.
