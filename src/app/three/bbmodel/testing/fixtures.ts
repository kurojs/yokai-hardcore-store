/**
 * Test-only builders for small `.bbmodel` documents.
 *
 * Not imported by application code. Every builder returns a plain, permissively typed
 * document so a spec can break exactly one field and observe the parser's behaviour.
 * The real asset is exercised separately in `tlaloc-asset.spec.ts`.
 */

/** A 1x1 transparent PNG, used wherever a texture source is required. */
export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

export const TINY_PNG_DATA_URI = `data:image/png;base64,${TINY_PNG_BASE64}`;

/** Six face directions, in the order Blockbench writes them. */
const FACE_DIRECTIONS = ['east', 'west', 'up', 'down', 'south', 'north'] as const;

/** One raw face object. */
export function face(spec: Record<string, unknown> = {}): Record<string, unknown> {
  return { uv: [0, 0, 16, 16], texture: 0, ...spec };
}

/** All six faces of a cube, each textured with `texture`. */
export function fullFaces(texture = 0): Record<string, unknown> {
  const faces: Record<string, unknown> = {};
  for (const direction of FACE_DIRECTIONS) {
    faces[direction] = face({ texture });
  }
  return faces;
}

/** One raw cube. Defaults to a 16x16x16 box at the model origin with all faces textured. */
export function cube(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'body',
    uuid: 'cube-1',
    from: [0, 0, 0],
    to: [16, 16, 16],
    origin: [0, 0, 0],
    rotation: [0, 0, 0],
    faces: fullFaces(),
    ...overrides,
  };
}

/** One raw outliner bone. */
export function bone(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'root',
    uuid: 'bone-1',
    origin: [0, 0, 0],
    rotation: [0, 0, 0],
    children: [],
    ...overrides,
  };
}

/** A complete, valid document with one bone holding one cube. */
export function model(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'probe',
    resolution: { width: 16, height: 16 },
    elements: [cube()],
    outliner: [bone({ children: ['cube-1'] })],
    textures: [],
    animations: [],
    ...overrides,
  };
}
