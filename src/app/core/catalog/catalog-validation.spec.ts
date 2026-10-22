/**
 * Specs for the catalog trust boundary.
 *
 * The validator is the only thing standing between a generated document and `undefined`
 * rendered into the page, so these specs pin the three things that matter: the normalised
 * shape the app receives, the exact field that a drift is blamed on, and the absence of the
 * fields the storefront must never use.
 */

import { CatalogValidationError, parseCatalogResponse } from './catalog-validation';
import {
  catalogDocument,
  catalogDocumentWithProducts,
  categoryDocument,
  productDocument,
} from './testing/documents';

/** Runs the validator and returns the error, failing the spec if it did not throw. */
function parseError(doc: unknown): CatalogValidationError {
  try {
    parseCatalogResponse(doc);
  } catch (cause) {
    if (cause instanceof CatalogValidationError) return cause;
    throw cause;
  }
  throw new Error('expected parseCatalogResponse to reject this document, but it accepted it');
}

describe('parseCatalogResponse  Eaccepted documents', () => {
  it('normalises a valid document', () => {
    const catalog = parseCatalogResponse(catalogDocument());

    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.categories).toHaveLength(1);
    expect(catalog.products).toHaveLength(1);
    expect(catalog.categories[0]?.name).toBe('Categoría De Prueba');
    expect(catalog.products[0]?.name).toBe('PROBE PRODUCT');
    expect(catalog.products[0]?.priceUsd).toBe(1);
  });

  it('returns only the fields the app is allowed to use', () => {
    const catalog = parseCatalogResponse(catalogDocument());

    // The normalised shapes are asserted key by key. `productCount` and `sourceFolder` are
    // missing from the category, and `imageUrl` and `sourceFolder` from the product: the
    // generated document's provenance fields cannot be rendered because they do not exist.
    expect(Object.keys(catalog.categories[0] ?? {}).sort()).toEqual([
      'bannerImage',
      'description',
      'id',
      'name',
      'slug',
    ]);
    expect(Object.keys(catalog.products[0] ?? {}).sort()).toEqual([
      'categoryId',
      'description',
      'id',
      'imagePath',
      'modelPath',
      'name',
      'priceUsd',
      'slug',
    ]);
    expect(catalog.products[0]).not.toHaveProperty('imageUrl');
    expect(catalog.products[0]).not.toHaveProperty('sourceFolder');
    expect(catalog.categories[0]).not.toHaveProperty('sourceFolder');
  });

  it('maps localImage onto imagePath', () => {
    const catalog = parseCatalogResponse(catalogDocument());

    expect(catalog.products[0]?.imagePath).toBe('products/probe-product/imagen.png');
  });

  it('keeps an unaccompanied null banner and a null local image as null', () => {
    const catalog = parseCatalogResponse(
      catalogDocument({
        categories: [categoryDocument({ bannerImage: null })],
        products: [productDocument({ localImage: null })],
      }),
    );

    expect(catalog.categories[0]?.bannerImage).toBeNull();
    expect(catalog.products[0]?.imagePath).toBeNull();
  });

  it('keeps a null modelPath, and a real one when it appears', () => {
    const withNull = parseCatalogResponse(catalogDocument());
    expect(withNull.products[0]?.modelPath).toBeNull();

    const withPath = parseCatalogResponse(
      catalogDocument({ products: [productDocument({ modelPath: '/models/items/probe.json' })] }),
    );
    expect(withPath.products[0]?.modelPath).toBe('/models/items/probe.json');
  });

  it('accepts a fractional price, which the contract allows', () => {
    const catalog = parseCatalogResponse(
      catalogDocument({ products: [productDocument({ priceUsd: 2.5 })] }),
    );

    expect(catalog.products[0]?.priceUsd).toBe(2.5);
  });

  it('ignores fields it does not know about', () => {
    // Forward compatibility: a generator may add fields before the app reads them, and that
    // must not fail the load.
    const catalog = parseCatalogResponse(
      catalogDocument({
        generatedAt: '2026-10-18T00:00:00.000Z',
        categories: [categoryDocument({ tags: ['alimento'], featured: true })],
        products: [productDocument({ stock: 12, variants: [] })],
      }),
    );

    expect(catalog.categories).toHaveLength(1);
    expect(catalog.products).toHaveLength(1);
  });

  it('accepts an empty catalog rather than crashing on zero-length collections', () => {
    const catalog = parseCatalogResponse({ schemaVersion: 1, categories: [], products: [] });

    expect(catalog.categories).toHaveLength(0);
    expect(catalog.products).toHaveLength(0);
  });
});

describe('parseCatalogResponse  Eroot and version', () => {
  it('rejects a non-object root and says what it received', () => {
    const error = parseError([1, 2, 3]);

    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]).toContain('root: expected an object');
    expect(error.issues[0]).toContain('an array of 3');
  });

  it('rejects null', () => {
    expect(parseError(null).issues[0]).toContain('received null');
  });

  it('rejects a schemaVersion it does not understand and names the received one', () => {
    const error = parseError(catalogDocument({ schemaVersion: 2 }));

    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]).toContain('reads version 1 only');
    expect(error.issues[0]).toContain('received 2');
    expect(error.issues[0]).toContain('npm run catalog:build');
  });

  it('rejects a missing schemaVersion', () => {
    const doc = catalogDocument();
    delete doc['schemaVersion'];

    expect(parseError(doc).issues[0]).toContain('schemaVersion: expected a finite number');
  });

  it('rejects a missing collection', () => {
    const doc = catalogDocument();
    delete doc['products'];

    expect(parseError(doc).issues[0]).toContain('products: expected an array, received undefined');
  });
});

describe('parseCatalogResponse  Efield level drift', () => {
  it('blames the exact JSON path of a wrong type', () => {
    const error = parseError(
      catalogDocument({ products: [productDocument({ name: 42 })] }),
    );

    expect(error.issues[0]).toContain('products[0].name: expected a string, received a number (42)');
  });

  it('blames the exact index in a longer list', () => {
    const error = parseError(catalogDocumentWithProducts(3, (index) => (index === 2 ? { id: null } : {})));

    expect(error.issues[0]).toContain('products[2].id: expected a string, received null');
  });

  it('rejects an empty identifier, slug or name', () => {
    const issues = parseError(
      catalogDocument({ products: [productDocument({ id: '  ', slug: '', name: '' })] }),
    ).issues;

    expect(issues).toContain('products[0].id: expected a non-empty string, received an empty one');
    expect(issues).toContain('products[0].slug: expected a non-empty string, received an empty one');
    expect(issues).toContain('products[0].name: expected a non-empty string, received an empty one');
  });

  it('rejects a non-positive price', () => {
    expect(parseError(catalogDocument({ products: [productDocument({ priceUsd: 0 })] })).issues[0]).toContain(
      'products[0].priceUsd: expected a positive number, received 0',
    );
    expect(
      parseError(catalogDocument({ products: [productDocument({ priceUsd: -3 })] })).issues[0],
    ).toContain('received -3');
  });

  it('rejects a price that is not a finite number', () => {
    expect(
      parseError(catalogDocument({ products: [productDocument({ priceUsd: Number.NaN })] })).issues[0],
    ).toContain('products[0].priceUsd: expected a finite number');
  });

  it('rejects a banner path that is not root-relative, and explains why', () => {
    const error = parseError(
      catalogDocument({ categories: [categoryDocument({ bannerImage: 'categories/banner.png' })] }),
    );

    expect(error.issues[0]).toContain('categories[0].bannerImage');
    expect(error.issues[0]).toContain('root-relative path starting with "/"');
    expect(error.issues[0]).toContain('404');
  });

  it('rejects an empty modelPath instead of treating it as absent', () => {
    expect(
      parseError(catalogDocument({ products: [productDocument({ modelPath: '' })] })).issues[0],
    ).toContain('products[0].modelPath: expected a non-empty string or null');
  });

  it('rejects a non-integer productCount', () => {
    expect(
      parseError(catalogDocument({ categories: [categoryDocument({ productCount: 1.5 })] })).issues,
    ).toContain('categories[0].productCount: expected a non-negative integer, received 1.5');
  });
});

describe('parseCatalogResponse  Ecross-record integrity', () => {
  it('rejects a duplicate product slug and names both indices', () => {
    const error = parseError(
      catalogDocument({
        categories: [categoryDocument({ productCount: 2 })],
        products: [
          productDocument({ id: 'a', slug: 'same' }),
          productDocument({ id: 'b', slug: 'same' }),
        ],
      }),
    );

    expect(error.issues).toContain(
      'products[1].slug: duplicate slug "same", already used by products[0]',
    );
  });

  it('rejects a duplicate category id', () => {
    const error = parseError(
      catalogDocument({
        categories: [
          categoryDocument({ id: 'dup', slug: 'dup-a', productCount: 0 }),
          categoryDocument({ id: 'dup', slug: 'dup-b', productCount: 1 }),
        ],
      }),
    );

    expect(error.issues).toContain(
      'categories[1].id: duplicate id "dup", already used by categories[0]',
    );
  });

  it('rejects a product that references no existing category', () => {
    const error = parseError(
      catalogDocument({ products: [productDocument({ categoryId: 'ghost' })] }),
    );

    expect(error.issues).toContain(
      'products[0].categoryId: "ghost" does not match any categories[].id, so this product ' +
        'would have no category to belong to',
    );
  });

  it('rejects a declared productCount that disagrees with the products', () => {
    const error = parseError(
      catalogDocument({ categories: [categoryDocument({ productCount: 13 })] }),
    );

    expect(error.issues).toContain(
      'categories[0].productCount: declared 13 but 1 product(s) reference "test-category"',
    );
  });
});

describe('parseCatalogResponse  Eerror reporting', () => {
  it('is a CatalogValidationError with a message that lists every issue', () => {
    const error = parseError(
      catalogDocument({ products: [productDocument({ name: 1, priceUsd: 'x' })] }),
    );

    expect(error).toBeInstanceOf(CatalogValidationError);
    expect(error.name).toBe('CatalogValidationError');
    expect(error.issues.length).toBeGreaterThanOrEqual(2);
    expect(error.message).toContain('catalog.json failed validation with');
    for (const issue of error.issues) expect(error.message).toContain(issue);
  });

  it('caps the message but keeps every issue on the error', () => {
    // 30 products whose price is unusable: one issue each, plus the productCount cross-check.
    const error = parseError(catalogDocumentWithProducts(30, () => ({ priceUsd: 'free' })));

    expect(error.issues.length).toBeGreaterThan(25);
    const hidden = error.issues.length - 25;
    expect(error.message).toContain(`...and ${hidden} more`);
    // The 29th product is past the reporting cap, so it must not be in the message...
    expect(error.message).not.toContain('products[28]');
    // ...while still being reported on the error itself.
    expect(error.issues.some((issue) => issue.startsWith('products[28]'))).toBe(true);
  });
});
