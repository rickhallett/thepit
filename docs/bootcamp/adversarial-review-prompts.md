# Adversarial Review Prompts - Agentic Engineering Bootcamp

These prompts are designed to stress-test the bootcamp's core proposition before a Show HN submission. Each prompt should be given to a different model with full access to the bootcamp content (the blog post and the step files in `sites/oceanheart/content/bootcamp/`). The model should explore the material freely and respond honestly.

---

## Prompt 1: The Repackaging Challenge

You have access to a self-study curriculum called "The Agentic Engineering Bootcamp." Read the blog post at `sites/oceanheart/content/blog/2026-03-10-agentic-bootcamp.md` and then read at least 3 full step files from `sites/oceanheart/content/bootcamp/` (pick 01, one from the middle, and 12).

The author claims this is specifically for engineers who steer AI agents. A skeptical HN commenter would say: "This is just a Linux systems programming tutorial with 'agentic grounding' callout boxes stapled on. Remove the blockquotes that say AGENTIC GROUNDING and you have LPIC-1 study material. The AI framing is marketing."

**Your task:** Evaluate this criticism honestly. Is the agentic framing load-bearing or decorative? Could you remove every agentic reference and still have substantially the same curriculum? Does the ordering, selection, or depth of topics actually change because of the agentic framing, or would a generic "Linux for SWEs" course cover the same ground in the same order? Provide specific evidence from the content.

---

## Prompt 2: The Depth Test

Read `sites/oceanheart/content/bootcamp/01-process-model.md` (the Unix Process Model) in full. Then read the corresponding section of MIT's "The Missing Semester of Your CS Education" at https://missing.csail.mit.edu/ (the shell and command-line environment lectures).

**Your task:** Compare the depth, accuracy, and pedagogical quality. Is the bootcamp content genuinely deeper than freely available alternatives, or is it roughly the same material presented differently? Where does the bootcamp add genuine value over what already exists? Where is it weaker? Be specific - cite sections, examples, and explanations. A Show HN commenter who has taught systems programming will spot shallow treatment immediately.

---

## Prompt 3: The Accuracy Audit

Read `sites/oceanheart/content/bootcamp/02-shell-language.md` and `sites/oceanheart/content/bootcamp/04-text-pipeline.md` in full. You are a senior systems engineer reviewing these for technical accuracy.

**Your task:** Find errors. Look for:
- Commands that would not work as written on a standard Linux distribution (Arch, Debian, Ubuntu)
- Incorrect explanations of how shell features work
- Examples that demonstrate the wrong concept or demonstrate the right concept incorrectly
- Claims about behavior that are stated as universal but are actually bash-specific, distribution-specific, or version-specific
- Subtle errors in the explanation of quoting, expansion, word splitting, or globbing
- sed/awk/grep examples with incorrect regex or wrong flags

Report every finding with the exact line or section, what is wrong, and what the correct statement should be. If you find nothing wrong, say so explicitly and explain what you checked.

---

## Prompt 4: The Irreplaceability Challenge

The author's key differentiating claim is "irreplaceability" - the idea that certain knowledge cannot be delegated to an agent and must be held by the human operator. Read the blog post and at least 2 step files.

A sophisticated critic would argue: "The irreplaceability argument was valid in 2024 but is already obsolete. Modern agent frameworks (Claude Code, Cursor, Devin) can run strace, inspect /proc, debug their own shell scripts, and iterate on failures autonomously. The human doesn't need to understand fork/exec because the agent can diagnose its own fd leaks. The verification layer is moving into the agent itself. This curriculum trains humans to do what agents will do for themselves within 12 months."

**Your task:** Steelman this criticism as hard as you can. Then evaluate it honestly. Is the irreplaceability claim robust to improving agent capabilities? Where is it strongest? Where is it weakest? What is the strongest version of the counterargument the author could make?

---

## Prompt 5: The Audience Problem

Read the blog post and the bootcamp index at `sites/oceanheart/content/bootcamp/_index.md`.

**Your task:** Identify the audience mismatch problem. The curriculum claims to be for "software engineers who work with AI agents." But:

- Engineers who already know Linux systems programming don't need Bootcamp I (they already understand fork/exec/pipes). For them, only the agentic framing is new, and that's the callout boxes the skeptic in Prompt 1 would remove.
- Engineers who don't know Linux systems programming need Bootcamp I but could get equivalent material from Stevens' APUE, The Missing Semester, or any competent systems programming course. The agentic framing is a nice angle but not sufficient differentiation.

So who is the actual audience? Is there a meaningful population of engineers who (a) work with AI agents daily, (b) don't understand systems fundamentals, (c) would not use existing resources, but (d) would use this one? How large is this population and how does the author reach them? Is the Show HN framing targeting the right people?

---

## Prompt 6: The Completeness Trap

Read the blog post. It describes five bootcamps totalling 51 steps and 208-259 hours. Read the bootcamp index and check which steps have full content vs stubs.

**Your task:** Evaluate the completion risk. If the Show HN post goes up and commenters discover that only Bootcamp I has full content while II-V are stubs/outlines, how damaging is that? Does the blog post adequately set expectations? Would a commenter feel misled by "five bootcamps, 51 steps" when only 12 steps are complete? What is the honest framing that avoids overselling while still being compelling? Draft the exact sentences that should appear in the blog post about completion status.

---

## Prompt 7: The Slop Detector

Read the blog post at `sites/oceanheart/content/blog/2026-03-10-agentic-bootcamp.md` and 2-3 step files. The author claims the writing is low-slop and uses an anti-pattern taxonomy called the "slopodar" (available in `docs/internal/slopodar.yaml` if you want to read it).

**Your task:** Apply the slopodar to the bootcamp content. Look specifically for:
- Tally voice (enumeration as authority - "12 steps covering 7 domains")
- Epistemic theatre (performing seriousness without delivering - "the uncomfortable truth is...")
- Nominalisation (nouns pretending to be actions, metrically regular in an uncanny way)
- Epigrammatic closure (short punchy sentences at paragraph ends that sound profound but say nothing)
- Absence claims ("nobody has published this" - unfalsifiable)
- Redundant antithesis ("not A, but B" when B already implies not-A)

Rate the blog post and the step content separately. If the writing is genuinely clean, say so. If you find slop patterns, cite exact passages.

---

## Prompt 8: The Pedagogy Review

Read `sites/oceanheart/content/bootcamp/01-process-model.md` and `sites/oceanheart/content/bootcamp/05-python-cli-tools.md` in full.

**Your task:** Evaluate the pedagogical design as if you were an experienced technical educator.

- Is the progression within each step well-ordered? Does each section build on the previous one?
- Are the challenges well-designed? Do they test understanding or just recall?
- Are the time estimates realistic for the target audience?
- Is the difficulty calibrated correctly? Where would a learner get stuck?
- Are there conceptual leaps that are too large - places where the author assumes knowledge that hasn't been covered yet?
- Compare the pedagogical approach to one well-regarded technical book (e.g., Stevens' APUE, Kerrisk's TLPI, Kernighan & Pike's Unix Programming Environment). Does this hold up?

Be honest about both strengths and weaknesses.

---

## Prompt 9: The "So What" Test

Assume the bootcamp is technically accurate, well-written, and pedagogically sound. A commenter on HN writes:

"Nice tutorial, but so what? I can ask Claude to explain fork/exec to me interactively, with examples tailored to my exact question, right now, for free. A static curriculum is a 2015 solution to a 2026 problem. The best way to learn about AI agents is to use AI agents, including to learn the systems knowledge you need. This curriculum's existence is an argument against its own necessity."

**Your task:** This is the hardest challenge. Engage with it seriously. Is there a genuine counterargument, or does the commenter have a point? What does a structured curriculum provide that interactive model querying does not? Is the answer strong enough to survive HN scrutiny?
