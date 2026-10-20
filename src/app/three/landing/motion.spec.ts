/**
 * The gating policy is eight possible inputs and three outcomes. Anything less than the full
 * matrix would leave the most expensive mistake — animating behind a hidden tab — untested.
 */

import { prefersReducedMotion, sceneMotion, shouldRunScene, type SceneMotion } from './motion';

describe('sceneMotion', () => {
  const cases: ReadonlyArray<{
    reducedMotion: boolean;
    intersecting: boolean;
    visible: boolean;
    expected: SceneMotion;
  }> = [
    { reducedMotion: false, intersecting: true, visible: true, expected: 'animate' },
    { reducedMotion: true, intersecting: true, visible: true, expected: 'still' },
    { reducedMotion: false, intersecting: false, visible: true, expected: 'paused' },
    { reducedMotion: true, intersecting: false, visible: true, expected: 'paused' },
    { reducedMotion: false, intersecting: true, visible: false, expected: 'paused' },
    { reducedMotion: true, intersecting: true, visible: false, expected: 'paused' },
    { reducedMotion: false, intersecting: false, visible: false, expected: 'paused' },
    { reducedMotion: true, intersecting: false, visible: false, expected: 'paused' },
  ];

  it.each(cases)(
    'reducedMotion=$reducedMotion intersecting=$intersecting visible=$visible -> $expected',
    ({ reducedMotion, intersecting, visible, expected }) => {
      expect(sceneMotion({ reducedMotion, intersecting, visible })).toBe(expected);
    },
  );

  it('runs only when paused is not the answer', () => {
    expect(shouldRunScene({ reducedMotion: false, intersecting: true, visible: true })).toBe(true);
    expect(shouldRunScene({ reducedMotion: true, intersecting: true, visible: true })).toBe(true);
    expect(shouldRunScene({ reducedMotion: false, intersecting: false, visible: true })).toBe(
      false,
    );
    expect(shouldRunScene({ reducedMotion: false, intersecting: true, visible: false })).toBe(
      false,
    );
  });
});

describe('prefersReducedMotion', () => {
  it('reads a media-query-shaped value without touching window', () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true);
    expect(prefersReducedMotion({ matches: false })).toBe(false);
    expect(prefersReducedMotion(null)).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
  });
});
