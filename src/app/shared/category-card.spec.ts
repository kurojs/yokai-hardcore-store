/**
 * Specs for the category card.
 *
 * The image chain is the important part. Three of the ten real categories have no banner, and one
 * of the seven banners in the committed data is not actually an image (an HTML error page saved
 * with a `.png` extension), so "the file exists" is not the same as "the browser can draw it".
 * The card therefore resolves banner → product photograph → voxel placeholder, and a failed
 * decode moves it along that chain.
 *
 * The description paragraph is asserted absent: it was removed as filler copy.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { Category } from '../core/catalog/catalog-model';
import { ES_UI_TEXT } from '../core/i18n/dictionaries/es';
import { category } from '../core/catalog/testing/entities';
import { CategoryCard } from './category-card';

async function render(
  overrides: Partial<Category> = {},
  productCount = 13,
  fallbackImage: string | null = null,
): Promise<{ fixture: ComponentFixture<CategoryCard>; host: HTMLElement }> {
  const fixture = TestBed.createComponent(CategoryCard);
  fixture.componentRef.setInput('text', ES_UI_TEXT);
  fixture.componentRef.setInput('category', category('resucitacion', overrides));
  fixture.componentRef.setInput('productCount', productCount);
  fixture.componentRef.setInput('fallbackImage', fallbackImage);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

/** Dispatches the `error` event the browser fires when an image cannot be decoded. */
function failImage(host: HTMLElement): void {
  host.querySelector('img')?.dispatchEvent(new Event('error'));
}

describe('CategoryCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CategoryCard] }).compileComponents();
  });

  it('renders the banner when the category has one', async () => {
    const { host } = await render({ bannerImage: '/categories/resucitacion/banner.png' });

    expect(host.querySelector('.category-card__image')?.getAttribute('src')).toBe(
      '/categories/resucitacion/banner.png',
    );
    expect(host.querySelector('.category-card__image')?.getAttribute('alt')).toBe('');
    expect(host.querySelector('.category-card__placeholder')).toBeNull();
  });

  it('prefers the banner over the fallback image', async () => {
    const { host } = await render(
      { bannerImage: '/categories/resucitacion/banner.png' },
      13,
      '/products/tlaloc/1.png',
    );

    expect(host.querySelectorAll('.category-card__image')).toHaveLength(1);
    expect(host.querySelector('.category-card__image')?.getAttribute('src')).toBe(
      '/categories/resucitacion/banner.png',
    );
  });

  it('renders the product photograph when the category has no banner', async () => {
    const { host } = await render(
      { name: 'RESUCITACIÓN', bannerImage: null },
      13,
      '/products/tlaloc/1.png',
    );

    expect(host.querySelector('.category-card__image')?.getAttribute('src')).toBe(
      '/products/tlaloc/1.png',
    );
    expect(host.querySelector('.category-card__image')?.getAttribute('alt')).toBe('');
    expect(host.querySelector('.category-card__placeholder')).toBeNull();
  });

  it('falls back to the product photograph when the banner cannot be decoded', async () => {
    const { fixture, host } = await render(
      { bannerImage: '/categories/rota/categoria_imagen_1.png' },
      13,
      '/products/tlaloc/1.png',
    );

    failImage(host);
    await fixture.whenStable();

    expect(host.querySelector('.category-card__image')?.getAttribute('src')).toBe(
      '/products/tlaloc/1.png',
    );
    expect(host.querySelector('.category-card__placeholder')).toBeNull();
  });

  it('falls back to a named voxel plate when no image can be shown', async () => {
    const { fixture, host } = await render(
      { name: 'RESUCITACIÓN', bannerImage: '/categories/rota/categoria-imagen.png' },
      13,
      null,
    );

    failImage(host);
    await fixture.whenStable();

    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('.category-card__placeholder')).not.toBeNull();
    expect(host.querySelector('.category-card__placeholder-name')?.textContent?.trim()).toBe(
      'RESUCITACIÓN',
    );
  });

  it('labels the product count through the shared helper', async () => {
    const many = await render({}, 13);
    expect(many.host.querySelector('.category-card__count')?.textContent?.trim()).toBe(
      '13 productos',
    );

    const one = await render({}, 1);
    expect(one.host.querySelector('.category-card__count')?.textContent?.trim()).toBe('1 producto');

    const none = await render({}, 0);
    expect(none.host.querySelector('.category-card__count')?.textContent?.trim()).toBe(
      '0 productos',
    );
  });

  it('keeps the category name casing exactly as it arrived', async () => {
    const { host } = await render({ name: 'RESUCITACIÓN' });

    expect(host.querySelector('.category-card__name')?.textContent?.trim()).toBe('RESUCITACIÓN');
    expect(host.querySelector('h3.category-card__name')).not.toBeNull();
  });

  it('renders the name and the count, and no filler description', async () => {
    const { host } = await render({ description: 'Cuatro líneas de copy de marketing.' }, 13);

    expect(host.querySelector('.category-card__description')).toBeNull();
    expect(host.textContent).not.toContain('copy de marketing');
  });

  it('stays presentational: an article, never a link', async () => {
    const { host } = await render();

    expect(host.querySelector('article.category-card')).not.toBeNull();
    expect(host.querySelector('a')).toBeNull();
  });
});
