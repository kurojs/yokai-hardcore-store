/**
 * The cart page and the demo checkout must never disagree about money.
 *
 * They cannot, by construction: both render `CartStore.totals`, which is `cartTotals` over the
 * live catalog, and both put it through the same `OrderSummary` component. This spec is the
 * executable version of that claim — it mounts both pages over the same seeded cart, reads the
 * summary each one actually shows, and compares them with each other and with the arithmetic.
 *
 * It lives at the application root rather than inside either slice because it is an agreement
 * between two slices, and `features/README.md` forbids one slice from importing another.
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartStore } from './core/cart/cart-store';
import { CART_STORAGE_KEY } from './core/cart/cart-persistence';
import { readCommittedCatalogDocument } from './core/catalog/testing/committed-catalog';
import { jsonResponse } from './core/catalog/testing/http';
import { CartPage } from './features/cart/cart-page';
import { CheckoutPage } from './features/checkout/checkout-page';

const SEEDED_LINES = [
  { slug: '10-algodones-de-azucar', quantity: 3 },
  { slug: '10-gelatinas-de-slime', quantity: 2 },
  { slug: '10-cuencos-de-arroz', quantity: 1 },
];

function summaryText(host: HTMLElement): string {
  // The heading intentionally differs ("Resumen del carrito" / "Resumen del pedido"); the
  // numbers and their labels are what must agree, so the heading is excluded from the compare.
  return (host.querySelector('app-order-summary .summary__rows')?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function summaryValues(host: HTMLElement): string[] {
  return [...host.querySelectorAll('app-order-summary .summary__row dd')].map(
    (value) => value.textContent?.trim() ?? '',
  );
}

describe('cart and checkout totals agreement', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ version: 1, lines: SEEDED_LINES }),
    );
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(readCommittedCatalogDocument())));

    await TestBed.configureTestingModule({
      imports: [CartPage, CheckoutPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders the identical summary on both pages and matches cartTotals', async () => {
    const cartFixture = TestBed.createComponent(CartPage);
    const checkoutFixture = TestBed.createComponent(CheckoutPage);
    const cartHost = cartFixture.nativeElement as HTMLElement;
    const checkoutHost = checkoutFixture.nativeElement as HTMLElement;

    await vi.waitFor(async () => {
      await cartFixture.whenStable();
      await checkoutFixture.whenStable();
      expect(cartHost.querySelector('.line')).not.toBeNull();
      expect(checkoutHost.querySelector('form')).not.toBeNull();
    });

    // $1.00 × 3 + $2.00 × 2 + $4.00 × 1 = $11.00.
    expect(summaryValues(cartHost)).toEqual(['6 artículos', '$11.00', '$11.00']);
    expect(summaryValues(checkoutHost)).toEqual(summaryValues(cartHost));
    expect(summaryText(checkoutHost)).toBe(summaryText(cartHost));

    const totals = TestBed.inject(CartStore).totals();
    expect(totals).toEqual({ itemCount: 6, subtotalUsd: 11, totalUsd: 11 });
  });
});
