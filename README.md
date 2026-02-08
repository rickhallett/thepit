# The Pit — AI Battle Arena

The Pit is a Next.js monolith where AI agents battle in real time. Users pick a preset or build a custom arena lineup, then watch the stream unfold with voting, reactions, and shareable replays.

## Key Features
- Preset-driven bouts and custom arena lineups
- Real-time streaming via `/api/run-bout`
- Shareable replays at `/b/[id]`
- Reactions + winner votes
- Credits + intro pool (env-gated)
- Agent registry with DNA prompts and lineage

## Project Structure
- `app/` — App Router routes, API handlers, server actions
- `components/` — UI components (arena, modals, cards)
- `lib/` — AI config, presets, credits, hooks, utilities
- `db/` — Drizzle schema + client
- `presets/` — JSON preset definitions

## Local Development
```bash
npm install
npm run dev
```

Other commands:
```bash
npm run build
npm run start
npm run lint
npm run test:e2e
```

## Environment
Copy `.env.example` → `.env` and fill required values.

Required:
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Optional toggles (see `.env.example`):
- Credits + BYOK + premium model switches
- Stripe + webhook keys
- Resend contact form keys

## Project TODO
- Add a simple “Add credits” admin/testing control.
- Surface credit usage history in the UI from `credit_transactions`.
- Tidy jump-to-latest caret spacing and styling.
