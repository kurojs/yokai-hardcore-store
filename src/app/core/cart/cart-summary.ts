/**
 * Cart lines as the pages render them: catalog identity joined to cart quantity, priced once.
 *
 * Two pages need this join and they must not each invent it. The cart page renders one row per
 * line; the demo checkout reviews the same lines before submitting. If either one looked a
 * product up on its own, the two could disagree about a name, a unit price or a line total —
 * and the one place a storefront is never allowed to disagree with itself is a total.
 *
 * This stays in `core/` as a pure function because it is arithmetic plus a lookup: no Angular,
 * no DOM, no storage. `cart-logic.ts` owns the money; this file only pairs each line with the
 * product that is in the catalog right now, so a stale stored price can never be used.
 *
 * **Unknown products are omitted, not rendered as blanks.** A cart line is a slug, and the
 * catalog is the only authority on whether that slug is still a product. A slug that is no
 * longer there contributes no row, no unit count and no money — the same rule
 * `cartSubtotalUsd` applies when it skips a slug the price map does not know. The store already
 * reconciles its lines against the catalog, so this is the second, local half of that same
 * rule: a caller holding unclean lines still renders a consistent page instead of `$NaN`.
 */

import type { CatalogEntry } from '../catalog/catalog-index';
import type { Category, Product } from '../catalog/catalog-model';
import { lineTotalUsd } from './cart-logic';
import type { Cart } from './cart-model';

/** One cart line, ready to render: the product, how many, and what it costs. */
export interface CartLineView {
  readonly product: Product;
  readonly category: Category;
  readonly quantity: number;
  /** The catalog's price for one unit, in USD. */
  readonly unitPriceUsd: number;
  /** `unitPriceUsd * quantity`, rounded to cents by `lineTotalUsd`. */
  readonly lineTotalUsd: number;
}

/**
 * Joins each cart line to its catalog entry, in cart order.
 *
 * @param lines the cart's lines, in the order the visitor added them.
 * @param entries every catalog entry, as `CatalogStore.entries()` returns them.
 * @returns one view per line whose product still exists. A line with no product is dropped,
 *   which is why the renderer never has to guard against a missing name or price.
 */
export function buildCartLineViews(
  lines: Cart,
  entries: readonly CatalogEntry[],
): readonly CartLineView[] {
  if (lines.length === 0) return [];

  const entryBySlug = new Map<string, CatalogEntry>();
  for (const entry of entries) entryBySlug.set(entry.product.slug, entry);

  const views: CartLineView[] = [];
  for (const line of lines) {
    const entry = entryBySlug.get(line.slug);
    if (entry === undefined) continue;
    views.push({
      product: entry.product,
      category: entry.category,
      quantity: line.quantity,
      unitPriceUsd: entry.product.priceUsd,
      lineTotalUsd: lineTotalUsd(entry.product.priceUsd, line.quantity),
    });
  }
  return views;
}
