/**
 * Seeded randomness for the landing diorama.
 *
 * The island must be recomputable: the same seed has to produce byte-identical blocks on every
 * reload, in a test, and on a reviewer's machine. `Math.random()` is never called anywhere the
 * scene description depends on it.
 *
 * `mulberry32` is chosen for being tiny, fast and good enough for decoration — this is not a
 * cryptography boundary. `normalizeSeed` makes the generator total: `NaN`, `Infinity`,
 * fractions and negative numbers all fold into a stable uint32 instead of throwing or
 * producing a different island per call.
 */

/** Folds any input number into a stable uint32. */
export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0;
  return Math.trunc(seed) >>> 0;
}

/**
 * A mulberry32 generator.
 *
 * Returns a function in `[0, 1)`. The returned closure owns its state, so two calls with the
 * same seed produce two independent streams with identical output.
 */
export function createRandom(seed: number): () => number {
  let state = normalizeSeed(seed);
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32-bit integer mix, for coordinate-derived variation rather than stream order. */
function mix(value: number): number {
  let t = value >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x7feb352d);
  t = Math.imul(t ^ (t >>> 15), 0x846ca68b);
  return (t ^ (t >>> 16)) >>> 0;
}

/** Deterministic `[0, 1)` value for a 2D coordinate. */
export function hash2(seed: number, x: number, y: number): number {
  const value = mix(
    normalizeSeed(seed) ^ Math.imul(x | 0, 0x9e3779b1) ^ Math.imul(y | 0, 0x85ebca6b),
  );
  return value / 4294967296;
}

/** Deterministic `[0, 1)` value for a 3D coordinate. */
export function hash3(seed: number, x: number, y: number, z: number): number {
  const value = mix(
    normalizeSeed(seed) ^
      Math.imul(x | 0, 0x9e3779b1) ^
      Math.imul(y | 0, 0x85ebca6b) ^
      Math.imul(z | 0, 0xc2b2ae35),
  );
  return value / 4294967296;
}
