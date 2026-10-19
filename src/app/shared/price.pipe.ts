/**
 * The `price` pipe: catalog prices formatted the one way the storefront formats them.
 *
 * It exists for two reasons. First, a template cannot call `formatUsdPrice` cheaply on every
 * change-detection pass, while Angular caches a pure pipe's result per input — which is
 * exactly the memoisation a 48-card grid wants. Second, it keeps the formatting rule in one
 * place instead of letting each template reach for `@angular/common`'s `currency` pipe.
 *
 * `currency` is deliberately not used directly: `formatUsdPrice` pins the USD loan locale,
 * so cards, the cart totals T7 will add and any future receipt cannot render the same amount
 * three different ways.
 */

import { Pipe, PipeTransform } from '@angular/core';

import { DEFAULT_PRICE_LOCALE, formatUsdPrice } from '../core/format/price';

@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  /**
   * @returns `$1.00`-style text, or `''` for `null`, `undefined` or a non-finite amount, so a
   *   missing price renders as nothing rather than as `$NaN`.
   */
  transform(
    amount: number | null | undefined,
    locale: string = DEFAULT_PRICE_LOCALE,
  ): string {
    return amount === null || amount === undefined ? '' : formatUsdPrice(amount, locale);
  }
}
