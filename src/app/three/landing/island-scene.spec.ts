/**
 * The three.js half of the island, tested without WebGL.
 *
 * InstancedMesh, DataTexture, BoxGeometry and material disposal are all plain objects; only
 * rendering needs a GPU. So the things that most often leak — instance counts and double
 * disposal — are verifiable in jsdom.
 */

import * as THREE from 'three';

import { createIslandScene } from './island-scene';
import { createIsland } from './voxels';

function instancedMeshes(root: THREE.Object3D): THREE.InstancedMesh[] {
  const found: THREE.InstancedMesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) found.push(object);
  });
  return found;
}

describe('createIslandScene', () => {
  const island = createIsland(7);

  it('instances every grounded block exactly once', () => {
    const built = createIslandScene(island);
    const meshes = instancedMeshes(built.root);

    expect(meshes.length).toBeGreaterThan(0);
    expect(meshes.reduce((total, mesh) => total + mesh.count, 0)).toBe(island.blocks.length);
    // One instanced mesh per populated kind, never one per block.
    expect(meshes.length).toBeLessThanOrEqual(Object.keys(island.counts).length);

    built.dispose();
  });

  it('keeps floating blocks as independent meshes', () => {
    const built = createIslandScene(island);
    const floating = built.root.getObjectByName('landing-floating');

    expect(floating?.children).toHaveLength(island.floating.length);

    built.dispose();
  });

  it('moves the floating blocks and leaves the terrain alone', () => {
    const built = createIslandScene(island);
    const floating = built.root.getObjectByName('landing-floating');
    const first = floating?.children[0];
    const terrain = instancedMeshes(built.root)[0];
    const before = first?.position.y ?? 0;
    const instanceBefore = terrain?.instanceMatrix.array[13] ?? 0;

    built.update(1);
    built.update(1);

    expect(first?.position.y).not.toBe(before);
    expect(first?.rotation.y).not.toBe(0);
    expect(terrain?.instanceMatrix.array[13]).toBe(instanceBefore);

    built.dispose();
  });

  it('disposes every shared resource exactly once, even when dispose repeats', () => {
    const built = createIslandScene(island);
    const mesh = instancedMeshes(built.root)[0];
    expect(mesh).toBeDefined();
    if (mesh === undefined) return;

    const material = mesh.material as THREE.MeshStandardMaterial;
    const texture = material.map;
    expect(texture).not.toBeNull();
    if (texture === null) return;

    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');
    const instanceDispose = vi.spyOn(mesh, 'dispose');

    built.dispose();
    built.dispose();

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(instanceDispose).toHaveBeenCalledTimes(1);
    expect(built.root.children).toHaveLength(0);
  });
});
