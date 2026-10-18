/**
 * Specs for texture path resolution and `THREE.Texture` construction.
 *
 * The rule under test is the sibling-PNG convention: an item model names a texture path, and
 * the file it means sits beside the model, named after the last segment of that path. The
 * namespaced cases (`minecraft:...`) are the ones that matter, because those files are in the
 * game's jar and must degrade instead of throwing.
 */

import * as THREE from 'three';

import {
  createItemTexture,
  emissiveFileName,
  isNamespacedTexturePath,
  itemTextureFileName,
  resolveItemTextureUrls,
  stripNamespace,
  ITEM_EMISSIVE_SUFFIX,
  ITEM_TEXTURE_EXTENSION,
} from './textures';
import { stubLoader } from './testing/fixtures';

const MODEL_URL = '/models/items/tlaloc/tlaloc_hat.json';

describe('stripNamespace', () => {
  it('removes a namespace prefix and leaves an un-namespaced path alone', () => {
    expect(stripNamespace('minecraft:item/paper')).toBe('item/paper');
    expect(stripNamespace('item/custom/tlaloc/tlaloc_hat')).toBe('item/custom/tlaloc/tlaloc_hat');
    expect(stripNamespace('')).toBe('');
  });
});

describe('isNamespacedTexturePath', () => {
  it('recognises the namespace separator', () => {
    expect(isNamespacedTexturePath('minecraft:item/netherite_sword')).toBe(true);
    expect(isNamespacedTexturePath('yokai:item/custom/tlaloc/tlaloc_hat')).toBe(true);
    expect(isNamespacedTexturePath('item/custom/tlaloc/tlaloc_hat')).toBe(false);
    expect(isNamespacedTexturePath(':item/paper')).toBe(false);
  });
});

describe('itemTextureFileName', () => {
  it('takes the last path segment and adds the extension', () => {
    expect(itemTextureFileName('item/custom/tlaloc/tlaloc_hat')).toBe('tlaloc_hat.png');
    expect(itemTextureFileName('tlaloc_staff')).toBe('tlaloc_staff.png');
  });

  it('resolves a namespaced path the same way, without the namespace', () => {
    expect(itemTextureFileName('minecraft:item/netherite_sword')).toBe('netherite_sword.png');
  });

  it('does not double an extension that is already there', () => {
    expect(itemTextureFileName('item/custom/tlaloc/tlaloc_hat.png')).toBe('tlaloc_hat.png');
  });

  it('resolves a trailing slash to the last named segment, and rejects no name at all', () => {
    expect(itemTextureFileName('item/custom/tlaloc/')).toBe('tlaloc.png');
    expect(() => itemTextureFileName('')).toThrow(/has no file name to resolve/);
    expect(() => itemTextureFileName('/')).toThrow(/has no file name to resolve/);
  });

  it('accepts another extension, for a caller with a different convention', () => {
    expect(itemTextureFileName('item/custom/tlaloc/tlaloc_hat', '.tga')).toBe('tlaloc_hat.tga');
    expect(ITEM_TEXTURE_EXTENSION).toBe('.png');
  });
});

describe('emissiveFileName', () => {
  it('inserts the suffix the asset declares, before the extension', () => {
    expect(emissiveFileName('tlaloc_staff.png')).toBe('tlaloc_staff_e.png');
    expect(ITEM_EMISSIVE_SUFFIX).toBe('_e');
  });

  it('appends when there is no extension to insert before', () => {
    expect(emissiveFileName('tlaloc_staff')).toBe('tlaloc_staff_e');
    expect(emissiveFileName('.tlaloc')).toBe('.tlaloc_e');
  });
});

describe('resolveItemTextureUrls', () => {
  it('places the texture and its emissive companion beside the model', () => {
    expect(resolveItemTextureUrls(MODEL_URL, 'item/custom/tlaloc/tlaloc_hat')).toEqual({
      url: '/models/items/tlaloc/tlaloc_hat.png',
      emissiveUrl: '/models/items/tlaloc/tlaloc_hat_e.png',
    });
  });

  it('uses the model URL directory, not the texture path directory', () => {
    expect(resolveItemTextureUrls('/a/b/model.json', 'item/custom/tlaloc/tlaloc_staff')).toEqual({
      url: '/a/b/tlaloc_staff.png',
      emissiveUrl: '/a/b/tlaloc_staff_e.png',
    });
  });

  it('resolves a namespaced path to a file that is simply not there', () => {
    // The point of this case: a namespaced texture is a *candidate URL*, never a crash. The
    // caller observes whether it responds (`createFetchTextureProbe`) and the scene reports
    // the result, which is how `netherite_sword.json` renders as a degraded sprite.
    expect(resolveItemTextureUrls(MODEL_URL, 'minecraft:item/netherite_sword')).toEqual({
      url: '/models/items/tlaloc/netherite_sword.png',
      emissiveUrl: '/models/items/tlaloc/netherite_sword_e.png',
    });
  });

  it('handles a model URL with no directory, and a custom suffix', () => {
    expect(resolveItemTextureUrls('model.json', 'a/b/c')).toEqual({
      url: 'c.png',
      emissiveUrl: 'c_e.png',
    });
    expect(resolveItemTextureUrls('', 'a/b/c', '_glow').emissiveUrl).toBe('c_glow.png');
  });
});

describe('createItemTexture', () => {
  it('loads through the injected loader and applies the pixel-art flags', () => {
    const loader = stubLoader();
    const texture = createItemTexture(loader, '/a/b/tlaloc_hat.png', { name: 'tlaloc_hat' });

    expect(loader.urls).toEqual(['/a/b/tlaloc_hat.png']);
    expect(texture.name).toBe('tlaloc_hat');
    // `flipY` stays true because `geometry.ts` flips V itself; the two must not both flip.
    expect(texture.flipY).toBe(true);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(texture.generateMipmaps).toBe(true);
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.userData['emissive']).toBeUndefined();
  });

  it('marks an emissive companion without renaming what the loader produced', () => {
    const loader = stubLoader();
    const texture = createItemTexture(loader, '/a/b/tlaloc_staff_e.png', { emissive: true });

    expect(texture.userData['emissive']).toBe(true);
    // No `name` option: the texture keeps whatever the loader gave it.
    expect(texture.name).toBe('/a/b/tlaloc_staff_e.png');
  });
});
