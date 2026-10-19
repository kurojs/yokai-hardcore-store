/**
 * The cart's arithmetic and its mutations, as pure functions.
 *
 * Everything in this file is plain values in, plain values out: no Angular, no signals, no DOM,
 * no storage. That is deliberate and it is where nearly all of the cart's risk lives, so it is
 * also where nearly all of its tests live. `cart-store.ts` only wraps these in signals, and
 * `cart-persistence.ts` only decides which of these values to keep between visits.
 *
 * Two invariants hold after every function here, and the mutators enforce them rather than
 * trusting their callers:
 *
 * 1. **A line's quantity is a positive integer no greater than `MAX_LINE_QUANTITY`.** A
 *    zero-quantity line is a contradiction (it is in the cart, but there are none of it), so
 *    setting a quantity of zero removes the line instead of storing a ghost.
 * 2. **No two lines share a slug.** Adding an existing product raises that line's quantity
 *    instead of appending a second line for it, so the same product can never be counted twice.
 *
 * The mutators return the array they were given when nothing changed. That is not an
 * optimisation nobody needs: these arrays end up in signals, and returning a new array with
 * identical contents would wake every consumer for nothing.
 */

import { EMPTY_CART, MAX_LINE_QUANTITY, type Cart, type CartLine, type CartTotals } from './cart-model';

/**
 * Folds any number into a legal line quantity.
 *
 * `NaN`, `Infinity`, negative values and zero all become `0`, which callers read as "no line".
 * Fractions are floored rather than rounded: half a sword is still one sword, and rounding up
 * would inflate a subtotal from a quantity the visitor never asked for.
 */
export function clampLineQuantity(quantity: number, max: number = MAX_LINE_QUANTITY): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const floored = Math.trunc(quantity);
  const ceiling = Math.max(1, Math.trunc(max));
  return Math.min(floored, ceiling);
}

/** Whether `slug` is usable as cart identity. */
function isUsableSlug(slug: string | null | undefined): slug is string {
  return typeof slug === 'string' && slug.trim().length > 0;
}

/** The line for `slug`, or `undefined` when the product is not in the cart. */
export function findLine(lines: Cart, slug: string): CartLine | undefined {
  return lines.find((line) => line.slug === slug);
}

/**
 * Adds `quantity` of `slug`, merging into the existing line when there is one.
 *
 * An unusable slug or a quantity that clamps to zero leaves the cart untouched, which makes a
 * fumbled call a no-op rather than a corrupt line.
 */
export function addLine(lines: Cart, slug: string, quantity: number = 1): Cart {
  if (!isUsableSlug(slug)) return lines;
  const delta = clampLineQuantity(quantity);
  if (delta === 0) return lines;

  const existing = findLine(lines, slug);
  if (existing === undefined) {
    return [...lines, { slug, quantity: clampLineQuantity(delta) }];
  }

  const next = clampLineQuantity(existing.quantity + delta);
  if (next === existing.quantity) return lines;
  return lines.map((line) => (line.slug === slug ? { slug, quantity: next } : line));
}

/** Removes `slug` from the cart. Removing a product that is not there changes nothing. */
export function removeLine(lines: Cart, slug: string): Cart {
  if (!lines.some((line) => line.slug === slug)) return lines;
  return lines.filter((line) => line.slug !== slug);
}

/**
 * Sets the quantity of `slug`, or removes the line when the quantity is zero or less.
 *
 * This is the function a quantity stepper's "−" button reaches for: decrementing the last unit
 * of a product is how a shopper says "none of this", and leaving a `0` line on screen would be
 * a cart that says otherwise.
 */
export function setLineQuantity(lines: Cart, slug: string, quantity: number): Cart {
  if (!isUsableSlug(slug)) return lines;
  const next = clampLineQuantity(quantity);
  if (next === 0) return removeLine(lines, slug);

  const existing = findLine(lines, slug);
  if (existing === undefined) return [...lines, { slug, quantity: next }];
  if (existing.quantity === next) return lines;
  return lines.map((line) => (line.slug === slug ? { slug, quantity: next } : line));
}

/** Empties the cart. Returns the shared empty cart so "empty" has one identity. */
export function clearCart(): Cart {
  return EMPTY_CART;
}

/**
 * How many units the cart holds.
 *
 * Quantities are clamped on the way in, so this normally adds integers. It still sanitises,
 * because a cart line can also arrive from storage and a `NaN` total in the header badge would
 * be visible, whereas a defensive `0` never is.
 */
export function cartItemCount(lines: Cart): number {
  return lines.reduce((total, line) => total + clampLineQuantity(line.quantity, Number.MAX_SAFE_INTEGER), 0);
}

/**
 * Rounds a USD amount to whole cents.
 *
 * Money arithmetic in floating point is inexact (`0.1 * 3` is `0.30000000000000004`), and the
 * one place that must not show the difference is a total next to a price. Every total this
 * module produces goes through here, so `formatUsdPrice` never has to care.
 *
 * This is the standard scaling idiom, not decimal arithmetic: a value that has no exact binary
 * representation and lands exactly on a half cent can round down. The catalog's prices are whole
 * dollars, so no total this storefront produces is near that boundary; a real payment system
 * would use integer cents instead, which is a decision for whoever builds checkout.
 */
export function roundUsd(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

/**
 * One line's total.
 *
 * A non-finite unit price yields `0` rather than `NaN`. Catalog validation makes a non-finite
 * price unreachable; a `$NaN` line, however, would be reachable through a single bad record and
 * would poison the whole subtotal, so the cheap guard stays.
 */
export function lineTotalUsd(unitPriceUsd: number, quantity: number): number {
  if (!Number.isFinite(unitPriceUsd)) return 0;
  return roundUsd(unitPriceUsd * clampLineQuantity(quantity, Number.MAX_SAFE_INTEGER));
}

/**
 * The cart's subtotal, with each line priced from `priceBySlug`.
 *
 * A slug the price map does not know contributes nothing. That is the honest degradation for a
 * product that has left the catalog: the alternative is a subtotal that cannot be paid because
 * one line's price is missing.
 */
export function cartSubtotalUsd(
  lines: Cart,
  priceBySlug: ReadonlyMap<string, number>,
): number {
  let subtotal = 0;
  for (const line of lines) {
    const unitPrice = priceBySlug.get(line.slug);
    if (unitPrice === undefined) continue;
    subtotal += lineTotalUsd(unitPrice, line.quantity);
  }
  return roundUsd(subtotal);
}

/** Everything a cart summary line needs: unit count, subtotal and total. */
export function cartTotals(lines: Cart, priceBySlug: ReadonlyMap<string, number>): CartTotals {
  const subtotalUsd = cartSubtotalUsd(lines, priceBySlug);
  return {
    itemCount: cartItemCount(lines),
    subtotalUsd,
    totalUsd: subtotalUsd,
  };
}
