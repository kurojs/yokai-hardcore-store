/**
 * Specs for language initialization in the application shell.
 *
 * Language changes are managed outside the header. The shell still reads its active dictionary
 * from LanguageStore, including a preference restored from storage before the first render.
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { LANGUAGE_STORAGE_KEY } from './core/i18n/language';
import { readCommittedCatalogDocument } from './core/catalog/testing/committed-catalog';
import { jsonResponse } from './core/catalog/testing/http';

describe('App language initialization', () => {
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

  it('renders without a language selector or language-change announcement', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('#language-select')).toBeNull();
    expect(host.querySelector('.language-switcher')).toBeNull();
    expect(host.querySelector('.language-switcher__label')).toBeNull();
    // The cart count remains the shell's one live status region.
    expect(host.querySelectorAll('[role="status"][aria-live="polite"]')).toHaveLength(1);
  });

  it('starts in the stored language and renders the translated shell', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ja');

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.skip-link')?.textContent?.trim()).toBe('本文へスキップ');
    expect([...host.querySelectorAll('.nav a')].map((link) => link.textContent?.trim())).toEqual([
      'ホーム',
      'カタログ',
    ]);
    expect(host.querySelector('.cart-indicator')?.textContent).toContain('カートは空です');
    expect(host.querySelector('.shell__footer-heading')?.textContent?.trim()).toBe('ストア');
    expect(document.documentElement.lang).toBe('ja');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
  });

  it('keeps the cart link and count in the stored language', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');

    const fixture = TestBed.createComponent(App);
    const host = fixture.nativeElement as HTMLElement;

    await fixture.whenStable();
    expect(host.querySelector('.cart-indicator')?.getAttribute('href')).toBe('/cart');
    expect(host.querySelector('.cart-indicator')?.textContent).toContain('Cart is empty');
    expect(document.documentElement.lang).toBe('en');
  });
});
