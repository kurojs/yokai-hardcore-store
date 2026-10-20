/**
 * The visual fallback for a category that has no banner image.
 *
 * Three of the ten categories ship without a banner. The previous treatment drew a monogram
 * on a gradient, which read as a placeholder rather than as part of the store. The replacement
 * borrows a real photograph from the category itself: the first product in catalog order that
 * has a local image. That is stable — catalog order is curated data, not iteration order — and
 * it keeps the category strip made of actual merchandise.
 *
 * The function is pure and total: an unknown category, an empty category or one whose products
 * all lack a local image answers `null`, and the card then falls back to a token-based surface
 * with the category name. It never reaches for a remote image.
 */

import type { CatalogEntry } from './catalog-index';

/**
 * @returns the root-relative image path of the first product in `categoryId` that has one, or
 *   `null` when the category has no such product.
 */
export function categoryFallbackImage(
  entries: readonly CatalogEntry[],
  categoryId: string,
): string | null {
  for (const entry of entries) {
    if (entry.category.id !== categoryId) continue;
    if (entry.product.imagePath !== null) return entry.product.imagePath;
  }
  return null;
}
