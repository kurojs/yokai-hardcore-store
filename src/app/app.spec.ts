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

  it('reserves one decorative background layer for every route', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const layers = host.querySelectorAll('.app-scene');
    expect(layers).toHaveLength(1);
    // The scene is a world, not content: it is hidden from assistive technology and never
    // intercepts a click.
    expect(layers[0]?.getAttribute('aria-hidden')).toBe('true');
    // It belongs to the shell, outside the routed main, so navigating does not restart it.
    expect(host.querySelector('main .app-scene')).toBeNull();
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
    const hrefs = [...host.querySelectorAll('.nav a')].map((link) => link.getAttribute('href'));

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

  it('closes the page with a real footer: brand, shop links and the biggest categories', async () => {
    const fixture = TestBed.createComponent(App);

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(TestBed.inject(CatalogStore).isReady()).toBe(true);
    });

    const host = fixture.nativeElement as HTMLElement;
    const footer = host.querySelector('footer');

    expect(footer?.querySelector('.shell__footer-brand')?.textContent?.trim()).toBe(
      'Yokai Hardcore Store',
    );

    const columns = [...(footer?.querySelectorAll('.shell__footer-column') ?? [])];
    expect(columns.map((column) => column.querySelector('h2')?.textContent?.trim())).toEqual([
      'Tienda',
      'Categorías',
    ]);

    // The shop column is navigation, by href, so the links are proven to point at real routes.
    expect([...columns[0].querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/catalog',
      '/cart',
    ]);

    // The category column is catalog data in Spanish, five links into /catalog/:slug.
    const categoryLinks = [...columns[1].querySelectorAll('a')];
    expect(categoryLinks).toHaveLength(5);
    for (const link of categoryLinks) {
      expect(link.getAttribute('href')).toMatch(/^\/catalog\/[a-z0-9-]+$/);
    }

    const bottom = footer?.querySelector('.shell__footer-bottom');
    expect(bottom?.textContent?.trim()).toBe(`© ${new Date().getFullYear()} Yokai Hardcore`);
    // The legal boilerplate went with the rest of the filler copy.
    expect(footer?.textContent).not.toContain('Mojang');
  });
});
