/**
 * One category as a card: banner (or a deterministic placeholder), name, blurb and count.
 *
 * Presentational only: the category and its product count arrive as inputs and the card
 * renders no link, so both the landing page and the catalog page can decide what a click
 * means without this component knowing about routing.
 *
 * Three of the ten categories have no banner image, so the placeholder is a normal state
 * rather than an error path. It shows the category's monogram over one of six gradient
 * treatments chosen by hashing the slug — `categoryPlaceholderVariant` explains why stable
 * variety was worth a hash. The variant class is applied by interpolation on the `class`
 * attribute, which keeps the colours themselves in `styles.scss` instead of binding a style
 * string Angular would sanitise.
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Category } from '../core/catalog/catalog-model';
import { categoryMonogram, categoryPlaceholderVariant } from '../core/catalog/category-visual';
import { productCountLabel } from '../core/ui-text';

@Component({
  selector: 'app-category-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="category-card">
      <div class="category-card__media">
        @if (category().bannerImage; as src) {
          <img class="category-card__image" [src]="src" alt="" loading="lazy" decoding="async" />
        } @else {
          <div
            class="category-card__placeholder category-visual--v{{ variant() }}"
            aria-hidden="true"
          >
            <span class="category-card__monogram">{{ monogram() }}</span>
          </div>
        }
      </div>

      <div class="category-card__body">
        <h3 class="category-card__name">{{ category().name }}</h3>
        <p class="category-card__description">{{ category().description }}</p>
        <p class="category-card__count">{{ countLabel() }}</p>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .category-card {
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
      :host(:hover) .category-card {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-card);
        transform: translateY(-2px);
      }
    }

    .category-card__media {
      aspect-ratio: 16 / 9;
      background: var(--color-surface-raised);
    }

    .category-card__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .category-card__placeholder {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
    }

    .category-card__monogram {
      font-family: var(--font-mono);
      font-size: clamp(2rem, 7vw, 3rem);
      font-weight: 700;
      color: inherit;
    }

    .category-card__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-4);
    }

    .category-card__name {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .category-card__description {
      display: -webkit-box;
      overflow: hidden;
      font-size: 0.875rem;
      color: var(--color-text-muted);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;
    }

    .category-card__count {
      margin-top: auto;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--color-accent);
    }
  `,
})
export class CategoryCard {
  readonly category = input.required<Category>();
  readonly productCount = input.required<number>();

  protected readonly monogram = computed(() => categoryMonogram(this.category().name));
  protected readonly variant = computed(() => categoryPlaceholderVariant(this.category().slug));
  protected readonly countLabel = computed(() => productCountLabel(this.productCount()));
}
