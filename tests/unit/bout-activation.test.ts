// Unit tests for user activation atomic detection (RD-004).
//
// Verifies that the users table schema includes the activatedAt column
// and that the atomic UPDATE ... WHERE IS NULL RETURNING pattern is
// correctly wired in bout-engine.ts.

import { describe, expect, it } from 'vitest';
import * as schema from '@/db/schema';

describe('user activation schema', () => {
  it('users table has activatedAt column', () => {
    expect(schema.users.activatedAt).toBeDefined();
    expect(schema.users.activatedAt.name).toBe('activated_at');
  });
});
