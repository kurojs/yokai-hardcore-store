/**
 * Specs for the demo checkout.
 *
 * What matters here is not just the happy path. The page must refuse to be a payment form, say
 * where the visitor can see it that nothing is charged, validate the one field with a message
 * tied to it, and submit into a confirmation that is honest about being local. The empty-cart
 * redirect is also a real requirement, so the form is never shown for a cart that has nothing
 * to review.
 *
 * The username rule and the reference format are specified in `core/checkout/`; this file pins
 * what the browser does with them.
 */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { CartStore } from '../../core/cart/cart-store';
import { CART_STORAGE_KEY } from '../../core/cart/cart-persistence';
import { readCommittedCatalogDocument } from '../../core/catalog/testing/committed-catalog';
import { jsonResponse } from '../../core/catalog/testing/http';
import { ES_UI_TEXT } from '../../core/i18n/dictionaries/es';
import { CheckoutPage } from './checkout-page';

@Component({ selector: 'app-spec-cart', template: '' })
class SpecCartPage {}

function stubCatalog(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => jsonResponse(readCommittedCatalogDocument())),
  );
}

function seedCart(): void {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      lines: [
        { slug: '10-algodones-de-azucar', quantity: 2 },
        { slug: '10-gelatinas-de-slime', quantity: 1 },
      ],
    }),
  );
}

function text(host: HTMLElement, selector: string): string {
  return host.querySelector(selector)?.textContent?.trim() ?? '';
}

function summaryValues(host: HTMLElement): string[] {
  return [...host.querySelectorAll('app-order-summary .summary__row dd')].map(
    (value) => value.textContent?.trim() ?? '',
  );
}

async function waitForForm(
  fixture: ComponentFixture<CheckoutPage>,
  host: HTMLElement,
): Promise<void> {
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(host.querySelector('form.checkout__form')).not.toBeNull();
  });
}

function typeInto(host: HTMLElement, value: string): void {
  const input = host.querySelector<HTMLInputElement>('#mc-username');
  if (input === null) throw new Error('username input is not rendered');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function submit(host: HTMLElement): void {
  const form = host.querySelector('form');
  if (form === null) throw new Error('form is not rendered');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('CheckoutPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    seedCart();
    stubCatalog();
    await TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([
          { path: 'cart', component: SpecCartPage },
          { path: 'catalog', component: SpecCartPage },
        ]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('reviews the cart with the same line totals and summary as the cart page', async () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    const host = fixture.nativeElement as HTMLElement;
    await waitForForm(fixture, host);

    expect(
      [...host.querySelectorAll('.review__name')].map((name) => name.textContent?.trim()),
    ).toEqual(['10 ALGODONES DE AZUCAR', '10 GELATINAS DE SLIME']);
    expect(
      [...host.querySelectorAll('.review__quantity')].map((value) => value.textContent?.trim()),
    ).toEqual(['2 ×', '1 ×']);
    expect(
      [...host.querySelectorAll('.review__total')].map((value) => value.textContent?.trim()),
    ).toEqual(['$2.00', '$2.00']);

    // $1.00 × 2 + $2.00 × 1 = $4.00.
    expect(summaryValues(host)).toEqual(['3 artículos', '$4.00', '$4.00']);
    expect(host.querySelector('.checkout__edit')?.getAttribute('href')).toBe('/cart');
  });

  it('does not show the form before the catalog has loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    const fixture = TestBed.createComponent(CheckoutPage);
    const host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    expect(text(host, '.state--loading')).toContain('Cargando checkout');
    expect(host.querySelector('form')).toBeNull();
    expect(host.querySelector('app-order-summary')).toBeNull();
  });

  it('keeps the demo disclosure next to the submit control, not in the footer', async () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    const host = fixture.nativeElement as HTMLElement;
    await waitForForm(fixture, host);

    const disclosure = host.querySelector('.checkout__demo');
    expect(disclosure?.textContent?.trim()).toBe(ES_UI_TEXT.checkoutDemoDisclosure);
    expect(disclosure?.closest('form')).not.toBeNull();
    expect(disclosure?.getAttribute('role')).toBe('note');
    expect(host.querySelector('button[type="submit"]')?.textContent).toContain(
      'Completar demostración',
    );
  });

  it('collects no payment data at all', async () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    const host = fixture.nativeElement as HTMLElement;
    await waitForForm(fixture, host);

    const inputs = [...host.querySelectorAll<HTMLInputElement>('input')];
    expect(inputs).toHaveLength(1);
    expect(inputs[0]?.id).toBe('mc-username');
    expect(inputs[0]?.type).toBe('text');

    const copy = host.textContent?.toLowerCase() ?? '';
    expect(copy).not.toContain('tarjeta');
    expect(copy).not.toContain('cvv');
    expect(copy).not.toContain('caducidad');
  });

  it('ties the error to the field, announces it and focuses the field on failure', async () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    const host = fixture.nativeElement as HTMLElement;
    await waitForForm(fixture, host);

    submit(host);
    await fixture.whenStable();

    const input = host.querySelector<HTMLInputElement>('#mc-username');
    const error = host.querySelector('#mc-username-error');
    expect(error?.textContent?.trim()).toBe('Escribe tu nombre de usuario de Minecraft.');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('aria-describedby')).toBe('mc-username-help mc-username-error');
    expect(document.activeElement).toBe(input);
    expect(host.querySelector('.checkout-confirmation')).toBeNull();

    typeInto(host, 'ab');
    await fixture.whenStable();
    expect(text(host, '#mc-username-error')).toBe('El nombre debe tener al menos 3 caracteres.');

    typeInto(host, 'José');
    await fixture.whenStable();
    expect(text(host, '#mc-username-error')).toBe(
      'Solo se permiten letras sin acentos, números y guion bajo (_).',
    );

    typeInto(host, 'Steve_123');
    await fixture.whenStable();
    expect(host.querySelector('#mc-username-error')).toBeNull();
    expect(input?.getAttribute('aria-invalid')).toBeNull();
  });

  it('confirms locally, clears the cart and states that nothing was charged', async () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    const host = fixture.nativeElement as HTMLElement;
    const cart = TestBed.inject(CartStore);
    await waitForForm(fixture, host);
    expect(cart.itemCount()).toBe(3);

    typeInto(host, 'Steve_123');
    await fixture.whenStable();
    submit(host);

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelector('.checkout-confirmation')).not.toBeNull();
    });

    // Order snapshot, taken before the cart was emptied.
    expect(text(host, '.receipt__row dd')).toMatch(/^YOKAI-\d{8}-[0-9A-Z]{4}$/);
    expect(host.textContent).toContain('Steve_123');
    expect(host.textContent).toContain('3 artículos');
    expect(host.textContent).toContain('$4.00');
    expect(text(host, '.checkout-confirmation .state__message')).toBe(
      ES_UI_TEXT.checkoutConfirmationMessage,
    );
    expect(host.textContent).toContain('No se realizó ningún cargo');
    expect(host.textContent).toContain('no se creó ningún pedido');

    // The cart is gone, and the form with it.
    expect(cart.itemCount()).toBe(0);
    expect(cart.lines()).toEqual([]);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toContain('"lines":[]');
    expect(host.querySelector('form')).toBeNull();
    expect(host.querySelector('.checkout-confirmation .receipt')).not.toBeNull();

    // Focus followed the content change instead of staying on the vanished button.
    expect(document.activeElement).toBe(
      host.querySelector('#checkout-confirmation-title') as HTMLElement,
    );
  });

  it('does not persist the confirmation, so a reload starts from the empty cart', async () => {
    const first = TestBed.createComponent(CheckoutPage);
    const firstHost = first.nativeElement as HTMLElement;
    await waitForForm(first, firstHost);
    typeInto(firstHost, 'Steve_123');
    await first.whenStable();
    submit(firstHost);

    await vi.waitFor(async () => {
      await first.whenStable();
      expect(firstHost.querySelector('.checkout-confirmation')).not.toBeNull();
    });

    // A reload is a fresh component over the same storage. The cart is empty and the
    // confirmation was never stored, so the page redirects instead of showing a receipt.
    const second = TestBed.createComponent(CheckoutPage);
    const secondHost = second.nativeElement as HTMLElement;
    await vi.waitFor(async () => {
      await second.whenStable();
      expect(text(secondHost, '.state--loading')).toContain('Volviendo al carrito');
    });

    expect(secondHost.querySelector('.receipt')).toBeNull();
    expect(secondHost.querySelector('form')).toBeNull();
  });

  it('redirects an empty cart instead of rendering an empty form', async () => {
    localStorage.clear();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(CheckoutPage);
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(text(host, '.state--loading')).toContain('Volviendo al carrito');
    });

    expect(navigate).toHaveBeenCalledWith(['/cart'], { replaceUrl: true });
    expect(host.querySelector('form')).toBeNull();
    expect(host.querySelector('app-order-summary')).toBeNull();
  });

  it('shows the load failure and retries it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(null, { ok: false, status: 503, statusText: 'Unavailable' })),
    );

    const fixture = TestBed.createComponent(CheckoutPage);
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        'No pudimos cargar el catálogo',
      );
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('503');

    stubCatalog();
    host.querySelector<HTMLButtonElement>('.state button')?.click();

    await waitForForm(fixture, host);
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});
