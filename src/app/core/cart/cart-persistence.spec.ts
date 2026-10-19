/**
 * Specs for the cart's persistence adapter.
 *
 * The point of these tests is the degradation matrix, not the happy path: a stored cart is the
 * one input to this feature that arrives from a previous build, another tab, or a hand-edited
 * devtools panel. Every case below is a shape that has to end in a usable cart rather than an
 * exception or a `NaN`.
 */

import { MAX_LINE_QUANTITY, type Cart } from './cart-model';
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  clearStoredCart,
  parseStoredCart,
  readStoredCart,
  reconcileCart,
  serializeCart,
  writeStoredCart,
  type StorageLike,
} from './cart-persistence';

/** An in-memory `StorageLike`, so no spec needs jsdom's real `localStorage`. */
function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  readonly values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

/** The document shape the adapter writes, spelled out so the specs do not call the writer. */
function stored(lines: readonly unknown[], version: unknown = CART_STORAGE_VERSION): string {
  return JSON.stringify({ version, lines });
}

describe('parseStoredCart', () => {
  it('treats an absent or blank value as an empty cart', () => {
    expect(parseStoredCart(null)).toEqual({ lines: [], outcome: 'empty' });
    expect(parseStoredCart(undefined)).toEqual({ lines: [], outcome: 'empty' });
    expect(parseStoredCart('   ')).toEqual({ lines: [], outcome: 'empty' });
  });

  it('discards corrupt JSON instead of throwing', () => {
    expect(parseStoredCart('{"version":1,"lines":[{"slug":"a"')).toEqual({
      lines: [],
      outcome: 'discarded',
    });
  });

  it('discards a document that is not an object of ours', () => {
    for (const raw of ['[]', '"cart"', '42', 'null', 'true']) {
      expect(parseStoredCart(raw)).toEqual({ lines: [], outcome: 'discarded' });
    }
  });

  it('discards a document with a missing or foreign version', () => {
    expect(parseStoredCart(JSON.stringify({ lines: [{ slug: 'a', quantity: 1 }] }))).toEqual({
      lines: [],
      outcome: 'discarded',
    });
    expect(parseStoredCart(stored([{ slug: 'a', quantity: 1 }], 2))).toEqual({
      lines: [],
      outcome: 'discarded',
    });
    expect(parseStoredCart(stored([{ slug: 'a', quantity: 1 }], '1'))).toEqual({
      lines: [],
      outcome: 'discarded',
    });
  });

  it('discards a document whose lines field is not an array', () => {
    expect(parseStoredCart(JSON.stringify({ version: 1, lines: {} }))).toEqual({
      lines: [],
      outcome: 'discarded',
    });
  });

  it('keeps a valid document untouched', () => {
    expect(parseStoredCart(stored([{ slug: 'algodones', quantity: 3 }]))).toEqual({
      lines: [{ slug: 'algodones', quantity: 3 }],
      outcome: 'ok',
    });
  });

  it('keeps valid lines and drops the invalid ones', () => {
    const raw = stored([
      { slug: 'algodones', quantity: 3 },
      'not-a-line',
      null,
      { slug: '', quantity: 2 },
      { slug: '   ', quantity: 2 },
      { slug: 42, quantity: 2 },
      { slug: 'sin-cantidad' },
      { slug: 'texto', quantity: '3' },
      { slug: 'nulo', quantity: null },
      { slug: 'cero', quantity: 0 },
      { slug: 'negativo', quantity: -3 },
      { slug: 'cofre', quantity: 1 },
    ]);

    expect(parseStoredCart(raw)).toEqual({
      lines: [
        { slug: 'algodones', quantity: 3 },
        { slug: 'cofre', quantity: 1 },
      ],
      outcome: 'repaired',
    });
  });

  it('reads `null` as the shape a stored NaN actually arrives in', () => {
    // `JSON.stringify(NaN)` writes `null`; a literal `NaN` in the text is not JSON at all.
    expect(parseStoredCart(stored([{ slug: 'nan', quantity: null }]))).toEqual({
      lines: [],
      outcome: 'repaired',
    });
    expect(parseStoredCart('{"version":1,"lines":[{"slug":"nan","quantity":NaN}]}')).toEqual({
      lines: [],
      outcome: 'discarded',
    });
  });

  it('floors a fractional quantity and clamps an absurd one', () => {
    expect(parseStoredCart(stored([{ slug: 'a', quantity: 2.9 }])).lines).toEqual([
      { slug: 'a', quantity: 2 },
    ]);
    expect(parseStoredCart(stored([{ slug: 'b', quantity: 10_000 }])).lines).toEqual([
      { slug: 'b', quantity: MAX_LINE_QUANTITY },
    ]);
  });

  it('trims a slug and merges a duplicate, clamped', () => {
    expect(
      parseStoredCart(
        stored([
          { slug: ' algodones ', quantity: 2 },
          { slug: 'algodones', quantity: MAX_LINE_QUANTITY },
        ]),
      ).lines,
    ).toEqual([{ slug: 'algodones', quantity: MAX_LINE_QUANTITY }]);
  });
});

describe('serializeCart', () => {
  it('writes only the slug and the quantity under a version', () => {
    const document = JSON.parse(serializeCart([{ slug: 'algodones', quantity: 2 }])) as unknown;

    expect(document).toEqual({
      version: CART_STORAGE_VERSION,
      lines: [{ slug: 'algodones', quantity: 2 }],
    });
  });

  it('never writes a price, so a stored price can never win later', () => {
    expect(serializeCart([{ slug: 'algodones', quantity: 1 }])).not.toContain('price');
  });

  it('normalises on the way out so the next visit has nothing to repair', () => {
    const document = JSON.parse(
      serializeCart([
        { slug: 'algodones', quantity: 0 },
        { slug: 'cofre', quantity: 2.7 },
        { slug: 'cofre', quantity: 1 },
        { slug: '', quantity: 1 },
      ]),
    ) as { lines: readonly unknown[] };

    expect(document.lines).toEqual([{ slug: 'cofre', quantity: 2 }]);
    expect(parseStoredCart(JSON.stringify(document)).outcome).toBe('ok');
  });

  it('round-trips an empty cart', () => {
    expect(parseStoredCart(serializeCart([]))).toEqual({ lines: [], outcome: 'ok' });
  });
});

describe('readStoredCart and writeStoredCart', () => {
  it('reads what it wrote', () => {
    const storage = memoryStorage();
    const cart: Cart = [{ slug: 'cofre', quantity: 2 }];

    expect(writeStoredCart(storage, cart)).toBe(true);
    expect(storage.values.get(CART_STORAGE_KEY)).toBe(serializeCart(cart));
    expect(readStoredCart(storage)).toEqual({ lines: cart, outcome: 'ok' });
  });

  it('reports an empty storage as empty rather than as a failure', () => {
    expect(readStoredCart(memoryStorage())).toEqual({ lines: [], outcome: 'empty' });
  });

  it('reports a missing storage as unavailable', () => {
    expect(readStoredCart(null)).toEqual({ lines: [], outcome: 'unavailable' });
    expect(readStoredCart(undefined)).toEqual({ lines: [], outcome: 'unavailable' });
    expect(writeStoredCart(null, [])).toBe(false);
  });

  it('survives storage that throws on read, write and remove', () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };

    expect(readStoredCart(hostile)).toEqual({ lines: [], outcome: 'unavailable' });
    expect(writeStoredCart(hostile, [{ slug: 'a', quantity: 1 }])).toBe(false);
    expect(clearStoredCart(hostile)).toBe(false);
  });

  it('clears the stored cart', () => {
    const storage = memoryStorage({ [CART_STORAGE_KEY]: serializeCart([{ slug: 'a', quantity: 1 }]) });

    expect(clearStoredCart(storage)).toBe(true);
    expect(storage.values.has(CART_STORAGE_KEY)).toBe(false);
  });
});

describe('reconcileCart', () => {
  const known = (slug: string): boolean => slug === 'algodones' || slug === 'cofre';

  it('drops a stored product that is no longer in the catalog', () => {
    const cart: Cart = [
      { slug: 'algodones', quantity: 1 },
      { slug: 'producto-retirado', quantity: 4 },
    ];

    expect(reconcileCart(cart, known)).toEqual([{ slug: 'algodones', quantity: 1 }]);
  });

  it('keeps the original array when every line survives', () => {
    const cart: Cart = [{ slug: 'cofre', quantity: 2 }];

    expect(reconcileCart(cart, known)).toBe(cart);
  });

  it('merges duplicates that survived the parse', () => {
    const cart: Cart = [
      { slug: 'cofre', quantity: 2 },
      { slug: 'cofre', quantity: 1 },
    ];

    expect(reconcileCart(cart, known)).toEqual([{ slug: 'cofre', quantity: 3 }]);
  });

  it('is empty when nothing is known', () => {
    expect(reconcileCart([{ slug: 'algodones', quantity: 1 }], () => false)).toEqual([]);
  });
});
