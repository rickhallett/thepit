# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Next.js App Router routes, server actions, and API handlers.
- `components/` houses reusable UI components (e.g., `components/arena.tsx`).
- `lib/` holds shared utilities and configuration (e.g., AI provider config, presets).
- `db/` contains Drizzle schema and client setup.
- `tests/e2e/` contains Playwright end-to-end tests.
- `public/` is for static assets.

## Build, Test, and Development Commands
- `pnpm run dev` starts the local dev server.
- `pnpm run build` creates a production build.
- `pnpm run start` runs the production build locally.
- `pnpm run lint` runs ESLint.
- `pnpm run typecheck` runs TypeScript type checking.
- `pnpm run test:unit` runs unit + API tests (425 tests).
- `pnpm run test:ci` runs lint + typecheck + unit + integration.
- `pnpm run test:e2e` runs Playwright tests. Set `BASE_URL` to target a deployed instance.

## Coding Style & Naming Conventions
- TypeScript (strict) is the default; prefer typed objects over `any`.
- Indentation: 2 spaces.
- React components: PascalCase filenames and exports.
- Utilities and hooks: `camelCase` (e.g., `lib/use-bout.ts`).
- Keep Tailwind class lists readable; use `clsx` + `tailwind-merge` when combining.

## Testing Guidelines
- E2E tests use Playwright and live in `tests/e2e/`.
- Naming: `*.spec.ts` (e.g., `tests/e2e/bout.spec.ts`).
- Favor fast, behavior-driven checks (e.g., streaming emits text).

## Commit & Pull Request Guidelines
- Use atomic commits.
- Commit messages must follow Conventional Commits (e.g., `feat: ...`, `fix: ...`, `chore: ...`).
- Do not add LLM attribution or co-authorship lines in commit messages.
- PRs should include a clear summary, test evidence, and UI screenshots for visual changes.

## Security & Configuration Tips
- Local secrets live in `.env` (do not commit).
- Required env vars include `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
- When rotating keys, update local `.env` and deployment envs consistently.
