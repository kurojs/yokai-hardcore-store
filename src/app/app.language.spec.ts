/**
 * Specs for the language switcher in the shell.
 *
 * The switcher is the only place a visitor can change language, so this spec checks the whole
 * observable path rather than the control alone: the label is translated, the options are
 * endonyms, choosing one re-renders the header and footer, the choice is remembered, `<html lang>`
 * follows, and the change is announced. The cart link is checked too, because it sits in the same
 * header row and a layout change must not have cost it its destination.
 */

import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { LANGUAGE_STORAGE_KEY } from './core/i18n/language';
import { CartStore } from './core/cart/cart-store';
import { CatalogStore } from './core/catalog/catalog-store';
import { readCommittedCatalogDocument } from './core/catalog/testing/committed-catalog';
import { jsonResponse } from './core/catalog/testing/http';

/** The shell's header, footer and skip link all read from the active dictionary. */
function switchLanguage(fixture: ComponentFixture<App>, value: string): void {
  const host = fixture.nativeElement as HTMLElement;
  const select = host.querySelector<HTMLSelectElement>('#language-select');

  expect(select).not.toBeNull();
  select!.value = value;
  select!.dispatchEvent(new Event('change'));
}

describe('App language switcher', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.lang = 'es';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(readCommittedCatalogDocument())),
    );
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.lang = 'es';
  });

  it('offers all three languages with endonym labels under a translated label', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const select = host.querySelector('#language-select');
    const label = host.querySelector('label[for="language-select"]');

    expect(select?.tagName).toBe('SELECT');
    expect(label?.textContent?.trim()).toBe('Idioma');
    expect([...host.querySelectorAll('#language-select option')].map((option) => option.textContent)).toEqual(
      ['Español', 'English', '日本語'],
    );
  });

  it('switches the whole shell to Japanese and remembers it', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    switchLanguage(fixture, 'ja');
    await fixture.whenStable();

    expect(host.querySelector('.skip-link')?.textContent?.trim()).toBe('本文へスキップ');
    expect([...host.querySelectorAll('.nav a')].map((link) => link.textContent?.trim())).toEqual([
      'ホーム',
      'カタログ',
    ]);
    expect(host.querySelector('.language-switcher__label')?.textContent?.trim()).toBe('言語');
    expect(host.querySelector('.cart-indicator')?.textContent).toContain('カートは空です');
    // The footer is chrome too, and its headings are translated with everything else.
    expect(host.querySelector('.shell__footer-heading')?.textContent?.trim()).toBe('ストア');
    expect(host.querySelector('.shell__footer-bottom')?.textContent?.trim()).toBe(
      `© ${new Date().getFullYear()} Yokai Hardcore`,
    );
    expect(document.documentElement.lang).toBe('ja');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
  });

  it('announces the change in the language that was just selected', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    switchLanguage(fixture, 'ja');
    await fixture.whenStable();

    // The shell has two polite status regions: the cart count first, the language notice second.
    const statuses = [...host.querySelectorAll('[role="status"][aria-live="polite"]')];
    expect(statuses).toHaveLength(2);
    expect(statuses[1].textContent?.trim()).toBe('言語を日本語に変更しました。');
  });

  it('starts in the language remembered from a previous visit', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.skip-link')?.textContent?.trim()).toBe('Skip to content');
    expect(host.querySelector<HTMLSelectElement>('#language-select')?.value).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('keeps the cart link pointing at the cart page after a switch', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    switchLanguage(fixture, 'en');
    await fixture.whenStable();

    expect(host.querySelector('.cart-indicator')?.getAttribute('href')).toBe('/cart');
    expect(host.querySelector('.cart-indicator')?.textContent).toContain('Cart is empty');
  });

  it('keeps the cart count in the active language', async () => {
    const fixture = TestBed.createComponent(App);
    const host = fixture.nativeElement as HTMLElement;
    const catalog = TestBed.inject(CatalogStore);

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(catalog.isReady()).toBe(true);
    });

    switchLanguage(fixture, 'ja');
    await fixture.whenStable();
    TestBed.inject(CartStore).add('10-algodones-de-azucar', 2);
    await fixture.whenStable();

    expect(host.querySelector('.cart-indicator')?.textContent).toContain('カート: 2点');
  });
});
