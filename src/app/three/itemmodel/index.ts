/**
 * The one entry point callers should use for Minecraft item models.
 *
 *     const scene = createItemModelScene(json, { resolveTexture, loadTexture });
 *     host.scene.add(scene.root);
 *     scene.setDisplayContext('gui');
 *     scene.dispose(); // on destroy
 *
 * `parse -> scene`, with both the texture resolver and the texture loader injected, so the
 * whole pipeline runs headlessly in jsdom. Nothing here needs a WebGL context: the renderer
 * is the caller's business.
 */

import * as THREE from 'three';

import { parseItemModel } from './parse';
import { measureItemBounds, type ItemBounds } from './geometry';
import { buildItemScene, type ItemScene, type ItemSceneOptions } from './scene';
import { resolveItemTextureUrls } from './textures';
import type { ItemModel } from './types';

export { ITEM_FACE_DIRECTIONS, ITEM_DISPLAY_CONTEXTS, ITEM_UNITS_PER_BLOCK, ITEM_UV_SPACE } from './types';
export type {
  ItemAxis,
  ItemDisplay,
  ItemDisplayContext,
  ItemElement,
  ItemFace,
  ItemFaceDirection,
  ItemModel,
  ItemModelKind,
  ItemRawModel,
  ItemRotation,
  ItemSprite,
  ItemTexture,
  Quat,
  Vec3,
} from './types';

export { parseItemModel } from './parse';

export {
  axisAngleToQuaternion,
  buildItemElementGeometry,
  buildItemSpriteElement,
  itemElementPivot,
  itemElementQuaternion,
  itemUvToPixels,
  measureItemBounds,
  measureItemElementBounds,
  multiplyQuaternions,
  rotateVec3,
} from './geometry';
export type { ItemBounds } from './geometry';

export { buildItemScene, ITEM_ELEMENT_INDEX_KEY, ITEM_NODE_KIND_KEY, MISSING_TEXTURE_COLOR } from './scene';
export type {
  ItemScene,
  ItemSceneOptions,
  ItemSceneStats,
  ItemTextureBinding,
  ItemTextureResolver,
  ItemTextureStatus,
} from './scene';

export {
  createItemTexture,
  emissiveFileName,
  isNamespacedTexturePath,
  itemTextureFileName,
  resolveItemTextureUrls,
  stripNamespace,
  ITEM_EMISSIVE_SUFFIX,
  ITEM_TEXTURE_EXTENSION,
} from './textures';
export type { ItemTextureLoaderLike, ItemTextureOptions } from './textures';

/**
 * Parses a raw item model document and builds a renderable three.js scene from it.
 *
 * @throws Error with an `itemmodel` prefix when the document is neither renderable geometry
 *   nor a recognisable parent-driven sprite; malformed input is never repaired into an empty
 *   scene, and an unavailable texture is reported rather than thrown.
 */
export function createItemModelScene(raw: unknown, options: ItemSceneOptions = {}): ItemScene {
  return buildItemScene(parseItemModel(raw), options);
}

/** Bounds of a parsed model's own geometry, without building a scene. */
export function itemModelBounds(model: ItemModel): ItemBounds {
  return measureItemBounds(model.elements);
}

/**
 * Every texture path a scene built from this model will ask for, and nothing else.
 *
 * This is what a caller probes before building: resolving the *model's* `textures` map would
 * include the `particle` declaration, which no face samples, and would miss a sprite, whose
 * only texture lives in its parent-driven slot rather than on a face.
 */
export function itemModelTexturePaths(model: ItemModel): readonly string[] {
  const paths = new Set<string>();
  for (const element of model.elements) {
    for (const face of element.faces) paths.add(face.texturePath);
  }
  if (model.sprite?.texturePath !== null && model.sprite?.texturePath !== undefined) {
    paths.add(model.sprite.texturePath);
  }
  return [...paths];
}

/**
 * A loader for a model's own textures inside the browser, layered on the sibling-PNG
 * convention. Kept here rather than in `textures.ts` so the resolver/loader pair the dev
 * route uses is visible in one place.
 *
 * The probe is a real request: which textures exist is an observed fact, not an assumption.
 * A texture that is not there resolves to `url: null`, which the scene renders as the
 * documented "texture not available" state, never as an error.
 */
export interface ItemTextureProbe {
  /** Confirms a URL responds, returning `false` for any status outside 2xx. */
  probe(url: string): Promise<boolean>;
}

/** Browser probe: a `HEAD` request, treating any transport failure as "not available". */
export function createFetchTextureProbe(): ItemTextureProbe {
  return {
    async probe(url: string): Promise<boolean> {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Probes both the base texture and its emissive companion for one model.
 *
 * @returns the bindings to hand to {@link createItemModelScene}'s `resolveTexture`.
 */
export async function resolveItemTextures(
  modelUrl: string,
  texturePaths: readonly string[],
  probe: ItemTextureProbe,
): Promise<ReadonlyMap<string, { url: string | null; emissiveUrl: string | null }>> {
  const bindings = new Map<string, { url: string | null; emissiveUrl: string | null }>();
  for (const path of texturePaths) {
    const candidates = resolveItemTextureUrls(modelUrl, path);
    const [url, emissive] = await Promise.all([
      probe.probe(candidates.url),
      probe.probe(candidates.emissiveUrl),
    ]);
    bindings.set(path, {
      url: url ? candidates.url : null,
      emissiveUrl: url && emissive ? candidates.emissiveUrl : null,
    });
  }
  return bindings;
}

/** Convenience: a `THREE.TextureLoader`, the default loader in the browser. */
export function createItemTextureLoader(): THREE.TextureLoader {
  return new THREE.TextureLoader();
}
