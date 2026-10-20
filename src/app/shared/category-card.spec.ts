/**
 * Specs for the category card.
 *
 * Three of the ten real categories have no banner, so the placeholder is a supported state and
 * gets the bulk of the coverage: no `<img>`, a monogram, and a variant class derived from the
 * slug. The variant assertions borrow the hash from `core/` for the "which class" question and
 * then pin two real slugs to concrete numbers, so a change to the hash shows up here as well as
 * in its own spec.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { Category } from '../core/catalog/catalog-model';
import { categoryPlaceholderVariant } from '../core/catalog/category-visual';
import { ES_UI_TEXT } from '../core/i18n/dictionaries/es';
import { category } from '../core/catalog/testing/entities';
import { CategoryCard } from './category-card';

async function render(
  overrides: Partial<Category> = {},
  productCount = 13,
): Promise<{ fixture: ComponentFixture<CategoryCard>; host: HTMLElement }> {
  const fixture = TestBed.createComponent(CategoryCard);
  fixture.componentRef.setInput('text', ES_UI_TEXT);
  fixture.componentRef.setInput('category', category('resucitacion', overrides));
  fixture.componentRef.setInput('productCount', productCount);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('CategoryCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CategoryCard] }).compileComponents();
  });

  it('renders the banner when the category has one', async () => {
    const { host } = await render({ bannerImage: '/categories/resucitacion/banner.png' });
    const image = host.querySelector('img');

    expect(image?.getAttribute('src')).toBe('/categories/resucitacion/banner.png');
    expect(image?.getAttribute('alt')).toBe('');
    expect(host.querySelector('.category-card__placeholder')).toBeNull();
  });

  it('renders a monogram placeholder when the category has no banner', async () => {
    const { host } = await render({ name: 'RESUCITACIÓN', bannerImage: null });

    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('.category-card__monogram')?.textContent?.trim()).toBe('R');
    expect(host.querySelector('.category-card__placeholder')?.className).toContain(
      `category-visual--v${categoryPlaceholderVariant('resucitacion')}`,
    );
  });

  it('picks the same placeholder variant for a slug every time', async () => {
    // Pinned values, measured against the real slugs; the hash itself is specified in
    // `category-visual.spec.ts`. A change here means the design changed, not just the code.
    const first = await render({ slug: 'resucitacion' });
    expect(first.host.querySelector('.category-card__placeholder')?.className).toContain(
      'category-visual--v0',
    );

    const second = await render({ slug: 'mascotas' });
    expect(second.host.querySelector('.category-card__placeholder')?.className).toContain(
      'category-visual--v2',
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
  });

  it('stays presentational: an article, never a link', async () => {
    const { host } = await render();

    expect(host.querySelector('article.category-card')).not.toBeNull();
    expect(host.querySelector('a')).toBeNull();
  });
});
