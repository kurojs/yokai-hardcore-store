/**
 * The landing hero's WebGL scene.
 *
 * This is the only file that couples the procedural island to a renderer. It is deliberately
 * framework-free: the Angular component owns a stage element and a destroy call, and
 * everything else lives here.
 *
 * Rules this file is built around:
 *
 * - **Never in the initial bundle.** The component that calls it is only reachable from a
 *   dynamic `import()` started after the landing page's first render, so importing this module
 *   pulls three.js into its own lazy chunk.
 * - **Progressive enhancement.** If WebGL is missing, the renderer constructor throws and the
 *   caller catches it. A throw inside a frame stops the loop instead of spamming the console
 *   sixty times a second.
 * - **No work off-screen.** The motion policy decides between animate, one still frame and
 *   paused; `requestAnimationFrame` runs only while animating.
 * - **One teardown path.** `dispose()` releases the island, the renderer and the canvas exactly
 *   once.
 * - **Full-bleed, not a panel.** The canvas is transparent and the scene carries no background
 *   of its own; the hero's page background and its CSS mask do the blending. All lighting
 *   colours are read from the CSS tokens, so the scene cannot drift from the storefront palette.
 */

import * as THREE from 'three';

import { describeError } from '../preview-host';
import { createIslandScene, type IslandScene } from './island-scene';
import {
  sceneMotion,
  prefersReducedMotion,
  REDUCED_MOTION_QUERY,
  type SceneMotion,
} from './motion';
import type { VoxelIsland } from './voxels';

/** One log line per page load, no matter how many things fail. */
let reported = false;

/** Quietly records the first landing-scene failure. Nothing is shown to the visitor. */
export function reportLandingSceneFailure(cause: unknown): void {
  if (reported) return;
  reported = true;
  console.warn(`landing scene: ${describeError(cause)}`);
}

/** The handle the Angular host owns. */
export interface LandingSceneHandle {
  dispose(): void;
}

/**
 * Reads a design token as a three.js colour.
 *
 * The scene has no palette of its own: lighting comes from the same tokens as the rest of the
 * storefront. A missing token degrades to white rather than throwing, because a decorative
 * scene must never break the page.
 */
function tokenColor(name: string): THREE.Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color().setStyle(value === '' ? 'white' : value);
}

/**
 * Builds the scene around `stage` and starts the lifecycle.
 *
 * @throws Error when the browser cannot create a WebGL context. That is the only failure the
 *   caller has to handle, and it is expected on machines without WebGL.
 */
export function createLandingScene(stage: HTMLElement, island: VoxelIsland): LandingSceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // A transparent clear is what lets the hero's background and mask show through; the scene
  // itself paints no rectangle.
  renderer.setClearAlpha(0);

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  stage.append(canvas);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);

  // Flat, readable lighting: a neutral hemisphere fill, a bright key from above, and a jade
  // rim that echoes the storefront accent. Every colour is a CSS token, so the scene stays in
  // the same palette as the page around it.
  scene.add(
    new THREE.HemisphereLight(tokenColor('--color-text'), tokenColor('--color-bg'), 1.6),
  );
  const key = new THREE.DirectionalLight(tokenColor('--color-text'), 2);
  key.position.set(6, 10, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(tokenColor('--color-accent'), 0.7);
  rim.position.set(-7, 4, -6);
  scene.add(rim);

  const islandScene: IslandScene = createIslandScene(island);
  scene.add(islandScene.root);

  const cameraTarget = new THREE.Vector3(0, 2.6, 0);

  /** A slow orbit with a slight rise and fall. `t = 0` is the canonical still frame. */
  const placeCamera = (time: number): void => {
    const angle = 0.62 + Math.sin(time * 0.12) * 0.045;
    const lift = 8 + Math.sin(time * 0.09) * 0.3;
    const distance = 17.5;
    camera.position.set(Math.sin(angle) * distance, lift, Math.cos(angle) * distance);
    camera.lookAt(cameraTarget);
  };

  const resize = (): void => {
    const width = stage.clientWidth || 640;
    const height = stage.clientHeight || 420;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };

  // --- motion policy wiring -----------------------------------------------------------
  const media =
    typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
  let reducedMotion = prefersReducedMotion(media);
  let intersecting = true;
  let mode: SceneMotion = 'paused';
  let disposed = false;
  let failed = false;
  let rafId = 0;
  let elapsed = 0;
  let last = 0;

  const fail = (cause: unknown): void => {
    if (failed) return;
    failed = true;
    cancelLoop();
    reportLandingSceneFailure(cause);
    // The hero keeps its wash and copy; the broken canvas is hidden rather than shown.
    canvas.style.display = 'none';
  };

  const renderFrame = (delta: number, still: boolean): void => {
    if (failed || disposed) return;
    try {
      if (!still) elapsed += delta;
      islandScene.update(still ? 0 : elapsed);
      placeCamera(still ? 0 : elapsed);
      renderer.render(scene, camera);
    } catch (cause) {
      fail(cause);
    }
  };

  function cancelLoop(): void {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function tick(now: number): void {
    rafId = 0;
    if (disposed || failed || mode !== 'animate') return;
    const delta = last === 0 ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now;
    renderFrame(delta, false);
    if (!failed && mode === 'animate') rafId = requestAnimationFrame(tick);
  }

  const currentMotion = (): SceneMotion =>
    sceneMotion({ reducedMotion, intersecting, visible: !document.hidden });

  function applyMode(): void {
    if (disposed || failed) return;
    const next = currentMotion();
    if (next === mode) {
      if (next === 'still') renderFrame(0, true);
      return;
    }
    mode = next;
    cancelLoop();
    if (mode === 'animate') {
      last = 0;
      rafId = requestAnimationFrame(tick);
    } else if (mode === 'still') {
      renderFrame(0, true);
    }
  }

  const onVisibilityChange = (): void => applyMode();
  document.addEventListener('visibilitychange', onVisibilityChange);

  const onMotionPreferenceChange = (event: MediaQueryListEvent): void => {
    reducedMotion = event.matches;
    applyMode();
  };
  media?.addEventListener('change', onMotionPreferenceChange);

  let intersectionObserver: IntersectionObserver | null = null;
  if (typeof IntersectionObserver === 'function') {
    intersecting = false;
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        intersecting = entries[0]?.isIntersecting ?? true;
        applyMode();
      },
      { threshold: 0.01 },
    );
    intersectionObserver.observe(stage);
  }

  let resizeObserver: ResizeObserver | null = null;
  const onWindowResize = (): void => {
    resize();
    applyMode();
  };
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      resize();
      applyMode();
    });
    resizeObserver.observe(stage);
  } else {
    window.addEventListener('resize', onWindowResize);
  }
  resize();

  applyMode();

  return {
    dispose(): void {
      if (disposed) return;
      disposed = true;
      cancelLoop();
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      media?.removeEventListener('change', onMotionPreferenceChange);

      islandScene.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
