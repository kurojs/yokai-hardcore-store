/**
 * Specs for the browse order.
 *
 * These pin the two properties the catalog page depends on: the "biggest first, then name"
 * category order, and a grouping that keeps the caller's sort inside each group while never
 * reordering the groups themselves.
 */

import { orderCategoriesBySize, groupEntriesByCategory } from './catalog-groups';
import { category, indexOf, product } from './testing/entities';

const CATEGORIES = [
  category('yokai', { name: 'Yokai Coins' }),
  category('alimento', { name: 'Alimento Yokai' }),
  category('cofres', { name: 'Cofres' }),
  category('mascotas', { name: 'Mascotas' }),
];

const PRODUCTS = [
  product('arroz', 'alimento', { name: 'Arroz', priceUsd: 2 }),
  product('cofre', 'cofres', { name: 'Cofre', priceUsd: 9 }),
  product('cupon', 'mascotas', { name: 'Cupón', priceUsd: 1 }),
  product('azucar', 'alimento', { name: '10 Algodones', priceUsd: 1 }),
  product('calabaza', 'alimento', { name: 'Calabaza', priceUsd: 4 }),
  product('llave', 'cofres', { name: 'Llave', priceUsd: 3 }),
];

const index = indexOf(CATEGORIES, PRODUCTS);

describe('orderCategoriesBySize', () => {
  it('puts the categories with more products first', () => {
    expect(orderCategoriesBySize(index).map((entry) => entry.id)).toEqual([
      'alimento',
      'cofres',
      'mascotas',
      'yokai',
    ]);
  });

  it('breaks count ties by name, accent- and case-insensitively', () => {
    const tied = indexOf(
      [
        category('zeta', { name: 'Zeta' }),
        category('alfa', { name: 'Árbol' }),
        category('beta', { name: 'beta' }),
      ],
      [product('1', 'zeta'), product('2', 'alfa'), product('3', 'beta')],
    );

    expect(orderCategoriesBySize(tied).map((entry) => entry.name)).toEqual([
      'Árbol',
      'beta',
      'Zeta',
    ]);
  });

  it('leaves the index category list untouched', () => {
    const before = index.categories.map((entry) => entry.id);
    orderCategoriesBySize(index);

    expect(index.categories.map((entry) => entry.id)).toEqual(before);
  });
});

describe('groupEntriesByCategory', () => {
  it('emits non-empty groups in the browse order', () => {
    expect(groupEntriesByCategory(index, index.entries).map((group) => group.category.id)).toEqual([
      'alimento',
      'cofres',
      'mascotas',
    ]);
  });

  it('keeps the order the caller supplied inside each group', () => {
    const cheapestFirst = [...index.entries].sort(
      (a, b) => a.product.priceUsd - b.product.priceUsd,
    );

    const groups = groupEntriesByCategory(index, cheapestFirst);
    const food = groups.find((group) => group.category.id === 'alimento');

    expect(food?.entries.map((entry) => entry.product.name)).toEqual([
      '10 Algodones',
      'Arroz',
      'Calabaza',
    ]);
  });

  it('does not reorder the groups when a filter removes products', () => {
    const underFive = index.entries.filter((entry) => entry.product.priceUsd < 5);
    const groups = groupEntriesByCategory(index, underFive);

    // Cofres still leads Mascotas even though the price filter left it with one product.
    expect(groups.map((group) => group.category.id)).toEqual([
      'alimento',
      'cofres',
      'mascotas',
    ]);
  });

  it('drops a category that has no surviving products', () => {
    const groups = groupEntriesByCategory(
      index,
      index.entries.filter((entry) => entry.category.id !== 'cofres'),
    );

    expect(groups.map((group) => group.category.id)).not.toContain('cofres');
  });

  it('returns no groups for an empty result set', () => {
    expect(groupEntriesByCategory(index, [])).toEqual([]);
  });
});
