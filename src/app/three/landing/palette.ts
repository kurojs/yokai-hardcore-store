/**
 * The block palette for the landing diorama.
 *
 * Every colour is a deliberate departure from Minecraft's own texture files: these are our
 * own RGB triples, chosen to sit inside the storefront's dark, warm-neutral shell rather than
 * to reproduce any shipped asset. The stone family stays blue-grey so it separates from the
 * warm page background, the greens are desaturated so they never outshout product photography,
 * and the lantern keeps a teal accent even though the renderer no longer draws the lantern
 * posts (the texture table stays complete so the generator and its tests keep one source of
 * truth).
 *
 * The palette lives in a three.js-free module because it is content, not rendering: the pixel
 * generator reads the same triples the material builder does, so a test can prove that every
 * texel came from this table.
 */

/** Every block the island can contain, in the order the palette declares them. */
export const BLOCK_KINDS = [
  'grass',
  'dirt',
  'stone',
  'mossy_stone',
  'sand',
  'wood',
  'leaf',
  'lantern',
] as const;

/** The closed set of block identities. */
export type BlockKind = (typeof BLOCK_KINDS)[number];

/** An sRGB triple in 0..255 component space. */
export type PaletteColor = readonly [number, number, number];

/** One block's visual identity: a small ordered ramp plus whether it emits light. */
export interface BlockStyle {
  readonly kind: BlockKind;
  /** Ordered colours; index 0 is the dominant tone and the last index is the accent. */
  readonly colors: readonly PaletteColor[];
  /** The lantern is the only emissive block; its texture doubles as the emissive map. */
  readonly emissive: boolean;
}

/**
 * The ramp order is meaningful to the pixel generator: `colors[0]` fills most of the tile,
 * `colors[1]` is the highlight, `colors[2]` the shadow, and `colors[3]` (when present) is a
 * rare accent such as moss or the lantern's teal. Four-tone tiles are the ones that need a
 * second material read at a glance — moss on stone, teal inside a lantern.
 */
export const BLOCK_PALETTE: Readonly<Record<BlockKind, BlockStyle>> = {
  grass: {
    kind: 'grass',
    colors: [
      [79, 122, 58],
      [95, 143, 69],
      [61, 95, 44],
    ],
    emissive: false,
  },
  dirt: {
    kind: 'dirt',
    colors: [
      [107, 74, 47],
      [125, 88, 56],
      [82, 54, 33],
    ],
    emissive: false,
  },
  stone: {
    kind: 'stone',
    colors: [
      [75, 85, 102],
      [90, 101, 120],
      [58, 66, 80],
    ],
    emissive: false,
  },
  mossy_stone: {
    kind: 'mossy_stone',
    colors: [
      [75, 85, 102],
      [90, 101, 120],
      [58, 66, 80],
      [63, 107, 74],
    ],
    emissive: false,
  },
  sand: {
    kind: 'sand',
    colors: [
      [185, 160, 106],
      [205, 180, 124],
      [156, 133, 87],
    ],
    emissive: false,
  },
  wood: {
    kind: 'wood',
    colors: [
      [91, 64, 40],
      [109, 79, 49],
      [70, 48, 29],
    ],
    emissive: false,
  },
  leaf: {
    kind: 'leaf',
    colors: [
      [63, 107, 58],
      [78, 127, 70],
      [46, 82, 48],
    ],
    emissive: false,
  },
  lantern: {
    kind: 'lantern',
    colors: [
      [22, 29, 40],
      [243, 201, 105],
      [176, 129, 55],
      [94, 234, 212],
    ],
    emissive: true,
  },
};

/** The dominant colour of a block, for callers that need one representative tone. */
export function dominantColor(kind: BlockKind): PaletteColor {
  return BLOCK_PALETTE[kind].colors[1];
}
