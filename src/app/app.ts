import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { CartStore } from './core/cart/cart-store';
import { CART_LINK_HINT, cartCountLabel } from './core/ui-text';

/**
 * The application shell: header, routed content, footer.
 *
 * The header and footer live here rather than in `shared/` because they are the shell's own
 * furniture, not reusable presentation: `shared/README.md` scopes that folder to pieces with
 * more than one consumer, and it forbids routing inside it. A `shell/` folder would have been
 * a fifth top-level folder that the architectural contract does not define, so the shell stays
 * in `app.ts` — the one file Angular already reserves for it.
 *
 * The markup is in `app.html` and the styling in `app.scss`, which is where the scaffold put
 * them and what makes the 20 kB of placeholder markup worth replacing rather than extending.
 */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly cart = inject(CartStore);

  /**
   * The cart indicator's text: `Carrito vacío` or `Carrito: 3 artículos`.
   *
   * It is the visible text of a link to `/cart`. The link's accessible name appends a visually
   * hidden {@link CART_LINK_HINT}, because the count alone reads as a status rather than as a
   * destination. A separate hidden live region repeats the same text, so adding to the cart
   * announces the new count politely without stealing focus.
   *
   * It reads the store rather than storage, so the count is what the visitor can actually buy:
   * lines the catalog no longer contains are already excluded upstream.
   */
  protected readonly cartLabel = computed(() => cartCountLabel(this.cart.itemCount()));

  protected readonly cartLinkHint = CART_LINK_HINT;
}
