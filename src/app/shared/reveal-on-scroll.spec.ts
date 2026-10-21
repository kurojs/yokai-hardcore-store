/**
 * Specs for the reveal directive.
 *
 * The animation itself is CSS, but the three branches that decide whether it runs are logic and
 * are pinned here: reduced motion (no observer, no class), no `IntersectionObserver` (content
 * stays visible), and the ordinary path (one observer, class added once, disconnected).
 */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { REVEALED_CLASS, RevealOnScroll } from './reveal-on-scroll';

@Component({
  imports: [RevealOnScroll],
  template: `
    <ul class="card-grid" appRevealOnScroll>
      <li>one</li>
      <li>two</li>
    </ul>
  `,
})
class RevealHost {}

type ObserverCallback = (entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[]) => void;

/** A minimal stand-in that lets a test decide when the section "enters" the viewport. */
class FakeObserver implements IntersectionObserver {
  static last: FakeObserver | null = null;

  readonly root = null;
  readonly rootMargin = '';
  readonly scrollMargin = '';
  readonly thresholds = [];
  observed: Element[] = [];
  disconnected = false;

  constructor(readonly callback: ObserverCallback) {
    FakeObserver.last = this;
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(): void {}

  disconnect(): void {
    this.disconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  enter(): void {
    this.callback([{ isIntersecting: true }]);
  }
}

async function render(): Promise<{ fixture: ComponentFixture<RevealHost>; host: HTMLElement }> {
  const fixture = TestBed.createComponent(RevealHost);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('RevealOnScroll', () => {
  beforeEach(async () => {
    FakeObserver.last = null;
    await TestBed.configureTestingModule({ imports: [RevealHost] }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('observes the container once, not each card', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);

    const { host } = await render();

    expect(FakeObserver.last?.observed).toHaveLength(1);
    expect(FakeObserver.last?.observed[0]).toBe(host.querySelector('.card-grid'));
  });

  it('reveals the group on the first intersection and stops observing', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);

    const { host } = await render();
    const grid = host.querySelector('.card-grid')!;

    expect(grid.classList.contains(REVEALED_CLASS)).toBe(false);
    FakeObserver.last?.enter();

    expect(grid.classList.contains(REVEALED_CLASS)).toBe(true);
    expect(FakeObserver.last?.disconnected).toBe(true);
  });

  it('ignores an observation that is not intersecting', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);

    const { host } = await render();
    FakeObserver.last?.callback([{ isIntersecting: false }]);

    expect(host.querySelector('.card-grid')?.classList.contains(REVEALED_CLASS)).toBe(false);
  });

  it('adds nothing when the visitor asked for reduced motion', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    // jsdom implements neither `matchMedia` nor the media query, so the branch is set here
    // rather than simulated: the directive reads `.matches` and nothing else.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));

    const { host } = await render();

    expect(FakeObserver.last).toBeNull();
    // The cards never get a hidden state: the initial state is "visible", so nothing is lost.
    expect(host.querySelector('.card-grid')?.classList.contains(REVEALED_CLASS)).toBe(false);
    expect(host.querySelectorAll('li')).toHaveLength(2);
  });

  it('stays visible when the environment has no IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const { host } = await render();

    expect(host.querySelector('.card-grid')?.classList.contains(REVEALED_CLASS)).toBe(false);
    expect(host.querySelectorAll('li')).toHaveLength(2);
  });
});
