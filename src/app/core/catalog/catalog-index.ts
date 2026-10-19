import { foldForSearch } from '../text/fold';
import type { Catalog, Category, Product } from './catalog-model';

/**
 * Derived, read-once lookups over a validated catalog.
 *
 * `core/README.md` asks this layer to prefer pure functions over stateful services, so the
 * index is a plain value built by a pure function rather than a service that holds state.
 * The Angular store in `catalog-store.ts` only wraps it in a `computed` so the work happens
 * once per loaded catalog instead of once per component.
 *
 * The index also decides *what search sees*. Folding each product's searchable text once,
 * here, means the query layer never has to re-fold 48 descriptions per keystroke, and there
 * is exactly one place where the searchable surface is defined.
 */

/** A product paired with its category and its pre-folded searchable text. */
export interface CatalogEntry {
  readonly product: Product;
  readonly category: Category;
  /**
   * Folded (`foldForSearch`) concatenation of the product name, the product description and
   * the category name. Built once; never displayed.
   *
   * Product and category *slugs* are deliberately excluded: they are URL identity rather
   * than copy, and matching them would make one and two letter queries hit arbitrary
   * records.
   */
  readonly searchText: string;
}

/** Everything the UI needs from a catalog, derived once. */
export interface CatalogIndex {
  readonly categories: readonly Category[];
  readonly entries: readonly CatalogEntry[];
  readonly categoryById: ReadonlyMap<string, Category>;
  readonly categoryBySlug: ReadonlyMap<string, Category>;
  /** Product count per category id, derived from the products themselves. */
  readonly countByCategory: ReadonlyMap<string, number>;
  /** The distinct prices present, ascending. Drives the price filter's options. */
  readonly prices: readonly number[];
}

/** The folded text a search query is matched against for one product. */
export function searchTextFor(product: Product, category: Category): string {
  return foldForSearch([product.name, product.description, category.name].join('\n'));
}

/**
 * Builds the derived lookups for `catalog`.
 *
 * @throws Error when a product references a category that is not in the catalog. Validation
 *   already guarantees this cannot happen, so reaching it means the catalog arrived from
 *   somewhere other than the validated loader — a programming error worth failing on rather
 *   than rendering a card with no category.
 */
export function buildCatalogIndex(catalog: Catalog): CatalogIndex {
  const categoryById = new Map<string, Category>();
  const categoryBySlug = new Map<string, Category>();
  for (const category of catalog.categories) {
    categoryById.set(category.id, category);
    categoryBySlug.set(category.slug, category);
  }

  const countByCategory = new Map<string, number>();
  const prices = new Set<number>();
  const entries: CatalogEntry[] = [];

  for (const product of catalog.products) {
    const category = categoryById.get(product.categoryId);
    if (category === undefined) {
      throw new Error(
        `catalog index: product "${product.id}" references unknown category ` +
          `"${product.categoryId}"; the catalog must be validated before it is indexed`,
      );
    }
    countByCategory.set(category.id, (countByCategory.get(category.id) ?? 0) + 1);
    prices.add(product.priceUsd);
    entries.push({ product, category, searchText: searchTextFor(product, category) });
  }

  return {
    categories: catalog.categories,
    entries,
    categoryById,
    categoryBySlug,
    countByCategory,
    prices: [...prices].sort((a, b) => a - b),
  };
}

/** Finds a category by its slug, or `null` when no category uses it. */
export function findCategoryBySlug(
  index: CatalogIndex,
  slug: string | null | undefined,
): Category | null {
  if (slug === null || slug === undefined || slug.length === 0) return null;
  return index.categoryBySlug.get(slug) ?? null;
}

/** How many products belong to `categoryId`. */
export function countInCategory(index: CatalogIndex, categoryId: string): number {
  return index.countByCategory.get(categoryId) ?? 0;
}
