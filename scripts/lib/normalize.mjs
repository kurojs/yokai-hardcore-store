/**
 * Pure catalog normalization.
 *
 * Takes the raw source data (verbatim Tebex JSON + the on-disk folder index +
 * the `.txt` copy) and produces the normalized catalog the application consumes.
 *
 * Design rules enforced here:
 *
 * - **Deterministic**: every collection is explicitly sorted, no value depends on
 *   directory read order or object key order, and nothing is timestamped.
 * - **Identity from the folder, not the array**: `id` is derived from the product
 *   folder name, so re-ordering the source JSON can never shift an id.
 * - **Fail loudly**: an unmatchable product, an unmatchable category, a missing
 *   category description, or a price that disagrees between the JSON and the
 *   `.txt` copy aborts with a precise message. Nothing is silently substituted
 *   with an empty string.
 *
 * No I/O happens in this module; `assetPaths` is the set of repo-relative files
 * that the sync step actually produced, which is how `localImage` ends up `null`
 * for an asset that has no local copy.
 */

import { ACCENT_FIXES, findResidualPlainForms, restoreAccents } from "./orthography.mjs";
import { collapseWhitespace, comparisonKey, slugify, stripQuotes } from "./slugs.mjs";

/** Bump when the generated shape changes in a way consumers must notice. */
export const SCHEMA_VERSION = 1;

/**
 * One raw product entry as published by the store's JSON export.
 *
 * @typedef {object} SourceProduct
 * @property {string} nombre Display name; may be accent-stripped, double-spaced or quote-wrapped.
 * @property {number} precio Price in USD.
 * @property {string} descripcion Category copy as written in the export.
 * @property {string} categoria Category display name as written in the export.
 * @property {string} imagen_url Remote CDN image URL.
 */

/**
 * One entry of `data/category-copy.json`, derived from a `categoria.txt`.
 *
 * @typedef {object} CategoryCopyEntry
 * @property {string} folder Source folder name, used to derive the category id.
 * @property {string} name Display name.
 * @property {string} description Long-form copy.
 * @property {string | null} bannerImage On-disk banner file name, or null when the category has none.
 */

/**
 * One entry of `data/source-index.json`, describing one product folder on disk.
 *
 * @typedef {object} ProductIndexEntry
 * @property {string} categoryFolder Parent category folder name.
 * @property {string} folder Product folder name, used to derive the product id.
 * @property {string | null} image On-disk image file name, or null when the folder holds none.
 * @property {string | null} name Copy read from `info.txt`, or null when that file is absent.
 * @property {number | null} priceUsd Price read from `info.txt`, or null when that file is absent.
 * @property {string | null} description Copy read from `info.txt`, or null when that file is absent.
 */

/** Runtime assets are served from Angular's `public/` directory, mounted at the web root. */
export const ASSET_SOURCE_DIR = "public";

/** Served paths, relative to the web root. */
export const SERVED_BRAND_DIR = "/brand";
export const SERVED_PRODUCT_DIR = "/products";
export const SERVED_CATEGORY_DIR = "/categories";

/**
 * Explicit product-to-item-model aliases, keyed by product slug.
 *
 * The Tlaloc texture pack ships custom item models for the boss encounter
 * (`tlaloc_hat`, `tlaloc_staff`) and none of them correspond to a catalog
 * product, so no product currently resolves a `modelPath`. When a future pack
 * adds an item model for a sold product, add the mapping here rather than
 * guessing from name similarity.
 *
 * Frozen, and read through `buildCatalog`'s `itemModelAliases` parameter so the
 * alias branch stays testable without mutating this table.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const ITEM_MODEL_ALIASES = Object.freeze({});

/** Compares two strings by code unit, independent of host locale. */
function byCodeUnit(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Converts a repo-relative path under `public/` to its served path. */
export function toServedPath(repoRelativePath) {
  const prefix = `${ASSET_SOURCE_DIR}/`;
  if (!repoRelativePath.startsWith(prefix)) {
    throw new Error(`expected a repo path under ${prefix}, got ${repoRelativePath}`);
  }
  return `/${repoRelativePath.slice(prefix.length)}`;
}

/** Returns the served path for a repo file, or `null` when it was not produced. */
function servedIfPresent(assetPaths, repoRelativePath) {
  return assetPaths.has(repoRelativePath) ? toServedPath(repoRelativePath) : null;
}

/** Normalizes display copy: strip stray quotes, collapse whitespace, fix orthography. */
export function normalizeCopy(value) {
  return restoreAccents(collapseWhitespace(stripQuotes(value)));
}

/** Normalizes free-form copy (descriptions), which never carries surrounding quotes. */
export function normalizeDescription(value) {
  return restoreAccents(collapseWhitespace(value));
}

function assertUnique(items, keyOf, label) {
  const seen = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) {
      throw new Error(`${label} is not unique: ${JSON.stringify(key)} is produced by more than one entry`);
    }
    seen.set(key, item);
  }
}

/**
 * Builds the normalized catalog.
 *
 * @param {{
 *   sourceProducts: Array<SourceProduct>,
 *   categoryCopy: Array<CategoryCopyEntry>,
 *   productIndex: Array<ProductIndexEntry>,
 *   assetPaths: Set<string>,
 *   itemModels?: Array<{ slug: string, modelPath: string }>,
 *   itemModelAliases?: Readonly<Record<string, string>>,
 * }} input
 * @returns {{ schemaVersion: number, categories: Array<object>, products: Array<object> }}
 */
export function buildCatalog({
  sourceProducts,
  categoryCopy,
  productIndex,
  assetPaths,
  itemModels = [],
  itemModelAliases = ITEM_MODEL_ALIASES,
}) {
  if (!Array.isArray(sourceProducts) || sourceProducts.length === 0) {
    throw new Error("source catalog is empty; refusing to generate an empty catalog");
  }
  if (!Array.isArray(categoryCopy) || categoryCopy.length === 0) {
    throw new Error("no category copy available; every category needs a categoria.txt");
  }

  const modelsBySlug = new Map(itemModels.map((model) => [model.slug, model.modelPath]));

  // ---- categories ---------------------------------------------------------
  const categories = categoryCopy.map((category) => {
    const name = normalizeCopy(category.name);
    if (!category.description || !category.description.trim()) {
      throw new Error(`category ${JSON.stringify(category.folder)} has an empty description`);
    }
    return {
      id: slugify(category.folder),
      slug: slugify(name),
      name,
      description: normalizeDescription(category.description),
      bannerImage: category.bannerImage
        ? servedIfPresent(assetPaths, `${ASSET_SOURCE_DIR}/categories/${slugify(category.folder)}/${category.bannerImage}`)
        : null,
      productCount: 0,
      sourceFolder: category.folder,
    };
  });

  assertUnique(categories, (category) => category.id, "category id");

  const categoryIdByKey = new Map(
    categories.map((category) => [comparisonKey(category.sourceFolder), category.id]),
  );
  const knownCategoryKeys = [...categoryIdByKey.keys()];

  // ---- products -----------------------------------------------------------
  const indexByKey = new Map(productIndex.map((entry) => [comparisonKey(entry.folder), entry]));
  const pairedFolders = new Set();

  const products = sourceProducts.map((source) => {
    const sourceKey = comparisonKey(source.nombre);
    const entry = indexByKey.get(sourceKey);

    if (!entry) {
      throw new Error(
        `product ${JSON.stringify(source.nombre)} has no matching folder on disk; ` +
          `the on-disk index holds ${productIndex.length} products. Matching is accent- and ` +
          `whitespace-insensitive, so this means the folder is genuinely absent.`,
      );
    }
    pairedFolders.add(entry.folder);

    const categoryId = categoryIdByKey.get(comparisonKey(source.categoria));
    if (!categoryId) {
      throw new Error(
        `product ${JSON.stringify(source.nombre)} references category ${JSON.stringify(source.categoria)}, ` +
          `which matches no categoria.txt. Known categories: ${JSON.stringify(knownCategoryKeys)}`,
      );
    }

    if (typeof source.precio !== "number" || !Number.isFinite(source.precio)) {
      throw new Error(`product ${JSON.stringify(source.nombre)} has a non-numeric price: ${source.precio}`);
    }
    if (entry.priceUsd !== null && entry.priceUsd !== source.precio) {
      throw new Error(
        `price disagreement for ${JSON.stringify(source.nombre)}: ` +
          `catalog.source.json says ${source.precio}, info.txt says ${entry.priceUsd}`,
      );
    }

    let imageUrl;
    try {
      imageUrl = new URL(source.imagen_url).toString();
    } catch {
      throw new Error(`product ${JSON.stringify(source.nombre)} has an unusable imagen_url: ${source.imagen_url}`);
    }

    const id = slugify(entry.folder);
    const name = normalizeCopy(entry.name ?? source.nombre);
    const slug = slugify(name);
    const imageRepoPath = entry.image
      ? `${ASSET_SOURCE_DIR}/products/${slugify(entry.folder)}/${entry.image}`
      : null;

    if (imageRepoPath && !assetPaths.has(imageRepoPath)) {
      throw new Error(
        `product ${JSON.stringify(source.nombre)} has source image ${JSON.stringify(entry.image)} on disk, ` +
          `but ${imageRepoPath} is missing from the repository. Run \`node scripts/sync-assets.mjs\` first.`,
      );
    }

    return {
      id,
      slug,
      name,
      priceUsd: source.precio,
      categoryId,
      description: normalizeDescription(entry.description ?? source.descripcion),
      imageUrl,
      localImage: imageRepoPath ? toServedPath(imageRepoPath) : null,
      modelPath: modelsBySlug.get(itemModelAliases[slug] ?? slug) ?? null,
      sourceFolder: entry.folder,
    };
  });

  const orphans = productIndex.filter((entry) => !pairedFolders.has(entry.folder));
  if (orphans.length > 0) {
    throw new Error(
      `on-disk product folders with no matching entry in catalog.source.json: ` +
        `${JSON.stringify(orphans.map((entry) => entry.folder))}`,
    );
  }

  assertUnique(products, (product) => product.id, "product id");
  assertUnique(products, (product) => product.slug, "product slug");

  // ---- counts -------------------------------------------------------------
  const countByCategory = new Map();
  for (const product of products) {
    countByCategory.set(product.categoryId, (countByCategory.get(product.categoryId) ?? 0) + 1);
  }
  const emptyCategory = categories.find((category) => !countByCategory.has(category.id));
  if (emptyCategory) {
    throw new Error(`category ${JSON.stringify(emptyCategory.name)} has no products`);
  }
  for (const category of categories) {
    category.productCount = countByCategory.get(category.id) ?? 0;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    categories: [...categories].sort((a, b) => byCodeUnit(a.id, b.id)),
    products: [...products].sort((a, b) => byCodeUnit(a.id, b.id)),
  };
}

/**
 * Reports normalization health for the CLI summary and the verifier.
 *
 * @param {{ products: Array<object>, categories: Array<object> }} catalog
 * @param {{ fallbackProducts?: string[] }} [options] product ids whose copy had
 *   to fall back to the accent-stripped JSON because no `info.txt` existed
 * @returns {{ residualPlainForms: Array<{ where: string, form: string, count: number }>,
 *   doubleSpaces: string[], fallbackProducts: string[], missingLocalImages: string[] }}
 */
export function auditCatalog(catalog, { fallbackProducts = [] } = {}) {
  const residualPlainForms = [];
  const doubleSpaces = [];

  for (const item of [...catalog.categories, ...catalog.products]) {
    const label = `${item.id}`;
    for (const field of ["name", "description"]) {
      const value = item[field];
      for (const hit of findResidualPlainForms(value)) {
        residualPlainForms.push({ where: `${label}.${field}`, form: hit.form, count: hit.count });
      }
      if (/\s{2,}/.test(String(value).trim()) || String(value) !== String(value).trim()) {
        doubleSpaces.push(`${label}.${field}`);
      }
    }
  }

  return {
    residualPlainForms,
    doubleSpaces,
    fallbackProducts,
    missingLocalImages: catalog.products.filter((p) => p.localImage === null).map((p) => p.id),
  };
}

/** The accent pairs this pipeline is allowed to correct, re-exported for the verifier. */
export { ACCENT_FIXES };
