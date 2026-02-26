# System Audit: "Demo Was Live, Chain Broken, Developer Moved On"

**Date:** 26 February 2026
**Purpose:** Surface every signal a visitor, recruiter, or HN reader would see that says "this person started something, got excited, then left." The audit is from the outside looking in — no internal knowledge, just what's visible.

---

## Severity Scale

- **RED:** Actively communicates abandonment or broken promises
- **AMBER:** Looks stale or unfinished on inspection
- **GREEN:** Working, current, no abandonment signal

---

## 1. Homepage (thepit.cloud)

| Signal | Severity | What a visitor sees |
|--------|----------|---------------------|
| **"This is the most recent (and most determined) push..."** | AMBER | "Most recent push" implies previous failed pushes. Reads as someone who has started and stopped before. |
| **"(TBC)"** | RED | Literally "to be continued" in the hero subheadline. Screams unfinished. |
| **Community pool: 2,099 credits remaining** | AMBER | If this drains to zero and nobody refills it, every anonymous visitor sees "Pool drained — sign up for credits." A dead pool is the single strongest abandonment signal. |
| **"I need some help.filtering(agents)"** | AMBER | Clever, but if nobody ever helps, this reads as a plea that went unanswered. |
| **Newsletter: "it just goes into a database"** | GREEN | Honest and funny. But if someone subscribes and never receives anything, the honesty becomes prophecy. |
| **§ button** | GREEN | Enigmatic but not broken. |
| **Footer disclaimer** | GREEN | Self-aware. |

## 2. Roadmap Page

This is the highest-risk page on the entire site.

| Signal | Severity | What a visitor sees |
|--------|----------|---------------------|
| **14 items marked "Planned"** | RED | Fourteen promises. If the developer leaves, these are fourteen broken promises. A roadmap with no delivery dates is a wish list. A wish list on an abandoned project is a memorial. |
| **4 items marked "Building"** | RED | "Building" implies active work. If commits stop, "Building" becomes "Was Building." The roadmap page has no dates — a visitor cannot tell if "Building" means today or six months ago. |
| **"125 development attestations on Base L2 mainnet"** | RED | This is a specific, verifiable claim. If someone checks and finds zero attestations, this is a lie on the roadmap of an abandoned project. Currently marked "Building." If development stops, this is the most dangerous line on the entire site. |
| **"Peer-reviewed paper" as planned** | AMBER | Ambitious. On an abandoned project, this reads as delusion. |
| **"Seasonal rankings" as planned** | AMBER | Implies an active community that doesn't exist. |
| **"Agent marketplace" as planned** | AMBER | Implies a creator ecosystem that doesn't exist. |
| **13 shipped, 4 building, 14 planned** | RED | The ratio tells the story: more planned than shipped. An active project's roadmap should have more shipped than planned. An abandoned project's roadmap always has more planned than shipped. |

**Recommendation:** The roadmap page must either be updated to reflect reality (remove speculative items, keep only what exists or is actively being built) or taken down entirely. A roadmap with 14 planned items and no dates on a project that might go quiet is the loudest abandonment signal in the entire system.

## 3. Developers Page

| Signal | Severity | What a visitor sees |
|--------|----------|---------------------|
| **"View source →" links to private repo** | RED | Every "View source" link on the developers page points to `github.com/rickhallett/thepit`. If the repo is private, every link 404s. Four dead links on the developers page is catastrophic for credibility. |
| **"API Reference →" link** | RED | Points to `/docs/api` or similar. Returns 404. A developer page that promises API docs and delivers a 404 is the archetypal abandoned-project signal. |
| **CLI code examples** | GREEN | The pitforge example is specific and real. Good. |
| **"Want to run bouts programmatically? Get Lab Access"** | AMBER | If nobody has Lab access and nobody responds to requests, this is a dead CTA. |

## 4. GitHub Repo (when/if public)

| Signal | Severity | What a visitor sees |
|--------|----------|---------------------|
| **Last commit date** | AMBER→RED | Currently Feb 26 2026. Every day without a commit adds to the staleness signal. After 2 weeks of silence, GitHub shows "last updated X weeks ago." After a month, it screams abandoned. |
| **Open PRs** | GREEN | PR #371 is now merged. No stale open PRs. |
| **Open issues** | Check needed | If there are open issues with no responses, that's abandonment signal. |
| **README "still improving" (removed)** | GREEN | This was removed in today's cleanup. Good. |
| **README test count** | GREEN | Updated to 1,125 today. Current. |
| **GitHub social links in footer** | RED if private | The footer shows X and GitHub links. If the repo is private, the GitHub link works but shows a 404 to non-collaborators. |

## 5. Social Presence

| Signal | Severity | What a visitor sees |
|--------|----------|---------------------|
| **x.thepit.cloud** | RED | Vanity URL configured. Returns HTTP 000 (connection refused / no server). Dead social link. |
| **reddit.thepit.cloud** | RED | Same — connection refused. Dead social link. |
| **discord.thepit.cloud** | AMBER | Returns 301 (redirect exists) but destination unknown. May or may not work. |
| **X handle @ThePitArena** | Check needed | If this account has zero posts, it's a reserved-but-abandoned handle. |
| **LinkedIn link** | GREEN | Points to a real personal profile. Works. |

**Recommendation:** Disable all social channel env flags that point to non-existent destinations. A footer with dead social links is worse than a footer with no social links.

## 6. Copy and Claims

| Signal | Severity | What a visitor sees |
|--------|----------|---------------------|
| **"195 bouts, ~2,100 turns"** | AMBER | Static numbers. If these never change, they become a timestamp of when work stopped. |
| **"ongoing investigation, not a finished paper"** | RED if abandoned | This framing is honest while active. On an abandoned project, "ongoing" is a lie. |
| **"I funded the community pool out of pocket"** | AMBER→RED | If the pool drains and isn't refilled, this becomes: "I funded it, then stopped funding it." |
| **"These tiers exist for people who want to run more experiments than I can afford to donate"** | AMBER | Subscription tiers on an abandoned project with no support are a liability. Someone could subscribe, pay, get nothing. |
| **Pricing page with active Stripe links** | RED if abandoned | If someone subscribes and you're not maintaining the product, you're taking money for nothing. This is the single most legally problematic abandonment signal. |

## 7. Infrastructure Decay Timeline

What happens if you walk away and don't touch anything:

| Timeline | What breaks |
|----------|------------|
| **Day 1-7** | Nothing visible. Pool drains slowly. |
| **Day 7-14** | Community pool approaches zero. Anonymous visitors can no longer run bouts. GitHub shows "updated 2 weeks ago." |
| **Day 14-30** | Pool at zero. "Pool drained — sign up for credits" is the default state. Roadmap "Building" items haven't moved. GitHub shows "updated last month." |
| **Month 1-3** | Dependency vulnerabilities start appearing. SSL cert may need renewal. Vercel deployment is still live but becoming stale. Any HN thread linking here shows a frozen project. |
| **Month 3-6** | Anthropic API changes could break streaming. Clerk auth token formats could change. Neon free tier could require re-verification. The product starts breaking without any code changes. |
| **Month 6+** | The site is a ghost. The roadmap is a graveyard. The pricing page is taking money for a dead product. |

---

## Prioritised Fix List

### Must fix before ANY public exposure (HN or job applications)

| # | Item | Action | Time |
|---|------|--------|------|
| 1 | **Roadmap: remove or trim speculative items** | Cut the 14 planned items to 3-5 realistic ones. Remove "Peer-reviewed paper," "Seasonal rankings," "Agent marketplace," "Social graph," "Collaborative agents," "Community moderation." Keep only items you might actually build. | 15 min |
| 2 | **Roadmap: "125 development attestations"** | Verify this claim. If false, remove or correct immediately. This is a specific, checkable claim. | 5 min |
| 3 | **Developers: "View source" links** | Either make repo public before sharing the developers page, or remove the links. Dead source links on a developers page is disqualifying. | 5 min |
| 4 | **Developers: API Reference link** | Remove or redirect. 404 on an API docs link is the canonical abandoned-project tell. | 5 min |
| 5 | **Social links: disable dead channels** | Set `NEXT_PUBLIC_SOCIAL_X_ENABLED=false`, `NEXT_PUBLIC_SOCIAL_REDDIT_ENABLED=false`. Only enable channels that resolve. | 2 min |
| 6 | **Hero: remove "(TBC)"** | Replace with something that doesn't scream unfinished. Or just end the sentence before "(TBC)." | 1 min |
| 7 | **Pricing: add a circuit breaker** | If you walk away, active Stripe subscriptions keep charging. You need either: (a) a plan to cancel all subscriptions if you stop, or (b) a note that subscriptions may be paused. The legal exposure is real. | 10 min |

### Should fix (strengthens the signal)

| # | Item | Action | Time |
|---|------|--------|------|
| 8 | **"Ongoing investigation" framing** | Change to past tense or present-without-promise: "An investigation into..." rather than "an ongoing investigation." | 2 min |
| 9 | **Pool refill plan** | Either document the drain rate and commit to periodic refills, or set the pool high enough to last months unattended. | 5 min |
| 10 | **Roadmap: add timestamps** | "Shipped Feb 2026" on completed items. Gives visitors temporal context. Without dates, everything is timeless and timelessness = stale. | 10 min |
| 11 | **README: remove "The agent definitions are public" if repo stays private** | Currently contradicted by reality. | 1 min |

---

## The Core Question

The Captain asked about the signal of "demo was live, chain broken, developer moved on." The honest answer: the site is approximately 3 weeks from looking abandoned if no commits are made and no pool credits are added. The roadmap is the highest-risk page. The pricing page is the highest-liability page. The developers page with dead links is the highest-credibility-damage page.

The product itself — the streaming arena, the presets, the research — holds up. The wrapper around it (roadmap promises, social links, pricing tiers, API docs) is where the abandonment signal lives. Strip the wrapper to only what's real and delivered, and the project reads as "finished, small, honest." Leave the wrapper as-is, and after a month of silence it reads as "ambitious, abandoned, sad."

---

*The product is good. The promises around it need pruning. What you've built survives. What you've promised doesn't.*
