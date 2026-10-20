/**
 * The seeded voxel island behind the landing hero.
 *
 * This is the *description* of the scene, not its rendering: plain numbers, no three.js, no
 * DOM. That separation is the point — the whole layout can be regenerated and asserted in
 * jsdom, while the renderer only turns blocks into instanced meshes.
 *
 * Shape of the island:
 *
 * - A circular terrain disc of grass (sand on the outer rim) over dirt over stone, with the
 *   underside stepping in so the slab reads as a floating island rather than a cookie cut out
 *   of the ground.
 * - A 3x3 mossy-stone pad at the centre, with two wood-and-lantern posts flanking it. The
 *   renderer omits those posts (see `island-scene.ts`); the description keeps them so the
 *   generator's placement rules stay tested and a future scene can use them again.
 * - Three small trees on the outer ring, placed away from the pad.
 * - Four or five detached blocks hovering around the rim, at different heights. They are part
 *   of the description but are not rendered: the hero is a still diorama now.
 *
 * Everything is generated from one uint32 seed through {@link createRandom}; a coordinate
 * hash adds per-block colour variation later, but it is a pure function of the coordinate, not
 * of generation order. Blocks are deduplicated by position and sorted into a canonical order
 * (`y`, then `z`, then `x`) so two calls with the same seed compare equal as arrays.
 */

import { BLOCK_KINDS, type BlockKind } from './palette';
import { createRandom, hash3, normalizeSeed } from './random';

/** The island the landing page uses when no caller says otherwise. */
export const DEFAULT_ISLAND_SEED = 1_337_042;

/** Radius in blocks. The disc is 13 blocks across at this size. */
export const DEFAULT_ISLAND_RADIUS = 6;

/** Y of the top face of the highest solid block; the model and camera frame against it. */
export const GROUND_SURFACE_Y = 0.5;

/** One cube in block space, centred on integer coordinates. */
export interface VoxelBlock {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly kind: BlockKind;
}

/** Inclusive axis-aligned bounds in block coordinates. */
export interface VoxelBounds {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

/** The complete, serialisable description handed to the renderer. */
export interface VoxelIsland {
  /** The normalised seed, so a caller can prove which island it got. */
  readonly seed: number;
  readonly radius: number;
  /** Terrain, pad, posts and trees, in canonical order. */
  readonly blocks: readonly VoxelBlock[];
  /** Detached blocks around the rim. Kept separate because they move independently. */
  readonly floating: readonly VoxelBlock[];
  /** Bounds of every block, including the floating ones. */
  readonly bounds: VoxelBounds;
  /** Occupancy per kind across `blocks` and `floating`. */
  readonly counts: Readonly<Record<BlockKind, number>>;
}

/** Options for {@link createIsland}. */
export interface IslandOptions {
  /** Disc radius in blocks. Clamped to 2..12; anything non-integer falls back to 6. */
  readonly radius?: number;
}

/** Kinds used for the detached blocks. Not rendered today; kept for scene variety. */
const FLOATING_KINDS: readonly BlockKind[] = ['grass', 'stone', 'mossy_stone', 'sand', 'lantern'];

function clampRadius(radius: number | undefined): number {
  if (radius === undefined || !Number.isInteger(radius)) return DEFAULT_ISLAND_RADIUS;
  return Math.min(Math.max(radius, 2), 12);
}

function keyOf(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function sortBlocks(blocks: readonly VoxelBlock[]): readonly VoxelBlock[] {
  return [...blocks].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
}

function boundsOf(blocks: readonly VoxelBlock[]): VoxelBounds {
  if (blocks.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0] };
  }
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const block of blocks) {
    minX = Math.min(minX, block.x);
    minY = Math.min(minY, block.y);
    minZ = Math.min(minZ, block.z);
    maxX = Math.max(maxX, block.x);
    maxY = Math.max(maxY, block.y);
    maxZ = Math.max(maxZ, block.z);
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

function emptyCounts(): Record<BlockKind, number> {
  const counts = {} as Record<BlockKind, number>;
  for (const kind of BLOCK_KINDS) counts[kind] = 0;
  return counts;
}

/**
 * Generates the whole island.
 *
 * Total by construction: every input — including `NaN`, `Infinity`, a negative seed or a
 * fractional radius — produces a finite, well-formed island. No input throws.
 */
export function createIsland(seed: number, options: IslandOptions = {}): VoxelIsland {
  const normalized = normalizeSeed(seed);
  const random = createRandom(normalized);
  const radius = clampRadius(options.radius);
  const cells = new Map<string, VoxelBlock>();

  const put = (x: number, y: number, z: number, kind: BlockKind): void => {
    const key = keyOf(x, y, z);
    if (!cells.has(key)) cells.set(key, { x, y, z, kind });
  };
  const override = (x: number, y: number, z: number, kind: BlockKind): void => {
    cells.set(keyOf(x, y, z), { x, y, z, kind });
  };

  // --- terrain disc -------------------------------------------------------------------
  const outer = radius * radius;
  const rim = (radius - 0.6) * (radius - 0.6);
  const interior = (radius - 1.35) * (radius - 1.35);

  for (let x = -radius; x <= radius; x += 1) {
    for (let z = -radius; z <= radius; z += 1) {
      const distanceSquared = x * x + z * z;
      if (distanceSquared > outer) continue;

      const edge = distanceSquared > interior;
      // A sand ring on the outermost columns reads as a shore and stops the disc looking
      // like a stamped circle.
      const top: BlockKind = distanceSquared > rim ? 'sand' : 'grass';
      put(x, 0, z, top);

      const dirtDepth = edge ? 1 : 2;
      const depth = edge ? 2 + Math.floor(random() * 2) : 4 + Math.floor(random() * 2);
      for (let step = 1; step <= depth; step += 1) {
        put(x, -step, z, step <= dirtDepth ? 'dirt' : 'stone');
      }
    }
  }

  // --- central pad --------------------------------------------------------------------
  for (let x = -1; x <= 1; x += 1) {
    for (let z = -1; z <= 1; z += 1) {
      override(x, 0, z, 'mossy_stone');
    }
  }

  // --- lantern posts ------------------------------------------------------------------
  if (radius >= 4) {
    const post = radius >= 6 ? 3 : 2;
    for (const [x, z] of [
      [post, post],
      [-post, -post],
    ] as const) {
      put(x, 1, z, 'wood');
      put(x, 2, z, 'lantern');
    }
  }

  // --- trees --------------------------------------------------------------------------
  // The boss is narrow but very deep (its tail spans roughly +/-4.3 blocks in z), so trees are
  // placed on the island's flanks. A trunk through the tail is the one composition mistake
  // worth designing out rather than discovering in a browser.
  const treeCount = radius >= 4 ? 3 : 1;
  const treeAngles = [0.55, 2.95, 5.45] as const;
  const growTree = (x: number, z: number): void => {
    const height = 3 + Math.floor(random() * 2);
    for (let y = 1; y <= height; y += 1) put(x, y, z, 'wood');

    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dz = -2; dz <= 2; dz += 1) {
        if (Math.abs(dx) + Math.abs(dz) > 3) continue;
        if (dx === 0 && dz === 0) continue;
        put(x + dx, height, z + dz, 'leaf');
      }
    }
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        if (dx === 0 && dz === 0) continue;
        put(x + dx, height + 1, z + dz, 'leaf');
      }
    }
    put(x, height + 2, z, 'leaf');
  };

  for (let index = 0; index < treeCount; index += 1) {
    const angle = (treeAngles[index] ?? 0.55) + (random() - 0.5) * 0.3;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const distance = radius - 1.8 - random() * 0.5;
      const x = Math.round(Math.cos(angle) * distance);
      const z = Math.round(Math.sin(angle) * distance);
      if (x * x + z * z > (radius - 1) * (radius - 1)) continue;
      // Keep the pad and the posts clear.
      if (Math.abs(x) <= 2 && Math.abs(z) <= 2) continue;
      if (Math.abs(x) < 2.2 && Math.abs(z) < 4.6) continue;
      growTree(x, z);
      break;
    }
  }

  // --- detached blocks ----------------------------------------------------------------
  const floating: VoxelBlock[] = [];
  const floatingKeys = new Set<string>();
  const floatingCount = 4 + (random() < 0.5 ? 0 : 1);
  for (let index = 0; index < floatingCount; index += 1) {
    const angle = (index / floatingCount) * Math.PI * 2 + 0.4 + (random() - 0.5) * 0.4;
    const distance = radius + 1.6 + random() * 1.8;
    const x = Math.round(Math.cos(angle) * distance);
    const z = Math.round(Math.sin(angle) * distance);
    const y = 3 + Math.floor(random() * 4);
    const key = keyOf(x, y, z);
    if (cells.has(key) || floatingKeys.has(key)) continue;
    floatingKeys.add(key);
    const kind = FLOATING_KINDS[Math.floor(random() * FLOATING_KINDS.length)] ?? 'stone';
    floating.push({ x, y, z, kind });
  }

  const blocks = sortBlocks([...cells.values()]);
  const sortedFloating = sortBlocks(floating);
  const counts = emptyCounts();
  for (const block of blocks) counts[block.kind] += 1;
  for (const block of sortedFloating) counts[block.kind] += 1;

  return {
    seed: normalized,
    radius,
    blocks,
    floating: sortedFloating,
    bounds: boundsOf([...blocks, ...sortedFloating]),
    counts,
  };
}

/**
 * Stable per-block brightness in `[0.86, 1]`.
 *
 * The multiplier is a function of the seed and the coordinate, never of iteration order, so a
 * regenerated island keeps exactly the same colour variation.
 */
export function blockTint(seed: number, block: VoxelBlock): number {
  return 1 - hash3(seed, block.x, block.y, block.z) * 0.14;
}
