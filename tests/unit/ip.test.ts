import { describe, expect, it } from 'vitest';
import { resolveClientIp } from '@/lib/ip';

describe('resolveClientIp', () => {
  const makeHeaders = (entries: Record<string, string>) => new Headers(entries);

  it('prefers x-vercel-forwarded-for (trusted edge header)', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': '1.2.3.4',
      'x-forwarded-for': '5.6.7.8, 9.10.11.12',
    });
    expect(resolveClientIp(headers)).toBe('1.2.3.4');
  });

  it('uses rightmost x-forwarded-for entry (proxy-appended)', () => {
    const headers = makeHeaders({
      'x-forwarded-for': '10.0.0.1, 192.168.1.1, 203.0.113.50',
    });
    expect(resolveClientIp(headers)).toBe('203.0.113.50');
  });

  it('trims whitespace from forwarded entries', () => {
    const headers = makeHeaders({
      'x-forwarded-for': '10.0.0.1 , 192.168.1.1 , 203.0.113.50 ',
    });
    expect(resolveClientIp(headers)).toBe('203.0.113.50');
  });

  it('handles single x-forwarded-for entry', () => {
    const headers = makeHeaders({
      'x-forwarded-for': '203.0.113.50',
    });
    expect(resolveClientIp(headers)).toBe('203.0.113.50');
  });

  it('falls back to x-real-ip', () => {
    const headers = makeHeaders({
      'x-real-ip': '203.0.113.50',
    });
    expect(resolveClientIp(headers)).toBe('203.0.113.50');
  });

  it('returns unknown when no IP headers present', () => {
    const headers = makeHeaders({});
    expect(resolveClientIp(headers)).toBe('unknown');
  });

  it('ignores spoofed leftmost x-forwarded-for entry', () => {
    // Attacker sets x-forwarded-for: evil-ip, but proxy appends real-ip
    const headers = makeHeaders({
      'x-forwarded-for': '666.666.666.666, 203.0.113.50',
    });
    // Should return rightmost (proxy-appended), not leftmost (spoofed)
    expect(resolveClientIp(headers)).toBe('203.0.113.50');
  });

  it('handles IPv6 addresses in x-vercel-forwarded-for', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': '2001:db8::1',
    });
    expect(resolveClientIp(headers)).toBe('2001:db8::1');
  });
});
