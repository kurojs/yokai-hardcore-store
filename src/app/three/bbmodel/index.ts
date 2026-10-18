/**
 * The one entry point callers should use.
 *
 * `parse -> scene graph -> animation clips`, with a texture loader injected so the whole
 * pipeline can run headlessly in jsdom. Nothing here needs a WebGL context: the renderer is
 * the caller's business.
 *
 *     const scene = createBbModelScene(json, { loadTexture: new THREE.TextureLoader() });
 *     renderer.render(scene.root, camera);
 *     scene.dispose(); // on destroy
 */

import * as THREE from 'three';

import { buildAnimationClips, type BuiltClip, type ClipDescriptor } from './animation';
import { parseBbModel } from './parse';
import { buildSceneGraph, disposeScene, measureBoundingBox, toBounds, type Bounds } from './scene';
import type { TextureLoaderLike } from './textures';
import type { BbModel } from './types';

export { BB_EULER_ORDER, BB_FACE_DIRECTIONS } from './types';
export type {
  BbAnimation,
  BbAnimationChannel,
  BbBone,
  BbChannel,
  BbCube,
  BbFace,
  BbFaceDirection,
  BbLoopMode,
  BbModel,
  BbTextureRef,
  Vec3,
} from './types';
export { isHitboxBoneName, isEmissiveTextureName, parseBbModel } from './parse';
export { buildCubeGeometryData, faceUvSlots, rotateUvSlots, FACE_CORNER_INDICES, FACE_NORMALS } from './geometry';
export type { CubeGeometryData, CubeGeometryGroup } from './geometry';
export { buildSceneGraph, disposeScene, measureBoundingBox, toBounds } from './scene';
export type { Bounds, SceneGraphResult } from './scene';
export { buildAnimationClips } from './animation';
export type { BuiltClip, ClipDescriptor } from './animation';
export {
  base64Payload,
  createEmbeddedTexture,
  decodeTextureSource,
  readPngSize,
  sniffImageMime,
  toDataUri,
} from './textures';
export type { EmbeddedTextureOptions, TextureLoaderLike } from './textures';

/** Numbers that let a caller (or a test) prove what actually got built. */
export interface BbModelStats {
  /** Cubes that are in the scene graph. */
  readonly cubesRendered: number;
  /** Cubes dropped together with a hitbox bone. */
  readonly cubesFilteredAsHitbox: number;
  /** Cubes dropped because Blockbench had them hidden. */
  readonly cubesFilteredAsHidden: number;
  /** Total cubes in the source file, so the arithmetic can be checked. */
  readonly cubesInSource: number;
  readonly bonesRendered: number;
  readonly hitboxBoneNames: readonly string[];
  /** Clips actually built. Fewer than `animationsInSource` means something was skipped. */
  readonly clips: number;
  readonly animationsInSource: number;
  readonly tracks: number;
  readonly keyframes: number;
  readonly textures: number;
  readonly emissiveTextureIndex: number | null;
  /** Bounds of the **visible** geometry: hitboxes are not in the graph to widen them. */
  readonly boundingBox: Bounds;
  readonly warnings: readonly string[];
}

/** Everything a renderer needs, plus the numbers that describe it. */
export interface BbModelScene {
  /** Root of the hierarchy; add this to your scene. */
  readonly root: THREE.Group;
  readonly clips: readonly THREE.AnimationClip[];
  /** Per-clip metadata three.js does not keep on the clip (notably the loop mode). */
  readonly clipDescriptors: readonly ClipDescriptor[];
  /** Blockbench uuid -> node, for both bones and cubes. */
  readonly modelMap: ReadonlyMap<string, THREE.Object3D>;
  readonly textures: readonly THREE.Texture[];
  readonly stats: BbModelStats;
  /** Frees every geometry, material and texture this scene owns. */
  dispose(): void;
}

/** Options for {@link createBbModelScene}. */
export interface CreateSceneOptions {
  /** Loads an embedded base64 texture. Defaults to `new THREE.TextureLoader()`. */
  readonly loadTexture?: TextureLoaderLike;
}

/**
 * Parses a raw `.bbmodel` document and builds a renderable three.js scene from it.
 *
 * @throws Error with a `bbmodel` prefix when the document is malformed; malformed input is
 *   never repaired into an empty scene.
 */
export function createBbModelScene(
  raw: unknown,
  options: CreateSceneOptions = {},
): BbModelScene {
  const model: BbModel = parseBbModel(raw);
  const graph = buildSceneGraph(model, options);
  const built: readonly BuiltClip[] = buildAnimationClips(model, graph.modelMap);
  const bound = measureBoundingBox(graph.root);

  const stats: BbModelStats = {
    cubesRendered: model.cubes.length,
    cubesFilteredAsHitbox: model.cubesFilteredAsHitbox,
    cubesFilteredAsHidden: model.cubesFilteredAsHidden,
    cubesInSource: model.cubes.length + model.cubesFilteredAsHitbox + model.cubesFilteredAsHidden,
    bonesRendered: model.bones.length,
    hitboxBoneNames: model.hitboxBoneNames,
    clips: built.length,
    animationsInSource: model.animations.length,
    tracks: built.reduce((total, item) => total + item.descriptor.trackCount, 0),
    keyframes: built.reduce((total, item) => total + item.descriptor.keyframeCount, 0),
    textures: model.textures.length,
    emissiveTextureIndex: graph.emissiveTextureIndex,
    boundingBox: toBounds(bound),
    warnings: model.warnings,
  };

  return {
    root: graph.root,
    clips: built.map((item) => item.clip),
    clipDescriptors: built.map((item) => item.descriptor),
    modelMap: graph.modelMap,
    textures: graph.textures,
    stats,
    dispose: () => {
      // `disposeScene` de-duplicates the texture set, so passing every texture here does not
      // double-dispose the ones a material already references.
      disposeScene(graph.root, graph.textures);
    },
  };
}
