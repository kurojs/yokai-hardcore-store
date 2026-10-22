import { Component, DestroyRef, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { CartStore } from './core/cart/cart-store';
import { CatalogStore } from './core/catalog/catalog-store';
import { LanguageStore } from './core/i18n/language-store';
import { LANGUAGE_LABELS, normalizeLanguage, type Language } from './core/i18n/language';
import { BrandMark } from './shared/brand-mark';
import { PlayerAccount } from './shared/player-account';

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
 *
 * Copy comes from `LanguageStore`, never from a literal: the header is the one surface every
 * page shares, so a forgotten string here would be visible in all three languages at once.
 *
 * Two pieces of behaviour belong to the shell rather than to a component:
 *
 * - **The scrolled header state.** One passive scroll listener flips a signal only when the
 *   boolean it stores actually changes, so a scroll of a thousand pixels costs zero change
 *   detections. The CSS does the rest.
 * - **The cart badge pop.** The badge animates when the count changes, never on first render.
 *   The component owns the flag and clears it on `animationend`; the keyframe lives in CSS.
 */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, BrandMark, PlayerAccount],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly cart = inject(CartStore);
  private readonly catalog = inject(CatalogStore);
  private readonly i18n = inject(LanguageStore);
  private readonly destroyRef = inject(DestroyRef);

  /** The active dictionary; every visible word in the header and footer reads through it. */
  protected readonly text = this.i18n.text;

  protected readonly language = this.i18n.language;

  /**
   * The footer's category links: the five biggest categories, in browse order.
   *
   * Empty until the catalog loads, and the column is then not rendered at all. A footer that
   * shows five empty bullets while the catalog is in flight is worse than one that grows a
   * useful column a moment later.
   */
  protected readonly footerCategories = computed(() =>
    this.catalog.orderedCategories().slice(0, 5),
  );

  /** The copyright year, read once: a build does not need to re-evaluate it per frame. */
  protected readonly currentYear = new Date().getFullYear();

  /** The header's denser glass state, set from a passive scroll listener. */
  protected readonly scrolled = signal(false);

  /** True while the badge is playing its pop. */
  protected readonly badgeBump = signal(false);

  /** Set on the first count the shell sees, so a page load does not animate the badge. */
  private badgeSettled = false;

  /**
   * The cart's unit count, for the badge.
   *
   * It is the store's own count, not a length of something the shell derives: the badge, the
   * link's accessible name and the live region must always agree.
   */
  protected readonly itemCount = this.cart.itemCount;

  /**
   * The switcher's options.
   *
   * Labels are endonyms (`Español`, `English`, `日本語`) and therefore identical in all three
   * languages; they are data in `language.ts`, not translated copy.
   */
  protected readonly languageOptions = this.i18n.languages.map((value) => ({
    value,
    label: LANGUAGE_LABELS[value],
  }));

  /**
   * The cart indicator's text: an empty-cart status or the localized unit count.
   *
   * It is the visible text of a link to `/cart`. The link's accessible name appends a visually
   * hidden hint, because the count alone reads as a status rather than as a destination. A
   * separate hidden live region repeats the same text, so adding to the cart announces the new
   * count politely without stealing focus.
   *
   * It reads the store rather than storage, so the count is what the visitor can actually buy:
   * lines the catalog no longer contains are already excluded upstream.
   */
  protected readonly cartLabel = computed(() =>
    this.text().cartCountLabel(this.cart.itemCount()),
  );

  /**
   * What the language live region says.
   *
   * A `role="status"` region only announces *changes*, so this starts empty and is filled when a
   * switch actually happens. It is set from the new dictionary, so the announcement is already in
   * the language the visitor just chose — which is the language they are now reading.
   */
  private readonly languageAnnouncement = signal('');

  protected readonly announcement = this.languageAnnouncement.asReadonly();

  constructor() {
    // The badge pops on a change, never on the first value: a visitor arriving with two items in
    // the cart should not see an animation for a change that never happened in this tab.
    effect(() => {
      this.itemCount();
      if (!this.badgeSettled) {
        this.badgeSettled = true;
        return;
      }
      this.badgeBump.set(true);
    });

    // A passive listener rather than a host binding: `scroll` fires on every frame of a gesture,
    // and the signal only notifies Angular when the boolean it stores actually flips.
    afterNextRender(() => {
      const sync = (): void => this.scrolled.set(window.scrollY > 8);
      sync();
      window.addEventListener('scroll', sync, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', sync));
    });
  }

  /** The keyframe has finished, so the class can be removed and the next change can replay it. */
  protected onBadgeAnimationEnd(): void {
    this.badgeBump.set(false);
  }

  protected onLanguageChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;

    const next: Language = normalizeLanguage(target.value);
    this.i18n.set(next);
    this.languageAnnouncement.set(this.text().languageChanged(LANGUAGE_LABELS[next]));
  }
}
