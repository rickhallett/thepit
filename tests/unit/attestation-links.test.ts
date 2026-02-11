import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('lib/attestation-links', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_EAS_SCAN_BASE;
  });

  // H1: Default base URL + uid
  it('builds correct default easscan.org URL', async () => {
    const { buildAttestationUrl } = await import('@/lib/attestation-links');
    const uid = '0x' + 'a'.repeat(64);
    const url = buildAttestationUrl(uid);
    expect(url).toBe(`https://base.easscan.org/attestation/view/${uid}`);
  });

  // H2: Custom base with trailing slash → normalized
  it('normalizes custom base URL with trailing slash', async () => {
    process.env.NEXT_PUBLIC_EAS_SCAN_BASE = 'https://custom.scan.io/att/';
    const { buildAttestationUrl } = await import('@/lib/attestation-links');
    const uid = '0xabc123';
    const url = buildAttestationUrl(uid);
    expect(url).toBe('https://custom.scan.io/att/0xabc123');
  });

  // H3: Base URL with {uid} template → uid substituted
  it('substitutes {uid} template in base URL', async () => {
    process.env.NEXT_PUBLIC_EAS_SCAN_BASE =
      'https://custom.scan.io/view/{uid}/details';
    const { buildAttestationUrl } = await import('@/lib/attestation-links');
    const uid = '0xdeadbeef';
    const url = buildAttestationUrl(uid);
    expect(url).toBe('https://custom.scan.io/view/0xdeadbeef/details');
  });

  // U1: Base ending in /attestation → /view appended
  it('appends /view when base ends with /attestation', async () => {
    process.env.NEXT_PUBLIC_EAS_SCAN_BASE =
      'https://base.easscan.org/attestation';
    const { buildAttestationUrl } = await import('@/lib/attestation-links');
    const uid = '0x123';
    const url = buildAttestationUrl(uid);
    expect(url).toBe('https://base.easscan.org/attestation/view/0x123');
  });
});
