/**
 * The landing page's WebGL background.
 *
 * This is the only file that couples the End City model to a renderer. It is deliberately
 * framework-free: the Angular component owns a stage element and a destroy call, and everything
 * else lives here.
 *
 * Rules this file is built around:
 *
 * - **Never in the initial bundle.** The component that calls it is only reachable from a dynamic
 *   `import()` started after the landing page's first render, so importing this module pulls
 *   three.js and the glTF loader into their own lazy chunk.
 * - **Progressive enhancement.** If WebGL is missing, the renderer constructor throws and the
 *   caller catches it; if the model cannot be fetched, the canvas is hidden. Either way the page
 *   keeps its CSS backdrop and its copy.
 * - **No work off-screen.** The motion policy decides between animate, one still frame and paused;
 *   `requestAnimationFrame` runs only while animating.
 * - **No work before the model.** The loop does not start until the city has loaded, so the first
 *   seconds are not spent rendering an empty scene sixty times a second.
 * - **One teardown path.** `dispose()` releases the model, the renderer and the canvas exactly
 *   once, even if it happens while the model is still in flight.
 */

import * as THREE from 'three';

import { describeError } from '../preview-host';
import { fitDistance, loadEndCity, type CityModel } from './end-city';
import {
  sceneMotion,
  prefersReducedMotion,
  REDUCED_MOTION_QUERY,
  type SceneMotion,
} from './motion';

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

/** Radians per second the city turns around its own axis. Slow: a background, not a showcase. */
export const CITY_TURNTABLE_RADIANS_PER_SECOND = 0.06;

/** The angle the still frame is shot from. Also the frame a reduced-motion visitor always gets. */
export const CITY_START_ANGLE = 0.45;

/** The camera's vertical field of view, in degrees. */
const CAMERA_FOV = 36;

/**
 * Reads a design token as a three.js colour.
 *
 * The lights have no palette of their own: they are tinted from the same tokens as the storefront.
 * A missing token degrades to white rather than throwing, because a decorative scene must never
 * break the page.
 */
function tokenColor(name: string): THREE.Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color().setStyle(value === '' ? 'white' : value);
}

/**
 * Builds the scene around `stage` and starts the lifecycle.
 *
 * @throws Error when the browser cannot create a WebGL context. That is the only synchronous
 *   failure the caller has to handle, and it is expected on machines without WebGL.
 */
export function createLandingScene(stage: HTMLElement): LandingSceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  // The scene sits behind frosted glass that re-blurs every frame, so the pixel ratio is capped
  // lower than the product viewers': the background does not need to be sharp, the copy does.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // A transparent clear lets the page backdrop show through; the scene paints no rectangle.
  renderer.setClearAlpha(0);

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  // The model arrives a moment after the page does. Fading the canvas in means the background
  // appears instead of popping, and the page reads as finished either way.
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 700ms ease';
  stage.append(canvas);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 2000);

  // Flat, readable lighting: a neutral hemisphere fill, a bright key from above, and a violet rim
  // that echoes the interaction accent. A glTF's materials are physical, so the lights have to do
  // the work the baked skybox would have done in the game.
  scene.add(new THREE.HemisphereLight(tokenColor('--color-text'), tokenColor('--color-bg'), 1.3));

  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(0.55, 1, 0.75);
  scene.add(key);

  const rim = new THREE.DirectionalLight(tokenColor('--color-accent'), 0.9);
  rim.position.set(-0.8, 0.35, -0.6);
  scene.add(rim);

  let city: CityModel | null = null;
  let radius = 1;
  let reducedMotion = prefersReducedMotion(
    typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null,
  );
  let intersecting = true;
  let mode: SceneMotion = 'paused';
  let disposed = false;
  let failed = false;
  let rafId = 0;
  let elapsed = 0;
  let last = 0;

  /** Puts the camera as far back as the current aspect ratio needs. */
  const placeCamera = (): void => {
    const distance = fitDistance(radius, camera.fov, camera.aspect);
    camera.position.set(0, radius * 0.22, distance);
    camera.lookAt(0, 0, 0);
  };

  const resize = (): void => {
    const width = stage.clientWidth || 640;
    const height = stage.clientHeight || 420;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    placeCamera();
  };

  // --- motion policy wiring -----------------------------------------------------------
  const media =
    typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null;

  const fail = (cause: unknown): void => {
    if (failed) return;
    failed = true;
    cancelLoop();
    reportLandingSceneFailure(cause);
    // The page keeps its backdrop and copy; the broken canvas is hidden rather than shown.
    canvas.style.display = 'none';
  };

  const renderFrame = (delta: number, still: boolean): void => {
    if (failed || disposed || city === null) return;
    try {
      if (!still) elapsed += delta;
      city.root.rotation.y =
        CITY_START_ANGLE + (still ? 0 : elapsed * CITY_TURNTABLE_RADIANS_PER_SECOND);
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
    if (disposed || failed || mode !== 'animate' || city === null) return;
    const delta = last === 0 ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now;
    renderFrame(delta, false);
    if (!failed && mode === 'animate') rafId = requestAnimationFrame(tick);
  }

  const currentMotion = (): SceneMotion =>
    sceneMotion({ reducedMotion, intersecting, visible: !document.hidden });

  /**
   * Applies the current policy. Every call stops whatever is running first, so this is also the
   * way the loop is started once the model arrives: a resize, a visibility change and the end of
   * the download all converge here.
   */
  function applyMode(): void {
    if (disposed || failed) return;
    mode = currentMotion();
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

  void loadEndCity()
    .then((loaded) => {
      // The route can change while 3.4 MB are in flight; a model nobody owns must not leak.
      if (disposed || failed) {
        loaded.dispose();
        return;
      }
      city = loaded;
      radius = loaded.radius;
      scene.add(loaded.root);
      placeCamera();
      applyMode();
      canvas.style.opacity = '1';
    })
    .catch((cause: unknown) => fail(cause));

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

      city?.dispose();
      city = null;
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
