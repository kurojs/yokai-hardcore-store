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

import { CATALOG_SORTS, applyQuery, type CatalogSort } from '../../core/catalog/catalog-query';
import { CatalogStore } from '../../core/catalog/catalog-store';
import { LanguageStore } from '../../core/i18n/language-store';
import { PricePipe } from '../../shared/price.pipe';
import { ProductCard } from '../../shared/product-card';
import { RevealOnScroll } from '../../shared/reveal-on-scroll';
import { CatalogFilterBar } from './catalog-filter-bar';

@Component({
  selector: 'app-catalog-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CatalogFilterBar, ProductCard, RevealOnScroll, PricePipe],
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
  protected readonly categories = this.catalog.orderedCategories;
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

  /**
   * The results split under category headers, in browse order.
   *
   * The entries inside a group are the already-sorted ones, so a non-default sort reorders each
   * group without touching the group sequence: a header that says "the biggest category" must
   * not move because the visitor asked for cheapest first.
   */
  protected readonly groups = computed(() => this.catalog.groupEntries(this.results()));

  /**
   * Grouping applies only to a browse across the whole catalog.
   *
   * A category page already names itself in its heading, so repeating that name as a group
   * header would be one label for one list. A search spans categories, and chopping the hits
   * into sections makes a result set harder to scan, not easier. Both modes fall back to the
   * flat list the visitor asked a query for.
   */
  protected readonly showGroups = computed(
    () => this.category() === null && this.searchText().trim().length === 0,
  );

  /**
   * Whether a card has to name its own category.
   *
   * The grouped browse and a category page both put the category name above the cards, so the
   * label would repeat it on every one of them. A search is the one flat grid whose hits span
   * categories, so that is the only case that needs the label.
   */
  protected readonly labelsCategoryOnCards = computed(() => this.searchText().trim().length > 0);

  protected readonly countLabel = computed(() =>
    this.text().productCountLabel(this.results().length),
  );

  /** Every product in the catalog, for the sidebar's "all categories" count. */
  protected readonly totalCount = computed(() => this.catalog.entries().length);

  /**
   * The sort options, labelled in the active language.
   *
   * Built from the dictionary rather than from a module constant, because the labels are copy:
   * a constant would freeze them in whatever language was current at module load.
   */
  protected readonly sortOptions = computed(() => {
    const text = this.text();
    return [
      { value: 'featured' as const, label: text.sortFeatured },
      { value: 'price-asc' as const, label: text.sortPriceAsc },
      { value: 'price-desc' as const, label: text.sortPriceDesc },
      { value: 'name-asc' as const, label: text.sortNameAsc },
    ];
  });

  /** The `<select>` value is a string, so "no ceiling" has to be spelled as the empty option. */
  protected readonly priceValue = computed(() => {
    const ceiling = this.maxPriceUsd();
    return ceiling === null ? '' : String(ceiling);
  });

  protected readonly heading = computed(() => {
    const category = this.category();
    if (category !== null) return category.name;
    return this.isUnknownCategory()
      ? this.text().catalogUnknownCategoryHeading
      : this.text().catalogAllProducts;
  });

  /**
   * The category's own description, when the page is showing one.
   *
   * There is no page-level lead any more: "search, filter and sort everything the store has to
   * offer" described the controls the visitor was already looking at. A category's description
   * is catalog data and says something the heading does not, so it stays.
   */
  protected readonly lead = computed(() => this.category()?.description ?? null);

  constructor() {
    effect(() => this.documentTitle.setTitle(this.text().catalogDocumentTitle));
  }

  /** How many products belong to `categoryId`, for the sidebar's counts. */
  protected countIn(categoryId: string): number {
    return this.catalog.countInCategory(categoryId);
  }

  protected clearFilters(): void {
    this.searchText.set('');
    this.maxPriceUsd.set(null);
    this.sort.set('featured');
  }

  protected retry(): void {
    this.catalog.reload();
  }

  protected onPrice(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    if (raw === '') {
      this.maxPriceUsd.set(null);
      return;
    }
    const ceiling = Number(raw);
    // A tampered DOM could put anything in the value; an unusable ceiling must not become NaN.
    this.maxPriceUsd.set(Number.isFinite(ceiling) ? ceiling : null);
  }

  protected onSort(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    if (!(CATALOG_SORTS as readonly string[]).includes(raw)) return;
    this.sort.set(raw as CatalogSort);
  }
}
