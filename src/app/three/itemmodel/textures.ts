/**
 * Texture path -> URL resolution, and `THREE.Texture` construction.
 *
 * An item model never names a texture file. A face says `"#0"`, `textures["0"]` says
 * `"item/custom/tlaloc/tlaloc_hat"`, and the actual PNG is somewhere the format does not
 * describe — in the game it is resolved from the namespace into the resource pack. This
 * module holds the two decisions that follow from that, both kept platform-free:
 *
 * - **Where to look.** The assets here place each texture's PNG beside its model JSON, named
 *   after the last segment of the texture path. That rule is the sibling-PNG convention, and
 *   it resolves `item/custom/tlaloc/tlaloc_hat` to `models/items/tlaloc/tlaloc_hat.png`.
 *   A path whose file is not there — every `minecraft:` path, which points into the game's
 *   own jar — produces a URL that simply will not respond. That is not malformed input: it
 *   is the delegated case, and the caller reports it to the user instead of throwing.
 * - **How to sample it.** `flipY`, nearest magnification and sRGB, matching the bbmodel
 *   pipeline's flags so a pixel-art texture looks identical in both pipelines. The UV maths
 *   in `geometry.ts` flips V, which is only correct while `flipY` stays true.
 *
 * Only the loader touches the DOM, and it is injected, so the whole path is testable in
 * jsdom without a WebGL context and without waiting on an image decode.
 */

import * as THREE from 'three';

/** The subset of `THREE.TextureLoader` this module needs. */
export interface ItemTextureLoaderLike {
  load(url: string): THREE.Texture;
}

/** Extension used for the sibling-PNG convention. */
export const ITEM_TEXTURE_EXTENSION = '.png';

/**
 * Default emissive companion suffix.
 *
 * Declared by the asset itself: `public/models/items/tlaloc/emissive.properties` contains
 * `suffix.emissive=_e`, the OptiFine convention, and `tlaloc_staff_e.png` is the companion
 * the staff declares.
 */
export const ITEM_EMISSIVE_SUFFIX = '_e';

/** Strips a namespace prefix (`minecraft:item/paper` -> `item/paper`). */
export function stripNamespace(path: string): string {
  const colon = path.indexOf(':');
  return colon === -1 ? path : path.slice(colon + 1);
}

/** True when the path is namespaced, i.e. it points at another resource pack's asset. */
export function isNamespacedTexturePath(path: string): boolean {
  return /^[a-z0-9_.-]+:/i.test(path);
}

/**
 * The file name a texture path resolves to: its last segment plus the extension.
 *
 * `"item/custom/tlaloc/tlaloc_hat"` -> `"tlaloc_hat.png"`.
 */
export function itemTextureFileName(
  path: string,
  extension: string = ITEM_TEXTURE_EXTENSION,
): string {
  const segments = stripNamespace(path)
    .split('/')
    .filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  if (last === undefined) {
    throw new Error(`itemmodel textures: texture path "${path}" has no file name to resolve`);
  }
  if (last.endsWith(extension)) return last;
  return `${last}${extension}`;
}

/**
 * The emissive companion's file name: `tlaloc_staff.png` -> `tlaloc_staff_e.png`.
 *
 * The suffix is inserted before the extension, which is what `suffix.emissive=_e` means.
 */
export function emissiveFileName(fileName: string, suffix: string = ITEM_EMISSIVE_SUFFIX): string {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return `${fileName}${suffix}`;
  return `${fileName.slice(0, dot)}${suffix}${fileName.slice(dot)}`;
}

/** The directory part of a URL, always ending in `/`. */
function directoryOf(url: string): string {
  const slash = url.lastIndexOf('/');
  return slash === -1 ? '' : url.slice(0, slash + 1);
}

/**
 * Resolves a texture path to a candidate URL beside `modelUrl`, plus the emissive companion
 * beside it.
 *
 * Neither URL is probed here: existence is the caller's to observe, and a missing file is a
 * degraded state rather than an error.
 */
export function resolveItemTextureUrls(
  modelUrl: string,
  texturePath: string,
  suffix: string = ITEM_EMISSIVE_SUFFIX,
): { readonly url: string; readonly emissiveUrl: string } {
  const directory = directoryOf(modelUrl);
  const fileName = itemTextureFileName(texturePath);
  return {
    url: `${directory}${fileName}`,
    emissiveUrl: `${directory}${emissiveFileName(fileName, suffix)}`,
  };
}

/** Options for {@link createItemTexture}. */
export interface ItemTextureOptions {
  /** Name to give the texture, used by tests and by the dev HUD. */
  readonly name?: string;
  /** Marks the texture as an emissive companion layer. */
  readonly emissive?: boolean;
}

/**
 * Builds a `THREE.Texture` from a URL through an injected loader.
 *
 * The flags mirror `bbmodel/textures.ts`: Minecraft textures are pixel art, so magnification
 * is nearest; `flipY` stays at three's default because `geometry.ts` flips V itself.
 */
export function createItemTexture(
  loader: ItemTextureLoaderLike,
  url: string,
  options: ItemTextureOptions = {},
): THREE.Texture {
  const texture = loader.load(url);
  if (options.name !== undefined) texture.name = options.name;
  texture.flipY = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  if (options.emissive === true) texture.userData['emissive'] = true;
  return texture;
}
