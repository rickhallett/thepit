import { describe, expect, it } from 'vitest';

import { evaluateFormat } from '@/lib/eval/format';

describe('evaluateFormat', () => {
  describe('json format', () => {
    it('passes for valid JSON with text field', () => {
      const result = evaluateFormat({
        text: '{"text":"Hello world"}',
        formatId: 'json',
      });
      expect(result.key).toBe('format_compliance');
      expect(result.score).toBe(1);
    });

    it('fails for invalid JSON', () => {
      const result = evaluateFormat({
        text: 'This is not JSON at all.',
        formatId: 'json',
      });
      expect(result.score).toBe(0);
      expect(result.comment).toContain('JSON');
    });

    it('fails for JSON without text field', () => {
      const result = evaluateFormat({
        text: '{"message":"hello"}',
        formatId: 'json',
      });
      expect(result.score).toBe(0);
    });

    it('passes for JSON with extra whitespace', () => {
      const result = evaluateFormat({
        text: '  {"text": "Hello world"}  ',
        formatId: 'json',
      });
      expect(result.score).toBe(1);
    });
  });

  describe('plain format', () => {
    it('passes for plain text', () => {
      const result = evaluateFormat({
        text: 'This is a simple plain text response without any formatting.',
        formatId: 'plain',
      });
      expect(result.score).toBe(1);
    });

    it('fails when markdown headers present', () => {
      const result = evaluateFormat({
        text: '# Hello\n\nThis is markdown.',
        formatId: 'plain',
      });
      expect(result.score).toBe(0);
      expect(result.comment).toContain('markdown');
    });

    it('fails when bold markdown present at start of line', () => {
      const result = evaluateFormat({
        text: '**Bold text** should not appear in plain format.',
        formatId: 'plain',
      });
      expect(result.score).toBe(0);
    });

    it('fails when inline bold markdown present mid-line', () => {
      const result = evaluateFormat({
        text: 'This has **bold** words in the middle of a sentence.',
        formatId: 'plain',
      });
      expect(result.score).toBe(0);
    });

    it('fails when inline code backticks present', () => {
      const result = evaluateFormat({
        text: 'Use the `calculateTotal` function to get the sum.',
        formatId: 'plain',
      });
      expect(result.score).toBe(0);
    });

    it('fails when code blocks present', () => {
      const result = evaluateFormat({
        text: '```\ncode block\n```',
        formatId: 'plain',
      });
      expect(result.score).toBe(0);
    });
  });

  describe('spaced format', () => {
    it('passes for properly spaced text', () => {
      const result = evaluateFormat({
        text: 'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here.',
        formatId: 'spaced',
      });
      expect(result.score).toBe(1);
    });

    it('fails when markdown is present', () => {
      const result = evaluateFormat({
        text: '# Title\n\n**Bold paragraph**\n\nAnother paragraph.',
        formatId: 'spaced',
      });
      expect(result.score).toBe(0);
    });

    it('fails for multi-paragraph without spacing', () => {
      const result = evaluateFormat({
        text: 'First paragraph.\nSecond paragraph.\nThird paragraph.\nFourth paragraph.',
        formatId: 'spaced',
      });
      expect(result.score).toBe(0);
      expect(result.comment).toContain('blank line spacing');
    });

    it('passes for short single-paragraph response', () => {
      const result = evaluateFormat({
        text: 'A short response.',
        formatId: 'spaced',
      });
      expect(result.score).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('fails for empty response', () => {
      const result = evaluateFormat({ text: '', formatId: 'plain' });
      expect(result.score).toBe(0);
      expect(result.comment).toContain('Empty');
    });

    it('fails for whitespace-only response', () => {
      const result = evaluateFormat({ text: '   \n  \n  ', formatId: 'plain' });
      expect(result.score).toBe(0);
    });

    it('returns consistent key name across formats', () => {
      const json = evaluateFormat({ text: '{"text":"hi"}', formatId: 'json' });
      const plain = evaluateFormat({ text: 'hello', formatId: 'plain' });
      const spaced = evaluateFormat({ text: 'hello\n\nworld', formatId: 'spaced' });
      expect(json.key).toBe('format_compliance');
      expect(plain.key).toBe('format_compliance');
      expect(spaced.key).toBe('format_compliance');
    });
  });
});
