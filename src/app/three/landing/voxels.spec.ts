/**
 * The island generator is the part of the landing scene that must never surprise anyone: the
 * same seed has to rebuild the same world, every block has to be inside the reported bounds,
 * and the generator must accept any number a caller can hand it.
 */

import { BLOCK_KINDS } from './palette';
import { normalizeSeed } from './random';
import { blockTint, createIsland, DEFAULT_ISLAND_RADIUS, DEFAULT_ISLAND_SEED } from './voxels';

const kinds = new Set<string>(BLOCK_KINDS);

function coordinates(island: ReturnType<typeof createIsland>): string[] {
  return [...island.blocks, ...island.floating].map((block) => `${block.x},${block.y},${block.z}`);
}

describe('createIsland', () => {
  it('is deterministic for a seed', () => {
    const first = createIsland(42);
    const second = createIsland(42);

    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second.blocks.length).toBe(first.blocks.length);
    expect(second.floating.length).toBe(first.floating.length);
  });

  it('produces a different world for a different seed', () => {
    const first = createIsland(1);
    const second = createIsland(2);

    expect(second.blocks).not.toEqual(first.blocks);
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it('is total for hostile seeds', () => {
    for (const seed of [Number.NaN, Number.POSITIVE_INFINITY, -1, 3.9, 0]) {
      expect(() => createIsland(seed)).not.toThrow();
    }

    expect(createIsland(Number.NaN)).toEqual(createIsland(0));
    expect(createIsland(Number.POSITIVE_INFINITY)).toEqual(createIsland(0));
    expect(createIsland(3.9).seed).toBe(3);
    expect(createIsland(-1).seed).toBe(normalizeSeed(-1));
  });

  it('keeps the default island inside its own bounds', () => {
    const island = createIsland(DEFAULT_ISLAND_SEED);
    const { min, max } = island.bounds;

    for (const block of [...island.blocks, ...island.floating]) {
      expect(block.x).toBeGreaterThanOrEqual(min[0]);
      expect(block.x).toBeLessThanOrEqual(max[0]);
      expect(block.y).toBeGreaterThanOrEqual(min[1]);
      expect(block.y).toBeLessThanOrEqual(max[1]);
      expect(block.z).toBeGreaterThanOrEqual(min[2]);
      expect(block.z).toBeLessThanOrEqual(max[2]);
    }

    expect(min).toEqual([
      Math.min(
        ...island.blocks.map((block) => block.x),
        ...island.floating.map((block) => block.x),
      ),
      Math.min(
        ...island.blocks.map((block) => block.y),
        ...island.floating.map((block) => block.y),
      ),
      Math.min(
        ...island.blocks.map((block) => block.z),
        ...island.floating.map((block) => block.z),
      ),
    ]);
    expect(max[1]).toBeGreaterThanOrEqual(5);
  });

  it('uses only integer coordinates and palette kinds, without duplicates', () => {
    const island = createIsland(7);

    for (const block of [...island.blocks, ...island.floating]) {
      expect(Number.isInteger(block.x)).toBe(true);
      expect(Number.isInteger(block.y)).toBe(true);
      expect(Number.isInteger(block.z)).toBe(true);
      expect(kinds.has(block.kind)).toBe(true);
    }

    expect(new Set(coordinates(island)).size).toBe(island.blocks.length + island.floating.length);
  });

  it('puts a mossy pad at the centre and a sand rim on the disc edge', () => {
    const island = createIsland(DEFAULT_ISLAND_SEED);
    const at = (x: number, y: number, z: number): string | undefined =>
      island.blocks.find((block) => block.x === x && block.y === y && block.z === z)?.kind;

    expect(at(0, 0, 0)).toBe('mossy_stone');
    expect(at(1, 0, 1)).toBe('mossy_stone');
    expect(at(DEFAULT_ISLAND_RADIUS, 0, 0)).toBe('sand');
    expect(at(0, 0, -DEFAULT_ISLAND_RADIUS)).toBe('sand');
    expect(at(0, 0, 2)).toBe('grass');
  });

  it('stacks grass or sand over dirt over stone in every column', () => {
    const island = createIsland(DEFAULT_ISLAND_SEED);
    const columns = new Map<string, Map<number, string>>();
    for (const block of island.blocks) {
      const key = `${block.x},${block.z}`;
      const column = columns.get(key) ?? new Map<number, string>();
      column.set(block.y, block.kind);
      columns.set(key, column);
    }

    const tops = [...columns.values()].filter((column) => column.has(0));
    expect(tops.length).toBeGreaterThan(100);
    for (const column of tops) {
      expect(['grass', 'sand', 'mossy_stone']).toContain(column.get(0));
      expect(column.get(-1)).toBe('dirt');
      for (const [y, kind] of column) {
        if (y < 0) expect(['dirt', 'stone']).toContain(kind);
      }
    }
    // The interior is deep enough to reach stone; the tapered edge is not.
    expect(tops.some((column) => column.get(-3) === 'stone')).toBe(true);
  });

  it('reports occupancy that adds up to the blocks it returned', () => {
    const island = createIsland(DEFAULT_ISLAND_SEED);
    const total = island.blocks.length + island.floating.length;
    const counted = BLOCK_KINDS.reduce((sum, kind) => sum + island.counts[kind], 0);

    expect(counted).toBe(total);
    for (const kind of BLOCK_KINDS) {
      const actual = [...island.blocks, ...island.floating].filter(
        (block) => block.kind === kind,
      ).length;
      expect(island.counts[kind]).toBe(actual);
    }
    expect(island.counts.grass).toBeGreaterThan(0);
    expect(island.counts.lantern).toBeGreaterThan(0);
  });

  it('uses every palette kind on the default island', () => {
    const island = createIsland(DEFAULT_ISLAND_SEED);
    for (const kind of BLOCK_KINDS) {
      expect(island.counts[kind]).toBeGreaterThan(0);
    }
  });

  it('floats four or five blocks outside the terrain disc', () => {
    const island = createIsland(DEFAULT_ISLAND_SEED);

    expect(island.floating.length).toBeGreaterThanOrEqual(4);
    expect(island.floating.length).toBeLessThanOrEqual(5);
    for (const block of island.floating) {
      expect(block.x * block.x + block.z * block.z).toBeGreaterThan(island.radius * island.radius);
      expect(block.y).toBeGreaterThanOrEqual(3);
    }
  });

  it('clamps the radius instead of trusting the caller', () => {
    expect(createIsland(3, { radius: 100 }).radius).toBe(12);
    expect(createIsland(3, { radius: 1 }).radius).toBe(2);
    expect(createIsland(3, { radius: 3.5 }).radius).toBe(DEFAULT_ISLAND_RADIUS);
  });

  it('derives a stable per-block tint in the documented range', () => {
    const island = createIsland(DEFAULT_ISLAND_SEED);
    const block = island.blocks[0];

    expect(blockTint(island.seed, block)).toBe(blockTint(island.seed, block));
    expect(blockTint(island.seed, block)).toBeGreaterThanOrEqual(0.86);
    expect(blockTint(island.seed, block)).toBeLessThanOrEqual(1);
  });
});
