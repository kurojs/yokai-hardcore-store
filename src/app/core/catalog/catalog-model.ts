/**
 * The catalog's *normalised* shape — what the rest of the app is allowed to see.
 *
 * This is deliberately not the shape of `data/catalog.json`. The generated document carries
 * fields the storefront must never use, and the boundary in `catalog-validation.ts` removes
 * them so that "never do this" becomes "cannot do this":
 *
 * - `imageUrl` (the Tebex CDN URL) is dropped. Runtime images always come from `public/`,
 *   reachable through {@link Product.imagePath}, so no component can accidentally point an
 *   `<img>` at a CDN the brief forbids and that would not work offline.
 * - `sourceFolder` (generator provenance, containing a double space in the real data) is
 *   dropped, so it can never be rendered as if it were a product or category name.
 * - `Category.productCount` is validated against the real product list and then dropped:
 *   the count is derived from the products themselves by `buildCatalogIndex`, so there is
 *   one source of truth rather than two that can disagree.
 *
 * These are the only two entity shapes the storefront has, and they are `readonly` because
 * nothing downstream may mutate a shared catalog.
 */

/** The only `schemaVersion` this app understands. A different one fails loudly at load. */
export const SUPPORTED_SCHEMA_VERSION = 1;

/** A catalog category, as normalised from the generated document. */
export interface Category {
  readonly id: string;
  readonly slug: string;
  /** Display name. Source-faithful, including any SHOUTING. Never case-transformed. */
  readonly name: string;
  /** Long Spanish marketing copy, one paragraph. */
  readonly description: string;
  /**
   * Root-relative banner path, or `null` when the category has no banner image.
   *
   * `null` is a real state, not a defect: 3 of the 10 categories have none, and any
   * consumer must decide what to render instead rather than showing a broken image.
   */
  readonly bannerImage: string | null;
}

/** A catalog product, as normalised from the generated document. */
export interface Product {
  readonly id: string;
  readonly slug: string;
  /** Source-faithful display name; some are ALL CAPS and up to 39 characters long. */
  readonly name: string;
  /** Price in USD. Positive and finite; may be fractional. */
  readonly priceUsd: number;
  readonly categoryId: string;
  /** Long Spanish copy, one paragraph, often containing inline `Cantidad:` style labels. */
  readonly description: string;
  /**
   * Root-relative image path under `public/`, or `null` when the product has no local image.
   *
   * Present for all 48 products today. `null` is still a real state the UI must handle,
   * because the alternative would be reaching for the CDN.
   */
  readonly imagePath: string | null;
  /**
   * Root-relative 3D model path, or `null` when the product has no model.
   *
   * `null` for all 48 products today: which of the repository's item models belongs to which
   * product is an open product decision, not something the frontend may guess. Product
   * presentations are therefore image-first and treat this as absent.
   */
  readonly modelPath: string | null;
}

/** The whole catalog: 10 categories and 48 products in the current generated document. */
export interface Catalog {
  readonly schemaVersion: typeof SUPPORTED_SCHEMA_VERSION;
  readonly categories: readonly Category[];
  readonly products: readonly Product[];
}
