/**
 * Animation specs: the channel semantics and the three.js encoding.
 *
 * The semantics were read out of Blockbench (`displayPosition`, `displayRotation`,
 * `displayScale`); these tests pin them to actual track values so a change in either the
 * reading or the baking is visible.
 */

import * as THREE from 'three';

import { buildAnimationClips } from './animation';
import { parseBbModel } from './parse';
import { buildSceneGraph } from './scene';
import { bone, model } from './testing/fixtures';

type Keyframe = Record<string, unknown>;

function key(channel: string, time: number, x: number, y: number, z: number): Keyframe {
  return { channel, time, data_points: [{ x, y, z }] };
}

function animation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'move',
    loop: 'loop',
    length: 2,
    animators: { 'bone-1': { type: 'bone', keyframes: [] } },
    ...overrides,
  };
}

function build(raw: unknown) {
  const parsed = parseBbModel(raw);
  const graph = buildSceneGraph(parsed, {
    loadTexture: { load: () => new THREE.Texture() },
  });
  return { parsed, graph, built: buildAnimationClips(parsed, graph.modelMap) };
}

function trackByName(clip: THREE.AnimationClip, name: string): THREE.KeyframeTrack {
  const track = clip.tracks.find((candidate) => candidate.name === name);
  if (track === undefined) {
    throw new Error(`track ${name} not found; have ${clip.tracks.map((item) => item.name).join(', ')}`);
  }
  return track;
}

function documentWithKeyframes(keyframes: Keyframe[], overrides: Record<string, unknown> = {}) {
  return model({
    outliner: [
      bone({ uuid: 'bone-1', name: 'root', origin: [1, 2, 3], children: ['cube-1'] }),
    ],
    animations: [animation({ animators: { 'bone-1': { type: 'bone', keyframes } }, ...overrides })],
  });
}

describe('buildAnimationClips', () => {
  it('adds position keyframes to the rest position instead of replacing it', () => {
    const { built } = build(
      documentWithKeyframes([key('position', 0, 0, 0, 0), key('position', 1, 0, 5, 0)]),
    );

    const track = trackByName(built[0].clip, 'root.position');
    expect([...track.times]).toEqual([0, 1]);
    expect([...track.values]).toEqual([1, 2, 3, 1, 7, 3]);
  });

  it('adds rotation keyframes in degrees to the rest rotation and encodes a quaternion', () => {
    const { built } = build(documentWithKeyframes([key('rotation', 0, 0, 0, 0), key('rotation', 2, 0, 0, 90)]));

    const track = trackByName(built[0].clip, 'root.quaternion') as THREE.QuaternionKeyframeTrack;
    const values = [...track.values];

    // t=0: rest rotation is zero, so the first key is the identity quaternion.
    expect(values.slice(0, 4)).toEqual([0, 0, 0, 1]);
    // t=2: 90 degrees about Z.
    expect(values[4]).toBeCloseTo(0, 6);
    expect(values[5]).toBeCloseTo(0, 6);
    expect(values[6]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(values[7]).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('composes the rest rotation with the animated offset, both in ZYX order', () => {
    const raw = model({
      outliner: [
        bone({
          uuid: 'bone-1',
          name: 'root',
          origin: [0, 0, 0],
          rotation: [0, 0, 90],
          children: ['cube-1'],
        }),
      ],
      animations: [animation({ animators: { 'bone-1': { keyframes: [key('rotation', 0, 0, 0, 90)] } } })],
    });

    const { built } = build(raw);
    const values = [...trackByName(built[0].clip, 'root.quaternion').values];

    // 90 + 90 = 180 degrees about Z.
    expect(values[0]).toBeCloseTo(0, 6);
    expect(values[1]).toBeCloseTo(0, 6);
    expect(values[2]).toBeCloseTo(1, 6);
    expect(values[3]).toBeCloseTo(0, 6);
  });

  it('uses scale keyframes verbatim, because Blockbench stores an absolute multiplier', () => {
    const { built } = build(documentWithKeyframes([key('scale', 0, 2, 3, 4)]));

    const track = trackByName(built[0].clip, 'root.scale');
    expect([...track.values]).toEqual([2, 3, 4]);
  });

  it('keeps the declared loop mode and length on the clip', () => {
    const { built } = build(
      documentWithKeyframes([key('position', 0, 0, 0, 0)], { name: 'cast', loop: 'once', length: 2.5 }),
    );

    expect(built[0].clip.name).toBe('cast');
    expect(built[0].clip.duration).toBe(2.5);
    expect(built[0].clip.userData['loop']).toBe('once');
    expect(built[0].descriptor.loop).toBe('once');
  });

  it('extends the duration to the last key when the file under-declares it', () => {
    const { built } = build(documentWithKeyframes([key('position', 3.5, 0, 0, 0)], { length: 1 }));

    expect(built[0].clip.duration).toBe(3.5);
  });

  it('counts tracks, keyframes and animated tracks for the caller', () => {
    const { built } = build(
      documentWithKeyframes([
        key('position', 0, 0, 0, 0),
        key('position', 1, 0, 0, 0),
        key('rotation', 0, 0, 0, 0),
        key('rotation', 1, 0, 0, 0),
        key('scale', 1, 1, 1, 1),
      ]),
    );

    expect(built[0].descriptor).toEqual({
      name: 'move',
      loop: 'loop',
      duration: 2,
      trackCount: 3,
      keyframeCount: 5,
      animatedTrackCount: 2,
    });
  });

  it('maps Blockbench interpolation onto the numeric three.js constants', () => {
    const step = build(
      documentWithKeyframes([{ ...key('position', 0, 0, 0, 0), interpolation: 'step' }]),
    );
    const smooth = build(
      documentWithKeyframes([{ ...key('position', 0, 0, 0, 0), interpolation: 'catmullrom' }]),
    );
    const rotated = build(
      documentWithKeyframes([{ ...key('rotation', 0, 0, 0, 0), interpolation: 'catmullrom' }]),
    );

    expect(trackByName(step.built[0].clip, 'root.position').getInterpolation()).toBe(
      THREE.InterpolateDiscrete,
    );
    expect(trackByName(smooth.built[0].clip, 'root.position').getInterpolation()).toBe(
      THREE.InterpolateSmooth,
    );
    // Quaternion tracks have no smooth factory; they keep the linear slerp default.
    expect(trackByName(rotated.built[0].clip, 'root.quaternion').getInterpolation()).toBe(
      THREE.InterpolateLinear,
    );
  });

  it('lets a later keyframe win on a duplicated timestamp', () => {
    const { built } = build(
      documentWithKeyframes([key('position', 0, 1, 0, 0), key('position', 0, 9, 0, 0)]),
    );

    expect([...trackByName(built[0].clip, 'root.position').values]).toEqual([10, 2, 3]);
    expect([...built[0].clip.tracks[0].times]).toEqual([0]);
  });

  it('builds no clip when every animator is unusable', () => {
    const raw = model({
      animations: [
        animation({
          animators: { 'ghost-bone': { keyframes: [key('position', 0, 0, 0, 0)] } },
        }),
      ],
    });

    const { parsed, built } = build(raw);

    expect(built).toEqual([]);
    expect(parsed.warnings.join('\n')).toMatch(/matches no rendered bone or cube/);
  });
});
