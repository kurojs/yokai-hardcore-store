/**
 * Element -> geometry and transforms, as plain data.
 *
 * Pure by design and **three.js-free**: rotations come back as `[x, y, z, w]` quaternions and
 * positions as plain arrays, so the coordinate maths is unit testable without a WebGL
 * context (and without importing three into a spec).
 *
 * What is reused from the bbmodel pipeline, and why: the six-face box emitter in
 * `../bbmodel/geometry.ts` (`buildCubeGeometryData`) already implements exactly the maths an
 * item element needs — outward winding, per-direction corner slots, the V flip, the UV slot
 * rotation, the zero-thickness nudge. Both formats describe the same object (an
 * axis-aligned box with up to six UV-mapped faces) and Blockbench writes both files, so its
 * tables apply to both.
 *
 * The one genuine difference is the UV *unit*: bbmodel UVs are atlas pixels, item model UVs
 * are in a 16-unit space scaled by `texture_size`. That is bridged explicitly by
 * {@link itemUvToPixels} rather than by a second copy of the emitter.
 *
 * What is deliberately **not** reused:
 *
 * - `parseBbModel` and bbmodel's `BbFace`: its texture reference is an integer atlas index,
 *   while an item model face uses `#name` indirection into a `textures` map.
 * - bbmodel's Euler handling: item element rotation is axis-angle about a pivot, and
 *   `display` rotation is an XYZ Euler. Neither is bbmodel's `ZYX` Euler.
 * - bbmodel's animation layer: an item model has no keyframes at all.
 */

import { buildCubeGeometryData, type CubeGeometryData } from '../bbmodel/geometry';
import type { BbFace } from '../bbmodel/types';
import {
  ITEM_UV_SPACE,
  type ItemElement,
  type ItemRotation,
  type Quat,
  type Vec3,
} from './types';

/** Prefix used by every error this module throws. */
const ERROR_PREFIX = 'itemmodel geometry:';

/** A pivot at the model origin, used when an element declares no rotation at all. */
const NO_PIVOT: Vec3 = [0, 0, 0];

/**
 * The pivot an element's geometry is built around.
 *
 * Vanilla positions the element at `rotation.origin` and rotates it about that point. When
 * several rotations are present the first one's origin is used for all of them: the real
 * files never carry more than one, and each rotation's own origin stays on
 * {@link ItemRotation} so a future change can honour them individually.
 */
export function itemElementPivot(element: ItemElement): Vec3 {
  return element.rotations[0]?.origin ?? NO_PIVOT;
}

/**
 * Converts an axis-angle rotation into a quaternion.
 *
 * `angle` is in degrees, `axis` is a cardinal axis, and the result is `[x, y, z, w]` in the
 * same convention as `THREE.Quaternion.setFromAxisAngle`, which the scene layer uses
 * directly.
 */
export function axisAngleToQuaternion(rotation: ItemRotation): Quat {
  const half = (rotation.angle * Math.PI) / 360;
  const sin = Math.sin(half);
  const cos = Math.cos(half);
  if (rotation.axis === 'x') return [sin, 0, 0, cos];
  if (rotation.axis === 'y') return [0, sin, 0, cos];
  return [0, 0, sin, cos];
}

/** Hamilton product `a * b`, i.e. the matrix product `R(a) * R(b)`. */
export function multiplyQuaternions(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

/**
 * The element's composed rotation.
 *
 * A single rotation is the whole story for every real element. For an array, the product is
 * taken in file order (`q1 * q2 * ...`), which is the left-to-right matrix product
 * `R1 * R2 * ...`. No file in this repository exercises the sequence form, so the ordering
 * is a documented choice rather than a verified vanilla behaviour.
 */
export function itemElementQuaternion(element: ItemElement): Quat {
  let result: Quat = [0, 0, 0, 1];
  for (const rotation of element.rotations) {
    result = multiplyQuaternions(result, axisAngleToQuaternion(rotation));
  }
  return result;
}

/** Rotates a vector by a quaternion. */
export function rotateVec3(vector: Vec3, quaternion: Quat): Vec3 {
  const [x, y, z] = vector;
  const [qx, qy, qz, qw] = quaternion;
  // t = 2 * (q_vec x v), result = v + qw * t + q_vec x t
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  return [
    x + qw * tx + qy * tz - qz * ty,
    y + qw * ty + qz * tx - qx * tz,
    z + qw * tz + qx * ty - qy * tx,
  ];
}

/**
 * Scales a 16-unit UV rect into texture pixels.
 *
 * This is where `texture_size` is load-bearing: a UV of 2.75 on a 64x64 texture is pixel
 * 11, while the same 2.75 on a 128x128 texture is pixel 22. The two give the same normalised
 * UV, because the 16-unit space always spans the whole texture — which is exactly why the
 * conversion has to happen here, against the declared size, and not by assuming a scale.
 */
export function itemUvToPixels(
  uv: readonly [number, number, number, number],
  textureSize: { readonly width: number; readonly height: number },
): readonly [number, number, number, number] {
  const x = textureSize.width / ITEM_UV_SPACE;
  const y = textureSize.height / ITEM_UV_SPACE;
  return [uv[0] * x, uv[1] * y, uv[2] * x, uv[3] * y];
}

/**
 * Builds the geometry of one element, with positions relative to {@link itemElementPivot}.
 *
 * @param element validated element
 * @param textureSize the model's `texture_size`
 * @param textureIndexByPath material index per resolved texture path
 * @throws Error with an `itemmodel geometry:` prefix when a face references a path that has
 *   no material index, which would otherwise render as an untextured face.
 */
export function buildItemElementGeometry(
  element: ItemElement,
  textureSize: { readonly width: number; readonly height: number },
  textureIndexByPath: ReadonlyMap<string, number>,
): CubeGeometryData {
  const faces: BbFace[] = element.faces.map((face) => {
    const textureIndex = textureIndexByPath.get(face.texturePath);
    if (textureIndex === undefined) {
      throw new Error(
        `${ERROR_PREFIX} element ${element.index} face ${face.direction} references texture "${face.texturePath}", which has no material index`,
      );
    }
    return {
      direction: face.direction,
      uv: itemUvToPixels(face.uv, textureSize),
      rotation: face.rotation,
      textureIndex,
    };
  });

  return buildCubeGeometryData(
    { from: element.from, to: element.to, origin: itemElementPivot(element), faces },
    textureSize.width,
    textureSize.height,
  );
}

/**
 * The synthetic element a parent-driven sprite is drawn with.
 *
 * A sprite file has no `elements`: its geometry belongs to the vanilla `parent`, which lives
 * in the game's jar and cannot be resolved here. This restates the geometry of
 * `minecraft:item/generated` — a 16x16 quad one unit thick, spanning the model's full
 * x/y extent at the middle of the block — so the sprite has the same size and placement
 * class as a real item model, and a `display` transform from the file lands on it
 * meaningfully. It is an approximation of the parent, and the scene reports it as one.
 */
export function buildItemSpriteElement(textureKey: string | null, texturePath: string): ItemElement {
  const key = textureKey ?? 'sprite';
  const side = (direction: ItemElement['faces'][number]['direction'], uv: [number, number, number, number]): ItemElement['faces'][number] => ({
    direction,
    uv,
    rotation: 0,
    textureKey: key,
    texturePath,
  });
  return {
    index: 0,
    from: [0, 0, 7.5],
    to: [ITEM_UV_SPACE, ITEM_UV_SPACE, 8.5],
    rotations: [],
    // Both sides of the slab, so the sprite is visible from either direction. The south face
    // mirrors u, which is the same convention the real files encode for back faces.
    faces: [side('north', [0, 0, 16, 16]), side('south', [16, 0, 0, 16])],
  };
}

/** Axis-aligned bounds, as plain arrays so the result survives a JSON round trip. */
export interface ItemBounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * Bounds of one element, with its rotation applied about its own pivot.
 *
 * The eight corners are rotated into model space; rotation about a pivot is why the bounds
 * are not simply `from`/`to`.
 */
export function measureItemElementBounds(element: ItemElement): ItemBounds {
  const pivot = itemElementPivot(element);
  const quaternion = itemElementQuaternion(element);
  const min: [number, number, number] = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ];
  const max: [number, number, number] = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  for (let corner = 0; corner < 8; corner += 1) {
    const local: Vec3 = [
      (corner & 1 ? element.to[0] : element.from[0]) - pivot[0],
      (corner & 2 ? element.to[1] : element.from[1]) - pivot[1],
      (corner & 4 ? element.to[2] : element.from[2]) - pivot[2],
    ];
    const rotated = rotateVec3(local, quaternion);
    for (let axis = 0; axis < 3; axis += 1) {
      const value = rotated[axis] + pivot[axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }

  return { min, max };
}

/**
 * Model-space bounds of every element, **before** any `display` transform.
 *
 * Elements are rotated about their own pivots first, so these are posed extents rather than
 * the authored corners, and the difference is large enough to matter: the hat measures
 * 19.82 x 23.05 x 23.77 against corners of 11.88 x 23.05 x 24.82, and the staff measures
 * 12.06 x 41.35 x 10.5 against corners of 23.32 x 35.9 x 10.5. This is what a caller frames
 * a camera with when it wants the model itself rather than the `display`-posed result.
 */
export function measureItemBounds(elements: readonly ItemElement[]): ItemBounds {
  if (elements.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0] };
  }
  const min: [number, number, number] = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ];
  const max: [number, number, number] = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];
  for (const element of elements) {
    const bounds = measureItemElementBounds(element);
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], bounds.min[axis]);
      max[axis] = Math.max(max[axis], bounds.max[axis]);
    }
  }
  return { min, max };
}
