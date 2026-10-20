/**
 * The catalog slice's container: category browsing, search, price ceiling and sort.
 *
 * The category is the URL, not a control. `/catalog` shows everything and `/catalog/:slug`
 * shows one category, which makes a filtered view shareable and lets the landing page's cards
 * link straight into it. The route parameter arrives as an `input` because `app.config.ts`
 * enables `withComponentInputBinding`, so this class never injects `ActivatedRoute`.
 *
 * One tradeoff is deliberate and visible: the free-text, price and sort controls live in
 * signals owned by this component, so navigating between two category URLs recreates the
 * component and clears them. Keeping them in the URL would mean a router navigation — and a
 * history entry — for every keystroke in the search box.
 *
 * The heading and lead are computed because they depend on state (category, load failure,
 * unknown slug) and on the active language. A category's own name and description are catalog
 * data and are rendered exactly as they arrived.
 */

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { applyQuery, type CatalogSort } from '../../core/catalog/catalog-query';
import { CatalogStore } from '../../core/catalog/catalog-store';
import { LanguageStore } from '../../core/i18n/language-store';
import { ProductCard } from '../../shared/product-card';
import { CatalogFilterBar } from './catalog-filter-bar';

@Component({
  selector: 'app-catalog-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CatalogFilterBar, ProductCard],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss',
})
export class CatalogPage {
  private readonly catalog = inject(CatalogStore);
  private readonly i18n = inject(LanguageStore);
  private readonly documentTitle = inject(Title);

  /** Category slug from the route; `undefined` on `/catalog`. */
  readonly slug = input<string | undefined>();

  protected readonly text = this.i18n.text;

  protected readonly isReady = this.catalog.isReady;
  protected readonly errorMessage = this.catalog.errorMessage;
  protected readonly categories = this.catalog.categories;
  protected readonly prices = this.catalog.prices;

  protected readonly category = computed(() => this.catalog.findCategory(this.slug()));

  /** True only once the catalog is loaded and the slug matched nothing. */
  protected readonly isUnknownCategory = computed(
    () => this.isReady() && this.slug() !== undefined && this.category() === null,
  );

  protected readonly searchText = signal('');
  protected readonly maxPriceUsd = signal<number | null>(null);
  protected readonly sort = signal<CatalogSort>('featured');

  protected readonly results = computed(() =>
    applyQuery(this.catalog.entries(), {
      text: this.searchText(),
      categoryId: this.category()?.id ?? null,
      maxPriceUsd: this.maxPriceUsd(),
      sort: this.sort(),
    }),
  );

  protected readonly countLabel = computed(() =>
    this.text().productCountLabel(this.results().length),
  );

  protected readonly heading = computed(() => {
    const category = this.category();
    if (category !== null) return category.name;
    if (!this.isReady()) return this.text().catalogEyebrow;
    return this.isUnknownCategory()
      ? this.text().catalogUnknownCategoryHeading
      : this.text().catalogAllProducts;
  });

  protected readonly lead = computed(() => {
    const category = this.category();
    if (category !== null) return category.description;
    if (this.errorMessage() !== null) return this.text().catalogLeadUnavailable;
    if (!this.isReady()) return this.text().catalogLeadLoading;
    return this.isUnknownCategory()
      ? this.text().catalogLeadUnknownCategory
      : this.text().catalogLeadAll;
  });

  constructor() {
    effect(() => this.documentTitle.setTitle(this.text().catalogDocumentTitle));
  }

  protected clearFilters(): void {
    this.searchText.set('');
    this.maxPriceUsd.set(null);
    this.sort.set('featured');
  }

  protected retry(): void {
    this.catalog.reload();
  }
}
