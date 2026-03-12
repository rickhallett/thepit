# Plan: oceanheart.ai Reframe for Market Proof

**Issued by:** Weaver
**Date:** 2026-03-12
**Status:** DRAFT - awaiting Operator review
**Directives consumed:** cv.todo.md, market.todo.md, so.todo.md
**Branch strategy:** feature branch per PR off main

---

## Objective

Resequence and reframe oceanheart.ai/cv, oceanheart.ai/about, and the homepage so that a hiring manager answers "senior engineer who ships" within 10 seconds, not "AI researcher who might also code."

No content is deleted. Substance is sound. Ordering is wrong for target audience.

---

## PR Decomposition

4 PRs, ordered by impact. Each is 1 concern, mergeable independently, verifiable by `hugo build`.

| PR | Branch | Scope | Files | Priority |
|----|--------|-------|-------|----------|
| 1 | `feat/cv-reframe` | CV page rewrite | `content/cv.md`, `layouts/_default/cv.html` | CRITICAL |
| 2 | `feat/about-reframe` | About page rewrite | `content/about.md` | HIGH |
| 3 | `feat/homepage-identity` | Homepage + site config alignment | `hugo.toml`, `layouts/index.html` | MEDIUM |
| 4 | (post-merge sweep) | Consistency check for stale "Agentic Systems Engineer" strings | any remaining | LOW |

PRs 1-3 are independent (no cross-deps). PR 4 depends on 1-3 merged.

---

## PR 1: CV Page Rewrite

**Branch:** `feat/cv-reframe`
**Files:** `content/cv.md`, `layouts/_default/cv.html`
**Verify:** `hugo build` in `sites/oceanheart/`

### 1.1 content/cv.md

**Current:**
```toml
+++
title = "CV"
description = "Richard (Kai) Hallett -- Agentic Systems Engineer"
layout = "cv"
+++
```

**Revised:**
```toml
+++
title = "CV"
description = "Richard (Kai) Hallett -- Senior Software Engineer"
layout = "cv"
+++
```

### 1.2 layouts/_default/cv.html - Header

**Current (L4-7):**
```html
<header>
  <p class="prompt">cat ./cv/richard-hallett.md</p>
  <h1>Richard (Kai) Hallett</h1>
  <p style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--muted);">Agentic Systems Engineer · kai@oceanheart.ai</p>
</header>
```

**Revised:**
```html
<header>
  <p class="prompt">cat ./cv/richard-hallett.md</p>
  <h1>Richard (Kai) Hallett</h1>
  <p style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--muted);">Senior Software Engineer · kai@oceanheart.ai</p>
</header>
```

### 1.3 layouts/_default/cv.html - Opening paragraph

**Current (L9-12):**
```html
<div class="cv-section">
  <p>I don't write the application code any more. I write the systems that make it safe for agents to write the application code: verification pipelines, context-window economics, operator telemetry. The 15 years I spent as a cognitive behavioural therapist before engineering turned out to be the preparation for exactly this -- noticing when a system is producing confident, coherent output that is completely wrong, and building the structural controls that catch it.</p>
  <p>Looking for a role where operational rigour in agentic systems is legible.</p>
</div>
```

**Revised:**
```html
<div class="cv-section">
  <p>Senior software engineer with 5 years shipping production code in TypeScript, Python, and Go across retail analytics (EDITED), social intelligence (Brandwatch), and network security (Telesoft). Currently building The Pit -- a full-stack evaluation platform in Next.js/TypeScript -- where I've developed the engineering practices that make AI-assisted development reliable: adversarial code review pipelines, deterministic build orchestration, and structured operator telemetry. The 15 years I spent as a CBT therapist before engineering turned out to be directly load-bearing -- it trained the pattern recognition that catches when systems produce confident output that is completely wrong.</p>
  <p>Looking for a senior engineering role where rigorous delivery practices and AI-augmented workflows are valued.</p>
</div>
```

**What changed:**
- First words: "Senior software engineer" not "I don't write the application code"
- Names employers and domains in sentence 1
- The Pit introduced as "full-stack evaluation platform" with stack named
- CBT is third, not first
- "Looking for" line uses "senior engineering role" - legible to any recruiter

### 1.4 layouts/_default/cv.html - Section reorder

**Current order:**
1. What I built
2. How a commit works
3. Experience
4. Education
5. Technical

**Revised order:**
1. How a commit works (moved UP - concrete evidence, strongest section)
2. What I built (reordered internally)
3. Experience (expanded)
4. Education
5. Technical (reordered internally)

### 1.5 layouts/_default/cv.html - "How a commit works" section

No content changes. Moved above "What I built" as-is. The directive says this is the strongest section and should come first.

### 1.6 layouts/_default/cv.html - "What I built" reorder

**Current order:**
1. The Gauntlet (most novel, least legible)
2. Pitkeel
3. Slopodar
4. Deterministic build orchestration
5. The Agentic Engineering Bootcamp

**Revised order (conventional first, novel last):**
1. Deterministic build orchestration (reads as DevOps/platform)
2. The Gauntlet (reads as CI/CD innovation)
3. Pitkeel (reads as tooling/observability)
4. Slopodar (reads as QA/quality culture)
5. The Agentic Engineering Bootcamp (reads as technical leadership)

Content of each item unchanged. Only sequence changes.

### 1.7 layouts/_default/cv.html - Experience entries expanded

**Current Oceanheart entry:**
```html
<div class="cv-entry">
  <span class="period">2024-present</span>
  <div class="role">Agentic Systems Engineer</div>
  <div class="org">Oceanheart.ai</div>
  <div class="desc">Building the coordination layer that makes human-AI delegation reliable. 11 specialised agents, 316+ session decisions on file, every commit cryptographically attested. The repo is <a href="https://github.com/rickhallett/thepit-v2">public</a>.</div>
</div>
```

**Revised:**
```html
<div class="cv-entry">
  <span class="period">2024-present</span>
  <div class="role">Senior Software Engineer</div>
  <div class="org">Oceanheart.ai</div>
  <div class="desc">Building The Pit -- a full-stack evaluation platform (Next.js, TypeScript, Python, Go). Shipping features against a public roadmap with CI/CD, adversarial code review, and 1000+ tests. Solo developer mirroring full team practices: PRs, issue tracking, milestones, structured deployment. The <a href="https://github.com/rickhallett/thepit-v2">repo is public</a>.</div>
</div>
```

**Current EDITED entry:**
```html
<div class="cv-entry">
  <span class="period">2022-2024</span>
  <div class="role">Software Engineer</div>
  <div class="org">EDITED · Retail analytics</div>
  <div class="desc">React, TypeScript, Python. Data visualisation of ML-driven retail insights. Enterprise SaaS.</div>
</div>
```

**Revised:**
```html
<div class="cv-entry">
  <span class="period">2022-2024</span>
  <div class="role">Software Engineer</div>
  <div class="org">EDITED · Retail analytics</div>
  <div class="desc">React, TypeScript, Python. Built data visualisation features for ML-driven retail insights served to enterprise clients. Worked across the frontend stack delivering interactive dashboards and reporting tools within an established SaaS platform.</div>
</div>
```

**NOTE:** Operator - I don't have detailed knowledge of what you shipped at EDITED, Brandwatch, or Telesoft. The directive says 2-3 lines per role describing what was shipped, the scale, and the technical context. The drafts below are minimal expansions of what's already on the page. You will need to fill in specifics. I've marked gaps with [OPERATOR INPUT NEEDED].

**Current Brandwatch entry:**
```html
<div class="cv-entry">
  <span class="period">2021-2022</span>
  <div class="role">Software Engineer</div>
  <div class="org">Brandwatch · Social intelligence</div>
</div>
```

**Revised:**
```html
<div class="cv-entry">
  <span class="period">2021-2022</span>
  <div class="role">Software Engineer</div>
  <div class="org">Brandwatch · Social intelligence</div>
  <div class="desc">[OPERATOR INPUT NEEDED: 2-3 lines. What did you ship? What was the stack? What was the scale? e.g. "Built and maintained features for the social listening platform processing X million mentions/day. TypeScript, React. Worked on Y and Z."]</div>
</div>
```

**Current Telesoft entry:**
```html
<div class="cv-entry">
  <span class="period">2019-2021</span>
  <div class="role">Software Engineer</div>
  <div class="org">Telesoft Technologies · Network security</div>
</div>
```

**Revised:**
```html
<div class="cv-entry">
  <span class="period">2019-2021</span>
  <div class="role">Software Engineer</div>
  <div class="org">Telesoft Technologies · Network security</div>
  <div class="desc">[OPERATOR INPUT NEEDED: 2-3 lines. What did you ship? What was the stack? What was the scale? e.g. "Developed network monitoring and security tooling for telecoms infrastructure. Node.js, Go, React. Worked on X and Y."]</div>
</div>
```

### 1.8 layouts/_default/cv.html - Technical skills reorder

**Current order:**
1. Agentic infrastructure
2. LLM operations
3. Systems
4. Frontend
5. Human-computer interaction

**Revised order + regrouped:**
```html
<div class="cv-tech-group">
  <span class="cv-tech-label">Languages</span>
  <div class="tech-tags">
    {{ range (slice "TypeScript" "Python" "Go" "Node.js" "SQL" "Bash") }}
    <span class="tech-tag">{{ . }}</span>
    {{ end }}
  </div>
</div>
<div class="cv-tech-group">
  <span class="cv-tech-label">Frontend</span>
  <div class="tech-tags">
    {{ range (slice "React" "Next.js" "Tailwind") }}
    <span class="tech-tag">{{ . }}</span>
    {{ end }}
  </div>
</div>
<div class="cv-tech-group">
  <span class="cv-tech-label">Backend & infrastructure</span>
  <div class="tech-tags">
    {{ range (slice "PostgreSQL" "Docker" "Make" "CI/CD (GitHub Actions)" "REST APIs") }}
    <span class="tech-tag">{{ . }}</span>
    {{ end }}
  </div>
</div>
<div class="cv-tech-group">
  <span class="cv-tech-label">Testing & quality</span>
  <div class="tech-tags">
    {{ range (slice "Vitest" "Integration testing" "Adversarial code review" "1000+ test suite") }}
    <span class="tech-tag">{{ . }}</span>
    {{ end }}
  </div>
</div>
<div class="cv-tech-group">
  <span class="cv-tech-label">AI-augmented development</span>
  <div class="tech-tags">
    {{ range (slice "Multi-model orchestration" "Structured prompt protocols" "Context-window management" "Anti-pattern detection" "Operator telemetry") }}
    <span class="tech-tag">{{ . }}</span>
    {{ end }}
  </div>
</div>
```

**What changed:**
- First 4 groups are immediately legible to any hiring manager
- "AI-augmented development" is fifth - the differentiator, not the identity
- TypeScript promoted to Languages (was only in Frontend)
- "Agentic infrastructure" and "LLM operations" merged into one group at the end
- "Human-computer interaction" items redistributed (telemetry to AI group, cognitive items dropped from skills - they're in the narrative)

---

## PR 2: About Page Rewrite

**Branch:** `feat/about-reframe`
**Files:** `content/about.md`
**Verify:** `hugo build` in `sites/oceanheart/`

### 2.1 content/about.md - Full revised content

**Current:**
```markdown
+++
title = "About"
description = "Rick Hallett -- agentic systems engineer, former cognitive behavioural therapist. Building the verification infrastructure that makes human-AI delegation reliable."
layout = "about"
+++

I spent 15 years as a cognitive behavioural therapist before I switched to software engineering. The through-line is the same problem: people (and now machines) produce confident, coherent output that is sometimes completely wrong, and the interesting work is building systems that catch it.

I write TypeScript, Python, and Go. I've shipped production code at EDITED (retail analytics), Brandwatch (social intelligence), and Telesoft (network security). 5 years in engineering, 15 in psychology. The psychology turns out to be load-bearing -- it directly produced the operator telemetry, the anti-pattern taxonomy, and the cognitive load controls that distinguish this work.

## What I'm building

**[The Pit](https://thepit.cloud)** -- an agentic evaluation arena. 11 specialised agents governed by integration discipline. Every session decision on file. The agents write code, review each other's work, and catch each other's mistakes. I govern the process by which their output becomes trustworthy. Cryptographically attested commits, multi-model adversarial review, operator fatigue monitoring. The [repo is public](https://github.com/rickhallett/thepit-v2).

**[The Agentic Engineering Bootcamp](/bootcamp/)** -- ...

**[oceanheart.ai](https://oceanheart.ai)** -- ...

**[slopodar](https://oceanheart.ai/slopodar/)** -- ...

## What I think about

...

## Contact

...
```

**Revised:**
```markdown
+++
title = "About"
description = "Rick Hallett -- senior software engineer. 5 years shipping production TypeScript, Python, and Go. Building The Pit, an evaluation platform, and learning in public about AI-augmented engineering."
layout = "about"
+++

I'm a software engineer with 5 years of production experience in TypeScript, Python, and Go, and 15 years before that as a cognitive behavioural therapist. I've shipped code at EDITED (retail analytics), Brandwatch (social intelligence), and Telesoft (network security). The through-line between the two careers is the same problem: noticing when a system -- human or machine -- is producing confident, coherent output that is completely wrong, and building the structural controls that catch it.

The psychology turns out to be load-bearing. It directly produced the operator telemetry, the anti-pattern taxonomy, and the cognitive load controls that distinguish this work.

## What I'm building

**[The Pit](https://thepit.cloud)** -- a full-stack evaluation platform where AI models compete in structured debate formats, backed by a credit economy and real-time scoring. Built in Next.js, TypeScript, Python, and Go with 1000+ tests and a [public repo](https://github.com/rickhallett/thepit-v2). Underneath the product is an agentic engineering layer: 11 specialised agents governed by integration discipline, multi-model adversarial code review, cryptographically attested commits, and operator fatigue monitoring. I govern the process by which their output becomes trustworthy.

**[The Agentic Engineering Bootcamp](/bootcamp/)** -- 51 steps across 5 bootcamps. Self-study material I wrote for myself and am publishing because it might be useful to others. Covers Linux substrate, agentic practices, operational analytics, evaluation/adversarial testing, and agent infrastructure. The material came directly out of the practical problems I hit building The Pit.

**[oceanheart.ai](https://oceanheart.ai)** -- this site. Learning in public about what happens when you give LLMs real responsibilities and then hold them to account.

**[slopodar](https://oceanheart.ai/slopodar/)** -- a field taxonomy of LLM output patterns caught in the wild. Epistemic theatre, paper guardrails, analytical lullabies.

## What I think about

How do you keep the human in the loop when the loop runs at machine speed? How do you build governance that scales without becoming theatre?

I came to this from therapy, where the core skill is noticing when someone (including yourself) is producing plausible-sounding nonsense. Turns out that skill transfers directly.

## Contact

- [kai@oceanheart.ai](mailto:kai@oceanheart.ai)
- [github.com/rickhallett](https://github.com/rickhallett)
- [linkedin.com/in/richardhallett86](https://www.linkedin.com/in/richardhallett86/)
```

**What changed:**
1. Frontmatter description: "senior software engineer" not "agentic systems engineer"
2. Opening paragraph: engineering identity first, therapy second, connecting insight third
3. Second paragraph preserved (psychology is load-bearing) but now follows engineering lead
4. The Pit description: product first (what it does for a user - evaluation platform, debate formats, credit economy, scoring), then engineering (stack, test count, public repo), then agentic layer underneath
5. Everything else stays as-is - Bootcamp, oceanheart, slopodar, "What I think about", Contact unchanged

---

## PR 3: Homepage + Site Config Alignment

**Branch:** `feat/homepage-identity`
**Files:** `hugo.toml`, `layouts/index.html`
**Verify:** `hugo build` in `sites/oceanheart/`

### 3.1 hugo.toml - params.description

**Current:**
```toml
description = "Rick Hallett -- agentic systems engineer. Building verification infrastructure for human-AI collaboration, and learning in public about what that requires."
```

**Revised:**
```toml
description = "Rick Hallett -- senior software engineer. Building The Pit, shipping production TypeScript/Python/Go, and learning in public about AI-augmented engineering."
```

### 3.2 layouts/index.html - Hero subtitle

**Current (L4-8):**
```html
<p class="subtitle">
  Agentic systems engineer. Building verification infrastructure
  for human-AI collaboration, and learning in public about what
  that requires.
</p>
```

**Revised:**
```html
<p class="subtitle">
  Senior software engineer. Shipping production TypeScript, Python,
  and Go. Building The Pit and learning in public about what
  AI-augmented engineering requires.
</p>
```

**What changed:**
- "Agentic systems engineer" -> "Senior software engineer"
- Stack named explicitly (TypeScript, Python, Go)
- The Pit named as product
- "verification infrastructure for human-AI collaboration" replaced with "AI-augmented engineering" - same domain, more legible framing

---

## PR 4: Post-merge Consistency Sweep

**Branch:** `chore/identity-consistency-sweep`
**Depends on:** PRs 1-3 merged
**Scope:** grep site-wide for remaining "Agentic Systems Engineer" (case-insensitive), verify no stale identity framing

**Expected locations that should NOT change:**
- Blog posts (historical, timestamped - leave as-is)
- Slopodar entries (taxonomy, not identity)
- Bootcamp content (educational, not identity)

**Expected locations that SHOULD be caught by PRs 1-3:**
- `content/cv.md` frontmatter (PR 1)
- `layouts/_default/cv.html` header + Oceanheart entry (PR 1)
- `content/about.md` frontmatter (PR 2)
- `hugo.toml` params.description (PR 3)
- `layouts/index.html` hero subtitle (PR 3)

This PR is verification only. If PRs 1-3 are complete, PR 4 should be a no-op or a one-line fix.

---

## Operator Input Required

Before execution can begin, the following gaps need your input:

| Item | Location | What's needed |
|------|----------|---------------|
| **Brandwatch role details** | PR 1, section 1.7 | 2-3 lines: what you shipped, stack, scale |
| **Telesoft role details** | PR 1, section 1.7 | 2-3 lines: what you shipped, stack, scale |
| **EDITED expansion** | PR 1, section 1.7 | Review my expansion - does it accurately describe the work? Add specifics if thin |
| **The Pit product description** | PR 2, section 2.1 | I described it as "AI models compete in structured debate formats, backed by a credit economy and real-time scoring" - is this accurate? Correct if not |
| **Title preference** | PR 1, section 1.2 | "Senior Software Engineer" vs "Senior Full-Stack Engineer" - directive offers both |
| **Homepage tagline** | PR 3, section 3.2 | "earth. lets stop the slop." stays as-is? It's distinctive but may confuse a cold visitor |

---

## Verification Protocol

Each PR:
1. Branch from main
2. Make changes
3. `hugo build` in `sites/oceanheart/` - must succeed
4. Visual check of rendered pages (hugo server)
5. Gate on main repo: `pnpm run typecheck && pnpm run lint && pnpm run test` (these pages are outside the TS codebase but gate must stay green)
6. PR with description per market.todo.md rules (product language, for external reader)
7. Merge, post-merge verify

---

## Execution Estimate

- PR 1 (CV): ~15 agent-minutes (mostly mechanical resequencing, blocked on Operator input for role details)
- PR 2 (About): ~8 agent-minutes
- PR 3 (Homepage): ~5 agent-minutes
- PR 4 (Sweep): ~5 agent-minutes
- Total: ~33 agent-minutes, gated on Operator input for role details

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Overcorrection - strip the distinctive voice | Directive explicitly says "don't overcorrect." Agentic work stays, it moves to position 2 not position 0 |
| Inaccurate role descriptions | Marked [OPERATOR INPUT NEEDED] - will not fabricate employment history |
| Hugo build breaks | Each PR verified independently with `hugo build` before merge |
| SEO/meta description drift | Checked: `head.html` uses `.Description` from frontmatter, which we're updating. RSS feeds will pick up new descriptions automatically |
| Stale cached pages on Vercel | Post-deploy verify on live URL after merge to main |
