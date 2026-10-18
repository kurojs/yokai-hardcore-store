/**
 * Scene-graph specs: hierarchy, transform conventions, naming and disposal.
 *
 * Naming is tested because it is load-bearing: three.js binds an animation track by node
 * name, so a name that is not bindable (or a root that shadows a bone) silently produces a
 * scene that never moves.
 */

import * as THREE from 'three';

import { parseBbModel } from './parse';
import {
  buildSceneGraph,
  disposeScene,
  measureBoundingBox,
  NODE_KIND_KEY,
  NODE_UUID_KEY,
  toBounds,
} from './scene';
import { bone, cube, model, TINY_PNG_DATA_URI } from './testing/fixtures';
import type { TextureLoaderLike } from './textures';

function recordingLoader(): TextureLoaderLike & { readonly urls: string[] } {
  const urls: string[] = [];
  return {
    urls,
    load: (url: string): THREE.Texture => {
      urls.push(url);
      return new THREE.Texture();
    },
  };
}

function build(raw: unknown, loader: TextureLoaderLike = recordingLoader()) {
  return buildSceneGraph(parseBbModel(raw), { loadTexture: loader });
}

describe('buildSceneGraph', () => {
  it('builds the bone hierarchy in outliner pre-order with parent-relative positions', () => {
    const graph = build(
      model({
        elements: [cube({ uuid: 'cube-a', name: 'torso' }), cube({ uuid: 'cube-b', name: 'hand' })],
        outliner: [
          bone({
            name: 'root-bone',
            uuid: 'bone-1',
            origin: [10, 0, 0],
            children: [
              'cube-a',
              bone({
                uuid: 'bone-2',
                name: 'child',
                origin: [10, 4, 0],
                rotation: [0, 0, 90],
                children: ['cube-b'],
              }),
            ],
          }),
        ],
      }),
    );

    const rootBone = graph.root.children[0];
    expect(rootBone.name).toBe('root-bone');
    // A top-level bone keeps its absolute model-space origin.
    expect(rootBone.position.toArray()).toEqual([10, 0, 0]);

    const child = rootBone.children.find((node) => node.name === 'child');
    expect(child).toBeDefined();
    // Nested: origin - parent origin = [10, 4, 0] - [10, 0, 0]
    expect(child?.position.toArray()).toEqual([0, 4, 0]);
    expect(child?.rotation.order).toBe('ZYX');
    expect(child?.rotation.z).toBeCloseTo(Math.PI / 2, 10);

    const cubeB = child?.children.find((node) => node.name === 'hand');
    expect(cubeB?.position.toArray()).toEqual([-10, -4, 0]);
  });

  it('maps every bone and cube uuid to its node', () => {
    const graph = build(
      model({
        elements: [cube({ uuid: 'cube-a' })],
        outliner: [bone({ uuid: 'bone-1', name: 'root-bone', children: ['cube-a'] })],
      }),
    );

    const boneNode = graph.modelMap.get('bone-1');
    const cubeNode = graph.modelMap.get('cube-a');

    expect(boneNode?.userData[NODE_UUID_KEY]).toBe('bone-1');
    expect(boneNode?.userData[NODE_KIND_KEY]).toBe('bone');
    expect(cubeNode?.userData[NODE_UUID_KEY]).toBe('cube-a');
    expect(cubeNode?.userData[NODE_KIND_KEY]).toBe('cube');
    expect(cubeNode?.parent).toBe(boneNode);
  });

  it('renames the root when the model name collides with a bone name', () => {
    // Regression: `PropertyBinding.findNode` matches the root first, so a root named like
    // the file's root bone would capture that bone's tracks and freeze the model.
    const graph = build(
      model({
        name: 'tlaloc',
        outliner: [bone({ uuid: 'bone-1', name: 'tlaloc', children: ['cube-1'] })],
      }),
    );

    expect(graph.root.children[0].name).toBe('tlaloc');
    expect(graph.root.name).toBe('tlaloc_2');
  });

  it('sanitises names so a track can bind, and de-duplicates them', () => {
    const graph = build(
      model({
        elements: [cube({ uuid: 'cube-a', name: 'hand.1' }), cube({ uuid: 'cube-b' })],
        outliner: [
          bone({
            name: 'hand.1',
            uuid: 'bone-1',
            children: ['cube-a', bone({ uuid: 'bone-2', name: 'hand.1', children: ['cube-b'] })],
          }),
        ],
      }),
    );

    const names: string[] = [];
    graph.root.traverse((node) => names.push(node.name));
    expect(names).toContain('hand_1');
    expect(names).toContain('hand_1_2');
    expect(names).toContain('hand_1_3');
    expect(names.some((name) => /[^A-Za-z0-9_-]/.test(name))).toBe(false);
  });

  it('hangs the emissive layer on the base material and not on its own', () => {
    const loader = recordingLoader();
    const graph = build(
      model({
        textures: [
          { name: 'atlas.png', source: TINY_PNG_DATA_URI },
          { name: 'atlas_e.png', source: TINY_PNG_DATA_URI },
        ],
      }),
      loader,
    );

    expect(loader.urls).toHaveLength(2);
    expect(graph.textures.map((texture) => texture.name)).toEqual(['atlas.png', 'atlas_e.png']);
    expect(graph.emissiveTextureIndex).toBe(1);

    const [base, emissive] = graph.materials;
    expect(base.name).toBe('bbmodel-base-emissive');
    expect(base.map?.name).toBe('atlas.png');
    expect(base.emissiveMap?.name).toBe('atlas_e.png');
    expect(base.emissive.getHexString()).toBe('ffffff');

    expect(emissive.name).toBe('bbmodel-base');
    expect(emissive.map?.name).toBe('atlas_e.png');
    expect(emissive.emissiveMap).toBeNull();
    expect(emissive.emissive.getHexString()).toBe('000000');
  });

  it('falls back to an untextured material when a face points past the texture list', () => {
    const graph = build(model({ textures: [] }));

    expect(graph.emissiveTextureIndex).toBeNull();
    const mesh = graph.meshes[0];
    const material = mesh.material as THREE.MeshStandardMaterial;
    expect(material.map).toBeNull();
    expect(graph.materials).toHaveLength(1);
  });

  it('shares one material across all cubes using the same texture', () => {
    const graph = build(
      model({
        elements: [cube({ uuid: 'cube-a' }), cube({ uuid: 'cube-b' })],
        outliner: [
          bone({
            uuid: 'bone-1',
            children: ['cube-a', 'cube-b'],
          }),
        ],
      }),
    );

    expect(graph.meshes).toHaveLength(2);
    expect(graph.meshes[0].material).toBe(graph.meshes[1].material);
  });

  it('measures the bounding box of the visible geometry', () => {
    const graph = build(model());

    expect(toBounds(measureBoundingBox(graph.root))).toEqual({
      min: [0, 0, 0],
      max: [16, 16, 16],
    });
  });

  it('rejects a cube owned by a bone that does not exist', () => {
    const parsed = parseBbModel(model());
    const broken = {
      ...parsed,
      cubes: parsed.cubes.map((item) => ({ ...item, boneUuid: 'missing-bone' })),
    };

    expect(() => buildSceneGraph(broken, { loadTexture: recordingLoader() })).toThrow(
      /cube "cube-1" is owned by bone missing-bone, which is not a rendered bone/,
    );
  });
});

describe('disposeScene', () => {
  it('disposes each shared geometry, material and texture exactly once, then clears', () => {
    const graph = build(
      model({
        elements: [cube({ uuid: 'cube-a' }), cube({ uuid: 'cube-b' })],
        outliner: [bone({ uuid: 'bone-1', children: ['cube-a', 'cube-b'] })],
      }),
    );

    const geometries = graph.meshes.map((mesh) => vi.spyOn(mesh.geometry, 'dispose'));
    const material = graph.meshes[0].material as THREE.MeshStandardMaterial;
    const materialDispose = vi.spyOn(material, 'dispose');

    disposeScene(graph.root);

    expect(graph.root.children).toHaveLength(0);
    for (const spy of geometries) expect(spy).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
  });

  it('disposes every texture reachable from a material', () => {
    const graph = build(
      model({
        textures: [
          { name: 'atlas.png', source: TINY_PNG_DATA_URI },
          { name: 'atlas_e.png', source: TINY_PNG_DATA_URI },
        ],
      }),
    );

    const spies = graph.textures.map((texture) => vi.spyOn(texture, 'dispose'));
    disposeScene(graph.root);

    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
  });
});
