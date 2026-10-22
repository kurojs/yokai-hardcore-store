/**
 * Specs for the catalog store.
 *
 * This is the only place in `core/` that touches Angular, and what it adds over the pure
 * modules is small on purpose: fetch once, expose signals, cache the index. So the specs
 * pin exactly that — the request itself, the three load outcomes, the retry, and the
 * delegation to the pure selectors — against the real committed catalog payload.
 */

import { TestBed } from '@angular/core/testing';

import { CatalogStore } from './catalog-store';
import { readCommittedCatalogDocument } from './testing/committed-catalog';
import { jsonResponse } from './testing/http';

/** Replaces the global `fetch` with a stub and returns it for assertions. */
function stubFetch(body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => jsonResponse(body));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('CatalogStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts loading before the response arrives', () => {
    stubFetch(readCommittedCatalogDocument());

    const store = TestBed.inject(CatalogStore);

    expect(store.isLoading()).toBe(true);
    expect(store.isReady()).toBe(false);
    expect(store.categories()).toEqual([]);
    expect(store.entries()).toEqual([]);
    expect(store.errorMessage()).toBeNull();
  });

  it('loads and indexes the real catalog from the served asset', async () => {
    const fetchMock = stubFetch(readCommittedCatalogDocument());

    const store = TestBed.inject(CatalogStore);
    await vi.waitFor(() => expect(store.isReady()).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('data/catalog.json');
    expect(store.categories()).toHaveLength(10);
    expect(store.entries()).toHaveLength(48);
    expect(store.prices()).toEqual([1, 2, 3, 4, 5, 10]);
    expect(store.isLoading()).toBe(false);
    expect(store.errorMessage()).toBeNull();
  });

  it('finds a category by slug and counts its products', async () => {
    stubFetch(readCommittedCatalogDocument());
    const store = TestBed.inject(CatalogStore);
    await vi.waitFor(() => expect(store.isReady()).toBe(true));

    expect(store.findCategory('mascotas')?.name).toBe('Mascotas');
    expect(store.findCategory('no-such-slug')).toBeNull();
    expect(store.findCategory(null)).toBeNull();
    expect(store.countInCategory('alimento-yokai-para-guerreros-y-pets')).toBe(13);
    expect(store.countInCategory('no-such-id')).toBe(0);
  });

  it('finds a product by slug and answers null for anything else', async () => {
    stubFetch(readCommittedCatalogDocument());
    const store = TestBed.inject(CatalogStore);
    await vi.waitFor(() => expect(store.isReady()).toBe(true));

    const entry = store.findProduct('10-algodones-de-azucar');
    expect(entry?.product.name).toBe('10 ALGODONES DE AZUCAR');
    expect(entry?.category.slug).toBe('alimento-yokai-para-guerreros-y-pets');
    expect(store.findProduct('no-such-slug')).toBeNull();
    expect(store.findProduct(null)).toBeNull();
  });

  it('answers null before the catalog is ready instead of throwing', () => {
    // "Not loaded" and "not found" both answer null; the caller tells them apart with `isReady`,
    // which is what keeps an unknown URL a page state rather than an exception.
    stubFetch(readCommittedCatalogDocument());
    const store = TestBed.inject(CatalogStore);

    expect(store.findProduct('10-algodones-de-azucar')).toBeNull();
    expect(store.isReady()).toBe(false);
  });

  it('reports the transport failure and stays not-ready', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(null, { ok: false, status: 503, statusText: 'Unavailable' })),
    );

    const store = TestBed.inject(CatalogStore);
    await vi.waitFor(() => expect(store.errorMessage()).not.toBeNull());

    expect(store.errorMessage()).toContain('GET data/catalog.json responded 503');
    expect(store.isReady()).toBe(false);
    expect(store.isLoading()).toBe(false);
    expect(store.categories()).toEqual([]);
  });

  it('reports a validation failure with the validator’s own message', async () => {
    stubFetch({ schemaVersion: 99, categories: [], products: [] });

    const store = TestBed.inject(CatalogStore);
    await vi.waitFor(() => expect(store.errorMessage()).not.toBeNull());

    expect(store.errorMessage()).toContain('catalog.json failed validation');
    expect(store.errorMessage()).toContain('reads version 1 only');
    expect(store.isReady()).toBe(false);
  });

  it('recovers when the load is retried', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(readCommittedCatalogDocument()));
    vi.stubGlobal('fetch', fetchMock);

    const store = TestBed.inject(CatalogStore);
    await vi.waitFor(() => expect(store.errorMessage()).not.toBeNull());
    expect(store.isReady()).toBe(false);

    store.reload();

    await vi.waitFor(() => expect(store.isReady()).toBe(true));
    expect(store.errorMessage()).toBeNull();
    expect(store.entries()).toHaveLength(48);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares one instance and one request across consumers', async () => {
    const fetchMock = stubFetch(readCommittedCatalogDocument());

    const first = TestBed.inject(CatalogStore);
    const second = TestBed.inject(CatalogStore);

    expect(first).toBe(second);
    await vi.waitFor(() => expect(first.isReady()).toBe(true));
    // A per-component store would re-fetch the catalog for every card grid.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
