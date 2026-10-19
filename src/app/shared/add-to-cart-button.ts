/**
 * The add-to-cart control.
 *
 * Presentational: it knows a product's name (so its accessible name says *which* product, which
 * matters on a page that also lists related products) and it reports the click. What the click
 * does is the product page's decision, which keeps this button usable by a cart row, a future
 * quick-add on a card, and the detail page without any of them sharing state.
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ADD_TO_CART_LABEL } from '../core/ui-text';

@Component({
  selector: 'app-add-to-cart-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="button button--primary add-to-cart" (click)="add.emit()">
      {{ label() }}<span class="visually-hidden">: {{ productName() }}</span>
    </button>
  `,
  styles: `
    .add-to-cart {
      min-height: 2.75rem;
    }
  `,
})
export class AddToCartButton {
  /**
   * The product's display name, appended to the accessible name.
   *
   * It is inside the button rather than in an `aria-label`, because an `aria-label` would
   * replace the visible text and voice-control users would no longer be able to say what they
   * see. Appending keeps both.
   */
  readonly productName = input.required<string>();

  /** Visible text, overridable by a caller that needs different wording. */
  readonly label = input<string>(ADD_TO_CART_LABEL);

  /** Emitted on every click. Quantity and identity belong to the caller. */
  readonly add = output<void>();
}
