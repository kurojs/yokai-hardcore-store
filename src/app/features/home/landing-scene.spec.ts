/**
 * The landing host in jsdom, where there is no WebGL.
 *
 * That is not a limitation worked around with a fake context: it is exactly the fallback this
 * component promises. Creating three's `WebGLRenderer` throws, the component catches it, logs
 * one quiet line, and leaves an empty decorative stage behind instead of a broken canvas.
 */

import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MockInstance } from 'vitest';

import { LandingScene } from './landing-scene';

describe('LandingScene', () => {
  let warn: MockInstance;

  beforeEach(async () => {
    // three logs its own console error before throwing; silence the environment noise and
    // assert on our single warning instead. Returning `null` here is not a fake WebGL
    // implementation — it is jsdom's real answer, stated explicitly so jsdom does not print
    // its own "not implemented" line for every context probe.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({ imports: [LandingScene] }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves no canvas behind when WebGL is unavailable', () => {
    const fixture = TestBed.createComponent(LandingScene);
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();

    const host = fixture.nativeElement as HTMLElement;
    const stage = host.querySelector<HTMLElement>('.stage');

    expect(stage).not.toBeNull();
    expect(stage?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('canvas')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('landing scene');

    expect(() => fixture.destroy()).not.toThrow();
  });
});
