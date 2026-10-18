/**
 * Embedded `.bbmodel` textures -> `THREE.Texture`.
 *
 * Blockbench embeds a model's textures as base64 in the JSON (`textures[].source`) rather
 * than pointing at a file, so there is no URL a browser could fetch. The real asset stores
 * `data:image/png;base64,...` URIs; a bare base64 payload is also accepted and is given a
 * mime type sniffed from its magic bytes.
 *
 * This is the one module in `bbmodel/` allowed to touch the DOM, and even here the actual
 * load goes through an injected `TextureLoaderLike`. That keeps the whole path testable in
 * jsdom without a WebGL context and without waiting on an image decode that never fires
 * headlessly.
 */

import * as THREE from 'three';

import type { BbTextureRef } from './types';

/**
 * The subset of `THREE.TextureLoader` this module needs. `TextureLoader` satisfies it
 * structurally: its extra callback parameters are optional, and its return type
 * (`Texture<HTMLImageElement>`) is assignable to `THREE.Texture`.
 */
export interface TextureLoaderLike {
  load(url: string): THREE.Texture;
}

/** Every error this module throws is prefixed so callers can identify the source. */
const ERROR_PREFIX = 'bbmodel textures:';

/** Magic-byte prefixes for the image formats Blockbench embeds. */
const MAGIC_BYTES: readonly { readonly mime: string; readonly bytes: readonly number[] }[] = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
];

/** Strips a data-URI prefix if present, leaving the bare base64 payload. */
export function base64Payload(source: string): string {
  const comma = source.indexOf(',');
  if (source.startsWith('data:') && comma !== -1) {
    return source.slice(comma + 1);
  }
  return source;
}

/**
 * Decodes a texture source to bytes.
 *
 * Uses `atob` when it exists (browsers, jsdom) and `Buffer` otherwise (plain Node), so the
 * same code runs in the app and in a verification script.
 */
export function decodeTextureSource(source: string): Uint8Array {
  const payload = base64Payload(source);
  if (payload.length === 0) {
    throw new Error(`${ERROR_PREFIX} texture source is empty`);
  }
  if (typeof atob === 'function') {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const globalBuffer = (globalThis as { Buffer?: { from(input: string, encoding: string): Uint8Array } })
    .Buffer;
  if (globalBuffer !== undefined) {
    return new Uint8Array(globalBuffer.from(payload, 'base64'));
  }
  throw new Error(`${ERROR_PREFIX} no base64 decoder available in this environment`);
}

/** Sniffs the mime type from the decoded bytes, or `null` when unrecognised. */
export function sniffImageMime(bytes: Uint8Array): string | null {
  for (const candidate of MAGIC_BYTES) {
    if (candidate.bytes.every((byte, index) => bytes[index] === byte)) return candidate.mime;
  }
  return null;
}

/**
 * Normalises a texture source into a data URI a `TextureLoader` can consume.
 *
 * @throws Error when the payload is not a recognised image format.
 */
export function toDataUri(source: string): string {
  if (source.startsWith('data:image/')) return source;
  const bytes = decodeTextureSource(source);
  const mime = sniffImageMime(bytes);
  if (mime === null) {
    throw new Error(
      `${ERROR_PREFIX} unrecognised image format; expected PNG, JPEG or GIF magic bytes`,
    );
  }
  return `data:${mime};base64,${base64Payload(source)}`;
}

/** Pixel size read from a PNG's IHDR chunk, or `null` when the payload is not a PNG. */
export function readPngSize(source: string): { width: number; height: number } | null {
  const bytes = decodeTextureSource(source);
  if (sniffImageMime(bytes) !== 'image/png') return null;
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Options accepted by {@link createEmbeddedTexture}. */
export interface EmbeddedTextureOptions {
  /** Marks the texture as an emissive companion layer. */
  readonly emissive?: boolean;
}

/**
 * Builds a `THREE.Texture` from an embedded source.
 *
 * `flipY` is set explicitly because it is load-bearing: the UV math in `geometry.ts`
 * flips V under the assumption that three keeps the default `flipY = true`.
 */
export function createEmbeddedTexture(
  ref: BbTextureRef,
  loader: TextureLoaderLike,
  options: EmbeddedTextureOptions = {},
): THREE.Texture {
  const texture = loader.load(toDataUri(ref.source));
  texture.name = ref.name;
  texture.flipY = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  // Pixel-art atlas: point sampling on magnification, mipmaps on minification.
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  if (options.emissive === true) {
    texture.userData['emissive'] = true;
  }
  return texture;
}
