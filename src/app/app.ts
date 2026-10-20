import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { CartStore } from './core/cart/cart-store';
import { LanguageStore } from './core/i18n/language-store';
import { LANGUAGE_LABELS, normalizeLanguage, type Language } from './core/i18n/language';

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
 */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly cart = inject(CartStore);
  private readonly i18n = inject(LanguageStore);

  /** The active dictionary; every visible word in the header and footer reads through it. */
  protected readonly text = this.i18n.text;

  protected readonly language = this.i18n.language;

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

  protected onLanguageChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;

    const next: Language = normalizeLanguage(target.value);
    this.i18n.set(next);
    this.languageAnnouncement.set(this.text().languageChanged(LANGUAGE_LABELS[next]));
  }
}
