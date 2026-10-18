/**
 * Minecraft item/block model type definitions (the Java `item/*.json` format).
 *
 * Two layers live here, mirroring `../../bbmodel/types.ts`:
 *
 * - `ItemRaw*` — the shapes found in the JSON file, typed permissively. The file is
 *   untrusted input, so every field is optional and validated in `parse.ts`.
 * - The validated model (`ItemModel` and friends) — plain data with no three.js
 *   dependency, safe to unit test without a WebGL context.
 *
 * Every number quoted below is a measured fact about the real files in
 * `public/models/items/tlaloc/`; see `../README.md` for the derivation.
 */

import { BB_FACE_DIRECTIONS, type BbFaceDirection } from '../bbmodel/types';

/**
 * The six cube directions.
 *
 * Deliberately the bbmodel list rather than a second copy: the names come from the format
 * (Minecraft's `Direction` enum) and sharing the order keeps geometry output deterministic
 * across both pipelines.
 */
export const ITEM_FACE_DIRECTIONS = BB_FACE_DIRECTIONS;

/** A single cube face direction. */
export type ItemFaceDirection = BbFaceDirection;

/** A 3-component vector, used both as raw input and as validated output. */
export type Vec3 = readonly [number, number, number];

/** A quaternion, `[x, y, z, w]`. Plain data, so it needs no three.js and survives JSON. */
export type Quat = readonly [number, number, number, number];

/**
 * Model units per block.
 *
 * Item models are authored on a 16-unit cube: `from`/`to`, `display.translation` and
 * `emissive`-adjacent geometry are all in 1/16 block units. Kept here so the scene stays in
 * the file's own units and no conversion is ever implicit.
 */
export const ITEM_UNITS_PER_BLOCK = 16;

/**
 * The extent of the UV coordinate space every item model is expressed in.
 *
 * A UV of 16 spans the whole texture, whatever its pixel size: the pixel position of a UV
 * coordinate is `uv / 16 * texture_size`.
 */
export const ITEM_UV_SPACE = 16;

/** A rotation axis name, as written in the file. */
export type ItemAxis = 'x' | 'y' | 'z';

/**
 * One element rotation, in the file's **axis-angle** form.
 *
 * Not Euler and not interchangeable with bbmodel's `[rx, ry, rz]`: this is a single
 * rotation of `angle` degrees about `axis`, pivoting on `origin`. All 66 elements of the
 * two real 3D item models carry one, over the axes y, z and x and the angles
 * `-45, -22.5, 0, 22.5, 45`.
 */
export interface ItemRotation {
  readonly angle: number;
  readonly axis: ItemAxis;
  /** Pivot in model space. */
  readonly origin: Vec3;
}

/** A validated element face. */
export interface ItemFace {
  readonly direction: ItemFaceDirection;
  /**
   * `[x1, y1, x2, y2]` in the 16-unit UV space, y measured from the top of the texture.
   * Order is preserved, including the inverted order Blockbench uses to mirror a face.
   */
  readonly uv: readonly [number, number, number, number];
  /** Clockwise UV rotation in degrees. Non-zero on 12 of the staff's 222 faces. */
  readonly rotation: number;
  /** Raw texture key without the `#`, e.g. `"0"`. Kept for diagnostics. */
  readonly textureKey: string;
  /** The path `textureKey` resolved to, e.g. `"item/custom/tlaloc/tlaloc_staff"`. */
  readonly texturePath: string;
}

/** A validated element: an axis-aligned box with up to six textured faces. */
export interface ItemElement {
  /** Position in `elements`, so a warning can name the element a caller cannot. */
  readonly index: number;
  /** Minimum corner in model space. */
  readonly from: Vec3;
  /** Maximum corner in model space. */
  readonly to: Vec3;
  /**
   * Rotations in file order. The real files carry exactly one; an array is accepted and
   * preserved because the format allows it.
   */
  readonly rotations: readonly ItemRotation[];
  readonly faces: readonly ItemFace[];
}

/** One entry of the model's `textures` map. */
export interface ItemTexture {
  /** Map key, e.g. `"0"` or `"layer0"`. */
  readonly key: string;
  /**
   * Texture path as authored, e.g. `"item/custom/tlaloc/tlaloc_hat"` or
   * `"minecraft:item/netherite_sword"`. Never a URL: the resolution rule lives in
   * `textures.ts` so the module stays platform-free.
   */
  readonly path: string;
  /**
   * True for the `particle` key, which declares the dust colour/particle texture. It is not
   * a face texture and must never be treated as one.
   */
  readonly isParticle: boolean;
  /** True when the path is namespaced (`minecraft:...`), i.e. a delegate to a vanilla asset. */
  readonly isNamespaced: boolean;
}

/** The eight `display` contexts the format defines. */
export const ITEM_DISPLAY_CONTEXTS = [
  'thirdperson_righthand',
  'thirdperson_lefthand',
  'firstperson_righthand',
  'firstperson_lefthand',
  'ground',
  'gui',
  'head',
  'fixed',
] as const;

/** One of the eight `display` contexts. */
export type ItemDisplayContext = (typeof ITEM_DISPLAY_CONTEXTS)[number];

/**
 * One parsed `display` entry: how Minecraft poses the whole model in that context.
 *
 * This is the format's own data-driven posing and is what makes a store preview look like
 * an inventory icon instead of a free-floating model.
 */
export interface ItemDisplay {
  readonly context: ItemDisplayContext;
  /** Degrees per axis. Applied as an `XYZ` Euler, which is what Blockbench exports. */
  readonly rotation: Vec3;
  /** Model units, i.e. 1/16 block. */
  readonly translation: Vec3;
  readonly scale: Vec3;
}

/** A model with no `elements`: a flat sprite, either self-contained or delegated to `parent`. */
export interface ItemSprite {
  /** Key the sprite texture was taken from (`layer0` when the file has it). */
  readonly textureKey: string | null;
  /** Path of that key, or `null` when the file declares no usable texture. */
  readonly texturePath: string | null;
  /** `parent` as written, e.g. `"minecraft:item/handheld"`. */
  readonly parent: string;
}

/** What {@link ItemModel} describes: real geometry, or a parent-driven flat sprite. */
export type ItemModelKind = 'geometry' | 'sprite';

/** The validated intermediate model: JSON in, plain data out, no three.js. */
export interface ItemModel {
  readonly kind: ItemModelKind;
  /** UV space carrier. `[64, 64]` for both real 3D models. */
  readonly textureSize: { readonly width: number; readonly height: number };
  readonly textures: readonly ItemTexture[];
  /** Empty for a sprite. */
  readonly elements: readonly ItemElement[];
  /** Only the contexts the file actually declares. */
  readonly display: readonly ItemDisplay[];
  readonly sprite: ItemSprite | null;
  /** Non-fatal surprises worth surfacing (out-of-atlas UVs, unusable textures, odd keys). */
  readonly warnings: readonly string[];
}

// ---------------------------------------------------------------------------
// Raw file shapes
// ---------------------------------------------------------------------------

/** A raw item model document. Every field is optional because the file is untrusted. */
export interface ItemRawModel {
  readonly parent?: unknown;
  readonly credit?: unknown;
  readonly texture_size?: readonly number[];
  readonly textures?: unknown;
  readonly elements?: unknown;
  readonly display?: unknown;
  readonly groups?: unknown;
  readonly overrides?: unknown;
}
