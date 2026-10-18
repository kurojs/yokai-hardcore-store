/**
 * The WebGL plumbing both preview routes need, in one place.
 *
 * `bbmodel-viewer.ts` and `item-model-viewer.ts` differ only in what they load and what they
 * show in the HUD. Everything below is identical between them and is expensive to get wrong:
 * renderer creation and the "this browser has no WebGL" path, the canvas, the lights, the
 * orbit controls, the resize observer, the render loop, teardown, and camera framing from
 * plain bounds.
 *
 * Framework-free on purpose: it takes a stage element and returns an object, so a component
 * is the only thing that has to know about Angular, and one file owns the cleanup contract.
 *
 * The host owns the three.js objects it creates; it does **not** own the model scene. A
 * caller adds its model's root, and disposes it before disposing the host.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Background colour shared by both preview routes. */
export const PREVIEW_BACKGROUND = 0x0b0d12;

/** Axis-aligned bounds in plain arrays; both pipelines already report bounds this way. */
export interface PreviewBounds {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

/** Options for {@link createPreviewHost}. */
export interface PreviewHostOptions {
  /** Vertical field of view in degrees. */
  readonly fov?: number;
  readonly background?: number;
}

/** The render loop's per-frame hook, or `null` to stop updating. */
export type PreviewFrameUpdate = (delta: number) => void;

/** Turns an unknown thrown value into something worth showing a user. */
export function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * The part of `OrbitControls` that framing touches.
 *
 * Structural on purpose: it lets the framing maths be unit tested against a stub, with no
 * canvas, no renderer and no controls instance.
 */
export interface PreviewOrbitTarget {
  readonly target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  update(): unknown;
}

/**
 * Frames `bounds` from a three-quarter angle, and scales the clip planes and dolly limits to
 * the model.
 *
 * Fits the model's bounding sphere into the vertical field of view with a 20% margin. Both
 * clip planes and both dolly limits are derived from that distance rather than fixed: an item
 * model is ~20 units and the boss is ~60, so one shared near plane is either invisible or a
 * z-fighting mess.
 */
export function framePreviewCamera(
  camera: THREE.PerspectiveCamera,
  controls: PreviewOrbitTarget,
  bounds: PreviewBounds,
): void {
  const center = new THREE.Vector3(
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  );
  const size = new THREE.Vector3(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  );
  // A degenerate box (a single point, or a quad with no thickness) has a zero radius, which
  // would put the camera inside the model; the floor keeps the distance positive and finite.
  const radius = Math.max(size.length() / 2, 0.001);
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.2;

  camera.position.copy(center).add(new THREE.Vector3(0.75, 0.45, 0.75).multiplyScalar(distance));
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = distance * 20;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = radius * 0.5;
  controls.maxDistance = distance * 4;
  controls.update();
}

/** Everything a preview component drives, plus the objects it must not touch. */
export interface PreviewHost {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  /** Adds an object to the preview scene. The host does not take ownership of it. */
  add(object: THREE.Object3D): void;
  /** Removes an object from the preview scene. */
  remove(object: THREE.Object3D): void;
  /** Frames `bounds` from a three-quarter angle, and sets the clip planes and dolly limits. */
  frameCamera(bounds: PreviewBounds): void;
  /** Sets the per-frame callback (an animation mixer, for example), or clears it. */
  setUpdate(update: PreviewFrameUpdate | null): void;
  /** Re-reads the stage element's size and updates the renderer and camera projection. */
  resize(): void;
  /** Stops the loop and releases the renderer, the controls and the canvas. */
  dispose(): void;
}

/**
 * Creates the shared preview host around `stage`.
 *
 * @throws Error when the browser cannot give three.js a WebGL context. That is a normal
 *   outcome on a machine without WebGL, and callers report it rather than crashing: the
 *   error already says what happened, so it is worth showing as-is.
 */
export function createPreviewHost(
  stage: HTMLElement,
  options: PreviewHostOptions = {},
): PreviewHost {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background ?? PREVIEW_BACKGROUND);

  const camera = new THREE.PerspectiveCamera(options.fov ?? 45, 1, 0.1, 2000);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // A Minecraft-style model needs flat, unlit-looking shading: no environment map, one
  // hemisphere fill and one directional key so faces stay distinguishable.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(1, 2, 1.5);
  scene.add(key);

  const clock = new THREE.Clock();
  let update: PreviewFrameUpdate | null = null;
  let disposed = false;

  const resize = (): void => {
    if (disposed) return;
    // A stage that has not been laid out yet measures 0x0, which would make the projection
    // NaN; falling back to the window keeps the first frame renderable.
    const width = stage.clientWidth || window.innerWidth;
    const height = stage.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();

  renderer.setAnimationLoop(() => {
    update?.(clock.getDelta());
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    add(object: THREE.Object3D): void {
      scene.add(object);
    },
    remove(object: THREE.Object3D): void {
      scene.remove(object);
    },
    frameCamera(bounds: PreviewBounds): void {
      framePreviewCamera(camera, controls, bounds);
    },
    setUpdate(next: PreviewFrameUpdate | null): void {
      update = next;
    },
    resize,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      clock.stop();
    },
  };
}
