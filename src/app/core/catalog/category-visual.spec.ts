/**
 * Specs for the no-banner category fallback.
 *
 * The rule is deliberately small, so the tests pin the three properties that matter: it takes
 * the first product *in catalog order* that has an image, it skips products without one instead
 * of falling back to a monogram, and it is total for categories that do not exist.
 */

import type { Category, Product } from './catalog-model';
import { categoryFallbackImage } from './category-visual';
import { category, indexOf, product } from './testing/entities';

function entriesOf(categories: readonly Category[], products: readonly Product[]) {
  return indexOf(categories, products).entries;
}

describe('categoryFallbackImage', () => {
  it('uses the first product in catalog order that has a local image', () => {
    const entries = entriesOf(
      [category('yokai-coins')],
      [
        product('segundo', 'yokai-coins', { imagePath: '/products/segundo/imagen.png' }),
        product('primero', 'yokai-coins', { imagePath: '/products/primero/imagen.png' }),
      ],
    );

    // Catalog order is authoritative: it is not re-sorted by name.
    expect(categoryFallbackImage(entries, 'yokai-coins')).toBe('/products/segundo/imagen.png');
  });

  it('skips a product without an image instead of giving up', () => {
    const entries = entriesOf(
      [category('resucitacion')],
      [
        product('sin-imagen', 'resucitacion', { imagePath: null }),
        product('con-imagen', 'resucitacion', { imagePath: '/products/con-imagen/imagen.png' }),
      ],
    );

    expect(categoryFallbackImage(entries, 'resucitacion')).toBe('/products/con-imagen/imagen.png');
  });

  it('is total for unknown and empty categories', () => {
    expect(categoryFallbackImage([], 'mascotas')).toBeNull();

    const entries = entriesOf([category('mascotas')], []);
    expect(categoryFallbackImage(entries, 'mascotas')).toBeNull();
    expect(categoryFallbackImage(entries, 'no-existe')).toBeNull();
  });

  it('never answers with a remote image', () => {
    const entries = entriesOf(
      [category('cofres-ofertas')],
      [product('cofre', 'cofres-ofertas', { imagePath: '/products/cofre/imagen.jpeg' })],
    );
    const image = categoryFallbackImage(entries, 'cofres-ofertas');

    expect(image?.startsWith('/')).toBe(true);
    expect(image).not.toMatch(/^https?:/);
  });
});
