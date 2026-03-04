/**
 * rate-limit.test.ts — sliding window rate limiter.
 *
 * Uses vi.useFakeTimers() to control time progression.
 * This is time control, not infrastructure mocking — permitted under SO.no_mocks.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "./rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createRateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

    const r1 = limiter.check("user-1");
    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check("user-1");
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check("user-1");
    expect(r3.ok).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("denies requests at the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });

    limiter.check("user-1");
    limiter.check("user-1");

    const denied = limiter.check("user-1");
    expect(denied.ok).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  it("allows requests again after window expires (sliding window)", () => {
    const limiter = createRateLimiter({ windowMs: 10_000, maxRequests: 1 });

    const r1 = limiter.check("user-1");
    expect(r1.ok).toBe(true);

    // Immediately denied.
    const r2 = limiter.check("user-1");
    expect(r2.ok).toBe(false);

    // Advance past the window.
    vi.advanceTimersByTime(10_001);

    // The old timestamp has expired — allowed again.
    const r3 = limiter.check("user-1");
    expect(r3.ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    const a = limiter.check("user-a");
    expect(a.ok).toBe(true);

    // user-a is exhausted.
    const a2 = limiter.check("user-a");
    expect(a2.ok).toBe(false);

    // user-b is unaffected.
    const b = limiter.check("user-b");
    expect(b.ok).toBe(true);
  });

  it("resets a key's history", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    limiter.check("user-1");
    expect(limiter.check("user-1").ok).toBe(false);

    limiter.reset("user-1");

    expect(limiter.check("user-1").ok).toBe(true);
  });

  it("returns correct resetAt timestamp", () => {
    vi.setSystemTime(new Date("2026-03-04T12:00:00Z"));
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

    const r1 = limiter.check("user-1");
    // resetAt should be oldest entry (now) + windowMs.
    expect(r1.resetAt.getTime()).toBe(
      new Date("2026-03-04T12:00:00Z").getTime() + 60_000,
    );

    // Advance 10s, make another request.
    vi.advanceTimersByTime(10_000);
    const r2 = limiter.check("user-1");
    // resetAt is still based on the oldest (first) entry.
    expect(r2.resetAt.getTime()).toBe(
      new Date("2026-03-04T12:00:00Z").getTime() + 60_000,
    );
  });

  it("slides the window — oldest entries expire first", () => {
    const limiter = createRateLimiter({ windowMs: 10_000, maxRequests: 2 });

    // t=0: first request.
    limiter.check("user-1");

    // t=5s: second request.
    vi.advanceTimersByTime(5_000);
    limiter.check("user-1");

    // t=5s: limit reached.
    expect(limiter.check("user-1").ok).toBe(false);

    // t=10.001s: first request expires, but second (at t=5s) is still active.
    vi.advanceTimersByTime(5_001);
    const r = limiter.check("user-1");
    expect(r.ok).toBe(true);
    // After this check, we have 2 active entries (t=5s one and this new one).
    expect(r.remaining).toBe(0);
  });

  it("returns resetAt based on current time when no entries exist", () => {
    vi.setSystemTime(new Date("2026-03-04T12:00:00Z"));
    const limiter = createRateLimiter({ windowMs: 30_000, maxRequests: 5 });

    // Reset to clear any entries, then check with no history.
    limiter.reset("empty-key");
    const r = limiter.check("fresh-key");
    expect(r.resetAt.getTime()).toBe(
      new Date("2026-03-04T12:00:00Z").getTime() + 30_000,
    );
  });

  it("throws on zero maxRequests", () => {
    expect(() =>
      createRateLimiter({ windowMs: 60_000, maxRequests: 0 }),
    ).toThrow("Invalid rate limit config");
  });

  it("throws on negative windowMs", () => {
    expect(() =>
      createRateLimiter({ windowMs: -1, maxRequests: 5 }),
    ).toThrow("Invalid rate limit config");
  });

  it("throws on NaN config values", () => {
    expect(() =>
      createRateLimiter({ windowMs: NaN, maxRequests: 5 }),
    ).toThrow("Invalid rate limit config");

    expect(() =>
      createRateLimiter({ windowMs: 60_000, maxRequests: NaN }),
    ).toThrow("Invalid rate limit config");
  });

  it("throws on non-integer maxRequests", () => {
    expect(() =>
      createRateLimiter({ windowMs: 60_000, maxRequests: 2.5 }),
    ).toThrow("Invalid rate limit config");
  });

  it("denying a request does not add a timestamp", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    limiter.check("user-1"); // Uses the 1 allowed slot.
    limiter.check("user-1"); // Denied — should NOT add a timestamp.
    limiter.check("user-1"); // Denied again.

    // Advance past window — the single allowed entry expires.
    vi.advanceTimersByTime(60_001);

    // If denied requests added timestamps, we'd still be blocked.
    const r = limiter.check("user-1");
    expect(r.ok).toBe(true);
  });
});
