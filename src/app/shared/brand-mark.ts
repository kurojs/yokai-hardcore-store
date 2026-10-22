/**
 * The storefront's brand mark: the enderman head the store ships as its icon.
 *
 * The artwork sits **free**, with no tile, frame or background behind it. A boxed mark reads as
 * an app icon borrowed from a launcher; the face alone reads as the server's own symbol, and the
 * two violet eyes are what identify it at a glance.
 *
 * The one treatment it keeps is a drop shadow. The face is almost entirely black, so on a
 * near-black header the silhouette would dissolve and leave two floating eyes. A soft shadow
 * traces the head without drawing a container around it.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      class="mark"
      src="brand/enderman.png"
      alt=""
      [style.width.px]="size()"
      [style.height.px]="size()"
      decoding="async"
      aria-hidden="true"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    .mark {
      display: block;
      object-fit: contain;
      image-rendering: pixelated;
      /* A shadow, not a border: it gives the black silhouette an edge without enclosing it. */
      filter: drop-shadow(0 0 1px rgb(255 255 255 / 0.35))
        drop-shadow(0 4px 10px rgb(0 0 0 / 0.55));
    }

    /* A slow bob, so the mark belongs to the same living page as the cards. Two pixels: enough
       to notice out of the corner of the eye, never enough to pull the eye away from the name. */
    @media (prefers-reduced-motion: no-preference) {
      .mark {
        animation: mark-bob 5.5s ease-in-out infinite;
      }
    }

    @keyframes mark-bob {
      0%,
      100% {
        transform: translateY(0);
      }

      50% {
        transform: translateY(-2px);
      }
    }
  `,
})
export class BrandMark {
  /** Rendered width and height in pixels. The artwork is square. */
  readonly size = input(40);
}
