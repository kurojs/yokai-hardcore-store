/**
 * One product as a browse row: thumbnail, name with the category inline, a clamped description
 * and a right-aligned price.
 *
 * This is the catalog's row shape, not the landing page's card shape. Keeping them as two
 * presentational components means the browse list can be dense and horizontal while the
 * featured strip stays image-led, without either one growing a mode flag.
 *
 * The row states each fact once. An earlier version repeated the category beside the name and
 * again as a pill, and shipped a "digital delivery" pill that was identical on all 48 products;
 * two thirds of that was noise. The catalog has no other attribute to show, so there is no tag
 * row at all: a tag that every row carries tells a buyer nothing. The remaining pieces are the
 * four things that differ between products — photograph, name, category, description — plus the
 * price, which is the number the eye is actually looking for.
 *
 * Presentational only, per `shared/README.md`: it takes the product and its category name as
 * inputs, renders no link and injects nothing. The catalog slice owns the anchor and the route.
 *
 * Two details mirror `ProductCard` on purpose: the image is `alt=""` because the name is
 * adjacent in the same row, and the name is never case-transformed because the catalog mixes
 * SHOUTING and sentence case as data.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Product } from '../core/catalog/catalog-model';
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
      grid-template-columns: 7.5rem minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-2);
      border-radius: var(--radius-lg);
      transition: background var(--transition);
    }

    /* Hover is a background tint and a small push into the photograph. Nothing lifts and
       nothing glows: a browse list of forty-eight rows should not animate under the pointer. */
    @media (hover: hover) {
      :host(:hover) .product-row {
        background: var(--color-row-hover);
      }

      :host(:hover) .product-row__image {
        transform: scale(1.04);
      }
    }

    /* The thumbnail is the loudest thing in the row, so it gets the space: a square plate of
       surface with the photograph inset by a hairline of it, clipped so the hover push stays
       inside the frame. */
    .product-row__media {
      width: 7.5rem;
      height: 7.5rem;
      overflow: hidden;
      padding: 0.25rem;
      border-radius: var(--radius-lg);
      background: var(--color-surface-raised);
    }

    .product-row__image {
      width: 100%;
      height: 100%;
      border-radius: var(--radius-md);
      object-fit: cover;
      transition: transform 220ms ease;
    }

    .product-row__image--empty {
      background: linear-gradient(135deg, var(--color-surface-raised), var(--color-bg));
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

    /* The row's only category reference: a quiet label on the heading line. */
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

    /* The price is the anchor on the right: the largest type in the row, monospaced and
       tabular so the decimal points line up down the list. Gold, because gold is money. */
    .product-row__price {
      justify-self: end;
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--color-price);
      text-align: right;
      white-space: nowrap;
    }

    /* A reduced-motion reader still gets the tint, which is a colour, but not the zoom. */
    @media (prefers-reduced-motion: reduce) {
      :host(:hover) .product-row__image {
        transform: none;
      }
    }

    @media (max-width: 40rem) {
      .product-row {
        grid-template-columns: 5rem minmax(0, 1fr);
        gap: var(--space-3);
      }

      .product-row__media {
        width: 5rem;
        height: 5rem;
      }

      .product-row__price {
        grid-column: 2;
        justify-self: start;
        font-size: 1.125rem;
        text-align: left;
      }
    }
  `,
})
export class ProductRow {
  readonly product = input.required<Product>();

  /** The category's display name, as text: the row never needs the rest of the category. */
  readonly categoryName = input.required<string>();
}
