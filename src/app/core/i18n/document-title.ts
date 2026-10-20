/**
 * Document title composition.
 *
 * The brand is a proper noun and therefore identical in every language; only the page word
 * before it is translated (each dictionary carries its own full title, because Japanese puts the
 * brand after a `｜` separator rather than after an em dash). This helper exists for the one case
 * whose page word is catalog data: a product detail page is titled after the product.
 */

/** The store's name. Never translated, never cased differently. */
export const STORE_NAME = 'Yokai Hardcore Store';

/**
 * `10 ALGODONES DE AZUCAR — Yokai Hardcore Store`.
 *
 * The product name is interpolated verbatim: it is data, and the catalog mixes ALL CAPS with
 * sentence case on purpose.
 */
export function pageTitle(pageName: string): string {
  return `${pageName} — ${STORE_NAME}`;
}
