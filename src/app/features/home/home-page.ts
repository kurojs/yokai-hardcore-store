/**
 * The landing page: the store's name and one action, then the categories.
 *
 * That is the whole page. The previous version carried a tagline, a two-stat block ("48
 * productos / 10 categorías") and a featured strip; none of it told a visitor anything the
 * heading, the catalog link or the categories themselves did not already say, so it is gone and
 * deliberately not replaced.
 *
 * The pieces of behaviour worth naming:
 *
 * - The page has three states, and all three are real: loading while `/data/catalog.json` is in
 *   flight, an error with a retry action when the fetch or the validation fails, and the content
 *   itself. A catalog page that renders an empty grid on failure would look like a store with
 *   nothing to sell.
 * - Copy comes from `LanguageStore.text`, and the document title follows it. The category names
 *   and product names it renders are catalog data and are never translated.
 * - The 3D world behind the page belongs to the shell, not to this page: it is imported
 *   dynamically once and stays mounted across routes, so the hero is complete before three.js is
 *   even requested and coming back to the landing page never re-downloads it.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { CatalogStore } from '../../core/catalog/catalog-store';
import { categoryFallbackImage } from '../../core/catalog/category-visual';
import { LanguageStore } from '../../core/i18n/language-store';
import { CategoryCard } from '../../shared/category-card';
import { RevealOnScroll } from '../../shared/reveal-on-scroll';

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CategoryCard, RevealOnScroll],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly catalog = inject(CatalogStore);
  private readonly i18n = inject(LanguageStore);
  private readonly documentTitle = inject(Title);

  protected readonly text = this.i18n.text;

  protected readonly isLoading = this.catalog.isLoading;
  protected readonly isReady = this.catalog.isReady;
  protected readonly errorMessage = this.catalog.errorMessage;

  /**
   * The categories in browse order, biggest first.
   *
   * The landing strip is the first browse surface a visitor sees, so it uses the same order as
   * the catalog instead of the JSON's authoring order: the categories that actually hold stock
   * lead, and the four single-product ones stop interrupting the grid.
   */
  protected readonly categories = this.catalog.orderedCategories;

  /**
   * A product photograph per category, used only by cards whose category ships no banner.
   * Computed once per catalog change so the fallback scan does not run on every keystroke
   * elsewhere in the page.
   */
  private readonly fallbackImages = computed(() => {
    const images = new Map<string, string | null>();
    const entries = this.catalog.entries();
    for (const category of this.catalog.categories()) {
      images.set(category.id, categoryFallbackImage(entries, category.id));
    }
    return images;
  });

  constructor() {
    effect(() => this.documentTitle.setTitle(this.text().homeDocumentTitle));
  }

  protected retry(): void {
    this.catalog.reload();
  }

  protected countIn(categoryId: string): number {
    return this.catalog.countInCategory(categoryId);
  }

  protected fallbackImageFor(categoryId: string): string | null {
    return this.fallbackImages().get(categoryId) ?? null;
  }
}
