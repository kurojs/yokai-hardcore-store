/**
 * Specs for the add-to-cart button.
 *
 * The behaviour is one output and no state, so what is worth pinning is the accessible name: a
 * page that lists related products has several "Añadir al carrito" buttons, and a screen-reader
 * user has to be able to tell them apart without seeing the surrounding heading.
 */

import { TestBed } from '@angular/core/testing';

import { ES_UI_TEXT } from '../core/i18n/dictionaries/es';
import { AddToCartButton } from './add-to-cart-button';

function render(productName: string, label?: string): {
  readonly host: HTMLElement;
  readonly clicks: number[];
} {
  const fixture = TestBed.createComponent(AddToCartButton);
  const clicks: number[] = [];
  fixture.componentRef.setInput('text', ES_UI_TEXT);
  fixture.componentRef.setInput('productName', productName);
  if (label !== undefined) fixture.componentRef.setInput('label', label);
  fixture.componentInstance.add.subscribe(() => clicks.push(1));
  fixture.detectChanges();
  return { host: fixture.nativeElement as HTMLElement, clicks };
}

describe('AddToCartButton', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AddToCartButton] });
  });

  it('renders a plain button, not a form submit', () => {
    const { host } = render('Cofre de runas');
    const button = host.querySelector('button');

    expect(button?.type).toBe('button');
    expect(button?.textContent?.trim()).toContain('Añadir al carrito');
  });

  it('emits once per click', () => {
    const { host, clicks } = render('Cofre de runas');

    host.querySelector('button')?.click();
    host.querySelector('button')?.click();

    expect(clicks).toHaveLength(2);
  });

  it('keeps the visible label in the accessible name and appends the product', () => {
    const { host } = render('10 ALGODONES DE AZUCAR');
    const button = host.querySelector('button');

    // The product name is inside the button rather than an aria-label, so voice control can
    // still say what it sees.
    expect(button?.getAttribute('aria-label')).toBeNull();
    expect(button?.textContent).toContain('Añadir al carrito');
    expect(button?.textContent).toContain('10 ALGODONES DE AZUCAR');
  });

  it('lets a caller override the visible label', () => {
    const { host } = render('Cofre de runas', 'Anadir otra vez');

    expect(host.querySelector('button')?.textContent).toContain('Anadir otra vez');
  });
});
