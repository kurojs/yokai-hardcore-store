/**
 * The order summary: unit count, subtotal and total.
 *
 * Two slices render this — the cart page and the demo checkout — so it lives in `shared/`
 * exactly as the container/presentational rule asks. It takes the numbers and the dictionary as
 * inputs and injects nothing: it does not know the cart, the catalog or the route, which is what
 * lets both pages feed it the same computed totals without either of them owning the other.
 *
 * This component is also the practical answer to "the cart and the checkout must not disagree".
 * They already share one calculation (`cartTotals` behind `CartStore.totals`); rendering it
 * through one component means they also share the labels and the price formatting, so there is
 * no second implementation left to drift.
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { UiText } from '../core/i18n/ui-text';
import { PricePipe } from './price.pipe';

@Component({
  selector: 'app-order-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  template: `
    <section class="summary glass glass--strong">
      <h2 class="summary__title">{{ resolvedHeading() }}</h2>

      <dl class="summary__rows">
        <div class="summary__row">
          <dt>{{ text().orderSummaryItemsLabel }}</dt>
          <dd>{{ itemCountText() }}</dd>
        </div>
        <div class="summary__row">
          <dt>{{ text().orderSummarySubtotalLabel }}</dt>
          <dd class="summary__money">{{ subtotalUsd() | price }}</dd>
        </div>
        <div class="summary__row summary__row--total">
          <dt>{{ text().orderSummaryTotalLabel }}</dt>
          <dd class="summary__money">{{ totalUsd() | price }}</dd>
        </div>
      </dl>

      <p class="summary__note">{{ text().orderSummaryNote }}</p>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .summary {
      padding: var(--space-5);
      border-radius: var(--radius-md);
    }

    .summary__title {
      margin-bottom: var(--space-3);
      font-size: 1.25rem;
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
      font-size: var(--text-ui);
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
      border-top: 1px solid var(--glass-border);
      font-size: 1.125rem;
      font-weight: 700;
    }

    .summary__money {
      font-variant-numeric: tabular-nums;
      color: var(--color-price);
    }

    .summary__note {
      margin-top: var(--space-3);
      font-size: var(--text-small);
      color: var(--color-text-muted);
    }
  `,
})
export class OrderSummary {
  /** The active dictionary, supplied by the page that owns the cart. */
  readonly text = input.required<UiText>();

  /** The cart's unit count, as `CartTotals.itemCount` reports it. */
  readonly itemCount = input.required<number>();

  /** The cart's subtotal in USD. */
  readonly subtotalUsd = input.required<number>();

  /** What the visitor pays in this demo: the subtotal, because there is nothing to add. */
  readonly totalUsd = input.required<number>();

  /** Overridable, because the cart page and the checkout name the same numbers differently. */
  readonly heading = input<string>();

  protected readonly itemCountText = computed(() =>
    this.text().itemCountLabel(this.itemCount()),
  );

  protected readonly resolvedHeading = computed(
    () => this.heading() ?? this.text().orderSummaryTitle,
  );
}
