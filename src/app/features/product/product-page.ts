/**
 * The product detail page: image first, and nothing three-dimensional.
 *
 * The product decision this page encodes: the repository's `.bbmodel` and item models are
 * landing decoration, never a SKU presentation, so `modelPath` is `null` for every product and
 * this page does not import anything from `three/`. The hero is the real store photography that
 * ships under `public/products/<slug>/`, whose extension is **not** uniform: of the 48 products,
 * 35 are `.png`, 9 `.jpeg`, 3 `.jpg` and 1 `.gif`. So the page always renders `imagePath` from the
 * catalog and never composes a filename — a `.png` convention would have broken 13 products.
 *
 * The page has four states and all four are real: loading, a load failure with a retry, an
 * unknown slug, and the product. The unknown slug case is the one worth naming: `/product/…` is
 * served by the SPA fallback with HTTP 200 whatever the slug is, so "not found" can only be a
 * rendered state. It is a real state here — a heading, an explanation and a way back to the
 * catalog — and `product-page.spec.ts` and `app.routes.spec.ts` assert it against the real
 * catalog.
 *
 * Signals, not effects, decide what the page shows. The two pieces of per-product state (the
 * selected quantity and the add confirmation) are stored with the slug they belong to, so
 * navigating from one product to a related one resets them without an effect that has to
 * remember to run.
 *
 * The chrome is translated; the product name, category name and description are catalog data
 * and are interpolated verbatim.
 */

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { CatalogStore } from '../../core/catalog/catalog-store';
import { CartStore } from '../../core/cart/cart-store';
import { pageTitle, STORE_NAME } from '../../core/i18n/document-title';
import { LanguageStore } from '../../core/i18n/language-store';
import { AddToCartButton } from '../../shared/add-to-cart-button';
import { PricePipe } from '../../shared/price.pipe';
import { ProductCard } from '../../shared/product-card';
import { ProductDescription } from '../../shared/product-description';
import { QuantityStepper } from '../../shared/quantity-stepper';
import { RELATED_COUNT, selectRelated } from './related';

@Component({
  selector: 'app-product-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PricePipe,
    ProductCard,
    ProductDescription,
    QuantityStepper,
    AddToCartButton,
  ],
  templateUrl: './product-page.html',
  styleUrl: './product-page.scss',
})
export class ProductPage {
  private readonly catalog = inject(CatalogStore);
  private readonly cart = inject(CartStore);
  private readonly i18n = inject(LanguageStore);
  private readonly documentTitle = inject(Title);

  /** The product slug from the route; `undefined` only if the route is misconfigured. */
  readonly slug = input<string | undefined>();

  protected readonly text = this.i18n.text;

  protected readonly isLoading = this.catalog.isLoading;
  protected readonly errorMessage = this.catalog.errorMessage;
  protected readonly isReady = this.catalog.isReady;

  /** The product, its category and its related strip, or `null` while absent or unknown. */
  protected readonly view = computed(() => {
    const entry = this.catalog.findProduct(this.slug());
    if (entry === null) return null;
    return {
      product: entry.product,
      category: entry.category,
      related: selectRelated(this.catalog.entries(), entry, RELATED_COUNT),
    };
  });

  /** True only once the catalog is loaded and the slug matched nothing. */
  protected readonly isUnknownProduct = computed(
    () => this.isReady() && this.view() === null,
  );

  protected readonly relatedTitle = computed(() => {
    const view = this.view();
    if (view?.related == null) return '';
    return view.related.kind === 'same-category'
      ? this.text().relatedProductsTitle(view.category.name)
      : this.text().otherProductsTitle;
  });

  /** The quantity selected on this product, reset to one when the product changes. */
  private readonly selection = signal<{ readonly slug: string; readonly quantity: number } | null>(
    null,
  );

  protected readonly quantity = computed(() => {
    const product = this.view()?.product;
    const selection = this.selection();
    if (product === undefined) return 1;
    return selection !== null && selection.slug === product.slug ? selection.quantity : 1;
  });

  /** The last addition, tagged with the product it belongs to, or `null`. */
  private readonly confirmation = signal<{ readonly slug: string; readonly message: string } | null>(
    null,
  );

  /**
   * What the live region says.
   *
   * Empty until something is added *and* empty again as soon as the slug changes, so a related
   * product's page never inherits the previous product's confirmation.
   */
  protected readonly addedMessage = computed(() => {
    const confirmation = this.confirmation();
    const product = this.view()?.product;
    if (confirmation === null || product === undefined) return '';
    return confirmation.slug === product.slug ? confirmation.message : '';
  });

  /**
   * The document title for the current state, or `null` to leave it alone.
   *
   * `null` while the catalog is loading: a deep link straight to a product should not flash a
   * not-found title before the catalog arrives. A product title is the one title composed from
   * catalog data, so it goes through `pageTitle`; the brand itself is never translated.
   */
  private readonly titleText = computed(() => {
    const view = this.view();
    if (view !== null) return pageTitle(view.product.name);
    if (this.errorMessage() !== null) return STORE_NAME;
    if (!this.isReady()) return null;
    return this.text().productNotFoundDocumentTitle;
  });

  constructor() {
    // The route's `title` cannot name the product: it is resolved before the catalog loads, so
    // every product page would be called "Product". The service is told the name once the
    // product is known, and the previous title is left alone while the catalog is in flight.
    effect(() => {
      const title = this.titleText();
      if (title !== null) this.documentTitle.setTitle(title);
    });
  }

  protected setQuantity(quantity: number): void {
    const product = this.view()?.product;
    if (product === undefined) return;
    this.selection.set({ slug: product.slug, quantity });
  }

  protected addToCart(): void {
    const view = this.view();
    if (view === null) return;

    this.cart.add(view.product.slug, this.quantity());
    this.confirmation.set({
      slug: view.product.slug,
      message: this.text().addedToCartMessage(view.product.name, this.cart.itemCount()),
    });
  }

  protected retry(): void {
    this.catalog.reload();
  }
}
