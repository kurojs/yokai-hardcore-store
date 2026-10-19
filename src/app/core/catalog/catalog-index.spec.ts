/**
 * Specs for the derived lookups.
 *
 * The index is where "what does search see" and "how many products does a category have"
 * are decided, so these pin both the shape and the two invariants the UI depends on: one
 * entry per product, and counts derived from the products rather than trusted from a
 * declaration.
 */

import { buildCatalogIndex, countInCategory, findCategoryBySlug, searchTextFor } from './catalog-index';
import { SUPPORTED_SCHEMA_VERSION } from './catalog-model';
import { category, indexOf, product } from './testing/entities';

const CATEGORIES = [
  category('alimento', { name: 'Alimento Yokai', bannerImage: '/categories/alimento/banner.png' }),
  category('mascotas', { name: 'Mascotas' }),
];

const PRODUCTS = [
  product('algodones', 'alimento', { name: '10 ALGODONES DE AZUCAR', priceUsd: 1 }),
  product('cupon', 'mascotas', { name: 'Cupón Canjeable', priceUsd: 3 }),
  product('cofre', 'alimento', { name: 'COFRE DE RUNAS', priceUsd: 10 }),
];

const index = indexOf(CATEGORIES, PRODUCTS);

describe('buildCatalogIndex', () => {
  it('indexes categories by id and by slug', () => {
    expect(index.categoryById.get('alimento')?.name).toBe('Alimento Yokai');
    expect(index.categoryBySlug.get('mascotas')?.name).toBe('Mascotas');
    expect(index.categoryById.size).toBe(2);
    expect(index.categoryBySlug.size).toBe(2);
  });

  it('produces exactly one entry per product, in catalog order', () => {
    expect(index.entries).toHaveLength(PRODUCTS.length);
    expect(index.entries.map((entry) => entry.product.id)).toEqual(['algodones', 'cupon', 'cofre']);
  });

  it('resolves each entry to its category object', () => {
    expect(index.entries[0]?.category.id).toBe('alimento');
    expect(index.entries[1]?.category.name).toBe('Mascotas');
  });

  it('derives per-category counts from the products, not from a declaration', () => {
    expect(countInCategory(index, 'alimento')).toBe(2);
    expect(countInCategory(index, 'mascotas')).toBe(1);
  });

  it('reports zero for an unknown category rather than undefined', () => {
    expect(countInCategory(index, 'ghost')).toBe(0);
  });

  it('collects the distinct prices in ascending order', () => {
    expect(index.prices).toEqual([1, 3, 10]);
  });

  it('keeps the category list itself untouched', () => {
    expect(index.categories).toEqual(CATEGORIES);
  });

  it('handles an empty catalog', () => {
    const empty = buildCatalogIndex({
      schemaVersion: SUPPORTED_SCHEMA_VERSION,
      categories: [],
      products: [],
    });

    expect(empty.entries).toEqual([]);
    expect(empty.prices).toEqual([]);
    expect(empty.categoryById.size).toBe(0);
  });

  it('fails loudly when a product references an unknown category', () => {
    // Unreachable through the validated loader; reachable if a catalog is built by hand,
    // which is exactly the mistake a clear error is worth having.
    expect(() =>
      buildCatalogIndex({
        schemaVersion: SUPPORTED_SCHEMA_VERSION,
        categories: CATEGORIES,
        products: [product('orphan', 'ghost')],
      }),
    ).toThrow(/product "orphan" references unknown category "ghost"/);
  });
});

describe('searchTextFor', () => {
  const [alimento, mascotas] = CATEGORIES;

  it('folds the name, the description and the category name', () => {
    const text = searchTextFor(
      product('x', 'mascotas', {
        name: 'Testículos De Calamar',
        description: '¡Delicioso!',
      }),
      mascotas!,
    );

    expect(text).toBe('testiculos de calamar\n¡delicioso!\nmascotas');
  });

  it('lets a product be found by its category name', () => {
    // The real reason this field is in the haystack: searching "cofres" has to find
    // "COFRE DE RUNAS", whose name is singular and whose category is plural.
    expect(searchTextFor(product('cofre', 'alimento', { name: 'COFRE DE RUNAS' }), alimento!)).toContain(
      'alimento yokai',
    );
  });

  it('leaves slugs out so URL identity never matches a query', () => {
    const text = searchTextFor(
      product('secret-slug', 'mascotas', {
        name: 'Nada',
        description: 'Sin pistas aqui.',
      }),
      mascotas!,
    );

    expect(text).toBe('nada\nsin pistas aqui.\nmascotas');
    expect(text).not.toContain('secret-slug');
  });
});

describe('findCategoryBySlug', () => {
  it('finds a category by slug', () => {
    expect(findCategoryBySlug(index, 'mascotas')?.id).toBe('mascotas');
  });

  it('returns null for an unknown, empty or absent slug', () => {
    expect(findCategoryBySlug(index, 'no-such-category')).toBeNull();
    expect(findCategoryBySlug(index, '')).toBeNull();
    expect(findCategoryBySlug(index, null)).toBeNull();
    expect(findCategoryBySlug(index, undefined)).toBeNull();
  });
});
