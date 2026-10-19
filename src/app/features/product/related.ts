/**
 * Which products sit under a product detail page.
 *
 * The obvious rule — "the other products in the same category" — is broken for four of the ten
 * categories, which hold exactly one product (`mascotas`, `armeria-de-heroe`, `resucitacion`,
 * `yokai-coins`). A strip that renders the sibling list unconditionally would show an empty
 * heading and no cards on a third of the catalog, which reads as a defect.
 *
 * So the rule widens instead of disappearing:
 *
 * 1. **Same category**, in catalog order, excluding the product being viewed.
 * 2. If that yields nothing, **one product from each of the other categories**, again in catalog
 *    order. One per category rather than the first three entries, because products are ordered
 *    alphabetically by name, so three consecutive entries can easily all belong to one category.
 * 3. If even that yields nothing (a catalog with one category), the section is omitted: `null`.
 *
 * The caller gets `kind` alongside the entries so the heading can be honest about which rule was
 * used ("Más de Mascotas" would be a lie on a mascotas product page).
 *
 * Pure and total: same input, same output; a `limit` that is not a positive integer yields
 * `null` instead of an empty section.
 */

import type { CatalogEntry } from '../../core/catalog/catalog-index';

/** How many related products the page shows. Three fits a row beside the description. */
export const RELATED_COUNT = 3;

/** Which rule produced the selection; decides the strip's heading. */
export type RelatedKind = 'same-category' | 'other-categories';

export interface RelatedSelection {
  readonly kind: RelatedKind;
  readonly entries: readonly CatalogEntry[];
}

export function selectRelated(
  entries: readonly CatalogEntry[],
  current: CatalogEntry,
  limit: number = RELATED_COUNT,
): RelatedSelection | null {
  if (!Number.isInteger(limit) || limit <= 0) return null;

  const siblings = entries
    .filter(
      (entry) =>
        entry.category.id === current.category.id && entry.product.slug !== current.product.slug,
    )
    .slice(0, limit);

  if (siblings.length > 0) {
    return { kind: 'same-category', entries: siblings };
  }

  const widened: CatalogEntry[] = [];
  const usedCategories = new Set<string>([current.category.id]);

  for (const entry of entries) {
    if (usedCategories.has(entry.category.id)) continue;
    usedCategories.add(entry.category.id);
    widened.push(entry);
    if (widened.length === limit) break;
  }

  return widened.length > 0 ? { kind: 'other-categories', entries: widened } : null;
}
