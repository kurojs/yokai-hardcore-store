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
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { applyQuery, type CatalogSort } from '../../core/catalog/catalog-query';
import { CatalogStore } from '../../core/catalog/catalog-store';
import { productCountLabel } from '../../core/ui-text';
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

  /** Category slug from the route; `undefined` on `/catalog`. */
  readonly slug = input<string | undefined>();

  protected readonly isReady = this.catalog.isReady;
  protected readonly errorMessage = this.catalog.errorMessage;
  protected readonly categories = this.catalog.categories;
  protected readonly prices = this.catalog.prices;

  protected readonly category = computed(() => this.catalog.findCategory(this.slug()));

  /** True only once the catalog is loaded and the slug matched nothing. */
  protected readonly isUnknownCategory = computed(
    () => this.isReady() && this.slug() !== undefined && this.category() === null,
  );

  protected readonly text = signal('');
  protected readonly maxPriceUsd = signal<number | null>(null);
  protected readonly sort = signal<CatalogSort>('featured');

  protected readonly results = computed(() =>
    applyQuery(this.catalog.entries(), {
      text: this.text(),
      categoryId: this.category()?.id ?? null,
      maxPriceUsd: this.maxPriceUsd(),
      sort: this.sort(),
    }),
  );

  protected readonly countLabel = computed(() => productCountLabel(this.results().length));

  protected readonly heading = computed(() => {
    const category = this.category();
    if (category !== null) return category.name;
    if (!this.isReady()) return 'Catálogo';
    return this.isUnknownCategory() ? 'Categoría no encontrada' : 'Todos los productos';
  });

  protected readonly lead = computed(() => {
    const category = this.category();
    if (category !== null) return category.description;
    if (this.errorMessage() !== null) return 'No está disponible por ahora.';
    if (!this.isReady()) return 'Cargando el catálogo…';
    return this.isUnknownCategory()
      ? 'Puede que la categoría haya cambiado de nombre o ya no exista.'
      : 'Busca, filtra y ordena todo lo que la tienda tiene para ofrecer.';
  });

  protected clearFilters(): void {
    this.text.set('');
    this.maxPriceUsd.set(null);
    this.sort.set('featured');
  }

  protected retry(): void {
    this.catalog.reload();
  }
}
