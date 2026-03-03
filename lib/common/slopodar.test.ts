import { describe, it, expect } from "vitest";
import { loadSlopodar, getDomains } from "./slopodar";

describe("slopodar", () => {
  it("loads patterns from YAML", () => {
    const patterns = loadSlopodar();
    expect(patterns.length).toBeGreaterThan(10);
  });

  it("every pattern has required fields", () => {
    const patterns = loadSlopodar();
    for (const p of patterns) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.domain).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.trigger).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(p.severity);
    }
  });

  it("no duplicate ids", () => {
    const patterns = loadSlopodar();
    const ids = patterns.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("getDomains returns sorted unique domains", () => {
    const patterns = loadSlopodar();
    const domains = getDomains(patterns);
    expect(domains.length).toBeGreaterThan(0);
    // Verify sorted
    const sorted = [...domains].sort();
    expect(domains).toEqual(sorted);
  });

  it("known patterns are present", () => {
    const patterns = loadSlopodar();
    const ids = patterns.map((p) => p.id);
    expect(ids).toContain("tally-voice");
    expect(ids).toContain("epistemic-theatre");
    expect(ids).toContain("epigrammatic-closure");
    expect(ids).toContain("right-answer-wrong-work");
  });
});
