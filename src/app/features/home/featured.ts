/**
 * Which products the landing page features.
 *
 * The catalog's own order groups products by category, so "the first four products" would fill
 * the landing page with four food items and hide the other nine categories. This rule spreads
 * instead: one product per category, in catalog order, until `count` is reached — and only if
 * the catalog has fewer categories than that does it top up with the earliest products still
 * missing.
 *
 * It is pure and total: the same catalog always yields the same selection, so the landing page
 * cannot reshuffle between reloads, and a short or empty catalog yields a shorter list rather
 * than throwing.
 */

import type { CatalogEntry } from '../../core/catalog/catalog-index';

/** How many products the landing page shows today. */
export const FEATURED_COUNT = 4;

export function selectFeatured(
  entries: readonly CatalogEntry[],
  count: number = FEATURED_COUNT,
): readonly CatalogEntry[] {
  if (!Number.isInteger(count) || count <= 0) return [];

  const selected: CatalogEntry[] = [];
  const categoriesTaken = new Set<string>();

  for (const entry of entries) {
    if (categoriesTaken.has(entry.category.id)) continue;
    categoriesTaken.add(entry.category.id);
    selected.push(entry);
    if (selected.length === count) return selected;
  }

  // Fewer categories than slots: fill the rest in catalog order.
  const selectedProductIds = new Set(selected.map((entry) => entry.product.id));
  for (const entry of entries) {
    if (selected.length === count) break;
    if (selectedProductIds.has(entry.product.id)) continue;
    selected.push(entry);
  }

  return selected;
}
