/**
 * One category as a card: an image and the category's name and product count.
 *
 * Presentational only: the category, its product count and the fallback image arrive as inputs
 * and the card renders no link, so both the landing page and the catalog page can decide what a
 * click means without this component knowing about routing.
 *
 * **Every card shows an image.** Three of the ten categories ship no banner, so a category card
 * resolves its picture through a chain: the category's own banner, then the first product
 * photograph from that category, and only when neither can be shown a voxel-tile placeholder
 * carrying the category name. The chain is not decoration — one banner in the committed data is
 * an HTML error page saved with an image extension, so "the file exists" is not the same as "the
 * browser can draw it". A failed decode moves the card to the next source instead of leaving an
 * empty box.
 *
 * The description paragraph is gone: it was four lines of Spanish marketing copy clamped to two,
 * identical in kind to the catalog's own copy, and it competed with the product photography for
 * the card's height. The name and the count are what a buyer chooses between.
 */

import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import type { Category } from '../core/catalog/catalog-model';
import type { UiText } from '../core/i18n/ui-text';

@Component({
  selector: 'app-category-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="category-card glass">
      <div class="category-card__media">
        @if (image(); as src) {
          <img
            class="category-card__image"
            [src]="src"
            alt=""
            loading="lazy"
            decoding="async"
            (error)="onImageError(src)"
          />
        } @else {
          <div class="category-card__placeholder">
            <span class="category-card__placeholder-name" aria-hidden="true">{{
              category().name
            }}</span>
          </div>
        }
      </div>

      <div class="category-card__body">
        <h3 class="category-card__name">{{ category().name }}</h3>
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
    .category-card::before {
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

    .category-card > * {
      position: relative;
      z-index: 1;
    }

    /* The media box never shrinks. It is the card's largest element, and a flex item defaults to
       shrinking: without this, a category with long copy visibly squashed its own picture and
       the strip read as a row of cards with different image heights. */
    .category-card__media {
      position: relative;
      flex: none;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      background: var(--color-surface-raised);
    }

    .category-card__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform var(--transition-slow);
    }

    /* The last resort: a neutral voxel plate with the category's name on it, so a card whose
       image cannot be drawn still says which category it is instead of showing an empty box. */
    .category-card__placeholder {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      padding: var(--space-3);
      background-image: var(--texture-voxel);
      background-size: 128px 128px;
    }

    .category-card__placeholder-name {
      font-size: var(--text-small);
      font-weight: 600;
      color: var(--color-text-muted);
      text-align: center;
      overflow-wrap: anywhere;
    }

    @media (hover: hover) {
      :host(:hover) .category-card {
        transform: translateY(-4px);
        border-color: var(--glass-border);
        box-shadow: var(--shadow-card);
      }

      :host(:hover) .category-card__image {
        transform: scale(1.05);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host(:hover) .category-card {
        transform: none;
        box-shadow: none;
      }

      :host(:hover) .category-card__image {
        transform: none;
      }
    }

    .category-card__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-3) var(--space-4) var(--space-4);
    }

    .category-card__name {
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .category-card__count {
      margin-top: auto;
      font-size: var(--text-small);
      font-variant-numeric: tabular-nums;
      color: var(--color-text-muted);
    }
  `,
})
export class CategoryCard {
  /** The active dictionary, supplied by the page that renders the card. */
  readonly text = input.required<UiText>();

  readonly category = input.required<Category>();
  readonly productCount = input.required<number>();

  /**
   * A product image from this category, used when the category has no banner of its own.
   *
   * `null` is a supported state: the card then shows the voxel placeholder with the name.
   */
  readonly fallbackImage = input<string | null>(null);

  /**
   * Sources the browser has already failed to decode.
   *
   * A set of URLs rather than a boolean, because a failure has to move the card *along* the
   * chain (banner → product photograph → placeholder) and must reset by itself when the card is
   * reused for a different category.
   */
  private readonly failedSources = signal<ReadonlySet<string>>(new Set());

  protected readonly image = computed(() => {
    const failed = this.failedSources();
    const banner = this.category().bannerImage;
    if (banner !== null && banner !== '' && !failed.has(banner)) return banner;

    const fallback = this.fallbackImage();
    if (fallback !== null && fallback !== '' && !failed.has(fallback)) return fallback;

    return null;
  });

  protected readonly countLabel = computed(() =>
    this.text().productCountLabel(this.productCount()),
  );

  protected onImageError(source: string): void {
    this.failedSources.update((current) => new Set(current).add(source));
  }
}
