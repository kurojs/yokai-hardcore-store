/**
 * The floating "back to top" button, judged by the two facts it actually promises: it appears
 * only when the visitor is close to the end of a long page, and clicking it returns to the top.
 *
 * jsdom has no layout and no scroll container, so the geometry is supplied explicitly. That is
 * not a mock of the component's own logic: `scrollHeight`, `innerHeight` and `scrollY` are the
 * three numbers the component reads, and the test states them the way a browser would.
 */

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { BackToTop } from './back-to-top';

function setGeometry(options: { page: number; viewport: number; scrolled: number }): void {
  const root = document.documentElement;
  Object.defineProperty(root, 'scrollHeight', {
    configurable: true,
    get: () => options.page,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    get: () => options.viewport,
  });
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => options.scrolled,
  });
}

function button(fixture: ComponentFixture<BackToTop>): HTMLButtonElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.back-to-top');
}

async function render(): Promise<ComponentFixture<BackToTop>> {
  const fixture = TestBed.createComponent(BackToTop);
  await fixture.whenStable();
  return fixture;
}

describe('BackToTop', () => {
  const originals = {
    scrollHeight: Object.getOwnPropertyDescriptor(document.documentElement, 'scrollHeight'),
    innerHeight: Object.getOwnPropertyDescriptor(window, 'innerHeight'),
    scrollY: Object.getOwnPropertyDescriptor(window, 'scrollY'),
  };

  function restore(
    target: object,
    key: string,
    descriptor: PropertyDescriptor | undefined,
  ): void {
    if (descriptor === undefined) {
      Reflect.deleteProperty(target, key);
      return;
    }
    Object.defineProperty(target, key, descriptor);
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [BackToTop] }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    restore(document.documentElement, 'scrollHeight', originals.scrollHeight);
    restore(window, 'innerHeight', originals.innerHeight);
    restore(window, 'scrollY', originals.scrollY);
  });

  it('stays out of the way on a short page, even at the bottom', async () => {
    setGeometry({ page: 800, viewport: 800, scrolled: 0 });

    const fixture = await render();

    expect(button(fixture)).toBeNull();
  });

  it('appears only once the visitor is near the bottom of a long page', async () => {
    // 4000px of content in an 800px viewport: four screens, so the threshold is meaningful.
    setGeometry({ page: 4000, viewport: 800, scrolled: 0 });

    const fixture = await render();
    expect(button(fixture)).toBeNull();

    setGeometry({ page: 4000, viewport: 800, scrolled: 1500 });
    window.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(button(fixture)).toBeNull();

    // 4000 - (2880 + 800) = 320: exactly the threshold, which counts as near.
    setGeometry({ page: 4000, viewport: 800, scrolled: 2880 });
    window.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();

    const visible = button(fixture);
    expect(visible).not.toBeNull();
    // The button carries no visible word: its name is the hidden label, which is what a screen
    // reader announces and what the tooltip-less icon would otherwise lack.
    expect(visible?.textContent?.trim()).toBe('Volver arriba');
    expect(visible?.getAttribute('type')).toBe('button');
  });

  it('scrolls the document back to the top when clicked', async () => {
    setGeometry({ page: 4000, viewport: 800, scrolled: 3200 });
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    const fixture = await render();
    button(fixture)?.click();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });

    vi.unstubAllGlobals();
  });

  it('stop listening as soon as it is destroyed', async () => {
    setGeometry({ page: 4000, viewport: 800, scrolled: 0 });

    const fixture = await render();
    fixture.destroy();

    setGeometry({ page: 4000, viewport: 800, scrolled: 3200 });
    // No throw, and nothing re-renders: the listener is gone with the component.
    window.dispatchEvent(new Event('scroll'));
    expect(button(fixture)).toBeNull();
  });
});
