/**
 * Integration and reproducibility specs for the generated catalog.
 *
 * These run the real generator over the real repository inputs, so they also act
 * as a staleness gate: editing a source asset or the copy without regenerating
 * `data/catalog.json` fails the suite with an actionable message.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditCatalog, buildCatalog } from '../../scripts/lib/normalize.mjs';
import { readCatalogInputs } from '../../scripts/lib/repo-assets.mjs';

/**
 * Repository root, derived from this spec's own location.
 *
 * Deliberately NOT `new URL('../../', import.meta.url)`: the Vite/Vitest
 * transform rewrites that literal form into a static asset URL
 * (`http://localhost:3000/@fs/...`), which `fileURLToPath` then rejects with
 * "The URL must be of scheme file".
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CATALOG_FILE = path.join(REPO_ROOT, 'data', 'catalog.json');

/** Runs the real generator over the real repository inputs. */
function generate() {
  const { sourceProducts, categoryCopy, productIndex, assetPaths, itemModels, fallbackProducts } =
    readCatalogInputs(REPO_ROOT);
  const catalog = buildCatalog({ sourceProducts, categoryCopy, productIndex, assetPaths, itemModels });
  return { catalog, fallbackProducts };
}

function serialize(catalog: unknown): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

const generated = generate();
const products = (generated.catalog as { products: any[] }).products;
const categories = (generated.catalog as { categories: any[] }).categories;

describe('generated catalog determinism', () => {
  it('produces byte-identical output when run twice', () => {
    const first = generate().catalog;
    const second = generate().catalog;
    expect(serialize(first)).toBe(serialize(second));
  });

  it('produces byte-identical output when the source array order is reversed', () => {
    const inputs = readCatalogInputs(REPO_ROOT);
    const params = {
      categoryCopy: inputs.categoryCopy,
      assetPaths: inputs.assetPaths,
      itemModels: inputs.itemModels,
    };
    const forward = buildCatalog({
      ...params,
      sourceProducts: inputs.sourceProducts,
      productIndex: inputs.productIndex,
    });
    const reversed = buildCatalog({
      ...params,
      sourceProducts: [...inputs.sourceProducts].reverse(),
      productIndex: [...inputs.productIndex].reverse(),
    });
    expect(serialize(reversed)).toBe(serialize(forward));
  });

  it('has no timestamp or other run-varying field', () => {
    expect(serialize(generated.catalog)).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(Object.keys(generated.catalog as Record<string, unknown>)).toEqual([
      'schemaVersion',
      'categories',
      'products',
    ]);
  });

  it('matches the committed data/catalog.json byte for byte', () => {
    expect(fs.readFileSync(CATALOG_FILE, 'utf8')).toBe(serialize(generated.catalog));
  });
});

describe('generated catalog contents', () => {

  it('emits exactly 48 products', () => {
    expect(products).toHaveLength(48);
  });

  it('emits exactly 10 categories', () => {
    expect(categories).toHaveLength(10);
  });

  it('gives every product a non-empty id, slug and name', () => {
    for (const product of products) {
      expect(product.id.length).toBeGreaterThan(0);
      expect(product.slug.length).toBeGreaterThan(0);
      expect(product.name.length).toBeGreaterThan(0);
      expect(product.description.length).toBeGreaterThan(0);
    }
  });

  it('gives every category a non-empty id, slug, name and description', () => {
    for (const category of categories) {
      expect(category.id.length).toBeGreaterThan(0);
      expect(category.slug.length).toBeGreaterThan(0);
      expect(category.name.length).toBeGreaterThan(0);
      expect(category.description.length).toBeGreaterThan(0);
    }
  });

  it('has unique ids and slugs', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
    expect(new Set(categories.map((c) => c.id)).size).toBe(categories.length);
  });

  it('has only lowercase ASCII slug characters', () => {
    for (const item of [...products, ...categories]) {
      expect(item.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('uses only lowercase ASCII slug characters in ids too', () => {
    for (const item of [...products, ...categories]) {
      expect(item.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('keeps the Cofres/Ofertas slash out of the category id while preserving the display name', () => {
    const cofres = categories.find((c) => c.id === 'cofres-ofertas');
    expect(cofres).toBeDefined();
    expect(cofres.name).toBe('Cofres/Ofertas');
  });

  it('has no name or description with a double space or untrimmed whitespace', () => {
    for (const item of [...products, ...categories]) {
      for (const field of ['name', 'description'] as const) {
        const value = item[field] as string;
        expect(value).toBe(value.trim());
        expect(value).not.toMatch(/\s{2,}/);
      }
    }
  });

  it('has no residual accent-stripped token anywhere', () => {
    expect(auditCatalog(generated.catalog).residualPlainForms).toEqual([]);
  });

  it('keeps the real accented copy instead of the JSON transliteration', () => {
    const byId = new Map(products.map((p) => [p.id, p]));
    expect(byId.get('caliz-de-ponce-de-leon')!.name).toBe('Cáliz de Ponce de León');
    expect(byId.get('corazon-de-hydra')!.name).toBe('Corazón De Hydra');
    expect(byId.get('amuleto-del-clerigo')!.name).toBe('Amuleto del Clérigo');
    expect(byId.get('celulas-de-kaiyin')!.name).toBe('Células De Kaiyin');
    expect(categories.find((c) => c.id === 'artefactos-magicos')!.name).toBe('Artefactos Mágicos');
    expect(categories.find((c) => c.id === 'resucitacion')!.name).toBe('RESUCITACIÓN');
  });

  it('collapses the real double-space product names', () => {
    const byId = new Map(products.map((p) => [p.id, p]));
    expect(byId.get('bolsa-de-10-yokai')!.name).toBe('Bolsa de 10 Yokai');
    expect(byId.get('ojo-de-odin')!.name).toBe('Ojo De Odin');
    expect(byId.get('cupon-de-la-horda-del-gran-kan')!.name).toBe('Cupón de la Horda del Gran Kan');
    expect(byId.get('cupon-canjeable-para-familiar')!.name).toBe('CUPÓN CANJEABLE PARA FAMILIAR');
  });

  it('strips the embedded quotes from the quoting case', () => {
    const product = products.find((p) => p.id === 'cupon-de-invocacion-todo-esta-pegajoso');
    expect(product.name).toBe('Cupón de Invocación Todo Está Pegajoso');
    expect(product.name).not.toContain('"');
  });

  it('keeps every imageUrl on the Tebex CDN', () => {
    for (const product of products) {
      expect(product.imageUrl).toMatch(/^https:\/\/dunb17ur4ymx4\.cloudfront\.net\//);
    }
  });

  it('gives every product a working local fallback image', () => {
    expect(products.filter((p) => p.localImage === null)).toEqual([]);
    for (const product of products) {
      expect(product.localImage).toMatch(/^\/products\/[a-z0-9-]+\/imagen\.(png|jpe?g|gif)$/);
      expect(fs.existsSync(path.join(REPO_ROOT, 'public', product.localImage))).toBe(true);
    }
  });

  it('gives every category banner a path that exists in the repo', () => {
    const withBanner = categories.filter((c) => c.bannerImage !== null);
    expect(withBanner).toHaveLength(7);
    for (const category of withBanner) {
      expect(fs.existsSync(path.join(REPO_ROOT, 'public', category.bannerImage))).toBe(true);
    }
  });

  it('references an existing category for every product', () => {
    const ids = new Set(categories.map((c) => c.id));
    for (const product of products) {
      expect(ids.has(product.categoryId)).toBe(true);
    }
  });

  it('reconciles productCount with the products themselves', () => {
    const counted = new Map<string, number>();
    for (const product of products) {
      counted.set(product.categoryId, (counted.get(product.categoryId) ?? 0) + 1);
    }
    for (const category of categories) {
      expect(category.productCount).toBe(counted.get(category.id));
    }
    expect([...counted.values()].reduce((a, b) => a + b, 0)).toBe(products.length);
  });

  it('preserves the source price distribution exactly', () => {
    const distribution = new Map<number, number>();
    for (const product of products) {
      distribution.set(product.priceUsd, (distribution.get(product.priceUsd) ?? 0) + 1);
    }
    expect([...distribution].sort((a, b) => a[0] - b[0])).toEqual([
      [1, 12],
      [2, 13],
      [3, 9],
      [4, 4],
      [5, 8],
      [10, 2],
    ]);
  });

  it('exposes every product source folder for traceability', () => {
    for (const product of products) {
      expect(typeof product.sourceFolder).toBe('string');
      expect(product.sourceFolder.length).toBeGreaterThan(0);
    }
  });

  it('reports no copy that had to fall back to the plain JSON text', () => {
    expect(generate().fallbackProducts).toEqual([]);
  });

  it('leaves modelPath null because no item model corresponds to a catalog product', () => {
    expect(products.every((p) => p.modelPath === null)).toBe(true);
  });
});

describe('copied assets on disk', () => {
  it('has the brand renders', () => {
    const brand = fs.readdirSync(path.join(REPO_ROOT, 'public', 'brand')).sort();
    expect(brand).toEqual(['final.jpg', 'yokai_1.png']);
  });

  it('has both boss blueprints', () => {
    const bosses = fs.readdirSync(path.join(REPO_ROOT, 'public', 'models', 'bosses')).sort();
    expect(bosses).toEqual(['tlaloc.bbmodel', 'tlaloc_sacrifice.bbmodel']);
  });

  it('has the item models and their textures', () => {
    const items = fs.readdirSync(path.join(REPO_ROOT, 'public', 'models', 'items', 'tlaloc')).sort();
    expect(items).toEqual([
      'emissive.properties',
      'netherite_sword.json',
      'paper.json',
      'tlaloc_hat.json',
      'tlaloc_hat.png',
      'tlaloc_staff.json',
      'tlaloc_staff.png',
      'tlaloc_staff_e.png',
    ]);
  });

  it('has both schematics at their original byte sizes', () => {
    const schematics = fs.readdirSync(path.join(REPO_ROOT, 'public', 'schematics')).sort();
    expect(schematics).toEqual(['IcePalace.schematic', 'arenaTlalocBoss.schem']);
    expect(fs.statSync(path.join(REPO_ROOT, 'public', 'schematics', 'arenaTlalocBoss.schem')).size).toBe(117208);
    expect(fs.statSync(path.join(REPO_ROOT, 'public', 'schematics', 'IcePalace.schematic')).size).toBe(254803);
  });

  it('has one product image per product and no orphan folders', () => {
    const productDirs = fs.readdirSync(path.join(REPO_ROOT, 'public', 'products')).sort();
    expect(productDirs).toEqual(products.map((p: { id: string }) => p.id).sort());
  });

  it('stores no archive and no source drive path in the repo', () => {
    const packages = fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8');
    expect(packages).not.toContain('G:');
    for (const tracked of ['data/catalog.json', 'data/category-copy.json', 'data/source-index.json']) {
      const text = fs.readFileSync(path.join(REPO_ROOT, tracked), 'utf8');
      expect(text).not.toContain('G:\\\\');
      expect(text).not.toContain('C:\\\\');
    }
  });
});
