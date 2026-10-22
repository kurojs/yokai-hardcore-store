/**
 * English chrome copy.
 *
 * Written as English, not as a transliteration of the Spanish: `Cart is empty` is a status,
 * `Browse the catalog` is an action, and the validation messages say what to type. The one place
 * word order depends on the interpolated value is `relatedProductsTitle`, which is why it is a
 * function.
 */

import type { MinecraftUsernameProblem } from '../../checkout/username';
import { countedLabel, normaliseCount } from '../count';
import type { UiText } from '../ui-text-model';

function productCountLabel(count: number): string {
  return countedLabel(count, 'product', 'products');
}

function itemCountLabel(count: number): string {
  return countedLabel(count, 'item', 'items');
}

function cartCountLabel(count: number): string {
  const value = normaliseCount(count);
  if (value === null) return 'Cart';
  return value === 0 ? 'Cart is empty' : `Cart: ${itemCountLabel(value)}`;
}

function addedToCartMessage(productName: string, count: number): string {
  return `Added to cart: ${productName}. ${itemCountLabel(count)} in your cart.`;
}

function relatedProductsTitle(categoryName: string): string {
  return `More from ${categoryName}`;
}

function cartLineQuantityLabel(productName: string): string {
  return `Quantity of ${productName}`;
}

function cartLineIncreaseLabel(productName: string): string {
  return `Add one unit of ${productName}`;
}

function cartLineDecreaseLabel(productName: string): string {
  return `Remove one unit of ${productName}`;
}

function cartRemoveLabel(productName: string): string {
  return `Remove ${productName} from the cart`;
}

function upToPrice(price: string): string {
  return `Up to ${price}`;
}

function usernameProblemMessage(problem: MinecraftUsernameProblem): string {
  switch (problem) {
    case 'empty':
      return 'Enter your Minecraft username.';
    case 'too-short':
      return 'The username must be at least 3 characters long.';
    case 'too-long':
      return 'The username cannot be longer than 16 characters.';
    case 'illegal-characters':
      return 'Only letters without accents, numbers and underscore (_) are allowed.';
  }
}

function languageChanged(languageName: string): string {
  return `Language changed to ${languageName}.`;
}

export const EN_UI_TEXT: UiText = {
  skipToContent: 'Skip to content',
  brandHomeLabel: 'Yokai Hardcore Store, go to the home page',
  primaryNavLabel: 'Main navigation',
  navHome: 'Home',
  navCatalog: 'Catalog',
  navCart: 'Cart',
  cartLinkHint: 'Go to the cart page',
  backToTopLabel: 'Back to top',
  footerBrand: 'Yokai Hardcore Store',
  footerShopTitle: 'Shop',
  footerCategoriesTitle: 'Categories',
  footerShopNavLabel: 'Shop links',
  footerCategoriesNavLabel: 'Shop categories',
  footerCopyright: (year: number) => `© ${year} Yokai Hardcore`,
  languageLabel: 'Language',
  currencyLabel: 'Display currency',
  currencyButtonLabel: (currency: string) => `Choose display currency. Current: ${currency}`,
  currencyRateNote: 'Indicative daily reference rates. Checkout totals are display-only.',
  currencyRateUnavailable: 'Rates unavailable; prices remain in USD.',
  currencyRateLoading: 'Loading daily reference rates…',
  languageChanged,

  productCountLabel,
  itemCountLabel,
  cartCountLabel,

  catalogLoadErrorTitle: 'We could not load the catalog',
  retryLabel: 'Try again',

  homeTitle: 'Yokai Hardcore Store',
  homeCatalogAction: 'Browse the catalog',
  homeLoading: 'Loading the catalog…',
  categoriesTitle: 'Categories',

  catalogAllProducts: 'All products',
  catalogUnknownCategoryHeading: 'Category not found',
  catalogUnknownCategoryTitle: 'We could not find that category',
  catalogLoading: 'Loading catalog…',
  catalogUnknownCategoryMessage: 'Check the address or go back to the full catalog.',
  catalogViewAll: 'View the whole catalog',
  categoriesNavLabel: 'Categories',
  allCategoriesLabel: 'All',
  noResultsTitle: 'No products match',
  noResultsMessage: 'Try a different search or clear the filters.',
  clearFiltersLabel: 'Clear filters',

  filtersLabel: 'Catalog filters',
  catalogFiltersSummary: 'Filters',
  searchLabel: 'Search',
  searchPlaceholder: 'Name, description or category',
  priceFilterLabel: 'Price',
  allPricesLabel: 'All',
  upToPrice,
  sortLabel: 'Sort by',
  sortFeatured: 'Featured',
  sortPriceAsc: 'Price: low to high',
  sortPriceDesc: 'Price: high to low',
  sortNameAsc: 'Name: A-Z',

  productLoading: 'Loading product…',
  productNotFoundTitle: 'We could not find that product',
  productNotFoundMessage:
    'The product may have been renamed, or it may no longer be available in the store.',
  breadcrumbLabel: 'Breadcrumb',
  breadcrumbCatalog: 'Catalog',
  descriptionTitle: 'Description',
  relatedProductsTitle,
  otherProductsTitle: 'Other products',
  addToCartLabel: 'Add to cart',
  quantityLabel: 'Quantity',
  decreaseQuantityLabel: 'Remove one unit',
  increaseQuantityLabel: 'Add one unit',
  addedToCartMessage,

  orderSummaryTitle: 'Order summary',
  orderSummaryItemsLabel: 'Items',
  orderSummarySubtotalLabel: 'Subtotal',
  orderSummaryTotalLabel: 'Total',

  cartTitle: 'Your cart',
  cartLoading: 'Loading cart…',
  cartEmptyTitle: 'Your cart is empty',
  cartEmptyMessage: 'You have not added any products to the cart yet.',
  cartEmptyAction: 'Browse the catalog',
  cartSummaryTitle: 'Cart summary',
  cartContinueLabel: 'Continue shopping',
  cartRemoveAction: 'Remove',
  unitPriceLabel: 'Unit price',
  cartLineQuantityLabel,
  cartLineIncreaseLabel,
  cartLineDecreaseLabel,
  cartRemoveLabel,
  cartCheckoutLabel: 'Go to checkout',

  checkoutTitle: 'Review and confirm',
  checkoutLead: 'Review your order and confirm the delivery details.',
  checkoutLoading: 'Loading checkout…',
  checkoutRedirect: 'Your cart is empty. Returning to the cart…',
  checkoutReviewTitle: 'Your order',
  checkoutEditCartLabel: 'Edit cart',
  checkoutDeliveryTitle: 'Delivery details',
  minecraftUsernameLabel: 'Minecraft username',
  minecraftUsernameHelp:
    'Between 3 and 16 characters: letters without accents, numbers and underscore (_).',
  checkoutSubmitLabel: 'Finish order',
  checkoutConfirmationTitle: 'Order complete',
  checkoutConfirmationMessage:
    'Here is your order summary. The receipt is generated in this browser and is lost if you reload the page.',
  orderReceiptTitle: 'Order summary',
  orderReferenceLabel: 'Reference',
  checkoutBackLabel: 'Back to the catalog',
  usernameProblemMessage,

  signInLabel: 'Sign in',
  accountDialogTitle: 'Your player',
  accountNameLabel: 'Minecraft username',
  accountOpenLabel: (playerName: string) => `Player ${playerName}. Change player`,
  accountSignOutLabel: 'Remove player',
  accountSaveLabel: 'Save',
  accountCancelLabel: 'Cancel',

  homeDocumentTitle: 'Yokai Hardcore Store',
  catalogDocumentTitle: 'Catalog — Yokai Hardcore Store',
  cartDocumentTitle: 'Your cart — Yokai Hardcore Store',
  checkoutDocumentTitle: 'Review and confirm — Yokai Hardcore Store',
  productNotFoundDocumentTitle: 'Product not found — Yokai Hardcore Store',
};
