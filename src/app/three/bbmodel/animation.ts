/**
 * `BbAnimation` -> `THREE.AnimationClip[]`.
 *
 * Channel semantics are the part that is easiest to get silently wrong, so they are taken
 * from the Blockbench source (`js/animations/timeline_animators.js`) rather than inferred:
 *
 * - `position` keyframes are an **offset added** to the bone's local rest position
 *   (`displayPosition`: `bone.position.x += arr[0]`).
 * - `rotation` keyframes are an **offset added** to the bone's rest rotation, in degrees
 *   (`displayRotation`: `bone.rotation.x += Math.degToRad(arr[0])`).
 * - `scale` keyframes are an **absolute multiplier** (`displayScale`:
 *   `bone.scale.x *= (1 + (arr[0] - 1) * multiplier)`).
 *
 * three.js `KeyframeTrack`s write absolute values, so the rest transform is baked into every
 * key here: position keys are `rest + offset`, rotation keys are the quaternion built from
 * `Euler(rest + offset, 'ZYX')`, and scale keys stay as stored.
 *
 * Evidence that this is right for the real asset, beyond the source: the `staff` bone's
 * position channel in `death`/`death_ground` opens at exactly `[0, 0, 0]`, which leaves the
 * staff in the hand under the offset reading and teleports it to the model origin under the
 * absolute reading. `body_all` and `loincloth0` open the same way in `spawn`.
 */

import * as THREE from 'three';

import { BB_EULER_ORDER, type BbAnimation, type BbLoopMode, type BbModel } from './types';

/** What {@link buildAnimationClips} produces besides the clips themselves. */
export interface ClipDescriptor {
  readonly name: string;
  /** Blockbench's loop mode. three.js carries this on the action, not on the clip. */
  readonly loop: BbLoopMode;
  readonly duration: number;
  readonly trackCount: number;
  /** Total keyframes across all tracks: the number that proves a clip is not static. */
  readonly keyframeCount: number;
  /** Tracks that hold more than one key, i.e. tracks that actually animate. */
  readonly animatedTrackCount: number;
}

/** A clip plus the metadata three.js does not store on `AnimationClip`. */
export interface BuiltClip {
  readonly clip: THREE.AnimationClip;
  readonly descriptor: ClipDescriptor;
}

/**
 * Builds one clip per animation, skipping any animation that produced no usable channel.
 *
 * @param model validated model, for the animation list itself
 * @param modelMap uuid -> node, as returned by `buildSceneGraph`; also the source of the
 *   rest transforms that the additive keyframe offsets are applied to.
 */
export function buildAnimationClips(
  model: BbModel,
  modelMap: ReadonlyMap<string, THREE.Object3D>,
): readonly BuiltClip[] {
  const built: BuiltClip[] = [];
  for (const animation of model.animations) {
    const tracks: THREE.KeyframeTrack[] = [];
    for (const channel of animation.channels) {
      const node = modelMap.get(channel.nodeUuid);
      if (node === undefined) continue;
      if (channel.times.length === 0) continue;

      if (channel.channel === 'position') {
        const track = new THREE.VectorKeyframeTrack(
          `${node.name}.position`,
          [...channel.times],
          flatten(
            channel.values.map((offset) => [
              node.position.x + offset[0],
              node.position.y + offset[1],
              node.position.z + offset[2],
            ]),
          ),
        );
        applyInterpolation(track, channel.interpolation);
        tracks.push(track);
        continue;
      }

      if (channel.channel === 'rotation') {
        const track = new THREE.QuaternionKeyframeTrack(
          `${node.name}.quaternion`,
          [...channel.times],
          flatten(
            channel.values.map((offset) => {
              const euler = new THREE.Euler(
                node.rotation.x + THREE.MathUtils.degToRad(offset[0]),
                node.rotation.y + THREE.MathUtils.degToRad(offset[1]),
                node.rotation.z + THREE.MathUtils.degToRad(offset[2]),
                BB_EULER_ORDER,
              );
              const quaternion = new THREE.Quaternion().setFromEuler(euler);
              return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
            }),
          ),
        );
        applyInterpolation(track, channel.interpolation);
        tracks.push(track);
        continue;
      }

      // `scale` is stored as an absolute multiplier, so the keys are used verbatim.
      const track = new THREE.VectorKeyframeTrack(
        `${node.name}.scale`,
        [...channel.times],
        flatten(channel.values),
      );
      applyInterpolation(track, channel.interpolation);
      tracks.push(track);
    }

    if (tracks.length === 0) continue;

    const duration = animation.length > 0 ? animation.length : clipDuration(animation);
    const clip = new THREE.AnimationClip(animation.name, duration, tracks);
    clip.userData['loop'] = animation.loop;
    const keyframeCount = tracks.reduce((total, track) => total + track.times.length, 0);
    built.push({
      clip,
      descriptor: {
        name: animation.name,
        loop: animation.loop,
        duration,
        trackCount: tracks.length,
        keyframeCount,
        animatedTrackCount: tracks.filter((track) => track.times.length > 1).length,
      },
    });
  }
  return built;
}

/**
 * Applies Blockbench's interpolation to a track.
 *
 * three r186 expresses the interpolation modes as the numeric constants
 * `THREE.InterpolateDiscrete|Linear|Smooth` (2300-2302), not as string names.
 *
 * Quaternion tracks leave `InterpolantFactoryMethodSmooth` undefined, so asking for smooth
 * would warn once per track and fall back to linear slerp anyway. Discrete stays discrete;
 * everything else keeps the default linear/slerp behaviour.
 */
function applyInterpolation(
  track: THREE.KeyframeTrack,
  interpolation: 'linear' | 'smooth' | 'discrete',
): void {
  if (interpolation === 'discrete') {
    track.setInterpolation(THREE.InterpolateDiscrete);
    return;
  }
  if (track instanceof THREE.QuaternionKeyframeTrack) return;
  if (interpolation === 'smooth') track.setInterpolation(THREE.InterpolateSmooth);
}

function clipDuration(animation: BbAnimation): number {
  return animation.channels.reduce(
    (longest, channel) => Math.max(longest, channel.times[channel.times.length - 1] ?? 0),
    0,
  );
}

function flatten(values: readonly (readonly number[])[]): number[] {
  const flat: number[] = [];
  for (const value of values) {
    for (const component of value) flat.push(component);
  }
  return flat;
}
