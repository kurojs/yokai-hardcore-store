/**
 * Source (Google Drive) access for the asset pipeline.
 *
 * ## Why discovery instead of a literal path
 *
 * The source root lives under a Google Drive mount whose top-level folder name is
 * Japanese (`マイドライブ`). That literal cannot survive being passed through a
 * non-UTF-8 Windows console, so no module here ever hardcodes it. Instead the
 * drive root is scanned for a child directory containing `YOKAI HARDCORE`, which
 * needs no non-ASCII literal at all.
 *
 * Paths are always supplied by the caller (CLI flag or environment variable)
 * before discovery is attempted, so no developer-specific absolute path is
 * baked into the repository.
 *
 * This module is strictly read-only toward the source: it never creates,
 * renames, or writes anything under the source root.
 */

import fs from "node:fs";
import path from "node:path";

import { listDir, readUtf8 } from "./file-ops.mjs";

/** Name of the source folder, resolved relative to the Drive mount root. */
export const SOURCE_FOLDER_NAME = "YOKAI HARDCORE";

/** Environment variable that can pin the source root without CLI flags. */
export const SOURCE_ROOT_ENV = "YOKAI_SOURCE_ROOT";

/** Drive letters probed during discovery, in order. */
const DEFAULT_DRIVES = ["G:", "H:", "F:"];

function isDirectory(candidate) {
  const stat = fs.statSync(candidate, { throwIfNoEntry: false });
  return Boolean(stat?.isDirectory());
}

/**
 * Finds the source root by scanning drive roots for a directory that contains a
 * `YOKAI HARDCORE` child.
 *
 * @param {{ drives?: string[] }} [options]
 * @returns {string} the absolute source root
 * @throws {Error} when no drive contains the source folder
 */
export function discoverSourceRoot({ drives = DEFAULT_DRIVES } = {}) {
  for (const drive of drives) {
    const mount = `${drive}\\`;
    if (!fs.existsSync(mount)) continue;
    for (const entry of listDir(mount, { kind: "dir" })) {
      const candidate = path.join(mount, entry, SOURCE_FOLDER_NAME);
      if (isDirectory(candidate)) return candidate;
    }
  }
  throw new Error(
    `could not locate a "${SOURCE_FOLDER_NAME}" folder under any of ${drives.join(", ")}; ` +
      `pass --source <path> or set ${SOURCE_ROOT_ENV}`,
  );
}

/**
 * Resolves the source root from, in priority order: an explicit path, the
 * environment variable, then drive discovery.
 *
 * @param {{ explicit?: string, env?: string, drives?: string[] }} [options]
 * @returns {{ root: string, origin: "argument" | "environment" | "discovery" }}
 */
export function resolveSourceRoot({ explicit, env, drives } = {}) {
  if (explicit) {
    if (!isDirectory(explicit)) {
      throw new Error(`--source path is not a directory: ${explicit}`);
    }
    return { root: path.resolve(explicit), origin: "argument" };
  }
  if (env) {
    if (!isDirectory(env)) {
      throw new Error(`${SOURCE_ROOT_ENV} is not a directory: ${env}`);
    }
    return { root: path.resolve(env), origin: "environment" };
  }
  return { root: discoverSourceRoot({ drives }), origin: "discovery" };
}

/** Reads a UTF-8 text file from the source root. */
export function readSourceText(sourceRoot, ...segments) {
  const file = path.join(sourceRoot, ...segments);
  if (!fs.existsSync(file)) throw new Error(`missing source file: ${file}`);
  return readUtf8(file);
}

/** Returns the byte size of a source file, or throws when it is absent. */
export function sourceFileSize(sourceRoot, ...segments) {
  const file = path.join(sourceRoot, ...segments);
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) throw new Error(`missing source file: ${file}`);
  return stat.size;
}

/** Lists the directory names directly below `...segments`, sorted. */
export function listSourceDirs(sourceRoot, ...segments) {
  return listDir(path.join(sourceRoot, ...segments), { kind: "dir" });
}

/** Lists the file names directly below `...segments`, sorted. */
export function listSourceFiles(sourceRoot, ...segments) {
  return listDir(path.join(sourceRoot, ...segments), { kind: "file" });
}
