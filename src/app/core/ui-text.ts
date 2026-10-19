/**
 * Spanish copy that more than one slice needs.
 *
 * The storefront speaks Spanish; the code speaks English. Strings that belong to a single
 * slice stay in that slice, but a count label appears on the landing page, on the catalog
 * page and on the category cards, and three copies would drift the moment one of them is
 * reworded. Everything here is a pure function or a constant, so `core/` keeps its "no
 * Angular, no DOM" rule, and a template can call it directly.
 *
 * This is deliberately not an i18n layer. T8 owns translation; when it arrives, these
 * functions become the keys it translates, and nothing else has to move.
 */

/**
 * `48 productos`, or `1 producto` for the singular case.
 *
 * Spanish pluralises the noun but not the article-free numeral, so only `1` is special. The
 * count is floored and clamped at zero because it always describes a number of rendered
 * cards: a negative or fractional product count is a bug upstream, and showing `-0.5
 * productos` to a customer would be worse than showing zero.
 */
export function productCountLabel(count: number): string {
  if (!Number.isFinite(count)) return '';
  const safe = Math.max(0, Math.trunc(count));
  return safe === 1 ? '1 producto' : `${safe} productos`;
}
