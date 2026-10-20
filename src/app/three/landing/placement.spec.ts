/**
 * The placement maths is the difference between a boss standing on the pad and a boss sunk
 * into it. These numbers are the real model's bounds, measured by the bbmodel pipeline.
 */

import { groundCenteredPlacement, TLALOC_CLIP, TLALOC_MODEL_URL, TLALOC_SCALE } from './placement';

const TLALOC_BOUNDS = {
  min: [-12.4828, 0.3688, -34.0698] as const,
  max: [14.6452, 52.5904, 28.3849] as const,
};

describe('groundCenteredPlacement', () => {
  it('centres the model on x/z and puts its lowest vertex on the ground', () => {
    const placement = groundCenteredPlacement(TLALOC_BOUNDS, 0.14, 0.5);

    expect(placement.scale).toBe(0.14);
    // x centre = 1.0812, z centre = -2.84245
    expect(placement.position[0]).toBeCloseTo(-0.151368, 6);
    expect(placement.position[2]).toBeCloseTo(0.397943, 5);
    // min y * scale = 0.051632, so the root sits just below the surface.
    expect(placement.position[1]).toBeCloseTo(0.448368, 6);

    expect(placement.position[1] + TLALOC_BOUNDS.min[1] * placement.scale).toBeCloseTo(0.5, 6);
    expect(
      placement.position[0] + ((TLALOC_BOUNDS.min[0] + TLALOC_BOUNDS.max[0]) / 2) * 0.14,
    ).toBeCloseTo(0, 6);
    expect(
      placement.position[2] + ((TLALOC_BOUNDS.min[2] + TLALOC_BOUNDS.max[2]) / 2) * 0.14,
    ).toBeCloseTo(0, 6);
  });

  it('is total for impossible transforms', () => {
    expect(groundCenteredPlacement(TLALOC_BOUNDS, 0, 0.5).scale).toBe(1);
    expect(groundCenteredPlacement(TLALOC_BOUNDS, Number.NaN, 0.5).scale).toBe(1);
    expect(groundCenteredPlacement(TLALOC_BOUNDS, -2, 0.5).scale).toBe(1);
    expect(groundCenteredPlacement(TLALOC_BOUNDS, 0.14, Number.NaN).position[1]).toBeCloseTo(
      -0.051632,
      6,
    );
  });

  it('names the asset and clip the scene actually loads', () => {
    expect(TLALOC_MODEL_URL).toBe('/models/bosses/tlaloc.bbmodel');
    expect(TLALOC_CLIP).toBe('idle');
    expect(TLALOC_SCALE).toBeGreaterThan(0);
  });
});
