/**
 * Specs for the shared order summary.
 *
 * The value of this component is that both pages render exactly this, so the assertions are
 * about the three numbers a shopper reads and the labels they read them under — not about the
 * layout. Price formatting itself is covered by `price.pipe.spec.ts`.
 */

import { TestBed } from '@angular/core/testing';

import { OrderSummary } from './order-summary';

function render(inputs: {
  itemCount: number;
  subtotalUsd: number;
  totalUsd: number;
  heading?: string;
}): HTMLElement {
  const fixture = TestBed.createComponent(OrderSummary);
  fixture.componentRef.setInput('itemCount', inputs.itemCount);
  fixture.componentRef.setInput('subtotalUsd', inputs.subtotalUsd);
  fixture.componentRef.setInput('totalUsd', inputs.totalUsd);
  if (inputs.heading !== undefined) fixture.componentRef.setInput('heading', inputs.heading);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function rowValues(host: HTMLElement): string[] {
  return [...host.querySelectorAll('.summary__row')].map(
    (row) => row.querySelector('dd')?.textContent?.trim() ?? '',
  );
}

describe('OrderSummary', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrderSummary] });
  });

  it('shows the item count, the subtotal and the total', () => {
    const host = render({ itemCount: 5, subtotalUsd: 7, totalUsd: 7 });

    expect(host.querySelector('.summary__title')?.textContent?.trim()).toBe('Resumen del pedido');
    expect(rowValues(host)).toEqual(['5 artículos', '$7.00', '$7.00']);
    expect(host.textContent).toContain('sin envío ni impuestos');
  });

  it('keeps the unit count grammatical for a single article', () => {
    const host = render({ itemCount: 1, subtotalUsd: 4, totalUsd: 4 });

    expect(rowValues(host)[0]).toBe('1 artículo');
  });

  it('accepts the cart-specific heading without changing the numbers', () => {
    const host = render({
      itemCount: 2,
      subtotalUsd: 2,
      totalUsd: 2,
      heading: 'Resumen del carrito',
    });

    expect(host.querySelector('.summary__title')?.textContent?.trim()).toBe('Resumen del carrito');
    expect(rowValues(host).slice(1)).toEqual(['$2.00', '$2.00']);
  });

  it('renders no amount rather than $NaN when a price is not finite', () => {
    const host = render({ itemCount: 1, subtotalUsd: Number.NaN, totalUsd: Number.NaN });

    expect(rowValues(host).slice(1)).toEqual(['', '']);
    expect(host.textContent).not.toContain('NaN');
  });
});
