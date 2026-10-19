/**
 * Specs for the demo confirmation snapshot.
 *
 * The ordering this protects is the whole risk: the confirmation is built from the reviewed
 * cart, then the cart is cleared. If the snapshot read totals lazily, the confirmation would be
 * showing zeroes a moment later.
 */

import type { CartTotals } from '../cart/cart-model';
import { createDemoOrder } from './demo-order';

const totals: CartTotals = { itemCount: 5, subtotalUsd: 7, totalUsd: 7 };

describe('createDemoOrder', () => {
  it('captures the reviewed cart, the username and a reference', () => {
    const order = createDemoOrder({
      username: 'Steve_123',
      totals,
      placedAt: new Date('2026-10-18T12:00:00Z'),
      nonce: 12345,
    });

    expect(order).toEqual({
      reference: 'YOKAI-20261018-09IX',
      username: 'Steve_123',
      itemCount: 5,
      totalUsd: 7,
    });
  });

  it('copies the totals instead of keeping a live reference to them', () => {
    const mutableTotals = { itemCount: 2, subtotalUsd: 3, totalUsd: 3 };
    const order = createDemoOrder({
      username: 'Steve',
      totals: mutableTotals,
      placedAt: new Date('2026-10-18T12:00:00Z'),
      nonce: 1,
    });

    mutableTotals.itemCount = 0;
    mutableTotals.totalUsd = 0;

    expect(order.itemCount).toBe(2);
    expect(order.totalUsd).toBe(3);
  });
});
