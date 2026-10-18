/**
 * Validated model -> `THREE.Object3D` hierarchy, plus the uuid map animations bind against.
 *
 * Pure with respect to the platform: it builds three.js objects (which are plain JS) and
 * never touches a renderer, a canvas or the DOM, so the whole hierarchy is unit testable in
 * jsdom. Only the injected `TextureLoaderLike` may reach for an image.
 *
 * Two Blockbench behaviours drive the transform math, both read from
 * `js/outliner/outliner.js` (`NodePreviewController.updateTransform`):
 *
 * - A node's `origin` in the file is a position in **model space**. When a node is parented
 *   to another bone, the mesh position is converted to a parent-relative offset
 *   (`mesh.position -= parent.origin`); a top-level node keeps its absolute origin.
 * - Rotations are applied on the mesh in `Format.euler_order` order, which is `'ZYX'`.
 */

import * as THREE from 'three';

import { buildCubeGeometryData } from './geometry';
import { createEmbeddedTexture, type TextureLoaderLike } from './textures';
import { BB_EULER_ORDER, type BbBone, type BbCube, type BbModel, type Vec3 } from './types';

/** Prefix used by every error this module throws. */
const ERROR_PREFIX = 'bbmodel scene:';

/** `userData` keys written on every node, for debugging and for tests. */
export const NODE_UUID_KEY = 'blockbenchUuid';
export const NODE_KIND_KEY = 'blockbenchKind';

/** What {@link buildSceneGraph} hands back. */
export interface SceneGraphResult {
  /** Root group; its children are the outliner-root bones. */
  readonly root: THREE.Group;
  /** Blockbench uuid -> node, for both bones and cubes. */
  readonly modelMap: ReadonlyMap<string, THREE.Object3D>;
  /** Meshes in creation order, so a caller can measure or replace them. */
  readonly meshes: readonly THREE.Mesh[];
  /** One material per texture index, shared by every mesh that uses it. */
  readonly materials: readonly THREE.MeshStandardMaterial[];
  /** Loaded textures in `BbModel.textures` order. */
  readonly textures: readonly THREE.Texture[];
  /** Index of the first emissive texture, or `null` when the model has none. */
  readonly emissiveTextureIndex: number | null;
}

/** Options for {@link buildSceneGraph}. */
export interface SceneOptions {
  /** Loads an embedded base64 texture. Defaults to a `THREE.TextureLoader`. */
  readonly loadTexture?: TextureLoaderLike;
}

function degreesToEuler(value: Vec3): THREE.Euler {
  return new THREE.Euler(
    THREE.MathUtils.degToRad(value[0]),
    THREE.MathUtils.degToRad(value[1]),
    THREE.MathUtils.degToRad(value[2]),
    BB_EULER_ORDER,
  );
}

function subtract(a: Vec3, b: Vec3 | null): THREE.Vector3 {
  if (b === null) return new THREE.Vector3(a[0], a[1], a[2]);
  return new THREE.Vector3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Makes a name unique and bindable inside the hierarchy.
 *
 * The sanitising step is not cosmetic: three.js resolves an animation track by splitting
 * `${nodeName}.${property}`, and its parser only accepts `[A-Za-z0-9_.-]` in a node name.
 * A Blockbench bone called `hand.1` would silently produce a track that binds to nothing.
 * Every bone name in the real asset is already plain ASCII, so this is a no-op there.
 */
function uniqueName(desired: string, taken: Set<string>): string {
  const safe = desired.replace(/[^A-Za-z0-9_-]/g, '_') || 'node';
  if (!taken.has(safe)) {
    taken.add(safe);
    return safe;
  }
  let suffix = 2;
  while (taken.has(`${safe}_${suffix}`)) suffix += 1;
  const name = `${safe}_${suffix}`;
  taken.add(name);
  return name;
}

/**
 * Builds the full scene graph for a validated model.
 *
 * Hitbox bones and their cubes are already gone by this point, so they cannot appear here:
 * the bounding box of the returned root is the bounding box of the visible model only.
 */
export function buildSceneGraph(model: BbModel, options: SceneOptions = {}): SceneGraphResult {
  const loader = options.loadTexture ?? new THREE.TextureLoader();

  const textures = model.textures.map((ref) => createEmbeddedTexture(ref, loader));
  const emissiveTextureIndex = model.textures.findIndex((ref) => ref.isEmissive);
  const emissiveTexture = emissiveTextureIndex === -1 ? null : (textures[emissiveTextureIndex] ?? null);
  // Every face of the real asset references texture 0, so the emissive layer has to be hung
  // off the *base* material as `emissiveMap`: it shares the base atlas' UV space and paints
  // over the same faces. A material whose own texture is the emissive layer keeps it as
  // albedo and gets no second emissive map.
  const materials = model.textures.map((_, index) =>
    createMaterial(textures[index] ?? null, index === emissiveTextureIndex ? null : emissiveTexture),
  );
  // A model with no `textures` array still has to be drawable.
  const fallbackMaterial = createMaterial(null, null);
  const materialFor = (textureIndex: number): THREE.MeshStandardMaterial => {
    const material = materials[textureIndex];
    if (material !== undefined) return material;
    return fallbackMaterial;
  };

  const root = new THREE.Group();
  root.name = model.name;

  const modelMap = new Map<string, THREE.Object3D>();
  const nodeByName = new Map<string, THREE.Object3D>();
  const takenNames = new Set<string>();
  const meshes: THREE.Mesh[] = [];

  const boneByUuid = new Map<string, BbBone>(model.bones.map((bone) => [bone.uuid, bone]));
  const boneNode = new Map<string, THREE.Object3D>();

  for (const bone of model.bones) {
    const parentBone = bone.parentUuid === null ? null : boneByUuid.get(bone.parentUuid);
    if (bone.parentUuid !== null && parentBone === undefined) {
      throw new Error(
        `${ERROR_PREFIX} bone "${bone.name}" declares parent ${bone.parentUuid}, which is not a rendered bone`,
      );
    }
    const node = new THREE.Group();
    node.name = uniqueName(bone.name, takenNames);
    node.position.copy(subtract(bone.origin, parentBone?.origin ?? null));
    node.rotation.copy(degreesToEuler(bone.rotation));
    node.userData[NODE_UUID_KEY] = bone.uuid;
    node.userData[NODE_KIND_KEY] = 'bone';

    const parent = bone.parentUuid === null ? root : boneNode.get(bone.parentUuid);
    if (parent === undefined) {
      throw new Error(
        `${ERROR_PREFIX} bone "${bone.name}" appears before its parent ${bone.parentUuid} in pre-order`,
      );
    }
    parent.add(node);
    boneNode.set(bone.uuid, node);
    modelMap.set(bone.uuid, node);
    nodeByName.set(node.name, node);
  }

  for (const cube of model.cubes) {
    const mesh = buildCubeMesh(cube, model, materialFor, takenNames);
    const parent = cube.boneUuid === null ? root : boneNode.get(cube.boneUuid);
    if (parent === undefined) {
      throw new Error(
        `${ERROR_PREFIX} cube "${cube.uuid}" is owned by bone ${cube.boneUuid}, which is not a rendered bone`,
      );
    }
    mesh.position.copy(subtract(cube.origin, boneOriginOf(cube, boneByUuid)));
    mesh.rotation.copy(degreesToEuler(cube.rotation));
    parent.add(mesh);
    meshes.push(mesh);
    modelMap.set(cube.uuid, mesh);
    nodeByName.set(mesh.name, mesh);
  }

  root.updateMatrixWorld(true);
  // Named last, and only now: three.js resolves a track's node by searching for a matching
  // name, and `PropertyBinding.findNode` returns the *root* as soon as its own name matches.
  // Bone names must stay faithful to the file, so the root is the one that yields. Without
  // this, a model whose root bone shares the model's name (which `tlaloc.bbmodel` does)
  // would bind its root-bone tracks to the root group and animate nothing.
  root.name = uniqueName(model.name, takenNames);
  return {
    root,
    modelMap,
    meshes,
    materials: [...materials, fallbackMaterial],
    textures,
    emissiveTextureIndex: emissiveTextureIndex === -1 ? null : emissiveTextureIndex,
  };
}

function boneOriginOf(cube: BbCube, boneByUuid: ReadonlyMap<string, BbBone>): Vec3 | null {
  if (cube.boneUuid === null) return null;
  const bone = boneByUuid.get(cube.boneUuid);
  return bone === undefined ? null : bone.origin;
}

function buildCubeMesh(
  cube: BbCube,
  model: BbModel,
  materialFor: (textureIndex: number) => THREE.MeshStandardMaterial,
  takenNames: Set<string>,
): THREE.Mesh {
  if (cube.faces.length === 0) {
    throw new Error(`${ERROR_PREFIX} cube "${cube.uuid}" has no faces to draw`);
  }
  const data = buildCubeGeometryData(cube, model.resolution.width, model.resolution.height);
  const geometry = new THREE.BufferGeometry();
  geometry.name = `${cube.name}:${cube.uuid.slice(0, 8)}`;
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  // Vertices are not shared between faces, so this yields exact per-face normals.
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  for (const group of data.groups) {
    geometry.addGroup(group.start, group.count, group.textureIndex);
  }

  const distinct = new Set(cube.faces.map((face) => face.textureIndex));
  const material =
    distinct.size === 1
      ? materialFor(cube.faces[0].textureIndex)
      : [...distinct].map((index) => materialFor(index));

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = uniqueName(cube.name, takenNames);
  mesh.userData[NODE_UUID_KEY] = cube.uuid;
  mesh.userData[NODE_KIND_KEY] = 'cube';
  return mesh;
}

/**
 * A Minecraft-style material: albedo plus an optional emissive layer.
 *
 * `emissive` must be a non-black colour for `emissiveMap` to have any effect at all, so it
 * is set to white whenever an emissive texture is present and left black otherwise. The
 * real asset's `tlaloc_e.png` is black everywhere except the glowing details, which is what
 * makes a white emissive tint light up exactly those details and nothing else.
 */
function createMaterial(
  base: THREE.Texture | null,
  emissiveMap: THREE.Texture | null,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    name: emissiveMap === null ? 'bbmodel-base' : 'bbmodel-base-emissive',
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

/** World-space bounds of the visible geometry under `root`. */
export function measureBoundingBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root);
}

/** Axis-aligned bounds reduced to plain arrays, so the result survives a JSON round trip. */
export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/** Converts a three.js box into plain tuples. */
export function toBounds(box: THREE.Box3): Bounds {
  return {
    min: [box.min.x, box.min.y, box.min.z] as Vec3,
    max: [box.max.x, box.max.y, box.max.z] as Vec3,
  };
}

/**
 * Releases every GPU resource reachable from `root`, plus any `extraTextures` the caller
 * owns.
 *
 * Materials and textures are de-duplicated first: they are shared between meshes here, and
 * disposing them once per mesh would be both wrong and slow. `extraTextures` exists because
 * a texture whose material was never attached to a mesh is unreachable from `root`.
 */
export function disposeScene(
  root: THREE.Object3D,
  extraTextures: readonly THREE.Texture[] = [],
): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>(extraTextures);

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const assigned = object.material;
    for (const material of Array.isArray(assigned) ? assigned : [assigned]) {
      materials.add(material);
      for (const key of Object.keys(material) as (keyof THREE.Material)[]) {
        const value = material[key];
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });

  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
  root.clear();
}
