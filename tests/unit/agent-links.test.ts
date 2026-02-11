import { describe, expect, it } from 'vitest';
import { encodeAgentId, decodeAgentId, buildAgentDetailHref } from '@/lib/agent-links';

describe('agent-links', () => {
  it('encodes and decodes preset IDs with colons', () => {
    const id = 'preset:roast-battle:judge';
    const encoded = encodeAgentId(id);
    expect(encoded).not.toContain(':');
    expect(decodeAgentId(encoded)).toBe(id);
  });

  it('decodes semicolons as colons', () => {
    expect(decodeAgentId('preset;roast-battle;judge')).toBe('preset:roast-battle:judge');
  });

  it('handles invalid URI gracefully', () => {
    expect(decodeAgentId('%invalid')).toBe('%invalid');
  });

  it('buildAgentDetailHref returns correct path', () => {
    const href = buildAgentDetailHref('preset:roast-battle:judge');
    expect(href).toBe('/agents/preset%3Aroast-battle%3Ajudge');
  });
});
