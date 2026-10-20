/**
 * Voxel description -> three.js meshes.
 *
 * The terrain is one `InstancedMesh` per block kind: ~400 visible blocks become six or seven
 * draw primitives, and every instance shares one 1x1x1 box geometry and one material.
 *
 * Per-instance tint is a grey multiplier derived from the seed and the block coordinate, which
 * gives a large surface some tonal variation without adding a texture per block.
 *
 * Two decorations in the voxel description are deliberately not rendered. The lantern posts
 * (a lantern plus the wood block under it) were a warm point of light in the old framed panel;
 * over a full-bleed background their glow reads as a lamp floating in the page. The detached
 * rim blocks bobbed and spun independently and made the still hero restless. Both are filtered
 * here rather than deleted from `voxels.ts`, so the generator keeps its layout tests and the
 * rendering decision stays in the rendering module.
 */

import * as THREE from 'three';

import { BLOCK_KINDS, type BlockKind } from './palette';
import { createBlockMaterial } from './textures';
import { blockTint, type VoxelBlock, type VoxelIsland } from './voxels';

/** What the renderer drives, and the one method it must call on destroy. */
export interface IslandScene {
  readonly root: THREE.Group;
  /** Kept so the renderer's frame loop has one stable call shape; the island is static. */
  update(elapsed: number): void;
  /** Releases every geometry, material, texture and instance buffer exactly once. */
  dispose(): void;
}

function positionKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * The blocks that are actually drawn.
 *
 * A lantern and the wood block directly beneath it are one post, so both disappear together.
 * A wood block left standing alone would read as a fence post with nothing on it.
 */
function renderedBlocks(island: VoxelIsland): readonly VoxelBlock[] {
  const lanterns = new Set<string>();
  for (const block of island.blocks) {
    if (block.kind === 'lantern') lanterns.add(positionKey(block.x, block.y, block.z));
  }
  return island.blocks.filter((block) => {
    if (block.kind === 'lantern') return false;
    if (block.kind === 'wood' && lanterns.has(positionKey(block.x, block.y + 1, block.z))) {
      return false;
    }
    return true;
  });
}

/**
 * Releases every GPU-backed resource reachable from `root`, de-duplicated.
 *
 * Materials and the shared box geometry are referenced from several meshes, so a naive
 * per-mesh dispose would free the same object repeatedly. Textures are reachable only through
 * material properties, which is why they are collected by inspecting the material's own keys
 * rather than by knowing the `map`/`emissiveMap` field names.
 */
export function disposeObjectTree(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const instanced = new Set<THREE.InstancedMesh>();

  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) instanced.add(object);
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

  for (const mesh of instanced) mesh.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
  root.clear();
}

/** Builds the island hierarchy. The caller owns the result and must dispose it. */
export function createIslandScene(island: VoxelIsland): IslandScene {
  const root = new THREE.Group();
  root.name = 'landing-island';

  // One geometry for every block: the box is the unit of the world, so a cube per instance is
  // both the cheapest and the most honest representation.
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.name = 'landing-block';

  const blocks = renderedBlocks(island);

  const populatedKinds = new Set<BlockKind>();
  for (const block of blocks) populatedKinds.add(block.kind);

  const materials = new Map<BlockKind, THREE.MeshStandardMaterial>();
  for (const kind of BLOCK_KINDS) {
    if (populatedKinds.has(kind)) materials.set(kind, createBlockMaterial(kind));
  }

  const grounded = new Map<BlockKind, VoxelBlock[]>();
  for (const block of blocks) {
    const group = grounded.get(block.kind);
    if (group === undefined) grounded.set(block.kind, [block]);
    else group.push(block);
  }

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (const [kind, blocks] of grounded) {
    const material = materials.get(kind);
    if (material === undefined) continue;
    const mesh = new THREE.InstancedMesh(box, material, blocks.length);
    mesh.name = `landing-${kind}`;
    blocks.forEach((block, index) => {
      dummy.position.set(block.x, block.y, block.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, tint.setScalar(blockTint(island.seed, block)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
  }

  let disposed = false;
  return {
    root,
    update(): void {
      // The island is a still diorama; the camera supplies all of the motion.
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      disposeObjectTree(root);
    },
  };
}
