/**
 * Shared arithmetic for the count labels.
 *
 * Pluralisation is a language decision and lives in each dictionary. What is *not* a language
 * decision is what a count means when it arrives as `NaN`, `-3` or `2.9`: every language floors
 * it and clamps it at zero, because the value always describes a number of rendered rows or
 * cards. Doing that once here keeps the three dictionaries from drifting on the defensive part.
 */

/**
 * @returns the count as a non-negative integer, or `null` when it is not a usable number.
 *
 * `null` rather than `0` on purpose: an unusable count must render as nothing, while a real
 * zero must render as "0 products".
 */
export function normaliseCount(count: number): number | null {
  if (!Number.isFinite(count)) return null;
  return Math.max(0, Math.trunc(count));
}

/**
 * `1 product` / `3 products` for the languages that inflect the noun.
 *
 * Only exact `1` is singular, which is correct for English and Spanish. Japanese does not use
 * this helper because it has no plural form and does not put a space before its counter.
 */
export function countedLabel(count: number, singular: string, plural: string): string {
  const value = normaliseCount(count);
  if (value === null) return '';
  return `${value} ${value === 1 ? singular : plural}`;
}
