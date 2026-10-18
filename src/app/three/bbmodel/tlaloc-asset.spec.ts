/**
 * End-to-end specs against the real boss asset.
 *
 * The numbers here are measured facts about `public/models/bosses/tlaloc.bbmodel`, so this
 * file is also a staleness gate: if the asset is re-exported, these assertions fail and the
 * derived numbers in `../README.md` have to be revisited.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import { createBbModelScene, type BbModelScene } from './index';

interface RawBone {
  readonly name?: string;
  readonly children?: readonly (string | RawBone)[];
}

interface RawKeyframe {
  readonly channel?: string;
  readonly time?: number;
}

interface RawAnimator {
  readonly name?: string;
  readonly keyframes?: readonly RawKeyframe[];
}

interface RawAnimation {
  readonly name?: string;
  readonly animators?: Readonly<Record<string, RawAnimator>>;
}

interface RawDocument {
  readonly name?: string;
  readonly elements: readonly {
    readonly uuid: string;
    readonly from: readonly number[];
    readonly to: readonly number[];
  }[];
  readonly outliner: readonly (string | RawBone)[];
  readonly animations?: readonly RawAnimation[];
}

/**
 * Repository root from this spec's own location.
 *
 * Not `new URL('../../', import.meta.url)`: the Vite transform rewrites that literal form
 * into a served asset URL, which `fileURLToPath` rejects.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const ASSET_PATH = path.join(REPO_ROOT, 'public', 'models', 'bosses', 'tlaloc.bbmodel');
const RAW = JSON.parse(fs.readFileSync(ASSET_PATH, 'utf8')) as RawDocument;

/** True when a time sequence never decreases, which is what three.js requires. */
function isAscending(times: readonly number[]): boolean {
  for (let index = 1; index < times.length; index += 1) {
    if (!(times[index] >= times[index - 1])) return false;
  }
  return true;
}

const ROOT_BONE_UUID = '5965fba1-8086-c3d1-754f-33f34bb5d04d';

/** Builds the scene with a loader that never touches the DOM. */
function createScene(): BbModelScene {
  return createBbModelScene(RAW, {
    loadTexture: { load: () => new THREE.Texture() },
  });
}

/** Counts cubes under every bone whose name marks a collision volume, straight from JSON. */
function countHitboxCubes(document: RawDocument): number {
  const cubeUuids = new Set(document.elements.map((element) => element.uuid));

  const collectCubes = (children: readonly (string | RawBone)[]): number =>
    children.reduce((total, child) => {
      if (typeof child === 'string') return total + (cubeUuids.has(child) ? 1 : 0);
      return total + collectCubes(child.children ?? []);
    }, 0);

  const walk = (children: readonly (string | RawBone)[]): number =>
    children.reduce((total, child) => {
      if (typeof child === 'string') return total;
      const isHitbox = /hitbox/i.test(child.name ?? '');
      return total + (isHitbox ? collectCubes(child.children ?? []) : 0) + walk(child.children ?? []);
    }, 0);

  return walk(document.outliner);
}

describe('tlaloc.bbmodel', () => {
  let scene: BbModelScene;

  beforeEach(() => {
    scene = createScene();
  });

  afterEach(() => {
    scene.dispose();
  });

  it('reports the cube and bone arithmetic', () => {
    const { stats } = scene;

    expect(stats.cubesInSource).toBe(110);
    expect(stats.cubesRendered).toBe(106);
    expect(stats.cubesFilteredAsHitbox).toBe(4);
    expect(stats.cubesFilteredAsHidden).toBe(0);
    expect(stats.cubesInSource).toBe(
      stats.cubesRendered + stats.cubesFilteredAsHitbox + stats.cubesFilteredAsHidden,
    );
    expect(stats.bonesRendered).toBe(18);
    expect(stats.animationsInSource).toBe(10);
  });

  it('drops every collision bone and its cubes from the graph', () => {
    expect([...scene.stats.hitboxBoneNames].sort()).toEqual([
      'hitbox',
      'ob_tlalochitbox',
      'ob_tlalochitbox2',
      'ob_tlalochitbox3',
    ]);
    expect(scene.stats.cubesFilteredAsHitbox).toBe(countHitboxCubes(RAW));

    const leaked: string[] = [];
    scene.root.traverse((node) => {
      if (/hitbox/i.test(node.name)) leaked.push(node.name);
    });
    expect(leaked).toEqual([]);
  });

  it('builds one clip per animation with the measured track and keyframe counts', () => {
    const table = scene.clipDescriptors.map((descriptor) => [
      descriptor.name,
      descriptor.loop,
      descriptor.duration,
      descriptor.trackCount,
      descriptor.keyframeCount,
    ]);

    expect(table).toEqual([
      ['idle', 'loop', 3, 15, 45],
      ['walk', 'loop', 3, 16, 48],
      ['tlaloc_basic_spell', 'once', 1.3, 16, 71],
      ['tlaloc_acid_rain', 'once', 5.8, 16, 82],
      ['tlaloc_projectile', 'once', 4.45, 17, 146],
      ['tlaloc_summon_cast', 'once', 2.75, 17, 103],
      ['tlaloc_water_wave', 'once', 2.76, 17, 121],
      ['spawn', 'once', 2, 17, 47],
      ['death_ground', 'once', 10, 18, 63],
      ['death', 'once', 10, 18, 63],
    ]);
    expect(scene.stats.tracks).toBe(167);
    expect(scene.stats.keyframes).toBe(789);
  });

  it('keeps the clips non-static', () => {
    // Two `spawn` tracks hold a single key, which is legitimate: 789 keyframes over 167
    // tracks. What is NOT legitimate is a clip whose every track is a single key.
    for (const descriptor of scene.clipDescriptors) {
      expect(descriptor.keyframeCount).toBeGreaterThan(descriptor.trackCount);
      expect(descriptor.animatedTrackCount).toBeGreaterThan(0);
    }
    expect(scene.stats.keyframes).toBeGreaterThan(scene.stats.tracks);

    const idle = scene.clips.find((clip) => clip.name === 'idle');
    expect(idle?.duration).toBe(3);
    for (const track of idle?.tracks ?? []) {
      expect(track.times.length).toBeGreaterThan(1);
    }
  });

  /**
   * The file stores keyframes in authoring order, not in time order, and the pipeline has to
   * repair that before three.js sees it: `Interpolant.search()` binary-searches `times` and
   * assumes ascending order, so an unsorted track interpolates the wrong pair of keys
   * silently instead of throwing. Measured independently from the raw JSON: 70 of the 157
   * animator keyframe arrays, and 72 of the 167 (bone, channel) groups they reduce to, are
   * non-ascending. Both counts are asserted below so this stays a staleness gate.
   */
  it('sorting out-of-order keyframes is load-bearing for this asset, and done for every track', () => {
    const animators = (RAW.animations ?? []).flatMap((animation) =>
      Object.values(animation.animators ?? {}),
    );
    const timeSequences = animators
      .map((animator) => (animator.keyframes ?? []).map((keyframe) => keyframe.time ?? 0))
      .filter((times) => times.length > 0);
    const nonAscending = timeSequences.filter((times) => !isAscending(times));

    expect(timeSequences).toHaveLength(157);
    expect(nonAscending).toHaveLength(70);

    const channelSequences = animators.flatMap((animator) => {
      const byChannel = new Map<string, number[]>();
      for (const keyframe of animator.keyframes ?? []) {
        const channel = keyframe.channel ?? '';
        const times = byChannel.get(channel);
        if (times === undefined) byChannel.set(channel, [keyframe.time ?? 0]);
        else times.push(keyframe.time ?? 0);
      }
      return [...byChannel.values()];
    });

    expect(channelSequences).toHaveLength(167);
    expect(channelSequences.filter((times) => !isAscending(times))).toHaveLength(72);

    // The repair is visible on every track, not only on the ones that needed it.
    const unsortedTracks: string[] = [];
    for (const clip of scene.clips) {
      for (const track of clip.tracks) {
        const times = [...track.times];
        if (!isAscending(times) || new Set(times).size !== times.length) {
          unsortedTracks.push(`${clip.name}/${track.name}: ${times.join(',')}`);
        }
      }
    }
    expect(unsortedTracks).toEqual([]);
    expect(scene.stats.tracks).toBe(channelSequences.length);
  });

  it('binds the root bone track to the root bone, not to the scene root', () => {
    // Regression: the file names both the model and its root bone `tlaloc`, and
    // `PropertyBinding.findNode` returns the scene root when the names match.
    expect(RAW.name).toBe('tlaloc');
    expect(scene.root.name).toBe('tlaloc_2');
    expect(scene.root.children[0].name).toBe('tlaloc');

    const bone = scene.modelMap.get(ROOT_BONE_UUID);
    if (bone === undefined) throw new Error('root bone uuid is missing from the model map');
    const idle = scene.clips.find((clip) => clip.name === 'idle');
    if (idle === undefined) throw new Error('idle clip is missing');

    const mixer = new THREE.AnimationMixer(scene.root);
    mixer.clipAction(idle).play();
    const before = bone.position.clone();

    mixer.update(1.5);

    expect(bone.position.distanceTo(before)).toBeGreaterThan(0.001);
    expect(bone.position.x).toBeCloseTo(2.55, 2);
    expect(bone.position.y).toBeCloseTo(45.15, 2);
    expect(bone.position.z).toBeCloseTo(1, 2);
    mixer.stopAllAction();
  });

  it('measures only the visible geometry', () => {
    const { min, max } = scene.stats.boundingBox;

    expect(min[0]).toBeCloseTo(-12.4828, 4);
    expect(min[1]).toBeCloseTo(0.3688, 4);
    expect(min[2]).toBeCloseTo(-34.0698, 4);
    expect(max[0]).toBeCloseTo(14.6452, 4);
    expect(max[1]).toBeCloseTo(52.5904, 4);
    expect(max[2]).toBeCloseTo(28.3849, 4);

    // The source contains geometry that starts at y = 0 (a collision cube). The visible
    // bounds start higher, which is only possible because that cube was filtered out.
    const sourceMinY = Math.min(
      ...RAW.elements.map((element) => Math.min(element.from[1], element.to[1])),
    );
    expect(sourceMinY).toBe(0);
    expect(min[1]).toBeGreaterThan(0.1);
  });

  it('builds one mesh per visible cube with a shared base and emissive material', () => {
    const meshes: THREE.Mesh[] = [];
    scene.root.traverse((node) => {
      if (node instanceof THREE.Mesh) meshes.push(node);
    });

    expect(meshes).toHaveLength(106);
    const materials = new Set(meshes.map((mesh) => mesh.material));
    expect(materials.size).toBe(1);

    const vertices = meshes.reduce((total, mesh) => total + mesh.geometry.getAttribute('position').count, 0);
    const triangles = meshes.reduce(
      (total, mesh) => total + (mesh.geometry.getIndex()?.count ?? 0) / 3,
      0,
    );
    expect(vertices).toBe(2544);
    expect(triangles).toBe(1272);

    const material = meshes[0].material as THREE.MeshStandardMaterial;
    expect(material.map?.name).toBe('tlaloc.png');
    expect(material.emissiveMap?.name).toBe('tlaloc_e.png');
    expect(material.emissive.getHexString()).toBe('ffffff');
    expect(scene.stats.emissiveTextureIndex).toBe(1);
    expect(scene.textures.map((texture) => texture.name)).toEqual(['tlaloc.png', 'tlaloc_e.png']);
  });

  it('parses without warnings', () => {
    expect(scene.stats.warnings).toEqual([]);
  });

  it('releases the graph and the textures on dispose', () => {
    const textures = scene.textures.map((texture) => vi.spyOn(texture, 'dispose'));

    scene.dispose();

    expect(scene.root.children).toHaveLength(0);
    for (const spy of textures) expect(spy).toHaveBeenCalledTimes(1);
  });
});
