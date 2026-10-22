/**
 * Spanish chrome copy.
 *
 * This dictionary is the source of truth for the storefront's default language, and its strings
 * are the ones the pre-i18n `ui-text.ts` already shipped. They are kept verbatim on purpose: the
 * page specs assert this copy, and rewording Spanish while adding two languages would hide a
 * regression inside a refactor.
 *
 * Product and category names are never here. They are interpolated, unchanged.
 */

import type { MinecraftUsernameProblem } from '../../checkout/username';
import { countedLabel, normaliseCount } from '../count';
import type { UiText } from '../ui-text-model';

/**
 * `48 productos`, or `1 producto` for the singular case.
 *
 * Spanish pluralises the noun but not the article-free numeral, so only `1` is special.
 */
function productCountLabel(count: number): string {
  return countedLabel(count, 'producto', 'productos');
}

/** `1 artículo`, or `3 artículos`: the cart counts units, not products. */
function itemCountLabel(count: number): string {
  return countedLabel(count, 'artículo', 'artículos');
}

/** `Carrito vacío` at zero, `Carrito: 3 artículos` otherwise. */
function cartCountLabel(count: number): string {
  const value = normaliseCount(count);
  if (value === null) return 'Carrito';
  return value === 0 ? 'Carrito vacío' : `Carrito: ${itemCountLabel(value)}`;
}

/**
 * The confirmation announced after a product is added.
 *
 * It repeats the new count because a live region only announces text that changed: adding a
 * second unit of the same product has to produce a different sentence than adding the first.
 */
function addedToCartMessage(productName: string, count: number): string {
  return `Añadido al carrito: ${productName}. ${itemCountLabel(count)} en el carrito.`;
}

/** `Más de Mascotas`, or `Más de RESUCITACIÓN` — the category name is data, verbatim. */
function relatedProductsTitle(categoryName: string): string {
  return `Más de ${categoryName}`;
}

function cartLineQuantityLabel(productName: string): string {
  return `Cantidad de ${productName}`;
}

function cartLineIncreaseLabel(productName: string): string {
  return `Añadir una unidad de ${productName}`;
}

function cartLineDecreaseLabel(productName: string): string {
  return `Quitar una unidad de ${productName}`;
}

function cartRemoveLabel(productName: string): string {
  return `Quitar ${productName} del carrito`;
}

function upToPrice(price: string): string {
  return `Hasta ${price}`;
}

/**
 * The sentence shown under the username field for the first rule it failed.
 *
 * Each message says what to do, not merely that something is wrong, and none of them mentions a
 * colour or an icon: the error has to be readable as text.
 */
function usernameProblemMessage(problem: MinecraftUsernameProblem): string {
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

function languageChanged(languageName: string): string {
  return `Idioma cambiado a ${languageName}.`;
}

export const ES_UI_TEXT: UiText = {
  skipToContent: 'Saltar al contenido',
  brandHomeLabel: 'Yokai Hardcore Store, ir al inicio',
  primaryNavLabel: 'Navegación principal',
  navHome: 'Inicio',
  navCatalog: 'Catálogo',
  navCart: 'Carrito',
  cartLinkHint: 'Ir a la página del carrito',
  footerBrand: 'Yokai Hardcore Store',
  footerShopTitle: 'Tienda',
  footerCategoriesTitle: 'Categorías',
  footerShopNavLabel: 'Enlaces de la tienda',
  footerCategoriesNavLabel: 'Categorías de la tienda',
  footerCopyright: (year: number) => `© ${year} Yokai Hardcore`,
  languageLabel: 'Idioma',
  languageChanged,

  productCountLabel,
  itemCountLabel,
  cartCountLabel,

  catalogLoadErrorTitle: 'No pudimos cargar el catálogo',
  retryLabel: 'Reintentar',

  homeTitle: 'Yokai Hardcore Store',
  homeCatalogAction: 'Ver catálogo',
  homeLoading: 'Cargando catálogo…',
  categoriesTitle: 'Categorías',

  catalogAllProducts: 'Todos los productos',
  catalogUnknownCategoryHeading: 'Categoría no encontrada',
  catalogUnknownCategoryTitle: 'No encontramos esa categoría',
  catalogLoading: 'Cargando catálogo…',
  catalogUnknownCategoryMessage: 'Revisa la dirección o vuelve al catálogo completo.',
  catalogViewAll: 'Ver todo el catálogo',
  categoriesNavLabel: 'Categorías',
  allCategoriesLabel: 'Todas',
  noResultsTitle: 'Ningún producto coincide',
  noResultsMessage: 'Prueba con otra búsqueda o quita los filtros.',
  clearFiltersLabel: 'Limpiar filtros',

  filtersLabel: 'Filtros del catálogo',
  catalogFiltersSummary: 'Filtros',
  searchLabel: 'Buscar',
  searchPlaceholder: 'Nombre, descripción o categoría',
  priceFilterLabel: 'Precio',
  allPricesLabel: 'Todos',
  upToPrice,
  sortLabel: 'Ordenar por',
  sortFeatured: 'Destacados',
  sortPriceAsc: 'Precio: de menor a mayor',
  sortPriceDesc: 'Precio: de mayor a menor',
  sortNameAsc: 'Nombre: A-Z',

  productLoading: 'Cargando producto…',
  productNotFoundTitle: 'No encontramos ese producto',
  productNotFoundMessage:
    'Puede que el producto haya cambiado de nombre o ya no exista en la tienda.',
  breadcrumbLabel: 'Ruta de navegación',
  breadcrumbCatalog: 'Catálogo',
  descriptionTitle: 'Descripción',
  relatedProductsTitle,
  otherProductsTitle: 'Otros productos',
  addToCartLabel: 'Añadir al carrito',
  quantityLabel: 'Cantidad',
  decreaseQuantityLabel: 'Quitar una unidad',
  increaseQuantityLabel: 'Añadir una unidad',
  addedToCartMessage,

  orderSummaryTitle: 'Resumen del pedido',
  orderSummaryItemsLabel: 'Artículos',
  orderSummarySubtotalLabel: 'Subtotal',
  orderSummaryTotalLabel: 'Total',
  orderSummaryNote: 'Productos digitales: sin envío ni impuestos.',

  cartTitle: 'Tu carrito',
  cartLoading: 'Cargando carrito…',
  cartEmptyTitle: 'Tu carrito está vacío',
  cartEmptyMessage: 'Todavía no has añadido ningún producto al carrito.',
  cartEmptyAction: 'Ver el catálogo',
  cartSummaryTitle: 'Resumen del carrito',
  cartContinueLabel: 'Seguir comprando',
  cartRemoveAction: 'Quitar',
  unitPriceLabel: 'Precio unitario',
  cartLineQuantityLabel,
  cartLineIncreaseLabel,
  cartLineDecreaseLabel,
  cartRemoveLabel,
  cartCheckoutLabel: 'Ir al checkout',

  checkoutTitle: 'Revisar y confirmar',
  checkoutLead: 'Revisa tu pedido y confirma los datos de entrega.',
  checkoutLoading: 'Cargando checkout…',
  checkoutRedirect: 'Tu carrito está vacío. Volviendo al carrito…',
  checkoutReviewTitle: 'Tu pedido',
  checkoutEditCartLabel: 'Editar carrito',
  checkoutDeliveryTitle: 'Datos de entrega',
  minecraftUsernameLabel: 'Nombre de usuario de Minecraft',
  minecraftUsernameHelp: 'Entre 3 y 16 caracteres: letras sin acentos, números y guion bajo (_).',
  checkoutSubmitLabel: 'Completar demostración',
  checkoutDemoDisclosure: 'Checkout de demostración: no se procesa ningún pago.',
  checkoutConfirmationTitle: 'Demostración completada',
  checkoutConfirmationMessage:
    'No se realizó ningún cargo y no se creó ningún pedido. Este comprobante existe solo en esta pestaña y desaparece si recargas la página.',
  demoReceiptTitle: 'Comprobante de demostración',
  orderReferenceLabel: 'Referencia local',
  checkoutBackLabel: 'Volver al catálogo',
  usernameProblemMessage,

  signInLabel: 'Iniciar sesión',
  accountDialogTitle: 'Tu jugador',
  accountDialogHint:
    'Escribe tu nombre de usuario de Minecraft. Se usa solo para mostrar tu skin en la tienda.',
  accountNameLabel: 'Nombre de usuario de Minecraft',
  accountOpenLabel: (playerName: string) => `Jugador ${playerName}. Cambiar de jugador`,
  accountSignOutLabel: 'Quitar jugador',
  accountSaveLabel: 'Guardar',
  accountCancelLabel: 'Cancelar',
  accountNetworkNote: 'La imagen de la skin se carga desde minotar.net.',

  homeDocumentTitle: 'Yokai Hardcore Store',
  catalogDocumentTitle: 'Catálogo — Yokai Hardcore Store',
  cartDocumentTitle: 'Tu carrito — Yokai Hardcore Store',
  checkoutDocumentTitle: 'Revisar y confirmar — Yokai Hardcore Store',
  productNotFoundDocumentTitle: 'Producto no encontrado — Yokai Hardcore Store',
};
