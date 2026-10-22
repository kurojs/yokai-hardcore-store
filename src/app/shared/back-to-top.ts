/**
 * The floating "back to top" button.
 *
 * It appears only near the bottom of a page that is actually long, which is the one moment a
 * visitor has scrolled far enough from the header that a one-click way back is useful. On a short
 * page it never renders, so the checkout and the cart do not grow a button that does nothing.
 *
 * The button is a real `<button>`, not a link to `#`: the page's own scroll container is the
 * document, and `window.scrollTo` is what the browser's own scroll restoration respects. Smooth
 * scrolling is skipped when the visitor asked for reduced motion.
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import { LanguageStore } from '../core/i18n/language-store';

/** How close to the end of the document counts as "at the bottom". */
const BOTTOM_THRESHOLD_PX = 320;

/** A page shorter than this many viewports never shows the button. */
const MINIMUM_VIEWPORTS = 1.5;

@Component({
  selector: 'app-back-to-top',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <button class="back-to-top" type="button" (click)="scrollToTop()">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 19V5" />
          <path d="m5.5 11.5 6.5-6.5 6.5 6.5" />
        </svg>
        <span class="visually-hidden">{{ text().backToTopLabel }}</span>
      </button>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .back-to-top {
      position: fixed;
      right: var(--space-5);
      bottom: var(--space-5);
      z-index: 30;
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      padding: 0;
      border: 1px solid var(--color-accent-hover);
      border-radius: var(--radius-md);
      background: var(--color-accent);
      color: var(--color-on-accent);
      cursor: pointer;
      box-shadow:
        var(--edge-bevel-strong),
        0 18px 36px -18px rgb(0 0 0 / 0.9);
      transition:
        background var(--transition),
        transform var(--transition);
      animation: back-to-top-in 220ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
    }

    .back-to-top:hover {
      background: var(--color-accent-hover);
      transform: translateY(-2px);
    }

    .back-to-top:active {
      transform: translateY(0);
    }

    @keyframes back-to-top-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.9);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 30rem) {
      .back-to-top {
        right: var(--space-3);
        bottom: var(--space-3);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .back-to-top:hover {
        transform: none;
      }
    }
  `,
})
export class BackToTop {
  private readonly language = inject(LanguageStore);
  protected readonly text = this.language.text;

  protected readonly visible = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;

    this.measure();
    window.addEventListener('scroll', this.measure, { passive: true });
    window.addEventListener('resize', this.measure, { passive: true });

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('scroll', this.measure);
      window.removeEventListener('resize', this.measure);
    });
  }

  protected scrollToTop(): void {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  /** Reads the document geometry and flips the button on or off. */
  private readonly measure = (): void => {
    const root = document.documentElement;
    const viewport = window.innerHeight;
    const page = Math.max(root.scrollHeight, document.body?.scrollHeight ?? 0);
    const scrolled = window.scrollY;

    const longEnough = page > viewport * MINIMUM_VIEWPORTS;
    const nearBottom = page - (scrolled + viewport) <= BOTTOM_THRESHOLD_PX;

    this.visible.set(longEnough && nearBottom);
  };
}
