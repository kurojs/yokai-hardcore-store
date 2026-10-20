/**
 * Specs for the catalog's search toolbar.
 *
 * It owns no state, so the test is "given this input, this gesture reports this value". The
 * labels come from the Spanish dictionary because that is the default language; the
 * cross-language shape is specified once in `core/i18n/ui-text.spec.ts`.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ES_UI_TEXT } from '../../core/i18n/dictionaries/es';
import { CatalogFilterBar } from './catalog-filter-bar';

async function render(): Promise<{
  fixture: ComponentFixture<CatalogFilterBar>;
  host: HTMLElement;
}> {
  const fixture = TestBed.createComponent(CatalogFilterBar);
  fixture.componentRef.setInput('text', ES_UI_TEXT);
  fixture.componentRef.setInput('searchText', '');
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('CatalogFilterBar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CatalogFilterBar] }).compileComponents();
  });

  it('labels the search field and exposes it as a search landmark', async () => {
    const { host } = await render();

    expect(host.querySelector('[role="search"]')?.getAttribute('aria-label')).toBe(
      'Filtros del catálogo',
    );
    expect(host.querySelector('label[for="catalog-search"]')?.textContent?.trim()).toBe('Buscar');
  });

  it('reports typed text as it arrives', async () => {
    const { fixture, host } = await render();
    const emitted: string[] = [];
    fixture.componentInstance.searchTextChange.subscribe((value) => emitted.push(value));

    const input = host.querySelector<HTMLInputElement>('#catalog-search');
    input!.value = 'calamar';
    input!.dispatchEvent(new Event('input'));

    expect(emitted).toEqual(['calamar']);
  });

  it('reflects the text the parent holds, so clearing filters resets the control', async () => {
    const { fixture, host } = await render();
    const input = host.querySelector<HTMLInputElement>('#catalog-search')!;

    fixture.componentRef.setInput('searchText', 'mascotas');
    await fixture.whenStable();

    expect(input.value).toBe('mascotas');
  });
});
