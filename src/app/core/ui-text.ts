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

/**
 * `1 artículo`, or `3 artículos`.
 *
 * The cart counts units, not products: three of one sword is three articles. The noun is
 * separate from {@link productCountLabel} because a cart that says "3 productos" would be
 * describing the wrong thing the moment someone buys two of something.
 */
export function itemCountLabel(count: number): string {
  if (!Number.isFinite(count)) return '';
  const safe = Math.max(0, Math.trunc(count));
  return safe === 1 ? '1 artículo' : `${safe} artículos`;
}

/**
 * The shell's cart indicator: `Carrito vacío`, or `Carrito: 3 artículos`.
 *
 * It is a label, not a link. T7 owns the cart page and will turn this into the way in; until
 * then the indicator says what is in the cart and nothing more, because a navigation that leads
 * nowhere is worse than no navigation.
 */
export function cartCountLabel(count: number): string {
  if (!Number.isFinite(count)) return 'Carrito';
  const safe = Math.max(0, Math.trunc(count));
  return safe === 0 ? 'Carrito vacío' : `Carrito: ${itemCountLabel(safe)}`;
}

/**
 * The confirmation announced after a product is added.
 *
 * It repeats the new cart count on purpose: a live region only announces text that *changed*,
 * so adding a second unit of the same product has to produce a different sentence than adding
 * the first. Including the count makes every addition announce something new.
 */
export function addedToCartMessage(productName: string, count: number): string {
  return `Añadido al carrito: ${productName}. ${itemCountLabel(count)} en el carrito.`;
}

/** The add-to-cart control's visible text; the product name is appended for screen readers. */
export const ADD_TO_CART_LABEL = 'Añadir al carrito';

/** Accessible name of the quantity stepper. */
export const QUANTITY_LABEL = 'Cantidad';

/** Accessible names of the quantity stepper's two buttons. */
export const DECREASE_QUANTITY_LABEL = 'Quitar una unidad';
export const INCREASE_QUANTITY_LABEL = 'Añadir una unidad';

/** Heading above a product's full description. */
export const DESCRIPTION_TITLE = 'Descripción';

/** Heading for the related strip when the product's own category can fill it. */
export function relatedProductsTitle(categoryName: string): string {
  return `Más de ${categoryName}`;
}

/**
 * Heading for the related strip when the product is alone in its category.
 *
 * Four of the ten categories hold exactly one product today, so "Más de X" would be an empty
 * section on those pages. Rather than render a broken strip, the page widens the selection and
 * says so.
 */
export const OTHER_PRODUCTS_TITLE = 'Otros productos';

/**
 * The order summary both the cart page and the demo checkout render.
 *
 * The labels live here, and the markup lives in one shared component, because two pages showing
 * the same three numbers with two different sets of words would look like two different
 * calculations even when the values agree.
 */
export const ORDER_SUMMARY_TITLE = 'Resumen del pedido';

export const ORDER_SUMMARY_ITEMS_LABEL = 'Artículos';
export const ORDER_SUMMARY_SUBTOTAL_LABEL = 'Subtotal';
export const ORDER_SUMMARY_TOTAL_LABEL = 'Total';

/**
 * The store sells in-game goods, so there is neither shipping nor tax to add.
 *
 * Saying so is more honest than leaving a visitor to wonder why the total equals the subtotal,
 * and it is shorter than inventing a shipping row with a zero in it.
 */
export const ORDER_SUMMARY_NOTE = 'Productos digitales: sin envío ni impuestos.';
