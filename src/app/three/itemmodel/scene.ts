/**
 * Validated item model -> `THREE.Group`, one mesh per element.
 *
 * Pure with respect to the platform: three.js objects are plain JS, so the whole hierarchy
 * is unit testable in jsdom. Only the injected texture loader may reach for an image, and
 * nothing here needs a renderer, a canvas or a WebGL context.
 *
 * Two decisions worth naming, because both are easy to get wrong:
 *
 * - **A missing texture is not malformed input.** `netherite_sword.json` and `paper.json`
 *   delegate to `minecraft:` parents whose textures live in the game's jar, not in this
 *   repository. Those models still get their sprite quad, drawn with a flat marker material,
 *   and the state is reported in `stats.textures` and as a warning. Nothing throws.
 * - **The `display` transform belongs to the whole model.** It is applied to the root group
 *   as `translate * rotate * scale` in model units, which is vanilla's composition order.
 */

import * as THREE from 'three';

import { disposeScene } from '../bbmodel/scene';
import {
  buildItemElementGeometry,
  buildItemSpriteElement,
  itemElementPivot,
  itemElementQuaternion,
  measureItemBounds,
  type ItemBounds,
} from './geometry';
import { createItemTexture, type ItemTextureLoaderLike } from './textures';
import type {
  ItemDisplay,
  ItemDisplayContext,
  ItemElement,
  ItemModel,
  ItemModelKind,
} from './types';

/** Prefix used by every error this module throws. */
const ERROR_PREFIX = 'itemmodel scene:';

/** `userData` keys written on the root, for debugging and for tests. */
export const ITEM_NODE_KIND_KEY = 'itemmodelKind';
export const ITEM_ELEMENT_INDEX_KEY = 'itemmodelElement';

/**
 * Material colour used for a texture the caller could not locate.
 *
 * A flat fuchsia marker rather than a texture: it needs no canvas, it is unmistakable, and
 * it reads to a Minecraft player as "this asset is missing" instead of "this model is
 * broken". The HUD names the path that could not be loaded.
 */
export const MISSING_TEXTURE_COLOR = 0xc026d3;

/** What the caller knows about one texture path the model references. */
export interface ItemTextureBinding {
  /** URL of the texture, or `null` when the caller could not locate the file. */
  readonly url: string | null;
  /** URL of the emissive companion layer, when there is one. */
  readonly emissiveUrl?: string | null;
}

/** Maps a model's texture path (e.g. `item/custom/tlaloc/tlaloc_hat`) to a loadable asset. */
export type ItemTextureResolver = (texturePath: string) => ItemTextureBinding;

/** Per-texture outcome, so a caller can name what is missing rather than only count it. */
export interface ItemTextureStatus {
  /** Key in the model's `textures` map, e.g. `"0"` or `"layer0"`. */
  readonly key: string;
  readonly path: string;
  readonly url: string | null;
  readonly status: 'loaded' | 'unavailable';
  /** True when an emissive companion was loaded alongside the base texture. */
  readonly emissive: boolean;
}

/** Numbers that let a caller (or a test) prove what actually got built. */
export interface ItemSceneStats {
  readonly kind: ItemModelKind;
  /** Elements drawn. 29 for the hat, 37 for the staff, 1 for a sprite quad. */
  readonly elements: number;
  readonly faces: number;
  readonly meshes: number;
  readonly triangles: number;
  readonly textures: readonly ItemTextureStatus[];
  /** Contexts the file declares. Empty means the model is posed by the identity. */
  readonly displayContexts: readonly ItemDisplayContext[];
  /** Bounds of the model's own geometry, before any `display` transform. */
  readonly modelBounds: ItemBounds;
  readonly warnings: readonly string[];
}

/** Everything a renderer needs, plus the numbers that describe it. */
export interface ItemScene {
  /** Root of the hierarchy; add this to your scene. */
  readonly root: THREE.Group;
  readonly model: ItemModel;
  readonly stats: ItemSceneStats;
  /** Currently applied context, or `null` for the identity pose. */
  readonly displayContext: ItemDisplayContext | null;
  /** Poses the model the way Minecraft does in that context. */
  setDisplayContext(context: ItemDisplayContext | null): void;
  /** World-space bounds of the currently posed model. */
  measureBounds(): ItemBounds;
  /** Frees every geometry, material and texture this scene owns. */
  dispose(): void;
}

/** Options for {@link buildItemScene}. */
export interface ItemSceneOptions {
  /**
   * Resolves a texture path to a loadable asset. Defaults to "nothing is available", so a
   * caller that forgets it gets a fully described placeholder scene instead of a silent 404.
   */
  readonly resolveTexture?: ItemTextureResolver;
  /** Loads a resolved URL. Defaults to a `THREE.TextureLoader`. */
  readonly loadTexture?: ItemTextureLoaderLike;
}

/** An entry with the material index, so geometry groups and materials stay in step. */
interface ResolvedEntry {
  readonly key: string;
  readonly path: string;
  readonly status: ItemTextureStatus;
  /** Index into the material array, or `-1` for the shared marker material. */
  readonly materialIndex: number;
  /** Textures this entry created, so disposal can own them exactly once. */
  readonly ownedTextures: readonly THREE.Texture[];
}

/**
 * Builds a renderable scene from a validated item model.
 *
 * @throws Error with an `itemmodel scene:` prefix only on a genuine internal inconsistency;
 *   an unavailable texture is a reported state, never a throw.
 */
export function buildItemScene(model: ItemModel, options: ItemSceneOptions = {}): ItemScene {
  const resolveTexture = options.resolveTexture ?? ((): ItemTextureBinding => ({ url: null }));
  const loader = options.loadTexture ?? new THREE.TextureLoader();
  const warnings: string[] = [...model.warnings];

  const elements: readonly ItemElement[] =
    model.kind === 'sprite' ? [spriteElement(model)] : model.elements;

  const resolved = resolveTextures(elements, resolveTexture, loader, warnings);
  const materialIndexByPath = new Map(resolved.map((entry) => [entry.path, entry.materialIndex]));
  const materials = buildMaterials(resolved);
  const markerMaterial = createMarkerMaterial();
  const usesMarkerMaterial = resolved.some((entry) => entry.materialIndex < 0);

  const root = new THREE.Group();
  root.name = 'itemmodel';
  root.userData[ITEM_NODE_KIND_KEY] = model.kind;

  const textures: THREE.Texture[] = [];
  let faceCount = 0;
  let triangleCount = 0;
  let disposed = false;
  let appliedContext: ItemDisplayContext | null = null;

  for (const element of elements) {
    const data = buildItemElementGeometry(element, model.textureSize, materialIndexByPath);
    const geometry = new THREE.BufferGeometry();
    geometry.name = `itemmodel-element-${element.index}`;
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    // Vertices are not shared between faces, so this yields exact per-face normals.
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    for (const group of data.groups) {
      geometry.addGroup(group.start, group.count, group.textureIndex);
    }

    const distinct = [...new Set(element.faces.map((face) => face.texturePath))];
    const materialFor = (path: string): THREE.MeshStandardMaterial => {
      const index = materialIndexByPath.get(path);
      if (index === undefined) return markerMaterial;
      return materials[index] ?? markerMaterial;
    };
    const material =
      distinct.length === 1 ? materialFor(distinct[0]) : distinct.map((path) => materialFor(path));

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `itemmodel-element-${element.index}`;
    mesh.userData[ITEM_ELEMENT_INDEX_KEY] = element.index;
    const pivot = itemElementPivot(element);
    mesh.position.set(pivot[0], pivot[1], pivot[2]);
    const [qx, qy, qz, qw] = itemElementQuaternion(element);
    mesh.quaternion.set(qx, qy, qz, qw);
    root.add(mesh);

    faceCount += element.faces.length;
    triangleCount += data.indices.length / 3;
  }

  for (const entry of resolved) {
    for (const texture of entry.ownedTextures) textures.push(texture);
  }

  const scene: ItemScene = {
    root,
    model,
    stats: {
      kind: model.kind,
      elements: elements.length,
      faces: faceCount,
      meshes: root.children.length,
      triangles: triangleCount,
      textures: resolved.map((entry) => entry.status),
      displayContexts: model.display.map((display) => display.context),
      modelBounds: measureItemBounds(elements),
      warnings,
    },
    get displayContext(): ItemDisplayContext | null {
      return appliedContext;
    },
    setDisplayContext(context: ItemDisplayContext | null): void {
      appliedContext = context;
      applyDisplayContext(
        root,
        context === null ? null : (model.display.find((display) => display.context === context) ?? null),
      );
    },
    measureBounds(): ItemBounds {
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      return { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
    },
    dispose(): void {
      // Idempotent on purpose: a viewer disposes the scene it is replacing *and* disposes
      // whatever is still mounted on destroy, which would otherwise be the same scene twice.
      if (disposed) return;
      disposed = true;
      // Reused from `bbmodel/scene.ts`: disposal de-duplicates materials and textures, which
      // is the trap a second copy of this loop gets wrong (materials and textures are shared
      // between meshes, so disposing them per mesh double-frees).
      disposeScene(root, textures);
      // The marker material is reachable from the root exactly when some face fell back to
      // it, and would then have been disposed above; this releases it in the other case
      // instead of disposing it twice.
      if (!usesMarkerMaterial) markerMaterial.dispose();
    },
  };

  scene.setDisplayContext(null);
  return scene;
}

/** The synthetic element that stands in for a sprite's unresolved vanilla parent. */
function spriteElement(model: ItemModel): ItemElement {
  if (model.sprite === null) {
    throw new Error(`${ERROR_PREFIX} a sprite model is missing its sprite descriptor`);
  }
  return buildItemSpriteElement(model.sprite.textureKey, model.sprite.texturePath ?? '');
}

/** Resolves every distinct texture path once, loading the ones the caller can locate. */
function resolveTextures(
  elements: readonly ItemElement[],
  resolveTexture: ItemTextureResolver,
  loader: ItemTextureLoaderLike,
  warnings: string[],
): readonly ResolvedEntry[] {
  const seen = new Map<string, ResolvedEntry>();
  let materialIndex = 0;

  for (const element of elements) {
    for (const face of element.faces) {
      if (seen.has(face.texturePath)) continue;
      const binding = resolveTexture(face.texturePath);
      const owned: THREE.Texture[] = [];

      if (binding.url === null) {
        warnings.push(
          `texture "${face.texturePath}" is not available next to this model; its faces render with a placeholder material`,
        );
        seen.set(face.texturePath, {
          key: face.textureKey,
          path: face.texturePath,
          status: {
            key: face.textureKey,
            path: face.texturePath,
            url: null,
            status: 'unavailable',
            emissive: false,
          },
          materialIndex: -1,
          ownedTextures: owned,
        });
        continue;
      }

      owned.push(createItemTexture(loader, binding.url, { name: face.texturePath }));
      let emissive = false;
      if (binding.emissiveUrl !== undefined && binding.emissiveUrl !== null) {
        owned.push(
          createItemTexture(loader, binding.emissiveUrl, { name: face.texturePath, emissive: true }),
        );
        emissive = true;
      }
      seen.set(face.texturePath, {
        key: face.textureKey,
        path: face.texturePath,
        status: {
          key: face.textureKey,
          path: face.texturePath,
          url: binding.url,
          status: 'loaded',
          emissive,
        },
        materialIndex,
        ownedTextures: owned,
      });
      materialIndex += 1;
    }
  }

  return [...seen.values()];
}

/** One material per loaded texture, in the order the entries were resolved. */
function buildMaterials(resolved: readonly ResolvedEntry[]): readonly THREE.MeshStandardMaterial[] {
  const materials: THREE.MeshStandardMaterial[] = [];
  for (const entry of resolved) {
    if (entry.materialIndex < 0) continue;
    const base = entry.ownedTextures[0] ?? null;
    const emissiveMap = entry.ownedTextures[1] ?? null;
    materials.push(createMaterial(base, emissiveMap));
  }
  return materials;
}

/**
 * A Minecraft-style material: albedo plus an optional emissive layer.
 *
 * `emissive` has to be a non-black colour for `emissiveMap` to do anything, so it is white
 * exactly when the model declares an emissive companion.
 */
function createMaterial(
  base: THREE.Texture | null,
  emissiveMap: THREE.Texture | null,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    name: emissiveMap === null ? 'itemmodel-base' : 'itemmodel-base-emissive',
    map: base,
    emissiveMap,
    emissive: new THREE.Color(emissiveMap === null ? 0x000000 : 0xffffff),
    emissiveIntensity: 1,
    metalness: 0,
    roughness: 1,
    transparent: false,
    side: THREE.FrontSide,
  });
}

/** The "texture not available" material: untextured, unmistakable, never transparent. */
function createMarkerMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    name: 'itemmodel-missing-texture',
    color: new THREE.Color(MISSING_TEXTURE_COLOR),
    map: null,
    metalness: 0,
    roughness: 1,
    transparent: false,
    side: THREE.FrontSide,
  });
}

/**
 * Applies a `display` entry to the root group.
 *
 * Vanilla composes the context transform as `translate * rotate * scale`, which is exactly
 * `Object3D.matrix`'s `compose(position, quaternion, scale)`. Translation is in model units
 * (1/16 block) and stays in those units because the whole scene does.
 */
function applyDisplayContext(root: THREE.Group, display: ItemDisplay | null): void {
  if (display === null) {
    root.position.set(0, 0, 0);
    root.quaternion.identity();
    root.scale.set(1, 1, 1);
    root.updateMatrixWorld(true);
    return;
  }

  root.position.set(display.translation[0], display.translation[1], display.translation[2]);
  root.quaternion.setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(display.rotation[0]),
      THREE.MathUtils.degToRad(display.rotation[1]),
      THREE.MathUtils.degToRad(display.rotation[2]),
      'XYZ',
    ),
  );
  root.scale.set(display.scale[0], display.scale[1], display.scale[2]);
  root.updateMatrixWorld(true);
}
