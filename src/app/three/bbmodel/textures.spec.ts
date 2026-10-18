/**
 * Texture specs: embedded base64 handling.
 *
 * The real asset embeds two PNGs as data URIs, so decoding, mime sniffing and the colour
 * space / filter settings are all part of making the model look like it does in Blockbench.
 */

import * as THREE from 'three';

import {
  base64Payload,
  createEmbeddedTexture,
  decodeTextureSource,
  readPngSize,
  sniffImageMime,
  toDataUri,
  type TextureLoaderLike,
} from './textures';
import { TINY_PNG_BASE64, TINY_PNG_DATA_URI } from './testing/fixtures';

const JPEG_BASE64 = '/9j/4A==';
const GIF_BASE64 = 'R0lGODlh';
const UNKNOWN_BASE64 = 'AAEC';

describe('base64Payload', () => {
  it('strips a data-URI prefix', () => {
    expect(base64Payload(TINY_PNG_DATA_URI)).toBe(TINY_PNG_BASE64);
  });

  it('leaves a bare payload alone', () => {
    expect(base64Payload(TINY_PNG_BASE64)).toBe(TINY_PNG_BASE64);
  });
});

describe('decodeTextureSource', () => {
  it('decodes a bare base64 payload to bytes', () => {
    expect([...decodeTextureSource('AQID')]).toEqual([1, 2, 3]);
  });

  it('decodes a data URI', () => {
    const bytes = decodeTextureSource(TINY_PNG_DATA_URI);
    expect(bytes.subarray(0, 8)).toEqual(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  it('rejects an empty source', () => {
    expect(() => decodeTextureSource('')).toThrow(/texture source is empty/);
    expect(() => decodeTextureSource('data:image/png;base64,')).toThrow(/texture source is empty/);
  });
});

describe('sniffImageMime', () => {
  it('recognises PNG, JPEG and GIF magic bytes', () => {
    expect(sniffImageMime(decodeTextureSource(TINY_PNG_BASE64))).toBe('image/png');
    expect(sniffImageMime(decodeTextureSource(JPEG_BASE64))).toBe('image/jpeg');
    expect(sniffImageMime(decodeTextureSource(GIF_BASE64))).toBe('image/gif');
  });

  it('returns null for anything else', () => {
    expect(sniffImageMime(decodeTextureSource(UNKNOWN_BASE64))).toBeNull();
  });
});

describe('toDataUri', () => {
  it('passes an image data URI through untouched', () => {
    expect(toDataUri(TINY_PNG_DATA_URI)).toBe(TINY_PNG_DATA_URI);
  });

  it('gives a bare payload the mime type its magic bytes imply', () => {
    expect(toDataUri(TINY_PNG_BASE64)).toBe(TINY_PNG_DATA_URI);
    expect(toDataUri(JPEG_BASE64)).toBe(`data:image/jpeg;base64,${JPEG_BASE64}`);
  });

  it('rejects an unrecognised payload instead of guessing', () => {
    expect(() => toDataUri(UNKNOWN_BASE64)).toThrow(/unrecognised image format/);
  });
});

describe('readPngSize', () => {
  it('reads width and height from the IHDR chunk', () => {
    expect(readPngSize(TINY_PNG_BASE64)).toEqual({ width: 1, height: 1 });
  });

  it('returns null for a non-PNG payload', () => {
    expect(readPngSize(JPEG_BASE64)).toBeNull();
  });
});

describe('createEmbeddedTexture', () => {
  it('loads the normalised data URI and configures it for a pixel-art atlas', () => {
    const urls: string[] = [];
    const loader: TextureLoaderLike = {
      load: (url: string): THREE.Texture => {
        urls.push(url);
        return new THREE.Texture();
      },
    };

    const texture = createEmbeddedTexture(
      { index: 0, name: 'atlas.png', source: TINY_PNG_BASE64, isEmissive: false },
      loader,
    );

    expect(urls).toEqual([TINY_PNG_DATA_URI]);
    expect(texture.name).toBe('atlas.png');
    expect(texture.flipY).toBe(true);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
  });

  it('marks an emissive layer only when asked', () => {
    const loader: TextureLoaderLike = { load: () => new THREE.Texture() };
    const ref = { index: 1, name: 'atlas_e.png', source: TINY_PNG_BASE64, isEmissive: true };

    expect(createEmbeddedTexture(ref, loader, { emissive: true }).userData['emissive']).toBe(true);
    expect(createEmbeddedTexture(ref, loader).userData['emissive']).toBeUndefined();
  });
});
