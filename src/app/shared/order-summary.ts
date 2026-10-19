/**
 * The order summary: unit count, subtotal and total.
 *
 * Two slices render this — the cart page and the demo checkout — so it lives in `shared/`
 * exactly as the container/presentational rule asks. It takes the three numbers as inputs and
 * injects nothing: it does not know the cart, the catalog or the route, which is what lets both
 * pages feed it the same computed totals without either of them owning the other.
 *
 * This component is also the practical answer to "the cart and the checkout must not disagree".
 * They already share one calculation (`cartTotals` behind `CartStore.totals`); rendering it
 * through one component means they also share the labels and the price formatting, so there is
 * no second implementation left to drift.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  ORDER_SUMMARY_ITEMS_LABEL,
  ORDER_SUMMARY_NOTE,
  ORDER_SUMMARY_SUBTOTAL_LABEL,
  ORDER_SUMMARY_TITLE,
  ORDER_SUMMARY_TOTAL_LABEL,
  itemCountLabel,
} from '../core/ui-text';
import { PricePipe } from './price.pipe';

@Component({
  selector: 'app-order-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  template: `
    <section class="summary">
      <h2 class="summary__title">{{ heading() }}</h2>

      <dl class="summary__rows">
        <div class="summary__row">
          <dt>{{ itemsLabel() }}</dt>
          <dd>{{ itemCountText() }}</dd>
        </div>
        <div class="summary__row">
          <dt>{{ subtotalLabel() }}</dt>
          <dd class="summary__money">{{ subtotalUsd() | price }}</dd>
        </div>
        <div class="summary__row summary__row--total">
          <dt>{{ totalLabel() }}</dt>
          <dd class="summary__money">{{ totalUsd() | price }}</dd>
        </div>
      </dl>

      <p class="summary__note">{{ note() }}</p>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .summary {
      padding: var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .summary__title {
      margin-bottom: var(--space-3);
      font-size: 1.125rem;
    }

    .summary__rows {
      display: grid;
      gap: var(--space-2);
      margin: 0;
    }

    .summary__row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3);
      font-size: 0.9375rem;
    }

    .summary__row dt {
      color: var(--color-text-muted);
    }

    .summary__row dd {
      margin: 0;
    }

    /* The total is the one number a visitor checks twice, so it is larger than the rest. */
    .summary__row--total {
      margin-top: var(--space-2);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
      font-size: 1.0625rem;
      font-weight: 600;
    }

    .summary__money {
      font-family: var(--font-mono);
    }

    .summary__note {
      margin-top: var(--space-3);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
  `,
})
export class OrderSummary {
  /** The cart's unit count, as `CartTotals.itemCount` reports it. */
  readonly itemCount = input.required<number>();

  /** The cart's subtotal in USD. */
  readonly subtotalUsd = input.required<number>();

  /** What the visitor pays in this demo: the subtotal, because there is nothing to add. */
  readonly totalUsd = input.required<number>();

  readonly heading = input<string>(ORDER_SUMMARY_TITLE);
  readonly itemsLabel = input<string>(ORDER_SUMMARY_ITEMS_LABEL);
  readonly subtotalLabel = input<string>(ORDER_SUMMARY_SUBTOTAL_LABEL);
  readonly totalLabel = input<string>(ORDER_SUMMARY_TOTAL_LABEL);
  readonly note = input<string>(ORDER_SUMMARY_NOTE);

  /** `1 artículo` / `3 artículos`, so the count reads as a sentence rather than a bare number. */
  protected itemCountText(): string {
    return itemCountLabel(this.itemCount());
  }
}
