/**
 * One product as a browse row: square thumbnail, name with the category inline, a clamped
 * description, tag pills and a right-aligned price.
 *
 * This is the catalog's row shape, not the landing page's card shape. Keeping them as two
 * presentational components means the browse list can be dense and horizontal while the
 * featured strip stays image-led, without either one growing a mode flag.
 *
 * Presentational only, per `shared/README.md`: it takes the product, its category name and the
 * active dictionary as inputs, renders no link and injects nothing. The catalog slice owns the
 * anchor and the route.
 *
 * Two details mirror `ProductCard` on purpose: the image is `alt=""` because the name is
 * adjacent in the same row, and the name is never case-transformed because the catalog mixes
 * SHOUTING and sentence case as data.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Product } from '../core/catalog/catalog-model';
import type { UiText } from '../core/i18n/ui-text';
import { PricePipe } from './price.pipe';

@Component({
  selector: 'app-product-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  template: `
    <article class="product-row">
      <div class="product-row__media">
        @if (product().imagePath; as src) {
          <img
            class="product-row__image"
            [src]="src"
            alt=""
            loading="lazy"
            decoding="async"
          />
        } @else {
          <div class="product-row__image product-row__image--empty" aria-hidden="true"></div>
        }
      </div>

      <div class="product-row__body">
        <div class="product-row__heading">
          <h3 class="product-row__name">{{ product().name }}</h3>
          <span class="product-row__category">{{ categoryName() }}</span>
        </div>

        <p class="product-row__description">{{ product().description }}</p>

        <ul class="product-row__tags">
          <li class="product-row__tag">{{ categoryName() }}</li>
          <li class="product-row__tag">{{ text().productTagDigital }}</li>
        </ul>
      </div>

      <p class="product-row__price">{{ product().priceUsd | price }}</p>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }

    .product-row {
      display: grid;
      grid-template-columns: 6rem minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--space-4);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      transition: background var(--transition);
    }

    /* Hover is a background tint on the whole row. Nothing lifts and nothing glows: a browse
       list of forty-eight rows should not animate under the pointer. */
    @media (hover: hover) {
      :host(:hover) .product-row {
        background: var(--color-row-hover);
      }
    }

    .product-row__media {
      width: 6rem;
      height: 6rem;
      overflow: hidden;
      border-radius: var(--radius-sm);
      background: var(--color-surface-raised);
    }

    .product-row__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .product-row__image--empty {
      background: var(--color-surface-raised);
    }

    .product-row__body {
      display: grid;
      gap: 0.3rem;
      min-width: 0;
    }

    .product-row__heading {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-2);
    }

    .product-row__name {
      font-size: 0.9375rem;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .product-row__category {
      font-size: var(--text-small);
      color: var(--color-text-muted);
    }

    .product-row__description {
      display: -webkit-box;
      overflow: hidden;
      font-size: var(--text-small);
      line-height: 1.5;
      color: var(--color-text-muted);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .product-row__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin: 0.125rem 0 0;
      padding: 0;
      list-style: none;
    }

    .product-row__tag {
      padding: 0.125rem var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--color-pill);
      color: var(--color-pill-text);
      font-size: 0.6875rem;
      letter-spacing: 0.01em;
    }

    .product-row__price {
      align-self: center;
      font-size: 1rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--color-text);
      text-align: right;
      white-space: nowrap;
    }

    @media (max-width: 40rem) {
      .product-row {
        grid-template-columns: 4.5rem minmax(0, 1fr);
        gap: var(--space-3);
      }

      .product-row__media {
        width: 4.5rem;
        height: 4.5rem;
      }

      .product-row__price {
        grid-column: 2;
        align-self: start;
        text-align: left;
      }
    }
  `,
})
export class ProductRow {
  readonly product = input.required<Product>();

  /** The category's display name, as text: the row never needs the rest of the category. */
  readonly categoryName = input.required<string>();

  /** The active dictionary, supplied by the catalog page. */
  readonly text = input.required<UiText>();
}
