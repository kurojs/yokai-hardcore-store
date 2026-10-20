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
 *
 * Every accessible name in a row is built from the active dictionary plus the product name, so a
 * screen reader hears "Quitar 10 ALGODONES DE AZUCAR del carrito" and a Japanese visitor hears
 * the same sentence in Japanese with the Spanish product name inside it.
 */

import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { CatalogStore } from '../../core/catalog/catalog-store';
import { CartStore } from '../../core/cart/cart-store';
import { MAX_LINE_QUANTITY } from '../../core/cart/cart-model';
import { buildCartLineViews } from '../../core/cart/cart-summary';
import { LanguageStore } from '../../core/i18n/language-store';
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
  private readonly i18n = inject(LanguageStore);
  private readonly documentTitle = inject(Title);

  protected readonly text = this.i18n.text;

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

  constructor() {
    effect(() => this.documentTitle.setTitle(this.text().cartDocumentTitle));
  }

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
