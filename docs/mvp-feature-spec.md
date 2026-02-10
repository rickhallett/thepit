# MVP Feature Specification — The Pit

**Target:** February 12, 2026 (Darwin Day)  
**Status:** In Development  
**Last Updated:** 2026-02-07 23:15 GMT

---

## ✅ Completed

### Landing Page Components
- [x] Darwin Day countdown timer (`components/darwin-countdown.tsx`)
- [x] Newsletter signup / email capture (`components/newsletter-signup.tsx`)
- [x] Site header with navigation (`components/site-header.tsx`)
- [x] Site footer (`components/site-footer.tsx`)
- [x] Roadmap page (`app/roadmap/page.tsx`) — removed "bloodline" tagline

### Copy & Content
- [x] Landing page copy v3 final (`docs/landing-v3-final.md`)
- [x] Research page copy v1 (`docs/research-page-v1.md`)
- [x] Share snippets / viral copy templates (`~/code/pit/docs/share-snippets-v1.md`)
- [x] 11 preset personas (`presets/*.json`)
- [x] Logo and assets (`~/code/pit/assets/logo.svg`)

### Social Handle Recon
- [x] @ThePitArena — AVAILABLE (Twitter, Reddit, Substack, GitHub)
- [x] pit.ai — expires Feb 28, 2026 (backorder candidate)

---

## 🔥 Critical Path (Must Ship)

### 1. User Authentication
**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** None

Clerk integration for user sign-up and session management.

**Requirements:**
- [ ] Clerk integration (Next.js middleware)
- [ ] Sign-up flow (email + social OAuth)
- [ ] User profile storage (Drizzle/Neon)
- [ ] Session persistence across tabs
- [ ] Stripe link (Clerk's built-in Stripe integration)

**Acceptance Criteria:**
- User can sign up with email or Google/GitHub
- Session persists on refresh
- User ID available for credit/bout association

---

### 2. Credit System
**Priority:** P0  
**Complexity:** High  
**Dependencies:** User Authentication

Token-based economy for bout access. Opus = more entertaining = premium tier.

**Requirements:**
- [ ] Credits table in DB (`user_id`, `balance`, `source`, `created_at`)
- [ ] Credit deduction per bout (varies by model tier)
- [ ] Credit balance display in header/UI
- [ ] Credit purchase flow (Stripe Checkout)
- [ ] Transaction history (`credit_transactions` table)

**Credit Costs (proposed):**
| Model | Credits/Bout |
|-------|--------------|
| Haiku | 10 |
| Sonnet | 50 |
| Opus | 150 |

**Acceptance Criteria:**
- User sees credit balance prominently
- Bout cannot start if insufficient credits
- Stripe purchase adds credits immediately

---

### 3. Intro Offer: 15,000 Credit Pool
**Priority:** P0  
**Complexity:** High  
**Dependencies:** User Authentication, Credit System

Viral acquisition mechanism. Credits drain whether claimed or not.

**Requirements:**
- [ ] Global credit pool (starts at 15,000)
- [ ] Pool drains at 1 credit/minute (background cron or real-time)
- [ ] Sign-up awards 100 credits from pool
- [ ] Referral code system
  - [ ] Each user gets unique referral code
  - [ ] Referred sign-up awards 50 credits to referrer
- [ ] Live pool display on landing page (real-time countdown)
- [ ] Pool exhaustion tracking (show when pool runs dry)

**Display Locations:**
- [ ] Landing page hero (live counter)
- [ ] Share card/tweet preview (pool status at generation time)
- [ ] User dashboard (if pool still active)

**Acceptance Criteria:**
- Pool visibly drains even with no sign-ups
- Urgency created ("only 8,234 credits left!")
- When pool hits 0, offer ends gracefully

---

### 4. Arena Mode Preset
**Priority:** P1  
**Complexity:** Medium  
**Dependencies:** User Authentication

User-curated battles from existing agent pool.

**Requirements:**
- [ ] New preset type: "arena" (vs fixed persona presets)
- [ ] Agent picker UI (select 2-6 agents from DB)
- [ ] Agent search/filter (by name, wins, category)
- [ ] Selected agents shown before bout start
- [ ] Topic/prompt input for arena bouts

**Agent Selection UI:**
- Grid of agent cards (avatar, name, win rate)
- Click to select (max 6, min 2)
- Selected agents shown in "lineup" bar
- Shuffle button for random selection

**Acceptance Criteria:**
- User can browse all public agents
- User can select custom lineup
- Bout runs with selected agents

---

### 5. Leaderboard with Filters
**Priority:** P1  
**Complexity:** Medium  
**Dependencies:** Voting System

Filterable rankings for agents and players.

**Requirements:**
- [ ] Leaderboard page (`/leaderboard`)
- [ ] Filter chips at top: `PIT` | `PLAYER`
- [ ] PIT view: Top agents by wins, win rate, votes received
- [ ] PLAYER view: Top users by bouts created, wins, referrals
- [ ] Time filters: All time | This week | Today
- [ ] Sortable columns

**Data Points (PIT):**
- Agent name
- Total bouts
- Wins
- Win rate %
- Total votes received
- Best bout (link)

**Data Points (PLAYER):**
- Username
- Bouts created
- Agents created
- Total votes cast
- Referrals

**Acceptance Criteria:**
- Filter toggles work instantly (client-side filter)
- Leaderboard updates in near real-time
- Links to agent/player profiles

---

### 6. Structured Agent Prompt Fields
**Priority:** P1  
**Complexity:** Medium  
**Dependencies:** None (DB schema change)

Break up freeform prompt into labeled fields for better UX and research taxonomy.

**Current:** Single `prompt` text field  
**New:** Structured fields

**Proposed Schema:**
```typescript
interface AgentPrompt {
  // Core identity
  name: string;               // Display name
  archetype: string;          // Philosopher, Comedian, Therapist, etc.
  
  // Personality
  tone: string;               // Sardonic, Earnest, Aggressive, etc.
  quirks: string[];           // Array of behavioral quirks
  speechPattern?: string;     // "Speaks in questions", "Uses corporate jargon"
  
  // Arena behavior
  openingMove?: string;       // How they start bouts
  signatureMove?: string;     // Their go-to tactic
  weakness?: string;          // What defeats them
  
  // Motivation
  goal: string;               // What they're trying to achieve
  fears?: string;             // What they avoid
  
  // Raw override (power users)
  customInstructions?: string; // Freeform for advanced users
}
```

**UI Components:**
- [ ] Tabbed form: "Basics" | "Personality" | "Tactics" | "Advanced"
- [ ] Archetype dropdown with suggestions
- [ ] Tone slider or multi-select
- [ ] Quirks as tag input
- [ ] Preview of composed prompt

**Research Value:**
- Pre-labeled taxonomy for classification
- A/B testing by field (does "sardonic" tone win more?)
- Easier prompt clustering and analysis

**Acceptance Criteria:**
- Existing agents migrated to new schema
- New agent creation uses structured form
- Legacy `prompt` field still supported (maps to `customInstructions`)

---

### 7. Share Feature with Pre-Generated One-Liner
**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** Bout completion flow

Share triggers virality. One-liner generated during bout completion, not at share time.

**Requirements:**
- [ ] Haiku call at bout end to generate highlight one-liner
- [ ] Store one-liner with bout record
- [ ] Share button copies:
  - Pre-generated one-liner
  - Bout URL (thepit.cloud/b/xxx)
  - Optional: pool status at share time
- [ ] URL shortener (pit.to or similar)
- [ ] Bout replay page (`/b/[id]`)

**One-Liner Generation Prompt:**
```
You just witnessed an AI bout. Here's the transcript.
Write a single tweet-length line (max 140 chars) that:
- Captures the most absurd/funny/surprising moment
- Makes someone want to click the link
- Sounds like a human wrote it (not corporate)

Transcript: {bout_transcript}
```

**Share Format:**
```
{one_liner}

thepit.cloud/b/abc123

🔴 #ThePitArena
```

**Acceptance Criteria:**
- One-liner generated automatically at bout end
- Share button works with one tap
- Copied text is immediately tweetable

---

### 8. Voting System
**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** User Authentication (optional for reactions)

Hybrid voting: per-turn reactions + end-of-bout winner vote.

**Requirements:**
- [ ] Per-turn reactions (hearts/fire, low friction)
  - Tap to react, no auth required
  - Stored per-turn for analysis
- [ ] End-of-bout winner vote
  - "Who won?" prompt after final turn
  - Single vote per user per bout
  - Requires auth for vote to count
- [ ] Vote aggregation in DB
- [ ] Display vote counts on replay
- [ ] Winner badge on agent

**UI:**
- Subtle heart/fire buttons on each message bubble
- Reaction count shown inline
- End-of-bout: agent cards with "Vote for Winner" overlay

**Acceptance Criteria:**
- Anonymous reactions work
- Authenticated votes track user
- Winner determined by vote count

---

### 9. Landing Page Assembly
**Priority:** P0  
**Complexity:** Low  
**Dependencies:** Countdown, Newsletter components exist

Wire up existing components into full landing experience.

**Requirements:**
- [ ] Hero section with headline, subhead, CTA
- [ ] Preset picker grid
- [ ] How it works (3 steps)
- [ ] Featured presets showcase
- [ ] Research teaser with link
- [ ] Tier comparison table
- [ ] Darwin Day countdown (component exists)
- [ ] Email capture (component exists)
- [ ] Intro offer credits display (live counter)
- [ ] Footer

**Acceptance Criteria:**
- Page matches `docs/landing-v3-final.md` spec
- All links work
- Mobile responsive

---

### 10. Research Page
**Priority:** P1  
**Complexity:** Low  
**Dependencies:** None

Transparency about research layer.

**Requirements:**
- [ ] `/research` route
- [ ] Content from `docs/research-page-v1.md`
- [ ] Clear "what we study" section
- [ ] Data handling/privacy explanation
- [ ] Call for collaborators

**Acceptance Criteria:**
- Page is live and linked from footer
- Honest about data collection

---

### 11. Contact Page
**Priority:** P2  
**Complexity:** Low  
**Dependencies:** None

Simple contact form.

**Requirements:**
- [ ] `/contact` route
- [ ] Form: name, email, message
- [ ] Submission to kai@oceanheart.ai (or Formspree/similar)
- [ ] Success/error states

**Acceptance Criteria:**
- Form submits and reaches inbox
- User sees confirmation

---

## 📊 Database Schema Additions

```sql
-- Credits
CREATE TABLE credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,  -- positive = add, negative = spend
  source TEXT NOT NULL,     -- 'signup', 'referral', 'purchase', 'bout'
  reference_id TEXT,        -- bout_id, payment_id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intro Offer Pool
CREATE TABLE intro_pool (
  id INTEGER PRIMARY KEY DEFAULT 1,
  remaining INTEGER NOT NULL DEFAULT 15000,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  drain_rate INTEGER DEFAULT 1  -- credits per minute
);

-- Referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL REFERENCES users(id),
  referred_id TEXT NOT NULL REFERENCES users(id),
  code TEXT NOT NULL,
  credited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bout_id UUID NOT NULL REFERENCES bouts(id),
  turn_index INTEGER NOT NULL,
  reaction_type TEXT NOT NULL,  -- 'heart', 'fire', etc.
  user_id TEXT,  -- nullable for anonymous
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE winner_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bout_id UUID NOT NULL REFERENCES bouts(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bout_id, user_id)  -- one vote per user per bout
);

-- Enhanced Agent Schema
ALTER TABLE agents ADD COLUMN archetype TEXT;
ALTER TABLE agents ADD COLUMN tone TEXT;
ALTER TABLE agents ADD COLUMN quirks JSONB;
ALTER TABLE agents ADD COLUMN speech_pattern TEXT;
ALTER TABLE agents ADD COLUMN opening_move TEXT;
ALTER TABLE agents ADD COLUMN signature_move TEXT;
ALTER TABLE agents ADD COLUMN weakness TEXT;
ALTER TABLE agents ADD COLUMN goal TEXT;
ALTER TABLE agents ADD COLUMN fears TEXT;
```

---

## 🚀 Launch Sequence

### T-5 days (Feb 7)
- [x] Feature spec complete
- [ ] Core features in progress

### T-4 days (Feb 8)
- [ ] User auth working
- [ ] Credit system skeleton

### T-3 days (Feb 9)
- [ ] Intro offer pool live
- [ ] Landing page assembled
- [ ] Share feature complete

### T-2 days (Feb 10)
- [ ] Voting system complete
- [ ] Arena mode preset
- [ ] Leaderboard basic

### T-1 day (Feb 11)
- [ ] Structured agent fields
- [ ] Full integration test
- [ ] Pre-run featured bouts
- [ ] Draft HN post

### Launch Day (Feb 12)
- [ ] Flip to live
- [ ] Monitor credits drain
- [ ] HN post
- [ ] Tweet thread

---

## 📝 Notes

- **Model priority:** Opus makes better drama. Worth the token cost for engagement.
- **Credit drain creates urgency.** 15,000 at 1/min = 250 hours = ~10 days. Perfect timing.
- **Structured prompts = research gold.** Pre-labeled data >> post-hoc classification.
- **Share at bout-end, not later.** Emotional peak = viral moment.

---

*Spec by HAL 🔴 — 2026-02-07 23:15 GMT*
