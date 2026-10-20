/**
 * The storefront's brand mark: a horned oni mask.
 *
 * It is drawn as two filled paths on a 64x64 grid — the mask silhouette with the eyes and the
 * fanged mouth punched out through the even-odd rule, plus the two horns. There is no plate,
 * no gradient and no text, which is what lets it work at the 16px favicon size and still read
 * as a deliberate mark beside the wordmark.
 *
 * The fill is `currentColor`, so the header's accent token and the favicon's own colour are
 * the same drawing. The SVG is decorative: the link that contains it carries the accessible
 * name, so announcing the mark as well would repeat the brand.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="mark"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill-rule="evenodd"
        d="M18 10H46L54 18V38L46 52L38 58H26L18 52L10 38V18Z
           M18 28L29 31L18 34Z
           M46 28L35 31L46 34Z
           M24 44H40L36 51H28Z
           M28 44L30 49L32 44Z
           M33 44L35 49L37 44Z"
      />
      <path d="M17 13L9 2L27 9Z" />
      <path d="M47 13L55 2L37 9Z" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    .mark {
      display: block;
    }
  `,
})
export class BrandMark {
  /** Rendered width and height in pixels. The viewBox keeps the drawing proportional. */
  readonly size = input(28);
}
