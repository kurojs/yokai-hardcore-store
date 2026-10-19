/**
 * Specs for the catalog page.
 *
 * Most of the behaviour lives in `core/` already — search folding, the inclusive price ceiling,
 * the stable sorts — and is specified there. What these tests pin is the wiring the page adds:
 * the route slug becomes a category, the filter bar's outputs become the query, and the three
 * load states plus the empty state stay distinct. The numbers come from the real 48-product
 * catalog, so a change in the data shows up as a failing expectation rather than a silent shift.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { readCommittedCatalogDocument } from '../../core/catalog/testing/committed-catalog';
import { jsonResponse } from '../../core/catalog/testing/http';
import { CatalogPage } from './catalog-page';

async function render(slug?: string): Promise<{
  fixture: ComponentFixture<CatalogPage>;
  host: HTMLElement;
}> {
  const fixture = TestBed.createComponent(CatalogPage);
  if (slug !== undefined) fixture.componentRef.setInput('slug', slug);
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

/** Waits until the catalog has loaded and the grid is on screen. */
async function waitForProducts(
  fixture: ComponentFixture<CatalogPage>,
  host: HTMLElement,
  count: number,
): Promise<void> {
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(host.querySelectorAll('app-product-card')).toHaveLength(count);
  });
}

function products(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('app-product-card')];
}

describe('CatalogPage', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(readCommittedCatalogDocument())),
    );
    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('announces that the catalog is loading instead of showing an empty grid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    const { fixture, host } = await render();
    fixture.detectChanges();

    expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('Cargando catálogo');
    expect(host.querySelector('app-catalog-filter-bar')).toBeNull();
  });

  it('shows every product and the count on /catalog', async () => {
    const { fixture, host } = await render();

    await waitForProducts(fixture, host, 48);

    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Todos los productos');
    expect(host.querySelector('.results-line')?.textContent?.trim()).toBe('48 productos');
    expect(host.querySelectorAll('.chip')).toHaveLength(11);
  });

  it('turns the route slug into a category and shows only its products', async () => {
    const { fixture, host } = await render('mascotas');

    await waitForProducts(fixture, host, 1);

    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Mascotas');
    expect(host.querySelector('.results-line')?.textContent?.trim()).toBe('1 producto');
    expect(products(host)[0]?.textContent).toContain('CUPÓN CANJEABLE PARA FAMILIAR');
    // The category chip for the current category is the active one.
    expect(host.querySelector('.chip.is-active')?.getAttribute('aria-current')).toBe('page');
  });

  it('reports an unknown slug instead of silently showing the whole catalog', async () => {
    const { fixture, host } = await render('no-existe');

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelector('.state__title')?.textContent).toContain(
        'No encontramos esa categoría',
      );
    });

    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Categoría no encontrada');
    expect(host.querySelector('a.button')?.getAttribute('href')).toBe('/catalog');
    expect(host.querySelectorAll('app-product-card')).toHaveLength(0);
  });

  it('narrows the grid as the visitor types, accent-insensitively', async () => {
    const { fixture, host } = await render();
    await waitForProducts(fixture, host, 48);

    const search = host.querySelector<HTMLInputElement>('#catalog-search')!;
    search.value = 'Calámar';
    search.dispatchEvent(new Event('input'));

    await waitForProducts(fixture, host, 1);
    expect(products(host)[0]?.textContent).toContain('Calamar');
  });

  it('applies the price ceiling inclusively', async () => {
    const { fixture, host } = await render();
    await waitForProducts(fixture, host, 48);

    const price = host.querySelector<HTMLSelectElement>('#catalog-price')!;
    price.value = '2';
    price.dispatchEvent(new Event('change'));

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelector('.results-line')?.textContent?.trim()).toBe('25 productos');
    });
  });

  it('sorts by price from the cheapest to the most expensive', async () => {
    const { fixture, host } = await render();
    await waitForProducts(fixture, host, 48);

    const sort = host.querySelector<HTMLSelectElement>('#catalog-sort')!;
    sort.value = 'price-asc';
    sort.dispatchEvent(new Event('change'));

    await vi.waitFor(async () => {
      await fixture.whenStable();
      const prices = [...host.querySelectorAll('.product-card__price')].map((node) =>
        node.textContent?.trim(),
      );
      expect(prices[0]).toBe('$1.00');
      expect(prices.at(-1)).toBe('$10.00');
      expect(prices).toHaveLength(48);
    });
  });

  it('explains an empty result and clears the filters on request', async () => {
    const { fixture, host } = await render();
    await waitForProducts(fixture, host, 48);

    const search = host.querySelector<HTMLInputElement>('#catalog-search')!;
    search.value = 'no-existe-este-producto';
    search.dispatchEvent(new Event('input'));

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelector('.state__title')?.textContent).toContain(
        'Ningún producto coincide',
      );
    });
    expect(host.querySelector('.results-line')).toBeNull();

    host.querySelector<HTMLButtonElement>('.state button')?.click();

    await waitForProducts(fixture, host, 48);
    expect(host.querySelector<HTMLInputElement>('#catalog-search')?.value).toBe('');
  });

  it('shows the failure and retries it', async () => {
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
  });
});
