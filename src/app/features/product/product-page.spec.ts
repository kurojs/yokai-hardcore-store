/**
 * Specs for the product detail page.
 *
 * The page is mostly wiring: the catalog store gives it a product, the cart store takes the
 * addition, and both are specified elsewhere. What these tests pin is the wiring a shopper
 * actually sees — the four states, the image-first hero, the related strip's honest heading,
 * the live-region confirmation and the document title — against the committed catalog.
 *
 * The unknown-slug state is the one worth the most attention: `/product/…` is served by the SPA
 * fallback with HTTP 200, so "not found" cannot be an HTTP status here. It has to be rendered,
 * and this file is the proof that it is.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartStore } from '../../core/cart/cart-store';
import { readCommittedCatalogDocument } from '../../core/catalog/testing/committed-catalog';
import { jsonResponse } from '../../core/catalog/testing/http';
import { ProductPage } from './product-page';

function stubCatalog(): void {
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(readCommittedCatalogDocument())));
}

async function render(slug: string): Promise<{
  fixture: ComponentFixture<ProductPage>;
  host: HTMLElement;
}> {
  const fixture = TestBed.createComponent(ProductPage);
  fixture.componentRef.setInput('slug', slug);
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

/** Waits until the catalog has loaded and the product hero is on screen. */
async function waitForProduct(
  fixture: ComponentFixture<ProductPage>,
  host: HTMLElement,
): Promise<void> {
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(host.querySelector('.product__name')).not.toBeNull();
  });
}

function text(host: HTMLElement, selector: string): string {
  return host.querySelector(selector)?.textContent?.trim() ?? '';
}

describe('ProductPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.title = '';
    stubCatalog();
    await TestBed.configureTestingModule({
      imports: [ProductPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('announces loading instead of flashing a not-found page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    const { fixture, host } = await render('10-algodones-de-azucar');
    fixture.detectChanges();

    expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('Cargando producto');
    expect(host.textContent).not.toContain('No encontramos ese producto');
    expect(document.title).toBe('');
  });

  it('shows the product image first, with its name as the alt text', async () => {
    const { fixture, host } = await render('10-algodones-de-azucar');
    await waitForProduct(fixture, host);

    const image = host.querySelector<HTMLImageElement>('img.product__image');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toContain('/products/10-algodones-de-azucar/imagen.png');
    expect(image?.getAttribute('alt')).toBe('10 ALGODONES DE AZUCAR');
    // No 3D on a product: the hero is the photograph, never a canvas or a model viewer.
    expect(host.querySelector('canvas')).toBeNull();
    expect(host.querySelector('app-bbmodel-viewer')).toBeNull();
  });

  it('shows the name, the price, the category link and the description', async () => {
    const { fixture, host } = await render('10-algodones-de-azucar');
    await waitForProduct(fixture, host);

    expect(text(host, '.product__name')).toBe('10 ALGODONES DE AZUCAR');
    expect(text(host, '.product__price')).toBe('$1.00');
    expect(host.querySelector('.product__category-link')?.getAttribute('href')).toBe(
      '/catalog/alimento-yokai-para-guerreros-y-pets',
    );
    expect(text(host, '.product__category')).toBe('Alimento Yokai para guerreros y pets');

    // The description keeps its structure: several blocks, and at least one editorial label.
    expect(host.querySelectorAll('.description__block').length).toBeGreaterThan(1);
    expect(host.querySelector('.description__label')?.textContent).toContain(':');
    expect(host.querySelector('.product__description')?.textContent).toContain(
      'Características del Alimento',
    );
  });

  it('renders a real not-found state for an unknown slug', async () => {
    const { fixture, host } = await render('no-existe-este-producto');

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelector('.state__title')?.textContent).toContain(
        'No encontramos ese producto',
      );
    });

    expect(host.querySelector('h1')?.textContent?.trim()).toBe('No encontramos ese producto');
    expect(host.querySelector('a.button')?.getAttribute('href')).toBe('/catalog');
    // Not a soft 404 with an empty product skeleton: no hero and no related cards at all.
    expect(host.querySelector('.product__name')).toBeNull();
    expect(host.querySelectorAll('app-product-card')).toHaveLength(0);
    expect(document.title).toBe('Producto no encontrado — Yokai Hardcore Store');
  });

  it('titles the page after the product once it is known', async () => {
    const { fixture, host } = await render('10-algodones-de-azucar');
    await waitForProduct(fixture, host);

    expect(document.title).toBe('10 ALGODONES DE AZUCAR — Yokai Hardcore Store');
  });

  it('shows related products from the same category', async () => {
    const { fixture, host } = await render('10-algodones-de-azucar');
    await waitForProduct(fixture, host);

    expect(text(host, '#relacionados-title')).toBe('Más de Alimento Yokai para guerreros y pets');
    expect(host.querySelectorAll('app-product-card')).toHaveLength(3);
    expect(
      [...host.querySelectorAll<HTMLAnchorElement>('.card-link')].map((link) =>
        link.getAttribute('href'),
      ),
    ).toEqual([
      '/product/10-cuencos-de-arroz',
      '/product/10-galletas-creeper',
      '/product/10-gelatinas-de-slime',
    ]);
  });

  it('widens the related strip instead of rendering an empty section', async () => {
    // Mascotas holds exactly one product, so "Más de Mascotas" would be an empty strip.
    const { fixture, host } = await render('cupon-canjeable-para-familiar');
    await waitForProduct(fixture, host);

    expect(text(host, '#relacionados-title')).toBe('Otros productos');
    expect(host.querySelectorAll('app-product-card')).toHaveLength(3);
  });

  it('adds the selected quantity to the cart and announces the new count', async () => {
    const { fixture, host } = await render('10-algodones-de-azucar');
    await waitForProduct(fixture, host);
    const cart = TestBed.inject(CartStore);

    host.querySelector<HTMLButtonElement>('[aria-label="Añadir una unidad"]')!.click();
    await fixture.whenStable();
    expect(text(host, '.stepper__value')).toBe('2');

    host.querySelector<HTMLButtonElement>('app-add-to-cart-button button')!.click();

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(cart.itemCount()).toBe(2);
    });
    expect(text(host, '.product__confirmation')).toContain(
      'Añadido al carrito: 10 ALGODONES DE AZUCAR.',
    );
    expect(text(host, '.product__confirmation')).toContain('2 artículos en el carrito');

    // The count in the sentence is what makes a second addition announce something new.
    host.querySelector<HTMLButtonElement>('app-add-to-cart-button button')!.click();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(text(host, '.product__confirmation')).toContain('4 artículos en el carrito');
    });
    expect(cart.itemCount()).toBe(4);
  });

  it('forgets the selection and the confirmation when the slug changes', async () => {
    const { fixture, host } = await render('10-algodones-de-azucar');
    await waitForProduct(fixture, host);

    host.querySelector<HTMLButtonElement>('[aria-label="Añadir una unidad"]')!.click();
    host.querySelector<HTMLButtonElement>('app-add-to-cart-button button')!.click();
    await fixture.whenStable();

    fixture.componentRef.setInput('slug', '10-cuencos-de-arroz');
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(text(host, '.product__name')).toBe('10 Cuencos de arroz');
    });

    expect(text(host, '.stepper__value')).toBe('1');
    expect(text(host, '.product__confirmation')).toBe('');
  });

  it('shows the failure and retries the load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(null, { ok: false, status: 503, statusText: 'Unavailable' })),
    );

    const { fixture, host } = await render('10-algodones-de-azucar');

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        'No pudimos cargar el catálogo',
      );
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('503');
    expect(document.title).toBe('Yokai Hardcore Store');

    stubCatalog();
    host.querySelector<HTMLButtonElement>('.state button')!.click();

    await waitForProduct(fixture, host);
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});
