/**
 * Reads the catalog from the served asset and hands it to the validator.
 *
 * `data/catalog.json` is copied to `/data/catalog.json` by the `assets` entry in
 * `angular.json`, so it is fetched at runtime rather than imported at build time. That keeps
 * one source of truth with no generated second copy inside `src/`, and it starts the data
 * access layer in the asynchronous shape it will need anyway once Phase 2 replaces the file
 * with a real API.
 *
 * Transport failures and validation failures are kept distinct on purpose: "we could not
 * fetch it" and "we fetched something we cannot read" need different words in front of a
 * user, and different debugging steps behind them.
 */

import type { Catalog } from './catalog-model';
import { parseCatalogResponse } from './catalog-validation';

/** Where the catalog is served from. Root-absolute, so it resolves from any route. */
export const CATALOG_URL = '/data/catalog.json';

/**
 * The part of `fetch` this module uses.
 *
 * Narrower than `typeof fetch` so a spec can pass a two-line stub instead of constructing a
 * `RequestInfo`.
 */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Thrown when the catalog could not be fetched, as opposed to being unreadable. */
export class CatalogLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CatalogLoadError';
  }
}

/** Options for {@link loadCatalog}; every one of them has a working default. */
export interface LoadCatalogOptions {
  readonly url?: string;
  readonly fetchImpl?: FetchLike;
  /** Cancels an in-flight request when the owner is destroyed. */
  readonly signal?: AbortSignal;
}

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Fetches and validates the catalog.
 *
 * @throws {CatalogLoadError} when the request fails or the payload is not JSON.
 * @throws {CatalogValidationError} when the payload does not match the contract. It is
 *   deliberately not wrapped: the validator's message already names every offending field.
 */
export async function loadCatalog(options: LoadCatalogOptions = {}): Promise<Catalog> {
  const url = options.url ?? CATALOG_URL;
  // `fetch` is resolved through the global at call time rather than captured at module load,
  // so replacing the global — a spec stub, a service worker, a test harness — is honoured.
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));

  let response: Response;
  try {
    response = await fetchImpl(url, options.signal === undefined ? undefined : { signal: options.signal });
  } catch (cause) {
    throw new CatalogLoadError(`Could not reach ${url}: ${describeCause(cause)}`, { cause });
  }

  if (!response.ok) {
    throw new CatalogLoadError(`GET ${url} responded ${response.status} ${response.statusText}`);
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (cause) {
    throw new CatalogLoadError(`${url} did not contain valid JSON: ${describeCause(cause)}`, {
      cause,
    });
  }

  return parseCatalogResponse(raw);
}
