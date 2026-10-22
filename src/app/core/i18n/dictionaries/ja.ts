/**
 * Japanese chrome copy.
 *
 * Authored as Japanese, not as translated Spanish: the register is neutral-professional
 * (`です・ます`), the counters are `点` because the store sells discrete digital goods, and
 * sentences are ordered the way Japanese orders them rather than following the Spanish clause
 * order. Product and category names are Latin-script data and are interpolated unchanged, so a
 * sentence may legitimately end in a Spanish name.
 *
 * This copy has not been reviewed by a native speaker. It should be before release.
 */

import type { MinecraftUsernameProblem } from '../../checkout/username';
import { normaliseCount } from '../count';
import type { UiText } from '../ui-text-model';

/**
 * `13点`.
 *
 * Japanese has no plural form, so 1 and 48 take the same shape; the counter `点` is the natural
 * one for a countable number of digital goods. No space is inserted before the counter, which is
 * why this dictionary does not use the shared `countedLabel` helper.
 */
function productCountLabel(count: number): string {
  const value = normaliseCount(count);
  return value === null ? '' : `${value}点`;
}

/** The same counter, for cart units. */
function itemCountLabel(count: number): string {
  const value = normaliseCount(count);
  return value === null ? '' : `${value}点`;
}

function cartCountLabel(count: number): string {
  const value = normaliseCount(count);
  if (value === null) return 'カート';
  return value === 0 ? 'カートは空です' : `カート: ${value}点`;
}

function addedToCartMessage(productName: string, count: number): string {
  return `カートに追加しました：${productName}。カートの合計は${itemCountLabel(count)}です。`;
}

function relatedProductsTitle(categoryName: string): string {
  return `${categoryName}の関連商品`;
}

function cartLineQuantityLabel(productName: string): string {
  return `${productName}の数量`;
}

function cartLineIncreaseLabel(productName: string): string {
  return `${productName}を1点追加`;
}

function cartLineDecreaseLabel(productName: string): string {
  return `${productName}を1点減らす`;
}

function cartRemoveLabel(productName: string): string {
  return `${productName}をカートから削除`;
}

function upToPrice(price: string): string {
  return `${price}まで`;
}

function usernameProblemMessage(problem: MinecraftUsernameProblem): string {
  switch (problem) {
    case 'empty':
      return 'Minecraft のユーザー名を入力してください。';
    case 'too-short':
      return 'ユーザー名は3文字以上で入力してください。';
    case 'too-long':
      return 'ユーザー名は16文字以内で入力してください。';
    case 'illegal-characters':
      return '使用できるのはアクセント記号のない英字、数字、アンダースコア（_）のみです。';
  }
}

function languageChanged(languageName: string): string {
  return `言語を${languageName}に変更しました。`;
}

export const JA_UI_TEXT: UiText = {
  skipToContent: '本文へスキップ',
  brandHomeLabel: 'Yokai Hardcore Store、ホームへ移動',
  primaryNavLabel: 'メインナビゲーション',
  navHome: 'ホーム',
  navCatalog: 'カタログ',
  navCart: 'カート',
  cartLinkHint: 'カートページへ移動',
  backToTopLabel: 'ページの先頭へ戻る',
  footerBrand: 'Yokai Hardcore Store',
  footerShopTitle: 'ストア',
  footerCategoriesTitle: 'カテゴリ',
  footerShopNavLabel: 'ストアのリンク',
  footerCategoriesNavLabel: 'ストアのカテゴリ',
  footerCopyright: (year: number) => `© ${year} Yokai Hardcore`,
  languageLabel: '言語',
  languageChanged,

  productCountLabel,
  itemCountLabel,
  cartCountLabel,

  catalogLoadErrorTitle: 'カタログを読み込めませんでした',
  retryLabel: '再試行',

  homeTitle: 'Yokai Hardcore Store',
  homeCatalogAction: 'カタログを見る',
  homeLoading: 'カタログを読み込んでいます…',
  categoriesTitle: 'カテゴリ',

  catalogAllProducts: 'すべての商品',
  catalogUnknownCategoryHeading: 'カテゴリが見つかりません',
  catalogUnknownCategoryTitle: '該当するカテゴリが見つかりません',
  catalogLoading: 'カタログを読み込んでいます…',
  catalogUnknownCategoryMessage: 'URL を確認するか、カタログ全体に戻ってください。',
  catalogViewAll: 'カタログをすべて見る',
  categoriesNavLabel: 'カテゴリ',
  allCategoriesLabel: 'すべて',
  noResultsTitle: '該当する商品がありません',
  noResultsMessage: '別のキーワードで検索するか、フィルターを解除してください。',
  clearFiltersLabel: 'フィルターをクリア',

  filtersLabel: 'カタログのフィルター',
  catalogFiltersSummary: 'フィルター',
  searchLabel: '検索',
  searchPlaceholder: '商品名、説明、カテゴリ',
  priceFilterLabel: '価格',
  allPricesLabel: 'すべて',
  upToPrice,
  sortLabel: '並べ替え',
  sortFeatured: 'おすすめ順',
  sortPriceAsc: '価格の安い順',
  sortPriceDesc: '価格の高い順',
  sortNameAsc: '名前順（A-Z）',

  productLoading: '商品を読み込んでいます…',
  productNotFoundTitle: '商品が見つかりません',
  productNotFoundMessage:
    '商品名が変更されたか、現在このストアでは取り扱っていない可能性があります。',
  breadcrumbLabel: 'パンくずリスト',
  breadcrumbCatalog: 'カタログ',
  descriptionTitle: '商品説明',
  relatedProductsTitle,
  otherProductsTitle: 'その他の商品',
  addToCartLabel: 'カートに追加',
  quantityLabel: '数量',
  decreaseQuantityLabel: '1点減らす',
  increaseQuantityLabel: '1点追加',
  addedToCartMessage,

  orderSummaryTitle: 'ご注文の概要',
  orderSummaryItemsLabel: '点数',
  orderSummarySubtotalLabel: '小計',
  orderSummaryTotalLabel: '合計',

  cartTitle: 'カート',
  cartLoading: 'カートを読み込んでいます…',
  cartEmptyTitle: 'カートは空です',
  cartEmptyMessage: 'まだカートに商品を追加していません。',
  cartEmptyAction: 'カタログを見る',
  cartSummaryTitle: 'カートの概要',
  cartContinueLabel: '買い物を続ける',
  cartRemoveAction: '削除',
  unitPriceLabel: '単価',
  cartLineQuantityLabel,
  cartLineIncreaseLabel,
  cartLineDecreaseLabel,
  cartRemoveLabel,
  cartCheckoutLabel: 'チェックアウトへ進む',

  checkoutTitle: 'ご注文の確認',
  checkoutLead: 'ご注文内容を確認し、受け取り情報を入力してください。',
  checkoutLoading: 'チェックアウトを読み込んでいます…',
  checkoutRedirect: 'カートは空です。カートに戻ります…',
  checkoutReviewTitle: 'ご注文内容',
  checkoutEditCartLabel: 'カートを編集',
  checkoutDeliveryTitle: '受け取り情報',
  minecraftUsernameLabel: 'Minecraft ユーザー名',
  minecraftUsernameHelp:
    '3〜16文字。使用できるのはアクセント記号のない英字、数字、アンダースコア（_）です。',
  checkoutSubmitLabel: '注文を確定する',
  checkoutConfirmationTitle: 'ご注文が完了しました',
  checkoutConfirmationMessage:
    'ご注文内容は以下のとおりです。この控えはブラウザ内で作成され、再読み込みすると失われます。',
  orderReceiptTitle: 'ご注文内容',
  orderReferenceLabel: '参照番号',
  checkoutBackLabel: 'カタログに戻る',
  usernameProblemMessage,

  signInLabel: 'サインイン',
  accountDialogTitle: 'プレイヤー',
  accountNameLabel: 'Minecraft ユーザー名',
  accountOpenLabel: (playerName: string) => `プレイヤー ${playerName}。プレイヤーを変更`,
  accountSignOutLabel: 'プレイヤーを解除',
  accountSaveLabel: '保存',
  accountCancelLabel: 'キャンセル',

  homeDocumentTitle: 'Yokai Hardcore Store',
  catalogDocumentTitle: 'カタログ｜Yokai Hardcore Store',
  cartDocumentTitle: 'カート｜Yokai Hardcore Store',
  checkoutDocumentTitle: 'ご注文の確認｜Yokai Hardcore Store',
  productNotFoundDocumentTitle: '商品が見つかりません｜Yokai Hardcore Store',
};
