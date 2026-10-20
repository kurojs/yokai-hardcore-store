/**
 * Specs for the category card.
 *
 * Three of the ten real categories have no banner, so the fallback is a supported state and
 * gets the bulk of the coverage: a real product photograph from that category under a dark
 * overlay, and a plain token surface when the category has no image at all. The card never
 * renders a monogram placeholder any more.
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
    expect(host.querySelector('.category-card__fallback')).toBeNull();
    expect(host.querySelector('.category-card__overlay')).toBeNull();
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

  it('renders a product photograph and the name overlay when the category has no banner', async () => {
    const { host } = await render(
      { name: 'RESUCITACIÓN', bannerImage: null },
      13,
      '/products/tlaloc/1.png',
    );

    expect(host.querySelector('.category-card__fallback')).not.toBeNull();
    expect(host.querySelector('.category-card__fallback--surface')).toBeNull();
    expect(host.querySelector('.category-card__image')?.getAttribute('src')).toBe(
      '/products/tlaloc/1.png',
    );
    expect(host.querySelector('.category-card__image')?.getAttribute('alt')).toBe('');
    expect(host.querySelector('.category-card__overlay')?.textContent?.trim()).toBe('RESUCITACIÓN');
    expect(host.querySelector('.category-card__overlay')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('falls back to a plain surface with the name when no image is available', async () => {
    const { host } = await render({ name: 'RESUCITACIÓN', bannerImage: null }, 13, null);

    expect(host.querySelector('.category-card__image')).toBeNull();
    expect(host.querySelector('.category-card__fallback--surface')).not.toBeNull();
    expect(host.querySelector('.category-card__overlay')?.textContent?.trim()).toBe('RESUCITACIÓN');
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
  });

  it('stays presentational: an article, never a link', async () => {
    const { host } = await render();

    expect(host.querySelector('article.category-card')).not.toBeNull();
    expect(host.querySelector('a')).toBeNull();
  });
});
