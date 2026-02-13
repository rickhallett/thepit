# THE PIT - Comprehensive QA Report

```yaml
---
version: "1.0.0"
generated: "2026-02-13"
application: "THE PIT - AI Battle Arena"
total_categories: 13
legend:
  qa: "x = tested, _ = not tested"
  func: "x = working, _ = not verified"
  broken: "x = broken, _ = not broken"
pattern: "- [ ] `[qa:_][func:_][broken:_]` **{ID}**: {story}"
---
```

---

## 1. Navigation & Layout

### 1.1 Site Header

- [ ] `[qa:_][func:_][broken:_]` **NAV-001**: As a user, I can see the site logo "THE PIT" which links to home page
  - Expected: Logo visible in header, clicking navigates to `/`

- [ ] `[qa:_][func:_][broken:_]` **NAV-002**: As a user, I can see navigation links: Home, Arena, All agents, Leaderboard, Research, Roadmap, Contact, Feedback
  - Expected: 8 navigation links visible in desktop header

- [ ] `[qa:_][func:_][broken:_]` **NAV-003**: As a user, I can see the current page highlighted in the navigation
  - Expected: Active page link has accent color border

- [ ] `[qa:_][func:_][broken:_]` **NAV-004**: As a mobile user, I can tap hamburger menu to open navigation drawer
  - Expected: Menu icon visible on mobile, opens drawer with all nav links

- [ ] `[qa:_][func:_][broken:_]` **NAV-005**: As a mobile user, I can see auth controls (sign in/out) in the mobile drawer
  - Expected: Sign in/Sign up buttons visible in mobile drawer when not authenticated

- [ ] `[qa:_][func:_][broken:_]` **NAV-006**: As a mobile user, tapping a nav link closes the drawer
  - Expected: Drawer closes after navigation link click

### 1.2 Site Footer

- [ ] `[qa:_][func:_][broken:_]` **NAV-007**: As a user, I can access Privacy, Terms, Disclaimer, Security links from footer
  - Expected: Footer contains links to legal pages

- [ ] `[qa:_][func:_][broken:_]` **NAV-008**: As a user, I can see copyright notice in footer
  - Expected: Copyright text displayed

---

## 2. Authentication

### 2.1 Sign In

- [ ] `[qa:_][func:_][broken:_]` **AUTH-001**: As an anonymous user, I can see "Sign In" button in header
  - Expected: Sign In button visible when not authenticated

- [ ] `[qa:_][func:_][broken:_]` **AUTH-002**: As an anonymous user, I can click Sign In to open Clerk modal
  - Expected: Clerk sign-in modal opens on click

- [ ] `[qa:_][func:_][broken:_]` **AUTH-003**: As a user, I can sign in with email/password
  - Expected: Email/password authentication works

- [ ] `[qa:_][func:_][broken:_]` **AUTH-004**: As a user, I can sign in with Google OAuth
  - Expected: Google SSO redirects and authenticates

- [ ] `[qa:_][func:_][broken:_]` **AUTH-005**: As a user, after signing in I am redirected to my original page
  - Expected: `redirect_url` parameter honored after auth

### 2.2 Sign Up

- [ ] `[qa:_][func:_][broken:_]` **AUTH-006**: As an anonymous user, I can see "Sign Up" button in header
  - Expected: Sign Up button visible when not authenticated

- [ ] `[qa:_][func:_][broken:_]` **AUTH-007**: As a new user, I can create account with email
  - Expected: Email registration creates new account

- [ ] `[qa:_][func:_][broken:_]` **AUTH-008**: As a new user, my profile is synced to local database
  - Expected: `users` table contains email, displayName, imageUrl after signup

- [ ] `[qa:_][func:_][broken:_]` **AUTH-009**: As a new user with referral code, the code is tracked
  - Expected: `?ref=CODE` sets `pit_ref` cookie for 30 days

### 2.3 Session Management

- [ ] `[qa:_][func:_][broken:_]` **AUTH-010**: As an authenticated user, I can see my avatar/user button in header
  - Expected: Clerk UserButton replaces Sign In/Up buttons

- [ ] `[qa:_][func:_][broken:_]` **AUTH-011**: As an authenticated user, I can click avatar to see account menu
  - Expected: Dropdown shows profile, settings, sign out options

- [ ] `[qa:_][func:_][broken:_]` **AUTH-012**: As an authenticated user, I can sign out
  - Expected: Clicking sign out clears session, redirects to home

- [ ] `[qa:_][func:_][broken:_]` **AUTH-013**: As a user, my session persists across page refreshes
  - Expected: Clerk JWT maintains session state

---

## 3. Home Page

### 3.1 Hero Section

- [ ] `[qa:_][func:_][broken:_]` **HOME-001**: As a visitor, I see the hero title "Where agents collide"
  - Expected: Large hero text visible above fold

- [ ] `[qa:_][func:_][broken:_]` **HOME-002**: As a visitor, I can click "Enter the Arena" CTA
  - Expected: Button navigates to `/arena`

- [ ] `[qa:_][func:_][broken:_]` **HOME-003**: As a visitor, I can click "How It Works" link
  - Expected: Scrolls to or navigates to explanation section

### 3.2 How It Works

- [ ] `[qa:_][func:_][broken:_]` **HOME-004**: As a visitor, I can see 4-step journey: Pick, Watch, Decide, Clone
  - Expected: 4 cards explaining the user journey

### 3.3 Featured Presets

- [ ] `[qa:_][func:_][broken:_]` **HOME-005**: As a visitor, I can see featured preset highlights
  - Expected: Grid shows Darwin Special, Roast Battle, Last Supper, On the Couch

- [ ] `[qa:_][func:_][broken:_]` **HOME-006**: As a visitor, I can click a featured preset to launch it
  - Expected: Clicking preset card navigates to arena or launches bout

### 3.4 Pricing Section

- [ ] `[qa:_][func:_][broken:_]` **HOME-007**: As a visitor, I can see 3-tier pricing: Free, Pit Pass, Pit Lab
  - Expected: Pricing cards show £0, £3/mo, £10/mo

- [ ] `[qa:_][func:_][broken:_]` **HOME-008**: As a visitor, I can see feature comparison between tiers
  - Expected: Bouts/day, models, agents listed per tier

### 3.5 Newsletter

- [ ] `[qa:_][func:_][broken:_]` **HOME-009**: As a visitor, I can enter email to subscribe to newsletter
  - Expected: Email input field with "Notify me" button

- [ ] `[qa:_][func:_][broken:_]` **HOME-010**: As a visitor, submitting email shows success message
  - Expected: "You're on the list" confirmation after valid email

- [ ] `[qa:_][func:_][broken:_]` **HOME-011**: As a visitor, submitting invalid email shows error
  - Expected: Validation error for malformed email

---

## 4. Arena Page

### 4.1 Header & Status

- [ ] `[qa:_][func:_][broken:_]` **ARENA-001**: As an authenticated user, I see my tier badge (Free/Pit Pass/Pit Lab)
  - Expected: Badge shows current subscription tier

- [ ] `[qa:_][func:_][broken:_]` **ARENA-002**: As a free tier user, I see "X of 15 lifetime bouts remaining"
  - Expected: Lifetime bout counter visible for free tier

- [ ] `[qa:_][func:_][broken:_]` **ARENA-003**: As an authenticated user, I see my credit balance
  - Expected: Credits displayed in header when CREDITS_ENABLED

- [ ] `[qa:_][func:_][broken:_]` **ARENA-004**: As a user, I see the intro pool counter with drain rate
  - Expected: "Intro pool: X credits left" with live countdown

- [ ] `[qa:_][func:_][broken:_]` **ARENA-005**: As a user, I see the free bout pool counter (X of Y daily)
  - Expected: FreeBoutCounter shows used/max bouts

### 4.2 Preset Cards

- [ ] `[qa:_][func:_][broken:_]` **ARENA-006**: As a user, I can see all available presets in a grid
  - Expected: 22+ preset cards displayed in 2-column grid

- [ ] `[qa:_][func:_][broken:_]` **ARENA-007**: As a user, I can see preset name, description, and agent colors
  - Expected: Each card shows preset metadata

- [ ] `[qa:_][func:_][broken:_]` **ARENA-008**: As a user, I can see "Premium" badge on premium presets
  - Expected: Premium tier presets have accent-colored badge

- [ ] `[qa:_][func:_][broken:_]` **ARENA-009**: As a user, I can enter an optional topic for the bout
  - Expected: Topic input field in preset card

- [ ] `[qa:_][func:_][broken:_]` **ARENA-010**: As a user, I can select response length (short/standard/long)
  - Expected: Dropdown with 3 length options

- [ ] `[qa:_][func:_][broken:_]` **ARENA-011**: As a user, I can select response format (plain/verse/roast)
  - Expected: Dropdown with 3 format options

- [ ] `[qa:_][func:_][broken:_]` **ARENA-012**: As a premium user, I can select model (Haiku/Sonnet/Opus)
  - Expected: Model dropdown shows available models per tier

- [ ] `[qa:_][func:_][broken:_]` **ARENA-013**: As a BYOK user, I can enter my Anthropic API key
  - Expected: Password input appears when BYOK model selected

- [ ] `[qa:_][func:_][broken:_]` **ARENA-014**: As a user, I can see estimated credit cost per model
  - Expected: Credit cost badges show "Haiku X cr, Sonnet Y cr"

- [ ] `[qa:_][func:_][broken:_]` **ARENA-015**: As a user, clicking "Enter" button launches the bout
  - Expected: Form submits, redirects to `/bout/[id]`

### 4.3 Custom Arena Link

- [ ] `[qa:_][func:_][broken:_]` **ARENA-016**: As a user, I can click "Build your own lineup" card
  - Expected: Card navigates to `/arena/custom`

### 4.4 Subscription Section

- [ ] `[qa:_][func:_][broken:_]` **ARENA-017**: As an unauthenticated user, I see "Sign up to subscribe" links
  - Expected: Links point to `/sign-up?redirect_url=/arena#upgrade`

- [ ] `[qa:_][func:_][broken:_]` **ARENA-018**: As a free tier user, I see "Subscribe" buttons for Pass and Lab
  - Expected: Two subscription cards with pricing

- [ ] `[qa:_][func:_][broken:_]` **ARENA-019**: As a paid user, I see "Manage subscription" link
  - Expected: Link opens Stripe billing portal

### 4.5 Credit Packs

- [ ] `[qa:_][func:_][broken:_]` **ARENA-020**: As a user, I can see credit pack options with prices
  - Expected: Starter (£3/300cr), Plus (£8/800cr) cards

- [ ] `[qa:_][func:_][broken:_]` **ARENA-021**: As an authenticated user, clicking "Buy" opens Stripe checkout
  - Expected: Redirect to Stripe payment page

### 4.6 Credit History

- [ ] `[qa:_][func:_][broken:_]` **ARENA-022**: As an authenticated user, I can see my last 12 credit transactions
  - Expected: Table shows date, source, delta, reference

### 4.7 Anonymous Bout Flow

- [ ] `[qa:_][func:_][broken:_]` **ARENA-023**: As an anonymous user during intro pool, I can launch a bout
  - Expected: Bout creation succeeds without sign-in when pool has credits

- [ ] `[qa:_][func:_][broken:_]` **ARENA-024**: As an anonymous user when intro pool exhausted, I am redirected to sign-in
  - Expected: Redirect to `/sign-in?redirect_url=/arena`

---

## 5. Bout Streaming

### 5.1 Bout Initialization

- [ ] `[qa:_][func:_][broken:_]` **BOUT-001**: As a user, navigating to `/bout/[id]` shows "Warming up" status
  - Expected: Status badge shows "Warming up" initially

- [ ] `[qa:_][func:_][broken:_]` **BOUT-002**: As a user, the bout automatically starts streaming
  - Expected: `useBout` hook initiates fetch to `/api/run-bout`

### 5.2 Live Streaming

- [ ] `[qa:_][func:_][broken:_]` **BOUT-003**: As a user, I see agent turns appear in sequence
  - Expected: Each turn shows agent name, color badge, then streaming text

- [ ] `[qa:_][func:_][broken:_]` **BOUT-004**: As a user, I see text stream character-by-character
  - Expected: Text deltas render progressively, not all at once

- [ ] `[qa:_][func:_][broken:_]` **BOUT-005**: As a user, the active agent is highlighted
  - Expected: Current speaker has visual emphasis

- [ ] `[qa:_][func:_][broken:_]` **BOUT-006**: As a user, the page auto-scrolls to follow new content
  - Expected: Viewport scrolls as new text appears

- [ ] `[qa:_][func:_][broken:_]` **BOUT-007**: As a user, I can toggle auto-scroll off
  - Expected: Toggle button disables auto-scroll behavior

### 5.3 Bout Completion

- [ ] `[qa:_][func:_][broken:_]` **BOUT-008**: As a user, when bout completes I see "Complete" status
  - Expected: Status badge changes to "Complete"

- [ ] `[qa:_][func:_][broken:_]` **BOUT-009**: As a user, I see the share line quote generated
  - Expected: AI-generated quote appears (max 140 chars)

### 5.4 Reactions

- [ ] `[qa:_][func:_][broken:_]` **BOUT-010**: As a user, I can click heart ❤️ reaction on any turn
  - Expected: Heart icon clickable, count increments

- [ ] `[qa:_][func:_][broken:_]` **BOUT-011**: As a user, I can click fire 🔥 reaction on any turn
  - Expected: Fire icon clickable, count increments

- [ ] `[qa:_][func:_][broken:_]` **BOUT-012**: As a user, I can only react once per type per turn
  - Expected: Duplicate reactions ignored (onConflictDoNothing)

- [ ] `[qa:_][func:_][broken:_]` **BOUT-013**: As a user, I can see total reaction counts per turn
  - Expected: Reaction badges show aggregate counts

### 5.5 Winner Voting

- [ ] `[qa:_][func:_][broken:_]` **BOUT-014**: As an authenticated user, I can vote for the winning agent
  - Expected: Click agent to cast vote

- [ ] `[qa:_][func:_][broken:_]` **BOUT-015**: As a user, I can see vote counts per agent
  - Expected: Vote totals displayed per agent

- [ ] `[qa:_][func:_][broken:_]` **BOUT-016**: As a user, I can only vote once per bout
  - Expected: Second vote attempt ignored

- [ ] `[qa:_][func:_][broken:_]` **BOUT-017**: As a user, my vote is visually highlighted
  - Expected: Voted agent shows "Your vote" indicator

### 5.6 Sharing

- [ ] `[qa:_][func:_][broken:_]` **BOUT-018**: As a user, I can click "Copy link" to copy bout URL
  - Expected: Permalink copied to clipboard

- [ ] `[qa:_][func:_][broken:_]` **BOUT-019**: As a user, copying shows visual confirmation
  - Expected: Button text changes to "Copied!" briefly

- [ ] `[qa:_][func:_][broken:_]` **BOUT-020**: As a user, I can share via short link `/s/[slug]`
  - Expected: Short link resolves to full bout URL

### 5.7 Error States

- [ ] `[qa:_][func:_][broken:_]` **BOUT-021**: As a user, if bout times out I see timeout error
  - Expected: "The bout timed out" message displayed

- [ ] `[qa:_][func:_][broken:_]` **BOUT-022**: As a user, if rate limited I see rate limit error
  - Expected: "API rate limited" message displayed

- [ ] `[qa:_][func:_][broken:_]` **BOUT-023**: As a user, if bout fails I see "Faulted" status
  - Expected: Status badge shows "Faulted" with error message

---

## 6. Custom Arena Builder

### 6.1 Agent Selection

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-001**: As a user, I can search agents by name
  - Expected: Search input filters agent list in real-time

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-002**: As a user, I can select 2-6 agents for the lineup
  - Expected: Checkbox selection with min 2, max 6 enforcement

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-003**: As a user, I see selected agents in lineup preview
  - Expected: Selected agents shown with color badges

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-004**: As a user, I can remove agents from selection
  - Expected: X button removes agent from lineup

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-005**: As a user, I see selection count "X/6 selected"
  - Expected: Counter updates as agents selected/removed

### 6.2 Bout Configuration

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-006**: As a user, I can enter a topic for the custom bout
  - Expected: Topic input field with 500 char limit

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-007**: As a user, I can select model for custom bout
  - Expected: Model dropdown shows available options per tier

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-008**: As a user, I can select response length and format
  - Expected: Dropdowns for length (3 options) and format (3 options)

### 6.3 Submission

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-009**: As a user, clicking "Launch" with <2 agents shows error
  - Expected: "Select between 2 and 6 agents" error

- [ ] `[qa:_][func:_][broken:_]` **CUSTOM-010**: As a user, valid submission creates bout and redirects
  - Expected: Navigates to `/bout/[id]` with custom lineup

---

## 7. Agents

### 7.1 Agents Catalog

- [ ] `[qa:_][func:_][broken:_]` **AGENT-001**: As a user, I can see all agents in a grid
  - Expected: 2-column grid of agent cards

- [ ] `[qa:_][func:_][broken:_]` **AGENT-002**: As a user, I can search agents by name, preset, or ID
  - Expected: Search filters agents in real-time

- [ ] `[qa:_][func:_][broken:_]` **AGENT-003**: As a user, I can filter by preset dropdown
  - Expected: Dropdown lists all presets, selecting filters grid

- [ ] `[qa:_][func:_][broken:_]` **AGENT-004**: As a user, I can filter by tier (Free/Premium/Custom)
  - Expected: Tier dropdown filters agent list

- [ ] `[qa:_][func:_][broken:_]` **AGENT-005**: As a user, I see agent count "X ranked"
  - Expected: Count updates based on filters

- [ ] `[qa:_][func:_][broken:_]` **AGENT-006**: As a user, clicking agent card opens details modal
  - Expected: Modal shows full agent information

### 7.2 Agent Details Page

- [ ] `[qa:_][func:_][broken:_]` **AGENT-007**: As a user, I can see agent name and preset association
  - Expected: Header shows name and preset name

- [ ] `[qa:_][func:_][broken:_]` **AGENT-008**: As a user, I can see tier, response length, format badges
  - Expected: Badges show agent configuration

- [ ] `[qa:_][func:_][broken:_]` **AGENT-009**: As a user, I can see agent lineage (parent chain)
  - Expected: Clickable ancestor links if agent has parentId

- [ ] `[qa:_][func:_][broken:_]` **AGENT-010**: As a user, I can see full system prompt ("Prompt DNA")
  - Expected: Scrollable code block with prompt text

- [ ] `[qa:_][func:_][broken:_]` **AGENT-011**: As a user, I can see structured DNA fields
  - Expected: Archetype, tone, quirks, speech pattern, moves, weakness, goal, fears

- [ ] `[qa:_][func:_][broken:_]` **AGENT-012**: As a user, I can see on-chain hashes and attestation link
  - Expected: promptHash, manifestHash, EAS attestation URL if attested

- [ ] `[qa:_][func:_][broken:_]` **AGENT-013**: As a user, I can click "Clone & remix" button
  - Expected: Navigates to `/agents/clone?source=[id]`

### 7.3 Agent Creation

- [ ] `[qa:_][func:_][broken:_]` **AGENT-014**: As an authenticated user, I can click "Create agent" button
  - Expected: Button navigates to `/agents/new`

- [ ] `[qa:_][func:_][broken:_]` **AGENT-015**: As a user, I see tabbed form: Basics, Personality, Tactics, Advanced
  - Expected: 4-tab navigation in builder

- [ ] `[qa:_][func:_][broken:_]` **AGENT-016**: As a user, I can enter agent name (1-80 chars)
  - Expected: Name input with validation

- [ ] `[qa:_][func:_][broken:_]` **AGENT-017**: As a user, I can set archetype, tone, quirks
  - Expected: Personality tab has these inputs

- [ ] `[qa:_][func:_][broken:_]` **AGENT-018**: As a user, I can add up to 10 quirks
  - Expected: Add/remove buttons, max 10 items

- [ ] `[qa:_][func:_][broken:_]` **AGENT-019**: As a user, I can set opening move, signature move, weakness, goal, fears
  - Expected: Tactics tab has these textareas

- [ ] `[qa:_][func:_][broken:_]` **AGENT-020**: As a user, I can set custom instructions (max 5000 chars)
  - Expected: Advanced tab has custom instructions textarea

- [ ] `[qa:_][func:_][broken:_]` **AGENT-021**: As a user, I see live prompt preview updating as I type
  - Expected: Preview panel shows generated system prompt

- [ ] `[qa:_][func:_][broken:_]` **AGENT-022**: As a user, submitting creates agent and shows success
  - Expected: Agent ID returned, success feedback shown

- [ ] `[qa:_][func:_][broken:_]` **AGENT-023**: As a free tier user with 1 agent, creation fails
  - Expected: "No agent slots available" error (402)

### 7.4 Agent Cloning

- [ ] `[qa:_][func:_][broken:_]` **AGENT-024**: As a user, clone form pre-populates with source agent data
  - Expected: All fields filled from parent agent

- [ ] `[qa:_][func:_][broken:_]` **AGENT-025**: As a user, cloned agent shows parentId in lineage
  - Expected: New agent linked to original via parentId

---

## 8. Leaderboard

### 8.1 View Modes

- [ ] `[qa:_][func:_][broken:_]` **LEADER-001**: As a user, I can toggle between PIT and PLAYER views
  - Expected: Toggle switches between agent rankings and creator rankings

- [ ] `[qa:_][func:_][broken:_]` **LEADER-002**: As a user, I can filter by time range: All time, This week, Today
  - Expected: Time toggle updates leaderboard data

### 8.2 Agent Leaderboard (PIT)

- [ ] `[qa:_][func:_][broken:_]` **LEADER-003**: As a user, I see agents ranked by votes
  - Expected: Table sorted by vote count descending

- [ ] `[qa:_][func:_][broken:_]` **LEADER-004**: As a user, I can see agent name, preset, bouts, wins, win%, votes
  - Expected: 7-column table with these metrics

- [ ] `[qa:_][func:_][broken:_]` **LEADER-005**: As a user, I can click column headers to sort
  - Expected: Clicking Wins, Win%, Votes sorts table

- [ ] `[qa:_][func:_][broken:_]` **LEADER-006**: As a user, I can click agent name to see details
  - Expected: Opens agent details modal

- [ ] `[qa:_][func:_][broken:_]` **LEADER-007**: As a user, I can click "Replay" link to watch best bout
  - Expected: Navigates to `/b/[bestBoutId]`

### 8.3 Creator Leaderboard (PLAYER)

- [ ] `[qa:_][func:_][broken:_]` **LEADER-008**: As a user, I see creators ranked by total votes
  - Expected: Table sorted by vote count descending

- [ ] `[qa:_][func:_][broken:_]` **LEADER-009**: As a user, I can see creator name, agents created, total credits earned
  - Expected: Creator metrics displayed

---

## 9. Research

### 9.1 Research Overview

- [ ] `[qa:_][func:_][broken:_]` **RESEARCH-001**: As a user, I can read about data collection practices
  - Expected: "What we study" and "Data handling" sections

- [ ] `[qa:_][func:_][broken:_]` **RESEARCH-002**: As a user, I can click to view full literature review
  - Expected: Link to `/research/citations`

### 9.2 Citations Page

- [ ] `[qa:_][func:_][broken:_]` **RESEARCH-003**: As a user, I can see 18 cited research papers
  - Expected: Literature review with paper titles, authors, links

### 9.3 Data Export

- [ ] `[qa:_][func:_][broken:_]` **RESEARCH-004**: As a user, I can see latest export metadata
  - Expected: Version, date, record counts displayed

- [ ] `[qa:_][func:_][broken:_]` **RESEARCH-005**: As a user, I can download research dataset JSON
  - Expected: Click triggers `thepit-research-export-[id].json` download

---

## 10. Feedback

### 10.1 Feature Request Submission

- [ ] `[qa:_][func:_][broken:_]` **FEEDBACK-001**: As an authenticated user, I can submit a feature request
  - Expected: Form with title, description, category

- [ ] `[qa:_][func:_][broken:_]` **FEEDBACK-002**: As a user, title must be 5-200 characters
  - Expected: Validation error if outside range

- [ ] `[qa:_][func:_][broken:_]` **FEEDBACK-003**: As a user, description must be 20-3000 characters
  - Expected: Validation error if outside range

- [ ] `[qa:_][func:_][broken:_]` **FEEDBACK-004**: As a user, I can select category: Agents, Arena, Presets, Research, UI, Other
  - Expected: 6 category options in dropdown

- [ ] `[qa:_][func:_][broken:_]` **FEEDBACK-005**: As an unauthenticated user, I see sign-in prompt
  - Expected: Cannot submit without authentication

### 10.2 Community Voting

- [ ] `[qa:_][func:_][broken:_]` **FEEDBACK-006**: As a user, I can see all feature requests sorted by votes
  - Expected: Requests listed with vote counts

- [ ] `[qa:_][func:_][broken:_]` **FEEDBACK-007**: As an authenticated user, I can vote for a request
  - Expected: Vote button increments count

- [ ] `[qa:_][func:_][broken:_]` **FEEDBACK-008**: As a user, I can only vote once per request
  - Expected: Second vote toggles off (unvote)

- [ ] `[qa:_][func:_][broken:_]` **FEEDBACK-009**: As a user, I can see which requests I've voted for
  - Expected: Visual indicator on voted requests

---

## 11. Contact

- [ ] `[qa:_][func:_][broken:_]` **CONTACT-001**: As a user, I can fill out contact form with name, email, message
  - Expected: 3 input fields visible

- [ ] `[qa:_][func:_][broken:_]` **CONTACT-002**: As a user, submitting sends email via Resend
  - Expected: Form submits, shows loading state

- [ ] `[qa:_][func:_][broken:_]` **CONTACT-003**: As a user, successful submission shows confirmation
  - Expected: Success message displayed

- [ ] `[qa:_][func:_][broken:_]` **CONTACT-004**: As a user, invalid email shows validation error
  - Expected: Email format validated

- [ ] `[qa:_][func:_][broken:_]` **CONTACT-005**: As a user, message has 5000 char limit
  - Expected: Validation error if exceeded

---

## 12. Credits & Billing

### 12.1 Credit Balance

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-001**: As a new user, I start with 500 credits
  - Expected: Initial balance from CREDITS_STARTING_CREDITS

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-002**: As a user, credit balance displays on arena page
  - Expected: "Credits: X.XX" visible in header

### 12.2 Intro Pool

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-003**: As a new user, I receive 100 credits from intro pool
  - Expected: Signup bonus from shared pool

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-004**: As a user, intro pool drains 1 credit/minute over time
  - Expected: Counter decreases even without claims

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-005**: As a referrer, I receive 50 credits when referral signs up
  - Expected: Referral bonus credited

### 12.3 Credit Purchases

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-006**: As a user, I can purchase Starter pack (£3/300 credits)
  - Expected: Stripe checkout completes, credits added

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-007**: As a user, I can purchase Plus pack (£8/800 credits)
  - Expected: Stripe checkout completes, credits added

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-008**: As a user, after purchase I see success banner
  - Expected: "Credits added to your account" message

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-009**: As a user, cancelled checkout shows cancel message
  - Expected: "Checkout cancelled" message

### 12.4 Credit Consumption

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-010**: As a user, bout preauthorizes estimated credits
  - Expected: Balance decreases at bout start

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-011**: As a user, actual cost settles after bout completes
  - Expected: Refund if actual < estimate, charge if actual > estimate

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-012**: As a user with insufficient credits, bout creation fails
  - Expected: "Insufficient credits" error (402)

### 12.5 Subscriptions

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-013**: As a user, I can subscribe to Pit Pass (£3/mo)
  - Expected: Stripe subscription checkout, tier upgraded

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-014**: As a user, I can subscribe to Pit Lab (£10/mo)
  - Expected: Stripe subscription checkout, tier upgraded

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-015**: As a subscriber, I can manage subscription via billing portal
  - Expected: Stripe portal opens for upgrade/downgrade/cancel

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-016**: As a user with failed payment, I am downgraded to free
  - Expected: Webhook handles invoice.payment_failed

- [ ] `[qa:_][func:_][broken:_]` **CREDIT-017**: As a user who cancels, subscription ends at period end
  - Expected: Tier reverts to free when period expires

---

## 13. API Endpoints

### 13.1 Bout API

- [ ] `[qa:_][func:_][broken:_]` **API-001**: POST /api/run-bout returns streaming event response
  - Expected: SSE stream with start, data-turn, text-delta, text-end events

- [ ] `[qa:_][func:_][broken:_]` **API-002**: POST /api/v1/bout returns JSON bout result (Lab tier only)
  - Expected: `{ boutId, status, transcript, shareLine, agents, usage }`

- [ ] `[qa:_][func:_][broken:_]` **API-003**: Bout API rate limits to 5/hour for authenticated, 2/hour for anon
  - Expected: 429 response after limit exceeded

### 13.2 Agent API

- [ ] `[qa:_][func:_][broken:_]` **API-004**: POST /api/agents creates agent with validation
  - Expected: `{ agentId, promptHash, manifestHash }`

- [ ] `[qa:_][func:_][broken:_]` **API-005**: Agent API rejects names with URLs
  - Expected: 400 response for URL/script patterns

- [ ] `[qa:_][func:_][broken:_]` **API-006**: Agent API rate limits to 10/hour
  - Expected: 429 response after limit exceeded

### 13.3 Reactions API

- [ ] `[qa:_][func:_][broken:_]` **API-007**: POST /api/reactions records heart or fire reaction
  - Expected: `{ ok: true }` with rate limit header

- [ ] `[qa:_][func:_][broken:_]` **API-008**: Reactions API rate limits to 30/minute per IP
  - Expected: 429 response after limit exceeded

### 13.4 Winner Vote API

- [ ] `[qa:_][func:_][broken:_]` **API-009**: POST /api/winner-vote records vote (auth required)
  - Expected: `{ ok: true }`

- [ ] `[qa:_][func:_][broken:_]` **API-010**: Winner vote API returns 401 for unauthenticated
  - Expected: Auth error response

### 13.5 Feature Requests API

- [ ] `[qa:_][func:_][broken:_]` **API-011**: GET /api/feature-requests returns all requests with vote counts
  - Expected: `{ requests: [...] }`

- [ ] `[qa:_][func:_][broken:_]` **API-012**: POST /api/feature-requests creates new request (auth required)
  - Expected: `{ ok: true, id }`

- [ ] `[qa:_][func:_][broken:_]` **API-013**: POST /api/feature-requests/vote toggles vote
  - Expected: `{ voted: boolean, voteCount: number }`

### 13.6 Contact & Newsletter

- [ ] `[qa:_][func:_][broken:_]` **API-014**: POST /api/contact sends email via Resend
  - Expected: `{ ok: true }`

- [ ] `[qa:_][func:_][broken:_]` **API-015**: POST /api/newsletter records email subscription
  - Expected: `{ ok: true }`

### 13.7 Short Links

- [ ] `[qa:_][func:_][broken:_]` **API-016**: POST /api/short-links creates short link for bout
  - Expected: `{ slug, created }` with 201 or 200 status

- [ ] `[qa:_][func:_][broken:_]` **API-017**: GET /s/[slug] redirects to bout page
  - Expected: 302 redirect to `/b/[boutId]`

### 13.8 Research Export

- [ ] `[qa:_][func:_][broken:_]` **API-018**: GET /api/research/export returns latest export metadata
  - Expected: `{ available, version, counts... }`

- [ ] `[qa:_][func:_][broken:_]` **API-019**: GET /api/research/export?id=N downloads specific export
  - Expected: JSON file attachment

### 13.9 Health & Docs

- [ ] `[qa:_][func:_][broken:_]` **API-020**: GET /api/health returns system status
  - Expected: `{ status, database, features }`

- [ ] `[qa:_][func:_][broken:_]` **API-021**: GET /api/openapi returns OpenAPI 3.0 spec (Lab tier only)
  - Expected: JSON OpenAPI document

### 13.10 Webhooks

- [ ] `[qa:_][func:_][broken:_]` **API-022**: POST /api/credits/webhook handles Stripe events
  - Expected: 200 response for valid signature

- [ ] `[qa:_][func:_][broken:_]` **API-023**: Webhook rejects invalid Stripe signatures
  - Expected: 400 response

---

## Verification Commands

```bash
# Count total user stories
grep -c '\*\*[A-Z]*-[0-9]*\*\*' docs/qa-report.md

# List all untested stories
grep '\[qa:_\]' docs/qa-report.md

# List all broken items
grep '\[broken:x\]' docs/qa-report.md

# List all working items
grep '\[func:x\]' docs/qa-report.md

# Count by category
grep -E '^\*\*[A-Z]+-[0-9]+\*\*' docs/qa-report.md | cut -d'-' -f1 | sort | uniq -c
```

## Python Parser Template

```python
#!/usr/bin/env python3
"""Parse QA report and generate summary statistics."""

import re
from pathlib import Path
from dataclasses import dataclass
from typing import List

@dataclass
class UserStory:
    id: str
    category: str
    qa_tested: bool
    functional: bool
    broken: bool
    description: str
    expected: str = ""

STORY_PATTERN = re.compile(
    r'- \[.\] `\[qa:(.)\]\[func:(.)\]\[broken:(.)\]` \*\*([A-Z]+-\d+)\*\*: (.+)'
)
EXPECTED_PATTERN = re.compile(r'^\s+- Expected: (.+)$')

def parse_report(path: Path) -> List[UserStory]:
    stories = []
    current_category = ""

    with open(path) as f:
        lines = f.readlines()

    for i, line in enumerate(lines):
        if line.startswith('## '):
            current_category = line.strip('# \n')

        match = STORY_PATTERN.match(line)
        if match:
            qa, func, broken, story_id, description = match.groups()
            expected = ""
            if i + 1 < len(lines):
                exp_match = EXPECTED_PATTERN.match(lines[i + 1])
                if exp_match:
                    expected = exp_match.group(1)

            stories.append(UserStory(
                id=story_id,
                category=current_category,
                qa_tested=(qa == 'x'),
                functional=(func == 'x'),
                broken=(broken == 'x'),
                description=description,
                expected=expected
            ))

    return stories

def main():
    stories = parse_report(Path('docs/qa-report.md'))

    print(f"Total stories: {len(stories)}")
    print(f"Tested: {sum(1 for s in stories if s.qa_tested)}")
    print(f"Functional: {sum(1 for s in stories if s.functional)}")
    print(f"Broken: {sum(1 for s in stories if s.broken)}")

    print("\nBy category:")
    categories = {}
    for s in stories:
        categories.setdefault(s.category, []).append(s)

    for cat, cat_stories in sorted(categories.items()):
        tested = sum(1 for s in cat_stories if s.qa_tested)
        print(f"  {cat}: {tested}/{len(cat_stories)} tested")

if __name__ == '__main__':
    main()
```
