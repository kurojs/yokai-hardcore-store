/**
 * What the demo confirmation shows, captured before the cart is cleared.
 *
 * The confirmation cannot read the cart after submitting — submitting is exactly what empties
 * it — so the numbers it reports have to be taken from the cart that was reviewed. Making that
 * capture a pure, tested function keeps the one risky ordering ("snapshot first, clear second")
 * out of the component and in a place where a test can hold it still.
 *
 * This type is not persisted. A reload loses the confirmation, and the page has no storage code
 * that could pretend otherwise.
 */

import type { CartTotals } from '../cart/cart-model';
import { createOrderReference } from './order-reference';

/** The immutable record a confirmation renders. It is not an order. */
export interface DemoOrder {
  /** The local, human-readable reference; see `order-reference.ts`. */
  readonly reference: string;
  /** The username exactly as validated, so the confirmation echoes what was typed. */
  readonly username: string;
  /** Units in the cart at submission time. */
  readonly itemCount: number;
  /** Total in USD at submission time, before the cart was cleared. */
  readonly totalUsd: number;
}

/** Everything `createDemoOrder` needs, passed explicitly so the result is deterministic. */
export interface DemoOrderInput {
  readonly username: string;
  readonly totals: CartTotals;
  readonly placedAt: Date;
  readonly nonce: number;
}

/**
 * Copies the reviewed cart's totals into the confirmation record and mints its reference.
 *
 * @returns a frozen-in-practice snapshot: the cart can be cleared immediately afterwards
 *   without changing what the visitor is shown.
 */
export function createDemoOrder(input: DemoOrderInput): DemoOrder {
  return {
    reference: createOrderReference(input.placedAt, input.nonce),
    username: input.username,
    itemCount: input.totals.itemCount,
    totalUsd: input.totals.totalUsd,
  };
}
