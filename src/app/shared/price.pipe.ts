/**
 * Formats USD catalog amounts using the currently selected display currency and reference rate.
 *
 * This pipe is impure so a rate or selected currency change refreshes every existing price
 * display without changing each feature template. Intl formatters are cached by locale and code.
 * All input values remain USD; only this presentation boundary converts them.
 */

import { Optional, Pipe, PipeTransform } from '@angular/core';

import { CurrencyStore } from '../core/format/currency-store';
import { DEFAULT_PRICE_LOCALE, formatDisplayPrice } from '../core/format/price';
import { LanguageStore } from '../core/i18n/language-store';
import type { Language } from '../core/i18n/language';

const PRICE_LOCALE_BY_LANGUAGE: Readonly<Record<Language, string>> = {
  en: 'en-US',
  es: 'es-MX',
  ja: 'ja-JP',
};

@Pipe({ name: 'price', pure: false })
export class PricePipe implements PipeTransform {
  constructor(
    @Optional() private readonly currency: CurrencyStore | null = null,
    @Optional() private readonly language: LanguageStore | null = null,
  ) {}

  /**
   * @returns A locale-formatted amount with its ISO code, or `''` for missing/non-finite input.
   */
  transform(amount: number | null | undefined, locale?: string): string {
    if (amount === null || amount === undefined) return '';
    return formatDisplayPrice(
      amount,
      this.currency?.currency() ?? 'USD',
      this.currency?.rate() ?? 1,
      locale ??
        (this.language === null
          ? DEFAULT_PRICE_LOCALE
          : PRICE_LOCALE_BY_LANGUAGE[this.language.language()]),
    );
  }
}
