#!/usr/bin/env node
/**
 * Copies every runtime asset out of the read-only source (Google Drive) and into
 * the repository, then records the source data the catalog generator consumes.
 *
 * The script is idempotent: a destination file is rewritten only when its bytes
 * differ from the source, so re-running reports `unchanged` and touches nothing.
 * It never writes to the source root.
 *
 * Usage:
 *   node scripts/sync-assets.mjs [--source <path>] [--drive <letter>] [--repo <path>]
 *
 * `--source` points at the folder that contains `TIENDA`, `MULTIMEDIA` and
 * `BOSSES`. When omitted, the environment variable `YOKAI_SOURCE_ROOT` is used,
 * and failing that the drive root is scanned for the source folder.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  listSourceDirs,
  listSourceFiles,
  readSourceText,
  resolveSourceRoot,
  SOURCE_ROOT_ENV,
} from "./lib/drive.mjs";
import {
  copyIfChanged,
  dirSize,
  ensureDir,
  formatBytes,
  listFilesRecursive,
  readUtf8,
  writeIfChanged,
} from "./lib/file-ops.mjs";
import { slugify } from "./lib/slugs.mjs";
import { parseCategoryTxt, parseInfoTxt } from "./lib/txt-source.mjs";
import { extractEntry, readCentralDirectory } from "./lib/zip.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const SOURCES = {
  catalogJson: ["TIENDA", "todos_los_productos.json"],
  tiendaDir: ["TIENDA"],
  multimediaDir: ["MULTIMEDIA", "imagenes"],
  bossArchives: {
    tlaloc: ["BOSSES", "tlaloc.zip"],
    edelweiss: ["BOSSES", "EdelWeiss.zip"],
  },
};

/**
 * Item-model members extracted from the Tlaloc texture pack.
 * `virtualPath` is the destination path below `public/models/items/tlaloc/`.
 */
const ITEM_MODEL_MEMBERS = [
  { match: /\/models\/item\/tlaloc\/tlaloc_hat\.json$/, virtualPath: "tlaloc_hat.json" },
  { match: /\/models\/item\/tlaloc\/tlaloc_staff\.json$/, virtualPath: "tlaloc_staff.json" },
  { match: /\/models\/item\/netherite_sword\.json$/, virtualPath: "netherite_sword.json" },
  { match: /\/models\/item\/paper\.json$/, virtualPath: "paper.json" },
  { match: /\/textures\/item\/custom\/tlaloc\/tlaloc_hat\.png$/, virtualPath: "tlaloc_hat.png" },
  { match: /\/textures\/item\/custom\/tlaloc\/tlaloc_staff\.png$/, virtualPath: "tlaloc_staff.png" },
  { match: /\/textures\/item\/custom\/tlaloc\/tlaloc_staff_e\.png$/, virtualPath: "tlaloc_staff_e.png" },
  { match: /\/optifine\/emissive\.properties$/, virtualPath: "emissive.properties" },
];

/** Brand assets copied verbatim from `MULTIMEDIA/imagenes`. */
const BRAND_ASSETS = ["yokai_1.png", "final.jpg"];

function parseArgs(argv) {
  const args = { source: undefined, drive: undefined, repo: REPO_ROOT };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--source") args.source = argv[++i];
    else if (token === "--drive") args.drive = argv[++i];
    else if (token === "--repo") args.repo = path.resolve(argv[++i]);
    else if (token === "--help") args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

/** Finds exactly one archive entry matching a predicate, or fails loudly. */
function findEntry(entries, predicate, description) {
  const matches = entries.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one archive entry for ${description}, found ${matches.length}: ` +
        `${JSON.stringify(matches.map((entry) => entry.name))}`,
    );
  }
  return matches[0].name;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0] + "\n");
    return;
  }

  const { root: sourceRoot, origin } = resolveSourceRoot({
    explicit: args.source,
    env: process.env[SOURCE_ROOT_ENV],
    drives: args.drive ? [args.drive] : undefined,
  });
  const appRoot = path.join(args.repo, "public");
  const dataDir = path.join(args.repo, "data");

  console.log(`source root  : ${sourceRoot} (via ${origin})`);
  console.log(`repo root    : ${args.repo}`);
  console.log("");

  /** @type {Map<string, { copied: number, unchanged: number, bytes: number }>} */
  const summary = new Map();
  const record = (group, copied, bytes) => {
    const bucket = summary.get(group) ?? { copied: 0, unchanged: 0, bytes: 0 };
    if (copied) {
      bucket.copied += 1;
      bucket.bytes += bytes;
    } else {
      bucket.unchanged += 1;
    }
    summary.set(group, bucket);
  };

  const copyInto = (group, sourceFile, destFile) => {
    const bytes = fs.statSync(sourceFile).size;
    const copied = copyIfChanged(sourceFile, destFile);
    record(group, copied, bytes);
    return copied;
  };

  // ---- 1. verbatim source catalog (provenance) ----------------------------
  copyInto(
    "data",
    path.join(sourceRoot, ...SOURCES.catalogJson),
    path.join(dataDir, "catalog.source.json"),
  );

  // ---- 2. read the TIENDA tree -------------------------------------------
  const tienda = path.join(sourceRoot, ...SOURCES.tiendaDir);
  const categoryFolders = listSourceDirs(sourceRoot, ...SOURCES.tiendaDir);
  const categoryCopy = [];
  const productIndex = [];
  const categoryBanners = [];
  const fallbackCopyProducts = [];
  const warnings = [];

  for (const categoryFolder of categoryFolders) {
    const categoryTxt = path.join(tienda, categoryFolder, "categoria.txt");
    if (!fs.existsSync(categoryTxt)) {
      throw new Error(`category ${JSON.stringify(categoryFolder)} has no categoria.txt at ${categoryTxt}`);
    }
    const parsedCategory = parseCategoryTxt(readUtf8(categoryTxt));
    const bannerFile =
      listSourceFiles(sourceRoot, ...SOURCES.tiendaDir, categoryFolder).find((name) =>
        name.startsWith("categoria_imagen_1."),
      ) ?? null;

    categoryCopy.push({
      folder: categoryFolder,
      name: parsedCategory.name,
      description: parsedCategory.description,
      bannerImage: bannerFile,
    });
    if (bannerFile) {
      categoryBanners.push({ categoryFolder, bannerFile });
    }

    for (const productFolder of listSourceDirs(sourceRoot, ...SOURCES.tiendaDir, categoryFolder)) {
      const files = listSourceFiles(sourceRoot, ...SOURCES.tiendaDir, categoryFolder, productFolder);
      const imageFile = files.find((name) => name.startsWith("imagen.")) ?? null;
      const infoFile = files.includes("info.txt") ? "info.txt" : null;

      let name = null;
      let priceUsd = null;
      let description = null;
      if (infoFile) {
        try {
          const parsed = parseInfoTxt(readUtf8(path.join(tienda, categoryFolder, productFolder, infoFile)));
          name = parsed.name;
          priceUsd = parsed.priceUsd;
          description = parsed.description;
        } catch (error) {
          throw new Error(`failed to parse ${categoryFolder}/${productFolder}/info.txt: ${error.message}`);
        }
      } else {
        fallbackCopyProducts.push(`${categoryFolder}/${productFolder}`);
      }

      productIndex.push({ categoryFolder, folder: productFolder, image: imageFile, name, priceUsd, description });
    }
  }

  // ---- 3. product images and category banners ----------------------------
  categoryCopy.sort((a, b) => (a.folder < b.folder ? -1 : a.folder > b.folder ? 1 : 0));
  productIndex.sort((a, b) => (a.folder < b.folder ? -1 : a.folder > b.folder ? 1 : 0));

  for (const entry of productIndex) {
    if (!entry.image) {
      warnings.push(`product ${entry.folder} has no imagen.<ext> on disk; localImage will be null`);
      continue;
    }
    copyInto(
      "public/products",
      path.join(tienda, entry.categoryFolder, entry.folder, entry.image),
      path.join(appRoot, "products", slugify(entry.folder), entry.image),
    );
  }

  for (const { categoryFolder, bannerFile } of categoryBanners) {
    copyInto(
      "public/categories",
      path.join(tienda, categoryFolder, bannerFile),
      path.join(appRoot, "categories", slugify(categoryFolder), bannerFile),
    );
  }

  // ---- 4. brand imagery --------------------------------------------------
  for (const brandAsset of BRAND_ASSETS) {
    copyInto(
      "public/brand",
      path.join(sourceRoot, ...SOURCES.multimediaDir, brandAsset),
      path.join(appRoot, "brand", brandAsset),
    );
  }

  // ---- 5. boss models, item models and schematics from the archives ------
  const tlalocArchive = fs.readFileSync(path.join(sourceRoot, ...SOURCES.bossArchives.tlaloc));
  const tlalocEntries = readCentralDirectory(tlalocArchive);

  const bossModels = [
    { entryName: findEntry(tlalocEntries, (e) => /\/tlaloc\.bbmodel$/.test(e.name), "tlaloc.bbmodel"), dest: "tlaloc.bbmodel" },
    {
      entryName: findEntry(tlalocEntries, (e) => /\/tlaloc_sacrifice\.bbmodel$/.test(e.name), "tlaloc_sacrifice.bbmodel"),
      dest: "tlaloc_sacrifice.bbmodel",
    },
  ];
  for (const model of bossModels) {
    const dest = path.join(appRoot, "models", "bosses", model.dest);
    const data = extractEntry(tlalocArchive, model.entryName);
    const copied = writeBufferIfChanged(dest, data);
    record("public/models/bosses", copied, data.length);
  }

  for (const member of ITEM_MODEL_MEMBERS) {
    const entryName = findEntry(tlalocEntries, (e) => member.match.test(e.name), member.virtualPath);
    const dest = path.join(appRoot, "models", "items", "tlaloc", member.virtualPath);
    const data = extractEntry(tlalocArchive, entryName);
    const copied = writeBufferIfChanged(dest, data);
    record("public/models/items", copied, data.length);
  }

  const schematicEntry = findEntry(
    tlalocEntries,
    (e) => /\/arenaTlalocBoss\.schem$/.test(e.name),
    "arenaTlalocBoss.schem",
  );
  const schematicData = extractEntry(tlalocArchive, schematicEntry);
  record(
    "public/schematics",
    writeBufferIfChanged(path.join(appRoot, "schematics", "arenaTlalocBoss.schem"), schematicData),
    schematicData.length,
  );

  const edelweissArchive = fs.readFileSync(path.join(sourceRoot, ...SOURCES.bossArchives.edelweiss));
  const icePalaceEntry = findEntry(
    readCentralDirectory(edelweissArchive),
    (e) => /\/IcePalace\.schematic$/.test(e.name),
    "IcePalace.schematic",
  );
  const icePalace = extractEntry(edelweissArchive, icePalaceEntry);
  record(
    "public/schematics",
    writeBufferIfChanged(path.join(appRoot, "schematics", "IcePalace.schematic"), icePalace),
    icePalace.length,
  );

  // ---- 6. derived source records ----------------------------------------
  const derivedRecords = [
    [
      "category-copy.json",
      {
        schemaVersion: 1,
        categories: categoryCopy,
      },
    ],
    [
      "source-index.json",
      {
        schemaVersion: 1,
        categoryFolders,
        products: productIndex,
      },
    ],
  ];
  for (const [fileName, payload] of derivedRecords) {
    const file = path.join(dataDir, fileName);
    const serialized = `${JSON.stringify(payload, null, 2)}\n`;
    const copied = writeIfChanged(file, serialized);
    record("data", copied, Buffer.byteLength(serialized, "utf8"));
  }

  // ---- 7. report --------------------------------------------------------
  const rows = [...summary.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let totalFiles = 0;
  let totalBytes = 0;
  let totalCopied = 0;
  let totalUnchanged = 0;

  console.log("target".padEnd(24) + "copied".padStart(8) + "unchanged".padStart(11) + "size".padStart(12));
  console.log("-".repeat(55));
  for (const [group, bucket] of rows) {
    const onDisk = dirSize(path.join(args.repo, group));
    totalFiles += bucket.copied + bucket.unchanged;
    totalBytes += onDisk;
    totalCopied += bucket.copied;
    totalUnchanged += bucket.unchanged;
    console.log(
      group.padEnd(24) +
        String(bucket.copied).padStart(8) +
        String(bucket.unchanged).padStart(11) +
        formatBytes(onDisk).padStart(12),
    );
  }
  console.log("-".repeat(55));
  console.log(
    "total".padEnd(24) +
      String(totalCopied).padStart(8) +
      String(totalUnchanged).padStart(11) +
      formatBytes(totalBytes).padStart(12),
  );
  console.log("");
  console.log(`categories read : ${categoryCopy.length}`);
  console.log(`products read   : ${productIndex.length}`);
  console.log(`category banners: ${categoryBanners.length}`);
  console.log(`products without a local image: ${productIndex.filter((entry) => !entry.image).length}`);
  console.log(`products using the JSON copy fallback (no info.txt): ${fallbackCopyProducts.length}`);

  if (warnings.length > 0) {
    console.log("\nwarnings:");
    for (const warning of warnings) console.log(`  - ${warning}`);
  }

  const publicFiles = listFilesRecursive(appRoot).length;
  const dataFiles = listFilesRecursive(dataDir).length;
  console.log(`\npublic/ files: ${publicFiles}, data/ files: ${dataFiles}`);
}

/** Writes a buffer only when the bytes differ. Returns `false` when skipped. */
function writeBufferIfChanged(dest, data) {
  if (fs.existsSync(dest) && fs.readFileSync(dest).equals(data)) return false;
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, data);
  return true;
}

await main();
