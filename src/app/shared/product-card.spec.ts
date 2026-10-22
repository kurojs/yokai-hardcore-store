/**
 * Specs for the product card.
 *
 * The interesting cases are the ones the catalog's data makes real: names that shout, images
 * that are always local, and a null image that must not become a broken `<img>` or a CDN
 * request. Casing is asserted verbatim because "never transform product-name case" is a hard
 * requirement, and a `text-transform` sneaking into the stylesheet is invisible to a `toContain`
 * assertion — which is why the assertion compares the exact text.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { Product } from '../core/catalog/catalog-model';
import { product } from '../core/catalog/testing/entities';
import { ProductCard } from './product-card';

async function render(
  overrides: Partial<Product> = {},
  categoryName = 'Armería De Héroe',
): Promise<{ fixture: ComponentFixture<ProductCard>; host: HTMLElement }> {
  const fixture = TestBed.createComponent(ProductCard);
  fixture.componentRef.setInput('product', product('algodones', 'curacion', overrides));
  fixture.componentRef.setInput('categoryName', categoryName);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('ProductCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProductCard] }).compileComponents();
  });

  it('keeps the catalog name casing exactly as it arrived', async () => {
    const { host } = await render({ name: 'ALGODONES DE AZUCAR' });

    expect(host.querySelector('.product-card__name')?.textContent?.trim()).toBe(
      'ALGODONES DE AZUCAR',
    );
  });

  it('renders the price through the shared price pipe', async () => {
    const { host } = await render({ priceUsd: 3 });

    expect(host.querySelector('.product-card__price')?.textContent?.trim()).toBe('$3.00');
  });

  it('renders the category name it was given', async () => {
    const { host } = await render({}, 'Mascotas');

    expect(host.querySelector('.product-card__category')?.textContent?.trim()).toBe('Mascotas');
  });

  it('omits the category label when the caller already names the category', async () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', product('algodones', 'curacion'));
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    // Under a catalog group header the label would repeat the header on every card.
    expect(host.querySelector('.product-card__category')).toBeNull();
  });

  it('renders the local image, lazily, with an empty alt because the name is adjacent', async () => {
    const { host } = await render({ imagePath: '/products/algodones/imagen.png' });
    const image = host.querySelector('img');

    expect(image?.getAttribute('src')).toBe('/products/algodones/imagen.png');
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('loading')).toBe('lazy');
  });

  it('renders a neutral block instead of a broken image when the product has none', async () => {
    const { host } = await render({ imagePath: null });

    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('.product-card__image--empty')).not.toBeNull();
  });

  it('stays presentational: an article, never a link', async () => {
    const { host } = await render();

    expect(host.querySelector('article.product-card')).not.toBeNull();
    expect(host.querySelector('a')).toBeNull();
  });
});
