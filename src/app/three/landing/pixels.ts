/**
 * Procedural 16x16 block textures.
 *
 * The landing scene ships no image files. Every texel is produced here from a deterministic
 * hash and a colour triple declared in `palette.ts`, which is why the result can look like a
 * Minecraft-adjacent voxel world without containing a single copied pixel:
 *
 * - the patterns are arithmetic (speckle weights, crack lines, bark stripes, a lantern frame),
 *   not traced or sampled from any existing texture;
 * - the colours are ours and derived from the storefront tokens, not from a game's palette;
 * - the same call always yields the same bytes, so no randomness leaks into a build.
 *
 * The output is plain RGBA bytes. Wrapping them in a `THREE.DataTexture` is the renderer's
 * job, so this module — and its tests — need no WebGL and no three.js.
 */

import { BLOCK_PALETTE, type BlockKind, type PaletteColor } from './palette';
import { hash2 } from './random';

/** Edge length of every block tile. 16 is the classic voxel resolution and stays crisp. */
export const BLOCK_TEXTURE_SIZE = 16;

/** Bytes in one RGBA tile. */
export const BLOCK_TEXTURE_BYTES = BLOCK_TEXTURE_SIZE * BLOCK_TEXTURE_SIZE * 4;

/** FNV-1a over the kind name, so each texture gets its own stable noise field. */
function kindSeed(kind: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < kind.length; index += 1) {
    hash ^= kind.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Index into a three-colour ramp by weight; the weights must sum to 1. */
function ramp3(value: number, base: number, highlight: number): 0 | 1 | 2 {
  if (value < base) return 0;
  if (value < base + highlight) return 1;
  return 2;
}

/**
 * Which ramp slot a texel uses.
 *
 * Each branch is a small, readable pattern. None of them is a copy of a game texture: they are
 * the minimum geometry needed for a tile to be recognisable at 16px — a speckled field, a
 * crack, bark stripes, a framed light.
 */
function colorIndex(kind: BlockKind, x: number, y: number, value: number): number {
  switch (kind) {
    case 'grass':
      return ramp3(value, 0.58, 0.24);
    case 'dirt':
      // A few darker pebbles break up an otherwise uniform brown.
      if ((x * 3 + y * 5) % 11 === 0) return 2;
      return ramp3(value, 0.6, 0.2);
    case 'stone':
      // A diagonal crack line, then sparse highlights.
      if ((x + y * 2) % 9 === 0) return 2;
      return value > 0.78 ? 1 : 0;
    case 'mossy_stone':
      // Moss wins on the darkest third; the stone ramp keeps the rest readable.
      if (value < 0.3) return 3;
      if ((x + y * 2) % 9 === 0) return 2;
      return value > 0.72 ? 1 : 0;
    case 'sand':
      return ramp3(value, 0.72, 0.18);
    case 'wood':
      // Vertical bark: every fourth column is a groove, every second one may catch light.
      if (x % 4 === 0) return 2;
      if (x % 4 === 2 && value < 0.55) return 1;
      return 0;
    case 'leaf':
      // Dark gaps read as the holes between leaves at this resolution.
      if ((x * 3 + y * 5) % 13 === 0) return 2;
      return value > 0.82 ? 1 : value < 0.2 ? 2 : 0;
    case 'lantern':
      // A dark frame, a warm body, and a teal glint for the storefront accent.
      if (x === 0 || x === BLOCK_TEXTURE_SIZE - 1 || y === 0 || y === BLOCK_TEXTURE_SIZE - 1) {
        return 0;
      }
      if ((x + y) % 7 === 0) return 3;
      return value < 0.22 ? 2 : 1;
  }
}

/**
 * Builds one tile as RGBA bytes, row-major from the top.
 *
 * Every texel is exactly one of the kind's declared palette colours; the tests assert that,
 * because it is the cheapest proof that no stray colour (or transparent pixel) crept in.
 */
export function blockTexturePixels(kind: BlockKind): Uint8Array {
  const colors = BLOCK_PALETTE[kind].colors;
  const seed = kindSeed(kind);
  const pixels = new Uint8Array(BLOCK_TEXTURE_BYTES);

  for (let y = 0; y < BLOCK_TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < BLOCK_TEXTURE_SIZE; x += 1) {
      const value = hash2(seed, x, y);
      const color: PaletteColor = colors[colorIndex(kind, x, y, value)] ?? colors[0];
      const offset = (y * BLOCK_TEXTURE_SIZE + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }

  return pixels;
}

/** FNV-1a over a texture's bytes, for determinism probes and tests. */
export function pixelHash(pixels: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < pixels.length; index += 1) {
    hash ^= pixels[index] ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
