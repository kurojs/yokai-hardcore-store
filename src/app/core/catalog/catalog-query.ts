/**
 * Search, filter and sort predicates over a catalog index.
 *
 * All of it is pure: no Angular, no services, no signals. That is what lets the interesting
 * behaviour — accent-insensitive matching, multi-term AND, inclusive price ceiling, stable
 * sort — be tested directly against the real 48-product catalog without a TestBed.
 */

import { foldForSearch } from '../text/fold';
import type { CatalogEntry } from './catalog-index';

/** The sort orders offered by the catalog page. */
export const CATALOG_SORTS = ['featured', 'price-asc', 'price-desc', 'name-asc'] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

/** A fully resolved query: every field has a value, and `null` means "not constrained". */
export interface CatalogQuery {
  /** Free text. Split on whitespace; every term must match. Empty matches everything. */
  readonly text: string;
  /** Category id to restrict to, or `null` for all categories. */
  readonly categoryId: string | null;
  /** Inclusive price ceiling in USD, or `null` for no ceiling. */
  readonly maxPriceUsd: number | null;
  readonly sort: CatalogSort;
}

/** The query used before the user has touched anything. */
export const DEFAULT_CATALOG_QUERY: CatalogQuery = {
  text: '',
  categoryId: null,
  maxPriceUsd: null,
  sort: 'featured',
};

// `sensitivity: 'base'` makes the sort accent- and case-insensitive, and `numeric` orders
// the catalog's quantity-prefixed names by value (`3 Ramen` before `10 CUENCOS`, not after).
// A hoisted Collator is reused because sorting runs on every keystroke.
const nameCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function compareNames(a: CatalogEntry, b: CatalogEntry): number {
  return nameCollator.compare(a.product.name, b.product.name);
}

/**
 * Trims the text and collapses "no choice" spellings onto `null`, so a caller can pass a
 * partially filled query (an empty text input, an unselected `<select>`) without the
 * predicate layer having to know about empty strings.
 */
export function normalizeQuery(query?: Partial<CatalogQuery> | null): CatalogQuery {
  const text = (query?.text ?? '').trim();
  const rawCategoryId = query?.categoryId ?? null;
  const categoryId =
    rawCategoryId === null || rawCategoryId.trim().length === 0 ? null : rawCategoryId.trim();
  const rawMaxPrice = query?.maxPriceUsd ?? null;
  const maxPriceUsd =
    rawMaxPrice !== null && Number.isFinite(rawMaxPrice) && rawMaxPrice > 0 ? rawMaxPrice : null;

  return {
    text,
    categoryId,
    maxPriceUsd,
    sort: query?.sort ?? DEFAULT_CATALOG_QUERY.sort,
  };
}

/**
 * Whether `entry` matches the free-text `text`.
 *
 * Matching rules, in order of what the data forced:
 *
 * - **Case and accents are folded on both sides.** The catalog is inconsistent about
 *   diacritics (`Azúcar` in a description, `AZUCAR` in the product name), so folding is the
 *   only way one query finds both.
 * - **All whitespace-separated terms must match** (AND), each anywhere in the searchable
 *   text. `algodones azucar` therefore narrows rather than widens.
 * - **An empty or whitespace-only query matches everything**, which is what an untouched
 *   search box should do.
 */
export function matchesSearch(entry: CatalogEntry, text: string): boolean {
  const terms = foldForSearch(text)
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) return true;
  return terms.every((term) => entry.searchText.includes(term));
}

/**
 * Whether `entry` passes the structural filters (category and price ceiling).
 *
 * The ceiling is inclusive: `maxPriceUsd: 5` includes products priced exactly 5, which is
 * the only reading that makes a "hasta $5" control honest.
 */
export function matchesFilters(entry: CatalogEntry, query: CatalogQuery): boolean {
  if (query.categoryId !== null && entry.category.id !== query.categoryId) return false;
  if (query.maxPriceUsd !== null && entry.product.priceUsd > query.maxPriceUsd) return false;
  return true;
}

/**
 * Orders `entries`.
 *
 * `featured` returns the input untouched: the catalog's own order is a curated one, and
 * sorting it to prove a point would be wrong. The other orders copy the array first, so the
 * caller's array is never mutated.
 */
export function sortEntries(
  entries: readonly CatalogEntry[],
  sort: CatalogSort,
): readonly CatalogEntry[] {
  if (sort === 'featured') return entries;

  const sorted = [...entries];
  switch (sort) {
    case 'price-asc':
      sorted.sort((a, b) => a.product.priceUsd - b.product.priceUsd || compareNames(a, b));
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.product.priceUsd - a.product.priceUsd || compareNames(a, b));
      break;
    case 'name-asc':
      sorted.sort(compareNames);
      break;
  }
  return sorted;
}

/** Applies the whole query: filters, then search, then sort. */
export function applyQuery(
  entries: readonly CatalogEntry[],
  query: CatalogQuery | Partial<CatalogQuery>,
): readonly CatalogEntry[] {
  const resolved = normalizeQuery(query);
  const matched: CatalogEntry[] = [];
  for (const entry of entries) {
    if (matchesFilters(entry, resolved) && matchesSearch(entry, resolved.text)) {
      matched.push(entry);
    }
  }
  return sortEntries(matched, resolved.sort);
}
