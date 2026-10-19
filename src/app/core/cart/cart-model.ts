/**
 * The cart's shapes.
 *
 * Two decisions here matter more than the types themselves:
 *
 * - **A line is identity plus quantity. Nothing else.** There is no price, no name and no image
 *   in a persisted line, because every one of those is catalog data that can change. The cart
 *   stores *what* the visitor wants and *how many*; the catalog supplies what it costs right
 *   now. That makes "a stale stored price can never win" true by construction rather than by a
 *   validation rule someone has to remember.
 * - **Identity is the product slug**, not the numeric id and not the name. `slug === id` for all
 *   48 products today, but they are separate fields on purpose: the slug is what URLs use, so
 *   it is the one identifier that stays stable when a product is renamed.
 */

/**
 * The most units of one product a cart will hold.
 *
 * Not a business rule anyone asked for: it is the bound that keeps a corrupt or hostile
 * persisted quantity from becoming a nine-figure subtotal, and it is low enough that a person
 * would notice the number before it became a problem. Adding beyond it is clamped, never
 * rejected, so a double click at 99 cannot silently drop the whole line.
 */
export const MAX_LINE_QUANTITY = 99;

/** One product in the cart: its slug and how many of it. */
export interface CartLine {
  readonly slug: string;
  readonly quantity: number;
}

/** The cart, as stored. Ordered; the oldest line stays first as quantities change. */
export type Cart = readonly CartLine[];

/** The cart before anything was added. Shared so an empty cart has one identity. */
export const EMPTY_CART: Cart = [];

/** The money a cart works out to once its lines are priced from a catalog. */
export interface CartTotals {
  /** The sum of every line's quantity. This is the number the header badge shows. */
  readonly itemCount: number;
  /** The sum of every line's total, in USD, rounded to cents. */
  readonly subtotalUsd: number;
  /**
   * What the visitor owes. Equal to `subtotalUsd` today: the store has no shipping, taxes or
   * discounts, and a demo checkout must not invent them. It is a separate field anyway so T7
   * can change it in one place without every caller learning a new name.
   */
  readonly totalUsd: number;
}
