/**
 * The browse order of the catalog: categories by size, and the entries that belong to each.
 *
 * The JSON's category order is the catalogue's *authoring* order, not a shop's. It interleaves a
 * thirteen-product food category with single-product oddities, so a list rendered in that order
 * reads like a data dump. This module derives the order a buyer expects: the categories that
 * actually hold stock come first, and ties fall back to the category name so the result never
 * depends on the order the file happened to be written in.
 *
 * Both functions are pure: they take the index (and, for the grouping, the entries the active
 * query already selected) and return new data. Nothing here reads Angular, a service or the DOM.
 *
 * Ordering is derived from the *whole* catalog, not from the filtered entries. That is the point
 * of `groupEntriesByCategory`: applying a price ceiling or a sort must never reshuffle the group
 * headers, because a header that says "biggest category" and then changes size with a filter
 * would be lying about the catalog.
 */

import { countInCategory, type CatalogEntry, type CatalogIndex } from './catalog-index';
import type { Category } from './catalog-model';

/** One category's slice of a result set. */
export interface CatalogGroup {
  readonly category: Category;
  /** The entries that belong to `category`, in the order they arrived. */
  readonly entries: readonly CatalogEntry[];
}

// Same collator settings as the product name sort: accent-insensitive, case-insensitive and
// numeric, so `Armería` sorts beside `Armeria` and there is no locale surprise between runs.
const categoryNameCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/**
 * The catalog's categories in browse order: product count descending, then name ascending.
 *
 * `countInCategory` reads the counts derived from the products themselves, so a category can
 * never be promoted by editing a declaration.
 */
export function orderCategoriesBySize(index: CatalogIndex): readonly Category[] {
  return [...index.categories].sort(
    (a, b) =>
      countInCategory(index, b.id) - countInCategory(index, a.id) ||
      categoryNameCollator.compare(a.name, b.name),
  );
}

/**
 * Groups `entries` under their categories, emitting only the groups that still hold something.
 *
 * The groups come back in `orderCategoriesBySize` order. Within a group the input order is
 * preserved untouched, which is what lets the caller pass an already-sorted result set and get
 * "sorted inside each group" without a second sort here.
 */
export function groupEntriesByCategory(
  index: CatalogIndex,
  entries: readonly CatalogEntry[],
): readonly CatalogGroup[] {
  const byCategory = new Map<string, CatalogEntry[]>();
  for (const entry of entries) {
    const bucket = byCategory.get(entry.category.id);
    if (bucket === undefined) {
      byCategory.set(entry.category.id, [entry]);
    } else {
      bucket.push(entry);
    }
  }

  const groups: CatalogGroup[] = [];
  for (const category of orderCategoriesBySize(index)) {
    const bucket = byCategory.get(category.id);
    if (bucket !== undefined) groups.push({ category, entries: bucket });
  }
  return groups;
}
