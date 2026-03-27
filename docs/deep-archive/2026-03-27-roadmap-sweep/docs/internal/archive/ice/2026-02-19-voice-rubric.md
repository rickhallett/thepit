+++
title = "how to tell when your agent is performing at you"
author = "Richard Hallett"
date = "2026-02-19"
description = "I asked an agent to write a blog post. It was competent, well-structured, and made a good point. It also read like an AI wrote it. Here's the diagnostic, and the rubric we built to gate future output."
categories = ["Engineering", "AI"]
tags = ["agents", "voice", "writing", "llm-tells", "rubrics"]
draft = false
+++

I asked an agent to write a blog post about a debugging incident. The post was competent, well-structured, made a genuinely good point.

It also read like an AI wrote it.

So I asked a different agent to diagnose what was wrong. What came back was sharp enough that we turned it into a gating rubric. Here's that diagnostic, pretty much verbatim.

---

## The diagnosis

### Rhetorical overreach

- "Pattern matching wearing a suit" — punchy but manufactured. I wouldn't say this out loud.
- "Glorified `ctrl+F`" — closer to my register but buried in a paragraph that frames it too neatly.
- "Not with a bang. With a silent, competent-sounding fallback." — doing a Hemingway impression.

### Structural over-engineering

- Clean three-act structure (problem → pattern → resolution) with theatrical section headers ("The Competent-Sounding Wrong", "The Silent Degradation", "The Uncomfortable Truth").
- The numbered pattern list ("The helpful catch block", "The reasonable default", "The graceful fallback") is LLM tricolon instinct — three items, ascending.
- "The Gate" section with four bullet-point questions reads like a framework generated to look systematic.

### Tonal uncanny valley

- Oscillates between "casual dev blog" and "thought leadership piece" without committing.
- Phrases like "The uncomfortable truth" and "The intervention" are melodramatic for a timeout bug.
- The italicised closing is performing profundity about a 503 response.

### What was actually good (and therefore actually me)

- The core insight is real and earned.
- "fallback is a terrible idea. if anthropic times out blame anthropic" — that's my actual voice. Blunt, direct.
- The post-publication edit catching the agent's own embellishment — that's the best part. Meta, honest, funny, demonstrates the thesis.

---

## The voice profile

What I actually sound like, derived from unedited messages:

| Trait | Description | Example |
|---|---|---|
| Blunt directness | Says the thing without padding | "fallback is a terrible idea" |
| Earned authority | Claims from doing the thing, not frameworks | "This is the third time I've caught this" |
| Self-aware humour | Catches himself mid-performance | The post-publication edit |
| Short declarative punches | Fragments for impact | "That's not an assessment." |
| Anti-framework instinct | "here's what happened" over "here are 4 principles" | Narrative over taxonomy |

### What I don't sound like

- Thought leadership cadence ("Here's the uncomfortable truth about X")
- Ascending tricolons for false gravitas
- Theatrical section headers that promise revelation
- Italicised closing paragraphs performing profundity
- Bullet-point frameworks as substitute for narrative

---

## The rubric

We turned this into an XML scoring system. Eight dimensions, weighted. Target: ≥3.5 average, no dimension below 3.

```xml
<voice_rubric author="kai" version="1.0">

  <dimension id="D1" name="register_consistency" weight="0.15">
    Does the piece maintain consistent register? casual-technical throughout,
    or oscillating between dev-blog-bro and thought-leadership-keynote?
  </dimension>

  <dimension id="D2" name="earned_vs_performed_authority" weight="0.15">
    Authority from specific experience ("I built this, here's what happened")
    or from rhetorical framing ("Here's why this matters")?
  </dimension>

  <dimension id="D3" name="structural_honesty" weight="0.15">
    Structure serving the story, or story forced into template?
    Red flags: exactly 3 items, theatrical headers, ascending tricolons.
  </dimension>

  <dimension id="D4" name="metaphor_discipline" weight="0.10">
    Metaphors that explain ("glorified ctrl+F") or decorate
    ("pattern matching wearing a suit")?
  </dimension>

  <dimension id="D5" name="self_awareness_ratio" weight="0.10">
    Does it catch itself? Flag when something sounds too clean?
    AI never breaks its own frame.
  </dimension>

  <dimension id="D6" name="llm_tell_density" weight="0.15">
    Count: antithesis as default, semantic intensifiers, epistemic theatre,
    gratuitous frameworks, signposting, italicised profundity closings.
  </dimension>

  <dimension id="D7" name="emotional_calibration" weight="0.10">
    Intensity matches stakes? A timeout bug is interesting, not "devastating."
  </dimension>

  <dimension id="D8" name="closing_integrity" weight="0.10">
    Ends when done, or performs a conclusion?
    Italicised mic-drop = fail.
  </dimension>

</voice_rubric>
```

| verdict | score | action |
|---------|-------|--------|
| PASS | ≥3.5, no dim <3 | publish |
| REVISE | 2.5-3.4 | fix top 3 issues, re-score |
| REWRITE | <2.5 | start over |

---

## The LLM tells

Patterns to flag:

- **Antithesis as default** — "not X; it's Y"
- **Semantic intensifiers** — "truly", "deeply", "incredibly" doing no work
- **Epistemic theatre** — "This raises an interesting question"
- **Gratuitous frameworks** — bullet points where narrative would serve
- **Signposting** — "Let me break this down"
- **Affirmation sandwich** — validating before and after the actual point
- **Italicised closing** — performing profundity

---

## Scoring the original post

The post that triggered all this scored 2.55/5. Verdict: REVISE.

We kept it in production as a calibration example. The rewritten version scored 4.0/5.

The rubric works. The gate holds.

Whether this post passes its own rubric is left as an exercise.
