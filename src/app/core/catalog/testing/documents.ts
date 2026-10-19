/**
 * Raw catalog *document* fixtures — the shape `data/catalog.json` has, including the fields
 * the app must never use.
 *
 * `sourceFolder` and `imageUrl` are deliberately populated with recognisable sentinels so a
 * spec can prove they are dropped at the boundary rather than only asserting that the happy
 * path works.
 */

/** A mutable raw record, as produced by `JSON.parse`. */
export type RawDocument = Record<string, unknown>;

/** A raw category document. Defaults to a valid, banner-having, single-product category. */
export function categoryDocument(overrides: RawDocument = {}): RawDocument {
  return {
    id: 'test-category',
    slug: 'test-category',
    name: 'Categoría De Prueba',
    description: 'Descripción de prueba: ¡acentos á é í ó ú y ñ!',
    bannerImage: '/categories/test-category/categoria_imagen_1.png',
    productCount: 1,
    sourceFolder: 'Probe  Category',
    ...overrides,
  };
}

/** A raw product document. Defaults to a valid product belonging to the default category. */
export function productDocument(overrides: RawDocument = {}): RawDocument {
  return {
    id: 'probe-product',
    slug: 'probe-product',
    name: 'PROBE PRODUCT',
    priceUsd: 1,
    categoryId: 'test-category',
    description: 'Descripción del producto. Cantidad: 1 unidad. Efectos Temporales: ninguno.',
    imageUrl: 'https://dunb17ur4ymx4.cloudfront.net/packages/images/deadbeef.png',
    localImage: '/products/probe-product/imagen.png',
    modelPath: null,
    sourceFolder: 'Probe Product',
    ...overrides,
  };
}

/**
 * A raw catalog document that passes validation.
 *
 * Overrides replace whole collections, so a spec can hand in a broken list without fighting
 * a deep merge.
 */
export function catalogDocument(overrides: RawDocument = {}): RawDocument {
  return {
    schemaVersion: 1,
    categories: [categoryDocument()],
    products: [productDocument()],
    ...overrides,
  };
}

/**
 * A raw catalog document with `count` products that all reference one category, with the
 * declared `productCount` kept consistent so only the field under test produces issues.
 */
export function catalogDocumentWithProducts(
  count: number,
  productOverrides: (index: number) => RawDocument = () => ({}),
): RawDocument {
  const products: RawDocument[] = [];
  for (let index = 0; index < count; index += 1) {
    products.push(
      productDocument({
        id: `probe-product-${index}`,
        slug: `probe-product-${index}`,
        ...productOverrides(index),
      }),
    );
  }
  return catalogDocument({
    categories: [categoryDocument({ productCount: count })],
    products,
  });
}
