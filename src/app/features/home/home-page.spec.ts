/**
 * Specs for the landing page.
 *
 * The page is mostly a view over the shared store, so what is worth pinning is the three states
 * and the fact that the cards receive real catalog values: a page that renders an empty grid
 * when the fetch fails would look like a store with nothing to sell. The category links are
 * asserted by `href`, because that is the one thing a visitor can actually act on.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { readCommittedCatalogDocument } from '../../core/catalog/testing/committed-catalog';
import { jsonResponse } from '../../core/catalog/testing/http';
import { HomePage } from './home-page';

function stubFetch(body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => jsonResponse(body));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function render(): Promise<{ fixture: ComponentFixture<HomePage>; host: HTMLElement }> {
  const fixture = TestBed.createComponent(HomePage);
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('HomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('announces that the catalog is loading instead of showing an empty page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    const { fixture, host } = await render();
    // `whenStable` never resolves here: the request is deliberately still pending, so the
    // page's first frame is forced instead of awaited.
    fixture.detectChanges();

    expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('Cargando catálogo');
    expect(host.querySelector('app-category-card')).toBeNull();
  });

  it('renders the real category and featured counts once the catalog arrives', async () => {
    stubFetch(readCommittedCatalogDocument());

    const { fixture, host } = await render();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelectorAll('app-category-card')).toHaveLength(10);
    });

    const stats = [...host.querySelectorAll('.hero__stat dd')].map((node) =>
      node.textContent?.trim(),
    );
    expect(stats).toEqual(['48 productos', '10', '$1.00']);
    expect(host.querySelectorAll('app-product-card')).toHaveLength(4);
    expect(host.querySelectorAll('.card-grid')).toHaveLength(2);
  });

  it('links each category card to its filtered catalog route', async () => {
    stubFetch(readCommittedCatalogDocument());

    const { fixture, host } = await render();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelectorAll('app-category-card')).toHaveLength(10);
    });

    const hrefs = [...host.querySelectorAll('a.card-link')].map((link) =>
      link.getAttribute('href'),
    );
    expect(hrefs).toContain('/catalog/mascotas');
    expect(hrefs).toHaveLength(10);
  });

  it('shows the failure and recovers when the visitor retries', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(readCommittedCatalogDocument()));
    vi.stubGlobal('fetch', fetchMock);

    const { fixture, host } = await render();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        'No pudimos cargar el catálogo',
      );
    });

    host.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelectorAll('app-category-card')).toHaveLength(10);
    });
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
