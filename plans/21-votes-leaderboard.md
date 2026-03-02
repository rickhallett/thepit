# 21-votes-leaderboard

## Context
depends_on: [20]
produces: [lib/engagement/votes.ts, lib/engagement/leaderboard.ts, app/api/winner-vote/route.ts, app/leaderboard/page.tsx, components/leaderboard/leaderboard-table.tsx, lib/engagement/votes.test.ts, lib/engagement/leaderboard.test.ts]
domain: lib/engagement/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (API Contracts — POST /api/winner-vote, Social Flow, UI Pages — /leaderboard)
- lib/engagement/DOMAIN.md
- db/schema.ts (winner_votes table — UNIQUE(bout_id, user_id))
- db/index.ts (db instance)
- lib/common/api-utils.ts (errorResponse, parseValidBody)
- lib/auth/middleware.ts (requireAuth)

## Task

### 1. Winner votes

Create `lib/engagement/votes.ts`:

```typescript
import { z } from "zod";

export const WinnerVoteRequestSchema = z.object({
  boutId: z.string(),
  agentId: z.string(),
});

export async function castWinnerVote(params: {
  boutId: string;
  userId: string;
  agentId: string;
}): Promise<{ ok: boolean; alreadyVoted: boolean }>
// INSERT INTO winner_votes (bout_id, user_id, agent_id)
// ON CONFLICT (bout_id, user_id) DO NOTHING
// Check rows affected: 0 = already voted, 1 = vote cast

export async function getWinnerVoteCounts(boutId: string): Promise<Map<string, number>>
// SELECT agent_id, COUNT(*) FROM winner_votes WHERE bout_id = boutId GROUP BY agent_id
// Return Map<agentId, count>

export async function getUserWinnerVote(boutId: string, userId: string): Promise<string | null>
// SELECT agent_id FROM winner_votes WHERE bout_id AND user_id
// Return agentId or null
```

### 2. API route

Create `app/api/winner-vote/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  // 1. Require auth (voting requires login)
  const userId = await requireAuth(); // throws if not authed → catch and return 401
  // 2. Parse body with WinnerVoteRequestSchema
  // 3. Rate limit: 60/hr per user (generous but prevents abuse)
  // 4. Call castWinnerVote
  // 5. If alreadyVoted, return 409 with code "ALREADY_VOTED"
  // 6. Return { ok: true }
}
```

Handle the requireAuth throw by wrapping in try/catch and returning `errorResponse(401, "AUTH_REQUIRED", "Sign in to vote")`.

### 3. Leaderboard

Create `lib/engagement/leaderboard.ts`:

```typescript
export type TimeRange = "all" | "week" | "month";

export interface LeaderboardEntry {
  agentId: string;
  agentName: string;
  wins: number;      // bouts where this agent got the most votes
  totalVotes: number;
  boutsParticipated: number;
  rank: number;
}

export async function getLeaderboardData(range: TimeRange): Promise<LeaderboardEntry[]>
```

Implementation:
- Join bouts with winner_votes and agents tables
- For each agent: count total votes, count bouts participated, count "wins" (bouts where agent got the most votes)
- Filter by time range: `all` = no filter, `week` = last 7 days, `month` = last 30 days (based on bout created_at)
- Order by wins DESC, then totalVotes DESC
- Assign rank (1-indexed)
- Return top 50

### 4. Leaderboard page

Create `app/leaderboard/page.tsx`:

```typescript
import { getLeaderboardData } from "@/lib/engagement/leaderboard";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const timeRange = (range === "week" || range === "month") ? range : "all";
  const data = await getLeaderboardData(timeRange);
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
      <LeaderboardTable entries={data} currentRange={timeRange} />
    </main>
  );
}
```

### 5. Leaderboard table component

Create `components/leaderboard/leaderboard-table.tsx`:

```typescript
"use client";
```

- Render a table with columns: Rank, Agent, Wins, Total Votes, Bouts
- Time range tabs: All Time | This Week | This Month (links with query param)
- Client-side search filter (filter by agent name)
- Sortable columns (click header to sort by that column)
- `data-testid="leaderboard-table"` for testing

### 6. Unit tests

Create `lib/engagement/votes.test.ts`:
- Test castWinnerVote success: rows affected = 1
- Test castWinnerVote duplicate: rows affected = 0 → alreadyVoted = true
- Test getWinnerVoteCounts returns correct counts per agent
- Test getUserWinnerVote returns agentId or null

Create `lib/engagement/leaderboard.test.ts`:
- Test getLeaderboardData returns sorted entries
- Test time range filtering (mock different created_at values)
- Test rank assignment is correct
- Test wins calculation (agent with most votes in a bout gets the win)

### Do NOT
- Build a player leaderboard — agent leaderboard only for now
- Add WebSocket real-time updates to the leaderboard
- Create a separate API route for leaderboard — it's server-rendered
- Allow vote changes — one vote per user per bout is permanent

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — votes and leaderboard tests pass
- `app/api/winner-vote/route.ts` requires authentication (returns 401 without it)
- Duplicate vote returns 409
- Leaderboard page renders with time range tabs
- `data-testid="leaderboard-table"` is present
