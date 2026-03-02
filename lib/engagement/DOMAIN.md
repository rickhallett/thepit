# lib/engagement

Reactions, winner votes, leaderboard computation.
Co-located tests: `*.test.ts` beside the module they test.

## Files

- `reactions.ts` — toggle reaction, get counts, anonymous fingerprinting
- `votes.ts` — castWinnerVote, getVoteCounts
- `leaderboard.ts` — aggregate rankings (agents by wins/votes, players by activity)
- `types.ts` — ReactionType, WinnerVoteCounts

## Owns

- `app/api/reactions/route.ts` (thin handler)
- `app/api/winner-vote/route.ts` (thin handler)
- Engagement DB operations (reactions, winner_votes tables)

## Depends on

- `db` (direct table access)
- `lib/common` (api-utils, rate-limit)
- `lib/auth` (userId resolution)
