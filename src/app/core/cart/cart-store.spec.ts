/**
 * Specs for the cart store.
 *
 * The pure cart and the adapter are already specified, so what is left to pin here is the
 * wiring: when a line counts, where the price comes from, and what a mutation writes back. The
 * real 48-product catalog is used so the prices in the totals are the store's actual prices
 * rather than a fixture's opinion.
 */

import { TestBed } from '@angular/core/testing';

import { CatalogStore } from '../catalog/catalog-store';
import { readCommittedCatalogDocument } from '../catalog/testing/committed-catalog';
import { jsonResponse } from '../catalog/testing/http';
import { CartStore, CART_STORAGE } from './cart-store';
import { CART_STORAGE_KEY, serializeCart, type StorageLike } from './cart-persistence';

function memoryStorage(initial?: string): StorageLike & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(CART_STORAGE_KEY, initial);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

interface Harness {
  readonly cart: CartStore;
  readonly catalog: CatalogStore;
  readonly storage: ReturnType<typeof memoryStorage>;
}

async function readyCart(stored?: string, storage = memoryStorage(stored)): Promise<Harness> {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => jsonResponse(readCommittedCatalogDocument())),
  );
  TestBed.configureTestingModule({
    providers: [{ provide: CART_STORAGE, useValue: storage }],
  });
  const cart = TestBed.inject(CartStore);
  const catalog = TestBed.inject(CatalogStore);
  await vi.waitFor(() => expect(catalog.isReady()).toBe(true));
  return { cart, catalog, storage };
}

describe('CartStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('starts empty when nothing was stored', async () => {
    const { cart } = await readyCart();

    expect(cart.lines()).toEqual([]);
    expect(cart.itemCount()).toBe(0);
    expect(cart.totals()).toEqual({ itemCount: 0, subtotalUsd: 0, totalUsd: 0 });
  });

  it('does not count a stored line until the catalog can name it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: CART_STORAGE, useValue: memoryStorage(serializeCart([{ slug: '10-algodones-de-azucar', quantity: 2 }])) },
      ],
    });

    const cart = TestBed.inject(CartStore);

    expect(cart.itemCount()).toBe(0);
    expect(cart.lines()).toEqual([]);
  });

  it('restores a stored cart and prices it from the catalog', async () => {
    const { cart } = await readyCart(
      serializeCart([{ slug: '10-algodones-de-azucar', quantity: 3 }]),
    );

    expect(cart.itemCount()).toBe(3);
    expect(cart.lines()).toEqual([{ slug: '10-algodones-de-azucar', quantity: 3 }]);
    // $1.00 each in the real catalog, whatever a previous version may have stored.
    expect(cart.totals().subtotalUsd).toBe(3);
  });

  it('drops a stored product that is no longer in the catalog', async () => {
    const { cart, storage } = await readyCart(
      serializeCart([
        { slug: '10-algodones-de-azucar', quantity: 1 },
        { slug: 'producto-que-ya-no-existe', quantity: 5 },
      ]),
    );

    expect(cart.lines()).toEqual([{ slug: '10-algodones-de-azucar', quantity: 1 }]);
    expect(cart.itemCount()).toBe(1);
    // Nothing was rewritten behind the visitor's back just for loading.
    expect(JSON.parse(storage.values.get(CART_STORAGE_KEY) ?? '{}')).toMatchObject({
      lines: [
        { slug: '10-algodones-de-azucar', quantity: 1 },
        { slug: 'producto-que-ya-no-existe', quantity: 5 },
      ],
    });
  });

  it('degrades a corrupt stored document to an empty cart', async () => {
    const { cart } = await readyCart('{"version":1,"lines":[{"slug":');

    expect(cart.lines()).toEqual([]);
    expect(cart.itemCount()).toBe(0);
  });

  it('adds, merges and writes back', async () => {
    const { cart, storage } = await readyCart();

    cart.add('10-algodones-de-azucar', 2);
    cart.add('10-algodones-de-azucar', 1);

    expect(cart.lines()).toEqual([{ slug: '10-algodones-de-azucar', quantity: 3 }]);
    expect(cart.itemCount()).toBe(3);
    expect(JSON.parse(storage.values.get(CART_STORAGE_KEY) ?? '{}')).toEqual({
      version: 1,
      lines: [{ slug: '10-algodones-de-azucar', quantity: 3 }],
    });
  });

  it('ignores an addition before the catalog is ready', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    const storage = memoryStorage(serializeCart([{ slug: '10-algodones-de-azucar', quantity: 2 }]));
    TestBed.configureTestingModule({ providers: [{ provide: CART_STORAGE, useValue: storage }] });

    const cart = TestBed.inject(CartStore);
    cart.add('10-algodones-de-azucar', 1);

    expect(storage.values.get(CART_STORAGE_KEY)).toBe(
      serializeCart([{ slug: '10-algodones-de-azucar', quantity: 2 }]),
    );
  });

  it('sets a quantity, and removes the line when it reaches zero', async () => {
    const { cart, storage } = await readyCart();

    cart.add('10-algodones-de-azucar', 2);
    cart.setQuantity('10-algodones-de-azucar', 5);

    expect(cart.itemCount()).toBe(5);

    cart.setQuantity('10-algodones-de-azucar', 0);

    expect(cart.lines()).toEqual([]);
    expect(JSON.parse(storage.values.get(CART_STORAGE_KEY) ?? '{}')).toEqual({
      version: 1,
      lines: [],
    });
  });

  it('removes one product without touching the others', async () => {
    const { cart } = await readyCart();

    cart.add('10-algodones-de-azucar', 1);
    cart.add('cofre-con-armamento', 1);
    cart.remove('10-algodones-de-azucar');

    expect(cart.lines().map((line) => line.slug)).toEqual(['cofre-con-armamento']);
  });

  it('clears everything', async () => {
    const { cart } = await readyCart();

    cart.add('cofre-con-armamento', 2);
    cart.clear();

    expect(cart.lines()).toEqual([]);
    expect(cart.itemCount()).toBe(0);
  });

  it('works with no storage at all', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(readCommittedCatalogDocument())),
    );
    TestBed.configureTestingModule({ providers: [{ provide: CART_STORAGE, useValue: null }] });
    const cart = TestBed.inject(CartStore);
    await vi.waitFor(() => expect(TestBed.inject(CatalogStore).isReady()).toBe(true));

    cart.add('cofre-con-armamento', 1);

    expect(cart.itemCount()).toBe(1);
  });
});
