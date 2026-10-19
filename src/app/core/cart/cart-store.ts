/**
 * The cart as application state: a thin signal wrapper over the pure cart and the adapter.
 *
 * It is a root-provided service in `core/` rather than slice state because two slices need it
 * (`product/` adds to it now, `cart/` will present it in T7) and `features/README.md` forbids
 * one slice from importing another. `core/README.md` names the cart store as the canonical
 * example of what belongs here, so this is the architecture the project already chose.
 *
 * The class deliberately does almost nothing. Adding, clamping, merging, totalling and repairing
 * are all functions in `cart-logic.ts` and `cart-persistence.ts`; this file only holds the value,
 * decides *when* a line counts (the catalog has to have loaded), and writes it back.
 *
 * Why the catalog matters here at all: a cart line is a slug and a quantity. Its price, name and
 * image come from the catalog at render time, and a slug the catalog does not contain is not a
 * product. So `lines` is empty until the catalog is ready, and then it is the stored cart with
 * every unknown slug dropped. A visitor whose stored cart survives a catalog change keeps the
 * products that still exist and silently loses the ones that do not — no exception, no `NaN`.
 */

import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';

import { CatalogStore } from '../catalog/catalog-store';
import { EMPTY_CART, type Cart } from './cart-model';
import { addLine, cartItemCount, cartTotals, clearCart, removeLine, setLineQuantity } from './cart-logic';
import {
  readStoredCart,
  reconcileCart,
  writeStoredCart,
  type StorageLike,
} from './cart-persistence';

/**
 * The browser storage the cart persists to.
 *
 * An injection token rather than a direct `localStorage` read for the usual reason: a spec can
 * provide an object literal, and a browser that has no storage (or throws when asked for it)
 * resolves to `null` instead of breaking application bootstrap.
 */
export const CART_STORAGE = new InjectionToken<StorageLike | null>('CART_STORAGE', {
  providedIn: 'root',
  factory: () => browserStorage(),
});

function browserStorage(): StorageLike | null {
  try {
    const storage: Storage | undefined = globalThis.localStorage;
    return typeof storage?.getItem === 'function' ? storage : null;
  } catch {
    // Accessing `localStorage` throws in some privacy configurations. A cart that works for
    // this visit is a better outcome than an application that does not start.
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly catalog = inject(CatalogStore);
  private readonly storage = inject(CART_STORAGE);

  /** The cart as persisted, before it is checked against the catalog. */
  private readonly restored = signal<Cart>(readStoredCart(this.storage).lines);

  /**
   * The cart, with only lines whose product still exists.
   *
   * Empty before the catalog is ready. That is a deliberate ordering rule: a line nobody can
   * price or name is not something the header should count, and it makes the "stale product"
   * case fall out of the type system instead of needing a guard in every consumer.
   */
  readonly lines = computed<Cart>(() => {
    if (!this.catalog.isReady()) return EMPTY_CART;
    const known = new Set(this.catalog.entries().map((entry) => entry.product.slug));
    return reconcileCart(this.restored(), (slug) => known.has(slug));
  });

  /** The number the shell's cart indicator shows. */
  readonly itemCount = computed(() => cartItemCount(this.lines()));

  /** Prices as the catalog holds them right now, keyed by slug. */
  private readonly priceBySlug = computed<ReadonlyMap<string, number>>(
    () =>
      new Map(
        this.catalog.entries().map((entry) => [entry.product.slug, entry.product.priceUsd] as const),
      ),
  );

  /** Unit count, subtotal and total, priced from the catalog rather than from storage. */
  readonly totals = computed(() => cartTotals(this.lines(), this.priceBySlug()));

  /**
   * Adds `quantity` of `slug` to the cart.
   *
   * A no-op until the catalog is ready: before that the cart is empty by definition, and
   * committing a line would write over the visitor's stored cart with a single item.
   */
  add(slug: string, quantity: number = 1): void {
    if (!this.catalog.isReady()) return;
    this.commit(addLine(this.lines(), slug, quantity));
  }

  /** Sets a line's quantity, removing the line when the quantity is zero or less. */
  setQuantity(slug: string, quantity: number): void {
    if (!this.catalog.isReady()) return;
    this.commit(setLineQuantity(this.lines(), slug, quantity));
  }

  /** Removes a product from the cart. */
  remove(slug: string): void {
    if (!this.catalog.isReady()) return;
    this.commit(removeLine(this.lines(), slug));
  }

  /** Empties the cart and forgets it between visits. */
  clear(): void {
    this.commit(clearCart());
  }

  private commit(next: Cart): void {
    this.restored.set(next);
    writeStoredCart(this.storage, next);
  }
}
