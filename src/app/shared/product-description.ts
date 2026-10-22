/**
 * A product description, rendered as a page layout rather than one paragraph.
 *
 * Presentational, per `shared/README.md`: one input, no injected singletons, no routing. All the
 * thinking lives in `core/`: `core/catalog/description.ts` finds the section boundaries and
 * `core/catalog/description-layout.ts` classifies each section. This component only maps those
 * parts to markup.
 *
 * The layout the catalog data actually needs:
 *
 * - a lead paragraph for the introduction;
 * - section headings with a hairline rule (`Características del Alimento`, `Efectos Temporales`);
 * - aligned label/value rows for the short facts (`Cantidad`, `Origen`);
 * - effect rows with the vanilla mob-effect icon next to the verbatim label and its description;
 * - prose blocks, with their own subheading when the block carried a label (`Descripción`).
 *
 * Why it is not just `<p>{{ description }}</p>`: the committed descriptions are single
 * 500–1,430 character paragraphs, and rendering them flat is what makes a product page
 * unreadable. Nothing is rewritten — case, accents and punctuation are the catalog's own.
 *
 * ## The effect icons
 *
 * Icons come from `misode/mcmeta`, a mirrored asset dump of the Java edition, because Minecraft
 * exposes no texture API and deriving a texture name from Spanish text would be a guess. The URL
 * is composed from the texture id `core/` resolves; when the CDN is unreachable the image hides
 * itself and the row keeps its grid, so a missing icon never shifts the text.
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { layoutDescription } from '../core/catalog/description-layout';

/** Base URL of the vanilla effect textures in the `misode/mcmeta` asset mirror. */
const EFFECT_ICON_BASE =
  'https://cdn.jsdelivr.net/gh/misode/mcmeta@assets/assets/minecraft/textures/mob_effect';

@Component({
  selector: 'app-product-description',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="description">
      @for (part of parts(); track $index) {
        @switch (part.kind) {
          @case ('lead') {
            <p class="description__lead">{{ part.text }}</p>
          }
          @case ('heading') {
            <h3 class="description__heading">{{ part.title }}</h3>
          }
          @case ('fact') {
            <p class="description__fact">
              <span class="description__fact-label">{{ part.label }}</span>
              <span class="description__fact-value">{{ part.value }}</span>
            </p>
          }
          @case ('text') {
            @if (part.title; as title) {
              <div class="description__text">
                <h4 class="description__subheading">{{ title }}</h4>
                <p class="description__prose">{{ part.text }}</p>
              </div>
            } @else {
              <p class="description__prose">{{ part.text }}</p>
            }
          }
          @case ('effect') {
            <p class="description__effect">
              @if (part.icon; as icon) {
                <img
                  class="description__effect-icon"
                  [src]="effectIconUrl(icon)"
                  alt=""
                  width="22"
                  height="22"
                  loading="lazy"
                  decoding="async"
                  (error)="hideIcon($event)"
                />
              }
              <span class="description__effect-label">{{ part.label }}</span>
              <span class="description__effect-detail">{{ part.detail }}</span>
            </p>
          }
        }
      }
    </div>
  `,
  styles: `
    .description {
      display: grid;
      gap: var(--space-3);
      max-width: 72ch;
    }

    .description__lead {
      margin: 0;
      font-size: 1.0625rem;
      line-height: 1.65;
      color: var(--color-text);
    }

    .description__heading {
      margin: var(--space-5) 0 0;
      padding-bottom: 0.4rem;
      font-size: var(--text-micro);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }

    .description__subheading {
      margin: var(--space-2) 0 0;
      font-size: var(--text-ui);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: none;
      color: var(--color-text);
      border-bottom: none;
    }

    .description__text {
      display: grid;
      gap: var(--space-2);
    }

    .description__prose {
      margin: 0;
      line-height: 1.75;
      color: var(--color-text);
    }

    .description__fact {
      display: grid;
      grid-template-columns: 9rem minmax(0, 1fr);
      gap: var(--space-3);
      margin: 0;
      line-height: 1.6;
    }

    .description__fact-label {
      color: var(--color-text-muted);
    }

    .description__fact-value {
      color: var(--color-text);
    }

    .description__effect {
      position: relative;
      isolation: isolate;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      column-gap: var(--space-3);
      row-gap: var(--space-1);
      margin: 0;
      padding: var(--space-3);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: var(--glass-bg) padding-box;
      -webkit-backdrop-filter: var(--glass-blur);
      backdrop-filter: var(--glass-blur);
    }

    .description__effect::before {
      position: absolute;
      z-index: -1;
      inset: -1px;
      border: 1px solid transparent;
      border-radius: inherit;
      background: conic-gradient(
        from var(--effect-angle, 0deg),
        transparent 0 22%,
        rgb(177 92 255 / 0.85) 34%,
        rgb(255 65 196 / 0.9) 48%,
        transparent 62% 100%
      ) border-box;
      content: '';
      -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      opacity: 0.78;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: no-preference) {
      .description__effect::before {
        animation: effect-border-spin 8s linear infinite;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .description__effect::before {
        background: linear-gradient(110deg, rgb(177 92 255 / 0.75), rgb(255 65 196 / 0.75)) border-box;
      }
    }

    @keyframes effect-border-spin {
      from {
        --effect-angle: 0deg;
        opacity: 0.68;
      }

      to {
        --effect-angle: 360deg;
        opacity: 0.95;
      }
    }

    .description__effect-icon {
      width: 22px;
      height: 22px;
      grid-row: span 2;
      image-rendering: pixelated;
    }

    .description__effect-label {
      color: var(--color-text);
      font-weight: 600;
      line-height: 1.4;
    }

    .description__effect-detail {
      grid-column: 2;
      color: var(--color-text-muted);
      font-size: var(--text-small);
      line-height: 1.55;
    }

    /* The label column cannot hold 9rem on a phone, and a squeezed value column is worse than a
       stacked row: label above value, still aligned as a pair. */
    @media (max-width: 36rem) {
      .description__fact {
        grid-template-columns: 1fr;
        gap: var(--space-1);
      }
    }
  `,
})
export class ProductDescription {
  /** The catalog description, verbatim. Case is never transformed. */
  readonly description = input.required<string>();

  protected readonly parts = computed(() => layoutDescription(this.description()));

  protected effectIconUrl(id: string): string {
    return `${EFFECT_ICON_BASE}/${id}.png`;
  }

  /**
   * Leaves the image in place but invisible so the effect row keeps its two-column grid.
   *
   * Removing the node would reflow the label into the icon column; logging would spam the
   * console for every product whose artwork the CDN has dropped.
   */
  protected hideIcon(event: Event): void {
    const image = event.target;
    if (image instanceof HTMLImageElement) image.style.visibility = 'hidden';
  }
}
