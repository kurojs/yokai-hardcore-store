/**
 * Normalised *entity* fixtures — the app's own `Category` and `Product` types.
 *
 * The index and query specs work above the validation boundary and build those types
 * directly, which keeps them readable and keeps the JSON-shaped fixtures in `documents.ts`
 * for the one spec that actually tests the boundary.
 */

import { buildCatalogIndex, type CatalogIndex } from '../catalog-index';
import { SUPPORTED_SCHEMA_VERSION, type Category, type Product } from '../catalog-model';

/** A normalised category. Defaults to a bannered-less category with a derived name. */
export function category(id: string, overrides: Partial<Category> = {}): Category {
  return {
    id,
    slug: id,
    name: `Categoría ${id}`,
    description: `Descripción de la categoría ${id}.`,
    bannerImage: null,
    ...overrides,
  };
}

/** A normalised product. Defaults to a $1 product with a local image and no model. */
export function product(id: string, categoryId: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    slug: id,
    name: `Producto ${id}`,
    priceUsd: 1,
    categoryId,
    description: `Descripción del producto ${id}.`,
    imagePath: `/products/${id}/imagen.png`,
    modelPath: null,
    ...overrides,
  };
}

/** Builds an index over the given normalised collections. */
export function indexOf(
  categories: readonly Category[],
  products: readonly Product[],
): CatalogIndex {
  return buildCatalogIndex({ schemaVersion: SUPPORTED_SCHEMA_VERSION, categories, products });
}
