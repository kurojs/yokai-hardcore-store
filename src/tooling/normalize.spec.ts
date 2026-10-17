/**
 * Unit specs for the pure catalog generator in `scripts/lib/normalize.mjs`.
 *
 * Synthetic fixtures are used here so each rule is tested in isolation; the
 * real-source integration and reproducibility gate lives in
 * `catalog-artifact.spec.ts`.
 */

import { auditCatalog, buildCatalog, ITEM_MODEL_ALIASES } from '../../scripts/lib/normalize.mjs';

type SourceProduct = {
  nombre: string;
  precio: number;
  categoria: string;
  descripcion_categoria: string;
  descripcion: string;
  imagen_url: string;
};

type IndexEntry = {
  categoryFolder: string;
  folder: string;
  image: string | null;
  name: string | null;
  priceUsd: number | null;
  description: string | null;
};

function sourceProduct(overrides: Partial<SourceProduct> = {}): SourceProduct {
  return {
    nombre: 'Test Item',
    precio: 3,
    categoria: 'Test Cat',
    descripcion_categoria: 'Category description',
    descripcion: 'Item description',
    imagen_url: 'https://cdn.example.com/packages/images/abc.png',
    ...overrides,
  };
}

function indexEntry(overrides: Partial<IndexEntry> = {}): IndexEntry {
  return {
    categoryFolder: 'Test Cat',
    folder: 'Test Item',
    image: 'imagen.png',
    name: 'Test Item',
    priceUsd: 3,
    description: 'Item description',
    ...overrides,
  };
}

function categoryCopy(overrides: Record<string, unknown> = {}) {
  return {
    folder: 'Test Cat',
    name: 'Test Cat',
    description: 'Category description',
    bannerImage: null,
    ...overrides,
  };
}

function build(overrides: Record<string, unknown> = {}) {
  return buildCatalog({
    sourceProducts: [sourceProduct()],
    categoryCopy: [categoryCopy()],
    productIndex: [indexEntry()],
    assetPaths: new Set(['public/products/test-item/imagen.png']),
    itemModels: [],
    ...overrides,
  } as never) as { schemaVersion: number; categories: any[]; products: any[] };
}

describe('buildCatalog identity', () => {
  it('derives the id from the product folder, not from the product name', () => {
    const catalog = build({
      sourceProducts: [sourceProduct({ nombre: 'Fort-Craft' })],
      productIndex: [indexEntry({ folder: 'Fort-Craft', name: 'Mostruo Renombrado' })],
      assetPaths: new Set(['public/products/fort-craft/imagen.png']),
    });
    expect(catalog.products[0].id).toBe('fort-craft');
  });

  it('derives the slug from the display name', () => {
    const catalog = build({
      sourceProducts: [sourceProduct({ nombre: 'FOLDER NAME' })],
      productIndex: [indexEntry({ folder: 'FOLDER NAME', name: 'Cofre  con Armamento' })],
      assetPaths: new Set(['public/products/folder-name/imagen.png']),
    });
    expect(catalog.products[0].slug).toBe('cofre-con-armamento');
  });

  it('keeps ids stable when the source array order changes', () => {
    const many = [
      sourceProduct({ nombre: 'Alpha', categoria: 'Test Cat' }),
      sourceProduct({ nombre: 'Beta', categoria: 'Test Cat' }),
      sourceProduct({ nombre: 'Gamma', categoria: 'Test Cat' }),
    ];
    const index = [
      indexEntry({ folder: 'Alpha', name: 'Alpha' }),
      indexEntry({ folder: 'Beta', name: 'Beta' }),
      indexEntry({ folder: 'Gamma', name: 'Gamma' }),
    ];
    const assets = new Set([
      'public/products/alpha/imagen.png',
      'public/products/beta/imagen.png',
      'public/products/gamma/imagen.png',
    ]);

    const forward = build({ sourceProducts: many, productIndex: index, assetPaths: assets });
    const reversed = build({
      sourceProducts: [...many].reverse(),
      productIndex: [...index].reverse(),
      assetPaths: assets,
    });

    expect(reversed.products).toEqual(forward.products);
    expect(reversed.categories).toEqual(forward.categories);
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
  });

  it('sorts products and categories by id', () => {
    const catalog = build({
      sourceProducts: [sourceProduct({ nombre: 'Zulu' }), sourceProduct({ nombre: 'Alpha' })],
      productIndex: [
        indexEntry({ folder: 'Zulu', name: 'Zulu' }),
        indexEntry({ folder: 'Alpha', name: 'Alpha' }),
      ],
      assetPaths: new Set(['public/products/zulu/imagen.png', 'public/products/alpha/imagen.png']),
    });
    expect(catalog.products.map((p: { id: string }) => p.id)).toEqual(['alpha', 'zulu']);
  });
});

describe('buildCatalog price passthrough', () => {
  it('passes the source price through unchanged', () => {
    for (const price of [1, 2, 3, 4, 5, 10]) {
      const catalog = build({
        sourceProducts: [sourceProduct({ precio: price })],
        productIndex: [indexEntry({ priceUsd: price })],
      });
      expect(catalog.products[0].priceUsd).toBe(price);
      expect(Object.is(catalog.products[0].priceUsd, price)).toBe(true);
    }
  });

  it('introduces no float drift for a fractional price', () => {
    const catalog = build({
      sourceProducts: [sourceProduct({ precio: 0.3 })],
      productIndex: [indexEntry({ priceUsd: 0.3 })],
    });
    expect(Object.is(catalog.products[0].priceUsd, 0.3)).toBe(true);
  });

  it('throws when the JSON price and the .txt price disagree', () => {
    expect(() => build({ productIndex: [indexEntry({ priceUsd: 9 })] })).toThrow(/price disagreement/);
  });

  it('throws on a non-numeric price', () => {
    expect(() => build({ sourceProducts: [sourceProduct({ precio: 'tres' as never as number })] })).toThrow(
      /non-numeric price/,
    );
  });
});

describe('buildCatalog asset resolution', () => {
  it('maps a copied product image to its served path', () => {
    expect(build().products[0].localImage).toBe('/products/test-item/imagen.png');
  });

  it('maps a copied category banner to its served path', () => {
    const catalog = build({
      categoryCopy: [categoryCopy({ bannerImage: 'categoria_imagen_1.jpg' })],
      assetPaths: new Set([
        'public/products/test-item/imagen.png',
        'public/categories/test-cat/categoria_imagen_1.jpg',
      ]),
    });
    expect(catalog.categories[0].bannerImage).toBe('/categories/test-cat/categoria_imagen_1.jpg');
  });

  it('reports a null banner when the category has none', () => {
    expect(build().categories[0].bannerImage).toBeNull();
  });

  it('throws when a source image exists but was never copied into the repo', () => {
    expect(() => build({ assetPaths: new Set() })).toThrow(/is missing from the repository/);
  });

  it('resolves modelPath when a product slug matches an item model', () => {
    const catalog = build({
      itemModels: [{ slug: 'test-item', modelPath: '/models/items/tlaloc/test-item.json' }],
    });
    expect(catalog.products[0].modelPath).toBe('/models/items/tlaloc/test-item.json');
  });

  it('reports a null modelPath when no item model matches', () => {
    expect(build({ itemModels: [{ slug: 'tlaloc-hat', modelPath: '/models/items/tlaloc/tlaloc-hat.json' }] }).products[0].modelPath).toBeNull();
  });

  it('resolves modelPath through a declared alias instead of the product slug', () => {
    const catalog = build({
      itemModels: [{ slug: 'tlaloc-hat', modelPath: '/models/items/tlaloc/tlaloc-hat.json' }],
      itemModelAliases: { 'test-item': 'tlaloc-hat' },
    });
    expect(catalog.products[0].modelPath).toBe('/models/items/tlaloc/tlaloc-hat.json');
  });

  it('ships an immutable, empty production alias table', () => {
    expect(Object.isFrozen(ITEM_MODEL_ALIASES)).toBe(true);
    expect(Object.keys(ITEM_MODEL_ALIASES)).toEqual([]);
  });
});

describe('buildCatalog copy normalization', () => {
  it('collapses double spaces and strips quotes from the name', () => {
    const catalog = build({
      productIndex: [indexEntry({ folder: 'Test Item', name: 'Cupón de Invocación "Todo Está Pegajoso"' })],
    });
    expect(catalog.products[0].name).toBe('Cupón de Invocación Todo Está Pegajoso');
    expect(catalog.products[0].slug).toBe('cupon-de-invocacion-todo-esta-pegajoso');
  });

  it('collapses whitespace inside the description', () => {
    const catalog = build({
      productIndex: [indexEntry({ description: 'a  b\n\nc' })],
    });
    expect(catalog.products[0].description).toBe('a b c');
  });

  it('falls back to the JSON copy when info.txt is absent, recording it in the audit', () => {
    const catalog = build({
      sourceProducts: [sourceProduct({ nombre: 'Bolsa  de 10 Yokai', descripcion: 'Copiada del JSON.' })],
      productIndex: [
        indexEntry({
          folder: 'Bolsa  de 10 Yokai',
          name: null,
          priceUsd: null,
          description: null,
          image: null,
        }),
      ],
      assetPaths: new Set(),
    });

    expect(catalog.products[0].name).toBe('Bolsa de 10 Yokai');
    expect(catalog.products[0].description).toBe('Copiada del JSON.');
    expect(catalog.products[0].localImage).toBeNull();

    const audit = auditCatalog(catalog, { fallbackProducts: ['Bolsa  de 10 Yokai'] });
    expect(audit.fallbackProducts).toEqual(['Bolsa  de 10 Yokai']);
    expect(audit.missingLocalImages).toEqual(['bolsa-de-10-yokai']);
  });

  it('counts products per category', () => {
    const catalog = build({
      sourceProducts: [sourceProduct({ nombre: 'A' }), sourceProduct({ nombre: 'B' })],
      productIndex: [indexEntry({ folder: 'A', name: 'A' }), indexEntry({ folder: 'B', name: 'B' })],
      assetPaths: new Set(['public/products/a/imagen.png', 'public/products/b/imagen.png']),
    });
    expect(catalog.categories[0].productCount).toBe(2);
  });
});

describe('buildCatalog fails loudly', () => {
  it('throws when the source catalog is empty', () => {
    expect(() => build({ sourceProducts: [] })).toThrow(/source catalog is empty/);
  });

  it('throws when there is no category copy', () => {
    expect(() => build({ categoryCopy: [] })).toThrow(/every category needs a categoria.txt/);
  });

  it('throws when a product matches no folder on disk', () => {
    expect(() => build({ productIndex: [indexEntry({ folder: 'Something Else', name: 'Something Else' })] })).toThrow(
      /has no matching folder on disk/,
    );
  });

  it('throws when a product references an unknown category', () => {
    expect(() => build({ sourceProducts: [sourceProduct({ categoria: 'Nonexistent' })] })).toThrow(
      /which matches no categoria.txt/,
    );
  });

  it('throws when a category has an empty description', () => {
    expect(() => build({ categoryCopy: [categoryCopy({ description: '   ' })] })).toThrow(/empty description/);
  });

  it('throws on an orphan folder that exists on disk but not in the source JSON', () => {
    expect(() =>
      build({
        productIndex: [indexEntry(), indexEntry({ folder: 'Orphan Product', name: 'Orphan Product' })],
      }),
    ).toThrow(/no matching entry in catalog.source.json/);
  });

  it('throws when two products collapse to the same slug', () => {
    expect(() =>
      build({
        sourceProducts: [sourceProduct({ nombre: 'Alpha' }), sourceProduct({ nombre: 'Beta' })],
        productIndex: [
          indexEntry({ folder: 'Alpha', name: 'Same Name' }),
          indexEntry({ folder: 'Beta', name: 'Same  Name' }),
        ],
        assetPaths: new Set(['public/products/alpha/imagen.png', 'public/products/beta/imagen.png']),
      }),
    ).toThrow(/product slug is not unique|product id is not unique/);
  });

  it('throws on an unusable CDN url', () => {
    expect(() => build({ sourceProducts: [sourceProduct({ imagen_url: 'not-a-url' })] })).toThrow(
      /unusable imagen_url/,
    );
  });

  it('throws when a category ends up with no products', () => {
    expect(() =>
      build({
        categoryCopy: [categoryCopy(), categoryCopy({ folder: 'Empty Cat', name: 'Empty Cat' })],
      }),
    ).toThrow(/has no products/);
  });
});
