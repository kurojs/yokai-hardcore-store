import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { CartStore } from './core/cart/cart-store';
import { CatalogStore } from './core/catalog/catalog-store';
import { readCommittedCatalogDocument } from './core/catalog/testing/committed-catalog';
import { jsonResponse } from './core/catalog/testing/http';

/**
 * Specs for the shell.
 *
 * They assert the furniture a visitor needs — landmarks, the two primary links, the cart count,
 * the demo disclaimer — rather than pixel structure, and they assert the links by their rendered
 * `href`, because that is what proves `routerLink` points at a route that exists.
 *
 * The cart count is checked from both ends: it must be a link to `/cart` whose accessible name
 * includes the count and the destination, and it must actually follow the store once something
 * is added while a separate polite live region keeps announcing the change.
 */
describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
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
  });

  it('creates the shell', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders one main landmark where routed content goes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('main')).toHaveLength(1);
    expect(host.querySelector('main#main router-outlet')).not.toBeNull();
  });

  it('points the primary navigation at the home and catalog routes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const hrefs = [...host.querySelectorAll('nav a')].map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/', '/catalog']);
    expect(host.querySelector('.brand')?.getAttribute('href')).toBe('/');
  });

  it('offers a skip link to the main landmark', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.skip-link')?.getAttribute('href')).toBe('#main');
  });

  it('links the cart count to the cart page and keeps a polite live region', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const indicator = host.querySelector('.cart-indicator');

    expect(indicator?.tagName).toBe('A');
    expect(indicator?.getAttribute('href')).toBe('/cart');
    // The accessible name includes the count and the destination, not just one of them.
    expect(indicator?.textContent).toContain('Carrito vacío');
    expect(indicator?.textContent).toContain('Ir a la página del carrito');

    // A separate polite live region announces count changes without stealing focus.
    const announcer = host.querySelector('[role="status"][aria-live="polite"]');
    expect(announcer?.textContent?.trim()).toBe('Carrito vacío');
  });

  it('follows the cart store once something is added', async () => {
    const fixture = TestBed.createComponent(App);
    const host = fixture.nativeElement as HTMLElement;
    const catalog = TestBed.inject(CatalogStore);
    const cart = TestBed.inject(CartStore);

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(catalog.isReady()).toBe(true);
    });

    cart.add('10-algodones-de-azucar', 2);
    await fixture.whenStable();

    expect(host.querySelector('.cart-indicator')?.textContent).toContain(
      'Carrito: 2 artículos',
    );
    expect(host.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Carrito: 2 artículos',
    );
  });

  it('keeps the non-affiliation note in the footer, where a buyer can find it', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('footer')?.textContent).toContain(
      'No está afiliada a Mojang Studios',
    );
  });
});
