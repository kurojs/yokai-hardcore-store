import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { centerAndScale, fitDistance } from './end-city';

/** A box of `width` x `height` x `depth` moved to `offset`. */
function boxAt(width: number, height: number, depth: number, offset: THREE.Vector3): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth));
  mesh.position.copy(offset);
  mesh.updateMatrixWorld(true);
  return mesh;
}

describe('fitDistance', () => {
  it('backs the camera off further on a narrow viewport than on a wide one', () => {
    const wide = fitDistance(10, 36, 2);
    const portrait = fitDistance(10, 36, 0.5);

    expect(portrait).toBeGreaterThan(wide);
  });

  it('is bounded by the vertical field of view when the viewport is wider than tall', () => {
    // 36 degrees vertical over a 2:1 viewport makes the horizontal limit much closer than the
    // vertical one, so the vertical distance is what the camera has to honour.
    const verticalDistance = 10 / Math.sin((36 * Math.PI) / 360);

    expect(fitDistance(10, 36, 2, 1)).toBeCloseTo(verticalDistance, 6);
  });

  it('pulls back until the sphere fits the width of a portrait screen', () => {
    const radius = 10;
    const fov = 36;
    const aspect = 0.5;
    const halfVertical = (fov * Math.PI) / 360;
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
    const expected = radius / Math.sin(halfHorizontal);

    expect(fitDistance(radius, fov, aspect, 1)).toBeCloseTo(expected, 6);
  });

  it('fills the frame when asked for less than a full fit', () => {
    expect(fitDistance(10, 36, 2, 0.5)).toBeCloseTo(fitDistance(10, 36, 2, 1) / 2, 6);
  });

  it('never divides by an unusable aspect or radius', () => {
    expect(Number.isFinite(fitDistance(0, 36, 0))).toBe(true);
    expect(fitDistance(0, 36, 0)).toBeGreaterThan(0);
  });
});

describe('centerAndScale', () => {
  it('scales the model to the requested height and leaves it centred on the origin', () => {
    const model = boxAt(4, 6, 4, new THREE.Vector3(30, -12, 7));

    centerAndScale(model, 12);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    expect(size.y).toBeCloseTo(12, 6);
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.y).toBeCloseTo(0, 6);
    expect(center.z).toBeCloseTo(0, 6);
  });

  it('returns the radius of the scaled bounding sphere', () => {
    const model = boxAt(4, 6, 4, new THREE.Vector3(30, -12, 7));

    // A 4x6x4 box has a bounding sphere of radius sqrt(2^2 + 3^2 + 2^2) = 4.123, and it is
    // scaled by 12/6 = 2.
    expect(centerAndScale(model, 12)).toBeCloseTo(Math.sqrt(17) * 2, 6);
  });

  it('survives a model with no height instead of dividing by zero', () => {
    const model = boxAt(4, 0, 4, new THREE.Vector3(0, 0, 0));

    expect(Number.isFinite(centerAndScale(model, 10))).toBe(true);
  });
});
