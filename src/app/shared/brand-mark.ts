/**
 * The storefront's brand mark: the enderman head the store ships as its icon.
 *
 * The artwork is almost entirely black, so drawn straight onto the near-black header it would
 * read as a hole with two eyes. It therefore sits inside a small glass tile: the translucent
 * fill and the hairline are what give the silhouette a lit edge, and the violet eyes do the
 * rest. `image-rendering: pixelated` keeps the 16x16-derived sprite crisp instead of smearing
 * it through bilinear filtering.
 *
 * The image is decorative: the link that contains it carries the accessible name, so announcing
 * the mark as well would repeat the brand.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="mark" [style.width.px]="size()" [style.height.px]="size()">
      <img
        class="mark__image"
        src="brand/enderman.png"
        alt=""
        width="24"
        height="24"
        decoding="async"
        aria-hidden="true"
      />
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    /* The tile is sized by the input so the mark can be scaled from the header to the footer
       without changing the artwork's proportions. */
    .mark {
      display: grid;
      flex: none;
      place-items: center;
      box-sizing: border-box;
      overflow: hidden;
      border: 1px solid var(--glass-border);
      border-radius: calc(var(--radius-md) + 1px);
      background: var(--glass-bg-strong);
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06);
    }

    .mark__image {
      display: block;
      width: 84%;
      height: 84%;
      object-fit: contain;
      image-rendering: pixelated;
    }
  `,
})
export class BrandMark {
  /** Rendered width and height of the tile in pixels. The image is inset inside it. */
  readonly size = input(34);
}
