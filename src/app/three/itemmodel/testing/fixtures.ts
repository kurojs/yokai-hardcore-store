/**
 * Test-only builders for small Minecraft item model documents.
 *
 * Not imported by application code. Every builder returns a plain, permissively typed
 * document so a spec can break exactly one field and observe the parser's behaviour. The
 * real assets are exercised separately in `../tlaloc-items.spec.ts`.
 */

import * as THREE from 'three';

import type { ItemTextureLoaderLike } from '../textures';

/** One raw face. Defaults to the full 16-unit rect, textured through `#0`. */
export function itemFace(spec: Record<string, unknown> = {}): Record<string, unknown> {
  return { uv: [0, 0, 16, 16], texture: '#0', ...spec };
}

/** All six faces of a cube, each textured through `texture`. */
export function itemFaces(texture = '#0'): Record<string, unknown> {
  const faces: Record<string, unknown> = {};
  for (const direction of ['east', 'west', 'up', 'down', 'south', 'north']) {
    faces[direction] = itemFace({ texture });
  }
  return faces;
}

/** One raw element: a 16-unit box at the origin with all six faces. */
export function itemElement(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { from: [0, 0, 0], to: [16, 16, 16], faces: itemFaces(), ...overrides };
}

/** One raw element rotation, in the format's axis-angle form. */
export function itemRotation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { angle: 0, axis: 'y', origin: [8, 8, 8], ...overrides };
}

/** One raw `display` entry. */
export function itemDisplay(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { rotation: [0, 0, 0], translation: [0, 0, 0], scale: [1, 1, 1], ...overrides };
}

/** A complete, valid geometry document with one element and one texture. */
export function itemModel(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    credit: 'probe',
    texture_size: [64, 64],
    textures: { 0: 'item/custom/tlaloc/tlaloc_probe', particle: 'item/custom/tlaloc/tlaloc_probe' },
    elements: [itemElement()],
    display: { gui: itemDisplay() },
    ...overrides,
  };
}

/** A parent-driven sprite document: no `elements`, one `layer0` texture. */
export function spriteModel(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    parent: 'minecraft:item/handheld',
    textures: { layer0: 'minecraft:item/netherite_sword' },
    overrides: [{ predicate: { custom_model_data: 39541 }, model: 'item/tlaloc/tlaloc_staff' }],
    ...overrides,
  };
}

/** A loader stub that records the URLs it was asked for and decodes nothing. */
export function stubLoader(): ItemTextureLoaderLike & { readonly urls: readonly string[] } {
  const urls: string[] = [];
  return {
    urls,
    load(url: string): THREE.Texture {
      urls.push(url);
      const texture = new THREE.Texture();
      texture.name = url;
      return texture;
    },
  };
}
