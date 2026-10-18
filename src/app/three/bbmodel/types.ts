/**
 * Blockbench `.bbmodel` type definitions.
 *
 * Two layers live here:
 *
 * - `BbRaw*` — the shapes found in the JSON file, typed permissively. The file is
 *   untrusted input, so every field is optional and validated in `parse.ts`.
 * - The validated model (`BbModel` and friends) — a plain-data representation with no
 *   three.js dependency, safe to unit test without a WebGL context.
 *
 * Every convention recorded below was read out of the Blockbench source rather than
 * assumed. The file paths are the upstream ones (github.com/JannisX11/blockbench); the
 * numbers in the comments are what the real asset in `public/models/bosses/` contains.
 * See `../README.md` for the derivation.
 */

/** A 3-component vector, used both as raw input and as validated output. */
export type Vec3 = readonly [number, number, number];

/** The six cube face directions Blockbench emits, in its own iteration order. */
export const BB_FACE_DIRECTIONS = ['east', 'west', 'up', 'down', 'south', 'north'] as const;

/** A single cube face direction. */
export type BbFaceDirection = (typeof BB_FACE_DIRECTIONS)[number];

/**
 * Euler order Blockbench applies to cube and bone rotations.
 *
 * `js/io/format.ts` declares `euler_order` with `{default: 'ZYX'}`, and neither the
 * bundled `free` format (`js/formats/generic.ts`) nor any other overviews it.
 * `js/outliner/outliner.js` and `js/outliner/types/{cube,group}.js` then assign
 * `mesh.rotation.order = Format.euler_order` to every cube and bone mesh, so the editor
 * viewport really does evaluate the stored degrees in ZYX order.
 *
 * In three.js, `Euler(x, y, z, 'ZYX')` resolves to the matrix `Rz * Ry * Rx`.
 */
export const BB_EULER_ORDER = 'ZYX' as const;

/**
 * Animation channels Blockbench stores in `keyframes[].channel`.
 *
 * Semantics, from `js/animations/timeline_animators.js`:
 *
 * - `position` — an **offset added** to the bone's rest position
 *   (`displayPosition`: `bone.position.x += arr[0]`).
 * - `rotation` — an **offset added** to the bone's rest rotation, in degrees
 *   (`displayRotation`: `bone.rotation.x += Math.degToRad(arr[0])`).
 * - `scale` — an **absolute** multiplier, not an offset
 *   (`displayScale`: `bone.scale.x *= (1 + (arr[0] - 1) * multiplier)`).
 */
export type BbChannel = 'position' | 'rotation' | 'scale';

/** Loop modes Blockbench writes for an animation. */
export type BbLoopMode = 'loop' | 'once' | 'hold';

// ---------------------------------------------------------------------------
// Raw file shapes
// ---------------------------------------------------------------------------

/** Raw face entry: `uv` is `[x1, y1, x2, y2]` in texture pixels, y measured from the top. */
export interface BbRawFace {
  readonly uv?: readonly number[];
  readonly texture?: number | null;
  readonly rotation?: number;
}

/** Raw cube (`elements[]`). */
export interface BbRawElement {
  readonly name?: string;
  readonly uuid?: string;
  readonly from?: readonly number[];
  readonly to?: readonly number[];
  readonly origin?: readonly number[];
  readonly rotation?: readonly number[];
  readonly faces?: Readonly<Record<string, BbRawFace>>;
  /** Blockbench's per-element hidden flag. False means the editor hides the cube. */
  readonly visibility?: boolean;
  /**
   * When true, Blockbench scales the mesh to compensate for the shrink a rotation causes.
   * False on all 110 cubes of the real asset, so the compensation is never applied here.
   */
  readonly rescale?: boolean;
}

/** Raw outliner bone. `children` mixes cube uuid strings and nested bones. */
export interface BbRawBone {
  readonly name?: string;
  readonly uuid?: string;
  readonly origin?: readonly number[];
  readonly rotation?: readonly number[];
  readonly children?: readonly (string | BbRawBone)[];
}

/**
 * Raw keyframe.
 *
 * In the real asset `keyframes` is an **array** (`keyframes[].channel` is a name like
 * `"rotation"`, not a numeric index) and `data_points` always has length 1. Both facts were
 * measured over all 789 keyframes of the real asset; see `../README.md`.
 */
export interface BbRawKeyframe {
  readonly channel?: string;
  readonly time?: number;
  readonly interpolation?: string;
  readonly data_points?: readonly {
    readonly x?: unknown;
    readonly y?: unknown;
    readonly z?: unknown;
  }[];
}

/** Raw animator: one bone plus its keyframes. `type` is always `"bone"` in the real asset. */
export interface BbRawAnimator {
  readonly name?: string;
  readonly type?: string;
  readonly keyframes?: readonly BbRawKeyframe[];
}

/** Raw animation. `animators` is an object keyed by bone uuid, never an array. */
export interface BbRawAnimation {
  readonly name?: string;
  readonly loop?: string;
  readonly length?: number;
  readonly animators?: Readonly<Record<string, BbRawAnimator>>;
}

/** Raw embedded texture. `source` is an image data URI (or bare base64) in this asset. */
export interface BbRawTexture {
  readonly name?: string;
  readonly source?: string;
  readonly uuid?: string;
}

/** Raw top-level `.bbmodel` document. */
export interface BbRawModel {
  readonly name?: string;
  readonly resolution?: Record<string, unknown>;
  readonly elements?: readonly BbRawElement[];
  readonly outliner?: readonly (string | BbRawBone)[];
  readonly textures?: readonly BbRawTexture[];
  readonly animations?: readonly BbRawAnimation[];
}

// ---------------------------------------------------------------------------
// Validated model
// ---------------------------------------------------------------------------

/** A validated cube face. */
export interface BbFace {
  readonly direction: BbFaceDirection;
  /** Texture-pixel rectangle `[x1, y1, x2, y2]`, y from the top. Order is preserved. */
  readonly uv: readonly [number, number, number, number];
  /** Clockwise UV rotation in degrees. Non-zero on 6 of 660 faces in the real asset. */
  readonly rotation: number;
  /** Index into `BbModel.textures`. Always 0 for the real asset's 660 faces. */
  readonly textureIndex: number;
}

/** A validated cube. */
export interface BbCube {
  readonly uuid: string;
  readonly name: string;
  /** Owning bone uuid, or `null` when the cube sits at outliner root level. */
  readonly boneUuid: string | null;
  readonly from: Vec3;
  readonly to: Vec3;
  /** Rotation pivot in model space, and the mesh position the geometry is built around. */
  readonly origin: Vec3;
  /** Rotation in degrees about `origin`, applied with `BB_EULER_ORDER`. */
  readonly rotation: Vec3;
  readonly faces: readonly BbFace[];
}

/** A validated bone. */
export interface BbBone {
  readonly uuid: string;
  readonly name: string;
  /** Position in **model space**. Converted to a parent-relative offset by `scene.ts`. */
  readonly origin: Vec3;
  /** Rest rotation in degrees. Zero for every bone in the real asset. */
  readonly rotation: Vec3;
  readonly parentUuid: string | null;
  readonly childBoneUuids: readonly string[];
  readonly cubeUuids: readonly string[];
  /** 0 for outliner-root bones. */
  readonly depth: number;
}

/** One animation channel for one node, with keys sorted ascending and de-duplicated. */
export interface BbAnimationChannel {
  readonly nodeUuid: string;
  readonly channel: BbChannel;
  /** Keyframe times in seconds, strictly increasing. */
  readonly times: readonly number[];
  /**
   * One `[x, y, z]` triple per entry in `times`, in Blockbench's own units and signs —
   * an offset for `position`/`rotation`, an absolute multiplier for `scale`.
   */
  readonly values: readonly Vec3[];
  /** Interpolation of the keyframes, normalised to three.js vocabulary. */
  readonly interpolation: 'linear' | 'smooth' | 'discrete';
}

/** A validated animation. */
export interface BbAnimation {
  readonly name: string;
  readonly loop: BbLoopMode;
  /** Declared length in seconds. */
  readonly length: number;
  readonly channels: readonly BbAnimationChannel[];
}

/** An embedded texture, ready to be handed to a loader. */
export interface BbTextureRef {
  readonly index: number;
  readonly name: string;
  /** Image data URI, or bare base64 (the loader normalises it). */
  readonly source: string;
  /** True when the name marks the layer as an emissive companion (e.g. `tlaloc_e.png`). */
  readonly isEmissive: boolean;
}

/** The validated intermediate model: JSON in, plain data out, no three.js. */
export interface BbModel {
  readonly name: string;
  /** Texture pixel size face UVs are expressed against. 128x128 for the real asset. */
  readonly resolution: { readonly width: number; readonly height: number };
  /** Bones in outliner pre-order. Hitbox bones are already removed. */
  readonly bones: readonly BbBone[];
  /** Cubes in outliner pre-order. Hitbox and hidden cubes are already removed. */
  readonly cubes: readonly BbCube[];
  readonly animations: readonly BbAnimation[];
  readonly textures: readonly BbTextureRef[];
  /** Names of the bones dropped as collision volumes. */
  readonly hitboxBoneNames: readonly string[];
  /** How many cubes were dropped together with those bones. */
  readonly cubesFilteredAsHitbox: number;
  /** Cubes dropped because `visibility` was explicitly `false`. */
  readonly cubesFilteredAsHidden: number;
  /** Non-fatal problems worth surfacing to a caller (unresolvable animators, bad keyframes). */
  readonly warnings: readonly string[];
}
