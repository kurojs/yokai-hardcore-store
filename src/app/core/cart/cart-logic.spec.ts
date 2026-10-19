/**
 * Specs for the pure cart.
 *
 * These are the tests that matter most in the whole cart feature: every rule the UI relies on
 * is here, as values in and values out, with no TestBed and no browser. If these pass, the only
 * things left to get wrong are wiring and presentation.
 */

import { MAX_LINE_QUANTITY, type Cart } from './cart-model';
import {
  addLine,
  cartItemCount,
  cartSubtotalUsd,
  cartTotals,
  clampLineQuantity,
  clearCart,
  findLine,
  lineTotalUsd,
  removeLine,
  roundUsd,
  setLineQuantity,
} from './cart-logic';

const PRICES = new Map([
  ['algodones', 1],
  ['cofre', 10],
  ['poción', 2.5],
]);

describe('clampLineQuantity', () => {
  it('keeps a legal quantity as it is', () => {
    expect(clampLineQuantity(1)).toBe(1);
    expect(clampLineQuantity(MAX_LINE_QUANTITY)).toBe(MAX_LINE_QUANTITY);
  });

  it('turns anything unusable into zero, which callers read as "no line"', () => {
    expect(clampLineQuantity(0)).toBe(0);
    expect(clampLineQuantity(-3)).toBe(0);
    expect(clampLineQuantity(Number.NaN)).toBe(0);
    expect(clampLineQuantity(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('floors a fraction rather than rounding it up into a unit nobody asked for', () => {
    expect(clampLineQuantity(2.9)).toBe(2);
  });

  it('clamps above the ceiling and never returns less than one for a legal input', () => {
    expect(clampLineQuantity(1000)).toBe(MAX_LINE_QUANTITY);
    expect(clampLineQuantity(5, 0)).toBe(1);
  });
});

describe('addLine', () => {
  it('appends a new product', () => {
    expect(addLine([], 'algodones')).toEqual([{ slug: 'algodones', quantity: 1 }]);
  });

  it('merges into an existing line instead of adding a second one', () => {
    const cart = addLine([{ slug: 'algodones', quantity: 2 }], 'algodones', 3);

    expect(cart).toEqual([{ slug: 'algodones', quantity: 5 }]);
  });

  it('keeps the position of the line it merges into', () => {
    const cart: Cart = [
      { slug: 'algodones', quantity: 1 },
      { slug: 'cofre', quantity: 1 },
    ];

    expect(addLine(cart, 'algodones', 1).map((line) => line.slug)).toEqual(['algodones', 'cofre']);
  });

  it('clamps at the ceiling rather than overflowing', () => {
    const cart = addLine([{ slug: 'algodones', quantity: MAX_LINE_QUANTITY }], 'algodones', 1);

    expect(cart[0]?.quantity).toBe(MAX_LINE_QUANTITY);
  });

  it('ignores an unusable slug or a quantity that would add nothing', () => {
    const cart: Cart = [{ slug: 'algodones', quantity: 1 }];

    expect(addLine(cart, '', 1)).toBe(cart);
    expect(addLine(cart, '   ', 1)).toBe(cart);
    expect(addLine(cart, 'algodones', 0)).toBe(cart);
    expect(addLine(cart, 'algodones', Number.NaN)).toBe(cart);
  });

  it('returns the same array when the quantity did not change, so signals stay quiet', () => {
    const cart: Cart = [{ slug: 'algodones', quantity: MAX_LINE_QUANTITY }];

    expect(addLine(cart, 'algodones', 5)).toBe(cart);
  });
});

describe('removeLine', () => {
  it('removes the line for the slug', () => {
    const cart: Cart = [
      { slug: 'algodones', quantity: 1 },
      { slug: 'cofre', quantity: 2 },
    ];

    expect(removeLine(cart, 'algodones')).toEqual([{ slug: 'cofre', quantity: 2 }]);
  });

  it('changes nothing when the product is not in the cart', () => {
    const cart: Cart = [{ slug: 'cofre', quantity: 2 }];

    expect(removeLine(cart, 'algodones')).toBe(cart);
  });
});

describe('setLineQuantity', () => {
  it('sets an existing line', () => {
    const cart = setLineQuantity([{ slug: 'algodones', quantity: 1 }], 'algodones', 7);

    expect(cart).toEqual([{ slug: 'algodones', quantity: 7 }]);
  });

  it('adds a line that was not there yet', () => {
    expect(setLineQuantity([], 'cofre', 2)).toEqual([{ slug: 'cofre', quantity: 2 }]);
  });

  it('removes the line when the quantity is zero or less', () => {
    const cart: Cart = [
      { slug: 'algodones', quantity: 1 },
      { slug: 'cofre', quantity: 2 },
    ];

    expect(setLineQuantity(cart, 'algodones', 0)).toEqual([{ slug: 'cofre', quantity: 2 }]);
    expect(setLineQuantity(cart, 'algodones', -1)).toEqual([{ slug: 'cofre', quantity: 2 }]);
  });

  it('floors and clamps as it sets', () => {
    expect(setLineQuantity([], 'cofre', 2.9)).toEqual([{ slug: 'cofre', quantity: 2 }]);
    expect(setLineQuantity([], 'cofre', 500)).toEqual([{ slug: 'cofre', quantity: MAX_LINE_QUANTITY }]);
  });

  it('returns the same array when nothing changes', () => {
    const cart: Cart = [{ slug: 'cofre', quantity: 2 }];

    expect(setLineQuantity(cart, 'cofre', 2)).toBe(cart);
  });
});

describe('clearCart', () => {
  it('returns the shared empty cart', () => {
    expect(clearCart()).toEqual([]);
    expect(clearCart()).toBe(clearCart());
  });
});

describe('findLine', () => {
  it('finds a line by slug and reports absence as undefined', () => {
    const cart: Cart = [{ slug: 'cofre', quantity: 2 }];

    expect(findLine(cart, 'cofre')?.quantity).toBe(2);
    expect(findLine(cart, 'algodones')).toBeUndefined();
  });
});

describe('cartItemCount', () => {
  it('counts units, not distinct products', () => {
    expect(
      cartItemCount([
        { slug: 'algodones', quantity: 3 },
        { slug: 'cofre', quantity: 2 },
      ]),
    ).toBe(5);
  });

  it('is zero for an empty cart', () => {
    expect(cartItemCount([])).toBe(0);
  });

  it('never produces NaN from a line that storage let through', () => {
    // Unreachable through the mutators, reachable if a value is built by hand or restored.
    expect(cartItemCount([{ slug: 'algodones', quantity: Number.NaN }])).toBe(0);
  });
});

describe('roundUsd', () => {
  it('rounds to whole cents', () => {
    expect(roundUsd(0.1 * 3)).toBe(0.3);
    expect(roundUsd(1.234)).toBe(1.23);
    expect(roundUsd(1.236)).toBe(1.24);
  });

  it('degrades a non-finite amount to zero instead of propagating NaN', () => {
    expect(roundUsd(Number.NaN)).toBe(0);
    expect(roundUsd(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('lineTotalUsd', () => {
  it('multiplies price by quantity', () => {
    expect(lineTotalUsd(2.5, 4)).toBe(10);
  });

  it('rounds the product to cents', () => {
    expect(lineTotalUsd(0.1, 3)).toBe(0.3);
  });

  it('is zero for a missing price or an unusable quantity', () => {
    expect(lineTotalUsd(Number.NaN, 3)).toBe(0);
    expect(lineTotalUsd(5, 0)).toBe(0);
  });
});

describe('cartSubtotalUsd', () => {
  it('prices every line from the map it is given', () => {
    expect(
      cartSubtotalUsd(
        [
          { slug: 'algodones', quantity: 3 },
          { slug: 'cofre', quantity: 2 },
        ],
        PRICES,
      ),
    ).toBe(23);
  });

  it('adds fractional prices to the cent', () => {
    expect(cartSubtotalUsd([{ slug: 'poción', quantity: 3 }], PRICES)).toBe(7.5);
  });

  it('ignores a line with no known price rather than producing NaN', () => {
    expect(cartSubtotalUsd([{ slug: 'fantasma', quantity: 3 }], PRICES)).toBe(0);
  });

  it('is zero for an empty cart', () => {
    expect(cartSubtotalUsd([], PRICES)).toBe(0);
  });
});

describe('cartTotals', () => {
  it('reports the unit count, the subtotal and the total', () => {
    const totals = cartTotals(
      [
        { slug: 'algodones', quantity: 2 },
        { slug: 'cofre', quantity: 1 },
      ],
      PRICES,
    );

    expect(totals).toEqual({ itemCount: 3, subtotalUsd: 12, totalUsd: 12 });
  });

  it('has no total without lines', () => {
    expect(cartTotals([], PRICES)).toEqual({ itemCount: 0, subtotalUsd: 0, totalUsd: 0 });
  });
});
