/**
 * Specs for the quantity stepper.
 *
 * The point of this control is that it cannot emit an illegal quantity, so the tests are about
 * bounds and about not emitting when nothing changed, not about formatting the number.
 */

import { TestBed } from '@angular/core/testing';

import { MAX_LINE_QUANTITY } from '../core/cart/cart-model';
import { ES_UI_TEXT } from '../core/i18n/dictionaries/es';
import { QuantityStepper } from './quantity-stepper';

interface Rendered {
  readonly fixture: ReturnType<typeof TestBed.createComponent<QuantityStepper>>;
  readonly host: HTMLElement;
  readonly emitted: number[];
}

function render(value: number, inputs: { min?: number; max?: number } = {}): Rendered {
  const fixture = TestBed.createComponent(QuantityStepper);
  const emitted: number[] = [];
  fixture.componentRef.setInput('text', ES_UI_TEXT);
  fixture.componentRef.setInput('value', value);
  if (inputs.min !== undefined) fixture.componentRef.setInput('min', inputs.min);
  if (inputs.max !== undefined) fixture.componentRef.setInput('max', inputs.max);
  fixture.componentInstance.valueChange.subscribe((next) => emitted.push(next));
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement, emitted };
}

function buttons(host: HTMLElement): HTMLButtonElement[] {
  return [...host.querySelectorAll<HTMLButtonElement>('button')];
}

describe('QuantityStepper', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [QuantityStepper] });
  });

  it('shows the value and labels itself for assistive technology', () => {
    const { host } = render(3);

    expect(host.querySelector('.stepper__value')?.textContent?.trim()).toBe('3');
    expect(host.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Cantidad');
    expect(buttons(host).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Quitar una unidad',
      'Añadir una unidad',
    ]);
  });

  it('increments and decrements by one', () => {
    const increment = render(2);
    buttons(increment.host)[1]?.click();
    expect(increment.emitted).toEqual([3]);

    const decrement = render(2);
    buttons(decrement.host)[0]?.click();
    expect(decrement.emitted).toEqual([1]);
  });

  it('disables the button that would leave the range', () => {
    const atMin = render(1);
    expect(buttons(atMin.host)[0]?.disabled).toBe(true);
    expect(buttons(atMin.host)[1]?.disabled).toBe(false);

    const atMax = render(MAX_LINE_QUANTITY);
    expect(buttons(atMax.host)[0]?.disabled).toBe(false);
    expect(buttons(atMax.host)[1]?.disabled).toBe(true);
  });

  it('emits nothing when a click would not change the value', () => {
    const { host, emitted } = render(1);

    buttons(host)[0]?.click();

    expect(emitted).toEqual([]);
  });

  it('honours a narrower custom range', () => {
    const { host, emitted } = render(2, { min: 2, max: 2 });

    expect(buttons(host).every((button) => button.disabled)).toBe(true);
    buttons(host)[1]?.click();
    expect(emitted).toEqual([]);
  });

  it('turns a non-finite value into the minimum instead of displaying or emitting NaN', () => {
    const { host, emitted } = render(Number.NaN, { min: 1 });

    expect(host.querySelector('.stepper__value')?.textContent?.trim()).toBe('1');
    expect(buttons(host)[0]?.disabled).toBe(true);
    buttons(host)[1]?.click();
    expect(emitted).toEqual([2]);
  });
});
