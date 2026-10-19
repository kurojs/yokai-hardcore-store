/**
 * Deterministic visual identity for a category that has no banner image.
 *
 * 3 of the 10 categories have `bannerImage: null`, so the fallback is a normal state that
 * gets rendered by every category card and every category header. Two properties matter and
 * both are pure functions here rather than template logic:
 *
 * - The result must be **stable**: the same category must look the same on every render and
 *   across reloads, otherwise the grid shimmers and reordering the data changes the design.
 * - The result must be **varied**: ten identical grey placeholders look like a bug, so the
 *   variant is hashed from the slug.
 *
 * The variant is an index into a small set of CSS classes rather than a generated colour
 * string. Angular sanitises style bindings, and a class index keeps the actual colours in
 * `styles.scss` where T8's theming work lives.
 */

/** How many placeholder treatments `styles.scss` defines. */
export const CATEGORY_PLACEHOLDER_VARIANTS = 6;

/** Fallback monogram for a name that contains no letters at all. */
const MONOGRAM_FALLBACK = '?';

/**
 * The single letter shown on a bannered-less category card.
 *
 * The first letter *anywhere* in the name is used, so a leading space or a leading quantity
 * does not produce an empty monogram. Case is upper-cased for display, and the letter keeps
 * its accent: `Armería De Héroe` yields `A`, `RESUCITACIÓN` yields `R`.
 */
export function categoryMonogram(name: string): string {
  const match = /[\p{L}]/u.exec(name);
  return match === null ? MONOGRAM_FALLBACK : match[0].toUpperCase();
}

/**
 * A stable index in `[0, variants)` for `slug`.
 *
 * FNV-1a over UTF-16 code units. Any deterministic hash would do; this one is short, has no
 * dependencies and spreads short slugs well enough for ten categories.
 */
export function categoryPlaceholderVariant(
  slug: string,
  variants: number = CATEGORY_PLACEHOLDER_VARIANTS,
): number {
  if (!Number.isInteger(variants) || variants < 2) return 0;

  let hash = 0x811c9dc5;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    // `Math.imul` keeps the multiply in 32-bit range; `>>> 0` reinterprets as unsigned so
    // the modulo below is never negative.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % variants;
}
