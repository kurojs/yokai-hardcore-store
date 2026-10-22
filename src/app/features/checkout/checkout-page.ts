/**
 * The demo checkout: review the cart, name the Minecraft account, confirm — locally.
 *
 * What this page is *not* is the point of most of its decisions. There is no backend and there
 * never was one, so it collects no payment data (not even a disabled card field), calls no
 * provider, sends nothing anywhere and creates no order. The only field it asks for is the
 * in-game username, which is the natural delivery detail for a store that sells digital goods
 * and is replaceable the moment a real fulfilment flow exists.
 *
 * Submitting is a local event: it snapshots the reviewed totals, mints a readable reference,
 * clears the cart and renders a confirmation that says plainly that nothing was charged. The
 * confirmation lives in a signal and nowhere else — a reload loses it, and because the cart is
 * already empty, a reload of `/checkout` redirects to `/cart` rather than showing a stale
 * receipt. That is the honest behaviour, so the page says so in the confirmation itself.
 *
 * Validation is a pure function in `core/checkout/username.ts`; this component only decides
 * when to show the result. On a failed submit the field is marked invalid, described by its
 * error text, and focused, so the message is both announced and reachable.
 *
 * An empty cart does not render an empty form. Once the catalog is ready and the cart is empty,
 * the page navigates to `/cart` (replacing this history entry, so "back" does not return to a
 * dead form). While the catalog is loading it says so instead, because an unrestored stored cart
 * is empty only for as long as the fetch takes.
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { CartStore } from '../../core/cart/cart-store';
import { buildCartLineViews } from '../../core/cart/cart-summary';
import { CatalogStore } from '../../core/catalog/catalog-store';
import { createDemoOrder, type DemoOrder } from '../../core/checkout/demo-order';
import { ORDER_REFERENCE_NONCE_SPACE } from '../../core/checkout/order-reference';
import { validateMinecraftUsername } from '../../core/checkout/username';
import { PlayerStore } from '../../core/player/player-store';
import { LanguageStore } from '../../core/i18n/language-store';
import { OrderSummary } from '../../shared/order-summary';
import { PricePipe } from '../../shared/price.pipe';

@Component({
  selector: 'app-checkout-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PricePipe, OrderSummary],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPage {
  private readonly catalog = inject(CatalogStore);
  private readonly cart = inject(CartStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(LanguageStore);
  private readonly player = inject(PlayerStore);
  private readonly documentTitle = inject(Title);

  protected readonly text = this.i18n.text;

  protected readonly isLoading = this.catalog.isLoading;
  protected readonly errorMessage = this.catalog.errorMessage;
  protected readonly isReady = this.catalog.isReady;

  /** The same line views the cart page renders, from the same pure join. */
  protected readonly lineViews = computed(() =>
    buildCartLineViews(this.cart.lines(), this.catalog.entries()),
  );

  /** The same totals the cart page renders, from `CartStore.totals`. */
  protected readonly totals = this.cart.totals;

  /**
   * What the visitor has typed.
   *
   * Prefilled from the player the header already knows, because typing the same username twice
   * is a needless step. The value is not a saved order: only the username is remembered, on a
   * successful submit, so the avatar can reflect the same player everywhere.
   */
  private readonly draft = signal(this.player.playerName() ?? '');
  protected readonly draftValue = this.draft.asReadonly();

  /** True after the first failed submit, so errors do not appear before the visitor acts. */
  private readonly submitted = signal(false);

  /** The local confirmation, or `null` before submitting and after a reload. */
  protected readonly confirmation = signal<DemoOrder | null>(null);

  private readonly validation = computed(() => validateMinecraftUsername(this.draft()));

  protected readonly showError = computed(() => this.submitted() && !this.validation().ok);

  protected readonly errorText = computed(() => {
    const result = this.validation();
    return result.ok ? '' : this.text().usernameProblemMessage(result.problem);
  });

  /**
   * True when this page should not render at all.
   *
   * A confirmation wins over this check even though submitting empties the cart: the confirmation
   * is the result of the empty cart, not a reason to navigate away from it.
   */
  protected readonly isRedirecting = computed(
    () => this.confirmation() === null && this.isReady() && this.cart.lines().length === 0,
  );

  private readonly usernameInput = viewChild<ElementRef<HTMLInputElement>>('usernameInput');
  private readonly confirmationHeading = viewChild<ElementRef<HTMLElement>>('confirmationHeading');

  constructor() {
    // Navigating is the redirect. The template shows a short message while it happens so the
    // page never flashes the form it is about to abandon.
    effect(() => {
      if (this.isRedirecting()) void this.router.navigate(['/cart'], { replaceUrl: true });
    });

    // A confirmation replaces the form, so focus follows the change instead of staying on a
    // submit button that no longer exists.
    effect(() => {
      const heading = this.confirmationHeading()?.nativeElement;
      if (heading !== undefined) heading.focus();
    });

    effect(() => this.documentTitle.setTitle(this.text().checkoutDocumentTitle));
  }

  protected itemCountText(count: number): string {
    return this.text().itemCountLabel(count);
  }

  protected onInput(event: Event): void {
    const target = event.target;
    this.draft.set(target instanceof HTMLInputElement ? target.value : '');
  }

  protected submit(event: Event): void {
    event.preventDefault();

    const result = this.validation();
    if (!result.ok) {
      this.submitted.set(true);
      this.usernameInput()?.nativeElement.focus();
      return;
    }

    // Snapshot before clearing: the confirmation reports the cart that was reviewed, not the
    // one that is left afterwards. `createDemoOrder` copies the values for exactly that reason.
    this.confirmation.set(
      createDemoOrder({
        username: result.value,
        totals: this.totals(),
        placedAt: new Date(),
        nonce: Math.floor(Math.random() * ORDER_REFERENCE_NONCE_SPACE),
      }),
    );
    this.cart.clear();

    // The username is the player the store now knows: the header shows that skin afterwards,
    // and the checkout prefills the same name on the next visit.
    this.player.signIn(result.value);
  }

  protected retry(): void {
    this.catalog.reload();
  }
}
