/**
 * Reads the repository-resident inputs the catalog generator needs.
 *
 * Split out of the CLI so the generator is exercised through exactly the same
 * code path in production and in the reproducibility spec: the spec asserts that
 * running the real generator twice over the real inputs reproduces
 * `data/catalog.json` byte for byte.
 */

import fs from "node:fs";
import path from "node:path";

import { listFilesRecursive, readUtf8, toRepoRelative } from "./file-ops.mjs";
import { ASSET_SOURCE_DIR, toServedPath } from "./normalize.mjs";
import { slugify } from "./slugs.mjs";

/** Repo-relative POSIX path of every file under `public/`. */
export function collectAssetPaths(repoRoot) {
  const publicRoot = path.join(repoRoot, ASSET_SOURCE_DIR);
  return new Set(listFilesRecursive(publicRoot).map((file) => toRepoRelative(repoRoot, file.absPath)));
}

/**
 * Every item-model JSON copied out of a texture pack becomes a `modelPath`
 * target, keyed by a slug of its file name.
 */
export function collectItemModels(assetPaths) {
  return [...assetPaths]
    .filter((repoPath) => repoPath.startsWith(`${ASSET_SOURCE_DIR}/models/items/`) && repoPath.endsWith(".json"))
    .sort()
    .map((repoPath) => ({
      slug: slugify(path.basename(repoPath, ".json")),
      modelPath: toServedPath(repoPath),
    }));
}

/** Reads a JSON file from `data/`, failing with the exact missing path. */
export function readDataJson(repoRoot, fileName) {
  const file = path.join(repoRoot, "data", fileName);
  if (!fs.existsSync(file)) {
    throw new Error(
      `missing data/${fileName}; run \`node scripts/sync-assets.mjs\` before building the catalog`,
    );
  }
  return JSON.parse(readUtf8(file));
}

/**
 * Reads every generator input from the repository.
 *
 * @param {string} repoRoot
 * @returns {{
 *   sourceProducts: Array<import("./normalize.mjs").SourceProduct>,
 *   categoryCopy: Array<import("./normalize.mjs").CategoryCopyEntry>,
 *   productIndex: Array<import("./normalize.mjs").ProductIndexEntry>,
 *   assetPaths: Set<string>,
 *   itemModels: Array<{ slug: string, modelPath: string }>,
 *   fallbackProducts: string[],
 * }}
 */
export function readCatalogInputs(repoRoot) {
  const sourceProducts = readDataJson(repoRoot, "catalog.source.json");
  const categoryCopy = readDataJson(repoRoot, "category-copy.json").categories;
  const sourceIndex = readDataJson(repoRoot, "source-index.json");
  const assetPaths = collectAssetPaths(repoRoot);

  return {
    sourceProducts,
    categoryCopy,
    productIndex: sourceIndex.products,
    assetPaths,
    itemModels: collectItemModels(assetPaths),
    fallbackProducts: sourceIndex.products
      .filter((entry) => entry.name === null || entry.description === null)
      .map((entry) => entry.folder),
  };
}
