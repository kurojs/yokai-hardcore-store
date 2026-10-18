/**
 * `.bbmodel` JSON -> validated intermediate model.
 *
 * This module is pure: no three.js, no DOM. It fails loudly with a precise message on
 * structurally invalid input and records non-fatal surprises in `BbModel.warnings`.
 *
 * Hitbox filtering happens here, so nothing downstream has to know that collision volumes
 * exist: the bones named `ob_tlalochitbox`, `ob_tlalochitbox2`, `ob_tlalochitbox3` and
 * `hitbox` (plus their whole subtrees) never reach `bones` or `cubes`.
 */

import {
  BB_FACE_DIRECTIONS,
  type BbAnimation,
  type BbAnimationChannel,
  type BbBone,
  type BbChannel,
  type BbCube,
  type BbFace,
  type BbLoopMode,
  type BbModel,
  type BbRawAnimation,
  type BbRawBone,
  type BbRawElement,
  type BbRawFace,
  type BbRawKeyframe,
  type BbRawModel,
  type BbTextureRef,
  type Vec3,
} from './types';

/** Prefix used by every error this module throws, so callers can identify the source. */
const ERROR_PREFIX = 'bbmodel:';

/** Throws a `bbmodel:`-prefixed error. */
function fail(message: string): never {
  throw new Error(`${ERROR_PREFIX} ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value;
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${what} must be an object, received ${describe(value)}`);
  }
  return value;
}

function requireArray(value: unknown, what: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    fail(`missing or invalid required array "${what}" (received ${describe(value)})`);
  }
  return value;
}

function requireString(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${what} must be a non-empty string, received ${describe(value)}`);
  }
  return value;
}

function requireFiniteNumber(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${what} must be a finite number, received ${describe(value)}`);
  }
  return value;
}

function requireVec3(value: unknown, what: string): Vec3 {
  const array = requireArray(value, what);
  if (array.length < 3) {
    fail(`${what} must have at least 3 components, received ${array.length}`);
  }
  return [
    requireFiniteNumber(array[0], `${what}[0]`),
    requireFiniteNumber(array[1], `${what}[1]`),
    requireFiniteNumber(array[2], `${what}[2]`),
  ];
}

function optionalVec3(value: unknown, what: string, fallback: Vec3): Vec3 {
  return value === undefined || value === null ? fallback : requireVec3(value, what);
}

/**
 * True when a bone name marks a collision volume rather than geometry.
 *
 * Deliberately a case-insensitive **substring** match, not an exact-name list. The real
 * asset names its four collision bones `ob_tlalochitbox`, `ob_tlalochitbox2`,
 * `ob_tlalochitbox3` and `hitbox`, following the Minecraft/Blockbench convention of
 * `hitbox`, `hitbox_*` and `ob_<mob>hitbox`. An exact-name list would have to be extended
 * for every model, while this pattern matches those four and no visible bone of the real
 * asset (verified: only those four of the 22 outliner bones contain "hitbox").
 *
 * The risk of substring matching is a false positive on a bone like `hitbox_handle` that
 * is meant to be visible. That trade is taken deliberately: drawing a 7x7x10 collision
 * box dwarfs the model, while a wrongly hidden bone is visible in review.
 */
export function isHitboxBoneName(name: string): boolean {
  return /hitbox/i.test(name);
}

/** Mutable accumulator for the outliner walk: `BbBone` with growable child lists. */
interface BoneDraft {
  readonly uuid: string;
  readonly name: string;
  readonly origin: Vec3;
  readonly rotation: Vec3;
  readonly parentUuid: string | null;
  readonly childBoneUuids: string[];
  readonly cubeUuids: string[];
  readonly depth: number;
}

/**
 * Parses a raw `.bbmodel` document into the validated intermediate model.
 *
 * @throws Error with a `bbmodel:` prefix when `elements`, `outliner` or any cube
 *   referenced by the outliner is missing or malformed.
 */
export function parseBbModel(raw: unknown): BbModel {
  const document = asRecord(raw, 'model document') as BbRawModel;
  const warnings: string[] = [];

  const rawElements = requireArray(document.elements, 'elements');
  const rawOutliner = requireArray(document.outliner, 'outliner');

  const resolution = isRecord(document.resolution) ? document.resolution : {};
  const width = requireFiniteNumber(resolution['width'] ?? 16, 'resolution.width');
  const height = requireFiniteNumber(resolution['height'] ?? 16, 'resolution.height');

  const elementByUuid = new Map<string, ParsedCube>();
  let rescaleCount = 0;
  for (const [index, entry] of rawElements.entries()) {
    const rawElement = asRecord(entry, `elements[${index}]`) as BbRawElement;
    const uuid = requireString(rawElement.uuid, `elements[${index}].uuid`);
    if (elementByUuid.has(uuid)) {
      fail(`duplicate element uuid "${uuid}"`);
    }
    if (rawElement.rescale === true) {
      rescaleCount += 1;
      warnings.push(
        `element "${uuid}" sets rescale=true; Blockbench would scale its mesh to compensate for the rotation, which this renderer does not reproduce`,
      );
    }
    elementByUuid.set(uuid, buildCube(rawElement, uuid, index, warnings));
  }

  const bones: BbBone[] = [];
  const cubes: BbCube[] = [];
  const hitboxBoneNames: string[] = [];
  const hitboxCubeUuids = new Set<string>();
  /** Every cube uuid the outliner mentions, hitbox or not: used to detect orphans. */
  const referencedCubeUuids = new Set<string>();
  /** Cubes already placed in the scene graph, to detect a double reference. */
  const placedCubeUuids = new Set<string>();
  let cubesFilteredAsHidden = 0;

  const walk = (entries: readonly unknown[], parent: BoneDraft | null, path: string): void => {
    for (const [index, entry] of entries.entries()) {
      const here = `${path}[${index}]`;

      if (typeof entry === 'string') {
        referencedCubeUuids.add(entry);
        const cube = elementByUuid.get(entry);
        if (cube === undefined) {
          fail(`${here} references cube uuid "${entry}" which is not present in "elements"`);
        }
        if (placedCubeUuids.has(entry)) {
          warnings.push(`cube uuid ${entry} is referenced more than once in the outliner`);
        }
        if (cube.visibility === false) {
          cubesFilteredAsHidden += 1;
          continue;
        }
        placedCubeUuids.add(entry);
        const placed: BbCube = { ...cube, boneUuid: parent?.uuid ?? null };
        cubes.push(placed);
        parent?.cubeUuids.push(entry);
        continue;
      }

      const node = asRecord(entry, here) as BbRawBone;
      const name = requireString(node.name, `${here}.name`);
      const children = requireArray(node.children ?? [], `${here}.children`);

      if (isHitboxBoneName(name)) {
        // Collision volume: the bone, its whole subtree and its cubes never enter the scene.
        hitboxBoneNames.push(name);
        for (const uuid of collectSubtreeCubeUuids(node)) {
          hitboxCubeUuids.add(uuid);
          referencedCubeUuids.add(uuid);
        }
        continue;
      }

      const uuid = requireString(node.uuid, `${here}.uuid`);
      const draft: BoneDraft = {
        uuid,
        name,
        origin: optionalVec3(node.origin, `${here}.origin`, [0, 0, 0]),
        rotation: optionalVec3(node.rotation, `${here}.rotation`, [0, 0, 0]),
        parentUuid: parent?.uuid ?? null,
        childBoneUuids: [],
        cubeUuids: [],
        depth: parent === null ? 0 : parent.depth + 1,
      };
      bones.push(draft);
      parent?.childBoneUuids.push(uuid);
      walk(children, draft, `${here}.children`);
    }
  };

  walk(rawOutliner, null, 'outliner');

  const orphanCount = [...elementByUuid.keys()].filter(
    (uuid) => !referencedCubeUuids.has(uuid),
  ).length;
  if (orphanCount > 0) {
    warnings.push(
      `${orphanCount} cube(s) exist in "elements" but are never referenced by the outliner and will not be rendered`,
    );
  }

  const duplicateNames = findDuplicates(bones.map((bone) => bone.name));
  if (duplicateNames.length > 0) {
    warnings.push(`duplicate bone names: ${duplicateNames.join(', ')}`);
  }

  if (bones.length === 0) {
    fail('the outliner contains no renderable bone; every top-level node was filtered out');
  }
  if (cubes.length === 0) {
    fail('the outliner references no renderable cube');
  }

  return {
    name: typeof document.name === 'string' && document.name.length > 0 ? document.name : 'model',
    resolution: { width, height },
    bones,
    cubes,
    animations: parseAnimations(document.animations, bones, cubes, warnings),
    textures: parseTextures(document.textures),
    hitboxBoneNames,
    cubesFilteredAsHitbox: hitboxCubeUuids.size,
    cubesFilteredAsHidden,
    warnings,
  };
}

/** Collects every cube uuid reachable from a bone, including through nested bones. */
function collectSubtreeCubeUuids(node: BbRawBone): readonly string[] {
  const found: string[] = [];
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    if (typeof child === 'string') {
      found.push(child);
      continue;
    }
    if (isRecord(child)) {
      found.push(...collectSubtreeCubeUuids(child as BbRawBone));
    }
  }
  return found;
}

function findDuplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

/** Cube plus the two raw flags the walk still has to read. */
interface ParsedCube extends BbCube {
  readonly visibility: boolean | undefined;
}

function buildCube(
  raw: BbRawElement,
  uuid: string,
  index: number,
  warnings: string[],
): ParsedCube {
  const label = `element "${uuid}" (elements[${index}])`;
  return {
    uuid,
    name: typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : 'cube',
    boneUuid: null,
    from: requireVec3(raw.from, `${label}.from`),
    to: requireVec3(raw.to, `${label}.to`),
    origin: optionalVec3(raw.origin, `${label}.origin`, [0, 0, 0]),
    rotation: optionalVec3(raw.rotation, `${label}.rotation`, [0, 0, 0]),
    faces: buildFaces(raw.faces, label, warnings),
    visibility: raw.visibility,
  };
}

function buildFaces(
  rawFaces: Readonly<Record<string, BbRawFace>> | undefined,
  label: string,
  warnings: string[],
): readonly BbFace[] {
  if (!isRecord(rawFaces)) {
    fail(`${label} has no "faces" object`);
  }
  const faces: BbFace[] = [];
  // Iterate in Blockbench's own direction order so geometry output stays deterministic.
  for (const direction of BB_FACE_DIRECTIONS) {
    const rawFace = rawFaces[direction];
    if (rawFace === undefined || rawFace === null) continue;
    // `texture: null` marks a deliberately blank face in Blockbench and emits no quad.
    if (rawFace.texture === null) continue;

    const uv = requireArray(rawFace.uv, `${label}.faces.${direction}.uv`);
    if (uv.length < 4) {
      fail(`${label}.faces.${direction}.uv must have 4 components, received ${uv.length}`);
    }
    const rotation = requireFiniteNumber(
      rawFace.rotation ?? 0,
      `${label}.faces.${direction}.rotation`,
    );
    if (rotation !== 0 && rotation % 90 !== 0) {
      warnings.push(
        `${label}.faces.${direction} has a ${rotation}° UV rotation; Blockbench consumes it in 90° steps, so it is read as 90°`,
      );
    }
    faces.push({
      direction,
      uv: [
        requireFiniteNumber(uv[0], `${label}.faces.${direction}.uv[0]`),
        requireFiniteNumber(uv[1], `${label}.faces.${direction}.uv[1]`),
        requireFiniteNumber(uv[2], `${label}.faces.${direction}.uv[2]`),
        requireFiniteNumber(uv[3], `${label}.faces.${direction}.uv[3]`),
      ],
      rotation,
      textureIndex: requireFiniteNumber(
        rawFace.texture ?? 0,
        `${label}.faces.${direction}.texture`,
      ),
    });
  }
  if (faces.length === 0) {
    fail(`${label} has no textured faces`);
  }
  return faces;
}

function parseTextures(raw: unknown): readonly BbTextureRef[] {
  if (raw === undefined || raw === null) return [];
  const list = requireArray(raw, 'textures');
  return list.map((entry, index) => {
    const texture = asRecord(entry, `textures[${index}]`);
    const name = requireString(texture['name'], `textures[${index}].name`);
    return {
      index,
      name,
      source: requireString(texture['source'], `textures[${index}].source`),
      isEmissive: isEmissiveTextureName(name),
    };
  });
}

/**
 * True when a texture name marks the layer as an emissive companion.
 *
 * Blockbench writes the paired layer as `<base>_e.png` by convention; the real asset has
 * `tlaloc.png` and `tlaloc_e.png`. `emissive` in the name is accepted as well, for
 * models that name the layer explicitly.
 */
export function isEmissiveTextureName(name: string): boolean {
  return /_e\.(png|jpe?g)$/i.test(name) || /emissive/i.test(name);
}

function parseAnimations(
  raw: unknown,
  bones: readonly BbBone[],
  cubes: readonly BbCube[],
  warnings: string[],
): readonly BbAnimation[] {
  if (raw === undefined || raw === null) return [];
  const list = requireArray(raw, 'animations');
  const knownUuids = new Set<string>([
    ...bones.map((bone) => bone.uuid),
    ...cubes.map((cube) => cube.uuid),
  ]);

  return list.map((entry, index) => {
    const animation = asRecord(entry, `animations[${index}]`) as BbRawAnimation;
    const name = requireString(animation.name, `animations[${index}].name`);
    // `animators` is an object keyed by bone uuid. `Object.entries` is the only correct
    // iteration here: an array-shaped `animators` never occurs in the real asset.
    const animators = isRecord(animation.animators) ? animation.animators : {};
    if (Object.keys(animators).length === 0) {
      warnings.push(`${name}: animation has no animators`);
    }

    const channels: BbAnimationChannel[] = [];
    for (const [uuid, rawAnimator] of Object.entries(animators)) {
      if (!isRecord(rawAnimator)) {
        warnings.push(`${name}: animator ${uuid} is not an object and was skipped`);
        continue;
      }
      if (!knownUuids.has(uuid)) {
        const animatorName = String(rawAnimator['name'] ?? uuid);
        warnings.push(
          `${name}: animator "${animatorName}" references uuid ${uuid}, which matches no rendered bone or cube; skipped`,
        );
        continue;
      }
      channels.push(
        ...buildChannels(
          name,
          uuid,
          readKeyframes(rawAnimator['keyframes'], `${name}/${uuid}`, warnings),
          warnings,
        ),
      );
    }

    const declaredLength =
      typeof animation.length === 'number' && animation.length > 0 ? animation.length : 0;
    const longestKey = channels.reduce(
      (max, channel) => Math.max(max, channel.times[channel.times.length - 1] ?? 0),
      0,
    );
    const length = declaredLength > 0 ? Math.max(declaredLength, longestKey) : longestKey;
    if (length === 0) {
      warnings.push(`${name}: animation has zero length and no keyframes`);
    }
    if (channels.length === 0) {
      warnings.push(`${name}: no usable keyframes; this clip will not be rendered`);
    }

    return { name, loop: normalizeLoop(animation.loop), length, channels };
  });
}

/**
 * Reads an animator's `keyframes`.
 *
 * The real asset stores an array whose entries carry `channel` (a name) and `time`
 * (seconds): measured over all 789 keyframes, `channel` is always `"position"` or
 * `"rotation"` and `data_points` always has length 1. A timestamp-keyed object is still
 * accepted, because mistaking the shape yields a **silently static** model, which is the
 * worst possible failure mode for this parser.
 */
function readKeyframes(value: unknown, label: string, warnings: string[]): readonly BbRawKeyframe[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value as readonly BbRawKeyframe[];

  if (isRecord(value)) {
    const flattened: BbRawKeyframe[] = [];
    for (const [key, entry] of Object.entries(value)) {
      const time = Number(key);
      if (Array.isArray(entry)) {
        for (const item of entry) flattened.push(withTime(item, time));
      } else if (isRecord(entry)) {
        flattened.push(withTime(entry, time));
      }
    }
    warnings.push(
      `${label}: "keyframes" was an object keyed by time instead of an array; ${flattened.length} keyframe(s) recovered`,
    );
    return flattened;
  }

  warnings.push(`${label}: "keyframes" is neither an array nor an object and was ignored`);
  return [];
}

function withTime(entry: unknown, fallbackTime: number): BbRawKeyframe {
  const record = isRecord(entry) ? entry : {};
  const time = typeof record['time'] === 'number' ? record['time'] : fallbackTime;
  return { ...record, time } as BbRawKeyframe;
}

/**
 * Reads a keyframe axis value, which Blockbench stores either as a number or as a Molang
 * expression string. Mixed types are the norm: 485 of the 789 keyframes in the real asset
 * hold at least one axis as a numeric string such as `"0"`.
 *
 * @returns the number, or `null` when the value is a non-numeric expression.
 */
function readAxisValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeLoop(value: unknown): BbLoopMode {
  return value === 'once' || value === 'hold' ? value : 'loop';
}

/**
 * Maps a Blockbench interpolation name onto three.js vocabulary.
 *
 * `catmullrom` — the only interpolation in six of the ten real animations — is
 * approximated with `smooth` (three's `InterpolateSmooth`); Blockbench's exact
 * control-point scheme is not reproduced.
 */
function normalizeInterpolation(value: unknown): BbAnimationChannel['interpolation'] {
  if (value === 'linear') return 'linear';
  if (value === 'step' || value === 'discrete') return 'discrete';
  return 'smooth';
}

function buildChannels(
  animationName: string,
  uuid: string,
  keyframes: readonly BbRawKeyframe[],
  warnings: string[],
): readonly BbAnimationChannel[] {
  const byChannel = new Map<BbChannel, Map<number, Vec3>>();

  for (const keyframe of keyframes) {
    const channelName = keyframe.channel;
    if (channelName !== 'position' && channelName !== 'rotation' && channelName !== 'scale') {
      warnings.push(
        `${animationName}/${uuid}: unknown channel "${String(channelName)}" was skipped`,
      );
      continue;
    }
    const time = typeof keyframe.time === 'number' ? keyframe.time : Number.NaN;
    if (!Number.isFinite(time) || time < 0) {
      warnings.push(`${animationName}/${uuid}: keyframe with an invalid time was skipped`);
      continue;
    }
    const dataPoints = Array.isArray(keyframe.data_points) ? keyframe.data_points : [];
    if (dataPoints.length === 0) {
      warnings.push(`${animationName}/${uuid}: keyframe at ${time}s has no data_point; skipped`);
      continue;
    }
    if (dataPoints.length > 1) {
      warnings.push(
        `${animationName}/${uuid}: keyframe at ${time}s has ${dataPoints.length} data points; only the first is used`,
      );
    }
    const dataPoint = dataPoints[0];
    if (!isRecord(dataPoint)) {
      warnings.push(`${animationName}/${uuid}: keyframe at ${time}s has no data_point; skipped`);
      continue;
    }
    const x = readAxisValue(dataPoint['x']);
    const y = readAxisValue(dataPoint['y']);
    const z = readAxisValue(dataPoint['z']);
    if (x === null || y === null || z === null) {
      warnings.push(
        `${animationName}/${uuid}: keyframe at ${time}s on channel "${channelName}" uses a non-numeric expression and was skipped`,
      );
      continue;
    }
    let frames = byChannel.get(channelName);
    if (frames === undefined) {
      frames = new Map<number, Vec3>();
      byChannel.set(channelName, frames);
    }
    // Later keyframes win on duplicate times, matching Blockbench's evaluation order.
    frames.set(time, [x, y, z]);
  }

  const interpolation = normalizeInterpolation(
    keyframes.find((keyframe) => keyframe.interpolation !== undefined)?.interpolation,
  );

  const channels: BbAnimationChannel[] = [];
  for (const [channel, frames] of byChannel) {
    if (frames.size === 0) continue;
    const times = [...frames.keys()].sort((a, b) => a - b);
    channels.push({
      nodeUuid: uuid,
      channel,
      times,
      values: times.map((time) => {
        const value = frames.get(time);
        if (value === undefined) {
          fail(`internal: lost keyframe value for ${animationName}/${uuid} at ${time}s`);
        }
        return value;
      }),
      interpolation,
    });
  }
  return channels;
}
