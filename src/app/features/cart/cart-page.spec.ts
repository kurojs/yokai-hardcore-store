/**
 * Specs for the cart page.
 *
 * The cart arithmetic, the persistence adapter and the store are already specified in `core/`.
 * What this file pins is the page a shopper actually edits: the four states, the row contents,
 * the two edit controls, the clamp at 99 as the control shows it, and the rule for a stored line
 * whose product has left the catalog.
 *
 * The totals are asserted against the real committed catalog, so a price change in the data
 * shows up here as a failed expectation rather than as a page that quietly disagrees with the
 * checkout.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartStore } from '../../core/cart/cart-store';
import { CART_STORAGE_KEY } from '../../core/cart/cart-persistence';
import { MAX_LINE_QUANTITY } from '../../core/cart/cart-model';
import { readCommittedCatalogDocument } from '../../core/catalog/testing/committed-catalog';
import { jsonResponse } from '../../core/catalog/testing/http';
import { CartPage } from './cart-page';

interface SeededLine {
  readonly slug: string;
  readonly quantity: number;
}

/** Writes a cart the way a previous visit would have left it. */
function seed(lines: readonly SeededLine[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, lines }));
}

function stubCatalog(): void {
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(readCommittedCatalogDocument())));
}

async function render(): Promise<{ fixture: ComponentFixture<CartPage>; host: HTMLElement }> {
  const fixture = TestBed.createComponent(CartPage);
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

async function waitForLines(fixture: ComponentFixture<CartPage>, host: HTMLElement): Promise<void> {
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(host.querySelectorAll('.line').length).toBeGreaterThan(0);
  });
}

async function waitForEmpty(
  fixture: ComponentFixture<CartPage>,
  host: HTMLElement,
): Promise<void> {
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(host.querySelector('.cart-empty')).not.toBeNull();
  });
}

function text(host: HTMLElement, selector: string): string {
  return host.querySelector(selector)?.textContent?.trim() ?? '';
}

function rowTexts(host: HTMLElement, selector: string): string[] {
  return [...host.querySelectorAll(selector)].map((element) => element.textContent?.trim() ?? '');
}

function summaryValues(host: HTMLElement): string[] {
  return [...host.querySelectorAll('app-order-summary .summary__row dd')].map(
    (value) => value.textContent?.trim() ?? '',
  );
}

describe('CartPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    stubCatalog();
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('says it is loading before it says the cart is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    const { fixture, host } = await render();
    fixture.detectChanges();

    expect(text(host, '.state--loading')).toContain('Cargando carrito');
    expect(host.querySelector('.cart-empty')).toBeNull();
  });

  it('explains an empty cart and offers the way back to the catalog', async () => {
    const { fixture, host } = await render();
    await waitForEmpty(fixture, host);

    expect(text(host, '.cart-empty .state__title')).toBe('Tu carrito está vacío');
    expect(text(host, '.cart-empty .state__message')).toContain('Todavía no has añadido');
    expect(host.querySelector('.cart-empty a.button')?.getAttribute('href')).toBe('/catalog');
    // An empty cart has no summary to show and no rows to count.
    expect(host.querySelector('app-order-summary')).toBeNull();
    expect(host.querySelectorAll('.line')).toHaveLength(0);
  });

  it('renders one row per line with the real image, name and prices', async () => {
    seed([
      { slug: '10-algodones-de-azucar', quantity: 2 },
      { slug: 'cupon-canjeable-para-familiar', quantity: 1 },
    ]);

    const { fixture, host } = await render();
    await waitForLines(fixture, host);

    expect(rowTexts(host, '.line__name')).toEqual([
      '10 ALGODONES DE AZUCAR',
      'CUPÓN CANJEABLE PARA FAMILIAR',
    ]);

    const images = [...host.querySelectorAll<HTMLImageElement>('.line__image')];
    const sources = images.map((image) => image.getAttribute('src') ?? '');
    expect(sources[0]).toBe('/products/10-algodones-de-azucar/imagen.png');
    // The committed catalog is not uniform about the extension (the coupon ships as `.jpg`),
    // so the assertion is on the real product path, not on an assumed suffix.
    expect(sources[1]).toMatch(/^\/products\/cupon-canjeable-para-familiar\/imagen\.(png|jpg)$/);
    // The name is the link text beside the photograph, so the image stays decorative.
    expect(images.every((image) => image.getAttribute('alt') === '')).toBe(true);

    expect(rowTexts(host, '.line__unit .line__money')).toEqual(['$1.00', '$5.00']);
    expect(rowTexts(host, '.line__total .line__money')).toEqual(['$2.00', '$5.00']);
    expect(host.querySelector('.line__name')?.getAttribute('href')).toBe(
      '/product/10-algodones-de-azucar',
    );

    // $1.00 × 2 + $5.00 × 1 = $7.00.
    expect(summaryValues(host)).toEqual(['3 artículos', '$7.00', '$7.00']);
    expect(host.querySelector('.cart__checkout')?.getAttribute('href')).toBe('/checkout');
  });

  it('raises a line quantity through the store and reprices the row and the summary', async () => {
    seed([{ slug: '10-algodones-de-azucar', quantity: 2 }]);

    const { fixture, host } = await render();
    await waitForLines(fixture, host);
    const cart = TestBed.inject(CartStore);

    host
      .querySelector<HTMLButtonElement>('[aria-label="Añadir una unidad de 10 ALGODONES DE AZUCAR"]')
      ?.click();

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(summaryValues(host)[0]).toBe('3 artículos');
    });
    expect(cart.lines()[0]?.quantity).toBe(3);
    expect(rowTexts(host, '.line__total .line__money')).toEqual(['$3.00']);
    expect(summaryValues(host).slice(1)).toEqual(['$3.00', '$3.00']);
  });

  it('never offers a quantity above the cart maximum, even from a repaired stored cart', async () => {
    seed([{ slug: '10-algodones-de-azucar', quantity: 150 }]);

    const { fixture, host } = await render();
    await waitForLines(fixture, host);

    // The persistence adapter repaired 150 to 99 before the store ever saw it.
    expect(text(host, '.stepper__value')).toBe(String(MAX_LINE_QUANTITY));
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('.stepper button')];
    expect(buttons[1]?.disabled).toBe(true);

    buttons[1]?.click();
    await fixture.whenStable();
    expect(TestBed.inject(CartStore).lines()[0]?.quantity).toBe(MAX_LINE_QUANTITY);
  });

  it('removes a line and falls back to the empty state when it was the last one', async () => {
    seed([{ slug: '10-algodones-de-azucar', quantity: 1 }]);

    const { fixture, host } = await render();
    await waitForLines(fixture, host);

    host
      .querySelector<HTMLButtonElement>('[aria-label="Quitar 10 ALGODONES DE AZUCAR del carrito"]')
      ?.click();

    await waitForEmpty(fixture, host);
    expect(TestBed.inject(CartStore).lines()).toEqual([]);
  });

  it('drops a stored line whose product left the catalog instead of rendering NaN', async () => {
    seed([
      { slug: '10-gelatinas-de-slime', quantity: 2 },
      { slug: 'producto-que-ya-no-existe', quantity: 4 },
    ]);

    const { fixture, host } = await render();
    await waitForLines(fixture, host);

    expect(host.querySelectorAll('.line')).toHaveLength(1);
    expect(rowTexts(host, '.line__name')).toEqual(['10 GELATINAS DE SLIME']);
    expect(host.textContent).not.toContain('NaN');
    // $2.00 × 2 = $4.00; the unknown line contributes no row, no unit and no money.
    expect(summaryValues(host)).toEqual(['2 artículos', '$4.00', '$4.00']);
  });

  it('shows the load failure and retries it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(null, { ok: false, status: 503, statusText: 'Unavailable' })),
    );

    const { fixture, host } = await render();

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        'No pudimos cargar el catálogo',
      );
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('503');

    stubCatalog();
    host.querySelector<HTMLButtonElement>('.state button')?.click();

    await waitForEmpty(fixture, host);
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});
