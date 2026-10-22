/**
 * Specs for the landing page.
 *
 * The page is mostly a view over the shared store, so what is worth pinning is the three states
 * and the fact that the cards receive real catalog values: a page that renders an empty grid
 * when the fetch fails would look like a store with nothing to sell. The category links are
 * asserted by `href`, because that is the one thing a visitor can actually act on.
 *
 * The page is deliberately short: the store's name, one action and the categories. The specs
 * below also pin the absences — no tagline, no counts block, no featured strip — because copy
 * that was removed on request is exactly what tends to grow back.
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
  // The home page dynamically mounts the decorative scene after its first render, and that
  // import can resolve after a test has already finished. Install these for the whole file so
  // the late continuation cannot print jsdom's canvas warning after a restore.
  beforeAll(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

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

  it('renders the categories once the catalog arrives', async () => {
    stubFetch(readCommittedCatalogDocument());

    const { fixture, host } = await render();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelectorAll('app-category-card')).toHaveLength(10);
    });

    expect(host.querySelectorAll('.card-grid')).toHaveLength(1);

    // The category strip follows the browse order, not the JSON's authoring order: the
    // thirteen-product food category leads instead of whatever was written first.
    expect(
      host.querySelector('#categorias .category-card__name')?.textContent?.trim(),
    ).toBe('Alimento Yokai para guerreros y pets');
    expect(host.querySelector('#categorias a.card-link')?.getAttribute('href')).toBe(
      '/catalog/alimento-yokai-para-guerreros-y-pets',
    );

    // Every card carries its own stagger index; the CSS multiplies it by 45ms, capped at 420ms.
    const items = [...host.querySelectorAll<HTMLElement>('#categorias .card-grid > li')];
    expect(items.map((item) => item.style.getPropertyValue('--reveal-index'))).toEqual([
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ]);
  });

  it('gives every rendered category a non-empty image source', async () => {
    stubFetch(readCommittedCatalogDocument());

    const { fixture, host } = await render();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelectorAll('app-category-card')).toHaveLength(10);
    });

    // Seven categories have a banner and three borrow a product photograph. The card resolves
    // that chain itself, so the landing page only has to prove that no card is left without a
    // source: an empty `src` is the state that rendered as an empty box.
    const cards = [...host.querySelectorAll('app-category-card')];
    expect(cards).toHaveLength(10);

    const sources = cards.map((card) => card.querySelector('img')?.getAttribute('src') ?? '');
    for (const source of sources) {
      expect(source.length).toBeGreaterThan(0);
    }
    expect(sources.filter((source) => source.startsWith('categories/'))).toHaveLength(7);
    expect(sources.filter((source) => source.startsWith('products/'))).toHaveLength(3);
  });

  it('links each category card to its filtered catalog route', async () => {
    stubFetch(readCommittedCatalogDocument());

    const { fixture, host } = await render();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelectorAll('app-category-card')).toHaveLength(10);
    });

    const hrefs = [...host.querySelectorAll('#categorias a.card-link')].map((link) =>
      link.getAttribute('href'),
    );
    expect(hrefs).toContain('/catalog/mascotas');
    expect(hrefs).toHaveLength(10);
  });

  it('keeps the page to the name, one action and the categories', async () => {
    stubFetch(readCommittedCatalogDocument());

    const { fixture, host } = await render();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(host.querySelectorAll('app-category-card')).toHaveLength(10);
    });

    // The name is the heading, and the catalog link is the only action in the hero.
    expect(host.querySelector('.hero__title')?.textContent?.trim()).toBe('Yokai Hardcore Store');
    const heroActions = [...host.querySelectorAll('.hero__actions a')];
    expect(heroActions).toHaveLength(1);
    expect(heroActions[0]?.getAttribute('href')).toBe('/catalog');

    // The copy that was removed on request stays removed.
    expect(host.querySelector('.hero__lead')).toBeNull();
    expect(host.querySelector('.hero__stats')).toBeNull();
    expect(host.querySelector('.hero__stat')).toBeNull();
    expect(host.querySelector('section[aria-labelledby="destacados-title"]')).toBeNull();
    expect(host.textContent).not.toContain('inframundo');
    expect(host.textContent).not.toContain('Destacados');
  });

  it('leaves the 3D background to the shell instead of mounting one per page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    const { fixture, host } = await render();
    fixture.detectChanges();

    // The scene lives in the app shell so it survives navigation; a page-level copy would be
    // downloaded again on every route change.
    expect(host.querySelector('.page-scene')).toBeNull();
    expect(host.querySelector('app-landing-scene')).toBeNull();
    // The hero copy stands on its own.
    expect(host.querySelector('.hero__title')?.textContent).toContain('Yokai Hardcore Store');
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
