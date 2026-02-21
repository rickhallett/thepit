import { describe, expect, it } from 'vitest';

import {
  generateGrid,
  hexToBytes,
  normalizeHash,
} from '@/components/dna-fingerprint';

// ── Test hashes ──────────────────────────────────────────────────────────────
const HASH_A =
  '0xf2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80';
const HASH_B =
  '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
const HASH_NO_PREFIX =
  'f2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80';
const HASH_UPPER =
  '0xF2D7077205AE5669EC1D82DCAACD45B2480D272BBB3443049899B31FDBA6FD80';
const HASH_ALL_ZEROS =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const HASH_ALL_FF =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

// ── normalizeHash ────────────────────────────────────────────────────────────

describe('normalizeHash', () => {
  it('strips 0x prefix and lowercases', () => {
    expect(normalizeHash(HASH_A)).toBe(
      'f2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80',
    );
  });

  it('accepts hashes without 0x prefix', () => {
    expect(normalizeHash(HASH_NO_PREFIX)).toBe(
      'f2d7077205ae5669ec1d82dcaacd45b2480d272bbb3443049899b31fdba6fd80',
    );
  });

  it('normalizes uppercase to lowercase', () => {
    expect(normalizeHash(HASH_UPPER)).toBe(normalizeHash(HASH_A));
  });

  it('returns null for empty string', () => {
    expect(normalizeHash('')).toBeNull();
  });

  it('returns null for short hex', () => {
    expect(normalizeHash('0xabcd')).toBeNull();
  });

  it('returns null for non-hex characters', () => {
    expect(
      normalizeHash(
        '0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
      ),
    ).toBeNull();
  });

  it('returns null for too-long hex', () => {
    expect(normalizeHash(HASH_A + 'ab')).toBeNull();
  });
});

// ── hexToBytes ───────────────────────────────────────────────────────────────

describe('hexToBytes', () => {
  it('converts hex pairs to byte values', () => {
    const bytes = hexToBytes('ff00ab');
    expect(bytes).toEqual([255, 0, 171]);
  });

  it('produces 32 bytes from a 64-char hex string', () => {
    const hex = normalizeHash(HASH_A)!;
    const bytes = hexToBytes(hex);
    expect(bytes).toHaveLength(32);
    expect(bytes.every((b) => b >= 0 && b <= 255)).toBe(true);
  });
});

// ── generateGrid ─────────────────────────────────────────────────────────────

describe('generateGrid', () => {
  it('produces 25 cells (5×5 grid)', () => {
    const hex = normalizeHash(HASH_A)!;
    const { cells } = generateGrid(hex);
    expect(cells).toHaveLength(25);
  });

  it('every cell has valid row (0–4) and col (0–4)', () => {
    const hex = normalizeHash(HASH_A)!;
    const { cells } = generateGrid(hex);
    for (const cell of cells) {
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(5);
      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeLessThan(5);
    }
  });

  it('is horizontally symmetric', () => {
    const hex = normalizeHash(HASH_A)!;
    const { cells } = generateGrid(hex);

    // Build a lookup: (row, col) → cell
    const lookup = new Map<string, (typeof cells)[0]>();
    for (const c of cells) {
      lookup.set(`${c.row},${c.col}`, c);
    }

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = lookup.get(`${row},${col}`);
        const mirror = lookup.get(`${row},${4 - col}`);
        expect(cell).toBeDefined();
        expect(mirror).toBeDefined();
        expect(cell!.on).toBe(mirror!.on);
        expect(cell!.color).toBe(mirror!.color);
      }
    }
  });

  it('is deterministic — same hash produces identical output', () => {
    const hex = normalizeHash(HASH_A)!;
    const first = generateGrid(hex);
    const second = generateGrid(hex);
    expect(first).toEqual(second);
  });

  it('produces different output for different hashes', () => {
    const gridA = generateGrid(normalizeHash(HASH_A)!);
    const gridB = generateGrid(normalizeHash(HASH_B)!);

    // At least one cell must differ in on/color
    const differs = gridA.cells.some(
      (cell, i) =>
        cell.on !== gridB.cells[i]!.on || cell.color !== gridB.cells[i]!.color,
    );
    expect(differs).toBe(true);
  });

  it('all-zeros hash produces a valid grid (all cells off)', () => {
    const hex = normalizeHash(HASH_ALL_ZEROS)!;
    const { cells } = generateGrid(hex);
    expect(cells).toHaveLength(25);
    // Byte 0x00: LSB is 0, so all cells should be off
    expect(cells.every((c) => !c.on)).toBe(true);
  });

  it('all-FF hash produces a valid grid (all cells on)', () => {
    const hex = normalizeHash(HASH_ALL_FF)!;
    const { cells } = generateGrid(hex);
    expect(cells).toHaveLength(25);
    // Byte 0xFF: LSB is 1, so all cells should be on
    expect(cells.every((c) => c.on)).toBe(true);
  });

  it('returns a bgColor string', () => {
    const hex = normalizeHash(HASH_A)!;
    const { bgColor } = generateGrid(hex);
    expect(typeof bgColor).toBe('string');
    expect(bgColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('covers all rows and columns', () => {
    const hex = normalizeHash(HASH_A)!;
    const { cells } = generateGrid(hex);

    const rows = new Set(cells.map((c) => c.row));
    const cols = new Set(cells.map((c) => c.col));
    expect(rows.size).toBe(5);
    expect(cols.size).toBe(5);
  });

  it('each (row, col) pair appears exactly once', () => {
    const hex = normalizeHash(HASH_A)!;
    const { cells } = generateGrid(hex);

    const keys = cells.map((c) => `${c.row},${c.col}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(25);
  });
});
