/**
 * Reveals a group of cards once, when the group first enters the viewport.
 *
 * The directive is applied to the container (a `.card-grid`), never to the cards. One
 * `IntersectionObserver` per section is what turns "animate the cards" into a staggered entrance:
 * the container gets `is-revealed`, and the CSS in `styles.scss` animates its direct children
 * with a delay keyed on the `--reveal-index` each child carries.
 *
 * Three decisions are deliberate:
 *
 * - **Additive, not pre-hidden.** The cards are visible by default. The animation is only a
 *   keyframe that runs *after* the class arrives, so an environment without
 *   `IntersectionObserver`, a no-JavaScript render or a failed observer leaves a fully readable
 *   page instead of a blank grid.
 * - **Reduced motion is a real branch.** When the OS asks for reduced motion the directive adds
 *   nothing at all; the CSS media query is the second guard, not the only one. That makes the
 *   branch testable without a browser.
 * - **Observe once.** The observer disconnects itself after the first intersection; a section
 *   that scrolls out and back does not replay its entrance.
 */

import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/** The class the CSS animates from. Exported so the spec does not duplicate the string. */
export const REVEALED_CLASS = 'is-revealed';

@Directive({ selector: '[appRevealOnScroll]' })
export class RevealOnScroll implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    if (this.prefersReducedMotion()) return;

    const element = this.host.nativeElement;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        element.classList.add(REVEALED_CLASS);
        this.observer?.disconnect();
        this.observer = null;
      },
      // A tenth of the viewport is the margin a reader crosses before the section is worth
      // animating; 15% of the section has to be on screen, which keeps a one-card row from
      // firing while it is still a sliver at the bottom edge.
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );
    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
