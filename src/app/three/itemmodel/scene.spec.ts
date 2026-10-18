/**
 * Specs for the item scene builder.
 *
 * Two rules get most of the attention here, because both are easy to get wrong in a viewer:
 * an unavailable texture is a *reported state* that never throws, and the `display` transform
 * belongs to the whole model rather than to its elements.
 */

import * as THREE from 'three';

import { axisAngleToQuaternion, multiplyQuaternions } from './geometry';
import { parseItemModel } from './parse';
import { buildItemScene, MISSING_TEXTURE_COLOR, type ItemScene } from './scene';
import type { ItemTextureResolver } from './scene';
import { itemDisplay, itemElement, itemFace, itemModel, spriteModel, stubLoader } from './testing/fixtures';

const PROBE_PATH = 'item/custom/tlaloc/tlaloc_probe';

/** A resolver over a fixed table; anything missing resolves to "not available". */
function resolver(table: Record<string, { url: string | null; emissiveUrl?: string | null }>): ItemTextureResolver {
  return (path) => table[path] ?? { url: null };
}

/** Every mesh under the scene root, in traversal order. */
function meshesOf(scene: ItemScene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.root.traverse((node) => {
    if (node instanceof THREE.Mesh) meshes.push(node);
  });
  return meshes;
}

/** Single-material meshes in this suite are the common case; this names the cast once. */
function materialOf(mesh: THREE.Mesh): THREE.MeshStandardMaterial {
  if (Array.isArray(mesh.material)) throw new Error('expected a single material on this mesh');
  return mesh.material as THREE.MeshStandardMaterial;
}

describe('buildItemScene', () => {
  it('builds one mesh per element and counts what it drew', () => {
    const scene = buildItemScene(parseItemModel(itemModel()), {
      resolveTexture: resolver({ [PROBE_PATH]: { url: '/a/tlaloc_probe.png' } }),
      loadTexture: stubLoader(),
    });

    expect(scene.stats.kind).toBe('geometry');
    expect(scene.stats.elements).toBe(1);
    expect(scene.stats.faces).toBe(6);
    expect(scene.stats.meshes).toBe(1);
    expect(scene.stats.triangles).toBe(12);
    expect(meshesOf(scene)).toHaveLength(1);

    const geometry = meshesOf(scene)[0].geometry;
    expect(geometry.getAttribute('position').count).toBe(24);
    expect(geometry.getAttribute('uv').count).toBe(24);
    expect(geometry.getIndex()?.count).toBe(36);
    expect(scene.root.userData['itemmodelKind']).toBe('geometry');
  });

  it('keeps a multi-element model as one mesh each, all of them children of the root', () => {
    const scene = buildItemScene(
      parseItemModel(
        itemModel({
          elements: [
            itemElement({ from: [0, 0, 0], to: [4, 4, 4] }),
            itemElement({ from: [4, 4, 4], to: [8, 8, 8] }),
            itemElement({ from: [8, 8, 8], to: [12, 12, 12] }),
          ],
        }),
      ),
      { resolveTexture: resolver({ [PROBE_PATH]: { url: '/a/x.png' } }), loadTexture: stubLoader() },
    );

    expect(scene.stats.elements).toBe(3);
    expect(scene.stats.faces).toBe(18);
    expect(scene.stats.meshes).toBe(3);
    expect(scene.root.children).toHaveLength(3);
    expect(scene.root.children.map((child) => child.userData['itemmodelElement'])).toEqual([0, 1, 2]);
  });

  it('places each mesh at its rotation pivot and turns it there', () => {
    const scene = buildItemScene(
      parseItemModel(
        itemModel({
          elements: [
            itemElement({ rotation: { angle: 22.5, axis: 'x', origin: [7, 3.9, 4.95866] } }),
          ],
        }),
      ),
      { resolveTexture: resolver({ [PROBE_PATH]: { url: '/a/x.png' } }), loadTexture: stubLoader() },
    );

    const mesh = meshesOf(scene)[0];
    expect([mesh.position.x, mesh.position.y, mesh.position.z]).toEqual([7, 3.9, 4.95866]);

    const expected = axisAngleToQuaternion({ angle: 22.5, axis: 'x', origin: [7, 3.9, 4.95866] });
    expect(mesh.quaternion.x).toBeCloseTo(expected[0], 12);
    expect(mesh.quaternion.y).toBeCloseTo(expected[1], 12);
    expect(mesh.quaternion.z).toBeCloseTo(expected[2], 12);
    expect(mesh.quaternion.w).toBeCloseTo(expected[3], 12);
  });

  it('leaves an unrotated element at the model origin with the identity rotation', () => {
    const scene = buildItemScene(parseItemModel(itemModel()), {
      resolveTexture: resolver({ [PROBE_PATH]: { url: '/a/x.png' } }),
      loadTexture: stubLoader(),
    });
    const mesh = meshesOf(scene)[0];

    expect([mesh.position.x, mesh.position.y, mesh.position.z]).toEqual([0, 0, 0]);
    expect(mesh.quaternion.w).toBe(1);
  });

  describe('textures', () => {
    it('loads each distinct path once and binds it as the material map', () => {
      const loader = stubLoader();
      const resolveTexture = vi.fn(resolver({ [PROBE_PATH]: { url: '/a/tlaloc_probe.png' } }));
      const scene = buildItemScene(parseItemModel(itemModel()), {
        resolveTexture,
        loadTexture: loader,
      });

      // Six faces, one path: one resolution and one load.
      expect(resolveTexture).toHaveBeenCalledTimes(1);
      expect(loader.urls).toEqual(['/a/tlaloc_probe.png']);

      const material = materialOf(meshesOf(scene)[0]);
      expect(material.map?.name).toBe(PROBE_PATH);
      expect(material.map?.flipY).toBe(true);
      expect(material.emissiveMap).toBeNull();
      expect(material.emissive.getHexString()).toBe('000000');
      expect(scene.stats.textures).toEqual([
        {
          key: '0',
          path: PROBE_PATH,
          url: '/a/tlaloc_probe.png',
          status: 'loaded',
          emissive: false,
        },
      ]);
    });

    it('binds an emissive companion as a second layer and lights it', () => {
      const loader = stubLoader();
      const scene = buildItemScene(parseItemModel(itemModel()), {
        resolveTexture: resolver({
          [PROBE_PATH]: { url: '/a/tlaloc_probe.png', emissiveUrl: '/a/tlaloc_probe_e.png' },
        }),
        loadTexture: loader,
      });

      expect(loader.urls).toEqual(['/a/tlaloc_probe.png', '/a/tlaloc_probe_e.png']);

      const material = materialOf(meshesOf(scene)[0]);
      expect(material.name).toBe('itemmodel-base-emissive');
      expect(material.map?.name).toBe(PROBE_PATH);
      expect(material.emissiveMap?.name).toBe(PROBE_PATH);
      expect(material.emissiveMap?.userData['emissive']).toBe(true);
      // A black emissive would cancel the map out, so this is load-bearing.
      expect(material.emissive.getHexString()).toBe('ffffff');
      expect(scene.stats.textures[0].emissive).toBe(true);
    });

    it('renders a flat marker for an unavailable texture instead of throwing', () => {
      const loader = stubLoader();
      const scene = buildItemScene(parseItemModel(itemModel()), { loadTexture: loader });

      expect(loader.urls).toEqual([]);
      const material = materialOf(meshesOf(scene)[0]);
      expect(material.name).toBe('itemmodel-missing-texture');
      expect(material.color.getHex()).toBe(MISSING_TEXTURE_COLOR);
      expect(material.color.getHexString()).toBe('c026d3');
      expect(material.map).toBeNull();
      expect(scene.stats.textures[0].status).toBe('unavailable');
      expect(scene.stats.textures[0].url).toBeNull();
      expect(scene.stats.warnings).toEqual([
        `texture "${PROBE_PATH}" is not available next to this model; its faces render with a placeholder material`,
      ]);
    });

    it('treats "no resolver at all" as "nothing is available" rather than a 404 storm', () => {
      const scene = buildItemScene(parseItemModel(itemModel()));

      expect(scene.stats.textures[0].status).toBe('unavailable');
      expect(scene.stats.warnings).toHaveLength(1);
      expect(scene.stats.triangles).toBe(12);
    });

    it('keeps a model whose textures are mixed: two materials, two groups', () => {
      const scene = buildItemScene(
        parseItemModel(
          itemModel({
            textures: { 0: 'item/custom/tlaloc/tlaloc_hat', 1: 'item/custom/tlaloc/tlaloc_staff' },
            elements: [
              itemElement({
                faces: { up: itemFace({ texture: '#0' }), down: itemFace({ texture: '#1' }) },
              }),
            ],
          }),
        ),
        {
          resolveTexture: resolver({
            'item/custom/tlaloc/tlaloc_hat': { url: '/a/tlaloc_hat.png' },
            'item/custom/tlaloc/tlaloc_staff': { url: null },
          }),
          loadTexture: stubLoader(),
        },
      );

      const mesh = meshesOf(scene)[0];
      if (!Array.isArray(mesh.material)) throw new Error('expected a multi-material mesh');
      expect(mesh.material).toHaveLength(2);
      expect((mesh.material[0] as THREE.MeshStandardMaterial).map?.name).toBe(
        'item/custom/tlaloc/tlaloc_hat',
      );
      expect((mesh.material[1] as THREE.MeshStandardMaterial).name).toBe(
        'itemmodel-missing-texture',
      );
      expect(mesh.geometry.groups).toHaveLength(2);

      expect(scene.stats.textures.map((texture) => [texture.path, texture.status])).toEqual([
        ['item/custom/tlaloc/tlaloc_hat', 'loaded'],
        ['item/custom/tlaloc/tlaloc_staff', 'unavailable'],
      ]);
    });
  });

  describe('parent-driven sprites', () => {
    it('builds a quad for a model that only delegates to a parent', () => {
      const scene = buildItemScene(parseItemModel(spriteModel()), {
        resolveTexture: resolver({}),
        loadTexture: stubLoader(),
      });

      expect(scene.stats.kind).toBe('sprite');
      expect(scene.stats.elements).toBe(1);
      expect(scene.stats.faces).toBe(2);
      expect(scene.stats.meshes).toBe(1);
      expect(scene.stats.triangles).toBe(4);
      expect(scene.stats.modelBounds.min).toEqual([0, 0, 7.5]);
      expect(scene.stats.modelBounds.max).toEqual([16, 16, 8.5]);
      expect(scene.root.userData['itemmodelKind']).toBe('sprite');
    });

    it('degrades non-fatally when the delegated texture is not in this repository', () => {
      // `minecraft:item/netherite_sword` is a jar asset, so the resolved URL is a sibling
      // path that does not exist. The sprite still renders, as a marker, and says so.
      const scene = buildItemScene(parseItemModel(spriteModel()), {
        resolveTexture: resolver({}),
        loadTexture: stubLoader(),
      });

      expect(scene.stats.triangles).toBe(4);
      const material = materialOf(meshesOf(scene)[0]);
      expect(material.color.getHex()).toBe(MISSING_TEXTURE_COLOR);
      expect(scene.stats.textures[0].path).toBe('minecraft:item/netherite_sword');
      expect(scene.stats.textures[0].key).toBe('layer0');
      expect(scene.stats.textures[0].status).toBe('unavailable');
    });

    it('textures the quad when the sprite texture does resolve', () => {
      const loader = stubLoader();
      const scene = buildItemScene(
        parseItemModel(spriteModel({ textures: { layer0: PROBE_PATH } })),
        { resolveTexture: resolver({ [PROBE_PATH]: { url: '/a/tlaloc_probe.png' } }), loadTexture: loader },
      );

      expect(loader.urls).toEqual(['/a/tlaloc_probe.png']);
      expect(materialOf(meshesOf(scene)[0]).map?.name).toBe(PROBE_PATH);
    });
  });

  describe('display contexts', () => {
    const withDisplay = (): ItemScene =>
      buildItemScene(
        parseItemModel(
          itemModel({
            display: {
              gui: itemDisplay({ rotation: [90, 45, 0], translation: [0.5, 4.75, 0.25], scale: [0.65, 0.65, 0.65] }),
              thirdperson_righthand: itemDisplay({ rotation: [0, 0, 45] }),
              head: itemDisplay({ rotation: [0, 180, 0] }),
            },
          }),
        ),
        { resolveTexture: resolver({ [PROBE_PATH]: { url: '/a/x.png' } }), loadTexture: stubLoader() },
      );

    it('reports the contexts the file declares, in file order', () => {
      const scene = withDisplay();
      expect(scene.stats.displayContexts).toEqual(['gui', 'thirdperson_righthand', 'head']);
      expect(scene.displayContext).toBeNull();
      expect(scene.root.scale.x).toBe(1);
    });

    it('applies a context as translate x rotate x scale', () => {
      const scene = withDisplay();
      scene.setDisplayContext('gui');

      expect(scene.displayContext).toBe('gui');
      expect([scene.root.position.x, scene.root.position.y, scene.root.position.z]).toEqual([
        0.5, 4.75, 0.25,
      ]);
      expect([scene.root.scale.x, scene.root.scale.y, scene.root.scale.z]).toEqual([0.65, 0.65, 0.65]);

      // The format's `display.rotation` is an XYZ Euler, i.e. the matrix product Rx * Ry * Rz.
      // Composed here from the geometry layer's own quaternion helpers, so a change to `ZYX`
      // in the scene fails this test instead of silently rotating every preview.
      const expected = multiplyQuaternions(
        axisAngleToQuaternion({ angle: 90, axis: 'x', origin: [0, 0, 0] }),
        axisAngleToQuaternion({ angle: 45, axis: 'y', origin: [0, 0, 0] }),
      );
      expect(scene.root.quaternion.x).toBeCloseTo(expected[0], 12);
      expect(scene.root.quaternion.y).toBeCloseTo(expected[1], 12);
      expect(scene.root.quaternion.z).toBeCloseTo(expected[2], 12);
      expect(scene.root.quaternion.w).toBeCloseTo(expected[3], 12);
    });

    it('can switch between contexts and back to the identity', () => {
      const scene = withDisplay();

      scene.setDisplayContext('thirdperson_righthand');
      const third = scene.root.quaternion.clone();
      expect(scene.root.position.x).toBe(0);
      expect(scene.root.scale.x).toBe(1);

      scene.setDisplayContext('gui');
      expect(scene.root.quaternion.equals(third)).toBe(false);

      scene.setDisplayContext(null);
      expect(scene.root.quaternion.equals(new THREE.Quaternion())).toBe(true);
      expect(scene.root.position.x).toBe(0);
      expect(scene.root.scale.x).toBe(1);
    });

    it('falls back to the identity for a context the file does not declare', () => {
      const scene = withDisplay();
      scene.setDisplayContext('gui');

      scene.setDisplayContext('ground');

      expect(scene.displayContext).toBe('ground');
      expect(scene.root.quaternion.equals(new THREE.Quaternion())).toBe(true);
      expect(scene.root.position.x).toBe(0);
      expect(scene.root.scale.x).toBe(1);
    });

    it('measures the posed model, not only the raw geometry', () => {
      const scene = buildItemScene(
        parseItemModel(
          itemModel({
            display: {
              gui: itemDisplay({ rotation: [0, 0, 0], translation: [1, 2, 3], scale: [2, 2, 2] }),
            },
          }),
        ),
        { resolveTexture: resolver({ [PROBE_PATH]: { url: '/a/x.png' } }), loadTexture: stubLoader() },
      );

      const unposed = scene.measureBounds();
      expect(unposed.min).toEqual([0, 0, 0]);
      expect(unposed.max).toEqual([16, 16, 16]);

      // Scale first, then translate: M = T * R * S over a 16-unit box at the origin.
      scene.setDisplayContext('gui');
      const posed = scene.measureBounds();
      expect(posed.min[0]).toBeCloseTo(1, 6);
      expect(posed.min[1]).toBeCloseTo(2, 6);
      expect(posed.min[2]).toBeCloseTo(3, 6);
      expect(posed.max[0]).toBeCloseTo(33, 6);
      expect(posed.max[1]).toBeCloseTo(34, 6);
      expect(posed.max[2]).toBeCloseTo(35, 6);

      // The reported model bounds are the geometry's, never the posed result's.
      expect(scene.stats.modelBounds).toEqual({ min: [0, 0, 0], max: [16, 16, 16] });
    });
  });

  describe('bounds', () => {
    it('reports the model bounds before any display transform', () => {
      const scene = buildItemScene(
        parseItemModel(
          itemModel({
            elements: [
              itemElement({ from: [0, 0, 0], to: [4, 4, 4], rotation: undefined }),
              itemElement({ from: [-4, 2, 0], to: [0, 8, 1], rotation: undefined }),
            ],
          }),
        ),
        { resolveTexture: resolver({ [PROBE_PATH]: { url: '/a/x.png' } }), loadTexture: stubLoader() },
      );

      expect(scene.stats.modelBounds).toEqual({ min: [-4, 0, 0], max: [4, 8, 4] });
    });

    it('survives an empty element list without producing NaN bounds', () => {
      const scene = buildItemScene(parseItemModel(spriteModel({ textures: {} })), {
        loadTexture: stubLoader(),
      });
      const bounds = scene.measureBounds();

      expect(bounds.min.every((value) => Number.isFinite(value))).toBe(true);
      expect(bounds.max.every((value) => Number.isFinite(value))).toBe(true);
    });
  });

  describe('dispose', () => {
    it('releases each geometry, material and texture exactly once', () => {
      const scene = buildItemScene(parseItemModel(itemModel()), {
        resolveTexture: resolver({
          [PROBE_PATH]: { url: '/a/tlaloc_probe.png', emissiveUrl: '/a/tlaloc_probe_e.png' },
        }),
        loadTexture: stubLoader(),
      });

      const mesh = meshesOf(scene)[0];
      const material = materialOf(mesh);
      const geometrySpy = vi.spyOn(mesh.geometry, 'dispose');
      const materialSpy = vi.spyOn(material, 'dispose');
      const textureSpy = vi.spyOn(material.map as THREE.Texture, 'dispose');
      const emissiveSpy = vi.spyOn(material.emissiveMap as THREE.Texture, 'dispose');

      scene.dispose();

      expect(geometrySpy).toHaveBeenCalledTimes(1);
      expect(materialSpy).toHaveBeenCalledTimes(1);
      expect(textureSpy).toHaveBeenCalledTimes(1);
      expect(emissiveSpy).toHaveBeenCalledTimes(1);
      expect(scene.root.children).toHaveLength(0);
    });

    it('releases the marker material once, and only when a mesh used it', () => {
      const unavailable = buildItemScene(parseItemModel(itemModel()), { loadTexture: stubLoader() });
      const marker = materialOf(meshesOf(unavailable)[0]);
      const markerSpy = vi.spyOn(marker, 'dispose');

      unavailable.dispose();
      expect(markerSpy).toHaveBeenCalledTimes(1);

      // And the other way round: an unused marker material is still released.
      const loaded = buildItemScene(parseItemModel(itemModel()), {
        resolveTexture: resolver({ [PROBE_PATH]: { url: '/a/x.png' } }),
        loadTexture: stubLoader(),
      });
      const loadedSpy = vi.spyOn(materialOf(meshesOf(loaded)[0]), 'dispose');
      loaded.dispose();
      expect(loadedSpy).toHaveBeenCalledTimes(1);
    });

    it('is safe to call twice', () => {
      const scene = buildItemScene(parseItemModel(itemModel()), { loadTexture: stubLoader() });
      const mesh = meshesOf(scene)[0];
      const geometrySpy = vi.spyOn(mesh.geometry, 'dispose');

      scene.dispose();
      scene.dispose();

      // The second call has nothing left to traverse, so nothing is released again.
      expect(geometrySpy).toHaveBeenCalledTimes(1);
    });
  });
});
