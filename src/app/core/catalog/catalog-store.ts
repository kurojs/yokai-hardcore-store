import { Injectable, computed, resource } from '@angular/core';

import { loadCatalog } from './catalog-loader';
import { buildCatalogIndex, countInCategory, findCategoryBySlug, type CatalogEntry, type CatalogIndex } from './catalog-index';
import type { Category } from './catalog-model';

/**
 * Application-wide catalog access.
 *
 * Phase 1 serves `data/catalog.json` as a static asset, so this is a `resource` over a plain
 * `fetch` rather than over `HttpClient`: no HTTP provider is needed, nothing extra enters the
 * initial bundle, and the zoneless signal shape is exactly what a component wants to render.
 * When Phase 2 puts a real API behind the same URL the loader changes and nothing else does.
 *
 * The store is intentionally thin. Everything that can be a pure function is one —
 * validation, indexing, search, filtering and sorting all live in modules that are tested
 * without TestBed, and this class only wires them to signals and caches the result so the
 * index is built once per loaded catalog instead of once per component.
 *
 * It is provided at the root, so the catalog is fetched once for the whole application and
 * shared by the shell and every slice.
 */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly source = resource({
    loader: ({ abortSignal }) => loadCatalog({ signal: abortSignal }),
  });

  /** True while the first load, or a reload, is in flight. */
  readonly isLoading = computed(() => {
    const status = this.source.status();
    return status === 'loading' || status === 'reloading';
  });

  /** The fetch or validation failure, or `null`. */
  readonly errorMessage = computed<string | null>(() => this.source.error()?.message ?? null);

  private readonly catalog = computed(() => {
    // `resource.value` throws while the resource is in its error state, so the status is
    // checked first; `?? null` then collapses "not loaded yet" and "failed" into one
    // absence.
    if (this.source.status() === 'error') return null;
    return this.source.value() ?? null;
  });

  /**
   * Derived lookups, or `null` until the catalog has loaded.
   *
   * Every selector below reads this, so the expensive part — one index over 48 products —
   * runs once and is shared.
   */
  readonly index = computed<CatalogIndex | null>(() => {
    const catalog = this.catalog();
    return catalog === null ? null : buildCatalogIndex(catalog);
  });

  /** All categories, in catalog order. Empty while loading. */
  readonly categories = computed<readonly Category[]>(() => this.index()?.categories ?? []);

  /** All products paired with their category and search haystack. Empty while loading. */
  readonly entries = computed<readonly CatalogEntry[]>(() => this.index()?.entries ?? []);

  /** The distinct prices present, ascending. Empty while loading. */
  readonly prices = computed<readonly number[]>(() => this.index()?.prices ?? []);

  /** True once the catalog is loaded and indexed. */
  readonly isReady = computed(() => this.index() !== null);

  /** Finds a category by slug, or `null` when there is none or nothing is loaded yet. */
  findCategory(slug: string | null | undefined): Category | null {
    const index = this.index();
    return index === null ? null : findCategoryBySlug(index, slug);
  }

  /** How many products belong to `categoryId`. Zero when unknown. */
  countInCategory(categoryId: string): number {
    const index = this.index();
    return index === null ? 0 : countInCategory(index, categoryId);
  }

  /** Retries the load. Wired to the retry action in the catalog's error state. */
  reload(): void {
    this.source.reload();
  }
}
