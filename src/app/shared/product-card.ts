/**
 * One product as a card: image, category, name, blurb and price.
 *
 * Presentational only, per `shared/README.md`: it takes the product and its category name as
 * inputs, renders no link and injects nothing. The slice that owns the route decides where a
 * card leads, which is what keeps this component reusable by the landing page's featured
 * strip and by the catalog grid without either of them importing the router through it.
 *
 * Three details are deliberate:
 *
 * - The image is `alt=""`. The name sits directly beside it in the same card, so a filled-alt
 *   image would make a screen reader announce the product twice, and a decorative empty alt is
 *   the correct answer for that, not a missing one.
 * - The name is never case-transformed. The catalog mixes `ALGODONES`-style shouting with
 *   sentence case on purpose, and CSS `text-transform` would erase the distinction the data
 *   chose to make.
 * - A missing image renders a photograph-shaped neutral block rather than a broken `<img>` or
 *   a CDN fallback. `imagePath` is present for all 48 products today, but `null` is a state the
 *   model allows, and the brief forbids reaching for the remote image.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Product } from '../core/catalog/catalog-model';
import { PricePipe } from './price.pipe';

@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  template: `
    <article class="product-card">
      <div class="product-card__media">
        @if (product().imagePath; as src) {
          <img class="product-card__image" [src]="src" alt="" loading="lazy" decoding="async" />
        } @else {
          <div class="product-card__image product-card__image--empty" aria-hidden="true"></div>
        }
      </div>

      <div class="product-card__body">
        <p class="product-card__category">{{ categoryName() }}</p>
        <h3 class="product-card__name">{{ product().name }}</h3>
        <p class="product-card__description">{{ product().description }}</p>
        <p class="product-card__price">{{ product().priceUsd | price }}</p>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .product-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition:
        border-color var(--transition),
        box-shadow var(--transition),
        transform var(--transition);
    }

    /* Guarded by the hover media feature: on a touch screen a tap would otherwise leave the
       card raised until something else is tapped. */
    @media (hover: hover) {
      :host(:hover) .product-card {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-card);
        transform: translateY(-2px);
      }
    }

    .product-card__media {
      aspect-ratio: 4 / 3;
      background: var(--color-surface-raised);
    }

    .product-card__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .product-card__image--empty {
      background: linear-gradient(135deg, var(--color-surface-raised), var(--color-bg));
    }

    .product-card__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-4);
    }

    .product-card__category {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--color-accent);
    }

    .product-card__name {
      font-size: 1rem;
      font-weight: 600;
    }

    .product-card__description {
      display: -webkit-box;
      overflow: hidden;
      font-size: 0.875rem;
      color: var(--color-text-muted);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .product-card__price {
      margin-top: auto;
      font-family: var(--font-mono);
      font-size: 1.0625rem;
      color: var(--color-text);
    }
  `,
})
export class ProductCard {
  readonly product = input.required<Product>();

  /** The category's display name, as text: the card never needs the rest of the category. */
  readonly categoryName = input.required<string>();
}
