import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { requireAdmin } from '@/lib/admin-auth';

describe('requireAdmin', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  function makeReq(token?: string) {
    const headers = new Headers();
    if (token) headers.set('x-admin-token', token);
    return new Request('http://localhost/api/admin/test', {
      method: 'POST',
      headers,
    });
  }

  it('throws "Not configured." when ADMIN_SEED_TOKEN is not set', () => {
    delete process.env.ADMIN_SEED_TOKEN;
    expect(() => requireAdmin(makeReq('any-token'))).toThrow('Not configured.');
  });

  it('throws "Unauthorized" when no token header is provided', () => {
    process.env.ADMIN_SEED_TOKEN = 'secret-token';
    expect(() => requireAdmin(makeReq())).toThrow('Unauthorized');
  });

  it('throws "Unauthorized" for wrong token', () => {
    process.env.ADMIN_SEED_TOKEN = 'secret-token';
    expect(() => requireAdmin(makeReq('wrong-token'))).toThrow('Unauthorized');
  });

  it('throws "Unauthorized" for token of different length', () => {
    process.env.ADMIN_SEED_TOKEN = 'secret-token';
    expect(() => requireAdmin(makeReq('short'))).toThrow('Unauthorized');
  });

  it('does not throw for correct token', () => {
    process.env.ADMIN_SEED_TOKEN = 'secret-token';
    expect(() => requireAdmin(makeReq('secret-token'))).not.toThrow();
  });
});
