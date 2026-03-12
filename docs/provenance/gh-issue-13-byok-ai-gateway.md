# GH Issue #13: Vercel AI Gateway BYOK

**Dispatched:** 2026-03-12T20:52 UTC
**Type:** Exploration
**Author:** rickhallett
**Labels:** feature, platform

## Problem

BYOK currently supports Anthropic keys only (plus OpenRouter). Users should be able to use any model provider via Vercel AI Gateway.

## Acceptance Criteria

- BYOK stash accepts keys for: Anthropic, OpenAI, Google, xAI (via AI SDK providers)
- Model selection UI shows available models per provider
- Bout engine routes to correct provider based on key type
- Error handling for invalid/expired keys

## Scope

- `lib/ai.ts`
- `lib/bout-engine.ts`
- BYOK stash API route
- Arena UI

**Complexity:** medium | **Risk:** medium (multi-provider routing adds failure surface)

## Provenance

- GitHub: https://github.com/rickhallett/thepit/issues/13
- Created: 2026-03-12T12:21:24Z
- Dispatched by: Mayor (Gas Town)
