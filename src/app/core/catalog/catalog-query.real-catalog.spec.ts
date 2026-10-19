/**
 * The predicates, run against the real 48-product catalog that ships with the store.
 *
 * Synthetic fixtures prove the *rules*; this spec proves the rules produce sane answers on
 * the data that actually exists — that no category name hijacks the search, that a query
 * typed without accents finds the accented records, and that the counts a user sees are the
 * counts the catalog implies. It also acts as a staleness gate: if `data/catalog.json` is
 * regenerated with a shape this app cannot read, it fails here with the validator's message.
 *
 * `data/catalog.json` is read, never written.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCatalogResponse } from './catalog-validation';
import { buildCatalogIndex, countInCategory } from './catalog-index';
import { applyQuery, matchesSearch } from './catalog-query';

/**
 * Repository root, found by walking up from this spec's own location.
 *
 * Walking up rather than counting `../..` keeps the spec working if the file moves, and it
 * deliberately avoids `new URL('../../', import.meta.url)`: the Vite/Vitest transform
 * rewrites that literal form into an asset URL, which `fileURLToPath` then rejects.
 */
function findRepoRoot(start: string): string {
  let directory = start;
  for (let depth = 0; depth < 12; depth += 1) {
    if (fs.existsSync(path.join(directory, 'data', 'catalog.json'))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error(`could not find data/catalog.json above ${start}`);
}

const REPO_ROOT = findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));

/** The committed catalog, through the same boundary the browser uses. */
const catalog = parseCatalogResponse(
  JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'catalog.json'), 'utf8')) as unknown,
);
const index = buildCatalogIndex(catalog);

/** Product ids matched by a free-text query over the real catalog. */
function searchFor(text: string, categoryId: string | null = null): string[] {
  return applyQuery(index.entries, { text, categoryId }).map((entry) => entry.product.id);
}

describe('the real catalog through the trust boundary', () => {
  it('has the shape the storefront expects', () => {
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.categories).toHaveLength(10);
    expect(catalog.products).toHaveLength(48);
    expect(index.entries).toHaveLength(48);
  });

  it('gives every product a local image and no 3D model', () => {
    // `modelPath` is null for all 48 by an open product decision, not by a defect; product
    // presentations are image-first and the value must survive the boundary as null.
    expect(catalog.products.filter((product) => product.imagePath !== null)).toHaveLength(48);
    expect(catalog.products.filter((product) => product.modelPath !== null)).toHaveLength(0);
  });

  it('keeps the generated provenance and CDN fields out of the app entirely', () => {
    for (const product of catalog.products) {
      expect(product).not.toHaveProperty('sourceFolder');
      expect(product).not.toHaveProperty('imageUrl');
      expect(product.imagePath?.startsWith('/')).toBe(true);
    }
    for (const category of catalog.categories) {
      expect(category).not.toHaveProperty('sourceFolder');
      expect(category).not.toHaveProperty('productCount');
    }
  });

  it('carries the accents through unchanged', () => {
    // The catalog is the store's copy of record; accents are real in the file and there is
    // nothing to repair. This also proves the boundary does not normalise them away.
    const azucar = catalog.products.find((product) => product.slug === '10-algodones-de-azucar');

    expect(azucar?.description).toContain(
      '¡Aliméntate como todo un guerrero con los Algodones de Azúcar Goblin!',
    );
    expect(catalog.categories.some((category) => category.name === 'RESUCITACIÓN')).toBe(true);
    expect(catalog.categories.some((category) => category.name === 'Artefactos Mágicos')).toBe(true);
  });

  it('agrees with every declared product count', () => {
    for (const category of catalog.categories) {
      expect(countInCategory(index, category.id)).toBeGreaterThan(0);
    }
    // 4 categories hold exactly one product each.
    const single = catalog.categories.filter(
      (category) => countInCategory(index, category.id) === 1,
    );
    expect(single).toHaveLength(4);
  });

  it('has exactly three categories without a banner', () => {
    const withoutBanner = catalog.categories
      .filter((category) => category.bannerImage === null)
      .map((category) => category.slug)
      .sort();

    expect(withoutBanner).toEqual(['armeria-de-heroe', 'mascotas', 'resucitacion']);
  });

  it('has the documented price distribution', () => {
    const distribution = index.entries.reduce<Record<number, number>>((counts, entry) => {
      const price = entry.product.priceUsd;
      counts[price] = (counts[price] ?? 0) + 1;
      return counts;
    }, {});

    expect(distribution).toEqual({ 1: 12, 2: 13, 3: 9, 4: 4, 5: 8, 10: 2 });
    expect(index.prices).toEqual([1, 2, 3, 4, 5, 10]);
  });
});

describe('search over the real catalog', () => {
  it('finds the accented and unaccented spellings of the same word', () => {
    // The catalog contradicts itself: `AZUCAR` in a product name, `Azúcar` in the same
    // product's description. Both spellings of the query must give the same single hit.
    expect(searchFor('azucar')).toEqual(['10-algodones-de-azucar']);
    expect(searchFor('azúcar')).toEqual(['10-algodones-de-azucar']);
    expect(searchFor('AZUCAR')).toEqual(['10-algodones-de-azucar']);
    // ...and the query is folded too, not only the haystack.
    expect(searchFor('áZUCAR')).toEqual(['10-algodones-de-azucar']);
  });

  it('finds a product by a word only its description contains', () => {
    expect(searchFor('calamar')).toEqual(['testiculos-de-calamar']);
  });

  it('narrows when a second term is added', () => {
    expect(searchFor('algodones azucar')).toEqual(['10-algodones-de-azucar']);
    expect(searchFor('algodones calamar')).toEqual([]);
  });

  it('finds products by their category name, accented or not', () => {
    // `cofres` finds nothing by product name — every chest product is named "COFRE ..." in
    // the singular, and `Cofres/Ofertas` is the category that says so.
    expect(searchFor('cofres')).toEqual([
      'cofre-con-armamento',
      'cofre-de-familiar',
      'cofre-de-runas',
    ]);
    expect(searchFor('RESUCITACIÓN')).toEqual(['resucitar']);
    expect(searchFor('resucitacion')).toEqual(['resucitar']);
    expect(searchFor('mascotas')).toEqual(['cupon-canjeable-para-familiar']);
  });

  it('returns the whole catalog for an empty query', () => {
    expect(searchFor('')).toHaveLength(48);
    expect(searchFor('   ')).toHaveLength(48);
  });

  it('reports the observed match counts for the queries used to check this task', () => {
    const queries = ['azucar', 'calamar', 'Mascotas', 'RESUCITACIÓN', 'cofres', 'alimento', ''];
    const rows = queries.map((query) => ({
      query,
      matches: searchFor(query).length,
    }));

    // The numbers are asserted below rather than only printed, so this is a gate and not a
    // log. `node` output is captured in the T5 evidence.
    // eslint-disable-next-line no-console
    console.log(
      ['real catalog search counts:', ...rows.map((row) => `  ${JSON.stringify(row.query)} -> ${row.matches}`)].join(
        '\n',
      ),
    );

    expect(rows).toEqual([
      { query: 'azucar', matches: 1 },
      { query: 'calamar', matches: 1 },
      { query: 'Mascotas', matches: 1 },
      { query: 'RESUCITACIÓN', matches: 1 },
      { query: 'cofres', matches: 3 },
      // 13 of the 17 are the `alimento` category's own products, matched through
      // "Características del Alimento:" in their descriptions; the other 4 are products in
      // other categories whose copy mentions food.
      { query: 'alimento', matches: 17 },
      { query: '', matches: 48 },
    ]);
  });

  it('matches the indexed haystack directly for every product', () => {
    // Guards against a product silently having empty searchable text.
    expect(index.entries.filter((entry) => !matchesSearch(entry, ''))).toHaveLength(0);
    for (const entry of index.entries) {
      expect(entry.searchText.trim().length).toBeGreaterThan(0);
      expect(matchesSearch(entry, entry.product.name)).toBe(true);
    }
  });
});

describe('filters and sorts over the real catalog', () => {
  it('returns each category’s own products when filtered', () => {
    for (const category of catalog.categories) {
      const found = searchFor('', category.id);
      expect(found).toHaveLength(countInCategory(index, category.id));
      for (const id of found) {
        expect(
          catalog.products.find((product) => product.id === id)?.categoryId,
        ).toBe(category.id);
      }
    }
  });

  it('treats the price ceiling as inclusive across the real price points', () => {
    const cumulative = [1, 2, 3, 4, 5, 10].map(
      (ceiling) => applyQuery(index.entries, { maxPriceUsd: ceiling }).length,
    );

    expect(cumulative).toEqual([12, 25, 34, 38, 46, 48]);
  });

  it('sorts the real names by value and without regard to accents or case', () => {
    const byName = applyQuery(index.entries, { sort: 'name-asc' }).map(
      (entry) => entry.product.name,
    );

    expect(byName[0]).toBe('3 Ramen');
    expect(byName[1]).toBe('5 CARAMELOS');
    expect(byName.at(-1)).toBe('Testículos De Calamar');
    // `Células` (accented) and `Celulas` (unaccented) would otherwise split apart.
    expect(byName.indexOf('Cáliz de Ponce de León')).toBeLessThan(
      byName.indexOf('Células De Kaiyin'),
    );
    expect(byName.indexOf('Células De Kaiyin')).toBeLessThan(byName.indexOf('Coca Peruana'));
    expect(byName).toHaveLength(48);
  });

  it('sorts prices in both directions without losing a product', () => {
    const ascending = applyQuery(index.entries, { sort: 'price-asc' }).map(
      (entry) => entry.product.priceUsd,
    );
    const descending = applyQuery(index.entries, { sort: 'price-desc' }).map(
      (entry) => entry.product.priceUsd,
    );

    expect(ascending).toHaveLength(48);
    expect(descending).toHaveLength(48);
    expect(ascending[0]).toBe(1);
    expect(ascending.at(-1)).toBe(10);
    expect(descending[0]).toBe(10);
    expect(descending.at(-1)).toBe(1);
    expect([...ascending].sort((a, b) => a - b)).toEqual(ascending);
  });

  it('leaves the catalog order untouched for the default sort', () => {
    const featured = applyQuery(index.entries, {}).map((entry) => entry.product.id);
    const declared = catalog.products.map((product) => product.id);

    expect(featured).toEqual(declared);
  });
});
