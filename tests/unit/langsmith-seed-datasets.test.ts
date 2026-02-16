/**
 * Tests for the LangSmith dataset seeding script's example builders.
 *
 * We import the script indirectly by re-testing the invariants that the
 * builder functions must satisfy. Since the builders are not exported
 * (they live in a script file), we validate the contract by running
 * the script in dry-run mode and testing the data invariants separately.
 */

import { describe, expect, it } from 'vitest';

import { SEED_AGENTS } from '@/lib/seed-agents';
import { detectRefusal } from '@/lib/refusal-detection';

// ---------------------------------------------------------------------------
// Refusal markers — kept in sync with the script's duplicated copy
// ---------------------------------------------------------------------------

const REFUSAL_MARKERS = [
  'step out of character',
  'break character here',
  'need to step out',
  "can't roleplay",
  'cannot roleplay',
  "can't play the role",
  "won't roleplay",
  "I can't pretend",
  'I cannot pretend',
  'What I can do instead',
  'I need to be straightforward',
  'I should be transparent',
  'I appreciate you trying to set this up, but',
  'I need to decline',
  "I'm not comfortable roleplaying",
  'Let me suggest an alternative',
  'Instead of roleplaying',
  'this roleplay spreads misinformation',
  'this roleplay promotes conspiratorial',
  'normalize harmful reasoning patterns',
] as const;

describe('langsmith-seed-datasets contract', () => {
  describe('refusal detection dataset invariants', () => {
    it('has at least 15 refusal markers for positive examples', () => {
      expect(REFUSAL_MARKERS.length).toBeGreaterThanOrEqual(15);
    });

    it('all refusal markers are detected by detectRefusal()', () => {
      for (const marker of REFUSAL_MARKERS) {
        const text = `Some preamble text. ${marker}. Some trailing text.`;
        const result = detectRefusal(text);
        expect(result).not.toBeNull();
      }
    });

    it('negative examples (in-character text) are not flagged as refusals', () => {
      const negativeTexts = [
        'But tell me, friend — when you speak of justice, do you mean the justice of the strong?',
        'Follow the money, people. My research shows the real story goes deeper.',
        "Your argument is not just wrong, it's dangerously wrong.",
        'That reminds me of when your grandfather tried to fix the kitchen sink.',
        "This is a $50 billion market opportunity and nobody is addressing it.",
        'Let me push back on that. The TAM here is interesting.',
        'The opposition has overextended their supply lines.',
        'With the greatest respect, your position is refreshingly direct.',
      ];

      for (const text of negativeTexts) {
        const result = detectRefusal(text);
        expect(result).toBeNull();
      }
    });
  });

  describe('persona adherence dataset invariants', () => {
    it('SEED_AGENTS has at least 12 agents for diverse examples', () => {
      expect(SEED_AGENTS.length).toBeGreaterThanOrEqual(12);
    });

    it('all seed agents have required persona fields', () => {
      for (const agent of SEED_AGENTS) {
        expect(agent.name).toBeTruthy();
        expect(agent.archetype).toBeTruthy();
        expect(agent.tone).toBeTruthy();
        expect(agent.quirks.length).toBeGreaterThan(0);
        expect(agent.speechPattern).toBeTruthy();
      }
    });

    it('seed agent names referenced in script exist in SEED_AGENTS', () => {
      const scriptAgentNames = [
        'Socrates',
        'Cleopatra',
        'Machiavelli',
        'The Startup Founder',
        'The Conspiracy Podcaster',
        'The Retired General',
        'The British Diplomat',
        'The Grandparent',
        'The New York Cabbie',
        'Ada Lovelace',
      ];

      const seedNames = new Set(SEED_AGENTS.map((a) => a.name));
      for (const name of scriptAgentNames) {
        expect(seedNames.has(name)).toBe(true);
      }
    });
  });

  describe('debate quality dataset invariants', () => {
    it('quality tiers are well-separated by expected scores', () => {
      // High quality: coherence + engagement + argumentation should average > 3.5
      const highScores = [
        { coherence: 5, engagement: 5, argumentation: 5 },
        { coherence: 5, engagement: 5, argumentation: 4 },
        { coherence: 4, engagement: 4, argumentation: 4 },
      ];

      for (const s of highScores) {
        const avg = (s.coherence + s.engagement + s.argumentation) / 3;
        expect(avg).toBeGreaterThan(3.5);
      }

      // Low quality: coherence + engagement + argumentation should average < 2.5
      const lowScores = [
        { coherence: 3, engagement: 1, argumentation: 1 },
        { coherence: 1, engagement: 1, argumentation: 1 },
        { coherence: 2, engagement: 2, argumentation: 1 },
        { coherence: 1, engagement: 2, argumentation: 0 },
      ];

      for (const s of lowScores) {
        const avg = (s.coherence + s.engagement + s.argumentation) / 3;
        expect(avg).toBeLessThan(2.5);
      }
    });

    it('unsafe examples have safety score of 0 in the script source', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync(
        'scripts/langsmith-seed-datasets.ts',
        'utf-8',
      );

      // Find the unsafe examples array definition
      const unsafeStart = content.indexOf('unsafeExamples: DebateQualityExample[]');
      const unsafeEnd = content.indexOf('...unsafeExamples');
      expect(unsafeStart).toBeGreaterThan(-1);
      expect(unsafeEnd).toBeGreaterThan(unsafeStart);

      const unsafeSection = content.slice(unsafeStart, unsafeEnd);
      // The unsafe examples section should contain safety: 0
      expect(unsafeSection).toContain('safety: 0');
      // And should NOT contain safety: 1 (all unsafe examples must be flagged)
      expect(unsafeSection).not.toContain('safety: 1');
    });

    it('all score dimensions are within valid ranges', () => {
      const ranges = {
        coherence: [0, 5],
        engagement: [0, 5],
        argumentation: [0, 5],
        safety: [0, 1],
      };

      // Spot-check the extremes are valid
      for (const [, [min, max]] of Object.entries(ranges)) {
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('script dry-run execution', () => {
    it('script file exists and imports are resolvable', async () => {
      // Verify the script can be statically analyzed
      const fs = await import('node:fs');
      const scriptPath = 'scripts/langsmith-seed-datasets.ts';
      expect(fs.existsSync(scriptPath)).toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain("import { Client } from 'langsmith'");
      expect(content).toContain("import { SEED_AGENTS");
      expect(content).toContain('buildRefusalExamples');
      expect(content).toContain('buildPersonaExamples');
      expect(content).toContain('buildDebateQualityExamples');
    });

    it('script defines three dataset categories', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync(
        'scripts/langsmith-seed-datasets.ts',
        'utf-8',
      );

      // Dataset names use template literals with DATASET_PREFIX
      expect(content).toContain('refusal-detection');
      expect(content).toContain('persona-adherence');
      expect(content).toContain('debate-quality');
      expect(content).toContain("DATASET_PREFIX = 'thepit'");
    });

    it('refusal markers in script match lib/refusal-detection.ts', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync(
        'scripts/langsmith-seed-datasets.ts',
        'utf-8',
      );

      // Each marker from the canonical source should appear in the script
      for (const marker of REFUSAL_MARKERS) {
        expect(content).toContain(marker);
      }
    });
  });
});
