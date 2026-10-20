/**
 * Procedural block art: deterministic bytes, palette-only colours, opaque pixels. These are
 * the invariants that keep the "no copied textures" claim true over time.
 */

import { BLOCK_KINDS, BLOCK_PALETTE, type PaletteColor } from './palette';
import { BLOCK_TEXTURE_BYTES, BLOCK_TEXTURE_SIZE, blockTexturePixels, pixelHash } from './pixels';

function paletteFor(kind: (typeof BLOCK_KINDS)[number]): Set<string> {
  return new Set(BLOCK_PALETTE[kind].colors.map((color) => color.join(',')));
}

describe('blockTexturePixels', () => {
  it('produces a complete opaque RGBA tile for every kind', () => {
    for (const kind of BLOCK_KINDS) {
      const pixels = blockTexturePixels(kind);
      expect(pixels.length).toBe(BLOCK_TEXTURE_BYTES);
      expect(pixels.length).toBe(BLOCK_TEXTURE_SIZE * BLOCK_TEXTURE_SIZE * 4);
      for (let offset = 3; offset < pixels.length; offset += 4) {
        expect(pixels[offset]).toBe(255);
      }
    }
  });

  it('uses only colours declared in the palette', () => {
    for (const kind of BLOCK_KINDS) {
      const pixels = blockTexturePixels(kind);
      const allowed = paletteFor(kind);
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const color: PaletteColor = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
        expect(allowed.has(color.join(','))).toBe(true);
      }
    }
  });

  it('is deterministic', () => {
    for (const kind of BLOCK_KINDS) {
      expect(pixelHash(blockTexturePixels(kind))).toBe(pixelHash(blockTexturePixels(kind)));
    }
  });

  it('gives every kind a distinct tile', () => {
    const hashes = BLOCK_KINDS.map((kind) => pixelHash(blockTexturePixels(kind)));
    expect(new Set(hashes).size).toBe(BLOCK_KINDS.length);
  });

  it('uses the fourth ramp slot only where the palette declares one', () => {
    for (const kind of BLOCK_KINDS) {
      const colors = BLOCK_PALETTE[kind].colors;
      const pixels = blockTexturePixels(kind);
      const used = new Set<string>();
      for (let offset = 0; offset < pixels.length; offset += 4) {
        used.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
      }
      expect(used.size).toBe(colors.length);
    }
  });
});
