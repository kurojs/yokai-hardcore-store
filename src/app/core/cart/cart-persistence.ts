/**
 * The cart's persistence adapter: `localStorage` in, cart lines out, and nothing thrown.
 *
 * The rest of the application talks to the cart as values. This file is the only place that
 * knows a cart survives a page reload, and it is written so that a *stale or corrupt* stored
 * cart can only ever degrade: to fewer lines, or to an empty cart. It cannot throw, it cannot
 * produce `NaN`, and it cannot resurrect a product that no longer exists.
 *
 * Three layers, on purpose:
 *
 * 1. `parseStoredCart` repairs the *document*. It is a pure string-to-lines function, so the
 *    whole corruption matrix is testable in Node with no browser and no `localStorage`.
 * 2. `readStoredCart` / `writeStoredCart` are the only functions that touch a `StorageLike`.
 *    Any storage failure (Safari private mode, a full quota, a disabled cookie policy) becomes
 *    an outcome value instead of an exception on the way to the component tree.
 * 3. `reconcileCart` repairs the *meaning*: a stored slug that the catalog no longer contains is
 *    not a cart line. Only the catalog can answer that, so it is a separate predicate-driven
 *    function rather than something this file guesses at.
 *
 * The stored document carries a `version`. A cart written by an older or newer build is
 * discarded rather than best-effort migrated, because the lines are cheap to re-create and a
 * silently misinterpreted quantity is worse than an empty cart.
 */

import { MAX_LINE_QUANTITY, type Cart, type CartLine } from './cart-model';

/** The `localStorage` key. Namespaced and versioned so an old build cannot read the new shape. */
export const CART_STORAGE_KEY = 'yokai.cart.v1';

/** The only envelope version this build understands. */
export const CART_STORAGE_VERSION = 1;

/**
 * The slice of the Web Storage API this adapter uses.
 *
 * Narrower than `Storage` so a test can pass an object literal, and so the adapter cannot grow a
 * dependency on `clear()` or `key()` that would make it harder to reason about.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * What happened when a stored cart was read.
 *
 * It is returned rather than swallowed because "your cart came back" and "your cart was thrown
 * away" are different experiences, and a support question about a vanished cart deserves an
 * answer that does not require a debugger. The UI does not need to branch on it today.
 */
export type CartReadOutcome =
  /** Nothing was ever stored, or the key holds an empty string. */
  | 'empty'
  /** A stored document was found and every line in it was already valid. */
  | 'ok'
  /** A stored document was found, and at least one line or field had to be repaired. */
  | 'repaired'
  /** Something was stored, but it was not this application's cart. Nothing was kept. */
  | 'discarded'
  /** The storage itself refused to answer. Nothing was kept. */
  | 'unavailable';

/** The result of reading a stored cart. `lines` is always safe to use. */
export interface CartReadResult {
  readonly lines: Cart;
  readonly outcome: CartReadOutcome;
}

const DISCARDED: CartReadResult = { lines: [], outcome: 'discarded' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Turns the stored text into cart lines.
 *
 * Repair rules, each one a case the real world produces:
 *
 * - Not JSON at all (a truncated write, something else's data on our key) → the document is
 *   discarded.
 * - Not an object, no `version`, or a `version` that is not ours → discarded.
 * - `lines` is not an array → discarded.
 * - A line that is not an object, has no usable `slug`, or has a `quantity` that is not a finite
 *   number → **that line** is dropped and the rest are kept.
 * - A quantity of zero or less → the line is dropped: a line with none of a product is not a
 *   line, and it would render as a zero-width row nobody can remove.
 * - A fractional quantity → floored; above `MAX_LINE_QUANTITY` → clamped.
 * - The same slug twice → merged into the first occurrence, clamped.
 *
 * `NaN` deserves a note: it cannot appear in valid JSON (`JSON.stringify(NaN)` writes `null`),
 * so a stored `null` quantity is the shape a `NaN` actually arrives in, and it is dropped like
 * any other non-number.
 */
export function parseStoredCart(raw: string | null | undefined): CartReadResult {
  if (raw === null || raw === undefined || raw.trim().length === 0) {
    return { lines: [], outcome: 'empty' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return DISCARDED;
  }

  if (!isRecord(parsed)) return DISCARDED;
  if (parsed['version'] !== CART_STORAGE_VERSION) return DISCARDED;
  const rawLines = parsed['lines'];
  if (!Array.isArray(rawLines)) return DISCARDED;

  let repaired = false;
  const lines: CartLine[] = [];

  for (const candidate of rawLines) {
    if (!isRecord(candidate)) {
      repaired = true;
      continue;
    }

    const rawSlug = candidate['slug'];
    const slug = typeof rawSlug === 'string' ? rawSlug.trim() : '';
    if (rawSlug !== slug) repaired = true;
    if (slug.length === 0) {
      repaired = true;
      continue;
    }

    const rawQuantity = candidate['quantity'];
    if (typeof rawQuantity !== 'number' || !Number.isFinite(rawQuantity)) {
      repaired = true;
      continue;
    }

    const quantity = Math.trunc(rawQuantity);
    if (quantity !== rawQuantity) repaired = true;
    if (quantity <= 0) {
      repaired = true;
      continue;
    }
    const clamped = Math.min(quantity, MAX_LINE_QUANTITY);
    if (clamped !== quantity) repaired = true;

    const existing = lines.find((line) => line.slug === slug);
    if (existing === undefined) {
      lines.push({ slug, quantity: clamped });
      continue;
    }
    repaired = true;
    const merged = Math.min(existing.quantity + clamped, MAX_LINE_QUANTITY);
    lines[lines.indexOf(existing)] = { slug, quantity: merged };
  }

  return { lines, outcome: repaired ? 'repaired' : 'ok' };
}

/**
 * The document written to storage.
 *
 * Lines are normalised on the way out as well as on the way in. Writing an invalid quantity
 * would make the *next* visit's repair path responsible for a bug this build created, and the
 * only cost of normalising here is one map over at most a few dozen lines.
 */
export function serializeCart(lines: Cart): string {
  const cleaned: CartLine[] = [];
  for (const line of lines) {
    const slug = line.slug.trim();
    const quantity = Math.min(Math.max(0, Math.trunc(line.quantity)), MAX_LINE_QUANTITY);
    if (slug.length === 0 || !Number.isFinite(quantity) || quantity <= 0) continue;
    if (cleaned.some((kept) => kept.slug === slug)) continue;
    cleaned.push({ slug, quantity });
  }
  return JSON.stringify({ version: CART_STORAGE_VERSION, lines: cleaned });
}

/**
 * Reads the cart from `storage`.
 *
 * A `null`/`undefined` storage (a server render, a test without a browser) is a normal outcome,
 * not an error. Every access is guarded: Web Storage throws on access in some privacy modes and
 * on write when the quota is exhausted.
 */
export function readStoredCart(storage: StorageLike | null | undefined): CartReadResult {
  if (storage === null || storage === undefined) {
    return { lines: [], outcome: 'unavailable' };
  }

  let raw: string | null;
  try {
    raw = storage.getItem(CART_STORAGE_KEY);
  } catch {
    return { lines: [], outcome: 'unavailable' };
  }

  return parseStoredCart(raw);
}

/**
 * Writes the cart to `storage`.
 *
 * @returns `true` when the write happened, `false` when there was no storage or it refused.
 *   A refusal is not worth interrupting a shopper: the cart still works for this visit, it just
 *   will not survive the next one.
 */
export function writeStoredCart(storage: StorageLike | null | undefined, lines: Cart): boolean {
  if (storage === null || storage === undefined) return false;
  try {
    storage.setItem(CART_STORAGE_KEY, serializeCart(lines));
    return true;
  } catch {
    return false;
  }
}

/** Removes the stored cart entirely. Failing to remove it is not an error worth surfacing. */
export function clearStoredCart(storage: StorageLike | null | undefined): boolean {
  if (storage === null || storage === undefined) return false;
  try {
    storage.removeItem(CART_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Drops (and de-duplicates) every line whose product is no longer in the catalog.
 *
 * This is the second half of the stale-cart story. `parseStoredCart` cannot know whether
 * `espada-de-otro-mundo` still exists; the catalog can. The predicate keeps this function pure
 * and lets a spec reconcile against a plain `Set` of slugs.
 *
 * Returns the input array unchanged when every line survives, so a reconciled cart does not
 * churn the signal graph on every catalog read.
 */
export function reconcileCart(lines: Cart, isKnownSlug: (slug: string) => boolean): Cart {
  let changed = false;
  const kept: CartLine[] = [];

  for (const line of lines) {
    if (!isKnownSlug(line.slug)) {
      changed = true;
      continue;
    }
    const existing = kept.find((keptLine) => keptLine.slug === line.slug);
    if (existing === undefined) {
      kept.push(line);
      continue;
    }
    changed = true;
    const quantity = Math.min(existing.quantity + line.quantity, MAX_LINE_QUANTITY);
    kept[kept.indexOf(existing)] = { slug: line.slug, quantity };
  }

  return changed ? kept : lines;
}
