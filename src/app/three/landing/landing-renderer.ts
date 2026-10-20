/**
 * The landing hero's WebGL scene.
 *
 * This is the only file that couples the procedural island, the Blockbench pipeline and a
 * renderer. It is deliberately framework-free: the Angular component owns a stage element and
 * a destroy call, and everything else lives here.
 *
 * Rules this file is built around:
 *
 * - **Never in the initial bundle.** The component that calls it is only reachable from a
 *   dynamic `import()` started after the landing page's first render, so importing this module
 *   pulls three.js into its own lazy chunk.
 * - **Progressive enhancement.** If WebGL is missing, the renderer constructor throws and the
 *   caller catches it; a model that 404s or fails to parse leaves the procedural island
 *   running and logs one line. A throw inside a frame stops the loop instead of spamming the
 *   console sixty times a second.
 * - **No work off-screen.** The motion policy decides between animate, one still frame and
 *   paused; `requestAnimationFrame` runs only while animating.
 * - **One teardown path.** `dispose()` releases the animation mixer, the model scene, the
 *   island, the renderer and the canvas exactly once.
 */

import * as THREE from 'three';

import { createBbModelScene, type BbModelScene } from '../bbmodel';
import { describeError, PREVIEW_BACKGROUND } from '../preview-host';
import { createIslandScene, type IslandScene } from './island-scene';
import {
  sceneMotion,
  prefersReducedMotion,
  REDUCED_MOTION_QUERY,
  type SceneMotion,
} from './motion';
import {
  groundCenteredPlacement,
  TLALOC_CLIP,
  TLALOC_MODEL_URL,
  TLALOC_SCALE,
  TLALOC_YAW,
} from './placement';
import { GROUND_SURFACE_Y, type VoxelIsland } from './voxels';

/** Seconds into the idle clip that reads as a settled pose for a reduced-motion visitor. */
const STILL_POSE_SECONDS = 0.45;

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
 * Builds the scene around `stage` and starts the lifecycle.
 *
 * @throws Error when the browser cannot create a WebGL context. That is the only failure the
 *   caller has to handle, and it is expected on machines without WebGL.
 */
export function createLandingScene(stage: HTMLElement, island: VoxelIsland): LandingSceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(PREVIEW_BACKGROUND, 1);

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  stage.append(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PREVIEW_BACKGROUND);
  // Fog hides the far edge of the slab and keeps the diorama from looking like a floating
  // polygon against a flat page.
  scene.fog = new THREE.Fog(PREVIEW_BACKGROUND, 22, 38);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);

  // Flat, readable lighting: a cool hemisphere fill, a warm key, a teal rim that echoes the
  // storefront accent, and one point light where the lanterns are.
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x1a2231, 1.6));
  const key = new THREE.DirectionalLight(0xfff2dc, 2);
  key.position.set(6, 10, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5eead4, 0.7);
  rim.position.set(-7, 4, -6);
  scene.add(rim);
  const lanternGlow = new THREE.PointLight(0xffc46b, 10, 12, 2);
  lanternGlow.position.set(3, 3, 3);
  scene.add(lanternGlow);

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

  let modelScene: BbModelScene | null = null;
  let mixer: THREE.AnimationMixer | null = null;

  const fail = (cause: unknown): void => {
    if (failed) return;
    failed = true;
    cancelLoop();
    reportLandingSceneFailure(cause);
    // The reserved panel keeps its gradient; the broken canvas is hidden rather than shown.
    canvas.style.display = 'none';
  };

  const renderFrame = (delta: number, still: boolean): void => {
    if (failed || disposed) return;
    try {
      if (still) {
        islandScene.update(0);
        mixer?.setTime(STILL_POSE_SECONDS);
      } else {
        elapsed += delta;
        islandScene.update(elapsed);
        mixer?.update(delta);
      }
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

  const loadModel = async (): Promise<void> => {
    try {
      const response = await fetch(TLALOC_MODEL_URL);
      if (!response.ok) {
        throw new Error(`GET ${TLALOC_MODEL_URL} responded ${response.status}`);
      }
      const raw: unknown = await response.json();
      const built = createBbModelScene(raw, { loadTexture: new THREE.TextureLoader() });
      if (disposed || failed) {
        built.dispose();
        return;
      }

      const placement = groundCenteredPlacement(
        built.stats.boundingBox,
        TLALOC_SCALE,
        GROUND_SURFACE_Y,
      );
      built.root.position.set(placement.position[0], placement.position[1], placement.position[2]);
      built.root.scale.setScalar(placement.scale);
      built.root.rotation.y = TLALOC_YAW;
      scene.add(built.root);
      modelScene = built;

      const clip =
        built.clips.find((candidate) => candidate.name === TLALOC_CLIP) ?? built.clips[0];
      if (clip !== undefined) {
        mixer = new THREE.AnimationMixer(built.root);
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
        action.play();
      }
      // The state may have changed while the model was in flight (a still frame was already
      // drawn without it), so re-apply rather than assuming the loop will pick it up.
      if (mode === 'still') renderFrame(0, true);
    } catch (cause) {
      // The island is procedural and already on screen; a missing boss degrades the
      // composition but does not break the page. A failure after unmount is not worth a log.
      if (!disposed) reportLandingSceneFailure(cause);
    }
  };

  applyMode();
  void loadModel();

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

      mixer?.stopAllAction();
      if (mixer !== null && modelScene !== null) mixer.uncacheRoot(modelScene.root);
      mixer = null;
      modelScene?.dispose();
      modelScene = null;

      islandScene.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
