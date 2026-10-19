/**
 * The landing page: a hero, then the catalog's categories and a featured spread.
 *
 * It is the slice's only container, and its whole job is to read the shared catalog store and
 * hand plain values to `shared/` cards. The two pieces of behaviour worth naming:
 *
 * - The featured selection is not "the first four products". `selectFeatured` spreads it across
 *   categories, and it is a pure function in its own module so the rule is tested without a
 *   TestBed.
 * - The page has three states, and all three are real: loading while `/data/catalog.json` is in
 *   flight, an error with a retry action when the fetch or the validation fails, and the content
 *   itself. A catalog page that renders an empty grid on failure would look like a store with
 *   nothing to sell.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogStore } from '../../core/catalog/catalog-store';
import { formatUsdPrice } from '../../core/format/price';
import { productCountLabel } from '../../core/ui-text';
import { CategoryCard } from '../../shared/category-card';
import { ProductCard } from '../../shared/product-card';
import { FEATURED_COUNT, selectFeatured } from './featured';

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CategoryCard, ProductCard],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly catalog = inject(CatalogStore);

  protected readonly isLoading = this.catalog.isLoading;
  protected readonly isReady = this.catalog.isReady;
  protected readonly errorMessage = this.catalog.errorMessage;

  protected readonly categories = this.catalog.categories;
  protected readonly featured = computed(() =>
    selectFeatured(this.catalog.entries(), FEATURED_COUNT),
  );
  protected readonly countLabel = computed(() => productCountLabel(this.catalog.entries().length));
  protected readonly categoryCount = computed(() => this.catalog.categories().length);

  /** The cheapest price in the catalog, formatted, or `null` before it has loaded. */
  protected readonly fromPrice = computed(() => {
    const cheapest = this.catalog.prices()[0];
    return cheapest === undefined ? null : formatUsdPrice(cheapest);
  });

  protected retry(): void {
    this.catalog.reload();
  }

  protected countIn(categoryId: string): number {
    return this.catalog.countInCategory(categoryId);
  }
}
