/**
 * The contract every language dictionary must satisfy.
 *
 * This interface is the whole point of the i18n layer: each dictionary is annotated `UiText`, so
 * a missing key, a renamed key or a mistyped key is a **compile error** in that language rather
 * than an `undefined` rendered into the page. `UI_TEXT` is typed `Record<Language, UiText>`, so a
 * language that has no dictionary file is a compile error too.
 *
 * Keys are grouped by the surface that uses them. Values that need a number, a catalog name or a
 * price are functions rather than templates with `{0}`: plural rules and word order differ per
 * language, and a function is the smallest honest shape that lets each language be grammatical
 * instead of word-for-word.
 *
 * Catalog content — product names, product descriptions, category names and descriptions — never
 * appears here. It is server data in Spanish, it is interpolated verbatim, and translating it is
 * a business decision this layer deliberately does not make.
 */

import type { MinecraftUsernameProblem } from '../checkout/username';

export interface UiText {
  // ---------------------------------------------------------------------------------------
  // Shell
  // ---------------------------------------------------------------------------------------

  /** The first focusable element on every page. */
  readonly skipToContent: string;

  /** Accessible name of the header's brand link. */
  readonly brandHomeLabel: string;

  /** Accessible name of the primary navigation landmark. */
  readonly primaryNavLabel: string;

  readonly navHome: string;
  readonly navCatalog: string;

  /** The hidden half of the cart link's accessible name. */
  readonly cartLinkHint: string;

  /** The demo disclaimer that stays in the footer, where a buyer can find it. */
  readonly footerNote: string;

  /** Visible label of the language switcher. */
  readonly languageLabel: string;

  /** Announced politely after the visitor changes language. */
  readonly languageChanged: (languageName: string) => string;

  // ---------------------------------------------------------------------------------------
  // Counts
  // ---------------------------------------------------------------------------------------

  /** `48 productos` / `1 producto`. */
  readonly productCountLabel: (count: number) => string;

  /** The cart counts units, not products: `3 artículos`. */
  readonly itemCountLabel: (count: number) => string;

  /** The header indicator: `Carrito vacío` or `Carrito: 3 artículos`. */
  readonly cartCountLabel: (count: number) => string;

  // ---------------------------------------------------------------------------------------
  // Shared load states (every page renders the same failure and retry)
  // ---------------------------------------------------------------------------------------

  readonly catalogLoadErrorTitle: string;
  readonly retryLabel: string;

  // ---------------------------------------------------------------------------------------
  // Home
  // ---------------------------------------------------------------------------------------

  readonly homeEyebrow: string;
  readonly homeTitle: string;
  readonly homeLead: string;
  readonly homeCatalogAction: string;
  readonly homeCategoriesAction: string;

  readonly homeStatProducts: string;
  readonly homeStatCategories: string;
  readonly homeStatFrom: string;

  readonly homeLoading: string;
  readonly categoriesTitle: string;
  readonly categoriesSummary: (productCount: number, categoryCount: number) => string;
  readonly featuredTitle: string;
  readonly featuredNote: string;

  // ---------------------------------------------------------------------------------------
  // Catalog
  // ---------------------------------------------------------------------------------------

  readonly catalogEyebrow: string;
  readonly catalogAllProducts: string;
  readonly catalogUnknownCategoryHeading: string;
  readonly catalogUnknownCategoryTitle: string;
  readonly catalogLoading: string;
  readonly catalogLeadAll: string;
  readonly catalogLeadLoading: string;
  readonly catalogLeadUnavailable: string;
  readonly catalogLeadUnknownCategory: string;
  readonly catalogUnknownCategoryMessage: string;
  readonly catalogViewAll: string;
  readonly categoriesNavLabel: string;
  readonly allCategoriesLabel: string;
  readonly noResultsTitle: string;
  readonly noResultsMessage: string;
  readonly clearFiltersLabel: string;

  readonly filtersLabel: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly priceFilterLabel: string;
  readonly allPricesLabel: string;
  readonly upToPrice: (price: string) => string;
  readonly sortLabel: string;
  readonly sortFeatured: string;
  readonly sortPriceAsc: string;
  readonly sortPriceDesc: string;
  readonly sortNameAsc: string;

  // ---------------------------------------------------------------------------------------
  // Product
  // ---------------------------------------------------------------------------------------

  readonly productLoading: string;
  readonly productNotFoundTitle: string;
  readonly productNotFoundMessage: string;
  readonly breadcrumbLabel: string;
  readonly breadcrumbCatalog: string;
  readonly descriptionTitle: string;
  readonly relatedProductsTitle: (categoryName: string) => string;
  readonly otherProductsTitle: string;

  readonly addToCartLabel: string;
  readonly quantityLabel: string;
  readonly decreaseQuantityLabel: string;
  readonly increaseQuantityLabel: string;
  readonly addedToCartMessage: (productName: string, count: number) => string;

  // ---------------------------------------------------------------------------------------
  // Order summary (shared by the cart page and the checkout)
  // ---------------------------------------------------------------------------------------

  readonly orderSummaryTitle: string;
  readonly orderSummaryItemsLabel: string;
  readonly orderSummarySubtotalLabel: string;
  readonly orderSummaryTotalLabel: string;
  readonly orderSummaryNote: string;

  // ---------------------------------------------------------------------------------------
  // Cart
  // ---------------------------------------------------------------------------------------

  readonly cartTitle: string;
  readonly cartLoading: string;
  readonly cartEmptyTitle: string;
  readonly cartEmptyMessage: string;
  readonly cartEmptyAction: string;
  readonly cartSummaryTitle: string;
  readonly cartContinueLabel: string;

  /** Visible text of a cart row's remove button. */
  readonly cartRemoveAction: string;
  readonly unitPriceLabel: string;

  readonly cartLineQuantityLabel: (productName: string) => string;
  readonly cartLineIncreaseLabel: (productName: string) => string;
  readonly cartLineDecreaseLabel: (productName: string) => string;
  readonly cartRemoveLabel: (productName: string) => string;
  readonly cartCheckoutLabel: string;

  // ---------------------------------------------------------------------------------------
  // Demo checkout
  // ---------------------------------------------------------------------------------------

  readonly checkoutTitle: string;
  readonly checkoutLead: string;
  readonly checkoutLoading: string;
  readonly checkoutRedirect: string;
  readonly checkoutReviewTitle: string;
  readonly checkoutEditCartLabel: string;
  readonly checkoutDeliveryTitle: string;

  readonly minecraftUsernameLabel: string;
  readonly minecraftUsernameHelp: string;

  readonly checkoutSubmitLabel: string;
  readonly checkoutDemoDisclosure: string;
  readonly checkoutConfirmationTitle: string;
  readonly checkoutConfirmationMessage: string;
  readonly demoReceiptTitle: string;
  readonly orderReferenceLabel: string;
  readonly checkoutBackLabel: string;

  readonly usernameProblemMessage: (problem: MinecraftUsernameProblem) => string;

  // ---------------------------------------------------------------------------------------
  // Document titles
  // ---------------------------------------------------------------------------------------

  readonly homeDocumentTitle: string;
  readonly catalogDocumentTitle: string;
  readonly cartDocumentTitle: string;
  readonly checkoutDocumentTitle: string;
  readonly productNotFoundDocumentTitle: string;
}
