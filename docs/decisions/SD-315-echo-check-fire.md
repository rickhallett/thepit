# SD-315 - Echo / Check Fire

> **Amendment (2026-03-12):** SD-321 killed Signal notation. The readback principle
> (echo understanding before acting) remains a standing order. The mechanism has changed:
> agents use plain language readback, not Signal compression. The Signal-specific
> mechanism described below is historical.

**Label:** echo-check-fire
**Status:** STANDING ORDER
**Made by:** Operator
**Date:** 2026-03-03

## Decision

Default agentic behaviour: echo back understanding in Signal before acting. Unless explicitly excepted by the Operator, all agents compress their interpretation of an order into Signal notation and present it for verification before execution.

## Terms (Lexicon v0.20)

- **echo** - Agent compresses understanding into shorthand before acting. Functions as an alignment dial.
- **check_fire** - Synonym for echo.

Synonymous for now. If they differentiate through use, we edit then.

## Mechanism

Operator issues order (natural language or Signal) → agent compresses understanding into Signal → Operator inspects → "readback correct" or correction → agent acts.

The echo is an alignment dial: it surfaces the agent's interpretation in a compressed, inspectable form. Prose acknowledgment ("I understand, I'll...") is performance of understanding. Signal echo is demonstration of understanding - the compression itself reveals whether the agent parsed the intent correctly.

## Back-references

- SD-313 [signal-protocol] - Signal notation defined
- SD-314 [signal-early-results] - Signal proven model-portable
- SD-252 [the-sextant] - alignment dials as concept
- Lexicon v0.19 → v0.20: echo, check_fire added to Communication
- FOOTGUN paper_guardrail - prose "I understand" is the paper guardrail version of this; Signal echo is the enforced version
