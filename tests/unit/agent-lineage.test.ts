import { describe, expect, it } from 'vitest';
import { buildLineage } from '@/lib/agent-lineage';

describe('buildLineage', () => {
  const nameLookup = new Map([
    ['parent-1', 'Parent One'],
    ['parent-2', 'Parent Two'],
    ['parent-3', 'Parent Three'],
    ['parent-4', 'Parent Four'],
  ]);

  const parentLookup = new Map<string, string | null>([
    ['parent-1', 'parent-2'],
    ['parent-2', 'parent-3'],
    ['parent-3', 'parent-4'],
    ['parent-4', null],
  ]);

  it('returns empty array when parentId is null', () => {
    expect(buildLineage(null, nameLookup, parentLookup)).toEqual([]);
  });

  it('returns empty array when parentId is undefined', () => {
    expect(buildLineage(undefined, nameLookup, parentLookup)).toEqual([]);
  });

  it('walks the parent chain up to maxDepth', () => {
    const result = buildLineage('parent-1', nameLookup, parentLookup, 3);
    expect(result).toEqual([
      { id: 'parent-1', name: 'Parent One' },
      { id: 'parent-2', name: 'Parent Two' },
      { id: 'parent-3', name: 'Parent Three' },
    ]);
  });

  it('defaults to maxDepth=3', () => {
    const result = buildLineage('parent-1', nameLookup, parentLookup);
    expect(result).toHaveLength(3);
  });

  it('stops when parent chain ends (null)', () => {
    const result = buildLineage('parent-3', nameLookup, parentLookup, 10);
    expect(result).toEqual([
      { id: 'parent-3', name: 'Parent Three' },
      { id: 'parent-4', name: 'Parent Four' },
    ]);
  });

  it('uses agent ID as fallback name when not in nameLookup', () => {
    const result = buildLineage('unknown-id', nameLookup, parentLookup);
    expect(result).toEqual([{ id: 'unknown-id', name: 'unknown-id' }]);
  });

  it('detects cycles and stops', () => {
    const cyclicParentLookup = new Map<string, string | null>([
      ['a', 'b'],
      ['b', 'a'], // cycle
    ]);
    const names = new Map([['a', 'A'], ['b', 'B']]);
    const result = buildLineage('a', names, cyclicParentLookup, 10);
    expect(result).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
  });
});
