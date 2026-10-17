/**
 * Path and file helpers shared by the asset pipeline.
 *
 * Everything here is deterministic and side-effect-free except the explicit
 * `copyIfChanged` / `writeIfChanged` helpers, which are the only writers and are
 * idempotent by content hash.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Recursively creates a directory, returning its absolute path. */
export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Reads a file as UTF-8 and strips a leading byte-order mark if present. */
export function readUtf8(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

/** Returns a stable SHA-256 digest for a buffer or string. */
export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

/** Lists directory entries, optionally restricted by kind, always sorted. */
export function listDir(dir, { kind = "any" } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => {
      const stat = fs.statSync(path.join(dir, name), { throwIfNoEntry: false });
      if (!stat) return false;
      if (kind === "dir") return stat.isDirectory();
      if (kind === "file") return stat.isFile();
      return true;
    })
    .sort();
}

/** Lists every file below `dir` as `{ relPath, absPath, bytes }`, sorted by path. */
export function listFilesRecursive(dir, prefix = "") {
  const out = [];
  for (const name of listDir(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) out.push(...listFilesRecursive(abs, rel));
    else out.push({ relPath: rel, absPath: abs, bytes: stat.size });
  }
  return out;
}

/** Sums the byte size of every file below `dir`. */
export function dirSize(dir) {
  return listFilesRecursive(dir).reduce((total, file) => total + file.bytes, 0);
}

/** Copies `from` to `to` only when the bytes differ. Returns `false` when skipped. */
export function copyIfChanged(from, to) {
  const source = fs.readFileSync(from);
  const digest = sha256(source);
  if (fs.existsSync(to) && sha256(fs.readFileSync(to)) === digest) return false;
  ensureDir(path.dirname(to));
  fs.writeFileSync(to, source);
  return true;
}

/** Writes text only when the bytes differ. Returns `false` when skipped. */
export function writeIfChanged(file, content) {
  const next = Buffer.from(content, "utf8");
  const digest = sha256(next);
  if (fs.existsSync(file) && sha256(fs.readFileSync(file)) === digest) return false;
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, next);
  return true;
}

/** Serializes JSON with a stable key order-independent layout and a trailing newline. */
export function writeJsonIfChanged(file, value) {
  return writeIfChanged(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Formats a byte count for CLI output. */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Converts an OS-absolute path inside the repo to a repo-relative POSIX path.
 * Used so generated JSON never embeds a developer-specific absolute path.
 */
export function toRepoRelative(repoRoot, absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}
