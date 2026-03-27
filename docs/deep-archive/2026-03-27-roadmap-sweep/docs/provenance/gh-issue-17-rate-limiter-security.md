# GH Issue #17: Rate Limiter Security Audit

**Dispatched:** 2026-03-12T20:58 UTC
**Type:** Exploration / Security Audit
**Author:** rickhallett
**Labels:** needs-audit

## Problem

The rate limiter on `/api/run-bout` runs in-memory per serverless instance. In a multi-instance deployment (Vercel serverless fan-out), each instance maintains its own rate window independently. A distributed caller could bypass per-instance limits by hitting different instances.

## Current Mitigation

The DB-level credit preauthorization gate operates on shared state (Postgres). No credits = no bout execution, regardless of rate limiter state. This contains the financial exposure.

## Conditions for Escalation

All three must hold simultaneously for this to become material:

1. Intro credit pool large enough to sustain abuse
2. Per-bout API cost (Anthropic tokens) exceeds what the credit charge recovers
3. >50 concurrent serverless instances serving requests

Currently none of these hold.

## Options

- **Do nothing** - DB credit gate is sufficient containment at current scale
- **Redis/Upstash rate limiter** - shared state across instances
- **Vercel KV rate limiter** - platform-native, similar effort
- **API gateway rate limiting** - Vercel/Cloudflare layer, zero code change

## Priority

Low. Parked until traffic patterns justify revisiting.

## Provenance

- GitHub: https://github.com/rickhallett/thepit/issues/17
- Migrated from: thepit-pilot#373
- Created: 2026-03-12T12:37:02Z
- Dispatched by: Mayor (Gas Town)
