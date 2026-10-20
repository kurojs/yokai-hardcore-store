/**
 * The bridge from procedural pixel bytes to three.js resources.
 *
 * A `DataTexture` is the right shape here: the bytes already exist, so there is no image
 * decode, no network request and no `TextureLoader` — the landing scene has zero external
 * image dependencies. Nearest magnification keeps the 16px tiles crisp; mipmaps keep them from
 * shimmering as the camera drifts.
 */

import * as THREE from 'three';

import { BLOCK_PALETTE, type BlockKind } from './palette';
import { BLOCK_TEXTURE_SIZE, blockTexturePixels } from './pixels';

/** Builds the four-channel tile for one block kind. */
export function createBlockTexture(kind: BlockKind): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    blockTexturePixels(kind),
    BLOCK_TEXTURE_SIZE,
    BLOCK_TEXTURE_SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.name = `landing-${kind}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * A Minecraft-style lit block material.
 *
 * `MeshStandardMaterial` with full roughness keeps the flat, unlit-looking read the rest of
 * the project uses for Blockbench models. The lantern reuses its albedo as the emissive map:
 * its dark frame contributes almost nothing, so only the warm body and the teal glint glow.
 * That is one texture and one material per kind, which is what makes instancing cheap and
 * disposal auditable.
 */
export function createBlockMaterial(kind: BlockKind): THREE.MeshStandardMaterial {
  const style = BLOCK_PALETTE[kind];
  const texture = createBlockTexture(kind);
  return new THREE.MeshStandardMaterial({
    name: `landing-${kind}`,
    map: texture,
    metalness: 0,
    roughness: 1,
    emissive: new THREE.Color(style.emissive ? 0xffffff : 0x000000),
    emissiveMap: style.emissive ? texture : null,
    emissiveIntensity: style.emissive ? 1.6 : 0,
  });
}
