import { productCountLabel } from './ui-text';

describe('productCountLabel', () => {
  it('uses the singular for exactly one product', () => {
    expect(productCountLabel(1)).toBe('1 producto');
  });

  it('uses the plural for the counts the catalog actually produces', () => {
    // The real categories hold 2, 4, 5, 8, 9, 12, 13 and 17 products; the whole catalog 48.
    expect(productCountLabel(0)).toBe('0 productos');
    expect(productCountLabel(2)).toBe('2 productos');
    expect(productCountLabel(13)).toBe('13 productos');
    expect(productCountLabel(48)).toBe('48 productos');
  });

  it('clamps a nonsensical count instead of showing it', () => {
    // Defensive only: the count always comes from a rendered list, so a fractional or
    // negative value means the caller is wrong, not that the customer should read "-0.5".
    expect(productCountLabel(-3)).toBe('0 productos');
    expect(productCountLabel(2.9)).toBe('2 productos');
    expect(productCountLabel(Number.NaN)).toBe('');
  });
});
