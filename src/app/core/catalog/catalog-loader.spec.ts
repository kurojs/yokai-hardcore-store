import { CATALOG_URL, CatalogLoadError, loadCatalog, type FetchLike } from './catalog-loader';
import { CatalogValidationError } from './catalog-validation';
import { catalogDocument } from './testing/documents';
import { brokenJsonResponse, jsonResponse } from './testing/http';

/** A `fetch` stub that records how it was called. */
function fetchStub(response: Response): FetchLike & { calls: [string, RequestInit | undefined][] } {
  const calls: [string, RequestInit | undefined][] = [];
  const stub = ((input: string, init?: RequestInit) => {
    calls.push([input, init]);
    return Promise.resolve(response);
  }) as FetchLike & { calls: [string, RequestInit | undefined][] };
  stub.calls = calls;
  return stub;
}

describe('loadCatalog', () => {
  it('serves the catalog from a root-absolute asset URL by default', () => {
    // Root-absolute on purpose: the same URL has to resolve from `/`, from `/catalog` and
    // from `/catalog/mascotas`.
    expect(CATALOG_URL).toBe('/data/catalog.json');
    expect(CATALOG_URL.startsWith('/')).toBe(true);
  });

  it('requests the default URL and returns the validated catalog', async () => {
    const fetchImpl = fetchStub(jsonResponse(catalogDocument()));

    const catalog = await loadCatalog({ fetchImpl });

    expect(fetchImpl.calls).toHaveLength(1);
    expect(fetchImpl.calls[0]?.[0]).toBe(CATALOG_URL);
    expect(catalog.categories).toHaveLength(1);
    expect(catalog.products[0]?.name).toBe('PROBE PRODUCT');
  });

  it('accepts an explicit URL', async () => {
    const fetchImpl = fetchStub(jsonResponse(catalogDocument()));

    await loadCatalog({ url: 'https://api.example/catalog', fetchImpl });

    expect(fetchImpl.calls[0]?.[0]).toBe('https://api.example/catalog');
  });

  it('passes the cancellation signal through to fetch', async () => {
    const fetchImpl = fetchStub(jsonResponse(catalogDocument()));
    const controller = new AbortController();

    await loadCatalog({ fetchImpl, signal: controller.signal });

    expect(fetchImpl.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it('passes no init at all when there is no signal', async () => {
    const fetchImpl = fetchStub(jsonResponse(catalogDocument()));

    await loadCatalog({ fetchImpl });

    expect(fetchImpl.calls[0]?.[1]).toBeUndefined();
  });

  it('reports a non-ok response with its status', async () => {
    const fetchImpl = fetchStub(
      jsonResponse(null, { ok: false, status: 404, statusText: 'Not Found' }),
    );

    await expect(loadCatalog({ fetchImpl })).rejects.toThrow(
      new CatalogLoadError('GET /data/catalog.json responded 404 Not Found'),
    );
  });

  it('reports an unreachable host and keeps the cause message', async () => {
    const fetchImpl: FetchLike = () => Promise.reject(new TypeError('Failed to fetch'));

    await expect(loadCatalog({ fetchImpl })).rejects.toThrow(CatalogLoadError);
    await expect(loadCatalog({ fetchImpl })).rejects.toThrow(
      'Could not reach /data/catalog.json: Failed to fetch',
    );
  });

  it('reports a body that is not JSON as a load failure, not a validation failure', async () => {
    const fetchImpl = fetchStub(brokenJsonResponse());

    await expect(loadCatalog({ fetchImpl })).rejects.toThrow(CatalogLoadError);
    await expect(loadCatalog({ fetchImpl })).rejects.toThrow('did not contain valid JSON');
  });

  it('lets a validation failure through unchanged, with its issues', async () => {
    const fetchImpl = fetchStub(jsonResponse({ schemaVersion: 7, categories: [], products: [] }));

    const error = await loadCatalog({ fetchImpl }).catch((cause: unknown) => cause);

    // Not wrapped in a CatalogLoadError: the validator already names the offending field,
    // and burying that inside a transport message would lose it.
    expect(error).toBeInstanceOf(CatalogValidationError);
    expect((error as CatalogValidationError).issues[0]).toContain('reads version 1 only');
  });

  it('uses the global fetch when no implementation is supplied', async () => {
    const original = globalThis.fetch;
    const globalStub = vi.fn(async () => jsonResponse(catalogDocument()));
    vi.stubGlobal('fetch', globalStub);

    try {
      await loadCatalog();
      expect(globalStub).toHaveBeenCalledTimes(1);
    } finally {
      vi.stubGlobal('fetch', original);
      vi.unstubAllGlobals();
    }
  });
});
