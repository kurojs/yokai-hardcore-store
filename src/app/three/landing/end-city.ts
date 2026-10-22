/**
 * The landing background model: an End City, authored by DURVESH123 and published on Sketchfab
 * under CC BY 4.0. See `public/models/end-city/LICENSE.txt`.
 *
 * The asset is a 3.4 MB GLB compressed with `EXT_meshopt_compression` and WebP textures. It is
 * only ever fetched from the lazily imported landing scene, never from the initial bundle, and it
 * is the reason that scene has no procedural geometry left: the storefront shows a world instead
 * of generating one.
 *
 * Two functions carry the whole layout, and both are testable without a GPU:
 *
 * - `centerAndScale` normalises the export. A Sketchfab model arrives in whatever units and with
 *   whatever origin the author used, so it is re-scaled by its own bounding box and re-centred on
 *   the origin. Centring is not cosmetic: the host rotates the returned root, and an off-centre
 *   model would swing across the viewport instead of turning on its own axis.
 * - `fitDistance` answers "how far back does the camera have to stand". It uses the smaller of the
 *   two field-of-view angles, so a portrait phone pulls the camera back until the city fits
 *   horizontally rather than cropping it in half.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/** Served from `public/`, so the path is root-relative like every other asset. */
export const END_CITY_URL = 'models/end-city/end-city.glb';

/** The height the model is normalised to, in three.js world units. */
export const END_CITY_HEIGHT = 26;

/** What the renderer gets back from a successful load. */
export interface CityModel {
  /** Already centred and scaled; rotate this, not the scene below it. */
  readonly root: THREE.Group;
  /** Radius of the normalised bounding sphere, used to place the camera. */
  readonly radius: number;
  dispose(): void;
}

/**
 * Camera distance that keeps a sphere of `radius` inside the frame.
 *
 * `fill` below 1 pulls the camera closer and lets the model bleed past the edges. The storefront
 * wants that: this is a background, and a city framed with margin reads as a picture on the page
 * rather than as the world behind it. 0.45 sits the camera well inside the city — the visitor sees
 * purpur, obsidian and end stone up close, and the model fills the frame instead of floating in it.
 */
export function fitDistance(radius: number, fovDegrees: number, aspect: number, fill = 0.45): number {
  const safeRadius = Math.max(radius, 0.001);
  const safeAspect = aspect > 0 ? aspect : 1;
  const verticalFov = (fovDegrees * Math.PI) / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * safeAspect);

  const byHeight = safeRadius / Math.sin(verticalFov / 2);
  const byWidth = safeRadius / Math.sin(horizontalFov / 2);

  return Math.max(byHeight, byWidth) * fill;
}

/**
 * Re-scales `object` to `targetHeight` and moves it so its bounding-box centre sits on the origin.
 *
 * @returns the radius of the resulting bounding sphere, which is what `fitDistance` needs.
 */
export function centerAndScale(object: THREE.Object3D, targetHeight: number): number {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;

  const scale = targetHeight / Math.max(size.y, 0.0001);
  object.scale.setScalar(scale);

  // Re-measure once the scale is applied and shift by the *new* centre. Subtracting the original
  // centre times the scale would only be right when the object sits at the origin with no
  // transform of its own, which a glTF scene root does but a hand-built test mesh does not.
  const scaled = new THREE.Box3().setFromObject(object);
  object.position.sub(scaled.getCenter(new THREE.Vector3()));

  return radius * scale;
}

/** Fetches and normalises the city. Rejects with the loader's own error. */
export async function loadEndCity(url: string = END_CITY_URL): Promise<CityModel> {
  const loader = new GLTFLoader();
  // The GLB stores its buffers with EXT_meshopt_compression; without this the loader rejects it.
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  const radius = centerAndScale(model, END_CITY_HEIGHT);

  const root = new THREE.Group();
  root.add(model);

  return {
    root,
    radius,
    dispose(): void {
      disposeObject(model);
    },
  };
}

/** Releases every geometry, material and texture under `root`. Safe to call once, after teardown. */
function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh !== true) return;

    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}
