/**
 * Minecraft item model JSON -> validated intermediate model.
 *
 * Pure: no three.js, no DOM, no fetch. Fails loudly with an `itemmodel:` prefix on
 * structurally invalid input and records non-fatal surprises in `ItemModel.warnings`.
 *
 * This is **not** the `.bbmodel` format and shares no parsing code with it. The differences
 * that matter are all handled here:
 *
 * - `rotation` on an element is axis-angle (`{angle, axis, origin}`), not an Euler triple,
 *   and may be an object or an array of objects.
 * - `uv` is in a 16-unit space scaled by `texture_size`, not in atlas pixels.
 * - `texture` is an indirection (`"#0"` -> `textures["0"]` -> a path), and `textures` also
 *   carries a `particle` key that is not a face texture.
 * - A model with a `parent` and no `elements` is a flat sprite, which is a legitimate state
 *   and never an error.
 */

import {
  ITEM_DISPLAY_CONTEXTS,
  ITEM_FACE_DIRECTIONS,
  ITEM_UV_SPACE,
  type ItemAxis,
  type ItemDisplay,
  type ItemDisplayContext,
  type ItemElement,
  type ItemFace,
  type ItemModel,
  type ItemRawModel,
  type ItemRotation,
  type ItemSprite,
  type ItemTexture,
  type Vec3,
} from './types';

/** Prefix used by every error this module throws. */
const ERROR_PREFIX = 'itemmodel:';

/** Throws an `itemmodel:`-prefixed error. */
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
  if (array.length !== 3) {
    fail(`${what} must have exactly 3 components, received ${array.length}`);
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

const AXES: readonly ItemAxis[] = ['x', 'y', 'z'];

/**
 * Parses a raw item model document into the validated intermediate model.
 *
 * @throws Error with an `itemmodel:` prefix when the document is neither renderable
 *   geometry nor a recognisable parent-driven sprite.
 */
export function parseItemModel(raw: unknown): ItemModel {
  const document = asRecord(raw, 'model document') as ItemRawModel;
  const warnings: string[] = [];

  const textureSize = readTextureSize(document.texture_size);
  const textures = readTextures(document.textures);
  const textureByKey = new Map(textures.map((texture) => [texture.key, texture]));
  const faceTextures = textures.filter((texture) => !texture.isParticle);

  const rawElements = document.elements;
  const parent = typeof document.parent === 'string' && document.parent.length > 0 ? document.parent : null;
  const hasElements = Array.isArray(rawElements) && rawElements.length > 0;

  if (!hasElements) {
    if (Array.isArray(rawElements) && rawElements.length === 0 && parent === null) {
      fail('"elements" is empty and there is no "parent" to inherit geometry from');
    }
    if (parent === null) {
      fail(
        `the document has no renderable "elements" and no "parent" (received ${describe(rawElements)})`,
      );
    }
    return {
      kind: 'sprite',
      textureSize,
      textures,
      elements: [],
      display: readDisplay(document.display, warnings),
      sprite: readSprite(parent, faceTextures, warnings),
      warnings,
    };
  }

  const elements: ItemElement[] = [];
  let outOfAtlasFaces = 0;
  const outOfAtlasExamples: string[] = [];

  for (const [index, entry] of requireArray(rawElements, 'elements').entries()) {
    const label = `elements[${index}]`;
    const element = asRecord(entry, label) as Record<string, unknown>;
    const faces = readFaces(element['faces'], label, textureByKey);
    const offAtlas = faces.filter((face) => isOutsideTexture(face.uv, textureSize));
    if (offAtlas.length > 0) {
      outOfAtlasFaces += offAtlas.length;
      if (outOfAtlasExamples.length < 2) {
        const first = offAtlas[0];
        outOfAtlasExamples.push(
          `${label}.faces.${first.direction} uv ${first.uv.join(', ')} against a ${textureSize.width}x${textureSize.height} texture`,
        );
      }
    }

    elements.push({
      index,
      from: requireVec3(element['from'], `${label}.from`),
      to: requireVec3(element['to'], `${label}.to`),
      rotations: readRotations(element['rotation'], `${label}.rotation`),
      faces,
    });
  }

  if (outOfAtlasFaces > 0) {
    warnings.push(
      `${outOfAtlasFaces} face(s) sample outside the ${textureSize.width}x${textureSize.height} texture and will be clamped (e.g. ${outOfAtlasExamples.join('; ')})`,
    );
  }

  return {
    kind: 'geometry',
    textureSize,
    textures,
    elements,
    display: readDisplay(document.display, warnings),
    sprite: null,
    warnings,
  };
}

/**
 * Reads `texture_size`.
 *
 * Vanilla's default is `[16, 16]`, i.e. a UV of 16 spans the texture. Both real 3D models
 * declare `[64, 64]`, which changes the *pixel* each UV lands on but not the normalised UV:
 * `uv / 16` spans the texture either way.
 */
function readTextureSize(raw: unknown): { readonly width: number; readonly height: number } {
  if (raw === undefined || raw === null) return { width: ITEM_UV_SPACE, height: ITEM_UV_SPACE };
  const array = requireArray(raw, 'texture_size');
  if (array.length < 2) {
    fail(`texture_size must have 2 components, received ${array.length}`);
  }
  const width = requireFiniteNumber(array[0], 'texture_size[0]');
  const height = requireFiniteNumber(array[1], 'texture_size[1]');
  if (!(width > 0) || !(height > 0)) {
    fail(`texture_size must be positive, received ${width}x${height}`);
  }
  return { width, height };
}

/**
 * Reads the `textures` map.
 *
 * `particle` is a declaration of the dust-particle texture, not a face texture, and is kept
 * as a flagged entry rather than being dropped: it is the only way a caller can tell that
 * the file referenced it.
 */
function readTextures(raw: unknown): readonly ItemTexture[] {
  if (raw === undefined || raw === null) return [];
  const map = asRecord(raw, 'textures');
  return Object.entries(map).map(([key, value]) => {
    const path = requireString(value, `textures["${key}"]`);
    return {
      key,
      path,
      isParticle: key === 'particle',
      isNamespaced: NAMESPACED.test(path),
    };
  });
}

/** `minecraft:item/paper`: a namespaced path, i.e. an asset that lives in the vanilla jar. */
const NAMESPACED = /^[a-z0-9_.-]+:/i;

/**
 * Reads the faces of one element.
 *
 * @throws when a face has no `texture`, or when its `#key` is absent from `textures`.
 */
function readFaces(
  raw: unknown,
  label: string,
  textureByKey: ReadonlyMap<string, ItemTexture>,
): readonly ItemFace[] {
  const map = asRecord(raw, `${label}.faces`);
  const faces: ItemFace[] = [];

  for (const direction of ITEM_FACE_DIRECTIONS) {
    const value = map[direction];
    if (value === undefined || value === null) continue;
    const face = asRecord(value, `${label}.faces.${direction}`);
    const where = `${label}.faces.${direction}`;

    const uvArray = requireArray(face['uv'], `${where}.uv`);
    if (uvArray.length !== 4) {
      fail(`${where}.uv must have exactly 4 components, received ${uvArray.length}`);
    }
    const uv: [number, number, number, number] = [
      requireFiniteNumber(uvArray[0], `${where}.uv[0]`),
      requireFiniteNumber(uvArray[1], `${where}.uv[1]`),
      requireFiniteNumber(uvArray[2], `${where}.uv[2]`),
      requireFiniteNumber(uvArray[3], `${where}.uv[3]`),
    ];

    const rotation = requireFiniteNumber(face['rotation'] ?? 0, `${where}.rotation`);
    if (rotation % 90 !== 0) {
      fail(`${where}.rotation must be a multiple of 90 degrees, received ${rotation}`);
    }

    const rawTexture = requireString(face['texture'], `${where}.texture`);
    // A face names its texture by *reference*: `#name` into this model's `textures` map.
    // Vanilla accepts nothing else, and guessing that a bare string is a path would render
    // an untextured face instead of reporting a broken model.
    if (!rawTexture.startsWith('#')) {
      fail(
        `${where}.texture is "${rawTexture}"; a face texture must reference the "textures" map as "#name"`,
      );
    }
    const textureKey = rawTexture.slice(1);
    const entry = textureByKey.get(textureKey);
    if (entry === undefined) {
      fail(
        `${where}.texture is "${rawTexture}", which matches no key in "textures" (have ${[...textureByKey.keys()].join(', ') || 'none'})`,
      );
    }
    if (entry.isParticle) {
      fail(
        `${where}.texture is "#${textureKey}", which is the "particle" texture declaration and not a face texture`,
      );
    }

    faces.push({ direction, uv, rotation, textureKey, texturePath: entry.path });
  }

  if (faces.length === 0) {
    fail(`${label} has no faces`);
  }
  return faces;
}

/**
 * Reads an element's `rotation`, which the format allows as one object or an array applied
 * in sequence. Always returns an array so nothing downstream has to branch, and so a
 * sequence can never be silently dropped.
 */
function readRotations(raw: unknown, label: string): readonly ItemRotation[] {
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      fail(`${label} is an empty array; either omit the field or provide a rotation`);
    }
    return raw.map((entry, index) => readRotation(entry, `${label}[${index}]`));
  }
  return [readRotation(raw, label)];
}

function readRotation(raw: unknown, label: string): ItemRotation {
  const record = asRecord(raw, label);
  const axis = record['axis'];
  if (typeof axis !== 'string' || !AXES.includes(axis as ItemAxis)) {
    fail(`${label}.axis must be one of x, y, z, received ${describe(axis)}`);
  }
  return {
    angle: requireFiniteNumber(record['angle'], `${label}.angle`),
    axis: axis as ItemAxis,
    // Vanilla's codec requires `origin`; defaulting it to (0, 0, 0) would silently move the
    // pivot to the model corner and produce a plausible-looking wrong pose.
    origin: requireVec3(record['origin'], `${label}.origin`),
  };
}

/** True when a UV rect leaves the texture once it is scaled by `texture_size`. */
function isOutsideTexture(
  uv: readonly [number, number, number, number],
  textureSize: { readonly width: number; readonly height: number },
): boolean {
  const scale = textureSize.width / ITEM_UV_SPACE;
  const scaleY = textureSize.height / ITEM_UV_SPACE;
  return (
    uv.some((value) => value < 0) ||
    uv[0] * scale > textureSize.width ||
    uv[2] * scale > textureSize.width ||
    uv[1] * scaleY > textureSize.height ||
    uv[3] * scaleY > textureSize.height
  );
}

/**
 * Reads the `display` block: how Minecraft poses the model per context.
 *
 * Only contexts the file declares are returned; a caller asking for an absent context gets
 * the identity, which is vanilla's own default. An unrecognised context name is a warning
 * rather than an error so a future context cannot break the preview.
 */
function readDisplay(raw: unknown, warnings: string[]): readonly ItemDisplay[] {
  if (raw === undefined || raw === null) return [];
  const map = asRecord(raw, 'display');
  const display: ItemDisplay[] = [];

  for (const [context, value] of Object.entries(map)) {
    if (!(ITEM_DISPLAY_CONTEXTS as readonly string[]).includes(context)) {
      warnings.push(`display.${context} is not one of the eight known contexts and was ignored`);
      continue;
    }
    const entry = asRecord(value, `display.${context}`);
    display.push({
      context: context as ItemDisplayContext,
      rotation: optionalVec3(entry['rotation'], `display.${context}.rotation`, [0, 0, 0]),
      translation: optionalVec3(entry['translation'], `display.${context}.translation`, [0, 0, 0]),
      scale: optionalVec3(entry['scale'], `display.${context}.scale`, [1, 1, 1]),
    });
  }
  return display;
}

/**
 * Reads the sprite state of a parent-driven model.
 *
 * `layer0` is the format's own sprite slot (`item/generated` uses it); failing that, the
 * first non-particle texture is used, which is what `item/handheld` models declare. A model
 * with no usable texture at all is still a valid sprite: it renders untextured and says so.
 */
function readSprite(
  parent: string,
  faceTextures: readonly ItemTexture[],
  warnings: string[],
): ItemSprite {
  const layer0 = faceTextures.find((texture) => texture.key === 'layer0');
  const chosen = layer0 ?? faceTextures[0];
  if (chosen === undefined) {
    warnings.push(
      `the model delegates to parent "${parent}" and declares no texture of its own; it will render untextured`,
    );
    return { textureKey: null, texturePath: null, parent };
  }
  return { textureKey: chosen.key, texturePath: chosen.path, parent };
}
