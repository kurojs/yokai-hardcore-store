/**
 * The three.js half of the island, tested without WebGL.
 *
 * InstancedMesh, DataTexture, BoxGeometry and material disposal are all plain objects; only
 * rendering needs a GPU. So the things that most often leak — instance counts and double
 * disposal — are verifiable in jsdom.
 */

import * as THREE from 'three';

import { createIslandScene } from './island-scene';
import { createIsland, type VoxelIsland } from './voxels';

function instancedMeshes(root: THREE.Object3D): THREE.InstancedMesh[] {
  const found: THREE.InstancedMesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) found.push(object);
  });
  return found;
}

/** The lantern posts the renderer intentionally omits: the lantern plus the wood under it. */
function lanternPostCount(island: VoxelIsland): number {
  const lanterns = new Set(
    island.blocks
      .filter((block) => block.kind === 'lantern')
      .map((block) => `${block.x},${block.y},${block.z}`),
  );
  return island.blocks.filter(
    (block) =>
      block.kind === 'lantern' ||
      (block.kind === 'wood' && lanterns.has(`${block.x},${block.y + 1},${block.z}`)),
  ).length;
}

describe('createIslandScene', () => {
  const island = createIsland(7);

  it('instances every drawable block exactly once', () => {
    const built = createIslandScene(island);
    const meshes = instancedMeshes(built.root);
    const expected = island.blocks.length - lanternPostCount(island);

    expect(meshes.length).toBeGreaterThan(0);
    expect(meshes.reduce((total, mesh) => total + mesh.count, 0)).toBe(expected);
    // One instanced mesh per populated kind, never one per block.
    expect(meshes.length).toBeLessThanOrEqual(Object.keys(island.counts).length);

    built.dispose();
  });

  it('omits the lantern posts instead of leaving a light floating in the page', () => {
    const built = createIslandScene(island);
    const positions: string[] = [];
    for (const mesh of instancedMeshes(built.root)) {
      const matrix = new THREE.Matrix4();
      for (let index = 0; index < mesh.count; index += 1) {
        mesh.getMatrixAt(index, matrix);
        const position = new THREE.Vector3().setFromMatrixPosition(matrix);
        positions.push(`${position.x},${position.y},${position.z}`);
      }
    }

    expect(lanternPostCount(island)).toBeGreaterThan(0);
    for (const block of island.blocks) {
      if (block.kind === 'lantern') {
        expect(positions).not.toContain(`${block.x},${block.y},${block.z}`);
      }
    }
    // No material is built for a kind that is not drawn, so the lantern texture never leaks.
    const kinds = new Set(
      instancedMeshes(built.root).map((mesh) => mesh.name.replace('landing-', '')),
    );
    expect(kinds.has('lantern')).toBe(false);

    built.dispose();
  });

  it('does not render the detached rim blocks', () => {
    const built = createIslandScene(island);

    expect(built.root.getObjectByName('landing-floating')).toBeUndefined();
    expect(island.floating.length).toBeGreaterThan(0);
    const meshCount = instancedMeshes(built.root).length;
    let children = 0;
    built.root.traverse((object) => {
      if (object instanceof THREE.Mesh) children += 1;
    });
    expect(children).toBe(meshCount);

    built.dispose();
  });

  it('keeps the terrain still across update calls', () => {
    const built = createIslandScene(island);
    const mesh = instancedMeshes(built.root)[0];
    const before = mesh?.instanceMatrix.array.slice() ?? [];

    built.update(1);
    built.update(1);

    expect(mesh?.instanceMatrix.array).toEqual(before);

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
