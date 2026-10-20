/**
 * Specs for the browse row.
 *
 * The catalog's data makes these cases real: names that shout, local images only, and a null
 * image that must not become a broken `<img>` or a CDN request. The row is presentational, so
 * it must never render its own anchor.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { Product } from '../core/catalog/catalog-model';
import { product } from '../core/catalog/testing/entities';
import { ES_UI_TEXT } from '../core/i18n/dictionaries/es';
import { ProductRow } from './product-row';

async function render(
  overrides: Partial<Product> = {},
  categoryName = 'Armería De Héroe',
): Promise<{ fixture: ComponentFixture<ProductRow>; host: HTMLElement }> {
  const fixture = TestBed.createComponent(ProductRow);
  fixture.componentRef.setInput('product', product('algodones', 'curacion', overrides));
  fixture.componentRef.setInput('categoryName', categoryName);
  fixture.componentRef.setInput('text', ES_UI_TEXT);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('ProductRow', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProductRow] }).compileComponents();
  });

  it('keeps the catalog name casing exactly as it arrived', async () => {
    const { host } = await render({ name: 'ALGODONES DE AZUCAR' });

    expect(host.querySelector('.product-row__name')?.textContent?.trim()).toBe(
      'ALGODONES DE AZUCAR',
    );
  });

  it('renders the price through the shared price pipe, right-aligned', async () => {
    const { host } = await render({ priceUsd: 3 });

    expect(host.querySelector('.product-row__price')?.textContent?.trim()).toBe('$3.00');
  });

  it('shows the category inline and as a tag, plus the digital-delivery attribute', async () => {
    const { host } = await render({}, 'Mascotas');

    expect(host.querySelector('.product-row__category')?.textContent?.trim()).toBe('Mascotas');
    expect(
      [...host.querySelectorAll('.product-row__tag')].map((tag) => tag.textContent?.trim()),
    ).toEqual(['Mascotas', 'Entrega digital']);
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
    expect(host.querySelector('.product-row__image--empty')).not.toBeNull();
  });

  it('stays presentational: an article, never a link', async () => {
    const { host } = await render();

    expect(host.querySelector('article.product-row')).not.toBeNull();
    expect(host.querySelector('a')).toBeNull();
  });
});
