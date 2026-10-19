/**
 * The cart page: every line the visitor put in the cart, and what it adds up to.
 *
 * The page is a container, per `features/README.md`. It reads two root stores and owns no state
 * of its own: `CartStore` is the cart (so the header, this page and the checkout all read the
 * same value), and `CatalogStore` supplies the name, image and price for each slug. Editing a
 * quantity or removing a line goes straight through the store's existing mutators — this page
 * never computes a new cart itself, which is why the clamp at 99 and the "zero removes the line"
 * rule stay true here without being restated.
 *
 * Four states are real: loading, a load failure with a retry, empty, and populated. The empty
 * state is deliberately not a blank page — it explains the situation and provides the way back.
 *
 * **A line whose product left the catalog never reaches this page.** `CartStore.lines` reconciles
 * the stored cart against the catalog and drops unknown slugs, and `buildCartLineViews` repeats
 * the same rule locally for any caller holding unclean lines. The visible consequences are the
 * honest ones: no row, no unit in the count, no money in the totals. Never `NaN`, never a blank
 * name, and never a price guessed from storage.
 *
 * The totals shown here are `CartStore.totals`, which is `cartTotals(lines, catalogPrices)`. The
 * checkout page binds the same signal into the same `OrderSummary` component; there is no second
 * arithmetic implementation to disagree with this one.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogStore } from '../../core/catalog/catalog-store';
import { CartStore } from '../../core/cart/cart-store';
import { MAX_LINE_QUANTITY } from '../../core/cart/cart-model';
import { buildCartLineViews } from '../../core/cart/cart-summary';
import {
  CART_CONTINUE_LABEL,
  CART_EMPTY_ACTION,
  CART_EMPTY_MESSAGE,
  CART_EMPTY_TITLE,
  CART_LOADING_MESSAGE,
  CART_REMOVE_LABEL,
  CART_SUMMARY_TITLE,
  CART_TITLE,
  ORDER_SUMMARY_TOTAL_LABEL,
  QUANTITY_LABEL,
  UNIT_PRICE_LABEL,
  cartLineDecreaseLabel,
  cartLineIncreaseLabel,
  cartLineQuantityLabel,
  cartRemoveLabel,
} from '../../core/ui-text';
import { OrderSummary } from '../../shared/order-summary';
import { PricePipe } from '../../shared/price.pipe';
import { QuantityStepper } from '../../shared/quantity-stepper';

@Component({
  selector: 'app-cart-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PricePipe, QuantityStepper, OrderSummary],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
})
export class CartPage {
  private readonly catalog = inject(CatalogStore);
  private readonly cart = inject(CartStore);

  protected readonly isLoading = this.catalog.isLoading;
  protected readonly errorMessage = this.catalog.errorMessage;
  protected readonly isReady = this.catalog.isReady;

  /** The cart's lines, joined to their products. Empty while the catalog is loading. */
  protected readonly lineViews = computed(() =>
    buildCartLineViews(this.cart.lines(), this.catalog.entries()),
  );

  /** Unit count, subtotal and total, priced from the catalog by the cart store. */
  protected readonly totals = this.cart.totals;

  /**
   * True once the catalog is ready and the cart holds no lines.
   *
   * It is checked after `isReady` in the template on purpose: while the catalog is loading the
   * store's cart is empty by definition, and showing "your cart is empty" to someone whose
   * stored cart has not been restored yet would be a lie for as long as the fetch takes.
   */
  protected readonly isEmpty = computed(() => this.cart.lines().length === 0);

  protected readonly maxQuantity = MAX_LINE_QUANTITY;

  protected readonly title = CART_TITLE;
  protected readonly loadingMessage = CART_LOADING_MESSAGE;
  protected readonly emptyTitle = CART_EMPTY_TITLE;
  protected readonly emptyMessage = CART_EMPTY_MESSAGE;
  protected readonly emptyAction = CART_EMPTY_ACTION;
  protected readonly summaryTitle = CART_SUMMARY_TITLE;
  protected readonly continueLabel = CART_CONTINUE_LABEL;
  protected readonly removeLabel = CART_REMOVE_LABEL;
  protected readonly unitPriceLabel = UNIT_PRICE_LABEL;
  protected readonly quantityCaption = QUANTITY_LABEL;
  protected readonly totalLabel = ORDER_SUMMARY_TOTAL_LABEL;

  protected readonly quantityLabel = cartLineQuantityLabel;
  protected readonly increaseLabel = cartLineIncreaseLabel;
  protected readonly decreaseLabel = cartLineDecreaseLabel;
  protected readonly removeLabelFor = cartRemoveLabel;

  /** Writes the new quantity through the store; clamping and removal stay in `core/`. */
  protected setQuantity(slug: string, quantity: number): void {
    this.cart.setQuantity(slug, quantity);
  }

  protected remove(slug: string): void {
    this.cart.remove(slug);
  }

  protected retry(): void {
    this.catalog.reload();
  }
}
