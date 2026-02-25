# Copy Advice: Hero Voice & "We" to "I" Change

Recorded 2026-02-23 by Weaver at Captain's request.
Captain reviewed and accepted in session. Notes on em-dash convention added per Captain's override.

---

## Hero Copy — Grammar & Formatting Notes

The Captain wrote the new hero copy in raw keystrokes. These notes were delivered before the Captain's em-dash directive.

### Line-by-line analysis

**"I built this with agents. Alone."**
No notes. Perfect opening.

**"(Trust, Distrust): I guess a bit like a tuple, they just go together."**
The colon after the closing paren is slightly unconventional. A dash would flow better, but the Captain has ruled against em-dashes as agentic tells (see Em-Dash Convention below). Options: keep the colon as-is (it's the Captain's keystrokes, human DNA), or use a period. "I guess" slightly undercuts the observation; dropping it makes the line land harder, but keeping it preserves the conversational warmth. Captain's call.

**"The deeper I plumbed, the more I needed both. Distrust of agentic silliness; trust in their brilliance."**
No notes. The semicolon is well-placed.

**"I hope this can be a bridge to more of that."**
No notes.

**"So, AI agents. Battle arena. Yup, I know."**
No notes. Unmistakably human. No agent writes "Yup, I know."

**"The bit that really matters to me is the trust layer."**
No notes.

**"They say these things might evolve together."**
"These things" is slightly ambiguous (agents and humans? trust and distrust?). The ambiguity may be fine — it's conversational. If clarity is wanted: "They say humans and agents might evolve together."

**"Ok, well let's see it then."**
"OK" is the more standard form (HN pedants exist). "OK. Well, let's see it then." — the full stop after OK gives it a beat, like a pause before committing.

**"Every agent has a human, here. Stamped on L2."**
The comma before "here" is unconventional but reads as deliberate spoken emphasis. It works. "Stamped on L2" is perfect — three words, maximum density.

**"Don't take my word on it, go test it."**
The standard idiom is "take my word **for** it" (not "on it"). The comma is a comma splice — a period or dash could fix it. But per em-dash convention, a period works: "Don't take my word for it. Go test it."

**"We have arrived in an age where provenance will rapidly overtake production as the biggest problem."**
This "we" is correct — it's humanity's "we", not a company "we". Consciously preserved during the we-to-I sweep. Suggestion: "is overtaking" instead of "will rapidly overtake" — it's already happening. More present-tense, more immediate.

**"I hope you have as much fun using it as I did building it."**
No notes. Clean closer, warm without saccharine.

---

## Em-Dash Convention (Captain's Override)

**Rule: Avoid em-dashes in all user-facing copy.**

The em-dash has become a meme for "classic AI" output. Even when grammatically correct, it triggers "not this again" reactions in audiences over-indexing on AI Slop detection. The Captain's ruling: even if correct, the agentic association outweighs grammatical benefit.

**Alternatives:** Use periods, commas, semicolons, colons, or just let the text breathe. The Captain's own keystrokes demonstrate this — short sentences, fragments, periods for emphasis.

This applies to all future copy work. Check existing copy for em-dash density and replace where possible without breaking meaning.

**Note on existing codebase:** The research page and analysis files contain em-dashes (`&mdash;` in TSX, `—` in Markdown). These should be audited in a follow-up pass but are lower priority than the we-to-I change.

---

## "We" to "I" — Blast Radius Assessment

### Change (60 instances across ~15 files)
- Copy JSONs (control.json, precise.json): ~15 instances each
- Research page (page.tsx): ~10 instances
- Citations page: ~3 instances
- Security page: ~2 instances
- Analysis files (H1-H6 .md): ~15 instances
- Pre-registration files (.md): ~12 instances

### Keep (100+ instances, do not touch)
- Privacy policy: ~45 instances — legal convention, expected by UK GDPR regulators
- Terms of service: ~3 instances — legal convention
- JSON bout data (shareLines, topics): ~40 instances — agent-generated content, colloquial "we"
- Code comments: ~10 instances — developer-facing, not user-facing

### Conscious Keeps Within Changed Files
- "We have arrived in an age..." (hero copy) — humanity's "we", not company "we"
- "What We Will Report Regardless of Outcome" (pre-reg headers) — assess individually; may convert to "What I Will Report" since one researcher
- Any "we" that clearly refers to humanity rather than the company/team
