/**
 * Tests for the LangSmith Prompt Hub push script contract.
 *
 * Validates that:
 * - All prompt builders from lib/xml-prompt.ts produce valid XML output
 * - The script references all expected prompt templates
 * - Generated templates contain required XML structure
 */

import { describe, expect, it } from 'vitest';

import {
  buildSystemMessage,
  buildUserMessage,
  buildSharePrompt,
  buildAskThePitSystem,
  buildXmlAgentPrompt,
} from '@/lib/xml-prompt';

describe('langsmith-push-prompts contract', () => {
  describe('prompt builders produce valid XML output', () => {
    it('buildSystemMessage wraps safety/persona/format in XML tags', () => {
      const result = buildSystemMessage({
        safety: 'Stay in character.',
        persona: 'You are Socrates.',
        format: 'Plain text only.',
      });

      expect(result).toContain('<safety>');
      expect(result).toContain('</safety>');
      expect(result).toContain('<persona>');
      expect(result).toContain('</persona>');
      expect(result).toContain('<format>');
      expect(result).toContain('</format>');
    });

    it('buildUserMessage (opening) contains context and instruction', () => {
      const result = buildUserMessage({
        topic: 'AI ethics',
        lengthLabel: 'Standard',
        lengthHint: '~150 words',
        formatLabel: 'Plain text',
        formatHint: 'no markup',
        history: [],
        agentName: 'Socrates',
        isOpening: true,
      });

      expect(result).toContain('<context>');
      expect(result).toContain('<topic>');
      expect(result).toContain('<instruction>');
      expect(result).toContain('Open the debate');
      expect(result).not.toContain('<transcript>');
    });

    it('buildUserMessage (continuation) contains transcript and instruction', () => {
      const result = buildUserMessage({
        topic: 'AI ethics',
        lengthLabel: 'Standard',
        lengthHint: '~150 words',
        formatLabel: 'Plain text',
        formatHint: 'no markup',
        history: ['Machiavelli: Power is everything.'],
        agentName: 'Socrates',
        isOpening: false,
      });

      expect(result).toContain('<context>');
      expect(result).toContain('<transcript>');
      expect(result).toContain('<instruction>');
      expect(result).toContain('Respond in character');
    });

    it('buildSharePrompt contains task, rules, and transcript', () => {
      const result = buildSharePrompt('Agent A: Hello.\nAgent B: Hi.');

      expect(result).toContain('<task>');
      expect(result).toContain('<rules>');
      expect(result).toContain('<rule>');
      expect(result).toContain('<transcript>');
      expect(result).toContain('tweet-length');
    });

    it('buildAskThePitSystem contains role, rules, and documentation', () => {
      const result = buildAskThePitSystem({
        roleDescription: 'You are the pit master.',
        rules: ['Answer questions.', 'Stay in character.'],
        documentation: 'THE PIT is an AI debate arena.',
      });

      expect(result).toContain('<role>');
      expect(result).toContain('<rules>');
      expect(result).toContain('<rule>');
      expect(result).toContain('<documentation>');
    });

    it('buildXmlAgentPrompt wraps all persona fields in XML', () => {
      const result = buildXmlAgentPrompt({
        name: 'TestAgent',
        archetype: 'The Tester',
        tone: 'Precise',
        quirks: ['always tests', 'never assumes'],
        speechPattern: 'assertion-based',
        goal: 'Verify everything',
      });

      expect(result).toContain('<persona>');
      expect(result).toContain('<identity>');
      expect(result).toContain('TestAgent');
      expect(result).toContain('<tone>');
      expect(result).toContain('<quirks>');
      expect(result).toContain('<quirk>');
      expect(result).toContain('<speech-pattern>');
      expect(result).toContain('<goal>');
    });
  });

  describe('prompt builder output is non-trivial', () => {
    it('all builders produce output longer than 50 characters', () => {
      const outputs = [
        buildSystemMessage({
          safety: 'Stay safe.',
          persona: 'You are X.',
          format: 'Plain text.',
        }),
        buildUserMessage({
          topic: 'T',
          lengthLabel: 'S',
          lengthHint: 'h',
          formatLabel: 'F',
          formatHint: 'h',
          history: [],
          agentName: 'A',
          isOpening: true,
        }),
        buildSharePrompt('A: Hello.'),
        buildAskThePitSystem({
          roleDescription: 'R',
          rules: ['r1'],
          documentation: 'D',
        }),
        buildXmlAgentPrompt({ name: 'N' }),
      ];

      for (const output of outputs) {
        expect(output.length).toBeGreaterThan(50);
      }
    });
  });

  describe('script file integrity', () => {
    it('script references all 6 prompt template IDs', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync(
        'scripts/langsmith-push-prompts.ts',
        'utf-8',
      );

      const expectedIds = [
        'bout-system-message',
        'bout-user-message',
        'bout-opening-message',
        'share-line',
        'ask-the-pit',
        'agent-persona',
      ];

      for (const id of expectedIds) {
        expect(content).toContain(id);
      }
    });

    it('script imports all builder functions from lib/xml-prompt', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync(
        'scripts/langsmith-push-prompts.ts',
        'utf-8',
      );

      const builders = [
        'buildSystemMessage',
        'buildUserMessage',
        'buildSharePrompt',
        'buildAskThePitSystem',
        'buildXmlAgentPrompt',
      ];

      for (const builder of builders) {
        expect(content).toContain(builder);
      }
    });

    it('script documents that prompts are code-authoritative', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync(
        'scripts/langsmith-push-prompts.ts',
        'utf-8',
      );

      expect(content).toContain('code-authoritative');
      expect(content).toContain('read-only mirror');
    });

    it('script includes source file reference in manifests', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync(
        'scripts/langsmith-push-prompts.ts',
        'utf-8',
      );

      expect(content).toContain("sourceFile: 'lib/xml-prompt.ts'");
    });
  });

  describe('XML escaping in templates', () => {
    it('persona content is escaped in system messages via wrapPersona', () => {
      // Safety and format are developer-controlled (not escaped).
      // Persona plain text is wrapped via wrapPersona → xmlEscape.
      const result = buildSystemMessage({
        safety: 'Stay in character.',
        persona: 'Persona with "quotes" & <angle> brackets',
        format: 'Plain text.',
      });

      // wrapPersona wraps legacy text in <persona><instructions> with escaping
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;angle&gt;');
      expect(result).toContain('&quot;quotes&quot;');
    });

    it('user input is escaped in user messages', () => {
      const result = buildUserMessage({
        topic: '<script>alert("xss")</script>',
        lengthLabel: 'Standard',
        lengthHint: '~150 words',
        formatLabel: 'Plain',
        formatHint: 'hint',
        history: ['Agent: <b>bold</b>'],
        agentName: 'Agent<',
        isOpening: false,
      });

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<b>bold</b>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;b&gt;');
    });
  });
});
