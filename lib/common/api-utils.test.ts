/**
 * api-utils.test.ts — errorResponse, parseValidBody, rateLimitResponse.
 *
 * Tests the real functions against real Request/Response objects.
 * No mocks — these are pure functions with no external dependencies.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  errorResponse,
  parseValidBody,
  rateLimitResponse,
  API_ERRORS,
} from "./api-utils";

describe("errorResponse", () => {
  it("returns correct status and JSON envelope", async () => {
    const res = errorResponse(400, "BAD_REQUEST", "Something went wrong");
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({
      error: { code: "BAD_REQUEST", message: "Something went wrong" },
    });
  });

  it("includes details when provided", async () => {
    const res = errorResponse(422, "VALIDATION", "Invalid", { field: "name" });
    const body = await res.json();
    expect(body.error.details).toEqual({ field: "name" });
  });

  it("omits details when not provided", async () => {
    const res = errorResponse(500, "INTERNAL", "Server error");
    const body = await res.json();
    expect(body.error.details).toBeUndefined();
  });
});

describe("parseValidBody", () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number().int().positive(),
  });

  function jsonRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns parsed data for valid input", async () => {
    const req = jsonRequest({ name: "Alice", age: 30 });
    const result = await parseValidBody(req, testSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", age: 30 });
    }
  });

  it("returns 400 INVALID_JSON for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: "not json",
    });
    const result = await parseValidBody(req, testSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe(API_ERRORS.INVALID_JSON);
    }
  });

  it("returns 400 VALIDATION_ERROR for schema violation", async () => {
    const req = jsonRequest({ name: 123, age: -5 });
    const result = await parseValidBody(req, testSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe(API_ERRORS.VALIDATION_ERROR);
      expect(body.error.details).toBeDefined();
    }
  });

  it("returns 500 INTERNAL for non-SyntaxError read failures", async () => {
    // Simulate a stream failure — req.json() throws TypeError, not SyntaxError.
    const errorStream = new ReadableStream({
      start(controller) {
        controller.error(new TypeError("stream failure"));
      },
    });
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: errorStream,
      duplex: "half",
    });
    const result = await parseValidBody(req, testSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(500);
      const body = await result.response.json();
      expect(body.error.code).toBe(API_ERRORS.INTERNAL);
    }
  });

  it("returns 400 INVALID_JSON for empty body", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
    });
    const result = await parseValidBody(req, testSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe(API_ERRORS.INVALID_JSON);
    }
  });
});

describe("rateLimitResponse", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 429 with exact Retry-After header", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00Z"));
    // Reset 60s from now → Retry-After should be exactly 60.
    const resetAt = new Date("2026-03-04T12:01:00Z");
    const res = rateLimitResponse({ remaining: 0, resetAt });

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");

    const body = await res.json();
    expect(body.error.code).toBe(API_ERRORS.RATE_LIMITED);
  });

  it("sets Retry-After to at least 1 second when resetAt is in the past", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00Z"));
    // Reset time in the past.
    const resetAt = new Date("2026-03-04T11:59:59Z");
    const res = rateLimitResponse({ remaining: 0, resetAt });

    expect(res.headers.get("Retry-After")).toBe("1");
  });
});
