/**
 * Price formatting for the whole storefront.
 *
 * One function owns how a catalog price becomes text, so the product card, the catalog
 * summary, the cart totals T7 will add and any future receipt all agree. Scattered
 * `toFixed(2)` calls are the failure this prevents: they silently drop the currency symbol,
 * never group thousands, and each one can drift.
 *
 * `Intl.NumberFormat` is used rather than the `currency` pipe directly because this has to
 * work outside a template too — `core/` must stay free of Angular so it can be tested
 * without TestBed, and cart arithmetic in T7 needs to format a computed total.
 *
 * The locale defaults to `en-US` because the store's prices are USD: that is the locale
 * that renders them as the familiar `$1.00`. The UI language is a separate concern (T8) and
 * `es-ES` would render the same amount as `1,00 US$`, so the loan locale is explicit and
 * overridable rather than tied to the page language.
 */

/** The store's prices are quoted in USD; only the number formatting locale varies. */
const PRICE_CURRENCY = 'USD';

/** Locale used when the caller has no opinion. */
export const DEFAULT_PRICE_LOCALE = 'en-US';

// Building an `Intl.NumberFormat` is expensive relative to formatting with one, and a
// catalog grid formats 48 prices on every change-detection pass, so formatters are reused.
const formatters = new Map<string, Intl.NumberFormat>();
const displayFormatters = new Map<string, Intl.NumberFormat>();

function formatterFor(locale: string): Intl.NumberFormat {
  let formatter = formatters.get(locale);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: PRICE_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(locale, formatter);
  }
  return formatter;
}

/**
 * Formats a USD amount for display, for example `$1.00` or `$1,234.50`.
 *
 * Non-finite input returns an empty string instead of throwing. Catalog validation makes
 * that unreachable (`priceUsd` must be a finite positive number), and a formatter that
 * throws would take the whole view down over one bad record — the data boundary is the
 * place that is allowed to be loud.
 */
export function formatUsdPrice(amount: number, locale: string = DEFAULT_PRICE_LOCALE): string {
  if (!Number.isFinite(amount)) return '';
  return formatterFor(locale).format(amount);
}

/** Formats a converted display amount with its ISO currency code, e.g. `MXN 17.00`. */
export function formatDisplayPrice(
  usdAmount: number,
  currency: string,
  rate: number,
  locale: string = DEFAULT_PRICE_LOCALE,
): string {
  if (!Number.isFinite(usdAmount) || !Number.isFinite(rate) || rate <= 0) return '';
  const amount = usdAmount * rate;
  if (!Number.isFinite(amount)) return '';

  const key = `${locale}\u0000${currency}`;
  let formatter = displayFormatters.get(key);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
    });
    displayFormatters.set(key, formatter);
  }
  return formatter.format(amount);
}
