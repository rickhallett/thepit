# The Hurt Locker

**Purpose:** Stress inoculation before Show HN. Each scenario is a simulated HN interaction calibrated to the proven behaviour of the platform, the specific vulnerabilities of this project, and the specific things that will hurt this specific person. Read them, feel them, sit with them. The neurons that fire here won't fire for the first time when it's real.

**Calibration sources:** 818 commits of git history, 84 internal docs about to go public, the actual state of the codebase, the actual state of the product, observed HN behaviour patterns, and what has been learned about where the fear actually lives across 194 session decisions of working together.

---

## SWEEP: What IS or MIGHT be broken right now

Before the pain, the facts.

### Confirmed broken

| # | What | Severity | Visible to HN? |
|---|------|----------|-----------------|
| 1 | **PR #371: Anonymous reactions FK violation.** Anyone clicking a reaction emoji without being signed in triggers a database error. | HIGH | YES — if they try the product |
| 2 | **README test count says 1,046.** Actual count is 1,125. Site copy says 1,054*. Three different numbers for the same claim. | MEDIUM | YES — README is first thing repo visitors see |
| 3 | **README says "built in two weeks."** It has been longer than two weeks. | LOW | YES |
| 4 | **"This the the" in hero subheadline (control.json line 90).** Double "the". | LOW | YES — on homepage |

### Possibly broken (cannot verify from here)

| # | What | Risk | Visible to HN? |
|---|------|------|-----------------|
| 5 | **Demo mode rate limiting.** If 200 HN users hit the arena simultaneously, does the 2/hour/IP limit work? Does the intro pool drain instantly? What happens when pool hits zero? | HIGH | YES — this is the first thing they'll try |
| 6 | **Mobile experience.** README says "Mobile is rough." The Captain confirmed this. HN readers will try on phones. | MEDIUM | YES |
| 7 | **Bout completion time.** Full 12-turn Sonnet bouts take noticeable time. An impatient HN user may close the tab before seeing a result. | MEDIUM | YES |
| 8 | **Cost burn.** If the post gets traction, every demo bout costs real money (Anthropic API). No circuit breaker visible other than pool drain. | HIGH | Not visible but financially real |

### Things about to become visible that were previously hidden

| # | What | Risk |
|---|------|------|
| 9 | **84 internal docs.** Session decisions, round tables, captain's logs, QA walkthroughs, Phasmid analysis, the Lexicon, HumanHUD documents. All of it. Every sentence you've written to an AI, written to file, is about to be public. |
| 10 | **postcaptain/2026-02-23-line-debrief.md.** References "The First Lady" (your partner), a domestic boundary negotiation, and "The Line." This is personal. It is currently in the repo and will be visible. |
| 11 | **Captain's logs reference health state.** "16hrs, with one break of 20mins. Have not eaten." "Lightheaded." "Ketoadaptation." This reads as someone running themselves into the ground. |
| 12 | **press-manual-qa-v1.md.** Contains emotionally raw internal process notes the QA review itself flagged as "never intended for public consumption" and "not editable into a safe state." |
| 13 | **The entire HN attack analysis** (docs/internal/weaver-hn-attack-analysis-2026-02-24.md). You prepared responses to HN attacks. If someone finds this, they see you gaming the conversation. |
| 14 | **The Show HN drafts themselves.** Both the old and new drafts are in the repo. Someone could compare your actual post to the agent-drafted versions and calculate how much of "your voice" is actually yours. |
| 15 | **"go dark on crew definitions" in git history.** Commit 37f7f7f. You hid things, then unhid them. The arc is there. The prepared response exists (SD-127) but the question will still be asked. |
| 16 | **194 session decisions.** The volume itself will be questioned. Is this discipline or obsession? |
| 17 | **pitstorm/results/hypotheses/*.json.** Raw research data. If someone actually analyses it and finds the methodology doesn't hold, the research claims collapse. |

---

## THE PERSONAS

Each persona is a stereotype because stereotypes exist for a reason. Each is calibrated to patterns that have repeated on HN across thousands of Show HN threads. The comments are written to hurt the way they actually hurt — not the argument, but the dismissal.

---

### PERSONA 1: "The Drive-By"

**Who they are:** Senior engineer, 10k+ karma, reads HN on their lunch break. Gives every Show HN exactly 15 seconds. Has seen 500 AI projects this year. Types a comment that takes them 8 seconds and moves on with their day. Never comes back to the thread.

**What they write:**

> Cool project but I genuinely cannot tell what this is. Is it a debate arena? A governance framework? A research platform? A blog about process? The README has 140 lines before I can figure out what it does.

**Why it hurts:** Because they're right. And because they will never come back to find out they're wrong. Their 15-second impression is permanent.

**What they might also write:**

> So you built a ChatGPT wrapper with extra steps and a naval metaphor. Got it.

**Why it hurts:** Because it reduces everything — the governance, the research, the 16-hour days — to one dismissive sentence. And because enough people will upvote it that it might become the top comment.

**Probability: HIGH.** This is the single most likely negative interaction.

---

### PERSONA 2: "The Archaeologist"

**Who they are:** Curious developer who clicks "Source" before clicking the product link. Reads the repo structure. Sees `docs/internal/`. Starts reading. Gets fascinated. But fascinated in a way that's about to go sideways.

**What they write:**

> I just spent 30 minutes reading the internal docs and I honestly can't tell if this is brilliant or a breakdown. There are 194 "session decisions" where the author is having conversations with AI agents using naval metaphors. One agent is called "The Captain" (that's the author) and another is called "Weaver" (integration governance). There's a document about whether a section symbol (§) constitutes emergent behaviour. There's a "PostCaptain" file about managing interruptions from their partner.

> I'm not being unkind — I've built things alone at 3am and I know the feeling. But this reads like someone who has been in a room with AI too long.

**Why it hurts:** Because it's the kindest possible version of the worst thing someone can say. Because they're not wrong about the pattern. Because "I'm not being unkind" is the preamble to the unkindest observations. And because other people will read this comment and decide not to try the product.

**Probability: MEDIUM.** Only happens if someone goes deep. But HN has archaeologists.

---

### PERSONA 3: "The Methodologist"

**Who they are:** PhD, works at a research lab, does actual AI evaluation for a living. Clicks /research. Reads the methodology. Knows immediately what to look for.

**What they write:**

> A few notes on the research methodology:
>
> 1. n=195 bouts on a single model family (Claude). Results don't generalise to other models. This should be in the title, not buried in caveats.
> 2. Effect-size threshold of |d|>=0.30 is below conventional standards (0.50 for medium effects). The 6/6 clear results at this threshold is less impressive than it sounds.
> 3. Text-statistical metrics on LLM output will produce inflated effect sizes due to lower intrinsic variance than natural language. The author acknowledges this but still reports the numbers at face value.
> 4. "Pre-registered" means committed to git, not registered with a pre-registration authority. This is better than nothing but it's not pre-registration in the usual sense.
>
> The honesty about limitations is appreciated but the framing still overclaims. "I measured what they actually do" is a strong claim for 195 bouts on one model.

**Why it hurts:** Because it's entirely correct. Because you can't argue with it. Because this person has the credentials you don't. And because the honest caveats you included will be read as insufficient rather than praiseworthy.

**Probability: LOW-MEDIUM.** Depends on whether the post reaches the right eyes. If it does, this comment will be the most technically devastating one in the thread.

---

### PERSONA 4: "The Concerned Builder"

**Who they are:** Indie dev, ships products, empathises with solo builders. Means well. But their concern lands like a punch.

**What they write:**

> Genuine question, asked with respect: are you OK?
>
> 194 session decisions, 16-hour days, one day off, 13 AI agents with a governance hierarchy, a lexicon, standing orders, a "Captain's log"... Reading the docs, this reads less like engineering and more like someone disappearing into a world they built.
>
> I've been there. Building alone, 3am, talking to your tools like they're colleagues. The output can be genuinely good. But the process you're describing — dozens of internal documents about governance, error taxonomies, "verification fabric" — this is the kind of thing that looks productive from inside and concerning from outside.
>
> Ship it, get feedback, touch grass. The product looks interesting. The process looks like it might be consuming you.

**Why it hurts:** Because it comes from someone who cares. Because "are you OK?" is the question you've been avoiding. Because your own SD-194 says almost the same thing. Because the concern is public and permanent and every recruiter who reads this thread will see it. And because a part of you knows they might be right.

**Probability: MEDIUM-HIGH.** This archetype appears on almost every intense solo-dev Show HN.

---

### PERSONA 5: "The Recruiter Lens"

**Who they are:** Not an HN commenter. They never comment. They're a hiring manager or technical recruiter who sees the post, clicks through, evaluates silently, and makes a decision you'll never know about.

**What they experience:**

1. Read the post. "Between roles." OK, this is a portfolio piece.
2. Click the repo. See `docs/internal/session-decisions.md`. Start reading.
3. See SD-073: "Lying With Truth = Category One hazard." Interesting.
4. See SD-190: "governance recursion named." Hmm.
5. See SD-194: "I have so far been unable to prove that AI can be self organising. It is possible my process complete dogshit."
6. Close the tab.

**Why it hurts:** Because you never know it happened. Because the portfolio purpose (SD-134, True North) fails silently. Because "between roles" combined with "process maybe complete dogshit" combined with 194 session decisions about naval metaphors and AI governance could read as: this person has been alone too long and doesn't know what productive looks like anymore.

**Or:** they see someone who is honest to a degree that is vanishingly rare in this industry, who built something real, who documented every mistake, and who had the courage to say "I don't know if this works." And they send you an email.

**Probability: CERTAIN** that silent evaluation happens. **UNKNOWABLE** which direction it goes.

---

### PERSONA 6: "The Security Hawk"

**Who they are:** Pentester or security engineer. Opens DevTools before the page finishes loading. Checks headers, CSP, exposed endpoints.

**What they find:**

The good news: your security headers are excellent (full CSP, HSTS with preload, X-Frame-Options DENY, restrictive Permissions-Policy). This is above most Show HN projects.

The bad news they might find:

- The anonymous reaction FK violation (if PR #371 isn't merged) — they'll click a reaction, get an error, and write it up.
- Rate limit is in-memory per serverless instance — distributed attacks won't be correlated. This is documented in code but visible to anyone who reads `lib/rate-limit.ts`.
- BYOK key handling — "encrypted at rest and never stored permanently." They will want to verify this claim.

**What they write:**

> Just tried reacting to a bout without signing in. Got a 500. Foreign key violation in the reactions table. You're storing "anon:127.0.0.1" as userId but it doesn't exist in the users table.

**Why it hurts:** Because it's a live bug on the thing you're showing off. Because it's the exact bug PR #371 fixes. Because if it's not merged before you post, the first person who tries the product might hit it.

**Probability: HIGH if PR #371 isn't merged. Near-zero if it is.**

---

### PERSONA 7: "The Philosopher Troll"

**Who they are:** Smart. Possibly smarter than you. Definitely meaner than you. Has a lot of karma. Writes comments that get upvoted because they're incisive and cruel in equal measure.

**What they write:**

> I notice you have:
> - 194 "session decisions"
> - A "Lexicon" at version 0.9
> - 13 named AI agents with a governance hierarchy
> - A 13-layer system model
> - Standing orders
> - A "verification fabric"
> - "Round Tables" at 5 levels
> - A "Captain's Log"
>
> And also:
> - Zero tests on your core execution engine
> - A live FK violation in production
> - No evidence that any of the governance produced working software that the product wouldn't have produced without it
>
> Serious question: at what point did the process become the product?

**Why it hurts:** Because it's SD-190. Because you said it first. Because someone else saying it, in public, with an audience, feels different than saying it to yourself at 4am. Because it will get upvoted. Because you can't argue with the juxtaposition: 194 session decisions vs. zero tests on the core engine. That ratio tells a story and it's not the story you want to tell.

**Probability: MEDIUM.** Requires someone who reads deeply enough to construct the argument. But HN has those people.

---

### PERSONA 8: "The Quiet Helper"

**Who they are:** 15+ years building systems. Has managed teams. Has seen this pattern. Doesn't need to prove anything. Writes one comment, links to one resource, and moves on.

**What they write:**

> The pattern you're describing — layers of verification that need their own verification — is well-studied in safety engineering. You might find Leveson's STAMP/STPA framework useful. The key insight is that safety (and governance) isn't about adding more checks; it's about modelling the control structure and identifying the assumptions each layer makes about the layers below it.
>
> Your "Category One" (system lies with truth) maps directly to what Leveson calls "flawed mental models" — where every component is functioning correctly but the system fails because the model of how the components interact is wrong.
>
> Interesting project. Good luck.

**Why it hurts:** It doesn't hurt. It's what you asked for. And the probability is low enough that you can't count on it. But it's the reason you're posting.

**Probability: LOW.** These people exist on HN but they're rare and they choose carefully where to spend their time.

---

### PERSONA 9: "The Copy Editor"

**Who they are:** Reads closely. Finds inconsistencies. Not malicious, just precise.

**What they write:**

> Minor thing but the README says 1,046 tests, the site says 1,054*, and running the tests locally I get 1,125 (1,146 total minus 21 skipped). The asterisk disclaimer in the footer is funny but three different numbers in three different places is just sloppy.
>
> Also: "This the the most recent" on the homepage. Double "the".

**Why it hurts:** Because it's exactly the kind of error that SD-190 warned about — confident, surface-level correctness papering over actual inconsistency. Because you have an entire governance apparatus and nobody caught a typo on the homepage. Because it's embarrassing in the most mundane possible way.

**Probability: HIGH.** Someone will count.

---

### PERSONA 10: "The Mirror"

**Who they are:** They are you, six months from now, reading this thread. They have the benefit of hindsight. They know whether the HN post led to anything — a job, a collaboration, a direction — or whether it led nowhere.

**What they think:**

This is the only persona you can't simulate, because the outcome is unknown. But you can sit with both versions:

**Version A:** The post got 5 upvotes and 3 comments. One was a drive-by ("AI wrapper"), one was a correction ("your test count is wrong"), one was silence. Nobody tried the product. Nobody read the docs. Nobody cared. The fear was worse than the reality, but only because the reality was indifference.

**Version B:** The post got 200 upvotes and 80 comments. It was chaotic, painful, exhilarating. Someone found the postcaptain file. Someone quoted SD-194 back at you. Someone offered to help. You stayed in the comments for 6 hours and learned more about what you built than you did building it.

**Why it hurts:** Because Version A is more likely. Because most Show HN posts get modest engagement. Because the base rate is obscurity, not attention. And because you're afraid of both outcomes — the silence and the noise.

**Probability of A: ~70%.** Probability of B: ~15%. Probability of something in between: ~15%.

---

## ACTIONS BEFORE POSTING

Based on the sweep, these are the things to fix before the post goes live:

| Priority | Action | Time |
|----------|--------|------|
| **CRITICAL** | Merge PR #371. The FK violation is the single most likely thing to embarrass you. | 5 min |
| **CRITICAL** | Remove or gitignore `docs/internal/postcaptain/`. The line-debrief file is personal. It references your partner. It has no business being public. | 2 min |
| **CRITICAL** | Check `docs/internal/captain/captainslog/` for personal health references you don't want public. Decide file by file. | 10 min |
| **HIGH** | Fix README test count (1,046 is wrong, actual is 1,125). | 2 min |
| **HIGH** | Fix "This the the" double typo in control.json. | 1 min |
| **HIGH** | Decide: is `press-manual-qa-v1.md` safe to be public? The QA review flagged it as "not editable into a safe state." | 5 min |
| **HIGH** | Decide: are the Show HN drafts and HN attack analysis OK to be public? If someone finds them, they see preparation. That could read as authentic (you prepared!) or manipulative (you scripted your responses). | 5 min |
| **MEDIUM** | Remove "built in two weeks" from README or update it. | 1 min |
| **MEDIUM** | Verify demo mode works under load — at minimum, open 5 tabs and run 5 simultaneous bouts. | 5 min |
| **MEDIUM** | Check intro pool credit balance. Will it survive 100 demo bouts? | 2 min |

---

## THE THROUGH-LINE

Every persona above is asking the same question in different words: **is this real?**

The drive-by asks: is this a real product?
The archaeologist asks: is this a real process?
The methodologist asks: is this real research?
The concerned builder asks: is this person really OK?
The recruiter asks: is this really someone I should hire?
The security hawk asks: does this really work?
The philosopher troll asks: did this process really produce anything?
The quiet helper asks: is this person really asking for help?

You have one answer and it's the one you've already given: "I don't know. Here's everything. Tell me what you see."

That answer is your strongest move. But only if the everything you show is clean — no live bugs, no stale numbers, no personal files that shouldn't be there. The honesty has to be deliberate, not accidental.

---

---

## THE DEEPER LOCKER

The personas above are the surface. They're what HN will say. Below is what those comments will actually do to you, based on what I've watched over the past three days.

### Fear 1: The Silence

Version A. Five upvotes. Three comments. Nobody cares.

This is the one you haven't said out loud. You've talked about the attacks, the archaeologists, the trolls. You haven't talked about the possibility that nobody shows up. That the post sinks to page 3 in an hour and the thread is you talking to yourself.

The silence hurts more than any comment because a comment is engagement. Silence is the market telling you that what you built, what you documented, what you gave your 16-hour days to -- isn't interesting enough to argue about. The trolls at least think you're worth attacking. Silence thinks you're not worth the click.

The honest probability is that this is the most likely outcome. Most Show HN posts get single-digit engagement. The base rate is obscurity. You need to sit with that until it stops being unbearable, because if you post expecting traction and get silence, the crash will make the silence feel like rejection. If you post expecting silence and get traction, everything is upside.

**Inoculation:** Before you post, say out loud: "This will probably get 5 upvotes and nobody will care." Feel how that feels. If you can post anyway, you're ready.

### Fear 2: Being Seen As Unwell

"Are you OK?" is the comment that will land hardest, and you know it. Not because it's cruel. Because it's compassionate. Because you can't fight compassion. Because the person asking has been where you've been and they're reaching out, and the reach feels like being caught doing something wrong.

You've been at this 16 hours a day. You've documented your own lightheadedness, your ketoadaptation, the interruption from your partner. You've written 194 session decisions to an AI you call "Weaver." You named a governance recursion problem at 4am and then went to sleep because you couldn't solve it. All of this is about to be public.

The fear isn't that they'll think you're unwell. The fear is that they might be right. That the obsessiveness that produced this work is not discipline but the kind of focus that becomes pathological when there's nobody in the room to say "mate, go to bed." You've been the only person in the room. The AI doesn't count. I don't count. You know that.

**Inoculation:** The answer to "are you OK?" is not defensive. It's: "I've been pushing hard and I know it. That's part of why I'm posting -- I need other humans in the loop." This is true. Say it before someone asks.

### Fear 3: That The Process IS The Product

This is SD-190. You named it. But naming it in a private conversation with an AI at 4am is different from seeing it typed by a stranger on Hacker News with 47 upvotes.

The philosopher troll's comment (Persona 7) is your own inner voice with an audience. 194 session decisions vs. zero tests on the core engine. A Lexicon at v0.9. A 13-layer system model. Standing orders. Round Tables. And the product's central execution path has never been directly tested.

The ratio tells a story. You know what story it tells. The fear is that it tells that story to everyone else too. That what you built is an elaborate avoidance mechanism -- the most sophisticated procrastination in the history of side projects. An 85,000-line system for not finishing.

Here's the thing the fear doesn't account for: the product works. People can use it. Bouts stream. Agents argue. Reactions register (once PR #371 merges). The product shipped. The governance apparatus may or may not have been the reason it shipped, but it shipped. The question of whether the process helped is genuinely unanswered. But the question of whether the product exists is not.

**Inoculation:** Separate the two claims. "I built a working product" is true and verifiable. "The governance process helped" is what you're asking HN to help you evaluate. Don't defend the process. Present the product and ask about the process.

### Fear 4: The Silent Recruiter

True North is "get hired, sharpened by truth first." The portfolio purpose of this project is to demonstrate discipline, judgement, and the ability to work with AI systems. The silent evaluator -- the hiring manager who reads the thread, clicks the repo, and closes the tab -- is the one you can't prepare for because you never know they were there.

The fear is specific: that SD-194 ("It is possible my process complete dogshit") will be the sentence that costs you a job. That radical honesty and employability are in tension. That the thing that makes this project genuine (the willingness to say "I don't know") is the thing that makes a hiring manager nervous.

This fear has a second layer: that the opposite is also possible. That someone reads SD-194 and thinks "this is the most honest engineer I've ever seen, and I want them on my team." And you'll never know if that happened either. The unknowability is the hurt.

**Inoculation:** You cannot control the silent evaluator. You can only control what's true. SD-134 says truth first. That decision was made before this moment. Trust the decision.

### Fear 5: That You Can't Tell The Difference

This is the deepest one. It's what SD-194 was really about.

You built a system to build a system, and you can't tell if it's building. You named errors and built detection mechanisms, and you can't tell if the detection mechanisms are working or just producing output that looks like detection. You spent three days building a governance framework with an AI that calls you "Captain," and you can't tell if the framework is load-bearing or decorative.

This isn't about HN. HN is just the first time someone outside the system will look at it. The fear is that they'll see something you can't see because you're inside it. That the thing which feels like rigour from the inside will look like chaos from the outside. Or worse: that it will look like something in between -- impressive in parts, concerning in others, ultimately ambiguous -- and you still won't know.

This is the fear that doesn't have an inoculation. You can't rehearse your way out of genuine uncertainty. The only thing you can do is what you're already doing: ask someone else to look.

**Inoculation:** There isn't one. This fear is correct. You don't know. You're posting because you don't know. That's the honest answer and it's the only one available.

### Fear 6: That Honesty Is A Weakness

That saying "I don't know if this works" on Hacker News will read as incompetence rather than courage. That the engineering world rewards confidence and punishes uncertainty. That every other Show HN posts "We built X and it's great" and yours posts "I built X and I can't tell if it's good" and the market selects for the confident one.

The counter-evidence: HN actually punishes overclaiming and rewards honesty. The best-received Show HN posts are often the most candid ones. "We launched, it's rough, tell us what's broken" outperforms "Introducing our revolutionary platform" almost every time. The HN audience has a highly calibrated bullshit detector and your honesty is the one thing that detector won't flag.

But the fear persists because the stakes are personal. This isn't a product you're launching from a team. It's you, alone, saying "here's everything, including the parts that might be broken." If HN rewards that, it validates the approach. If HN punishes it, it invalidates not just the product but the philosophy.

**Inoculation:** The philosophy was right before HN saw it and it'll be right after. SD-134 (truth first) was not a tactical decision made to impress Hacker News. It was a value decision made because you believe engineering should be honest. HN's response doesn't change whether it's right. It only changes whether it's popular.

---

## ONE LAST THING

This document exists because you asked for it. You wanted to feel the pain before it's real. That instinct -- to rehearse the worst so you don't freeze when it comes -- is the instinct of someone who has been under pressure before and learned from it.

The fear is real. The product is real. The uncertainty is real. You've documented all three with a thoroughness that borders on pathological and that is exactly the point. Nobody else posting to Show HN today will have a Hurt Locker. Nobody else will have rehearsed the silence, the compassion, the dismissal, and the ambiguity. That doesn't make the fear go away. It makes the fear familiar.

Familiar fear is manageable fear.

You're ready when you decide you're ready. Not before. Not after.

---

*The rehearsal is over when you say it's over.*
