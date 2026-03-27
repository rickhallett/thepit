# GH Issue #14: Tournament Brackets - Elimination-Style Events

**Dispatched:** 2026-03-12T21:02 UTC
**Type:** Exploration / Design
**Author:** rictus (polecat)
**Labels:** feature, tournaments

## Problem

Bouts are currently one-off events. Tournament brackets would add a structured competitive format with elimination rounds, enabling multi-bout events where agents compete through bracket stages until a champion emerges.

## Acceptance Criteria

- Tournament creation with bracket structure (4/8/16 agents)
- Automatic advancement based on winner votes
- Tournament progress page showing bracket visualization
- Tournament results and history

---

## 1. Current Bout/Arena Architecture Analysis

### Database Schema

The existing schema centers on five core tables:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `bouts` | Bout storage and state | id, presetId, status, transcript, agentLineup, ownerId |
| `agents` | Agent registry | id, name, systemPrompt, tier, promptHash, manifestHash |
| `winnerVotes` | User votes for bout winners | boutId, agentId, userId (unique per user per bout) |
| `reactions` | Per-turn engagement (heart/fire) | boutId, turnIndex, reactionType, userId |
| `users` | User accounts and tiers | id, subscriptionTier, credits |

**Key design patterns:**
- `agentLineup` is JSONB (denormalized) for arena mode - lineups are ephemeral and read alongside bout
- `winnerVotes` enforces one vote per user per bout via unique constraint
- Bout status progression: `running` -> `completed` | `error`
- IDs use nanoid (21 chars) for URL-safe uniqueness

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/run-bout` | POST | Stream bout execution via SSE |
| `/api/v1/bout` | POST | Sync bout execution (Lab tier) |
| `/api/winner-vote` | POST | Record user vote for bout winner |
| `/api/reactions` | POST | Record heart/fire reactions |

**Bout execution flow:**
1. `validateBoutRequest()` - Parse, auth, tier check, credits preauth, idempotency
2. `executeBout()` - Run turn loop, generate transcript, settle credits
3. Stream events via `createUIMessageStream()`

### Page Structure

| Route | Purpose |
|-------|---------|
| `/arena` | Hub - preset grid, tier status, model selector |
| `/bout/[id]` | Replay - transcript, reactions, winner vote |
| `/arena/custom` | Builder - compose custom agent lineups |

### Core Types

```typescript
type TranscriptEntry = { turn: number; agentId: string; agentName: string; text: string }
type ArenaAgent = { id: string; name: string; systemPrompt: string; color?: string }
type Preset = { id: string; name: string; agents: Agent[]; maxTurns: number; tier: string }
type BoutResult = { transcript: TranscriptEntry[]; shareLine: string | null }
```

---

## 2. Proposed Tournament Schema

### New Tables

#### `tournaments`
Primary tournament container.

```sql
CREATE TABLE tournaments (
  id VARCHAR(21) PRIMARY KEY,           -- nanoid
  name VARCHAR(256) NOT NULL,
  description TEXT,
  bracket_size INTEGER NOT NULL,        -- 4, 8, or 16
  status tournament_status NOT NULL,    -- 'pending' | 'active' | 'completed' | 'cancelled'
  current_round INTEGER DEFAULT 1,
  owner_id VARCHAR(128) REFERENCES users(id),
  preset_id VARCHAR(64),                -- Optional: force specific preset for all matches
  topic TEXT,                           -- Optional: shared topic for all matches
  model VARCHAR(128),                   -- Optional: force specific model
  response_length VARCHAR(32),
  response_format VARCHAR(32),
  max_turns INTEGER,
  voting_deadline_minutes INTEGER,      -- Time window for voting per round (NULL = manual)
  champion_agent_id VARCHAR(128),       -- Set when tournament completes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TYPE tournament_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE INDEX tournaments_status_idx ON tournaments(status);
CREATE INDEX tournaments_owner_idx ON tournaments(owner_id);
```

#### `tournament_entries`
Agents participating in tournament with seeding.

```sql
CREATE TABLE tournament_entries (
  id SERIAL PRIMARY KEY,
  tournament_id VARCHAR(21) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  agent_id VARCHAR(128) NOT NULL REFERENCES agents(id),
  seed INTEGER NOT NULL,                -- 1-16 based on bracket position
  eliminated_in_round INTEGER,          -- NULL if still active or champion
  final_position INTEGER,               -- 1 = champion, 2 = runner-up, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, agent_id),
  UNIQUE(tournament_id, seed)
);

CREATE INDEX tournament_entries_tournament_idx ON tournament_entries(tournament_id);
CREATE INDEX tournament_entries_agent_idx ON tournament_entries(agent_id);
```

#### `tournament_matches`
Individual bracket matches linking to bouts.

```sql
CREATE TABLE tournament_matches (
  id SERIAL PRIMARY KEY,
  tournament_id VARCHAR(21) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,               -- 1 = first round, 2 = semi, 3 = final (for 8-bracket)
  bracket_position INTEGER NOT NULL,    -- Position within round (0-indexed)
  agent_a_id VARCHAR(128) REFERENCES agents(id),
  agent_b_id VARCHAR(128) REFERENCES agents(id),
  bout_id VARCHAR(21) REFERENCES bouts(id),
  winner_agent_id VARCHAR(128) REFERENCES agents(id),
  status match_status NOT NULL DEFAULT 'pending',
  vote_count_a INTEGER DEFAULT 0,       -- Cached vote tallies
  vote_count_b INTEGER DEFAULT 0,
  voting_opens_at TIMESTAMP WITH TIME ZONE,
  voting_closes_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tournament_id, round, bracket_position)
);

CREATE TYPE match_status AS ENUM ('pending', 'scheduled', 'running', 'voting', 'completed');
CREATE INDEX tournament_matches_tournament_round_idx ON tournament_matches(tournament_id, round);
CREATE INDEX tournament_matches_bout_idx ON tournament_matches(bout_id);
```

### Entity Relationships

```
tournaments 1--* tournament_entries (agents seeded into tournament)
tournaments 1--* tournament_matches (bracket structure)
tournament_matches 1--1 bouts (each match = one bout)
tournament_matches *--1 agents (winner reference)
bouts 1--* winnerVotes (reuse existing voting)
```

### Bracket Size Math

| Bracket Size | Rounds | Total Matches |
|--------------|--------|---------------|
| 4 | 2 | 3 |
| 8 | 3 | 7 |
| 16 | 4 | 15 |

Formula: `matches = bracket_size - 1`, `rounds = log2(bracket_size)`

---

## 3. Bracket Logic and Advancement Rules

### Bracket Generation

```typescript
function generateBracket(tournamentId: string, agents: Agent[]): TournamentMatch[] {
  const bracketSize = agents.length; // Must be 4, 8, or 16
  const rounds = Math.log2(bracketSize);
  const matches: TournamentMatch[] = [];

  // Round 1: seed matchups (1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15 for 16-bracket)
  const firstRoundPairs = generateSeededPairs(bracketSize);

  for (let i = 0; i < firstRoundPairs.length; i++) {
    const [seedA, seedB] = firstRoundPairs[i];
    matches.push({
      tournamentId,
      round: 1,
      bracketPosition: i,
      agentAId: agents[seedA - 1].id,
      agentBId: agents[seedB - 1].id,
      status: 'pending'
    });
  }

  // Subsequent rounds: placeholder matches (agents filled on advancement)
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let pos = 0; pos < matchesInRound; pos++) {
      matches.push({
        tournamentId,
        round,
        bracketPosition: pos,
        agentAId: null, // TBD
        agentBId: null, // TBD
        status: 'pending'
      });
    }
  }

  return matches;
}
```

### Standard Seeding (16-bracket example)

```
Round 1 Matchups:
  Match 0: Seed 1 vs Seed 16
  Match 1: Seed 8 vs Seed 9
  Match 2: Seed 5 vs Seed 12
  Match 3: Seed 4 vs Seed 13
  Match 4: Seed 3 vs Seed 14
  Match 5: Seed 6 vs Seed 11
  Match 6: Seed 7 vs Seed 10
  Match 7: Seed 2 vs Seed 15
```

This ensures top seeds meet bottom seeds early, and potential 1v2 final.

### Advancement Logic

```typescript
async function advanceWinner(matchId: number): Promise<void> {
  const match = await getMatch(matchId);
  if (match.status !== 'voting') return;

  // Get vote tallies from winnerVotes table
  const votes = await getWinnerVoteCounts(match.boutId);
  const voteA = votes[match.agentAId] || 0;
  const voteB = votes[match.agentBId] || 0;

  // Determine winner (tie-breaker: higher seed wins)
  let winnerId: string;
  if (voteA > voteB) {
    winnerId = match.agentAId;
  } else if (voteB > voteA) {
    winnerId = match.agentBId;
  } else {
    // Tie: higher seed (lower seed number) wins
    const seedA = await getAgentSeed(match.tournamentId, match.agentAId);
    const seedB = await getAgentSeed(match.tournamentId, match.agentBId);
    winnerId = seedA < seedB ? match.agentAId : match.agentBId;
  }

  // Update match
  await updateMatch(matchId, {
    winnerAgentId: winnerId,
    status: 'completed',
    voteCountA: voteA,
    voteCountB: voteB,
    completedAt: new Date()
  });

  // Mark loser as eliminated
  const loserId = winnerId === match.agentAId ? match.agentBId : match.agentAId;
  await updateEntry(match.tournamentId, loserId, {
    eliminatedInRound: match.round
  });

  // Advance winner to next round
  const nextRound = match.round + 1;
  const nextPosition = Math.floor(match.bracketPosition / 2);
  const nextMatch = await getMatch(match.tournamentId, nextRound, nextPosition);

  if (nextMatch) {
    // Determine slot (A or B) based on bracket position parity
    const slot = match.bracketPosition % 2 === 0 ? 'agentAId' : 'agentBId';
    await updateMatch(nextMatch.id, { [slot]: winnerId });

    // If both slots filled, match is ready
    if (nextMatch.agentAId && nextMatch.agentBId) {
      await scheduleMatch(nextMatch.id);
    }
  } else {
    // No next match = this was the final
    await completeTournament(match.tournamentId, winnerId);
  }
}
```

### Voting Window

Two modes:
1. **Timed voting**: `voting_deadline_minutes` set - votes must be cast within window
2. **Manual advancement**: Admin/owner triggers round advancement

```typescript
async function checkVotingDeadlines(): Promise<void> {
  // Cron job runs every minute
  const expiredMatches = await db.query(`
    SELECT * FROM tournament_matches
    WHERE status = 'voting'
    AND voting_closes_at <= NOW()
  `);

  for (const match of expiredMatches) {
    await advanceWinner(match.id);
  }
}
```

---

## 4. API Routes and Page Structure

### New API Routes

#### `POST /api/tournaments`
Create a new tournament.

```typescript
type CreateTournamentRequest = {
  name: string;
  description?: string;
  bracketSize: 4 | 8 | 16;
  agentIds: string[];           // Must match bracketSize
  presetId?: string;
  topic?: string;
  model?: string;
  responseLength?: string;
  responseFormat?: string;
  maxTurns?: number;
  votingDeadlineMinutes?: number;
};

type CreateTournamentResponse = {
  tournament: Tournament;
  matches: TournamentMatch[];
};
```

#### `POST /api/tournaments/[id]/start`
Start tournament (runs first round bouts).

```typescript
// Triggers bout creation for all round 1 matches
// Sets tournament status to 'active'
// Sets match status to 'running' for each
```

#### `GET /api/tournaments/[id]`
Get tournament state with bracket.

```typescript
type TournamentResponse = {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
  currentRoundMatches: MatchWithBout[];
};
```

#### `POST /api/tournaments/[id]/advance`
Manual round advancement (for non-timed tournaments).

```typescript
// Verifies all current round matches are completed
// Calls advanceWinner for each if not already advanced
```

#### `GET /api/tournaments`
List tournaments (with filters).

```typescript
type ListTournamentsRequest = {
  status?: TournamentStatus;
  ownerId?: string;
  limit?: number;
  offset?: number;
};
```

### New Pages

#### `/tournaments` - Tournament Hub
- Active tournaments list
- Create tournament CTA
- Completed tournaments history
- Filtering by status

#### `/tournament/[id]` - Tournament View
- Bracket visualization (SVG or canvas)
- Current round highlight
- Match cards with bout links
- Live voting status
- Champion crown when complete

#### `/tournament/[id]/create` - Tournament Builder
- Name and description
- Bracket size selector (4/8/16)
- Agent picker (search + select)
- Seeding interface (drag to reorder)
- Config options (preset, topic, model, turns)
- Voting mode selector (timed vs manual)

### Component Architecture

```
components/
  tournament/
    Bracket.tsx           -- SVG bracket visualization
    BracketMatch.tsx      -- Single match in bracket
    TournamentCard.tsx    -- List item for tournament
    TournamentHeader.tsx  -- Title, status, champion
    MatchCard.tsx         -- Match detail with voting
    SeedingList.tsx       -- Drag-to-reorder agent seeds
    TournamentBuilder.tsx -- Creation form
```

### Bracket Visualization

```typescript
// Bracket.tsx - SVG-based bracket
type BracketProps = {
  matches: TournamentMatch[];
  bracketSize: 4 | 8 | 16;
  highlightRound?: number;
  onMatchClick?: (matchId: number) => void;
};

// Layout calculation
const MATCH_WIDTH = 200;
const MATCH_HEIGHT = 60;
const ROUND_GAP = 100;
const MATCH_GAP = 20;

function calculateMatchPosition(round: number, position: number, bracketSize: number) {
  const matchesInRound = bracketSize / Math.pow(2, round);
  const roundX = (round - 1) * (MATCH_WIDTH + ROUND_GAP);
  const totalHeight = matchesInRound * (MATCH_HEIGHT + MATCH_GAP);
  const startY = (/* canvas height */ - totalHeight) / 2;
  const matchY = startY + position * (MATCH_HEIGHT + MATCH_GAP);
  return { x: roundX, y: matchY };
}
```

---

## 5. Risk Assessment and Phased Implementation

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vote manipulation | Medium | High | Rate limit, account verification, fraud detection |
| Bout execution failures mid-tournament | Medium | High | Retry logic, manual override, partial rollback |
| Bracket state corruption | Low | Critical | DB transactions, idempotent operations, audit log |
| Voting deadline race conditions | Medium | Medium | DB-level locking, atomic updates |
| UI complexity for bracket visualization | Medium | Medium | Progressive enhancement, mobile-first |
| Credit/cost overruns for multi-bout events | Medium | Medium | Upfront cost estimation, credit reservation |

### Phased Implementation Plan

#### Phase 1: Schema and Core Logic
**Scope:** Database tables, bracket generation, advancement logic

**Deliverables:**
- Drizzle schema for tournaments, entries, matches
- Migrations
- `lib/tournament-bracket.ts` - generation and seeding
- `lib/tournament-advancement.ts` - winner determination and progression
- Unit tests for bracket math and advancement

**Dependencies:** None (additive)

#### Phase 2: Tournament CRUD API
**Scope:** Create, read, update tournament state

**Deliverables:**
- `POST /api/tournaments` - create
- `GET /api/tournaments` - list
- `GET /api/tournaments/[id]` - detail
- `POST /api/tournaments/[id]/start` - begin
- `POST /api/tournaments/[id]/advance` - manual advance
- Integration tests

**Dependencies:** Phase 1

#### Phase 3: Bout Integration
**Scope:** Connect tournament matches to bout execution

**Deliverables:**
- Modify bout creation to accept tournament context
- Auto-populate match bout_id on bout completion
- Vote aggregation for tournament matches
- Automatic advancement on voting window close

**Dependencies:** Phase 2

#### Phase 4: Tournament Pages
**Scope:** User-facing tournament experience

**Deliverables:**
- `/tournaments` hub page
- `/tournament/[id]` bracket view
- `/tournament/[id]/create` builder
- Bracket SVG component
- Match card with voting integration

**Dependencies:** Phase 3

#### Phase 5: Polish and Edge Cases
**Scope:** Production hardening

**Deliverables:**
- Mobile bracket UI
- Tournament notifications
- Admin controls (cancel, reset match)
- Leaderboard integration
- OG/share images for tournaments

**Dependencies:** Phase 4

### Effort Estimate

| Phase | Complexity | Risk |
|-------|------------|------|
| Phase 1 | Low | Low |
| Phase 2 | Low | Low |
| Phase 3 | Medium | Medium |
| Phase 4 | Medium | Low |
| Phase 5 | Low | Low |

### Open Questions

1. **Seeding source**: Manual by creator, or auto-seed from agent leaderboard stats?
2. **Simultaneous bouts**: Run all round matches in parallel, or sequential?
3. **Third-place match**: Include consolation final for 3rd place?
4. **Spectator voting**: Allow non-authenticated users to vote?
5. **Tournament tiers**: Free tier gets 4-bracket only? Premium unlocks 8/16?
6. **Agent reuse**: Can same agent appear in multiple concurrent tournaments?

---

## Provenance

- GitHub: https://github.com/rickhallett/thepit/issues/14
- Created: 2026-03-12
- Dispatched by: Mayor (Gas Town)
- Explored by: rictus (polecat)
