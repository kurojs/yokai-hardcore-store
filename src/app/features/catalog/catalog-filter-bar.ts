/**
 * The catalog's filter bar: free text, price ceiling and sort order.
 *
 * Presentational, like the cards: it receives values and the active dictionary as inputs and
 * reports the user's intent as outputs. It deliberately does not own a category control,
 * because the category is part of the URL (`/catalog/:slug`) and choosing one is a navigation,
 * not a filter — that keeps a filtered catalog view shareable and bookmarkable.
 *
 * The controls are plain DOM events rather than `ngModel`: `@angular/forms` is not otherwise used
 * by the storefront, and three bindings do not justify pulling a forms module into the bundle.
 * Their `id`s are static because exactly one filter bar is on screen at a time, and the `<label>`
 * `for` attributes are what make the selects keyboard- and screen-reader-friendly.
 */

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CATALOG_SORTS, type CatalogSort } from '../../core/catalog/catalog-query';
import type { UiText } from '../../core/i18n/ui-text';
import { PricePipe } from '../../shared/price.pipe';

@Component({
  selector: 'app-catalog-filter-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  template: `
    <div class="filters" role="search" [attr.aria-label]="text().filtersLabel">
      <div class="filters__field filters__field--grow">
        <label class="filters__label" for="catalog-search">{{ text().searchLabel }}</label>
        <input
          id="catalog-search"
          class="filters__control"
          type="search"
          autocomplete="off"
          [attr.placeholder]="text().searchPlaceholder"
          [value]="searchText()"
          (input)="onText($event)"
        />
      </div>

      <div class="filters__field">
        <label class="filters__label" for="catalog-price">{{ text().priceFilterLabel }}</label>
        <select
          id="catalog-price"
          class="filters__control"
          [value]="priceValue()"
          (change)="onPrice($event)"
        >
          <option value="">{{ text().allPricesLabel }}</option>
          @for (price of prices(); track price) {
            <option [value]="price">{{ text().upToPrice(price | price) }}</option>
          }
        </select>
      </div>

      <div class="filters__field">
        <label class="filters__label" for="catalog-sort">{{ text().sortLabel }}</label>
        <select
          id="catalog-sort"
          class="filters__control"
          [value]="sort()"
          (change)="onSort($event)"
        >
          @for (option of sortOptions(); track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>
    </div>
  `,
  styles: `
    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-3);
      padding: var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .filters__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 10rem;
    }

    .filters__field--grow {
      flex: 1 1 18rem;
    }

    .filters__label {
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      color: var(--color-text-muted);
    }

    .filters__control {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      color: var(--color-text);
      font: inherit;
    }
  `,
})
export class CatalogFilterBar {
  /** The active dictionary, supplied by the catalog page. */
  readonly text = input.required<UiText>();

  readonly searchText = input.required<string>();
  readonly maxPriceUsd = input.required<number | null>();
  readonly sort = input.required<CatalogSort>();
  /** The distinct prices present in the catalog, ascending. */
  readonly prices = input.required<readonly number[]>();

  readonly searchTextChange = output<string>();
  readonly maxPriceChange = output<number | null>();
  readonly sortChange = output<CatalogSort>();

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

  protected onText(event: Event): void {
    this.searchTextChange.emit((event.target as HTMLInputElement).value);
  }

  protected onPrice(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    if (raw === '') {
      this.maxPriceChange.emit(null);
      return;
    }
    const ceiling = Number(raw);
    // A tampered DOM could put anything in the value; an unusable ceiling must not become NaN.
    this.maxPriceChange.emit(Number.isFinite(ceiling) ? ceiling : null);
  }

  protected onSort(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    if (!isCatalogSort(raw)) return;
    this.sortChange.emit(raw);
  }
}

function isCatalogSort(value: string): value is CatalogSort {
  return (CATALOG_SORTS as readonly string[]).includes(value);
}
