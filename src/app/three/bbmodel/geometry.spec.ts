/**
 * Geometry specs: the conventions that are easy to get silently wrong.
 *
 * UV orientation, the V flip, face winding and the rotation permutation are all checked
 * against an actual `BufferGeometry`, so a regression shows up as a wrong normal or a
 * flipped texture rather than as a number that merely looks plausible.
 */

import * as THREE from 'three';

import {
  buildCubeGeometryData,
  FACE_NORMALS,
  faceUvSlots,
  rotateUvSlots,
  type CubeGeometryInput,
} from './geometry';
import type { BbFace, BbFaceDirection } from './types';

function faceAt(
  direction: BbFaceDirection,
  uv: readonly [number, number, number, number] = [0, 0, 16, 16],
  rotation = 0,
  textureIndex = 0,
): BbFace {
  return { direction, uv, rotation, textureIndex };
}

function cubeWith(
  faces: readonly BbFace[],
  overrides: Partial<CubeGeometryInput> = {},
): CubeGeometryInput {
  return {
    from: [0, 0, 0],
    to: [16, 16, 16],
    origin: [0, 0, 0],
    faces,
    ...overrides,
  };
}

const DIRECTIONS: readonly BbFaceDirection[] = ['north', 'east', 'south', 'west', 'up', 'down'];

describe('faceUvSlots', () => {
  it('maps a full-atlas face to the unit square', () => {
    expect(faceUvSlots({ uv: [0, 0, 16, 16] }, 16, 16)).toEqual([
      [0, 1],
      [1, 1],
      [0, 0],
      [1, 0],
    ]);
  });

  it('flips V because Minecraft measures UVs from the top edge', () => {
    // y1 = 4 -> v = 1 - 4/16 = 0.75; y2 = 12 -> v = 0.25
    expect(faceUvSlots({ uv: [0, 4, 16, 12] }, 16, 16)).toEqual([
      [0, 0.75],
      [1, 0.75],
      [0, 0.25],
      [1, 0.25],
    ]);
  });

  it('scales by the atlas size rather than assuming 16x16', () => {
    expect(faceUvSlots({ uv: [0, 0, 64, 32] }, 128, 128)).toEqual([
      [0, 1],
      [0.5, 1],
      [0, 0.75],
      [0.5, 0.75],
    ]);
  });
});

describe('rotateUvSlots', () => {
  const slots = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const;

  it('leaves slots untouched for a zero or negative rotation', () => {
    expect(rotateUvSlots(slots, 0)).toEqual(slots);
    expect(rotateUvSlots(slots, -90)).toEqual(slots);
  });

  it('permutes [a, b, c, d] to [c, a, d, b] per 90 degrees', () => {
    expect(rotateUvSlots(slots, 90)).toEqual([
      [0, 1],
      [0, 0],
      [1, 1],
      [1, 0],
    ]);
  });

  it('applies three steps for 270 degrees', () => {
    expect(rotateUvSlots(slots, 270)).toEqual([
      [1, 0],
      [1, 1],
      [0, 0],
      [0, 1],
    ]);
  });

  it('wraps at 360 degrees', () => {
    expect(rotateUvSlots(slots, 360)).toEqual(slots);
  });

  it('rounds a non-multiple of 90 up, matching the upstream while-loop', () => {
    expect(rotateUvSlots(slots, 45)).toEqual(rotateUvSlots(slots, 90));
  });
});

describe('buildCubeGeometryData', () => {
  it('emits four vertices and six indices per face', () => {
    const faces = DIRECTIONS.map((direction) => faceAt(direction));
    const data = buildCubeGeometryData(cubeWith(faces), 16, 16);

    expect(data.positions).toHaveLength(6 * 4 * 3);
    expect(data.uvs).toHaveLength(6 * 4 * 2);
    expect(data.indices).toHaveLength(6 * 6);
    expect(data.groups).toEqual([{ textureIndex: 0, start: 0, count: 36 }]);
  });

  it('subtracts the cube origin, because the mesh is positioned at that origin', () => {
    const data = buildCubeGeometryData(
      cubeWith([faceAt('north')], {
        from: [0, 0, 0],
        to: [2, 2, 2],
        origin: [1, 1, 1],
      }),
      16,
      16,
    );

    const uniqueX = new Set([...data.positions].filter((_, index) => index % 3 === 0));
    expect([...uniqueX].sort((a, b) => a - b)).toEqual([-1, 1]);
  });

  it('opens a zero-thickness cube by 0.001 like Blockbench does', () => {
    const data = buildCubeGeometryData(
      cubeWith([faceAt('up')], { from: [0, 0, 0], to: [0, 16, 16] }),
      16,
      16,
    );

    const xs = data.positions.filter((_, index) => index % 3 === 0);
    expect(Math.max(...xs)).toBeCloseTo(0.001, 6);
    expect(Math.min(...xs)).toBe(0);
  });

  it('spins outward-facing normals for every direction', () => {
    for (const direction of DIRECTIONS) {
      const data = buildCubeGeometryData(cubeWith([faceAt(direction)]), 16, 16);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
      geometry.computeVertexNormals();

      const normal = geometry.getAttribute('normal');
      const actual = [normal.getX(0), normal.getY(0), normal.getZ(0)];
      const expected = FACE_NORMALS[direction];

      expect(actual[0]).toBeCloseTo(expected[0], 6);
      expect(actual[1]).toBeCloseTo(expected[1], 6);
      expect(actual[2]).toBeCloseTo(expected[2], 6);
    }
  });

  it('keeps each texture in one contiguous group so a cube can be multi-material', () => {
    const faces = [
      faceAt('north', [0, 0, 16, 16], 0, 0),
      faceAt('east', [0, 0, 16, 16], 0, 1),
      faceAt('south', [0, 0, 16, 16], 0, 0),
      faceAt('west', [0, 0, 16, 16], 0, 1),
    ];
    const data = buildCubeGeometryData(cubeWith(faces), 16, 16);

    expect(data.groups).toEqual([
      { textureIndex: 0, start: 0, count: 12 },
      { textureIndex: 1, start: 12, count: 12 },
    ]);
    // Group order follows the sorted texture index, not the face order in the file.
    expect(data.indices).toHaveLength(4 * 6);
  });

  it('writes the rotated UV slots into the vertex order of the face', () => {
    const data = buildCubeGeometryData(
      cubeWith([faceAt('north', [0, 0, 16, 16], 90)]),
      16,
      16,
    );

    // [a, b, c, d] -> [c, a, d, b] of the flipped unit square.
    expect([...data.uvs]).toEqual([0, 0, 0, 1, 1, 0, 1, 1]);
  });

  it('rejects a non-positive atlas size', () => {
    expect(() => buildCubeGeometryData(cubeWith([faceAt('north')]), 0, 16)).toThrow(
      /texture resolution must be positive, received 0x16/,
    );
  });
});
