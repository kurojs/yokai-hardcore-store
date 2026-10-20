/**
 * One category as a card: banner (or a real product image from that category), name, blurb and
 * count.
 *
 * Presentational only: the category, its product count and the fallback image arrive as inputs
 * and the card renders no link, so both the landing page and the catalog page can decide what a
 * click means without this component knowing about routing.
 *
 * Three of the ten categories have no banner image, so the fallback is a normal state rather
 * than an error path. It shows the first product photograph from that category under a dark
 * overlay, and only if the category has no image at all does it use a plain token surface with
 * the category name. The previous monogram-on-gradient treatment is gone: it read as a
 * placeholder, not as merchandise.
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Category } from '../core/catalog/catalog-model';
import type { UiText } from '../core/i18n/ui-text';

@Component({
  selector: 'app-category-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="category-card">
      <div class="category-card__media">
        @if (category().bannerImage; as src) {
          <img class="category-card__image" [src]="src" alt="" loading="lazy" decoding="async" />
        } @else if (fallbackImage(); as src) {
          <div class="category-card__fallback">
            <img class="category-card__image" [src]="src" alt="" loading="lazy" decoding="async" />
            <span class="category-card__overlay" aria-hidden="true">{{ category().name }}</span>
          </div>
        } @else {
          <div class="category-card__fallback category-card__fallback--surface" aria-hidden="true">
            <span class="category-card__overlay">{{ category().name }}</span>
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
      transition: border-color var(--transition);
    }

    @media (hover: hover) {
      :host(:hover) .category-card {
        border-color: var(--color-border-strong);
      }
    }

    .category-card__media {
      position: relative;
      aspect-ratio: 16 / 9;
      background: var(--color-surface-raised);
    }

    .category-card__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .category-card__fallback {
      position: relative;
      width: 100%;
      height: 100%;
    }

    /* The overlay is what keeps the name legible over an arbitrary product photograph. It uses
       the page colour rather than black, so the scrim belongs to the same palette. */
    .category-card__fallback::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        transparent 35%,
        color-mix(in srgb, var(--color-bg) 82%, transparent) 100%
      );
    }

    .category-card__fallback--surface {
      background: var(--color-surface-raised);
    }

    .category-card__overlay {
      position: absolute;
      right: var(--space-3);
      bottom: var(--space-2);
      left: var(--space-3);
      z-index: 1;
      font-size: var(--text-small);
      font-weight: 600;
      color: var(--color-text);
      overflow-wrap: anywhere;
    }

    .category-card__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.3rem;
      padding: var(--space-3);
    }

    .category-card__name {
      font-size: 0.9375rem;
      font-weight: 600;
    }

    .category-card__description {
      display: -webkit-box;
      overflow: hidden;
      font-size: var(--text-small);
      color: var(--color-text-muted);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .category-card__count {
      margin-top: auto;
      padding-top: var(--space-1);
      font-size: var(--text-micro);
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
   * `null` is a supported state: the card then shows a token surface with the category name.
   */
  readonly fallbackImage = input<string | null>(null);

  protected readonly countLabel = computed(() =>
    this.text().productCountLabel(this.productCount()),
  );
}
