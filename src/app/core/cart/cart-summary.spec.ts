/**
 * Specs for the cart line views.
 *
 * These pin the join both the cart page and the demo checkout render: catalog identity, the
 * live unit price, the line total, and the rule for a product that no longer exists. They are
 * pure-function tests on purpose — the risk lives in the arithmetic and the lookup, not in the
 * markup that consumes the result.
 */

import type { CatalogEntry } from '../catalog/catalog-index';
import type { Category, Product } from '../catalog/catalog-model';
import { cartSubtotalUsd } from './cart-logic';
import { buildCartLineViews } from './cart-summary';

const category: Category = {
  id: 'cat-1',
  slug: 'categoria',
  name: 'Categoría de prueba',
  description: '',
  bannerImage: null,
};

function entry(slug: string, priceUsd: number, name: string = slug): CatalogEntry {
  const product: Product = {
    id: `id-${slug}`,
    slug,
    name,
    priceUsd,
    categoryId: category.id,
    description: '',
    imagePath: `/products/${slug}/imagen.png`,
    modelPath: null,
  };
  return { product, category, searchText: '' };
}

const catalog: readonly CatalogEntry[] = [
  entry('espada', 1, 'ESPADA'),
  entry('pocion', 2.5, 'Poción de prueba'),
  entry('cuenco', 4, '10 Cuencos de arroz'),
];

describe('buildCartLineViews', () => {
  it('keeps the cart order and joins each line to its product and category', () => {
    const views = buildCartLineViews(
      [
        { slug: 'pocion', quantity: 2 },
        { slug: 'espada', quantity: 1 },
      ],
      catalog,
    );

    expect(views.map((view) => view.product.name)).toEqual(['Poción de prueba', 'ESPADA']);
    expect(views.map((view) => view.category.name)).toEqual([
      'Categoría de prueba',
      'Categoría de prueba',
    ]);
    expect(views.map((view) => view.quantity)).toEqual([2, 1]);
  });

  it('prices every line from the catalog, not from any stored amount', () => {
    const views = buildCartLineViews([{ slug: 'pocion', quantity: 3 }], catalog);

    expect(views[0]?.unitPriceUsd).toBe(2.5);
    expect(views[0]?.lineTotalUsd).toBe(7.5);
  });

  it('drops a line whose product is not in the catalog instead of rendering a blank', () => {
    const views = buildCartLineViews(
      [
        { slug: 'espada', quantity: 2 },
        { slug: 'producto-retirado', quantity: 5 },
      ],
      catalog,
    );

    expect(views).toHaveLength(1);
    expect(views[0]?.product.slug).toBe('espada');
    expect(views.every((view) => Number.isFinite(view.lineTotalUsd))).toBe(true);
  });

  it('agrees with cartSubtotalUsd, including for lines the catalog no longer knows', () => {
    const lines = [
      { slug: 'espada', quantity: 2 },
      { slug: 'producto-retirado', quantity: 5 },
      { slug: 'pocion', quantity: 3 },
    ];
    const prices = new Map(
      catalog.map((item) => [item.product.slug, item.product.priceUsd] as const),
    );

    const views = buildCartLineViews(lines, catalog);
    const viewTotal = views.reduce((total, view) => total + view.lineTotalUsd, 0);

    // $1 × 2 + $2.50 × 3 = $9.50. The unknown line contributes nothing in either function.
    expect(viewTotal).toBe(9.5);
    expect(cartSubtotalUsd(lines, prices)).toBe(9.5);
  });

  it('returns no views for an empty cart', () => {
    expect(buildCartLineViews([], catalog)).toEqual([]);
  });
});
