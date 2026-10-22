/**
 * One product as a card: image, optional category, name, blurb and price.
 *
 * Presentational only, per `shared/README.md`: it takes the product and its category name as
 * inputs, renders no link and injects nothing. The slice that owns the route decides where a
 * card leads, which is what keeps this component reusable by the catalog's grids and by the
 * product page's related strip without either of them importing the router through it.
 *
 * Four details are deliberate:
 *
 * - The image is `alt=""`. The name sits directly beside it in the same card, so a filled-alt
 *   image would make a screen reader announce the product twice, and a decorative empty alt is
 *   the correct answer for that, not a missing one.
 * - The name is never case-transformed. The catalog mixes `ALGODONES`-style shouting with
 *   sentence case on purpose, and CSS `text-transform` would erase the distinction the data
 *   chose to make.
 * - A missing image renders a photograph-shaped neutral block rather than a broken `<img>` or
 *   a CDN fallback.
 * - The category label is **optional**. Under a catalog group header it repeated the header on
 *   every card in the section, so the caller that already names the category does not pass it;
 *   a flat search result, where the hits span categories, does.
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Product } from '../core/catalog/catalog-model';
import { PricePipe } from './price.pipe';

@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  template: `
    <article class="product-card glass">
      <div class="product-card__media">
        @if (product().imagePath; as src) {
          <img class="product-card__image" [src]="src" alt="" loading="lazy" decoding="async" />
        } @else {
          <div class="product-card__image product-card__image--empty" aria-hidden="true"></div>
        }
      </div>

      <div class="product-card__body">
        @if (categoryLabel(); as label) {
          <p class="product-card__category">{{ label }}</p>
        }
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
      position: relative;
      isolation: isolate;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      border-radius: var(--radius-md);
      background: transparent;
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      transition:
        transform var(--transition-slow),
        border-color var(--transition-slow),
        box-shadow var(--transition-slow);
    }

    /* Keep the backdrop filter on a separate inner glass layer, away from the card surface that
       is translated on hover. The card and its contents keep their existing lift and image zoom. */
    .product-card::before {
      position: absolute;
      z-index: 0;
      inset: 1px;
      border-radius: calc(var(--radius-md) - 1px);
      background: rgb(0 0 0 / 0.42);
      -webkit-backdrop-filter: var(--glass-blur);
      backdrop-filter: var(--glass-blur);
      content: '';
      pointer-events: none;
    }

    .product-card > * {
      position: relative;
      z-index: 1;
    }

    /* The photograph keeps its 4:3 box whatever the copy does; a flex item would otherwise shrink
       it and the grid would show cards with different image heights. */
    .product-card__media {
      flex: none;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: var(--color-surface-raised);
    }

    .product-card__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform var(--transition-slow);
    }

    .product-card__image--empty {
      background: linear-gradient(135deg, var(--color-surface-raised), var(--color-bg));
    }

    /* The hover state is the shop's one physical gesture: the card lifts 4px, the border comes up
       to the glass hairline, the photograph pushes in behind its clipped box and a soft shadow
       appears underneath. Guarded by the hover media query so a touch screen does not latch it. */
    @media (hover: hover) {
      :host(:hover) .product-card {
        transform: translateY(-4px);
        border-color: var(--glass-border);
        box-shadow: var(--shadow-card);
      }

      :host(:hover) .product-card__image {
        transform: scale(1.05);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host(:hover) .product-card {
        transform: none;
        box-shadow: none;
      }

      :host(:hover) .product-card__image {
        transform: none;
      }
    }

    .product-card__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-4);
    }

    .product-card__category {
      font-size: var(--text-micro);
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .product-card__name {
      font-size: 1.0625rem;
      font-weight: 600;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    .product-card__description {
      display: -webkit-box;
      overflow: hidden;
      font-size: var(--text-small);
      color: var(--color-text-muted);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    /* Green, tabular, and the last thing in the card: the number the eye scans the grid for. */
    .product-card__price {
      margin-top: auto;
      padding-top: var(--space-1);
      font-size: 1.0625rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--color-price);
    }
  `,
})
export class ProductCard {
  readonly product = input.required<Product>();

  /**
   * The category's display name, as text.
   *
   * Optional: a card already grouped under its category's header, or rendered in that
   * category's own list, would only repeat it.
   */
  readonly categoryName = input<string | null>(null);

  protected readonly categoryLabel = computed(() => {
    const name = this.categoryName();
    return name === null || name.trim().length === 0 ? null : name;
  });
}
