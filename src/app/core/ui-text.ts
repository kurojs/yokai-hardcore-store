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

import type { MinecraftUsernameProblem } from './checkout/username';

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

/**
 * The cart page's own copy.
 *
 * It lives here rather than in the template for the same reason as the rest of this file: T8
 * turns these constants into translation keys, and a search for a sentence is cheaper than a
 * search for a fragment of markup.
 */
export const CART_TITLE = 'Tu carrito';
export const CART_LOADING_MESSAGE = 'Cargando carrito…';
export const CART_EMPTY_TITLE = 'Tu carrito está vacío';
export const CART_EMPTY_MESSAGE = 'Todavía no has añadido ningún producto al carrito.';
export const CART_EMPTY_ACTION = 'Ver el catálogo';
export const CART_SUMMARY_TITLE = 'Resumen del carrito';
export const CART_CONTINUE_LABEL = 'Seguir comprando';
export const CART_REMOVE_LABEL = 'Quitar';
export const UNIT_PRICE_LABEL = 'Precio unitario';

/**
 * Accessible names for one cart row's controls.
 *
 * Each row has the same buttons as every other row, so the product name is what tells a screen
 * reader which "Quitar" it is on. A visible "Quitar" plus the name in the accessible name keeps
 * both voice control (the visible word) and assistive technology (the full context).
 */
export function cartLineQuantityLabel(productName: string): string {
  return `Cantidad de ${productName}`;
}

export function cartLineIncreaseLabel(productName: string): string {
  return `Añadir una unidad de ${productName}`;
}

export function cartLineDecreaseLabel(productName: string): string {
  return `Quitar una unidad de ${productName}`;
}

export function cartRemoveLabel(productName: string): string {
  return `Quitar ${productName} del carrito`;
}

/** The cart page's way into the checkout. */
export const CART_CHECKOUT_LABEL = 'Ir al checkout';

/**
 * The demo checkout.
 *
 * The disclosure next to the submit button is not decoration and is not in a footer: a page that
 * looks like a checkout must say, where the visitor is about to act, that it is not one. The
 * confirmation repeats it, because a reference and a total can look like a receipt even when
 * the heading says "demostración".
 */
export const CHECKOUT_TITLE = 'Revisar y confirmar';
export const CHECKOUT_LEAD = 'Revisa tu pedido y completa la demostración. No se procesa ningún pago.';

export const CHECKOUT_LOADING_MESSAGE = 'Cargando checkout…';
export const CHECKOUT_REDIRECT_MESSAGE = 'Tu carrito está vacío. Volviendo al carrito…';

export const CHECKOUT_REVIEW_TITLE = 'Tu pedido';
export const CHECKOUT_EDIT_CART_LABEL = 'Editar carrito';
export const CHECKOUT_DELIVERY_TITLE = 'Datos de entrega';

export const MINECRAFT_USERNAME_LABEL = 'Nombre de usuario de Minecraft';
export const MINECRAFT_USERNAME_HELP =
  'Entre 3 y 16 caracteres: letras sin acentos, números y guion bajo (_).';

export const CHECKOUT_SUBMIT_LABEL = 'Completar demostración';
export const CHECKOUT_DEMO_DISCLOSURE =
  'Demostración: este checkout no procesa pagos ni crea pedidos. No se te cobrará nada y no se guarda ningún dato en un servidor.';

export const CHECKOUT_CONFIRMATION_TITLE = 'Demostración completada';
export const CHECKOUT_CONFIRMATION_MESSAGE =
  'No se realizó ningún cargo y no se creó ningún pedido. Este comprobante existe solo en esta pestaña y desaparece si recargas la página.';

export const DEMO_RECEIPT_TITLE = 'Comprobante de demostración';
export const ORDER_REFERENCE_LABEL = 'Referencia local';
export const CHECKOUT_BACK_LABEL = 'Volver al catálogo';

/**
 * The sentence shown under the username field for the first rule it failed.
 *
 * Each message says what to do, not merely that something is wrong, and none of them mentions a
 * colour or an icon: the error has to be readable as text.
 */
export function minecraftUsernameProblemMessage(problem: MinecraftUsernameProblem): string {
  switch (problem) {
    case 'empty':
      return 'Escribe tu nombre de usuario de Minecraft.';
    case 'too-short':
      return 'El nombre debe tener al menos 3 caracteres.';
    case 'too-long':
      return 'El nombre no puede tener más de 16 caracteres.';
    case 'illegal-characters':
      return 'Solo se permiten letras sin acentos, números y guion bajo (_).';
  }
}
