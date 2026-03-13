// Validates all preset JSON files against their Zod schemas.
//
// This catches malformed presets before they reach production. Each preset
// file is validated against the appropriate schema based on its structure.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  rawPresetSchema,
  alternatePresetSchema,
  presetIndexSchema,
} from '@/lib/presets';

const PRESETS_DIR = path.resolve(__dirname, '../../presets');

// Preset files that use the standard RawPreset schema
const RAW_PRESET_FILES = [
  'darwin-special.json',
  'first-contact.json',
  'flatshare.json',
  'gloves-off.json',
  'last-supper.json',
  'mansion.json',
  'on-the-couch.json',
  'rea-baseline.json',
  'roast-battle.json',
  'shark-pit.json',
  'special-guest-hal.json',
  'summit.json',
  'writers-room.json',
];

// Premium preset pack files that use the AlternatePreset schema (array of presets)
const ALTERNATE_PRESET_FILES = [
  'presets-top5.json',
  'presets-remaining6.json',
];

describe('preset JSON validation', () => {
  describe('raw preset files', () => {
    for (const filename of RAW_PRESET_FILES) {
      it(`validates ${filename}`, () => {
        const filePath = path.join(PRESETS_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        const result = rawPresetSchema.safeParse(data);
        if (!result.success) {
          throw new Error(
            `${filename} failed validation:\n${JSON.stringify(result.error.format(), null, 2)}`
          );
        }
        expect(result.success).toBe(true);
      });
    }
  });

  describe('alternate preset pack files', () => {
    for (const filename of ALTERNATE_PRESET_FILES) {
      it(`validates ${filename}`, () => {
        const filePath = path.join(PRESETS_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        // These files contain arrays of alternate presets
        expect(Array.isArray(data)).toBe(true);

        for (let i = 0; i < data.length; i++) {
          const result = alternatePresetSchema.safeParse(data[i]);
          if (!result.success) {
            throw new Error(
              `${filename}[${i}] failed validation:\n${JSON.stringify(result.error.format(), null, 2)}`
            );
          }
          expect(result.success).toBe(true);
        }
      });
    }
  });

  describe('preset index', () => {
    it('validates index.json', () => {
      const filePath = path.join(PRESETS_DIR, 'index.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      const result = presetIndexSchema.safeParse(data);
      if (!result.success) {
        throw new Error(
          `index.json failed validation:\n${JSON.stringify(result.error.format(), null, 2)}`
        );
      }
      expect(result.success).toBe(true);
    });
  });

  describe('schema constraints', () => {
    it('rejects preset with empty preset_id', () => {
      const invalid = {
        preset_id: '',
        name: 'Test',
        agents: [
          { id: 'test', name: 'Test', system_prompt: 'Test', color: '#000000' },
        ],
      };
      const result = rawPresetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects preset with no agents', () => {
      const invalid = {
        preset_id: 'test',
        name: 'Test',
        agents: [],
      };
      const result = rawPresetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects agent with invalid color format', () => {
      const invalid = {
        preset_id: 'test',
        name: 'Test',
        agents: [
          { id: 'test', name: 'Test', system_prompt: 'Test', color: 'red' },
        ],
      };
      const result = rawPresetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('accepts valid preset with optional fields', () => {
      const valid = {
        preset_id: 'test',
        name: 'Test',
        description: 'A test preset',
        agents: [
          { id: 'test', name: 'Test', system_prompt: 'Test', color: '#FF0000', avatar: 'user' },
        ],
        max_turns: { standard: 6, juiced: 24, unleashed: 48 },
        requires_input: true,
        input_label: 'What should they discuss?',
        input_examples: ['Topic 1', 'Topic 2'],
      };
      const result = rawPresetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects alternate preset with missing required fields', () => {
      const invalid = {
        id: 'test',
        name: 'Test',
        // missing premise, tone, botCount, maxMessages, msgMaxLength, agents
      };
      const result = alternatePresetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('accepts valid alternate preset', () => {
      const valid = {
        id: 'test',
        name: 'Test',
        premise: 'A test premise',
        tone: 'casual',
        botCount: 2,
        maxMessages: 24,
        msgMaxLength: 280,
        agents: [
          { name: 'Agent 1', role: 'Role 1', systemPrompt: 'Prompt 1' },
          { name: 'Agent 2', role: 'Role 2', systemPrompt: 'Prompt 2' },
        ],
      };
      const result = alternatePresetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
