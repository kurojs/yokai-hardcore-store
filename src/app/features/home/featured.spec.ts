import { parseCatalogResponse } from '../../core/catalog/catalog-validation';
import { buildCatalogIndex } from '../../core/catalog/catalog-index';
import { category, indexOf, product } from '../../core/catalog/testing/entities';
import { readCommittedCatalogDocument } from '../../core/catalog/testing/committed-catalog';
import { FEATURED_COUNT, selectFeatured } from './featured';

/** Three categories with two products each, so the spread rule is observable. */
function twoPerCategory() {
  const categories = [category('alimento'), category('cofres'), category('mascotas')];
  const products = [
    product('a1', 'alimento'),
    product('a2', 'alimento'),
    product('c1', 'cofres'),
    product('c2', 'cofres'),
    product('m1', 'mascotas'),
    product('m2', 'mascotas'),
  ];
  return indexOf(categories, products).entries;
}

describe('selectFeatured', () => {
  it('takes one product per category before repeating a category', () => {
    const featured = selectFeatured(twoPerCategory(), 3);

    expect(featured.map((entry) => entry.product.id)).toEqual(['a1', 'c1', 'm1']);
  });

  it('tops up in catalog order when there are fewer categories than slots', () => {
    const featured = selectFeatured(twoPerCategory(), 5);

    expect(featured.map((entry) => entry.product.id)).toEqual(['a1', 'c1', 'm1', 'a2', 'c2']);
  });

  it('returns every product when asked for more than the catalog holds', () => {
    const entries = twoPerCategory();

    expect(selectFeatured(entries, 99)).toHaveLength(entries.length);
    expect(selectFeatured(entries, 6)).toHaveLength(6);
  });

  it('returns nothing for a non-positive or fractional count instead of throwing', () => {
    const entries = twoPerCategory();

    expect(selectFeatured(entries, 0)).toEqual([]);
    expect(selectFeatured(entries, -2)).toEqual([]);
    expect(selectFeatured(entries, 2.5)).toEqual([]);
    expect(selectFeatured([], FEATURED_COUNT)).toEqual([]);
  });

  it('spreads across the real catalog instead of showing four food items', () => {
    const catalog = parseCatalogResponse(readCommittedCatalogDocument());
    const featured = selectFeatured(buildCatalogIndex(catalog).entries);

    expect(featured).toHaveLength(FEATURED_COUNT);
    expect(new Set(featured.map((entry) => entry.category.id)).size).toBe(FEATURED_COUNT);
    // Pinned to the real outcome: the generated catalog lists products alphabetically, so the
    // first product of each new category wins as the list is walked. A reshuffle of the
    // document should be noticed here rather than silently changing the landing page.
    expect(featured.map((entry) => entry.category.slug)).toEqual([
      'alimento-yokai-para-guerreros-y-pets',
      'bosque-de-las-ninfas',
      'artefactos-magicos',
      'armeria-de-aventurero',
    ]);
  });
});
