#!/usr/bin/env node
/**
 * Generates `data/catalog.json`, the normalized artifact the application consumes.
 *
 * Thin CLI wrapper: all logic lives in the unit-tested modules under `scripts/lib/`.
 * Reads only files already inside the repository, so the output is reproducible
 * without access to the source drive.
 *
 * Prerequisite: `node scripts/sync-assets.mjs` must have run, because
 * `localImage` reflects the assets that were actually copied into `public/`.
 *
 * Usage:
 *   node scripts/build-catalog.mjs [--repo <path>] [--check]
 *
 * `--check` verifies the on-disk catalog matches what would be generated and
 * exits non-zero when it does not, without writing anything.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditCatalog, buildCatalog } from "./lib/normalize.mjs";
import { readCatalogInputs } from "./lib/repo-assets.mjs";
import { readUtf8, toRepoRelative, writeJsonIfChanged } from "./lib/file-ops.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseArgs(argv) {
  const args = { repo: REPO_ROOT, check: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--repo") args.repo = path.resolve(argv[++i]);
    else if (token === "--check") args.check = true;
    else if (token === "--help") args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0] + "\n");
    return;
  }

  const { sourceProducts, categoryCopy, productIndex, assetPaths, itemModels, fallbackProducts } =
    readCatalogInputs(args.repo);

  const catalog = buildCatalog({ sourceProducts, categoryCopy, productIndex, assetPaths, itemModels });

  const audit = auditCatalog(catalog, { fallbackProducts });

  const catalogFile = path.join(args.repo, "data", "catalog.json");
  const serialized = `${JSON.stringify(catalog, null, 2)}\n`;

  if (args.check) {
    const current = fs.existsSync(catalogFile) ? readUtf8(catalogFile) : null;
    if (current !== serialized) {
      throw new Error("data/catalog.json is stale; run `node scripts/build-catalog.mjs`");
    }
    console.log("data/catalog.json is up to date");
  } else {
    const written = writeJsonIfChanged(catalogFile, catalog);
    console.log(`${written ? "wrote" : "unchanged"}  ${toRepoRelative(args.repo, catalogFile)}`);
  }

  // ---- summary ------------------------------------------------------------
  const priceDistribution = new Map();
  for (const product of catalog.products) {
    priceDistribution.set(product.priceUsd, (priceDistribution.get(product.priceUsd) ?? 0) + 1);
  }

  console.log("");
  console.log(`products          : ${catalog.products.length}`);
  console.log(`categories        : ${catalog.categories.length}`);
  console.log(`schemaVersion     : ${catalog.schemaVersion}`);
  console.log(`item models found : ${itemModels.length} (${itemModels.map((m) => m.slug).join(", ") || "none"})`);
  console.log(
    `price distribution: ${[...priceDistribution]
      .sort((a, b) => a[0] - b[0])
      .map(([price, count]) => `$${price}x${count}`)
      .join(" ")}`,
  );
  console.log("");
  console.log("category breakdown:");
  for (const category of catalog.categories) {
    console.log(
      `  ${String(category.productCount).padStart(2)}  ${category.id.padEnd(40)} banner=${
        category.bannerImage ?? "none"
      }`,
    );
  }
  console.log("");
  console.log(`products with a local image      : ${catalog.products.length - audit.missingLocalImages.length}`);
  console.log(`products without a local image   : ${audit.missingLocalImages.length}`);
  console.log(`products with a 3D model         : ${catalog.products.filter((p) => p.modelPath).length}`);
  console.log(`products on the JSON copy fallback: ${audit.fallbackProducts.length}`);
  console.log(`residual accent-stripped tokens   : ${audit.residualPlainForms.length}`);
  for (const hit of audit.residualPlainForms) {
    console.log(`  - ${hit.where}: ${hit.form} x${hit.count}`);
  }
  console.log(`double-space defects              : ${audit.doubleSpaces.length}`);
  for (const where of audit.doubleSpaces) console.log(`  - ${where}`);
}

main();
