/**
 * Cube -> renderable geometry, as plain typed arrays.
 *
 * Pure by design: the math that is easiest to get silently wrong (UV orientation, V flip,
 * face winding, rotation pivots) is testable here without a WebGL context.
 *
 * Each convention below was read out of the Blockbench source, not guessed:
 *
 * - Vertex order is `Cube.getGlobalVertexPositions()` in `js/outliner/types/cube.js`.
 * - Per-direction corner indices are `CubeFace.getVertexIndices()` in the same file.
 * - `CubePreviewController.updateGeometry` (=`from - origin`, `to - origin`, and the
 *   `+0.001` nudge that opens a zero-thickness cube) is reproduced verbatim.
 * - Triangle winding is `CubePreviewController.updateFaces`, which emits
 *   `(0,2,1)` and `(2,3,1)`. That order produces outward-facing counter-clockwise
 *   normals for all six directions under three.js' default front-face convention.
 * - `CubePreviewController.updateUV` maps `v = 1 - y / textureHeight`. Minecraft UVs are
 *   measured downwards from the texture's top edge, while three.js UVs (with the default
 *   `flipY = true`) are measured upwards from the bottom.
 * - `u` is never sorted or mirrored: a face authored with `uv[0] > uv[2]` stays mirrored
 *   exactly as Blockbench draws it. That is not an edge case in the real asset: 337 of its
 *   660 faces are authored that way. The 6 faces that carry a 90/270 degree UV `rotation`
 *   are a different set, and both conventions are applied independently.
 */

import type { BbCube, BbFace, BbFaceDirection } from './types';

/**
 * Cube corners relative to the cube's own origin, in Blockbench's global vertex order.
 *
 * `from`/`to` are box corners in model space. Blockbench stores cube geometry relative to
 * the cube's rotation pivot (`origin`) and applies the rotation on the mesh, so the caller
 * must position the mesh at `origin` for the pivot to behave correctly.
 */
const CORNER_SIGNS: readonly (readonly [number, number, number])[] = [
  [1, 1, 1],
  [1, 1, 0],
  [1, 0, 1],
  [1, 0, 0],
  [0, 1, 0],
  [0, 1, 1],
  [0, 0, 0],
  [0, 0, 1],
];

/** Corner indices per face direction, in the order Blockbench assigns UV slots. */
export const FACE_CORNER_INDICES: Readonly<
  Record<BbFaceDirection, readonly [number, number, number, number]>
> = {
  north: [1, 4, 6, 3],
  east: [0, 1, 3, 2],
  south: [5, 0, 2, 7],
  west: [4, 5, 7, 6],
  up: [4, 1, 0, 5],
  down: [7, 2, 3, 6],
};

/** Outward face normal per direction, in Blockbench's model space. */
export const FACE_NORMALS: Readonly<Record<BbFaceDirection, readonly [number, number, number]>> = {
  north: [0, 0, -1],
  east: [1, 0, 0],
  south: [0, 0, 1],
  west: [-1, 0, 0],
  up: [0, 1, 0],
  down: [0, -1, 0],
};

/** One contiguous run of indices that shares a texture. */
export interface CubeGeometryGroup {
  readonly textureIndex: number;
  /** First index in `indices`. */
  readonly start: number;
  /** Number of indices in the run. Always a multiple of 6. */
  readonly count: number;
}

/** Geometry for a single cube, with positions relative to the cube's `origin`. */
export interface CubeGeometryData {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint16Array;
  readonly groups: readonly CubeGeometryGroup[];
}

/** The subset of a cube needed to build its geometry. */
export type CubeGeometryInput = Pick<BbCube, 'from' | 'to' | 'origin' | 'faces'>;

/**
 * Number of 90° steps Blockbench applies to a face's UV slots.
 *
 * Mirrors `CubePreviewController.updateUV`'s `while (rot > 0) { ...; rot -= 90 }`:
 * a positive rotation consumes one step per started 90°, and a rotation of 0 or less
 * consumes none. Values above 360 wrap, and a non-multiple of 90 is rounded up rather
 * than down, which is what the upstream loop does.
 */
function uvRotationSteps(rotationDegrees: number): number {
  if (!(rotationDegrees > 0)) return 0;
  return Math.ceil(rotationDegrees / 90) % 4;
}

/**
 * Rotates a face's four UV slots, mirroring Blockbench's `while (rot > 0)` permutation.
 *
 * One step maps `[a, b, c, d]` to `[c, a, d, b]`.
 */
export function rotateUvSlots(
  slots: readonly (readonly [number, number])[],
  rotationDegrees: number,
): readonly (readonly [number, number])[] {
  const steps = uvRotationSteps(rotationDegrees);
  let current = slots.map((slot) => [slot[0], slot[1]] as [number, number]);
  for (let step = 0; step < steps; step += 1) {
    const [a, b, c, d] = current;
    current = [c, a, d, b];
  }
  return current;
}

/**
 * Computes the four UV slots of one face, before rotation.
 *
 * Slot order matches Blockbench's `updateUV` writes: `(x1,y1)`, `(x2,y1)`, `(x1,y2)`,
 * `(x2,y2)`, with `y` flipped because Minecraft measures it from the top.
 */
export function faceUvSlots(
  face: Pick<BbFace, 'uv'>,
  atlasWidth: number,
  atlasHeight: number,
): readonly (readonly [number, number])[] {
  const [x1, y1, x2, y2] = face.uv;
  return [
    [x1 / atlasWidth, 1 - y1 / atlasHeight],
    [x2 / atlasWidth, 1 - y1 / atlasHeight],
    [x1 / atlasWidth, 1 - y2 / atlasHeight],
    [x2 / atlasWidth, 1 - y2 / atlasHeight],
  ];
}

/**
 * Builds the geometry data for one cube.
 *
 * @param cube cube in model space
 * @param atlasWidth texture width in pixels (the atlas the face UVs refer to)
 * @param atlasHeight texture height in pixels
 */
export function buildCubeGeometryData(
  cube: CubeGeometryInput,
  atlasWidth: number,
  atlasHeight: number,
): CubeGeometryData {
  if (!(atlasWidth > 0) || !(atlasHeight > 0)) {
    throw new Error(
      `bbmodel: texture resolution must be positive, received ${atlasWidth}x${atlasHeight}`,
    );
  }

  // Blockbench nudges a zero-thickness cube open so it stays visible; mirror that.
  const to: [number, number, number] = [cube.to[0], cube.to[1], cube.to[2]];
  for (let axis = 0; axis < 3; axis += 1) {
    if (cube.from[axis] === to[axis]) to[axis] += 0.001;
  }

  const corners = CORNER_SIGNS.map(([sx, sy, sz]) => [
    (sx === 1 ? to[0] : cube.from[0]) - cube.origin[0],
    (sy === 1 ? to[1] : cube.from[1]) - cube.origin[1],
    (sz === 1 ? to[2] : cube.from[2]) - cube.origin[2],
  ]);

  // A mirrored box (a negative extent on an odd number of axes) has determinant -1, which
  // inverts the winding. Flip it back so normals stay outward.
  const invertedAxes = [0, 1, 2].filter((axis) => cube.from[axis] > to[axis]).length;
  const reverse = invertedAxes % 2 === 1;

  // Sorting by texture keeps each group a contiguous run of indices, so a cube can be
  // drawn with one multi-material mesh instead of one mesh per face.
  const faces = [...cube.faces].sort((a, b) => a.textureIndex - b.textureIndex);

  const positions = new Float32Array(faces.length * 4 * 3);
  const uvs = new Float32Array(faces.length * 4 * 2);
  const indices = new Uint16Array(faces.length * 6);
  const groups: CubeGeometryGroup[] = [];

  let vertexCursor = 0;
  let indexCursor = 0;

  for (const face of faces) {
    const group = groups[groups.length - 1];
    if (group !== undefined && group.textureIndex === face.textureIndex) {
      groups[groups.length - 1] = { ...group, count: group.count + 6 };
    } else {
      groups.push({ textureIndex: face.textureIndex, start: indexCursor, count: 6 });
    }

    for (const cornerIndex of FACE_CORNER_INDICES[face.direction]) {
      const corner = corners[cornerIndex];
      positions.set(corner, vertexCursor * 3);
      vertexCursor += 1;
    }

    const slots = rotateUvSlots(faceUvSlots(face, atlasWidth, atlasHeight), face.rotation);
    slots.forEach((slot, slotIndex) => {
      uvs.set(slot, (vertexCursor - 4 + slotIndex) * 2);
    });

    const base = vertexCursor - 4;
    const triangles: readonly number[] = reverse ? [0, 1, 2, 2, 1, 3] : [0, 2, 1, 2, 3, 1];
    for (const offset of triangles) {
      indices[indexCursor] = base + offset;
      indexCursor += 1;
    }
  }

  return { positions, uvs, indices, groups };
}
