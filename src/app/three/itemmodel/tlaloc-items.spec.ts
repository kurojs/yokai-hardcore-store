/**
 * End-to-end specs against the real item assets in `public/models/items/tlaloc/`.
 *
 * The numbers here are measured facts about those files — element and face counts, rotated
 * bounds, the two faces that sample outside the atlas — so this file is also a staleness
 * gate: if the assets are re-exported, these assertions fail and the item section of
 * `../README.md` has to be revisited.
 *
 * Texture availability is *observed* rather than asserted from a table: the probe below is
 * the same one the dev route uses, backed by the filesystem instead of an HTTP request, so
 * "the hat's texture is there and the sword's is not" is a fact about the repository.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import {
  createItemModelScene,
  itemModelTexturePaths,
  parseItemModel,
  resolveItemTextures,
  type ItemModel,
  type ItemScene,
  type ItemTextureProbe,
} from './index';
import { itemTextureFileName } from './textures';
import { stubLoader } from './testing/fixtures';

/**
 * Repository root from this spec's own location.
 *
 * Not `new URL('../../', import.meta.url)`: the Vite transform rewrites that literal form
 * into a served asset URL, which `fileURLToPath` rejects.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const ITEM_DIR = path.join(REPO_ROOT, 'public', 'models', 'items', 'tlaloc');

/** Raw JSON, read once. */
const RAW = new Map(
  ['tlaloc_hat', 'tlaloc_staff', 'netherite_sword', 'paper'].map((name) => [
    name,
    JSON.parse(fs.readFileSync(path.join(ITEM_DIR, `${name}.json`), 'utf8')) as Record<string, unknown>,
  ]),
);

const MODEL_URL = (name: string): string => `/models/items/tlaloc/${name}.json`;

/**
 * A probe over the real files.
 *
 * `/models/...` is the URL the browser would request; in this process it maps to
 * `public/models/...`, which is exactly where the dev server serves it from. A 404 and a
 * missing file are the same fact here.
 */
const fileProbe: ItemTextureProbe = {
  async probe(url: string): Promise<boolean> {
    const relative = url.replace(/^\//, '');
    return fs.existsSync(path.join(REPO_ROOT, 'public', relative));
  },
};

/** Parses a real document, measures its textures against the real files, and builds it. */
async function buildReal(name: string): Promise<ItemScene> {
  const raw = RAW.get(name);
  if (raw === undefined) throw new Error(`no raw document for ${name}`);
  const model = parseItemModel(raw);
  const bindings = await resolveItemTextures(MODEL_URL(name), itemModelTexturePaths(model), fileProbe);

  return createItemModelScene(raw, {
    resolveTexture: (texturePath) => bindings.get(texturePath) ?? { url: null },
    loadTexture: stubLoader(),
  });
}

/** The validated model, for assertions about parsing rather than rendering. */
function parsedReal(name: string): ItemModel {
  const raw = RAW.get(name);
  if (raw === undefined) throw new Error(`no raw document for ${name}`);
  return parseItemModel(raw);
}

describe('the real item assets', () => {
  it('ships exactly the files these specs depend on', () => {
    expect(fs.readdirSync(ITEM_DIR).sort()).toEqual([
      'emissive.properties',
      'netherite_sword.json',
      'paper.json',
      'tlaloc_hat.json',
      'tlaloc_hat.png',
      'tlaloc_staff.json',
      'tlaloc_staff.png',
      'tlaloc_staff_e.png',
    ]);
    // The suffix the assets declare, which is what makes `tlaloc_staff_e.png` the emissive
    // companion of `tlaloc_staff.png`.
    expect(fs.readFileSync(path.join(ITEM_DIR, 'emissive.properties'), 'utf8').trim()).toBe(
      'suffix.emissive=_e',
    );
  });

  describe('tlaloc_hat', () => {
    it('parses the measured arithmetic', () => {
      const model = parsedReal('tlaloc_hat');

      expect(model.kind).toBe('geometry');
      expect(model.elements).toHaveLength(29);
      expect(model.elements.reduce((total, element) => total + element.faces.length, 0)).toBe(174);
      expect(model.textureSize).toEqual({ width: 64, height: 64 });
      expect(model.textures.map((texture) => [texture.key, texture.path, texture.isParticle])).toEqual([
        ['0', 'item/custom/tlaloc/tlaloc_hat', false],
        ['particle', 'item/custom/tlaloc/tlaloc_hat', true],
      ]);
      expect(model.display.map((display) => display.context)).toEqual([
        'thirdperson_righthand',
        'thirdperson_lefthand',
        'firstperson_righthand',
        'firstperson_lefthand',
        'ground',
        'gui',
        'head',
        'fixed',
      ]);

      // Every element carries exactly one axis-angle rotation, over y, z and x.
      expect(model.elements.every((element) => element.rotations.length === 1)).toBe(true);
      const axes = new Set(model.elements.map((element) => element.rotations[0].axis));
      expect([...axes].sort()).toEqual(['x', 'y', 'z']);
      const angles = new Set(model.elements.map((element) => element.rotations[0].angle));
      expect([...angles].sort((a, b) => a - b)).toEqual([-45, -22.5, 0, 22.5, 45]);
    });

    it('reports the two faces that sample outside the texture, without failing', () => {
      const model = parsedReal('tlaloc_hat');

      // Elements 1 and 2 have a `down` face whose v of 22.5..24 is pixel 90..96 of a 64-tall
      // texture. Nothing throws: it is a defect in the art, not in the reader.
      const outside = model.elements.flatMap((element) =>
        element.faces.filter((face) => face.uv[3] * 4 > 64),
      );
      expect(outside).toHaveLength(2);
      expect(outside.map((face) => [face.direction, face.uv])).toEqual([
        ['down', [4.5, 22.5, 3.75, 24]],
        ['down', [3.75, 22.5, 4.5, 24]],
      ]);

      expect(model.warnings).toHaveLength(1);
      expect(model.warnings[0]).toContain('2 face(s) sample outside the 64x64 texture');
    });

    it('renders one mesh per element with the texture loaded', async () => {
      const scene = await buildReal('tlaloc_hat');

      expect(scene.stats.elements).toBe(29);
      expect(scene.stats.faces).toBe(174);
      expect(scene.stats.meshes).toBe(29);
      expect(scene.stats.triangles).toBe(348);
      expect(scene.stats.textures).toEqual([
        {
          key: '0',
          path: 'item/custom/tlaloc/tlaloc_hat',
          url: '/models/items/tlaloc/tlaloc_hat.png',
          status: 'loaded',
          emissive: false,
        },
      ]);

      const mesh = scene.root.children[0] as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.map).not.toBeNull();
      expect(material.map?.flipY).toBe(true);
      expect(material.emissiveMap).toBeNull();

      scene.dispose();
    });

    it('measures the rotated bounds of the whole model', async () => {
      const scene = await buildReal('tlaloc_hat');
      const { min, max } = scene.stats.modelBounds;

      expect(min[0]).toBeCloseTo(-1.9087708815680333, 9);
      expect(min[1]).toBeCloseTo(-10.1, 9);
      expect(min[2]).toBeCloseTo(-1.2433061219327186, 9);
      expect(max[0]).toBeCloseTo(17.90877088156803, 9);
      expect(max[1]).toBeCloseTo(12.94828, 9);
      expect(max[2]).toBeCloseTo(22.5236190793346, 9);

      // Rotated bounds are not the authored corners: without the rotation the box would be
      // 2.06..13.94 by -10.1..12.95 by 1.04..25.86.
      expect(max[0]).toBeGreaterThan(17.9);

      scene.dispose();
    });
  });

  describe('tlaloc_staff', () => {
    it('parses the measured arithmetic, including the rotated faces', () => {
      const model = parsedReal('tlaloc_staff');

      expect(model.elements).toHaveLength(37);
      expect(model.elements.reduce((total, element) => total + element.faces.length, 0)).toBe(222);
      expect(model.textureSize).toEqual({ width: 64, height: 64 });
      expect(model.warnings).toEqual([]);

      // 12 of the staff's faces carry a UV rotation, and every one of them is a quarter turn
      // on an up/down face (six at 90 degrees, six at 270).
      const rotated = model.elements.flatMap((element) =>
        element.faces.filter((face) => face.rotation !== 0),
      );
      expect(rotated).toHaveLength(12);
      expect([...new Set(rotated.map((face) => face.rotation))].sort((a, b) => a - b)).toEqual([
        90, 270,
      ]);
      expect(rotated.every((face) => face.direction === 'up' || face.direction === 'down')).toBe(
        true,
      );
    });

    it('loads the base texture and its emissive companion', async () => {
      const scene = await buildReal('tlaloc_staff');

      expect(scene.stats.elements).toBe(37);
      expect(scene.stats.faces).toBe(222);
      expect(scene.stats.triangles).toBe(444);
      expect(scene.stats.textures).toEqual([
        {
          key: '0',
          path: 'item/custom/tlaloc/tlaloc_staff',
          url: '/models/items/tlaloc/tlaloc_staff.png',
          status: 'loaded',
          emissive: true,
        },
      ]);

      const material = (scene.root.children[0] as THREE.Mesh)
        .material as THREE.MeshStandardMaterial;
      expect(material.emissiveMap).not.toBeNull();
      expect(material.emissive.getHexString()).toBe('ffffff');

      scene.dispose();
    });

    it('measures the rotated bounds of the whole model', async () => {
      const scene = await buildReal('tlaloc_staff');
      const { min, max } = scene.stats.modelBounds;

      expect(min[0]).toBeCloseTo(1.9699999999999998, 9);
      expect(min[1]).toBeCloseTo(-17.524737587392284, 9);
      expect(min[2]).toBeCloseTo(2.75, 9);
      expect(max[0]).toBeCloseTo(14.03, 9);
      expect(max[1]).toBeCloseTo(23.825, 9);
      expect(max[2]).toBeCloseTo(13.25, 9);

      scene.dispose();
    });
  });

  describe('the two parent-driven sprites', () => {
    it('reads the parent and the texture slot out of each file', () => {
      const sword = parsedReal('netherite_sword');
      const paper = parsedReal('paper');

      expect(sword.kind).toBe('sprite');
      expect(sword.sprite).toEqual({
        textureKey: 'layer0',
        texturePath: 'minecraft:item/netherite_sword',
        parent: 'minecraft:item/handheld',
      });
      expect(paper.sprite?.parent).toBe('minecraft:item/generated');
      expect(paper.sprite?.texturePath).toBe('minecraft:item/paper');

      // Neither declares `elements` or `display`, and neither declares a texture size.
      expect(sword.elements).toEqual([]);
      expect(sword.display).toEqual([]);
      expect(paper.display).toEqual([]);
    });

    it('degrades to a marker quad because the textures live in the game jar', async () => {
      for (const [name, expectedParent] of [
        ['netherite_sword', 'minecraft:item/handheld'],
        ['paper', 'minecraft:item/generated'],
      ] as const) {
        const model = parsedReal(name);
        const [texturePath] = itemModelTexturePaths(model);

        // The namespaced path resolves to a sibling PNG that is not in this repository.
        expect(texturePath.startsWith('minecraft:')).toBe(true);
        expect(fs.existsSync(path.join(ITEM_DIR, itemTextureFileName(texturePath)))).toBe(false);

        const scene = await buildReal(name);

        expect(scene.stats.kind).toBe('sprite');
        expect(scene.stats.elements).toBe(1);
        expect(scene.stats.faces).toBe(2);
        expect(scene.stats.triangles).toBe(4);
        expect(scene.stats.modelBounds.min).toEqual([0, 0, 7.5]);
        expect(scene.stats.modelBounds.max).toEqual([16, 16, 8.5]);
        expect(scene.stats.textures[0].status).toBe('unavailable');
        expect(scene.stats.warnings).toHaveLength(1);
        expect(scene.stats.warnings[0]).toContain(`texture "${texturePath}" is not available`);

        const material = (scene.root.children[0] as THREE.Mesh)
          .material as THREE.MeshStandardMaterial;
        expect(material.name).toBe('itemmodel-missing-texture');
        expect(material.map).toBeNull();
        // The parent is still reported, so a HUD can say which vanilla asset is missing.
        expect(parsedReal(name).sprite?.parent).toBe(expectedParent);

        scene.dispose();
      }
    });

    it('is not asked for the particle declaration, which no face samples', () => {
      for (const name of ['tlaloc_hat', 'tlaloc_staff', 'netherite_sword', 'paper']) {
        const paths = itemModelTexturePaths(parsedReal(name));
        expect(paths).toHaveLength(1);
        expect(paths[0]).not.toBe('particle');
      }
    });
  });
});
