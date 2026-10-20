/**
 * Voxel description -> three.js meshes.
 *
 * The terrain is one `InstancedMesh` per block kind: ~400 visible blocks become six or seven
 * draw primitives, and every instance shares one 1x1x1 box geometry and one material. The
 * handful of floating blocks stay individual meshes because they bob and spin independently;
 * instancing them would mean rewriting their matrices every frame for no gain.
 *
 * Per-instance tint is a grey multiplier derived from the seed and the block coordinate, which
 * gives a large surface some tonal variation without adding a texture per block.
 */

import * as THREE from 'three';

import { BLOCK_KINDS, type BlockKind } from './palette';
import { createBlockMaterial } from './textures';
import { blockTint, type VoxelBlock, type VoxelIsland } from './voxels';

/** What the renderer drives, and the one method it must call on destroy. */
export interface IslandScene {
  readonly root: THREE.Group;
  /** Bobs and turns the detached blocks. Called only while the scene is animating. */
  update(elapsed: number): void;
  /** Releases every geometry, material, texture and instance buffer exactly once. */
  dispose(): void;
}

interface FloatingBlock {
  readonly mesh: THREE.Mesh;
  readonly baseY: number;
  readonly phase: number;
  readonly spin: number;
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

  const populatedKinds = new Set<BlockKind>();
  for (const block of island.blocks) populatedKinds.add(block.kind);
  for (const block of island.floating) populatedKinds.add(block.kind);

  const materials = new Map<BlockKind, THREE.MeshStandardMaterial>();
  for (const kind of BLOCK_KINDS) {
    if (populatedKinds.has(kind)) materials.set(kind, createBlockMaterial(kind));
  }

  const grounded = new Map<BlockKind, VoxelBlock[]>();
  for (const block of island.blocks) {
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

  const floatingGroup = new THREE.Group();
  floatingGroup.name = 'landing-floating';
  const floating: FloatingBlock[] = [];
  island.floating.forEach((block, index) => {
    const material = materials.get(block.kind);
    if (material === undefined) return;
    const mesh = new THREE.Mesh(box, material);
    mesh.name = `landing-floating-${index}`;
    mesh.position.set(block.x, block.y, block.z);
    const variation = blockTint(island.seed, block);
    mesh.scale.setScalar(0.82 + variation * 0.22);
    floatingGroup.add(mesh);
    floating.push({
      mesh,
      baseY: block.y,
      phase: index * 1.7 + variation * 2,
      spin: 0.12 + (1 - variation) * 0.3,
    });
  });
  root.add(floatingGroup);

  let disposed = false;
  return {
    root,
    update(elapsed: number): void {
      if (disposed) return;
      for (const block of floating) {
        block.mesh.position.y = block.baseY + Math.sin(elapsed * 0.8 + block.phase) * 0.16;
        block.mesh.rotation.y = block.spin * elapsed;
      }
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      disposeObjectTree(root);
    },
  };
}
