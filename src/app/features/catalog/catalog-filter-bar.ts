/**
 * The catalog's search toolbar.
 *
 * Presentational: it receives the current text and the active dictionary and reports what the
 * visitor types. Category, price and sort live in the sidebar, because the category is part of
 * the URL (`/catalog/:slug`) and the other two are browse filters, not a search action.
 *
 * The input is a plain DOM event rather than `ngModel`: `@angular/forms` is not otherwise used
 * by the storefront, and one binding does not justify pulling a forms module into the bundle.
 * The id is static because exactly one catalog search is on screen at a time, and the `<label>`
 * `for` attribute is what makes the field keyboard- and screen-reader-friendly.
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { UiText } from '../../core/i18n/ui-text';

@Component({
  selector: 'app-catalog-filter-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search" role="search" [attr.aria-label]="text().filtersLabel">
      <label class="search__label" for="catalog-search">{{ text().searchLabel }}</label>
      <input
        id="catalog-search"
        class="search__input"
        type="search"
        autocomplete="off"
        [attr.placeholder]="text().searchPlaceholder"
        [value]="searchText()"
        (input)="onText($event)"
      />
    </div>
  `,
  styles: `
    .search {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }

    .search__label {
      font-size: var(--text-small);
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    /* A definite width, not min(24rem, 100%): inside a shrink-to-fit flex row the percentage
       resolved against an indefinite parent and the field fell back to its default width, which
       clipped the placeholder mid-word. */
    .search__input {
      flex: 0 1 24rem;
      width: 24rem;
      max-width: 100%;
      min-width: 0;
      padding: 0.5rem var(--space-3);
      border: 1px solid var(--color-border-control);
      border-radius: var(--radius-sm);
      background: var(--glass-bg);
      -webkit-backdrop-filter: var(--glass-blur);
      backdrop-filter: var(--glass-blur);
      color: var(--color-text);
      font: inherit;
      font-size: var(--text-ui);
      transition:
        border-color var(--transition),
        background var(--transition);
    }

    .search__input:hover {
      border-color: var(--color-text-muted);
      background: var(--glass-bg-strong);
    }

    .search__input::placeholder {
      color: var(--color-text-muted);
    }

    @media (max-width: 40rem) {
      .search {
        flex-wrap: wrap;
      }

      .search__input {
        width: 100%;
      }
    }
  `,
})
export class CatalogFilterBar {
  /** The active dictionary, supplied by the catalog page. */
  readonly text = input.required<UiText>();

  readonly searchText = input.required<string>();

  readonly searchTextChange = output<string>();

  protected onText(event: Event): void {
    this.searchTextChange.emit((event.target as HTMLInputElement).value);
  }
}
