import { DEFAULT_PRICE_LOCALE, formatUsdPrice } from './price';

describe('formatUsdPrice', () => {
  it('renders every price present in the catalog with two decimals', () => {
    // The catalog's real price distribution is {1:12, 2:13, 3:9, 4:4, 5:8, 10:2}.
    expect(formatUsdPrice(1)).toBe('$1.00');
    expect(formatUsdPrice(2)).toBe('$2.00');
    expect(formatUsdPrice(3)).toBe('$3.00');
    expect(formatUsdPrice(4)).toBe('$4.00');
    expect(formatUsdPrice(5)).toBe('$5.00');
    expect(formatUsdPrice(10)).toBe('$10.00');
  });

  it('renders fractional amounts, because the contract allows them', () => {
    expect(formatUsdPrice(0.5)).toBe('$0.50');
    expect(formatUsdPrice(1.25)).toBe('$1.25');
  });

  it('groups thousands so a large total stays readable', () => {
    expect(formatUsdPrice(1234.5)).toBe('$1,234.50');
  });

  it('renders negative amounts with a leading sign', () => {
    // Not reachable from the catalog, but T7 discounts make the sign relevant.
    expect(formatUsdPrice(-2)).toBe('-$2.00');
  });

  it('returns an empty string for non-finite input instead of throwing', () => {
    expect(formatUsdPrice(Number.NaN)).toBe('');
    expect(formatUsdPrice(Number.POSITIVE_INFINITY)).toBe('');
    expect(formatUsdPrice(Number.NEGATIVE_INFINITY)).toBe('');
  });

  it('honours an explicit locale', () => {
    expect(DEFAULT_PRICE_LOCALE).toBe('en-US');
    // Only the decimal separator is asserted: it is the stable fact across ICU versions,
    // unlike the placement of the currency symbol.
    expect(formatUsdPrice(1.5, 'de-DE')).toContain('1,50');
  });

  it('keeps formatting correct after the formatter cache is warmed', () => {
    // Guards the memoisation: a cache keyed on the wrong thing would return a formatter
    // configured for a different locale.
    formatUsdPrice(1);
    formatUsdPrice(1, 'de-DE');
    expect(formatUsdPrice(1)).toBe('$1.00');
  });
});
