/**
 * Where the Tlaloc model stands.
 *
 * The `.bbmodel` is authored around its own origin, which is neither centred nor on the floor
 * (the visible geometry starts at y≈0.37 and its x/z centre is about 1.08/-2.84). Dropping the
 * raw root at the pad would sink one corner and float the other. This function is the whole
 * correction, kept three.js-free so the arithmetic is unit tested rather than eyeballed in a
 * browser.
 *
 * Constant here rather than in the renderer so a test can assert the URL and clip the scene
 * actually uses, and so a future variant only changes one table.
 */

import type { Bounds } from '../bbmodel/scene';

/** The boss model that belongs to this server, served from `public/`. */
export const TLALOC_MODEL_URL = '/models/bosses/tlaloc.bbmodel';

/** The clip the landing scene plays. The asset ships exactly this name. */
export const TLALOC_CLIP = 'idle';

/** Model units -> blocks. The boss is ~52 units tall; at this scale it stands ~7.3 blocks. */
export const TLALOC_SCALE = 0.14;

/** A slight turn so the model faces the three-quarter camera instead of straight ahead. */
export const TLALOC_YAW = -0.35;

/** A camera-independent placement: root position plus uniform scale. */
export interface GroundPlacement {
  readonly position: readonly [number, number, number];
  readonly scale: number;
}

/**
 * Centres `bounds` on the world x/z origin and puts its lowest point on `groundY`.
 *
 * Total: a non-finite or non-positive scale falls back to 1, and a non-finite ground falls
 * back to 0, so a malformed `bbmodel` can never produce NaN in a transform matrix.
 */
export function groundCenteredPlacement(
  bounds: Bounds,
  scale: number,
  groundY: number,
): GroundPlacement {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const safeGround = Number.isFinite(groundY) ? groundY : 0;
  const centreX = (bounds.min[0] + bounds.max[0]) / 2;
  const centreZ = (bounds.min[2] + bounds.max[2]) / 2;
  return {
    position: [-centreX * safeScale, safeGround - bounds.min[1] * safeScale, -centreZ * safeScale],
    scale: safeScale,
  };
}
