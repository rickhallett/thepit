// Slopodar data loader — reads the canonical YAML taxonomy
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

export interface SlopodarPattern {
  id: string;
  name: string;
  domain: string;
  detected: string;
  trigger: string;
  description: string;
  signal: string;
  instead: string;
  severity: "low" | "medium" | "high";
  signal_strength?: string;
  refs?: string[];
  examples?: Array<{
    id: string;
    date: string;
    ref: string;
    what_happened: string;
    success_criteria: string;
    failure_criteria: string;
    caught_by: string;
  }>;
}

interface SlopodarFile {
  patterns: SlopodarPattern[];
}

let cached: SlopodarPattern[] | null = null;

export function loadSlopodar(): SlopodarPattern[] {
  if (cached) return cached;

  const filePath = join(process.cwd(), "docs", "internal", "slopodar.yaml");
  const raw = readFileSync(filePath, "utf-8");
  const data = parse(raw) as SlopodarFile;

  cached = data.patterns;
  return cached;
}

export function getDomains(patterns: SlopodarPattern[]): string[] {
  const domains = new Set(patterns.map((p) => p.domain));
  return Array.from(domains).sort();
}
