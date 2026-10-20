/**
 * When the landing scene is allowed to move.
 *
 * Three independent facts decide it, and the combination is small enough to be exhaustively
 * tested:
 *
 * - `reducedMotion` — the visitor asked the OS for less animation.
 * - `intersecting` — the scene's frame is currently in the viewport.
 * - `visible` — the document is not hidden behind another tab.
 *
 * The precedence is deliberate. Off-screen or hidden means **paused**: no RAF, no mixer
 * update, no render, because a GPU kept warm behind a cart page is a defect. In view but
 * motion-averse means **still**: exactly one frame, no drift, no idle clip, no bobbing blocks.
 * Only when all three allow it does the scene **animate**.
 *
 * Reduced motion still renders a frame rather than skipping the scene. The diorama is
 * decoration, and a still image of it preserves the composition without asking the visitor to
 * tolerate motion; the alternative would silently delete part of the design for exactly the
 * people who asked for less distraction.
 */

/** The media query the browser uses for the OS-level preference. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** What the render loop should do right now. */
export type SceneMotion = 'animate' | 'still' | 'paused';

/** The three inputs to the policy. */
export interface SceneMotionInputs {
  readonly reducedMotion: boolean;
  readonly intersecting: boolean;
  readonly visible: boolean;
}

/**
 * The whole gating policy.
 *
 * Total and pure: every combination of the three booleans has exactly one answer.
 */
export function sceneMotion(inputs: SceneMotionInputs): SceneMotion {
  if (!inputs.visible || !inputs.intersecting) return 'paused';
  if (inputs.reducedMotion) return 'still';
  return 'animate';
}

/** Whether the scene is worth building at all: paused means no work, not "work quietly". */
export function shouldRunScene(inputs: SceneMotionInputs): boolean {
  return sceneMotion(inputs) !== 'paused';
}

/**
 * Reads a `MediaQueryList`-shaped value.
 *
 * Taking the shape rather than the global keeps the check testable with a literal and keeps
 * this module independent of `window`.
 */
export function prefersReducedMotion(
  media: { readonly matches: boolean } | null | undefined,
): boolean {
  return media?.matches === true;
}
