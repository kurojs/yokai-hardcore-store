/**
 * Specs for the filter bar.
 *
 * It owns no state, so every test is "given these inputs, this user gesture reports this value".
 * That is also why the tests drive real DOM events instead of calling the handlers: the wiring
 * between an `<input>`/`<select>` and its output is the component's whole reason to exist.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { CatalogSort } from '../../core/catalog/catalog-query';
import { CatalogFilterBar } from './catalog-filter-bar';

const PRICES = [1, 2, 3, 4, 5, 10] as const;

async function render(): Promise<{
  fixture: ComponentFixture<CatalogFilterBar>;
  host: HTMLElement;
}> {
  const fixture = TestBed.createComponent(CatalogFilterBar);
  fixture.componentRef.setInput('text', '');
  fixture.componentRef.setInput('maxPriceUsd', null);
  fixture.componentRef.setInput('sort', 'featured');
  fixture.componentRef.setInput('prices', PRICES);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('CatalogFilterBar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CatalogFilterBar] }).compileComponents();
  });

  it('offers one option per distinct price, formatted as a price', async () => {
    const { host } = await render();
    const options = [...host.querySelectorAll<HTMLOptionElement>('#catalog-price option')];

    expect(options).toHaveLength(PRICES.length + 1);
    expect(options[0]?.textContent?.trim()).toBe('Todos');
    expect(options.map((option) => option.textContent?.trim())).toContain('Hasta $5.00');
    expect(options.map((option) => option.textContent?.trim())).toContain('Hasta $10.00');
  });

  it('reports typed text as it arrives', async () => {
    const { fixture, host } = await render();
    const emitted: string[] = [];
    fixture.componentInstance.textChange.subscribe((value) => emitted.push(value));

    const input = host.querySelector<HTMLInputElement>('#catalog-search');
    input!.value = 'calamar';
    input!.dispatchEvent(new Event('input'));

    expect(emitted).toEqual(['calamar']);
  });

  it('reports a price ceiling as a number and the empty option as no ceiling', async () => {
    const { fixture, host } = await render();
    const emitted: (number | null)[] = [];
    fixture.componentInstance.maxPriceChange.subscribe((value) => emitted.push(value));

    const select = host.querySelector<HTMLSelectElement>('#catalog-price')!;
    select.value = '5';
    select.dispatchEvent(new Event('change'));
    select.value = '';
    select.dispatchEvent(new Event('change'));

    expect(emitted).toEqual([5, null]);
  });

  it('reflects the ceiling the parent holds, so clearing filters resets the control', async () => {
    const { fixture, host } = await render();
    const select = host.querySelector<HTMLSelectElement>('#catalog-price')!;

    fixture.componentRef.setInput('maxPriceUsd', 2);
    await fixture.whenStable();

    expect(select.value).toBe('2');
    expect(select.selectedOptions[0]?.textContent?.trim()).toBe('Hasta $2.00');
  });

  it('reports only a sort order it recognises', async () => {
    const { fixture, host } = await render();
    const emitted: CatalogSort[] = [];
    fixture.componentInstance.sortChange.subscribe((value) => emitted.push(value));

    const select = host.querySelector<HTMLSelectElement>('#catalog-sort')!;
    select.value = 'price-desc';
    select.dispatchEvent(new Event('change'));
    // A value that is not in the list is discarded rather than passed on as a sort order.
    select.value = '';
    select.dispatchEvent(new Event('change'));

    expect(emitted).toEqual(['price-desc']);
  });
});
