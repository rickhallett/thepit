'use client';

/**
 * DnaFingerprint — visual identity glyph derived from a cryptographic hash.
 *
 * Renders a deterministic, horizontally-symmetric 5×5 grid as an inline SVG.
 * Same hash always produces the same pattern and colour; different hashes
 * produce visually distinct glyphs.
 *
 * Designed to sit next to agent names on cards (32–64 px typical size)
 * and look at home on THE PIT's dark background (#0b0b0b).
 */

import { clsx } from 'clsx';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DnaFingerprintProps {
  /** 0x-prefixed 32-byte hex hash (66 chars). */
  hash: string;
  /** Pixel size (width = height). Default 32. */
  size?: number;
  /** Additional Tailwind / CSS classes on the wrapping <svg>. */
  className?: string;
}

// ── Palette ──────────────────────────────────────────────────────────────────
// Curated set of colours that pop on dark (#0b0b0b) backgrounds.
// Inspired by Tokyo Night, but pushed for distinctiveness.

const DNA_PALETTE = [
  '#7aa2f7', // blue
  '#bb9af7', // purple
  '#7dcfff', // cyan
  '#ff9e64', // orange
  '#f7768e', // red/pink
  '#9ece6a', // green
  '#e0af68', // gold
  '#d7ff3f', // accent (lime — project accent colour)
  '#c0caf5', // pale blue-white
  '#73daca', // teal
  '#b4f9f8', // aqua
  '#ff7a93', // rose
  '#2ac3de', // sky
  '#449dab', // steel
  '#ad8ee6', // lavender
  '#a9b1d6', // silver
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip 0x prefix and validate hex. Returns a 64-char lowercase hex string
 * or null if the input is invalid.
 */
export function normalizeHash(raw: string): string | null {
  const trimmed = raw.replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Parse a normalized 64-char hex string into an array of byte values (0–255).
 */
export function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}

/**
 * Generate the 5×5 grid cell data from a 32-byte hash.
 *
 * Layout: the grid is 5 columns × 5 rows. Because we mirror horizontally,
 * we only need to decide 15 unique cells (columns 0–2 for each of 5 rows;
 * column 3 mirrors column 1, column 4 mirrors column 0).
 *
 * For each of the 15 unique cells we consume one byte:
 *   - Bit 0 (LSB): cell is "on" (filled) or "off" (empty)
 *   - Bits 1–7: used with the palette to pick a colour
 *
 * Bytes 15–16 set the background tint (subtle).
 */
export interface CellData {
  row: number;
  col: number;
  on: boolean;
  color: string;
}

export function generateGrid(hex: string): {
  cells: CellData[];
  bgColor: string;
} {
  const bytes = hexToBytes(hex);

  const cells: CellData[] = [];

  // 15 unique cells: 5 rows × 3 columns (0, 1, 2)
  for (let row = 0; row < 5; row++) {
    for (let half = 0; half < 3; half++) {
      const byteIdx = row * 3 + half;
      const byte = bytes[byteIdx] ?? 0;
      const on = (byte & 1) === 1;
      const colorIdx = (byte >> 1) % DNA_PALETTE.length;
      const color = DNA_PALETTE[colorIdx] as string;

      // Place the cell
      cells.push({ row, col: half, on, color });

      // Mirror (column 4 mirrors 0, column 3 mirrors 1; column 2 is centre)
      if (half < 2) {
        const mirrorCol = 4 - half;
        cells.push({ row, col: mirrorCol, on, color });
      }
    }
  }

  // Background tint: use byte 15 to pick a very dim version of a palette colour
  const bgByte = bytes[15] ?? 0;
  const bgColorIdx = bgByte % DNA_PALETTE.length;
  const bgColor = DNA_PALETTE[bgColorIdx] as string;

  return { cells, bgColor };
}

// ── Component ────────────────────────────────────────────────────────────────

const GRID_SIZE = 5;
const CELL_SIZE = 10; // Each cell is 10×10 in SVG coordinate space
const PADDING = 2;
const VIEWBOX_SIZE = GRID_SIZE * CELL_SIZE + PADDING * 2;

export function DnaFingerprint({
  hash,
  size = 32,
  className,
}: DnaFingerprintProps) {
  const hex = normalizeHash(hash);

  // Fallback: render a neutral placeholder for invalid/empty hashes
  if (!hex) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        className={clsx('inline-block shrink-0', className)}
        aria-label="Invalid hash"
        role="img"
      >
        <rect
          x={0}
          y={0}
          width={VIEWBOX_SIZE}
          height={VIEWBOX_SIZE}
          rx={3}
          fill="#1a1b26"
        />
      </svg>
    );
  }

  const { cells, bgColor } = generateGrid(hex);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      className={clsx('inline-block shrink-0', className)}
      aria-label={`DNA fingerprint for ${hash.slice(0, 10)}…`}
      role="img"
    >
      {/* Dark background with subtle tint */}
      <rect
        x={0}
        y={0}
        width={VIEWBOX_SIZE}
        height={VIEWBOX_SIZE}
        rx={3}
        fill="#1a1b26"
      />
      <rect
        x={0}
        y={0}
        width={VIEWBOX_SIZE}
        height={VIEWBOX_SIZE}
        rx={3}
        fill={bgColor}
        opacity={0.08}
      />

      {/* Grid cells */}
      {cells
        .filter((c) => c.on)
        .map((c) => (
          <rect
            key={`${c.row}-${c.col}`}
            x={PADDING + c.col * CELL_SIZE}
            y={PADDING + c.row * CELL_SIZE}
            width={CELL_SIZE}
            height={CELL_SIZE}
            rx={1.5}
            fill={c.color}
            opacity={0.9}
          />
        ))}
    </svg>
  );
}
