/**
 * The demo checkout's order reference: a short, local, human-readable identifier.
 *
 * It is `YOKAI-YYYYMMDD-XXXX`, for example `YOKAI-20261018-09IX`:
 *
 * - `YOKAI` says which store the visitor was in.
 * - the date is the UTC calendar day of the demo. UTC rather than local time so the same moment
 *   produces the same reference on every machine and a test can pin it; a local timestamp would
 *   change value with the test runner's timezone and prove nothing.
 * - four base-36 characters come from the caller's `nonce`. They make two demos on the same day
 *   distinguishable without a server, and the `Math.random` call that produces the nonce stays
 *   at the component edge — this function is deterministic for a given `(date, nonce)` pair.
 *
 * **Nothing about this reference leaves the browser.** It is not an order number, no server
 * issued it, and nothing will ever look it up. The confirmation says so explicitly; this file
 * only produces a string that a person can read back.
 *
 * The function is total on purpose: an invalid date renders `00000000` and an unusable nonce
 * becomes `0`, because a confirmation screen must not throw over a malformed clock.
 */

/** Fixed prefix, so a reference is recognisable out of context. */
export const ORDER_REFERENCE_PREFIX = 'YOKAI';

/** How many base-36 characters identify one demo within a day. */
export const ORDER_REFERENCE_SUFFIX_LENGTH = 4;

/** Number of distinct suffixes: `36^4` (1,679,616). */
export const ORDER_REFERENCE_NONCE_SPACE = 36 ** ORDER_REFERENCE_SUFFIX_LENGTH;

/** The fallback day used when the supplied date is not a real one. */
const UNKNOWN_DAY = '00000000';

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/**
 * The UTC calendar day of `placedAt`, as `YYYYMMDD`.
 *
 * @returns `00000000` for an invalid `Date`, so the reference stays well-formed.
 */
export function orderReferenceDay(placedAt: Date): string {
  const time = placedAt.getTime();
  if (!Number.isFinite(time)) return UNKNOWN_DAY;

  const date = new Date(time);
  return (
    `${pad(date.getUTCFullYear(), 4)}` +
    `${pad(date.getUTCMonth() + 1, 2)}` +
    `${pad(date.getUTCDate(), 2)}`
  );
}

/**
 * Builds the reference for one demo.
 *
 * @param placedAt when the confirmation was produced. Only its UTC date is used.
 * @param nonce a caller-supplied number; it is truncated, wrapped into the suffix space and
 *   rendered as four uppercase base-36 characters.
 */
export function createOrderReference(placedAt: Date, nonce: number): string {
  const safeNonce = Number.isFinite(nonce) ? Math.trunc(nonce) : 0;
  const index =
    ((safeNonce % ORDER_REFERENCE_NONCE_SPACE) + ORDER_REFERENCE_NONCE_SPACE) %
    ORDER_REFERENCE_NONCE_SPACE;
  const suffix = index.toString(36).toUpperCase().padStart(ORDER_REFERENCE_SUFFIX_LENGTH, '0');

  return `${ORDER_REFERENCE_PREFIX}-${orderReferenceDay(placedAt)}-${suffix}`;
}
