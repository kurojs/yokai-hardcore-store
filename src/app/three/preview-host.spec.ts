/**
 * Specs for the shared preview host.
 *
 * The host itself needs a WebGL context, which this environment does not have, so the parts
 * that are decided here are the two that do not: the camera framing maths — which is asserted
 * as numbers rather than as "it ran" — and what happens when a renderer cannot be created.
 * The first case is why framing was extracted into a function at all.
 */

import * as THREE from 'three';

import {
  createPreviewHost,
  describeError,
  framePreviewCamera,
  type PreviewBounds,
  type PreviewHost,
  type PreviewOrbitTarget,
} from './preview-host';

/** A `OrbitControls` stand-in: framing only reads a target and writes limits and dolly. */
function stubControls(): PreviewOrbitTarget & { updated: number } {
  return {
    target: new THREE.Vector3(),
    minDistance: 0,
    maxDistance: 0,
    updated: 0,
    update(): boolean {
      this.updated += 1;
      return true;
    },
  };
}

function camera(fov = 45): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(fov, 1, 0.1, 2000);
}

describe('framePreviewCamera', () => {
  it('fits the bounding sphere into the field of view with a margin, from a three-quarter angle', () => {
    const view = camera(45);
    const controls = stubControls();

    // A 16-unit cube at the origin: radius = sqrt(3) * 8 = 13.856406.
    framePreviewCamera(view, controls, { min: [0, 0, 0], max: [16, 16, 16] });

    const radius = Math.sqrt(3) * 8;
    const distance = (radius / Math.sin(THREE.MathUtils.degToRad(45) / 2)) * 1.2;
    // Independently: 13.856406460551018 / sin(22.5) * 1.2 = 43.450242018311314.
    expect(distance).toBeCloseTo(43.450242018311314, 9);

    const center = new THREE.Vector3(8, 8, 8);
    expect(view.position.x).toBeCloseTo(center.x + 0.75 * distance, 9);
    expect(view.position.y).toBeCloseTo(center.y + 0.45 * distance, 9);
    expect(view.position.z).toBeCloseTo(center.z + 0.75 * distance, 9);

    // The camera is above the centre it looks at, so the model reads as a 3/4 view.
    expect(view.position.y).toBeGreaterThan(center.y);
  });

  it('scales the clip planes and the dolly limits to the distance', () => {
    const view = camera(45);
    const controls = stubControls();
    framePreviewCamera(view, controls, { min: [0, 0, 0], max: [16, 16, 16] });

    // The framing distance is the scalar offset along each of the (0.75, 0.45, 0.75) steps,
    // not the Euclidean camera-to-centre distance: 13.856406460551018 / sin(22.5) * 1.2.
    const distance = (view.position.x - 8) / 0.75;
    expect(distance).toBeCloseTo(43.450242018311314, 9);
    expect(view.near).toBeCloseTo(0.043450242018311314, 12);
    expect(view.far).toBeCloseTo(distance * 20, 9);
    expect(view.near).toBeGreaterThan(0);
    expect(view.far).toBeGreaterThan(view.near);

    const radius = Math.sqrt(3) * 8;
    expect(controls.minDistance).toBeCloseTo(radius * 0.5, 9);
    expect(controls.maxDistance).toBeCloseTo(distance * 4, 9);
  });

  it('points the controls at the centre of the model and updates them once', () => {
    const view = camera(45);
    const controls = stubControls();

    framePreviewCamera(view, controls, { min: [-4, 0, 2], max: [12, 24, 8] });

    expect(controls.target.toArray()).toEqual([4, 12, 5]);
    expect(controls.updated).toBe(1);
  });

  it('keeps a degenerate box out of the camera, with finite numbers', () => {
    const view = camera(45);
    const controls = stubControls();

    // A zero-extent box, which is what a single point or a zero-thickness element gives.
    framePreviewCamera(view, controls, { min: [5, 5, 5], max: [5, 5, 5] });

    const distance = view.position.distanceTo(new THREE.Vector3(5, 5, 5));
    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThan(0.001);
    expect(Number.isFinite(view.near)).toBe(true);
    expect(Number.isFinite(view.far)).toBe(true);
    expect(controls.minDistance).toBeGreaterThan(0);
  });

  it('frames a bigger model further away, which is what per-model framing means', () => {
    const hat: PreviewBounds = {
      min: [-1.9087708815680333, -10.1, -1.2433061219327186],
      max: [17.90877088156803, 12.94828, 22.5236190793346],
    };
    const boss: PreviewBounds = {
      min: [-12.4828, 0.3688, -34.0698],
      max: [14.6452, 52.5904, 28.3849],
    };
    const sprite: PreviewBounds = { min: [0, 0, 7.5], max: [16, 16, 8.5] };

    const distanceFor = (bounds: PreviewBounds): number => {
      const view = camera(45);
      framePreviewCamera(view, stubControls(), bounds);
      const center = new THREE.Vector3(
        (bounds.min[0] + bounds.max[0]) / 2,
        (bounds.min[1] + bounds.max[1]) / 2,
        (bounds.min[2] + bounds.max[2]) / 2,
      );
      return view.position.distanceTo(center);
    };

    const hatDistance = distanceFor(hat);
    const bossDistance = distanceFor(boss);
    const spriteDistance = distanceFor(sprite);

    expect(spriteDistance).toBeLessThan(hatDistance);
    expect(hatDistance).toBeLessThan(bossDistance);
  });

  it('honours a narrower field of view by moving back', () => {
    const wide = camera(60);
    const narrow = camera(30);
    framePreviewCamera(wide, stubControls(), { min: [0, 0, 0], max: [16, 16, 16] });
    framePreviewCamera(narrow, stubControls(), { min: [0, 0, 0], max: [16, 16, 16] });

    expect(narrow.position.length()).toBeGreaterThan(wide.position.length());
  });
});

describe('describeError', () => {
  it('unwraps an Error and stringifies anything else', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('boom')).toBe('boom');
    expect(describeError(undefined)).toBe('undefined');
  });
});

describe('createPreviewHost', () => {
  /**
   * Both branches are real states, so this asserts whichever one this environment is in:
   * a machine without WebGL must get a thrown error naming the cause and an untouched stage,
   * and one with WebGL must get a canvas it can dispose.
   */
  it('either mounts a canvas in the stage or reports that WebGL is unavailable', () => {
    const stage = document.createElement('div');
    let host: PreviewHost | null = null;

    try {
      host = createPreviewHost(stage);
    } catch (cause) {
      expect(describeError(cause)).toMatch(/WebGL/);
    }

    if (host === null) {
      // Nothing is left behind for the component to clean up after a failed construction.
      expect(stage.childElementCount).toBe(0);
      return;
    }

    expect(host.renderer.domElement.parentElement).toBe(stage);
    expect(host.scene.background).not.toBeNull();
    // The loop is live and the teardown contract is what removes the canvas again.
    host.dispose();
    expect(stage.childElementCount).toBe(0);
  });
});
